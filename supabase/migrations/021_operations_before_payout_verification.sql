-- Vendors and riders may operate immediately. Verification is enforced only
-- when money leaves the platform through a payout request.

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
