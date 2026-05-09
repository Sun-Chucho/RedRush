-- RedRush Migration 007: persisted rider/vendor settings and order timing.
-- Apply after 003/004. Keeps settings empty by default so new accounts show no demo data.

alter table public.orders
  add column if not exists prep_time integer,
  add column if not exists delivery_time integer;

alter table public.rider_profiles
  add column if not exists bank_name text not null default '',
  add column if not exists bank_account_name text not null default '',
  add column if not exists bank_account_number text not null default '',
  add column if not exists mobile_money_provider text not null default '',
  add column if not exists mobile_money_phone text not null default '',
  add column if not exists license_document_url text not null default '',
  add column if not exists insurance_document_url text not null default '',
  add column if not exists id_document_url text not null default '',
  add column if not exists notification_settings jsonb not null default '{
    "orderUpdates": true,
    "payouts": true,
    "account": true
  }'::jsonb;

alter table public.vendor_profiles
  add column if not exists payout_bank_name text not null default '',
  add column if not exists payout_account_name text not null default '',
  add column if not exists payout_account_number text not null default '',
  add column if not exists payout_mobile_money_provider text not null default '',
  add column if not exists payout_mobile_money_phone text not null default '',
  add column if not exists legal_document_url text not null default '',
  add column if not exists notification_settings jsonb not null default '{
    "orderUpdates": true,
    "payouts": true,
    "account": true
  }'::jsonb,
  add column if not exists auto_accept_orders boolean not null default false;

create index if not exists orders_restaurant_status_idx on public.orders(restaurant_id, status);
create index if not exists orders_rider_status_idx on public.orders(rider_id, status);
