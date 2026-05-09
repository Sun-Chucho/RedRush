-- RedRush Migration 006: restaurant GPS pins for nearby-store discovery.

alter table public.restaurants
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

create index if not exists restaurants_location_idx
  on public.restaurants(latitude, longitude)
  where latitude is not null and longitude is not null;
