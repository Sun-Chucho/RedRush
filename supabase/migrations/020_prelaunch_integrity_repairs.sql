-- RedRush Migration 020: account enforcement, safe promos, chat/review
-- participation, and real admin account controls.

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  sender_name text not null default 'User',
  sender_role text not null default 'customer' check (sender_role in ('customer','rider','vendor','admin')),
  text text not null check (char_length(trim(text)) between 1 and 2000),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_chat_messages_order_id on public.chat_messages(order_id, created_at);
create index if not exists idx_chat_messages_sender_id on public.chat_messages(sender_id);
alter table public.chat_messages enable row level security;
do $$ begin
  alter publication supabase_realtime add table public.chat_messages;
exception when duplicate_object then null;
end $$;

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  promo_code text not null,
  order_id uuid not null references public.orders(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (user_id, promo_code),
  unique (order_id)
);
alter table public.promo_redemptions enable row level security;
drop policy if exists "promo redemptions self read" on public.promo_redemptions;
create policy "promo redemptions self read" on public.promo_redemptions
for select using (user_id = auth.uid() or public.is_admin());

create or replace function public.current_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active';
$$;

create or replace function public.enforce_active_actor()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Service-role maintenance has no end-user uid and remains permitted.
  if auth.uid() is not null and exists (
    select 1 from public.profiles where id = auth.uid() and status in ('suspended', 'banned')
  ) then
    raise exception 'This account is not active.' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'orders','order_items','restaurants','menu_items','rider_locations',
    'chat_messages','support_threads','support_messages','customer_profile_data',
    'reviews','push_tokens','role_requests','payout_requests'
  ] loop
    if to_regclass('public.' || table_name) is not null then
      execute format('drop trigger if exists enforce_active_actor on public.%I', table_name);
      execute format(
        'create trigger enforce_active_actor before insert or update or delete on public.%I for each row execute function public.enforce_active_actor()',
        table_name
      );
    end if;
  end loop;
end $$;

