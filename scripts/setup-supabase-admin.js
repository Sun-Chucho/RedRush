const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const email = process.env.SUPABASE_ADMIN_EMAIL || 'ogollachucho@gmail.com';
const password = process.env.SUPABASE_ADMIN_PASSWORD || '';

if (!url) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY. Pass it only at runtime; do not commit it.');
  process.exit(1);
}

if (!password) {
  console.error('Missing SUPABASE_ADMIN_PASSWORD.');
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function request(path, options) {
  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return body;
}

async function findUserByEmail() {
  const users = await request(`/auth/v1/admin/users?page=1&per_page=1000`, { method: 'GET' });
  return (users.users || []).find(user => user.email?.toLowerCase() === email.toLowerCase());
}

async function main() {
  const existing = await findUserByEmail();
  const user = existing
    ? await request(`/auth/v1/admin/users/${existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: 'RedRush Admin' },
        }),
      })
    : await request('/auth/v1/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: { name: 'RedRush Admin' },
        }),
      });

  await request('/rest/v1/profiles', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      id: user.id,
      name: 'RedRush Admin',
      email,
      phone: '',
      role: 'admin',
      status: 'active',
    }),
  });

  console.log(`Supabase admin ready: ${email}`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
