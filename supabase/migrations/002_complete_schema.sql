-- ============================================================================
-- RedRush Migration 002: Complete Schema
-- ============================================================================
-- Fills every gap between the app code and the Supabase backend.
--
-- New tables:
--   • support_threads      – customer/admin support chat threads
--   • support_messages     – individual messages within threads
--   • customer_profile_data – saved addresses, payment methods, favourites,
--                             promo codes, reviews, notification preferences
--   • reviews              – normalised restaurant reviews (feeds ratings)
--   • promo_codes          – server-side promo definitions
--   • push_tokens          – expo push notification tokens per device
--
-- Fixes applied to existing tables:
--   • rider_locations RLS  – customers can now track the rider on their order
--   • orders RLS           – customers can cancel their own pending orders
--   • orders               – add missing status + created_at indexes
--   • Realtime publication – tables added for postgres_changes subscriptions
--   • restaurants RLS      – vendor INSERT policy for new restaurant creation
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. SUPPORT THREADS
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.support_threads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  user_name   text not null default 'User',
  user_role   text not null default 'customer',
  subject     text not null default 'Support request',
  status      text not null default 'open' check (status in ('open', 'closed')),
  last_message text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists support_threads_touch_updated_at on public.support_threads;
create trigger support_threads_touch_updated_at before update on public.support_threads
for each row execute function public.touch_updated_at();

create index if not exists support_threads_user_id_idx on public.support_threads(user_id);
create index if not exists support_threads_status_idx on public.support_threads(status);

alter table public.support_threads enable row level security;

-- Owner of the thread or admin can read
drop policy if exists "support threads participant read" on public.support_threads;
create policy "support threads participant read" on public.support_threads
for select using (user_id = auth.uid() or public.is_admin());

-- Authenticated users can create their own threads
drop policy if exists "support threads self create" on public.support_threads;
create policy "support threads self create" on public.support_threads
for insert with check (user_id = auth.uid());

-- Owner or admin can update (e.g. close thread, update last_message)
drop policy if exists "support threads participant update" on public.support_threads;
create policy "support threads participant update" on public.support_threads
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 2. SUPPORT MESSAGES
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  thread_id   uuid not null references public.support_threads(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null default 'User',
  sender_role text not null default 'customer',
  text        text not null default '',
  created_at  timestamptz not null default now()
);

create index if not exists support_messages_thread_id_idx on public.support_messages(thread_id);
create index if not exists support_messages_created_at_idx on public.support_messages(created_at);

alter table public.support_messages enable row level security;

-- Thread owner or admin can read messages
drop policy if exists "support messages participant read" on public.support_messages;
create policy "support messages participant read" on public.support_messages
for select using (
  public.is_admin()
  or exists (
    select 1 from public.support_threads
    where support_threads.id = support_messages.thread_id
      and support_threads.user_id = auth.uid()
  )
);

-- Thread owner or admin can send messages
drop policy if exists "support messages participant create" on public.support_messages;
create policy "support messages participant create" on public.support_messages
for insert with check (
  sender_id = auth.uid()
  and (
    public.is_admin()
    or exists (
      select 1 from public.support_threads
      where support_threads.id = support_messages.thread_id
        and support_threads.user_id = auth.uid()
    )
  )
);


-- ────────────────────────────────────────────────────────────────────────────
-- 3. CUSTOMER PROFILE DATA
-- ────────────────────────────────────────────────────────────────────────────
-- Mirrors the Firestore document at users/{uid}/profileData/customer.
-- Uses JSONB columns for flexible nested data (addresses, payment methods…).
create table if not exists public.customer_profile_data (
  user_id                  uuid primary key references public.profiles(id) on delete cascade,
  saved_addresses          jsonb not null default '[]'::jsonb,
  payment_methods          jsonb not null default '[]'::jsonb,
  favourite_restaurant_ids text[] not null default '{}',
  promo_codes              jsonb not null default '[]'::jsonb,
  reviews                  jsonb not null default '[]'::jsonb,
  notification_settings    jsonb not null default '{
    "orderUpdates": true,
    "promos": true,
    "account": true,
    "pushEnabled": false
  }'::jsonb,
  last_notification        jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

