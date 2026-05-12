param(
  [string]$DbUrl = $env:SUPABASE_DB_URL
)

$ErrorActionPreference = "Stop"

if (-not $DbUrl) {
  Write-Error "Missing SUPABASE_DB_URL. Use the Supabase Session Pooler connection string, for example: `$env:SUPABASE_DB_URL='postgresql://...'"
}

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$migrationsDir = Join-Path $root "supabase\migrations"
$migrationFiles = Get-ChildItem -Path $migrationsDir -Filter "*.sql" | Sort-Object Name

if (-not $migrationFiles -or $migrationFiles.Count -eq 0) {
  Write-Error "No migration files found in $migrationsDir"
}

Write-Host "Applying Supabase migrations in order..."
foreach ($file in $migrationFiles) {
  Write-Host "Applying $($file.Name)..."
  npx --yes supabase db query --db-url "$DbUrl" --file "$file"
}

$verifySql = @"
select 'profiles' as table_name, count(*)::int as row_count from public.profiles
union all select 'customer_profile_data', count(*)::int from public.customer_profile_data
union all select 'vendor_profiles', count(*)::int from public.vendor_profiles
union all select 'rider_profiles', count(*)::int from public.rider_profiles
union all select 'admin_profiles', count(*)::int from public.admin_profiles
union all select 'restaurants', count(*)::int from public.restaurants
union all select 'menu_items', count(*)::int from public.menu_items
union all select 'orders', count(*)::int from public.orders
union all select 'promo_codes', count(*)::int from public.promo_codes
order by table_name;
"@

$verifyFile = Join-Path $env:TEMP "redrush-supabase-launch-verify.sql"
Set-Content -Path $verifyFile -Value $verifySql -Encoding UTF8

Write-Host "Verifying launch table counts..."
npx --yes supabase db query --db-url "$DbUrl" --file "$verifyFile" --output table
