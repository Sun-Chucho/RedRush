-- RedRush Migration 013: repair app startup RLS policies.
-- Migration 012 enabled RLS broadly. This migration restates the policies the
-- mobile/web app needs during startup and role dashboards, so re-running it is
-- safe after any manual SQL changes.

-- Profiles: users can create/read/update their own profile; admins can manage.
alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self insert" on public.profiles;
drop policy if exists "profiles admin insert" on public.profiles;
create policy "profiles self insert" on public.profiles
for insert with check (id = auth.uid() or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
for update using (id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    id = auth.uid()
    and role = (select role from public.profiles where id = auth.uid())
    and status = (select status from public.profiles where id = auth.uid())
  )
);

-- Public catalog: landing/home/menu screens must be readable before and after
-- login. Owners/admins can still manage their records.
alter table public.restaurants enable row level security;
alter table public.menu_items enable row level security;

drop policy if exists "restaurants public read" on public.restaurants;
create policy "restaurants public read" on public.restaurants
for select using (is_open = true or owner_id = auth.uid() or public.is_admin());

drop policy if exists "restaurants vendor insert" on public.restaurants;
create policy "restaurants vendor insert" on public.restaurants
for insert with check (
  owner_id = auth.uid()
  and public.current_role() in ('vendor', 'admin')
);

drop policy if exists "restaurants owner manage" on public.restaurants;
create policy "restaurants owner manage" on public.restaurants
for update using (owner_id = auth.uid() or public.is_admin())
with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists "restaurants owner delete" on public.restaurants;
create policy "restaurants owner delete" on public.restaurants
for delete using (owner_id = auth.uid() or public.is_admin());

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

drop policy if exists "menu owner insert" on public.menu_items;
create policy "menu owner insert" on public.menu_items
for insert with check (
  public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = menu_items.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
);

drop policy if exists "menu owner update" on public.menu_items;
drop policy if exists "menu owner manage" on public.menu_items;
create policy "menu owner update" on public.menu_items
for update using (
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

drop policy if exists "menu owner delete" on public.menu_items;
create policy "menu owner delete" on public.menu_items
for delete using (
  public.is_admin()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = menu_items.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
);

-- Categories are part of the home feed startup query.
do $$
begin
  if to_regclass('public.categories') is not null then
    alter table public.categories enable row level security;

    drop policy if exists "Categories are viewable by everyone" on public.categories;
    drop policy if exists "categories public read" on public.categories;
    create policy "categories public read" on public.categories
    for select using (true);

    drop policy if exists "Admins can manage categories" on public.categories;
    drop policy if exists "categories admin manage" on public.categories;
    create policy "categories admin manage" on public.categories
    for all using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;

-- Customer app profile data.
alter table public.customer_profile_data enable row level security;

drop policy if exists "customer data self access" on public.customer_profile_data;
create policy "customer data self access" on public.customer_profile_data
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- Role-specific profiles used by vendor/rider/admin startup screens.
alter table public.vendor_profiles enable row level security;
alter table public.rider_profiles enable row level security;
alter table public.admin_profiles enable row level security;

drop policy if exists "vendor profiles self read" on public.vendor_profiles;
create policy "vendor profiles self read" on public.vendor_profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "vendor profiles self insert" on public.vendor_profiles;
create policy "vendor profiles self insert" on public.vendor_profiles
for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "vendor profiles self update" on public.vendor_profiles;
create policy "vendor profiles self update" on public.vendor_profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and approval_status = (
      select approval_status from public.vendor_profiles
      where user_id = auth.uid()
    )
  )
);

drop policy if exists "rider profiles self read" on public.rider_profiles;
create policy "rider profiles self read" on public.rider_profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "rider profiles self insert" on public.rider_profiles;
create policy "rider profiles self insert" on public.rider_profiles
for insert with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "rider profiles self update" on public.rider_profiles;
create policy "rider profiles self update" on public.rider_profiles
for update using (user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    user_id = auth.uid()
    and approval_status = (
      select approval_status from public.rider_profiles
      where user_id = auth.uid()
    )
  )
);

