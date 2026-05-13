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
    throw error;
  }

  return body;
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    const details = String(payload.details || '').trim().slice(0, 1200);

    if (!validEmail(email)) {
      send(response, 400, { error: 'Enter a valid account email address.' });
      return;
    }

    const encodedEmail = encodeURIComponent(email);
    const profiles = await supabaseRequest(`/rest/v1/profiles?email=eq.${encodedEmail}&select=id,name,email,role&limit=1`);
    const profile = Array.isArray(profiles) ? profiles[0] : null;

    if (profile?.id) {
      const subject = 'Account deletion request';
      const message = [
        `Account deletion requested for ${email}.`,
        details ? `User details: ${details}` : '',
        'Requested from the public account deletion page.',
      ].filter(Boolean).join('\n\n');

      const threads = await supabaseRequest('/rest/v1/support_threads', {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          user_id: profile.id,
          user_name: profile.name || email,
          user_role: profile.role || 'customer',
          subject,
          status: 'open',
          last_message: message,
        }),
      });
      const threadId = threads?.[0]?.id;

      if (threadId) {
        await supabaseRequest('/rest/v1/support_messages', {
          method: 'POST',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({
            thread_id: threadId,
            sender_id: profile.id,
            sender_name: profile.name || email,
            sender_role: profile.role || 'customer',
            text: message,
          }),
        });
      }
    }

    send(response, 200, {
      ok: true,
      message: 'If this email matches a RedRush account, a deletion request has been recorded for review.',
    });
  } catch (error) {
    send(response, error.status || 500, {
      error: error.message || 'Unable to submit account deletion request.',
    });
  }
};