drop trigger if exists customer_profile_data_touch_updated_at on public.customer_profile_data;
create trigger customer_profile_data_touch_updated_at before update on public.customer_profile_data
for each row execute function public.touch_updated_at();

alter table public.customer_profile_data enable row level security;

-- Self or admin
drop policy if exists "customer data self access" on public.customer_profile_data;
create policy "customer data self access" on public.customer_profile_data
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 4. REVIEWS (normalised)
-- ────────────────────────────────────────────────────────────────────────────
-- Lets restaurants show aggregated ratings from real customers.
create table if not exists public.reviews (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  restaurant_id   uuid not null references public.restaurants(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete set null,
  restaurant_name text not null default '',
  rating          smallint not null check (rating >= 1 and rating <= 5),
  comment         text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists reviews_restaurant_id_idx on public.reviews(restaurant_id);
create index if not exists reviews_user_id_idx on public.reviews(user_id);

alter table public.reviews enable row level security;

-- Everyone can read reviews
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews
for select using (true);

-- Customers can create reviews
drop policy if exists "reviews customer create" on public.reviews;
create policy "reviews customer create" on public.reviews
for insert with check (user_id = auth.uid());

-- Users can update their own reviews; admin can update any
drop policy if exists "reviews self update" on public.reviews;
create policy "reviews self update" on public.reviews
for update using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- Users can delete their own reviews; admin can delete any
drop policy if exists "reviews self delete" on public.reviews;
create policy "reviews self delete" on public.reviews
for delete using (user_id = auth.uid() or public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 5. PROMO CODES (server-side definitions)
-- ────────────────────────────────────────────────────────────────────────────
-- Validates promo codes server-side. The app currently hard-codes WELCOME20
-- and RUSH10 – this table lets admins manage them dynamically.
create table if not exists public.promo_codes (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  title            text not null default '',
  description      text not null default '',
  discount_percent integer not null check (discount_percent > 0 and discount_percent <= 100),
  max_uses         integer,                                  -- null = unlimited
  current_uses     integer not null default 0,
  min_order        integer not null default 0,                -- minimum subtotal
  is_active        boolean not null default true,
  expires_at       timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

drop trigger if exists promo_codes_touch_updated_at on public.promo_codes;
create trigger promo_codes_touch_updated_at before update on public.promo_codes
for each row execute function public.touch_updated_at();

create index if not exists promo_codes_code_idx on public.promo_codes(code);

alter table public.promo_codes enable row level security;

-- Everyone can read active promos
drop policy if exists "promo codes public read" on public.promo_codes;
create policy "promo codes public read" on public.promo_codes
for select using (is_active = true or public.is_admin());

-- Only admin can manage promos
drop policy if exists "promo codes admin manage" on public.promo_codes;
create policy "promo codes admin manage" on public.promo_codes
for all using (public.is_admin())
with check (public.is_admin());


-- ────────────────────────────────────────────────────────────────────────────
-- 6. PUSH TOKENS
-- ────────────────────────────────────────────────────────────────────────────
-- One user can have multiple devices (phone + tablet etc).
create table if not exists public.push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  token      text not null,
  platform   text not null default 'unknown' check (platform in ('ios', 'android', 'web', 'unknown')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

drop trigger if exists push_tokens_touch_updated_at on public.push_tokens;
create trigger push_tokens_touch_updated_at before update on public.push_tokens
for each row execute function public.touch_updated_at();

create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);

alter table public.push_tokens enable row level security;

-- Self or admin
drop policy if exists "push tokens self access" on public.push_tokens;
create policy "push tokens self access" on public.push_tokens
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());


-- ════════════════════════════════════════════════════════════════════════════
-- 7. FIX EXISTING RLS POLICIES
-- ════════════════════════════════════════════════════════════════════════════

-- ── 7a. RIDER LOCATIONS: let customers track the rider assigned to their order ──
-- The old policy required order_id to be set on rider_locations, but the app
-- doesn't set it. Instead, we check if the customer has an active order where
-- rider_id matches the rider being tracked.

drop policy if exists "rider location participant read" on public.rider_locations;
create policy "rider location participant read" on public.rider_locations
for select using (
  rider_id = auth.uid()
  or public.is_admin()
  -- Customer can see rider if they have an active order assigned to this rider
  or exists (
    select 1 from public.orders
    where orders.rider_id = rider_locations.rider_id
      and orders.customer_id = auth.uid()
      and orders.status in ('picked_up', 'ready', 'accepted', 'preparing')
  )
  -- Vendor can see rider for orders at their restaurant
  or exists (
    select 1 from public.orders
    join public.restaurants on restaurants.id = orders.restaurant_id
    where orders.rider_id = rider_locations.rider_id
      and restaurants.owner_id = auth.uid()
      and orders.status in ('picked_up', 'ready')
  )
);


-- ── 7b. ORDERS: allow customers to cancel their own pending/accepted orders ──

drop policy if exists "orders customer cancel" on public.orders;
create policy "orders customer cancel" on public.orders
for update using (
  customer_id = auth.uid()
  and status in ('pending', 'accepted')
)
with check (
  customer_id = auth.uid()
  and status = 'cancelled'
);


-- ── 7c. RESTAURANTS: explicit INSERT policy for vendors ──
-- The existing "restaurants owner manage" uses FOR ALL, which already covers
-- INSERT. But it checks owner_id = auth.uid() which is correct since the
-- app sets owner_id = user.id on insert. Let's add an explicit one for clarity.

drop policy if exists "restaurants vendor insert" on public.restaurants;
create policy "restaurants vendor insert" on public.restaurants
for insert with check (
  owner_id = auth.uid()
  and public.current_role() in ('vendor', 'admin')
);


-- ── 7d. PROFILES: admin can list all profiles (needed for admin user mgmt) ──
-- The existing "profiles self read" already covers is_admin(), which handles
-- listing. But let's also allow riders to read minimal info for orders they're
-- delivering (customer_name etc is denormalised on orders so this is optional).

-- No change needed – is_admin() in the existing policy already handles it.


-- ── 7e. ORDER ITEMS: riders who picked up can see items ──
-- Already handled by the existing policy through orders.rider_id check.


-- ════════════════════════════════════════════════════════════════════════════
-- 8. MISSING INDEXES ON EXISTING TABLES
-- ════════════════════════════════════════════════════════════════════════════

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_at_idx on public.orders(created_at);
create index if not exists orders_status_rider_idx on public.orders(status, rider_id);
create index if not exists role_requests_user_id_idx on public.role_requests(user_id);
create index if not exists role_requests_status_idx on public.role_requests(status);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists profiles_email_idx on public.profiles(email);


-- ════════════════════════════════════════════════════════════════════════════
-- 9. FUNCTION: update restaurant rating from reviews
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.update_restaurant_rating()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.restaurants
  set
    rating = coalesce((
      select round(avg(r.rating)::numeric, 1)
      from public.reviews r
      where r.restaurant_id = coalesce(new.restaurant_id, old.restaurant_id)
    ), 0),
    review_count = (
      select count(*)
      from public.reviews r
      where r.restaurant_id = coalesce(new.restaurant_id, old.restaurant_id)
    )
  where id = coalesce(new.restaurant_id, old.restaurant_id);

  return coalesce(new, old);
end;
$$;

drop trigger if exists reviews_update_restaurant_rating on public.reviews;
create trigger reviews_update_restaurant_rating
after insert or update or delete on public.reviews
for each row execute function public.update_restaurant_rating();


-- ════════════════════════════════════════════════════════════════════════════
-- 10. FUNCTION: validate promo code server-side
-- ════════════════════════════════════════════════════════════════════════════

create or replace function public.validate_promo_code(p_code text, p_subtotal integer default 0)
returns table (
  promo_id uuid,
  discount_percent integer,
  discount_amount integer,
  title text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_promo record;
begin
  select * into v_promo
  from public.promo_codes pc
  where pc.code = upper(trim(p_code))
    and pc.is_active = true
    and (pc.expires_at is null or pc.expires_at > now())
    and (pc.max_uses is null or pc.current_uses < pc.max_uses)
    and p_subtotal >= pc.min_order;

  if not found then
    return;
  end if;

  return query select
    v_promo.id,
    v_promo.discount_percent,
    round(p_subtotal * (v_promo.discount_percent::numeric / 100))::integer,
    v_promo.title;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 11. SEED DEFAULT PROMO CODES
-- ════════════════════════════════════════════════════════════════════════════
-- Match the hard-coded promos in the app: WELCOME20, RUSH10

insert into public.promo_codes (code, title, description, discount_percent, expires_at)
values
  ('WELCOME20', '20% off your next order', 'Valid on food subtotal before delivery and service charges.', 20, '2026-12-31T23:59:59Z'),
  ('RUSH10', '10% rush-hour discount', 'Use on lunch and dinner orders above the minimum restaurant order.', 10, '2026-09-30T23:59:59Z')
on conflict (code) do nothing;


-- ════════════════════════════════════════════════════════════════════════════
-- 12. REALTIME PUBLICATION
-- ════════════════════════════════════════════════════════════════════════════
-- Ensure all tables that the app subscribes to via postgres_changes
-- are included in the supabase_realtime publication.

do $$
begin
  -- rider_locations is used for live rider tracking
  begin
    alter publication supabase_realtime add table public.rider_locations;
  exception when duplicate_object then null;
  end;

  -- orders for real-time order status updates
  begin
    alter publication supabase_realtime add table public.orders;
  exception when duplicate_object then null;
  end;

  -- order_items for real-time new order items
  begin
    alter publication supabase_realtime add table public.order_items;
  exception when duplicate_object then null;
  end;

  -- support_messages for real-time chat
  begin
    alter publication supabase_realtime add table public.support_messages;
  exception when duplicate_object then null;
  end;

  -- support_threads for real-time thread updates
  begin
    alter publication supabase_realtime add table public.support_threads;
  exception when duplicate_object then null;
  end;

  -- restaurants for live open/close status
  begin
    alter publication supabase_realtime add table public.restaurants;
  exception when duplicate_object then null;
  end;

  -- menu_items for live availability
  begin
    alter publication supabase_realtime add table public.menu_items;
  exception when duplicate_object then null;
  end;

  -- profiles for role changes
  begin
    alter publication supabase_realtime add table public.profiles;
  exception when duplicate_object then null;
  end;
end;
$$;


-- ════════════════════════════════════════════════════════════════════════════
-- 13. STORAGE BUCKETS (for future image uploads)
-- ════════════════════════════════════════════════════════════════════════════
-- Create storage buckets for menu item images, restaurant images, and avatars.
-- These are public-read buckets; only authenticated owners can upload.

insert into storage.buckets (id, name, public)
values
  ('restaurant-images', 'restaurant-images', true),
  ('menu-images', 'menu-images', true),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Public read for all image buckets (idempotent)
do $$ begin
  create policy "Public read restaurant images" on storage.objects
  for select using (bucket_id = 'restaurant-images');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public read menu images" on storage.objects
  for select using (bucket_id = 'menu-images');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public read avatars" on storage.objects
  for select using (bucket_id = 'avatars');
exception when duplicate_object then null;
end $$;

-- Authenticated users can upload to avatars (own folder)
do $$ begin
  create policy "Users upload own avatar" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
exception when duplicate_object then null;
end $$;

-- Vendors/admins can upload restaurant and menu images
do $$ begin
  create policy "Vendors upload restaurant images" on storage.objects
  for insert with check (
    bucket_id in ('restaurant-images', 'menu-images')
    and auth.role() = 'authenticated'
    and (public.current_role() in ('vendor', 'admin'))
  );
exception when duplicate_object then null;
end $$;


-- ════════════════════════════════════════════════════════════════════════════
-- DONE
-- ════════════════════════════════════════════════════════════════════════════
-- Run in the Supabase SQL Editor. After applying:
--   1. Run scripts/setup-supabase-admin.js to create admin account
--   2. Run scripts/seed-supabase.js to seed restaurants + menus
--   3. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local
