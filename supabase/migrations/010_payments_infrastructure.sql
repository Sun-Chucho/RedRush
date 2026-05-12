-- RedRush payment infrastructure.
-- Online providers stay disabled in the app until Paystack/M-Pesa verification is complete.

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete restrict,
  provider text not null check (provider in ('cash', 'paystack', 'mpesa')),
  provider_reference text,
  amount integer not null check (amount >= 0),
  currency text not null default 'NGN',
  status text not null default 'pending' check (
    status in ('pending', 'collect_on_delivery', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references public.payments(id) on delete cascade,
  provider text not null check (provider in ('cash', 'paystack', 'mpesa')),
  event_type text not null,
  provider_reference text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('vendor', 'rider')),
  amount integer not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'rejected', 'cancelled')),
  method text not null default 'manual',
  notes text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists payments_touch_updated_at on public.payments;
create trigger payments_touch_updated_at before update on public.payments
for each row execute function public.touch_updated_at();

drop trigger if exists payout_requests_touch_updated_at on public.payout_requests;
create trigger payout_requests_touch_updated_at before update on public.payout_requests
for each row execute function public.touch_updated_at();

create index if not exists payments_order_id_idx on public.payments(order_id);
create index if not exists payments_customer_id_idx on public.payments(customer_id);
create index if not exists payments_provider_reference_idx on public.payments(provider_reference);
create index if not exists payment_events_payment_id_idx on public.payment_events(payment_id);
create index if not exists payout_requests_user_id_idx on public.payout_requests(user_id);
create index if not exists payout_requests_status_idx on public.payout_requests(status);

alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.payout_requests enable row level security;

drop policy if exists "payments participant read" on public.payments;
create policy "payments participant read" on public.payments
for select using (
  customer_id = auth.uid()
  or public.is_admin()
  or exists (
    select 1
    from public.orders
    join public.restaurants on restaurants.id = orders.restaurant_id
    where orders.id = payments.order_id
      and restaurants.owner_id = auth.uid()
  )
);

drop policy if exists "payments customer create cash" on public.payments;
create policy "payments customer create cash" on public.payments
for insert with check (
  customer_id = auth.uid()
  and provider = 'cash'
  and status = 'collect_on_delivery'
);

drop policy if exists "payment events admin read" on public.payment_events;
create policy "payment events admin read" on public.payment_events
for select using (public.is_admin());

drop policy if exists "payout requests participant read" on public.payout_requests;
create policy "payout requests participant read" on public.payout_requests
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "payout requests self create" on public.payout_requests;
create policy "payout requests self create" on public.payout_requests
for insert with check (user_id = auth.uid());

drop policy if exists "payout requests admin update" on public.payout_requests;
create policy "payout requests admin update" on public.payout_requests
for update using (public.is_admin())
with check (public.is_admin());
