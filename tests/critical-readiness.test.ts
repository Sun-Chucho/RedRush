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

test('native and web location use platform permission prompts and GPS currency', () => {
  const currencyContext = read('contexts/CurrencyContext.tsx');
  assert.match(currencyContext, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(currencyContext, /navigator\.permissions\?\.query/);
  assert.match(currencyContext, /permission\?\.state === 'denied'/);
  assert.match(currencyContext, /withTimeout\(new Promise<ReadableLocation>/);
  assert.match(currencyContext, /Platform\.OS === 'web'/);
  assert.match(currencyContext, /requestForegroundPermissionsAsync\(\)/);
  assert.match(currencyContext, /currencyForCoordinates\(current\.coords\.latitude, current\.coords\.longitude\)/);
  assert.match(currencyContext, /reverseGeocodeAsync[\s\S]*\.catch\(\(\) => \[\]\)/);
  assert.doesNotMatch(currencyContext, /showAlert/);
});

test('theme hydration never hides the entire application', () => {
  const theme = read('contexts/ThemeContext.tsx');
  const html = read('app/+html.tsx');
  assert.doesNotMatch(theme, /if \(!ready\) return null/);
  assert.match(theme, /ThemeContext\.Provider value=\{value\}>\{children\}/);
  assert.match(html, /background: #120D0D/);
  assert.match(html, /name="theme-color"/);
});

test('theme changes rebuild screen styles without an app reload', () => {
  const theme = read('contexts/ThemeContext.tsx');
  const tokens = read('constants/theme.ts');
  const settings = read('app/settings.tsx');

  assert.match(theme, /setMode\(nextMode\)/);
  assert.match(theme, /ThemeRefreshBoundary/);
  assert.match(tokens, /themeRevision \+= 1/);
  assert.match(tokens, /createThemedStyles/);
  assert.match(settings, /createThemedStyles\(\(\) =>/);
});

test('image selection uses the system picker without camera or recording permissions', () => {
  const appJson = JSON.parse(read('app.json'));
  const imagePicker = appJson.expo.plugins.find((plugin: unknown) => (
    Array.isArray(plugin) && plugin[0] === 'expo-image-picker'
  ));

  assert.deepEqual(imagePicker?.[1], {
    photosPermission: false,
    cameraPermission: false,
    microphonePermission: false,
  });
  for (const permission of [
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
  ]) {
    assert.equal(appJson.expo.android.blockedPermissions.includes(permission), true);
  }
  assert.equal('NSCameraUsageDescription' in appJson.expo.ios.infoPlist, false);
  assert.equal('NSMicrophoneUsageDescription' in appJson.expo.ios.infoPlist, false);
  assert.equal('NSPhotoLibraryUsageDescription' in appJson.expo.ios.infoPlist, false);
});

test('startup requests platform location without a custom permission modal', () => {
  const layout = read('app/_layout.tsx');
  assert.match(layout, /function NativeLocationBootstrap/);
  assert.doesNotMatch(layout, /attempted\.current/);
  assert.match(layout, /refreshLocationCurrency\(\)\.catch/);
  assert.doesNotMatch(layout, /Location needed/);
  assert.doesNotMatch(layout, /useAlert/);
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

test('slow or blocked realtime connections fall back to REST order and rider polling', () => {
  const client = read('services/supabase.ts');
  const orders = read('contexts/OrderContext.tsx');
  const riderLocation = read('services/riderLocation.ts');
  assert.match(client, /timeout: 30000/);
  assert.match(orders, /status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT'/);
  assert.match(orders, /setInterval[\s\S]*12000/);
  assert.match(riderLocation, /status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT'/);
  assert.match(riderLocation, /setInterval[\s\S]*5000/);
});

test('desktop web uses desktop width while phone web keeps the mobile shell', () => {
  const layout = read('app/_layout.tsx');
  const customerTabs = read('app/(customer)/_layout.tsx');
  const customerHome = read('app/(customer)/index.tsx');
  const tracking = read('app/order/[id].tsx');
  assert.match(layout, /width < 768/);
  assert.doesNotMatch(layout, /width >= 768/);
  assert.match(customerTabs, /tabBarPosition: useSidebar \? 'left' : 'bottom'/);
  assert.match(customerHome, /restaurantGridWide/);
  assert.match(tracking, /trackingGridWide/);
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

test('rider tracking uses a native background task and never invents customer-facing GPS', () => {
  const tracking = read('services/riderLocation.ts');
  const orderScreen = read('app/order/[id].tsx');
  const riderScreen = read('app/(rider)/index.tsx');
  const appJson = JSON.parse(read('app.json'));
  assert.match(tracking, /TaskManager\.defineTask/);
  assert.match(tracking, /startLocationUpdatesAsync/);
  assert.match(tracking, /foregroundService/);
  assert.equal(appJson.expo.android.permissions.includes('ACCESS_BACKGROUND_LOCATION'), true);
  assert.doesNotMatch(orderScreen, /RIDER_DEFAULT|RESTAURANT_COORDS|CUSTOMER_COORDS/);
  assert.match(orderScreen, /isRiderTrackingExpected && !!riderCoords/);
  assert.doesNotMatch(riderScreen, /3\.2 km/);
  assert.match(riderScreen, /sort\(\(a, b\) => a\.distanceKm - b\.distanceKm\)/);
});

test('vendors and riders operate before approval while withdrawals require verification', () => {
  const restaurants = read('services/supabaseRestaurants.ts');
  const riderScreen = read('app/(rider)/index.tsx');
  const profileSettings = read('services/supabaseProfileSettings.ts');
  const payoutPolicy = read('supabase/migrations/021_operations_before_payout_verification.sql');

  assert.doesNotMatch(restaurants, /requireApprovedVendor|must be approved before managing/);
  assert.doesNotMatch(riderScreen, /Complete rider setup|before taking rides/);
  assert.match(profileSettings, /Verification is required for withdrawals, not for accepting deliveries/);
  assert.match(payoutPolicy, /payout requests self create/);
  assert.match(payoutPolicy, /vendor_profiles\.approval_status = 'approved'/);
  assert.match(payoutPolicy, /rider_profiles\.approval_status = 'approved'/);
  assert.match(payoutPolicy, /legal_document_url <> ''/);
  assert.match(payoutPolicy, /id_document_url <> ''/);
});

test('live tracking keeps one map alive and animates a red road route', () => {
  const tracking = read('services/riderLocation.ts');
  const map = read('components/mapLeaflet.ts');
  const nativeMap = read('components/MapViewCompat.native.tsx');
  const webMap = read('components/MapViewCompat.web.tsx');
  const order = read('app/order/[id].tsx');

  assert.match(tracking, /BestForNavigation/);
  assert.match(tracking, /requestBackground\?: boolean/);
  assert.match(tracking, /Foreground tracking remains active/);
  assert.match(tracking, /subscribeToOwnRiderLocation/);
  assert.match(map, /animateMarker/);
  assert.match(map, /REDRUSH_MAP_UPDATE/);
  assert.match(map, /color: '#CC0000'/);
  assert.match(nativeMap, /postMessage/);
  assert.match(webMap, /contentWindow\?\.postMessage/);
  assert.match(order, /rotation=\{riderCoords\?\.heading\}/);
  assert.match(order, /strokeColor=\{Colors\.primary\} strokeWidth=\{5\}/);
});

test('customer About copy describes food delivery without implementation details', () => {
  const profile = read('app/(customer)/profile.tsx');
  assert.match(profile, /RedRush is a food delivery app/);
  assert.doesNotMatch(profile, /Supabase|Expo SDK|React Native 0\.81/);
});

test('checkout is cash-only and uses restaurant pricing with atomic promo redemption', () => {
  const checkout = read('app/checkout.tsx');
  const cart = read('app/(customer)/cart.tsx');
  const sql = read('supabase/migrations/020_prelaunch_integrity_repairs.sql');
  assert.doesNotMatch(checkout, /const deliveryFee = 500/);
  assert.doesNotMatch(cart, /const deliveryFee = 500/);
  assert.match(checkout, /Mobile Money and cards — coming soon/);
  assert.match(sql, /unique \(user_id, promo_code\)/);
  assert.match(sql, /'Cash on Delivery'/);
  assert.match(sql, /insert into public\.promo_redemptions/);
});

test('account controls, chat participation, and account-scoped carts are enforced', () => {
  const sql = read('supabase/migrations/020_prelaunch_integrity_repairs.sql');
  const admin = read('app/(admin)/users.tsx');
  const cart = read('contexts/CartContext.tsx');
  assert.match(sql, /admin_set_profile_status/);
  assert.match(sql, /status in \('suspended', 'banned'\)/);
  assert.match(sql, /chat messages participant create/);
  assert.match(admin, /updateSupabaseUserStatus/);
  assert.match(cart, /redrush-cart-v2/);
  assert.match(cart, /user\?\.id \|\| 'guest'/);
});

test('chat and support recover from unavailable realtime', () => {
  const chat = read('services/supabaseChat.ts');
  const support = read('services/supabaseSupport.ts');
  assert.match(chat, /setInterval\(\(\) => void pollMessages\(\), 7000\)/);
  assert.match(chat, /CHANNEL_ERROR.*TIMED_OUT.*CLOSED/s);
  assert.match(support, /setInterval\(refresh, 10000\)/);
  assert.match(support, /setInterval\(refresh, 7000\)/);
});

test('Android notification channels exist before the runtime permission prompt', () => {
  const notifications = read('services/notifications.ts');
  const channelIndex = notifications.indexOf('await configureAndroidChannels(Notifications)');
  const permissionIndex = notifications.indexOf('await Notifications.requestPermissionsAsync()');
  assert.ok(channelIndex >= 0 && permissionIndex > channelIndex);
  assert.match(notifications, /canAskAgain/);
  assert.match(notifications, /Install the RedRush test or Play Store build/);
  assert.match(read('android/app/src/main/AndroidManifest.xml'), /POST_NOTIFICATIONS/);
});
