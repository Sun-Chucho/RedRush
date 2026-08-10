const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const values = {};
for (const file of ['.env', '.env.local']) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) values[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
  }
}

const url = values.EXPO_PUBLIC_SUPABASE_URL;
const anon = values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || values.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const service = values.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SECRET_KEY;

if (!url || !anon || !service) {
  console.error('Missing local Supabase URL, publishable key, or server service key.');
  process.exit(1);
}

async function table(name, select) {
  const response = await fetch(`${url}/rest/v1/${name}?select=${encodeURIComponent(select)}`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  if (!response.ok) throw new Error(`${name} returned HTTP ${response.status}`);
  return response.json();
}

async function rpc(name) {
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
    },
    body: '{}',
  });
  if (!response.ok) return false;
  return response.json();
}

(async () => {
  const authResponse = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
  const auth = await authResponse.json();
  const [orders, items, payments, restaurants, riders, tokens, webhookReady] = await Promise.all([
    table('orders', 'id,status,created_at,restaurant_id,restaurant_latitude,restaurant_longitude,delivery_latitude,delivery_longitude'),
    table('order_items', 'order_id'),
    table('payments', 'order_id'),
    table('restaurants', 'id,is_open,latitude,longitude'),
    table('rider_locations', 'rider_id,is_online,updated_at,latitude,longitude'),
    table('push_tokens', 'user_id,updated_at'),
    rpc('order_push_webhook_ready'),
  ]);

  const itemOrders = new Set(items.map(item => item.order_id));
  const paymentOrders = new Set(payments.map(payment => payment.order_id));
  const activeOrders = orders.filter(order => !['delivered', 'cancelled'].includes(order.status));
  const staleOnlineRiders = riders.filter(rider => rider.is_online && Date.now() - Date.parse(rider.updated_at) > 120000);
  const checks = [
    ['Google provider enabled', auth?.external?.google === true],
    ['Every order has items', orders.every(order => itemOrders.has(order.id))],
    ['Every order has a payment ledger', orders.every(order => paymentOrders.has(order.id))],
    ['Open restaurants have GPS', restaurants.filter(r => r.is_open).every(r => typeof r.latitude === 'number' && typeof r.longitude === 'number')],
    ['Active orders have delivery GPS', activeOrders.every(o => typeof o.delivery_latitude === 'number' && typeof o.delivery_longitude === 'number')],
    ['No stale riders marked online', staleOnlineRiders.length === 0],
    ['Order push webhook configured', webhookReady === true],
    ['At least one production push token registered', tokens.length > 0],
  ];

  for (const [label, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${label}`);
  console.log(`INFO orders=${orders.length} active=${activeOrders.length} restaurants=${restaurants.length} pushTokens=${tokens.length}`);
  if (activeOrders.length) {
    const oldestCreated = Math.min(...activeOrders.map(order => Date.parse(order.created_at)).filter(Number.isFinite));
    if (Number.isFinite(oldestCreated)) console.log(`INFO oldestActiveOrderHours=${Math.floor((Date.now() - oldestCreated) / 3_600_000)}`);
  }
  if (checks.some(([, passed]) => !passed)) process.exit(1);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
