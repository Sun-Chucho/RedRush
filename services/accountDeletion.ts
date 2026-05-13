const apiBaseUrl = (
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_WEB_URL ||
  'https://red-rush.vercel.app'
).replace(/\/$/, '');

export async function requestAccountDeletion(input: { email: string; details?: string }) {
  const email = input.email.trim().toLowerCase();
  if (!email) throw new Error('Enter the email address on your RedRush account.');

  const response = await fetch(`${apiBaseUrl}/api/account-deletion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      details: input.details?.trim() || '',
    }),
  });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Unable to submit account deletion request.');
  }

  return true;
}
