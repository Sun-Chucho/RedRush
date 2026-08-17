-- Vendors and riders may operate immediately. Verification is enforced only
-- when money leaves the platform through a payout request.

-- Some early production databases recorded migration 007 before all profile
-- settings columns were present. Reconcile those databases before creating a
-- policy that depends on the verification and payout fields.
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

drop policy if exists "payout requests self create" on public.payout_requests;
create policy "payout requests self create" on public.payout_requests
for insert with check (
  user_id = auth.uid()
  and (
    (
      role = 'vendor'
      and exists (
        select 1
        from public.vendor_profiles
        where vendor_profiles.user_id = auth.uid()
          and vendor_profiles.approval_status = 'approved'
          and vendor_profiles.legal_document_url <> ''
          and (
            vendor_profiles.payout_account_number <> ''
            or vendor_profiles.payout_mobile_money_phone <> ''
          )
      )
    )
    or
    (
      role = 'rider'
      and exists (
        select 1
        from public.rider_profiles
        where rider_profiles.user_id = auth.uid()
          and rider_profiles.approval_status = 'approved'
          and rider_profiles.id_document_url <> ''
          and rider_profiles.license_document_url <> ''
          and (
            rider_profiles.bank_account_number <> ''
            or rider_profiles.mobile_money_phone <> ''
          )
      )
    )
  )
);
