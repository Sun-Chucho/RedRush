-- RedRush launch hardening for cash-only v1.
-- Adds text-only rider verification fields, separates rider assignment from pickup,
-- and expands cash payment settlement statuses.

alter table public.rider_profiles
  add column if not exists id_number text not null default '';

alter table public.orders
  drop constraint if exists orders_status_check;

alter table public.orders
  add constraint orders_status_check check (
    status in ('pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'cancelled')
  );

alter table public.payments
  drop constraint if exists payments_status_check;

alter table public.payments
  add constraint payments_status_check check (
    status in ('pending', 'collect_on_delivery', 'cash_collected', 'remitted', 'settled', 'paid', 'failed', 'cancelled', 'refunded')
  );

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
