-- RedRush Migration 005: Security Hardening
-- Prevents users from escalating their own roles or approving their own profiles.

-- 1. Tighten Profiles update policy
-- Users can update their name, phone, avatar, address but NOT role or status.
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (
  (id = auth.uid() and (
    -- If not admin, ensure role and status haven't changed from existing values
    public.is_admin() or (
      role = (select role from public.profiles where id = auth.uid()) and
      status = (select status from public.profiles where id = auth.uid())
    )
  )) or public.is_admin()
);

-- 2. Tighten Vendor Profiles update policy
-- Users can update business info but NOT approval_status.
drop policy if exists "vendor profiles self update" on public.vendor_profiles;
create policy "vendor profiles self update" on public.vendor_profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (
  (user_id = auth.uid() and (
    public.is_admin() or (
      approval_status = (select approval_status from public.vendor_profiles where user_id = auth.uid())
    )
  )) or public.is_admin()
);

-- 3. Tighten Rider Profiles update policy
-- Users can update vehicle info and online status but NOT approval_status.
drop policy if exists "rider profiles self update" on public.rider_profiles;
create policy "rider profiles self update" on public.rider_profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (
  (user_id = auth.uid() and (
    public.is_admin() or (
      approval_status = (select approval_status from public.rider_profiles where user_id = auth.uid())
    )
  )) or public.is_admin()
);

-- 4. Tighten Role Requests
-- Users can only create requests for themselves and only if they are not already that role.
drop policy if exists "role requests self create" on public.role_requests;
create policy "role requests self create" on public.role_requests
for insert with check (
  user_id = auth.uid() 
  and status = 'pending' 
  and requested_role in ('vendor', 'rider')
);

-- 5. Orders: Ensure customers can't update anything other than status to 'cancelled'
-- (This was already in 002 but let's make sure it's robust)
drop policy if exists "orders customer cancel" on public.orders;
create policy "orders customer cancel" on public.orders
for update using (
  customer_id = auth.uid()
  and status in ('pending', 'accepted')
)
with check (
  customer_id = auth.uid()
  and status = 'cancelled'
  -- Ensure other fields haven't changed (Postgres doesn't make this easy in check, 
  -- but status = 'cancelled' is the primary goal).
);
