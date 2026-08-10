-- RedRush Migration 016: create the order, payment ledger and order items in
-- one transaction. Any validation or insert failure rolls the entire order back.

create or replace function public.create_order_atomic(
  p_restaurant_id uuid,
  p_address text,
  p_delivery_latitude double precision,
  p_delivery_longitude double precision,
  p_payment_method text,
  p_promo_code text default null,
  p_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_restaurant public.restaurants%rowtype;
  v_order public.orders%rowtype;
  v_subtotal integer := 0;
  v_delivery_fee integer := 0;
  v_service_charge integer := 0;
  v_discount integer := 0;
  v_total integer := 0;
  v_discount_percent integer := 0;
  v_promo_code text := upper(trim(coalesce(p_promo_code, '')));
  v_currency text := 'KES';
  v_requested_count integer := 0;
  v_valid_count integer := 0;
  v_unavailable_count integer := 0;
  v_result jsonb;
begin
  if v_user_id is null then raise exception 'Please sign in before placing an order.' using errcode = '42501'; end if;
  if nullif(trim(coalesce(p_address, '')), '') is null then raise exception 'Delivery address is required.'; end if;
  if p_delivery_latitude not between -90 and 90 or p_delivery_longitude not between -180 and 180 then
    raise exception 'Valid delivery coordinates are required.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'At least one order item is required.'; end if;

  select * into v_profile from public.profiles where id = v_user_id;
  if not found or v_profile.role <> 'customer' then raise exception 'Only customers can place orders.' using errcode = '42501'; end if;

  select * into v_restaurant from public.restaurants where id = p_restaurant_id for update;
  if not found then raise exception 'Restaurant not found.'; end if;
  if not v_restaurant.is_open then raise exception 'Restaurant is currently closed.'; end if;
  if v_restaurant.latitude is null or v_restaurant.longitude is null then raise exception 'Restaurant GPS pin is missing.'; end if;

  with requested as (
    select
      nullif(item->>'menuItemId', '')::uuid as menu_item_id,
      least(20, greatest(1, coalesce(nullif(item->>'quantity', '')::integer, 1))) as quantity
    from jsonb_array_elements(p_items) item
  )
  select
    count(*),
    count(mi.id),
    count(mi.id) filter (where mi.available = false),
    coalesce(sum(mi.price * requested.quantity) filter (where mi.available = true), 0)
  into v_requested_count, v_valid_count, v_unavailable_count, v_subtotal
  from requested
  left join public.menu_items mi
    on mi.id = requested.menu_item_id and mi.restaurant_id = p_restaurant_id;

  if v_valid_count <> v_requested_count then raise exception 'One or more menu items no longer exist.'; end if;
  if v_unavailable_count > 0 then raise exception 'One or more menu items are unavailable.'; end if;
  if v_subtotal < coalesce(v_restaurant.min_order, 0) then raise exception 'The restaurant minimum order has not been reached.'; end if;

  v_delivery_fee := greatest(0, coalesce(v_restaurant.delivery_fee, 500));
  v_service_charge := round(v_subtotal * 0.03);
  v_discount_percent := case v_promo_code when 'WELCOME20' then 20 when 'RUSH10' then 10 else 0 end;
  v_discount := round(v_subtotal * v_discount_percent / 100.0);
  v_total := greatest(0, v_subtotal - v_discount) + v_delivery_fee + v_service_charge;
  v_currency := case
    when p_delivery_latitude between -11.9 and -0.7 and p_delivery_longitude between 29.0 and 40.8 then 'TZS'
    else 'KES'
  end;

  insert into public.orders (
    customer_id, customer_name, customer_phone, restaurant_id, restaurant_name,
    subtotal, delivery_fee, service_charge, discount, total, promo_code, status,
    payment_method, payment_status, address, restaurant_latitude,
    restaurant_longitude, delivery_latitude, delivery_longitude, estimated_delivery
  ) values (
    v_user_id, coalesce(nullif(v_profile.name, ''), 'Customer'), v_profile.phone,
    v_restaurant.id, v_restaurant.name, v_subtotal, v_delivery_fee,
    v_service_charge, v_discount, v_total,
    case when v_discount_percent > 0 then v_promo_code else null end,
    'pending', p_payment_method, 'collect_on_delivery', trim(p_address),
    v_restaurant.latitude, v_restaurant.longitude, p_delivery_latitude,
    p_delivery_longitude, now() + interval '40 minutes'
  ) returning * into v_order;

  insert into public.payments (order_id, customer_id, provider, amount, currency, status, metadata)
  values (
    v_order.id, v_user_id, 'cash', v_total, v_currency, 'collect_on_delivery',
    jsonb_build_object('paymentMethod', p_payment_method, 'promoCode', case when v_discount_percent > 0 then v_promo_code else null end)
  );

  insert into public.order_items (
    order_id, menu_item_id, restaurant_id, name, description, price, image,
    category, quantity, preparation_time
  )
  select
    v_order.id, mi.id, p_restaurant_id, mi.name, coalesce(mi.description, ''),
    mi.price, mi.image, coalesce(mi.category, 'Meals'), requested.quantity,
    greatest(1, coalesce(mi.preparation_time, 15))
  from (
    select
      nullif(item->>'menuItemId', '')::uuid as menu_item_id,
      least(20, greatest(1, coalesce(nullif(item->>'quantity', '')::integer, 1))) as quantity
    from jsonb_array_elements(p_items) item
  ) requested
  join public.menu_items mi on mi.id = requested.menu_item_id and mi.restaurant_id = p_restaurant_id;

  select to_jsonb(v_order) || jsonb_build_object(
    'order_items', coalesce((select jsonb_agg(to_jsonb(oi)) from public.order_items oi where oi.order_id = v_order.id), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_order_atomic(uuid, text, double precision, double precision, text, text, jsonb) from public;
grant execute on function public.create_order_atomic(uuid, text, double precision, double precision, text, text, jsonb) to authenticated;
