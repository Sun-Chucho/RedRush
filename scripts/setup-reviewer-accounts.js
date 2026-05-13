const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function loadEnvFile(file) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) return;

  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';
const password = process.env.REVIEWER_ACCOUNT_PASSWORD || 'Test123456!';

if (!url) {
  console.error('Missing EXPO_PUBLIC_SUPABASE_URL.');
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SECRET_KEY.');
  process.exit(1);
}

const reviewerAccounts = [
  { email: 'customer@redrush.app', name: 'RedRush Customer Reviewer', phone: '+254700000101', role: 'customer' },
  { email: 'vendor@redrush.app', name: 'RedRush Vendor Reviewer', phone: '+254700000102', role: 'vendor' },
  { email: 'rider@redrush.app', name: 'RedRush Rider Reviewer', phone: '+254700000103', role: 'rider' },
  { email: 'admin@redrush.app', name: 'RedRush Admin Reviewer', phone: '+254700000104', role: 'admin' },
];

const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

async function request(pathname, options = {}) {
  const response = await fetch(`${url}${pathname}`, {
    ...options,
    headers: { ...headers, ...(options.headers || {}) },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${pathname} failed: ${response.status} ${text}`);
  }

  return body;
}

async function findUserByEmail(email) {
  const users = await request('/auth/v1/admin/users?page=1&per_page=1000');
  return (users.users || []).find(user => user.email?.toLowerCase() === email.toLowerCase());
}

async function upsertAuthUser(account) {
  const existing = await findUserByEmail(account.email);
  const payload = {
    email: account.email,
    password,
    email_confirm: true,
    user_metadata: {
      name: account.name,
      phone: account.phone,
      role: account.role,
    },
  };

  if (existing) {
    return request(`/auth/v1/admin/users/${existing.id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  return request('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function upsert(table, row, onConflict = 'id') {
  return request(`/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
}

async function selectSingle(pathname) {
  const rows = await request(pathname);
  return Array.isArray(rows) ? rows[0] : rows;
}

async function ensureProfile(user, account, restaurantId = null) {
  await upsert('profiles', {
    id: user.id,
    name: account.name,
    email: account.email,
    phone: account.phone,
    role: account.role,
    status: 'active',
    restaurant_id: restaurantId,
  });
}

async function ensureVendorRestaurant(user, account) {
  const existing = await selectSingle(`/rest/v1/restaurants?owner_id=eq.${user.id}&select=id&limit=1`);
  if (existing?.id) return existing.id;

  const created = await request('/rest/v1/restaurants', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      owner_id: user.id,
      name: 'RedRush Demo Kitchen',
      cuisine: 'Fast Food',
      rating: 4.8,
      review_count: 12,
      delivery_time: '25-40 min',
      delivery_fee: 200,
      min_order: 500,
      address: 'Nairobi, Kenya',
      latitude: -1.286389,
      longitude: 36.817223,
      is_open: true,
      distance: '0 km',
      promo: 'Reviewer demo',
      categories: ['Meals', 'Drinks'],
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
      cover_image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    }),
  });

  const restaurantId = created?.[0]?.id;
  if (!restaurantId) throw new Error(`Restaurant creation failed for ${account.email}.`);

  const items = [
    { name: 'Reviewer Burger', description: 'Demo burger for app review.', price: 850, category: 'Meals', preparation_time: 15 },
    { name: 'Reviewer Rice Bowl', description: 'Demo rice bowl for app review.', price: 700, category: 'Meals', preparation_time: 12 },
    { name: 'Reviewer Juice', description: 'Demo drink for app review.', price: 250, category: 'Drinks', preparation_time: 5 },
  ];

  await request('/rest/v1/menu_items', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(items.map(item => ({
      ...item,
      restaurant_id: restaurantId,
      available: true,
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80',
    }))),
  });

  return restaurantId;
}

async function ensureRoleDetails(user, account, restaurantId) {
  await upsert('customer_profile_data', { user_id: user.id }, 'user_id').catch(error => {
    if (!error.message.includes('customer_profile_data')) throw error;
  });

  if (account.role === 'vendor') {
    await upsert('vendor_profiles', {
      user_id: user.id,
      business_name: 'RedRush Demo Kitchen',
      business_phone: account.phone,
      business_address: 'Nairobi, Kenya',
      approval_status: 'approved',
      restaurant_id: restaurantId,
    }, 'user_id');
  }

  if (account.role === 'rider') {
    await upsert('rider_profiles', {
      user_id: user.id,
      vehicle_type: 'Motorbike',
      vehicle_plate: 'RR-TEST',
      approval_status: 'approved',
      is_online: true,
      total_deliveries: 0,
    }, 'user_id');
  }

  if (account.role === 'admin') {
    await upsert('admin_profiles', {
      user_id: user.id,
      permissions: ['all'],
    }, 'user_id');
  }
}

async function verifyLogin(account) {
  await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: JSON.stringify({
      email: account.email,
      password,
    }),
  });
}

async function main() {
  for (const account of reviewerAccounts) {
    const user = await upsertAuthUser(account);
    let restaurantId = null;

    await ensureProfile(user, account);

    if (account.role === 'vendor') {
      restaurantId = await ensureVendorRestaurant(user, account);
      await ensureProfile(user, account, restaurantId);
    }

    await ensureRoleDetails(user, account, restaurantId);
    await verifyLogin(account);
    console.log(`READY ${account.role}: ${account.email}`);
  }

  console.log('\nReviewer accounts are ready.');
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
