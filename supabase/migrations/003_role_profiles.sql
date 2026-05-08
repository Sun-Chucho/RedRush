-- RedRush Migration 003: role-specific profile tables.
-- Profiles still owns auth identity and role; these tables hold data specific to each role.

create table if not exists public.vendor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  business_name text not null default '',
  business_phone text not null default '',
  business_address text not null default '',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.rider_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type text not null default '',
  vehicle_plate text not null default '',
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'suspended')),
  is_online boolean not null default false,
  total_deliveries integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  permissions text[] not null default array['all'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists vendor_profiles_touch_updated_at on public.vendor_profiles;
create trigger vendor_profiles_touch_updated_at before update on public.vendor_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists rider_profiles_touch_updated_at on public.rider_profiles;
create trigger rider_profiles_touch_updated_at before update on public.rider_profiles
for each row execute function public.touch_updated_at();

drop trigger if exists admin_profiles_touch_updated_at on public.admin_profiles;
create trigger admin_profiles_touch_updated_at before update on public.admin_profiles
for each row execute function public.touch_updated_at();

alter table public.vendor_profiles enable row level security;
alter table public.rider_profiles enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "vendor profiles self read" on public.vendor_profiles;
create policy "vendor profiles self read" on public.vendor_profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "vendor profiles self update" on public.vendor_profiles;
create policy "vendor profiles self update" on public.vendor_profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "vendor profiles self insert" on public.vendor_profiles;
create policy "vendor profiles self insert" on public.vendor_profiles
for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "rider profiles self read" on public.rider_profiles;
create policy "rider profiles self read" on public.rider_profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "rider profiles self update" on public.rider_profiles;
create policy "rider profiles self update" on public.rider_profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "rider profiles self insert" on public.rider_profiles;
create policy "rider profiles self insert" on public.rider_profiles
for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin profiles admin read" on public.admin_profiles;
create policy "admin profiles admin read" on public.admin_profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin profiles admin manage" on public.admin_profiles;
create policy "admin profiles admin manage" on public.admin_profiles
for all using (public.is_admin())
with check (public.is_admin());

create or replace function public.ensure_role_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_profile_data (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if new.role = 'vendor' then
    insert into public.vendor_profiles (user_id, business_name, business_phone, business_address, restaurant_id)
    values (new.id, coalesce(new.name, ''), coalesce(new.phone, ''), coalesce(new.address, ''), new.restaurant_id)
    on conflict (user_id) do update set
      business_name = coalesce(nullif(excluded.business_name, ''), vendor_profiles.business_name),
      business_phone = coalesce(nullif(excluded.business_phone, ''), vendor_profiles.business_phone),
      business_address = coalesce(nullif(excluded.business_address, ''), vendor_profiles.business_address),
      restaurant_id = coalesce(excluded.restaurant_id, vendor_profiles.restaurant_id);
  elsif new.role = 'rider' then
    insert into public.rider_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  elsif new.role = 'admin' then
    insert into public.admin_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_ensure_role_profile on public.profiles;
create trigger profiles_ensure_role_profile
after insert or update of role on public.profiles
for each row execute function public.ensure_role_profile();

insert into public.customer_profile_data (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

insert into public.vendor_profiles (user_id, business_name, business_phone, business_address, restaurant_id)
select id, coalesce(name, ''), coalesce(phone, ''), coalesce(address, ''), restaurant_id
from public.profiles
where role = 'vendor'
on conflict (user_id) do nothing;

insert into public.rider_profiles (user_id)
select id from public.profiles
where role = 'rider'
on conflict (user_id) do nothing;

insert into public.admin_profiles (user_id)
select id from public.profiles
where role = 'admin'
on conflict (user_id) do nothing;

do $$
begin
  begin
    alter publication supabase_realtime add table public.vendor_profiles;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.rider_profiles;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.admin_profiles;
  exception when duplicate_object then null;
  end;
end;
$$;

create index if not exists vendor_profiles_approval_status_idx on public.vendor_profiles(approval_status);
create index if not exists rider_profiles_approval_status_idx on public.rider_profiles(approval_status);
create index if not exists rider_profiles_is_online_idx on public.rider_profiles(is_online);
