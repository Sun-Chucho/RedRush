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

const url = values.EXPO_PUBLIC_SUPABASE_URL?.replace(/\/$/, '');
const anon = values.EXPO_PUBLIC_SUPABASE_ANON_KEY || values.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service = values.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SECRET_KEY;

if (!url || !anon || !service) {
  console.error('Missing Supabase URL, public key, or server service key.');
  process.exit(1);
}

(async () => {
  const response = await fetch(`${url}/rest/v1/rpc/configure_order_push_webhook`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      p_function_url: `${url}/functions/v1/push-notifications`,
      p_anon_key: anon,
    }),
  });
  if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}: ${await response.text()}`);
  const functionResponse = await fetch(`${url}/functions/v1/push-notifications`, {
    method: 'POST',
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'HEALTH_CHECK' }),
  });
  const functionBody = await functionResponse.text();
  if (!functionResponse.ok || functionBody !== 'Ignored') {
    throw new Error(`Push function health check failed with HTTP ${functionResponse.status}`);
  }
  console.log('Configured the encrypted order push webhook and verified its Edge Function endpoint.');
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
