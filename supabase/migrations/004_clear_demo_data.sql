-- RedRush Migration 004: clear launch demo data.
-- Keeps auth/users/admin/profile structure. Removes seeded restaurants, menus, orders,
-- support conversations, promo/demo customer state, and live rider tracking rows.

truncate table
  public.order_items,
  public.orders,
  public.menu_items,
  public.restaurants,
  public.role_requests,
  public.rider_locations,
  public.support_messages,
  public.support_threads,
  public.reviews,
  public.promo_codes,
  public.push_tokens
restart identity cascade;

update public.customer_profile_data
set
  saved_addresses = '[]'::jsonb,
  payment_methods = '[]'::jsonb,
  favourite_restaurant_ids = '{}',
  promo_codes = '[]'::jsonb,
  reviews = '[]'::jsonb,
  notification_settings = '{
    "orderUpdates": true,
    "promos": true,
    "account": true,
    "pushEnabled": false
  }'::jsonb,
  last_notification = null;

update public.vendor_profiles
set restaurant_id = null
where restaurant_id is not null;
