const ALLOWED_ROLES = new Set(['customer', 'vendor', 'rider']);
const ALLOWED_ORIGINS = new Set([
  'https://redrush.africa',
  'https://www.redrush.africa',
  'https://red-rush.vercel.app',
  ...(process.env.ALLOWED_SIGNUP_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean),
]);
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 8;
const attempts = new Map();

function send(response, status, body) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json');
  response.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.end(JSON.stringify(body));
}

function requestIp(request) {
  return String(request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function isRateLimited(request, email) {
  const now = Date.now();
  const key = `${requestIp(request)}:${email}`;
  const recent = (attempts.get(key) || []).filter(timestamp => now - timestamp < RATE_WINDOW_MS);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > RATE_LIMIT;
}

async function verifyTurnstile(request, token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token, remoteip: requestIp(request) });
  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const payload = await result.json();
  return payload.success === true;
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

async function supabaseSignup({ email, password, name, phone, role }) {
  const url = (process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').replace(/\/$/, '');
  const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !publicKey) throw new Error('Server Supabase signup environment is not configured.');
  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: publicKey, Authorization: `Bearer ${publicKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      data: { name, phone, role },
      gotrue_meta_security: {},
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.msg || body?.message || body?.error_description || 'Unable to create account.');
    error.status = response.status;
    throw error;
  }
  return body.user || body;
}

async function createUser({ email, password, name, phone, role }) {
  try {
    return await supabaseSignup({ email, password, name, phone, role });
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
  const origin = String(request.headers.origin || '');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    send(response, 403, { error: 'Origin not allowed.' });
    return;
  }
  if (origin) response.setHeader('Access-Control-Allow-Origin', origin);
  response.setHeader('Vary', 'Origin');

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

    if (isRateLimited(request, email)) {
      send(response, 429, { error: 'Too many signup attempts. Please wait 15 minutes and try again.' });
      return;
    }

    if (!(await verifyTurnstile(request, payload.captchaToken))) {
      send(response, 400, { error: 'Please complete the security check and try again.' });
      return;
    }

    if (!email || !password || !name || !phone) {
      send(response, 400, { error: 'Name, phone, email, and password are required.' });
      return;
    }

    if (password.length < 8) {
      send(response, 400, { error: 'Password must be at least 8 characters.' });
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
        status: role === 'customer' ? 'active' : 'pending',
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