create or replace function public.admin_set_profile_status(p_user_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Admin access required.' using errcode = '42501'; end if;
  if p_user_id = auth.uid() then raise exception 'You cannot suspend your own admin account.'; end if;
  if p_status not in ('active', 'suspended', 'banned') then raise exception 'Invalid account status.'; end if;
  update public.profiles set status = p_status, updated_at = now() where id = p_user_id;
  if not found then raise exception 'User not found.'; end if;
  if p_status <> 'active' and to_regclass('public.rider_locations') is not null then
    update public.rider_locations set is_online = false, updated_at = now() where rider_id = p_user_id;
  end if;
end;
$$;
revoke all on function public.admin_set_profile_status(uuid, text) from public;
grant execute on function public.admin_set_profile_status(uuid, text) to authenticated;

do $$
begin
  if to_regclass('public.chat_messages') is not null then
    execute 'drop policy if exists "chat messages participant read" on public.chat_messages';
    execute 'drop policy if exists "chat_messages_select" on public.chat_messages';
    execute 'drop policy if exists "chat messages participant update" on public.chat_messages';
    execute 'drop policy if exists "chat_messages_update" on public.chat_messages';
    execute 'drop policy if exists "chat messages self create" on public.chat_messages';
    execute 'drop policy if exists "chat messages participant create" on public.chat_messages';
    execute 'drop policy if exists "chat_insert_authenticated" on public.chat_messages';
    execute $policy$
      create policy "chat messages participant read" on public.chat_messages
      for select using (
        exists (
          select 1 from public.orders o
          left join public.restaurants r on r.id = o.restaurant_id
          where o.id = chat_messages.order_id
            and (o.customer_id = auth.uid() or o.rider_id = auth.uid() or r.owner_id = auth.uid() or public.is_admin())
        )
      )
    $policy$;
    execute $policy$
      create policy "chat messages participant create" on public.chat_messages
      for insert with check (
        sender_id = auth.uid()
        and exists (
          select 1 from public.orders o
          left join public.restaurants r on r.id = o.restaurant_id
          where o.id = chat_messages.order_id
            and (o.customer_id = auth.uid() or o.rider_id = auth.uid() or r.owner_id = auth.uid() or public.is_admin())
        )
      )
    $policy$;
    execute $policy$
      create policy "chat messages participant update" on public.chat_messages
      for update using (
        exists (
          select 1 from public.orders o
          left join public.restaurants r on r.id = o.restaurant_id
          where o.id = chat_messages.order_id
            and (o.customer_id = auth.uid() or o.rider_id = auth.uid() or r.owner_id = auth.uid() or public.is_admin())
        )
      )
    $policy$;
  end if;

  if to_regclass('public.reviews') is not null then
    execute 'drop policy if exists "reviews customer create" on public.reviews';
    execute 'drop policy if exists "reviews_insert_authenticated" on public.reviews';
    execute 'drop policy if exists "reviews delivered customer create" on public.reviews';
    execute $policy$
      create policy "reviews delivered customer create" on public.reviews
      for insert with check (
        user_id = auth.uid()
        and exists (
          select 1 from public.orders o
          where o.id = reviews.order_id and o.customer_id = auth.uid() and o.status = 'delivered'
        )
      )
    $policy$;
  end if;
end $$;

create or replace function public.create_order_atomic(
  p_restaurant_id uuid, p_address text, p_delivery_latitude double precision,
  p_delivery_longitude double precision, p_payment_method text,
  p_promo_code text default null, p_items jsonb default '[]'::jsonb
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_profile public.profiles%rowtype;
  v_restaurant public.restaurants%rowtype; v_order public.orders%rowtype;
  v_promo public.promo_codes%rowtype; v_subtotal integer := 0;
  v_delivery_fee integer := 0; v_service_charge integer := 0;
  v_discount integer := 0; v_total integer := 0; v_discount_percent integer := 0;
  v_promo_code text := upper(trim(coalesce(p_promo_code, ''))); v_currency text := 'KES';
  v_requested_count integer := 0; v_valid_count integer := 0; v_unavailable_count integer := 0;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Please sign in before placing an order.' using errcode = '42501'; end if;
  if nullif(trim(coalesce(p_address, '')), '') is null then raise exception 'Delivery address is required.'; end if;
  if p_delivery_latitude not between -90 and 90 or p_delivery_longitude not between -180 and 180 then raise exception 'Valid delivery coordinates are required.'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one order item is required.'; end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or v_profile.role <> 'customer' or v_profile.status <> 'active' then raise exception 'Only active customer accounts can place orders.' using errcode = '42501'; end if;
  select * into v_restaurant from public.restaurants where id = p_restaurant_id for update;
  if not found then raise exception 'Restaurant not found.'; end if;
  if not v_restaurant.is_open then raise exception 'Restaurant is currently closed.'; end if;
  if v_restaurant.latitude is null or v_restaurant.longitude is null then raise exception 'Restaurant GPS pin is missing.'; end if;

  with requested as (
    select nullif(item->>'menuItemId', '')::uuid menu_item_id,
      least(20, greatest(1, coalesce(nullif(item->>'quantity', '')::integer, 1))) quantity
    from jsonb_array_elements(p_items) item
  )
  select count(*), count(mi.id), count(mi.id) filter (where mi.available = false),
    coalesce(sum(mi.price * requested.quantity) filter (where mi.available = true), 0)
  into v_requested_count, v_valid_count, v_unavailable_count, v_subtotal
  from requested left join public.menu_items mi on mi.id = requested.menu_item_id and mi.restaurant_id = p_restaurant_id;

  if v_valid_count <> v_requested_count then raise exception 'One or more menu items no longer exist.'; end if;
  if v_unavailable_count > 0 then raise exception 'One or more menu items are unavailable.'; end if;
  if v_subtotal < coalesce(v_restaurant.min_order, 0) then raise exception 'The restaurant minimum order has not been reached.'; end if;

  if v_promo_code <> '' then
    select * into v_promo from public.promo_codes where code = v_promo_code for update;
    if not found or not v_promo.is_active then raise exception 'This promo code is invalid or inactive.'; end if;
    if v_promo.expires_at is not null and v_promo.expires_at <= now() then raise exception 'This promo code has expired.'; end if;
    if v_promo.max_uses is not null and v_promo.current_uses >= v_promo.max_uses then raise exception 'This promo code has reached its usage limit.'; end if;
    if v_subtotal < v_promo.min_order then raise exception 'Your subtotal does not meet this promo minimum.'; end if;
    if exists (select 1 from public.promo_redemptions where user_id = v_user_id and promo_code = v_promo_code) then raise exception 'You have already used this promo code.'; end if;
    v_discount_percent := v_promo.discount_percent;
  end if;

  v_delivery_fee := greatest(0, coalesce(v_restaurant.delivery_fee, 500));
  v_service_charge := round(v_subtotal * 0.03); v_discount := round(v_subtotal * v_discount_percent / 100.0);
  v_total := greatest(0, v_subtotal - v_discount) + v_delivery_fee + v_service_charge;
  v_currency := case when p_delivery_latitude between -11.9 and -0.7 and p_delivery_longitude between 29.0 and 40.8 then 'TZS' else 'KES' end;

  insert into public.orders (
    customer_id, customer_name, customer_phone, restaurant_id, restaurant_name,
    subtotal, delivery_fee, service_charge, discount, total, promo_code, status,
    payment_method, payment_status, address, restaurant_latitude,
    restaurant_longitude, delivery_latitude, delivery_longitude, estimated_delivery
  ) values (
    v_user_id, coalesce(nullif(v_profile.name, ''), 'Customer'), v_profile.phone,
    v_restaurant.id, v_restaurant.name, v_subtotal, v_delivery_fee, v_service_charge,
    v_discount, v_total, nullif(v_promo_code, ''), 'pending', 'Cash on Delivery',
    'collect_on_delivery', trim(p_address), v_restaurant.latitude, v_restaurant.longitude,
    p_delivery_latitude, p_delivery_longitude, now() + interval '40 minutes'
  ) returning * into v_order;

  insert into public.payments (order_id, customer_id, provider, amount, currency, status, metadata)
  values (v_order.id, v_user_id, 'cash', v_total, v_currency, 'collect_on_delivery', jsonb_build_object('paymentMethod', 'Cash on Delivery', 'promoCode', nullif(v_promo_code, '')));
  insert into public.order_items (order_id, menu_item_id, restaurant_id, name, description, price, image, category, quantity, preparation_time)
  select v_order.id, mi.id, p_restaurant_id, mi.name, coalesce(mi.description, ''), mi.price,
    mi.image, coalesce(mi.category, 'Meals'), requested.quantity, greatest(1, coalesce(mi.preparation_time, 15))
  from (select nullif(item->>'menuItemId', '')::uuid menu_item_id,
    least(20, greatest(1, coalesce(nullif(item->>'quantity', '')::integer, 1))) quantity
    from jsonb_array_elements(p_items) item) requested
  join public.menu_items mi on mi.id = requested.menu_item_id and mi.restaurant_id = p_restaurant_id;

  if v_promo_code <> '' then
    insert into public.promo_redemptions(user_id, promo_code, order_id) values (v_user_id, v_promo_code, v_order.id);
    update public.promo_codes set current_uses = current_uses + 1, updated_at = now() where id = v_promo.id;
  end if;
  select to_jsonb(v_order) || jsonb_build_object('order_items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = v_order.id), '[]'::jsonb)) into v_result;
  return v_result;
end;
$$;
revoke all on function public.create_order_atomic(uuid, text, double precision, double precision, text, text, jsonb) from public;
grant execute on function public.create_order_atomic(uuid, text, double precision, double precision, text, text, jsonb) to authenticated;
