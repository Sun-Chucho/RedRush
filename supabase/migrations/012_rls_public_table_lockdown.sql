-- RedRush Migration 012: public table RLS lockdown.
-- Supabase warning rls_disabled_in_public means at least one public table can be
-- accessed by anon/authenticated clients without row policies. This migration
-- enables RLS for every current public table and tightens older loose policies.

do $$
declare
  table_name text;
  app_tables text[] := array[
    'profiles',
    'user_profiles',
    'restaurants',
    'menu_items',
    'orders',
    'order_items',
    'role_requests',
    'rider_locations',
    'support_threads',
    'support_messages',
    'customer_profile_data',
    'reviews',
    'promo_codes',
    'push_tokens',
    'vendor_profiles',
    'rider_profiles',
    'admin_profiles',
    'categories',
    'chat_messages',
    'payments',
    'payment_events',
    'payout_requests',
    'rider_earnings'
  ];
begin
  foreach table_name in array app_tables loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format('alter table public.%I enable row level security', table_name);
    end if;
  end loop;
end $$;

do $$
begin
  if to_regclass('public.chat_messages') is not null then
    drop policy if exists "chat_select_authenticated" on public.chat_messages;
    drop policy if exists "chat_update_authenticated" on public.chat_messages;
    drop policy if exists "chat_messages_select" on public.chat_messages;
    drop policy if exists "chat_messages_update" on public.chat_messages;
    drop policy if exists "chat_messages_insert" on public.chat_messages;

    create policy "chat messages participant read" on public.chat_messages
    for select using (
      sender_id = auth.uid()
      or public.is_admin()
      or exists (
        select 1
        from public.orders
        left join public.restaurants on restaurants.id = orders.restaurant_id
        where orders.id = chat_messages.order_id
          and (
            orders.customer_id = auth.uid()
            or orders.rider_id = auth.uid()
            or restaurants.owner_id = auth.uid()
          )
      )
    );

    create policy "chat messages self create" on public.chat_messages
    for insert with check (sender_id = auth.uid());

    create policy "chat messages participant update" on public.chat_messages
    for update using (
      public.is_admin()
      or exists (
        select 1
        from public.orders
        left join public.restaurants on restaurants.id = orders.restaurant_id
        where orders.id = chat_messages.order_id
          and (
            orders.customer_id = auth.uid()
            or orders.rider_id = auth.uid()
            or restaurants.owner_id = auth.uid()
          )
      )
    )
    with check (
      public.is_admin()
      or exists (
        select 1
        from public.orders
        left join public.restaurants on restaurants.id = orders.restaurant_id
        where orders.id = chat_messages.order_id
          and (
            orders.customer_id = auth.uid()
            or orders.rider_id = auth.uid()
            or restaurants.owner_id = auth.uid()
          )
      )
    );
  end if;

  if to_regclass('public.rider_earnings') is not null then
    drop policy if exists "earnings_select_own" on public.rider_earnings;
    drop policy if exists "earnings_insert_authenticated" on public.rider_earnings;

    create policy "rider earnings self read" on public.rider_earnings
    for select using (rider_id = auth.uid() or public.is_admin());

    create policy "rider earnings admin manage" on public.rider_earnings
    for all using (public.is_admin())
    with check (public.is_admin());
  end if;
end $$;
