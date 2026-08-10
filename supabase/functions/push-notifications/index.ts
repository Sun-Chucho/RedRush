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
      data = { type: 'order_status', status: record.status, orderId: record.id };

      if (record.status === 'assigned' && record.rider_id) {
        await notifyUser(
          supabase,
          record.rider_id,
          'Delivery assigned',
          `Head to ${record.restaurant_name} to collect the order.`,
          { type: 'rider_assigned', orderId: record.id }
        );
      }

      // Also if status is 'ready' and no rider is assigned, we should dispatch it
      if (record.status === 'ready' && !record.rider_id) {
        // Dispatch algorithm using our PostGIS function
        if (typeof record.restaurant_latitude !== 'number' || typeof record.restaurant_longitude !== 'number') {
          console.warn('Ready order has no restaurant GPS coordinates', record.id);
        } else {
          const { data: riders } = await supabase.rpc('find_nearest_rider', {
            lat: record.restaurant_latitude,
            lon: record.restaurant_longitude,
            radius_meters: 15000,
          });

          if (riders && riders.length > 0) {
            await notifyUser(
              supabase,
              riders[0].rider_id,
              'New delivery request!',
              `Pick up an order from ${record.restaurant_name}.`,
              { type: 'rider_request', orderId: record.id }
            );
          }
        }
      }
    }

    if (!targetUserId) {
      return new Response("No target user", { status: 200 });
    }

    // Get target user push token
    const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', targetUserId);
    
    if (!tokens || tokens.length === 0) {
      return new Response("No push token found", { status: 200 });
    }

    await Promise.all(tokens.map(({ token }) => sendExpoPush(token, title, body, data)));

    return new Response(JSON.stringify({ success: true }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error(err);
    return new Response(String(err), { status: 500 });
  }
});

async function notifyUser(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  title: string,
  body: string,
  data: Record<string, unknown>
) {
  const { data: tokens } = await supabase.from('push_tokens').select('token').eq('user_id', userId);
  if (!tokens?.length) return;
  await Promise.all(tokens.map(({ token }) => sendExpoPush(token, title, body, data)));
}

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
