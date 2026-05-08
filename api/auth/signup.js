const ALLOWED_ROLES = new Set(['customer', 'vendor', 'rider']);

function send(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.end(JSON.stringify(body));
}

async function supabaseRequest(path, options = {}) {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '';

  if (!url || !serviceRoleKey) {
    throw new Error('Server Supabase environment is not configured.');
  }

  const response = await fetch(`${url}${path}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = new Error(body?.msg || body?.message || text || 'Supabase request failed.');
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

async function createUser({ email, password, name, phone, role }) {
  try {
    return await supabaseRequest('/auth/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { name, phone, role },
      }),
    });
  } catch (error) {
    const message = `${error.message || ''}`.toLowerCase();
    if (error.status === 422 || message.includes('already')) {
      const duplicate = new Error('That email is already registered. Please sign in instead.');
      duplicate.status = 409;
      throw duplicate;
    }
    throw error;
  }
}

async function upsertRoleDetails(userId, { name, phone, role }) {
  await supabaseRequest('/rest/v1/customer_profile_data', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ user_id: userId }),
  });

  if (role === 'vendor') {
    await supabaseRequest('/rest/v1/vendor_profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: userId,
        business_name: name,
        business_phone: phone,
      }),
    });
  }

  if (role === 'rider') {
    await supabaseRequest('/rest/v1/rider_profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ user_id: userId }),
    });
  }
}

module.exports = async function handler(request, response) {
  if (request.method === 'OPTIONS') {
    send(response, 204, {});
    return;
  }

  if (request.method !== 'POST') {
    send(response, 405, { error: 'Method not allowed.' });
    return;
  }

  try {
    const payload = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : request.body || {};
    const email = String(payload.email || '').trim().toLowerCase();
    const password = String(payload.password || '');
    const name = String(payload.name || '').trim();
    const phone = String(payload.phone || '').trim();
    const role = ALLOWED_ROLES.has(payload.role) ? payload.role : 'customer';

    if (!email || !password || !name || !phone) {
      send(response, 400, { error: 'Name, phone, email, and password are required.' });
      return;
    }

    if (password.length < 6) {
      send(response, 400, { error: 'Password must be at least 6 characters.' });
      return;
    }

    const user = await createUser({ email, password, name, phone, role });
    await supabaseRequest('/rest/v1/profiles', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify({
        id: user.id,
        name,
        email,
        phone,
        role,
        status: 'active',
      }),
    });
    await upsertRoleDetails(user.id, { name, phone, role });

    send(response, 200, {
      user: {
        id: user.id,
        name,
        email,
        phone,
        role,
      },
    });
  } catch (error) {
    send(response, error.status || 500, {
      error: error.message || 'Unable to create account.',
    });
  }
};
