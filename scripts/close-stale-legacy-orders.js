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
const service = values.SUPABASE_SERVICE_ROLE_KEY || values.SUPABASE_SECRET_KEY;
const apply = process.argv.includes('--apply');
const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

if (!url || !service) {
  console.error('Missing local Supabase URL or server service key.');
  process.exit(1);
}

const headers = {
  apikey: service,
  Authorization: `Bearer ${service}`,
  'Content-Type': 'application/json',
};

(async () => {
  const filter = `status=not.in.(delivered,cancelled)&created_at=lt.${encodeURIComponent(cutoff)}&delivery_latitude=is.null&delivery_longitude=is.null`;
  const listResponse = await fetch(`${url}/rest/v1/orders?select=id,status,created_at&${filter}`, { headers });
  if (!listResponse.ok) throw new Error(`Supabase returned HTTP ${listResponse.status}`);
  const stale = await listResponse.json();
  console.log(`Found ${stale.length} active legacy order(s) older than 7 days without delivery GPS.`);
  if (!apply || stale.length === 0) {
    if (!apply) console.log('Dry run only. Pass --apply to cancel these stale legacy orders.');
    return;
  }

  const response = await fetch(`${url}/rest/v1/orders?${filter}`, {
    method: 'PATCH',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({ status: 'cancelled' }),
  });
  if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}: ${await response.text()}`);
  const updated = await response.json();
  console.log(`Cancelled ${updated.length} stale legacy order(s).`);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
