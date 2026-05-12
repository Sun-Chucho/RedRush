-- Migration 009: chat, reviews, rider_earnings
-- (Applied automatically via OnSpace Cloud SQL executor)

-- chat_messages
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  sender_id uuid not null references public.user_profiles(id) on delete cascade,
  sender_name text not null default 'User',
  sender_role text not null default 'customer',
  text text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

-- reviews
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  restaurant_id text not null,
  restaurant_name text not null default '',
  rating int not null check (rating between 1 and 5),
  food_rating int not null default 0,
  delivery_rating int not null default 0,
  comment text default '',
  created_at timestamptz not null default now(),
  unique(order_id, user_id)
);

-- rider_earnings
create table if not exists public.rider_earnings (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.user_profiles(id) on delete cascade,
  order_id uuid,
  amount numeric(10,2) not null default 0,
  currency text not null default 'KES',
  period_date date not null default current_date,
  status text not null default 'available',
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.rider_earnings enable row level security;

create policy if not exists "chat_select_authenticated" on public.chat_messages for select to authenticated using (true);
create policy if not exists "chat_insert_authenticated" on public.chat_messages for insert to authenticated with check (sender_id = auth.uid());
create policy if not exists "chat_update_authenticated" on public.chat_messages for update to authenticated using (true);
create policy if not exists "reviews_select_authenticated" on public.reviews for select to authenticated using (true);
create policy if not exists "reviews_insert_authenticated" on public.reviews for insert to authenticated with check (user_id = auth.uid());
create policy if not exists "earnings_select_own" on public.rider_earnings for select to authenticated using (rider_id = auth.uid());
create policy if not exists "earnings_insert_authenticated" on public.rider_earnings for insert to authenticated with check (true);

create index if not exists idx_chat_order on public.chat_messages(order_id);
create index if not exists idx_reviews_restaurant on public.reviews(restaurant_id);
create index if not exists idx_earnings_rider on public.rider_earnings(rider_id, period_date);
