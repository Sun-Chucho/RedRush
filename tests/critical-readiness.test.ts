import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('password recovery routes are exported and routed on Vercel', () => {
  assert.equal(fs.existsSync(path.join(root, 'app/forgot-password.tsx')), true);
  assert.equal(fs.existsSync(path.join(root, 'app/reset-password.tsx')), true);
  assert.match(read('vercel.json'), /forgot-password/);
  assert.match(read('vercel.json'), /reset-password/);
});

test('native launch never blocks first paint on authentication restore', () => {
  const welcome = read('components/AppWelcome.tsx');
  assert.doesNotMatch(welcome, /ActivityIndicator/);
  assert.match(welcome, /!isLoading && isAuthenticated/);
});

test('native location selects currency from GPS without requiring reverse geocoding', () => {
  const currencyContext = read('contexts/CurrencyContext.tsx');
  assert.match(currencyContext, /Platform\.OS !== 'web'/);
  assert.match(currencyContext, /requestForegroundPermissionsAsync\(\)/);
  assert.match(currencyContext, /currencyForCoordinates\(current\.coords\.latitude, current\.coords\.longitude\)/);
  assert.match(currencyContext, /reverseGeocodeAsync[\s\S]*\.catch\(\(\) => \[\]\)/);
});

test('native startup explicitly requests location and reports permission failures', () => {
  const layout = read('app/_layout.tsx');
  assert.match(layout, /function NativeLocationBootstrap/);
  assert.doesNotMatch(layout, /attempted\.current/);
  assert.match(layout, /refreshLocationCurrency\(\)\.catch/);
  assert.match(layout, /Open Settings/);
});

test('native Google OAuth returns to the installed app', () => {
  const auth = read('services/supabaseAuth.ts');
  const manifest = read('android/app/src/main/AndroidManifest.xml');
  assert.match(auth, /NATIVE_AUTH_CALLBACK = 'redrush:\/\/auth-callback'/);
  assert.match(auth, /skipBrowserRedirect: Platform\.OS !== 'web'/);
  assert.match(auth, /Constants\.appOwnership === 'expo'/);
  assert.match(manifest, /android:scheme="redrush"/);
});

test('vendor realtime waits for its restaurant before opening an order channel', () => {
  const orders = read('contexts/OrderContext.tsx');
  assert.match(orders, /user\.role === 'vendor' && !vendorRestaurantId/);
  assert.match(orders, /orders-\$\{user\.id\}-\$\{vendorRestaurantId \|\| user\.role\}/);
});

test('desktop web uses desktop width while phone web keeps the mobile shell', () => {
  const layout = read('app/_layout.tsx');
  assert.match(layout, /width < 768/);
  assert.doesNotMatch(layout, /width >= 768/);
});

test('release branding uses the large square R assets', () => {
  const appJson = JSON.parse(read('app.json'));
  assert.equal(appJson.expo.icon, './assets/images/app-icon-v2.png');
  assert.equal(appJson.expo.android.adaptiveIcon.foregroundImage, './assets/images/adaptive-icon-v2.png');
  assert.equal(appJson.expo.web.favicon, './assets/images/favicon-v2.png');
  assert.equal(appJson.expo.plugins[1][1].image, './assets/images/splash-r-v2.png');
  for (const asset of ['app-icon-v2.png', 'adaptive-icon-v2.png', 'favicon-v2.png', 'splash-r-v2.png']) {
    assert.equal(fs.existsSync(path.join(root, 'assets/images', asset)), true);
  }
});

test('atomic order migration writes order, payment, and items in one function', () => {
  const sql = read('supabase/migrations/016_atomic_order_creation.sql');
  assert.match(sql, /create_order_atomic/);
  assert.match(sql, /insert into public\.orders/);
  assert.match(sql, /insert into public\.payments/);
  assert.match(sql, /insert into public\.order_items/);
});

test('push dispatch uses saved restaurant coordinates without a city fallback', () => {
  const source = read('supabase/functions/push-notifications/index.ts');
  assert.match(source, /record\.restaurant_latitude/);
  assert.match(source, /record\.restaurant_longitude/);
  assert.doesNotMatch(source, /Lagos center/);
});

test('verification documents use a private bucket', () => {
  const sql = read('supabase/migrations/017_private_verification_documents.sql');
  assert.match(sql, /'verification-documents'/);
  assert.match(sql, /false,/);
  assert.match(sql, /auth\.uid\(\)::text/);
});

test('order push webhook stores credentials in Vault', () => {
  const sql = read('supabase/migrations/018_secure_order_push_webhook.sql');
  assert.match(sql, /vault\.decrypted_secrets/i);
  assert.match(sql, /on_orders_push_webhook/i);
  assert.doesNotMatch(sql, /service_role_key/i);
});

test('trusted maintenance still follows the order transition graph', () => {
  const sql = read('supabase/migrations/019_service_role_order_maintenance.sql');
  assert.match(sql, /auth\.role\(\)\s*=\s*'service_role'/i);
  assert.match(sql, /valid_sequence/i);
});
