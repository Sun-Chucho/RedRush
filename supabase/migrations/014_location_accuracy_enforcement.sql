-- RedRush Migration 014: route coordinate accuracy for live dispatch.
-- New orders store restaurant/customer coordinates, and live restaurants must
-- have a real GPS pin before they can accept orders.

alter table public.orders
  add column if not exists restaurant_latitude double precision,
  add column if not exists restaurant_longitude double precision,
  add column if not exists delivery_latitude double precision,
  add column if not exists delivery_longitude double precision;

update public.orders
set
  restaurant_latitude = coalesce(public.orders.restaurant_latitude, public.restaurants.latitude),
  restaurant_longitude = coalesce(public.orders.restaurant_longitude, public.restaurants.longitude)
from public.restaurants
where public.restaurants.id = public.orders.restaurant_id
  and (public.orders.restaurant_latitude is null or public.orders.restaurant_longitude is null);

-- Prevent "open" restaurants from appearing live without a usable GPS pin.
-- Existing restaurants without pins are closed until vendors/admins save a pin.
update public.restaurants
set is_open = false
where is_open = true
  and (
    latitude is null
    or longitude is null
    or latitude < -90
    or latitude > 90
    or longitude < -180
    or longitude > 180
  );

alter table public.restaurants
  drop constraint if exists restaurants_open_requires_location;

alter table public.restaurants
  add constraint restaurants_open_requires_location
  check (
    is_open = false
    or (
      latitude is not null
      and longitude is not null
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  ) not valid;

alter table public.orders
  drop constraint if exists orders_delivery_coordinates_valid;

alter table public.orders
  add constraint orders_delivery_coordinates_valid
  check (
    (delivery_latitude is null and delivery_longitude is null)
    or (
      delivery_latitude is not null
      and delivery_longitude is not null
      and delivery_latitude between -90 and 90
      and delivery_longitude between -180 and 180
    )
  ) not valid;

alter table public.orders
  drop constraint if exists orders_restaurant_coordinates_valid;

alter table public.orders
  add constraint orders_restaurant_coordinates_valid
  check (
    (restaurant_latitude is null and restaurant_longitude is null)
    or (
      restaurant_latitude is not null
      and restaurant_longitude is not null
      and restaurant_latitude between -90 and 90
      and restaurant_longitude between -180 and 180
    )
  ) not valid;

create index if not exists orders_route_coords_idx
  on public.orders(restaurant_latitude, restaurant_longitude, delivery_latitude, delivery_longitude);
