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
const cutoff = new Date(Date.now() - 120_000).toISOString();

if (!url || !service) {
  console.error('Missing local Supabase URL or server service key.');
  process.exit(1);
}

const headers = {
  apikey: service,
  Authorization: `Bearer ${service}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

async function request(pathname, options = {}) {
  const response = await fetch(`${url}/rest/v1/${pathname}`, { headers, ...options });
  if (!response.ok) throw new Error(`Supabase returned HTTP ${response.status}`);
  return response.status === 204 ? null : response.json();
}

(async () => {
  const query = `rider_locations?select=rider_id&is_online=eq.true&updated_at=lt.${encodeURIComponent(cutoff)}`;
  const stale = await request(query);
  const riderIds = [...new Set(stale.map(row => row.rider_id).filter(Boolean))];

  console.log(`Found ${riderIds.length} rider(s) stale beyond the 2-minute dispatch cutoff.`);
  if (!apply || riderIds.length === 0) {
    if (!apply) console.log('Dry run only. Pass --apply to mark these riders offline.');
    return;
  }

  const idFilter = `in.(${riderIds.join(',')})`;
  await request(`rider_locations?rider_id=${encodeURIComponent(idFilter)}&is_online=eq.true`, {
    method: 'PATCH',
    body: JSON.stringify({ is_online: false }),
  });
  await request(`rider_profiles?user_id=${encodeURIComponent(idFilter)}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_online: false }),
  });
  console.log(`Marked ${riderIds.length} stale rider(s) offline.`);
})().catch(error => {
  console.error(error.message);
  process.exit(1);
});
