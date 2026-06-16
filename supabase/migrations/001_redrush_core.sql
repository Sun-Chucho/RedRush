-- RedRush MVP Supabase schema.
-- Apply this in the Supabase SQL editor before running scripts/supabase:seed.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'User',
  email text not null default '',
  phone text not null default '',
  role text not null default 'customer' check (role in ('customer', 'vendor', 'rider', 'admin')),
  status text not null default 'active' check (status in ('active', 'pending', 'suspended')),
  avatar text,
  address text,
  restaurant_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  cuisine text not null default 'Fast Food',
  rating numeric not null default 0,
  review_count integer not null default 0,
  delivery_time text not null default '25-40 min',
  delivery_fee integer not null default 500,
  min_order integer not null default 1000,
  image text,
  cover_image text,
  address text not null default '',
  latitude double precision,
  longitude double precision,
  is_open boolean not null default true,
  distance text not null default '0 km',
  promo text,
  categories text[] not null default array['Meals', 'Drinks'],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_restaurant_id_fkey
  foreign key (restaurant_id) references public.restaurants(id) on delete set null;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  description text not null default '',
  price integer not null check (price >= 0),
  image text,
  category text not null default 'Meals',
  available boolean not null default true,
  preparation_time integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete restrict,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  restaurant_name text not null,
  customer_name text,
  customer_phone text,
  subtotal integer not null default 0,
  delivery_fee integer not null default 0,
  service_charge integer not null default 0,
  discount integer not null default 0,
  total integer not null default 0,
  promo_code text,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'preparing', 'ready', 'picked_up', 'delivered', 'cancelled')
  ),
  payment_method text not null default 'Cash',
  payment_status text not null default 'pending',
  address text not null,
  restaurant_latitude double precision,
  restaurant_longitude double precision,
  delivery_latitude double precision,
  delivery_longitude double precision,
  rider_id uuid references public.profiles(id) on delete set null,
  rider_name text,
  estimated_delivery timestamptz,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  restaurant_id uuid not null references public.restaurants(id) on delete restrict,
  name text not null,
  description text not null default '',
  price integer not null default 0,
  image text,
  category text not null default 'Meals',
  quantity integer not null check (quantity > 0 and quantity <= 20),
  preparation_time integer not null default 15
);

create table if not exists public.role_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_role text not null check (requested_role in ('vendor', 'rider')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  notes text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, requested_role, status)
);

create table if not exists public.rider_locations (
  rider_id uuid primary key references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  latitude double precision not null,
  longitude double precision not null,
  heading double precision,
  speed double precision,
  is_online boolean not null default true,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists restaurants_touch_updated_at on public.restaurants;
create trigger restaurants_touch_updated_at before update on public.restaurants
for each row execute function public.touch_updated_at();

drop trigger if exists menu_items_touch_updated_at on public.menu_items;
create trigger menu_items_touch_updated_at before update on public.menu_items
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

drop trigger if exists role_requests_touch_updated_at on public.role_requests;
create trigger role_requests_touch_updated_at before update on public.role_requests
for each row execute function public.touch_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and status = 'active'
  );
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

alter table public.profiles enable row level security;
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.role_requests enable row level security;
alter table public.rider_locations enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles admin insert" on public.profiles
for insert with check (id = auth.uid() or public.is_admin());

drop policy if exists "restaurants public read" on public.restaurants;
create policy "restaurants public read" on public.restaurants
for select using (is_open = true or owner_id = auth.uid() or public.is_admin());

drop policy if exists "restaurants owner manage" on public.restaurants;
create policy "restaurants owner manage" on public.restaurants
for all using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "menu public read" on public.menu_items;
create policy "menu public read" on public.menu_items
for select using (
  available = true
  or public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = menu_items.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
);

drop policy if exists "menu owner manage" on public.menu_items;
create policy "menu owner manage" on public.menu_items
for all using (
  public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = menu_items.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = menu_items.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
);

drop policy if exists "orders participant read" on public.orders;
create policy "orders participant read" on public.orders
for select using (
  customer_id = auth.uid()
  or rider_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = orders.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
  or (public.current_role() = 'rider' and status in ('ready', 'picked_up'))
);

drop policy if exists "orders customer insert" on public.orders;
create policy "orders customer insert" on public.orders
for insert with check (customer_id = auth.uid() and public.current_role() = 'customer');

drop policy if exists "orders participant update" on public.orders;
create policy "orders participant update" on public.orders
for update using (
  public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = orders.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
  or rider_id = auth.uid()
  or (public.current_role() = 'rider' and status = 'ready')
)
with check (
  public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = orders.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
  or rider_id = auth.uid()
  or (public.current_role() = 'rider' and status in ('ready', 'picked_up'))
);

drop policy if exists "order items participant read" on public.order_items;
create policy "order items participant read" on public.order_items
for select using (
  public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and (
        orders.customer_id = auth.uid()
        or orders.rider_id = auth.uid()
        or exists (
          select 1 from public.restaurants
          where restaurants.id = orders.restaurant_id
            and restaurants.owner_id = auth.uid()
        )
      )
  )
);

drop policy if exists "order items customer insert" on public.order_items;
create policy "order items customer insert" on public.order_items
for insert with check (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.customer_id = auth.uid()
  )
);

drop policy if exists "role requests self create" on public.role_requests;
create policy "role requests self create" on public.role_requests
for insert with check (user_id = auth.uid());

drop policy if exists "role requests visible" on public.role_requests;
create policy "role requests visible" on public.role_requests
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "role requests admin update" on public.role_requests;
create policy "role requests admin update" on public.role_requests
for update using (public.is_admin())
with check (public.is_admin());

drop policy if exists "rider location participant read" on public.rider_locations;
create policy "rider location participant read" on public.rider_locations
for select using (
  rider_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.id = rider_locations.order_id
      and (
        orders.customer_id = auth.uid()
        or exists (
          select 1 from public.restaurants
          where restaurants.id = orders.restaurant_id
            and restaurants.owner_id = auth.uid()
        )
      )
  )
);

drop policy if exists "rider location rider upsert" on public.rider_locations;
create policy "rider location rider upsert" on public.rider_locations
for all using (rider_id = auth.uid() or public.is_admin())
with check (rider_id = auth.uid() or public.is_admin());

create index if not exists restaurants_owner_id_idx on public.restaurants(owner_id);
create index if not exists menu_items_restaurant_id_idx on public.menu_items(restaurant_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_restaurant_id_idx on public.orders(restaurant_id);
create index if not exists orders_rider_id_idx on public.orders(rider_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
