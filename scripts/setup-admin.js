const { execSync } = require('child_process');

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'redrush-ebc04';
const ADMIN_EMAIL = process.env.REDRUSH_ADMIN_EMAIL || 'ogollachucho@gmail.com';
const ADMIN_PASSWORD = process.env.REDRUSH_ADMIN_PASSWORD || '@ogolla510';

function getFirebaseToken() {
  const raw = execSync('firebase login:list --json', { encoding: 'utf8', shell: true });
  const parsed = JSON.parse(raw);
  const account = parsed.result?.[0];

  if (!account?.tokens?.access_token) {
    throw new Error('No Firebase CLI access token found. Run `firebase login` first.');
  }

  return account.tokens.access_token;
}

async function identityToolkit(token, endpoint, body) {
  const response = await fetch(`https://www.googleapis.com/identitytoolkit/v3/relyingparty/${endpoint}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ targetProjectId: PROJECT_ID, ...body }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`${endpoint} failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function firestorePatch(token, path, fields) {
  const response = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: 'PATCH',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Firestore patch failed: ${JSON.stringify(data)}`);
  }
  return data;
}

function stringValue(value) {
  return { stringValue: value };
}

function boolValue(value) {
  return { booleanValue: value };
}

function timestampValue(date = new Date()) {
  return { timestampValue: date.toISOString() };
}

async function main() {
  const token = getFirebaseToken();
  const download = await identityToolkit(token, 'downloadAccount', { maxResults: 1000 });
  const users = download.users || [];
  const admin = users.find(user => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());

  if (!admin) {
    throw new Error(`Admin email ${ADMIN_EMAIL} does not exist in Firebase Auth. Create it once in the app or Firebase Console, then rerun this script.`);
  }

  for (const user of users) {
    if (user.localId !== admin.localId) {
      await identityToolkit(token, 'deleteAccount', { localId: user.localId });
      await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/users/${user.localId}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${token}` },
      }).catch(() => undefined);
      console.log(`Deleted user ${user.email || user.localId}`);
    }
  }

  await identityToolkit(token, 'setAccountInfo', {
    localId: admin.localId,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    displayName: admin.displayName || 'RedRush Admin',
    emailVerified: true,
  });

  await firestorePatch(token, `users/${admin.localId}`, {
    id: stringValue(admin.localId),
    name: stringValue(admin.displayName || 'RedRush Admin'),
    email: stringValue(ADMIN_EMAIL),
    phone: stringValue(''),
    role: stringValue('admin'),
    status: stringValue('active'),
    emailVerified: boolValue(true),
    updatedAt: timestampValue(),
    createdAt: timestampValue(new Date(Number(admin.createdAt || Date.now()))),
  });

  console.log(`Admin ready: ${ADMIN_EMAIL}`);
  console.log(`Remaining Auth users: 1`);
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
