# RedRush

RedRush is a food ordering and delivery app built with Expo, React Native, Expo Router, Supabase, and Vercel.

## Current Release Mode

- Live payment mode: Cash on Delivery
- Online payment infrastructure: Paystack and M-Pesa placeholders are prepared, but disabled until provider verification and webhook confirmation are complete.
- Backend: Supabase auth, database, RLS, realtime, push token storage, order management, support, vendor/rider profiles, and payment ledger tables.
- Web deployment: Vercel static export from `dist`.

## Development

```bash
pnpm install
pnpm build:web
npm run lint
```

Start Expo:

```bash
npm run start
npm run web
npm run android
```

## Required Environment

Copy `.env.example` to `.env.local` and fill in:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` for scripts only
- `EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME`
- `EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
- `GOOGLE_MAPS_API_KEY` only if you enable native Google Maps. The current in-app maps use Leaflet/OpenStreetMap and do not require a Google key.

Google sign-in uses Supabase OAuth (the public Google client IDs are not read by
the app directly). In Supabase Authentication > Providers, enable Google with a
Google Web OAuth client ID and client secret. Add these redirect URLs to the
Supabase allow list:

- `https://red-rush.vercel.app/auth-callback`
- the relevant local web URL ending in `/auth-callback`
- `redrush://auth-callback` for installed iOS/Android builds
- `https://red-rush.vercel.app/reset-password`
- `redrush://reset-password`

Also add the Supabase callback shown on the Google provider page to the Google
Cloud OAuth client's authorized redirect URIs.

Future online payment keys are listed in `.env.example`, but must stay server-only.

Android local release builds require these environment variables or Gradle properties:

- `REDRUSH_RELEASE_STORE_FILE`
- `REDRUSH_RELEASE_STORE_PASSWORD`
- `REDRUSH_RELEASE_KEY_ALIAS`
- `REDRUSH_RELEASE_KEY_PASSWORD`

EAS cloud builds use `credentials.json` and the ignored local keystore in `credentials/android/`.

## Build

Web:

```bash
npm run build
```

Android APK, through EAS:

```bash
eas build --platform android --profile production-apk
```

Android App Bundle for Google Play, through EAS:

```bash
eas build --platform android --profile production
```

The Android release configuration enables Hermes, R8 minification, resource shrinking, PNG crunching, and EAS signing. For Google Play production, submit the Android App Bundle from the `production` profile.

Maps:

- The v1 in-app map renderer uses Leaflet with OpenStreetMap tiles inside WebView/iframe.
- It renders restaurant/customer/rider pins and route polylines without a Google Maps key.
- Rider navigation still opens the device maps app for turn-by-turn directions.

## Deployment

Vercel uses:

- Build command: `pnpm build:web`
- Output directory: `dist`
- Node version: pinned to `22.x` in `package.json`

Production deploy:

```bash
vercel pull --yes --environment=production
vercel build --prod
vercel deploy --prebuilt --prod --yes
```

## Store Readiness

Public web routes included for store review:

- `/privacy-policy`
- `/terms-of-service`
- `/account-deletion`
- `/support`

Android permissions are limited to location, notifications/vibration, internet, and media selection. Image/document uploads are intentionally deferred for v1 verification; rider verification uses ID number, vehicle type, number plate, payout details, and admin approval.

Google Play first release:

- Use `eas build --platform android --profile production` for the Android App Bundle submitted to Play Console.
- Use `eas build --platform android --profile production-apk` only when you need an installable APK for internal testing.
- New personal Google Play developer accounts must complete closed testing before production access. Plan for at least 12 opted-in testers over 14 continuous days.

## Production V1 Launch Checklist

Run launch checks in OnSpace/EAS before building:

```bash
pnpm check:launch
pnpm exec tsc --noEmit
pnpm lint
pnpm build:web
```

Apply production database migrations:

```powershell
$env:SUPABASE_DB_URL="postgresql://..."
pnpm supabase:launch
```

The location-accuracy release requires `supabase/migrations/014_location_accuracy_enforcement.sql`.
It adds saved restaurant/customer route coordinates to orders and closes live restaurants that do not have a valid GPS pin until the vendor/admin saves one.

Apply `supabase/migrations/015_order_workflow_enforcement.sql` as well. It prevents
customers, vendors, riders, or stale clients from skipping required order states.

Apply migrations 016, 017, and 018 after it:

- `016_atomic_order_creation.sql` creates the order, cash payment ledger, and
  item snapshots in one database transaction.
- `017_private_verification_documents.sql` creates a private verification bucket
  for vendor/rider documents with owner/admin-only access.
- `018_secure_order_push_webhook.sql` sends order changes to the Edge Function
  asynchronously and keeps webhook credentials encrypted in Supabase Vault.

## Production Activation Checks

Run the read-only live audit after applying migrations and deploying:

```bash
pnpm check:live
```

For remote notifications, deploy `supabase/functions/push-notifications`, apply
migration 018, then run `pnpm configure:push-webhook`. Verify on
physical customer, vendor, and rider devices; Expo Go does not provide the
production push-notification behavior.

Cash on Delivery remains the only enabled payment method. Paystack and M-Pesa
must remain disabled until merchant credentials, signed webhooks, refunds,
idempotency, and settlement reconciliation are available.

If migrations 001-009 are already applied and you only need the final launch tables/policies, apply:

```powershell
npx --yes supabase db query --db-url "$env:SUPABASE_DB_URL" --file ".\supabase\migrations\010_payments_infrastructure.sql"
npx --yes supabase db query --db-url "$env:SUPABASE_DB_URL" --file ".\supabase\migrations\011_launch_hardening_cash_dispatch.sql"
```

Create or verify:

- Admin account
- Real restaurants and menu data
- Approved vendor accounts
- Approved rider accounts
- Push notification function secrets
- Android release signing environment variables
- Store reviewer customer/vendor/rider/admin test credentials

Cash-only operating process:

1. Customer places a Cash on Delivery order.
2. Vendor accepts, prepares, and marks the order ready.
3. Admin assigns an approved online rider.
4. Rider confirms pickup.
5. Rider collects cash and marks the order delivered.
6. Admin reconciles cash and marks collected cash as remitted.
7. Vendor/rider payout records are handled manually for v1.

Do not enable Paystack or M-Pesa until provider verification, webhooks, refunds, and settlement reporting are tested end to end.
