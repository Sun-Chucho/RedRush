import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Edge Function to send Expo Push Notifications
// Triggered by a webhook when `orders` table is updated
serve(async (req) => {
  try {
    const payload = await req.json();
    const { type, record, old_record } = payload;
    
    // Only care about updates and inserts
    if (type !== 'UPDATE' && type !== 'INSERT') {
      return new Response("Ignored", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Missing Supabase env vars");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    let targetUserId = null;
    let title = "";
    let body = "";
    let data = {};

    if (type === 'INSERT') {
      // New order: notify the vendor
      const { data: restaurant } = await supabase.from('restaurants').select('owner_id').eq('id', record.restaurant_id).single();
      if (restaurant?.owner_id) {
        targetUserId = restaurant.owner_id;
        title = "New Order Received!";
        body = `A new order has been placed. Tap to accept.`;
        data = { type: 'new_order', orderId: record.id };
      }
    } else if (type === 'UPDATE' && record.status !== old_record.status) {
      // Order status changed: notify the customer
      targetUserId = record.customer_id;
      title = `Order ${record.status}`;
      body = `Your order from ${record.restaurant_name} is now ${record.status}.`;
      data = { type: 'order_status', status: record.status };

      // Also if status is 'ready' and no rider is assigned, we should dispatch it
      if (record.status === 'ready' && !record.rider_id) {
        // Dispatch algorithm using our PostGIS function
        const { data: riders } = await supabase.rpc('find_nearest_rider', {
           lat: record.latitude || 6.4541, // fallback to Lagos center
           lon: record.longitude || 3.3947,
           radius_meters: 5000 
        });

        if (riders && riders.length > 0) {
           const nearestRiderId = riders[0].rider_id;
           // We would notify this specific rider here
           // For this demo, let's just send them a push notification
           const { data: riderTokens } = await supabase.from('push_tokens').select('token').eq('user_id', nearestRiderId).limit(1);
           if (riderTokens && riderTokens.length > 0) {
              await sendExpoPush(riderTokens[0].token, "New Delivery Request!", `Pick up order from ${record.restaurant_name}`, { type: 'rider_request' });
           }
        }
      }
    }

    if (!targetUserId) {
      return new Response("No target user", { status: 200 });
    }

    // Get target user push token
    const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', targetUserId).limit(1);
    
    if (!tokens || tokens.length === 0) {
      return new Response("No push token found", { status: 200 });
    }

    await sendExpoPush(tokens[0].token, title, body, data);

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});

async function sendExpoPush(to: string, title: string, body: string, data: any) {
  const message = { to, sound: 'default', title, body, data };
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  return res.json();
}