drop policy if exists "admin profiles admin read" on public.admin_profiles;
create policy "admin profiles admin read" on public.admin_profiles
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin profiles admin manage" on public.admin_profiles;
create policy "admin profiles admin manage" on public.admin_profiles
for all using (public.is_admin())
with check (public.is_admin());

-- Orders and order items power all role dashboards.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "orders participant read" on public.orders;
create policy "orders participant read" on public.orders
for select using (
  customer_id = auth.uid()
  or public.is_admin()
  or rider_id = auth.uid()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = orders.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
  or (public.current_role() = 'rider' and status = 'ready' and rider_id is null)
);

drop policy if exists "orders customer insert" on public.orders;
create policy "orders customer insert" on public.orders
for insert with check (customer_id = auth.uid() and public.current_role() = 'customer');

drop policy if exists "orders participant update" on public.orders;
create policy "orders participant update" on public.orders
for update using (
  public.is_admin()
  or rider_id = auth.uid()
  or (
    public.current_role() = 'rider'
    and status = 'ready'
    and rider_id is null
  )
  or exists (
    select 1 from public.restaurants
    where restaurants.id = orders.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
)
with check (
  public.is_admin()
  or rider_id = auth.uid()
  or exists (
    select 1 from public.restaurants
    where restaurants.id = orders.restaurant_id
      and restaurants.owner_id = auth.uid()
  )
);

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

-- Cash payments are created by customers and updated by assigned riders/admins.
do $$
begin
  if to_regclass('public.payments') is not null then
    alter table public.payments enable row level security;

    drop policy if exists "payments participant read" on public.payments;
    create policy "payments participant read" on public.payments
    for select using (
      customer_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1 from public.orders
        where orders.id = payments.order_id
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

    drop policy if exists "payments customer create cash" on public.payments;
    create policy "payments customer create cash" on public.payments
    for insert with check (
      customer_id = auth.uid()
      and provider = 'cash'
    );

    drop policy if exists "payments participant update cash" on public.payments;
    create policy "payments participant update cash" on public.payments
    for update using (
      provider = 'cash'
      and (
        public.is_admin()
        or exists (
          select 1 from public.orders
          where orders.id = payments.order_id
            and orders.rider_id = auth.uid()
        )
      )
    )
    with check (
      provider = 'cash'
      and status in ('collect_on_delivery', 'cash_collected', 'remitted', 'settled', 'cancelled')
      and (
        public.is_admin()
        or exists (
          select 1 from public.orders
          where orders.id = payments.order_id
            and orders.rider_id = auth.uid()
        )
      )
    );
  end if;
end $$;

-- Rider live location and dispatch.
alter table public.rider_locations enable row level security;

drop policy if exists "rider location participant read" on public.rider_locations;
create policy "rider location participant read" on public.rider_locations
for select using (
  rider_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1 from public.orders
    where orders.rider_id = rider_locations.rider_id
      and orders.customer_id = auth.uid()
      and orders.status in ('picked_up', 'ready', 'accepted', 'preparing', 'assigned')
  )
  or exists (
    select 1 from public.orders
    join public.restaurants on restaurants.id = orders.restaurant_id
    where orders.rider_id = rider_locations.rider_id
      and restaurants.owner_id = auth.uid()
      and orders.status in ('picked_up', 'ready', 'assigned')
  )
);

drop policy if exists "rider location rider upsert" on public.rider_locations;
create policy "rider location rider upsert" on public.rider_locations
for all using (rider_id = auth.uid() or public.is_admin())
with check (rider_id = auth.uid() or public.is_admin());

-- Push tokens should not block startup, but registration must be allowed.
alter table public.push_tokens enable row level security;

drop policy if exists "push tokens self access" on public.push_tokens;
create policy "push tokens self access" on public.push_tokens
for all using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- Helpful indexes for the repaired policies.
create index if not exists profiles_role_status_idx on public.profiles(role, status);
create index if not exists restaurants_owner_id_idx on public.restaurants(owner_id);
create index if not exists menu_items_restaurant_id_idx on public.menu_items(restaurant_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_restaurant_id_idx on public.orders(restaurant_id);
create index if not exists orders_rider_id_idx on public.orders(rider_id);
create index if not exists orders_status_rider_idx on public.orders(status, rider_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists rider_locations_is_online_idx on public.rider_locations(is_online);
