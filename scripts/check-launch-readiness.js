const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), 'utf8');
}

const checks = [];

function check(name, ok, detail) {
  checks.push({ name, ok, detail });
}

const requiredFiles = [
  'app/privacy-policy.tsx',
  'app/terms-of-service.tsx',
  'app/account-deletion.tsx',
  'app/support.tsx',
  'supabase/migrations/010_payments_infrastructure.sql',
  'supabase/migrations/011_launch_hardening_cash_dispatch.sql',
];

requiredFiles.forEach(file => check(`Required file: ${file}`, exists(file), 'Missing file blocks store or backend readiness.'));

const forbiddenPatterns = [
  { pattern: /AIzaSyBQ0Ra/g, label: 'Hardcoded old Google Maps key' },
  { pattern: /brsqbkoxjawiimxmrttr/g, label: 'Hardcoded Supabase project ref fallback' },
  { pattern: /oSqmAG4yrfn-gWoTq2xQJjgv8fdSh_Lr6w0IL8TNcJg/g, label: 'Hardcoded Supabase service role key' },
  { pattern: /MTN MoMo Pay/g, label: 'Online payment promo visible in v1' },
];

const scanFiles = [
  'app.json',
  'README.md',
  '.env.example',
  'android/app/build.gradle',
  'android/app/src/main/AndroidManifest.xml',
  'supabase/migrations/009_setup_webhook.sql',
  'app/(customer)/index.tsx',
];

for (const { pattern, label } of forbiddenPatterns) {
  const foundIn = scanFiles.filter(file => exists(file) && pattern.test(read(file)));
  check(`No ${label}`, foundIn.length === 0, foundIn.length ? `Found in: ${foundIn.join(', ')}` : 'Clean');
}

const packageJson = JSON.parse(read('package.json'));
check('Launch check script registered', !!packageJson.scripts?.['check:launch'], 'Add npm script check:launch.');
check('Web build script registered', !!packageJson.scripts?.['build:web'], 'Required for Vercel.');
check('Supabase launch script registered', !!packageJson.scripts?.['supabase:launch'], 'Required for production migration command.');

const appJson = JSON.parse(read('app.json'));
check('Android package set', appJson.expo?.android?.package === 'com.redrush.app', 'Expected com.redrush.app.');
check('iOS bundle identifier set', !!appJson.expo?.ios?.bundleIdentifier, 'Required for App Store.');
check('Online payment keys are not public', !read('.env.example').includes('EXPO_PUBLIC_PAYSTACK'), 'Payment secrets must stay server-only.');

const androidBuild = read('android/app/build.gradle');
check(
  'Release build uses release signing or EAS remote signing',
  androidBuild.includes('signingConfig signingConfigs.release') &&
    androidBuild.includes('Production release signing is not configured') &&
    androidBuild.includes("System.getenv('EAS_BUILD')") &&
    !androidBuild.includes('release {\n            // Caution') &&
    !androidBuild.includes('release {\r\n            // Caution'),
  'Release builds must not use debug signing; EAS remote credentials are allowed.'
);

const failures = checks.filter(item => !item.ok);
for (const item of checks) {
  const mark = item.ok ? 'PASS' : 'FAIL';
  console.log(`${mark} ${item.name}${item.detail ? ` - ${item.detail}` : ''}`);
}

if (failures.length) {
  console.error(`\nLaunch readiness failed: ${failures.length} issue(s).`);
  process.exit(1);
}

console.log('\nLaunch readiness checks passed.');
