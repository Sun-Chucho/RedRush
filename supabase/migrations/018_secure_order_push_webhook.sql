-- Secure asynchronous order notifications using pg_net and encrypted Vault secrets.
create extension if not exists "pg_net";
create extension if not exists "supabase_vault";

create or replace function public.configure_order_push_webhook(
  p_function_url text,
  p_anon_key text
)
returns void
language plpgsql
security definer
set search_path = public, vault
as $$
declare
  existing_id uuid;
begin
  if p_function_url is null or p_function_url !~ '^https://[^/]+/functions/v1/push-notifications$' then
    raise exception 'A valid HTTPS push-notifications function URL is required';
  end if;
  if p_anon_key is null or length(p_anon_key) < 20 then
    raise exception 'A valid Supabase public key is required';
  end if;

  select id into existing_id from vault.decrypted_secrets where name = 'redrush_push_function_url' limit 1;
  if existing_id is null then
    perform vault.create_secret(p_function_url, 'redrush_push_function_url', 'RedRush order notification endpoint');
  else
    perform vault.update_secret(existing_id, p_function_url, 'redrush_push_function_url', 'RedRush order notification endpoint');
  end if;

  select id into existing_id from vault.decrypted_secrets where name = 'redrush_push_anon_key' limit 1;
  if existing_id is null then
    perform vault.create_secret(p_anon_key, 'redrush_push_anon_key', 'Public JWT used by the order notification webhook');
  else
    perform vault.update_secret(existing_id, p_anon_key, 'redrush_push_anon_key', 'Public JWT used by the order notification webhook');
  end if;
end;
$$;

revoke all on function public.configure_order_push_webhook(text, text) from public, anon, authenticated;
grant execute on function public.configure_order_push_webhook(text, text) to service_role;

create or replace function public.handle_orders_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = public, vault, net
as $$
declare
  function_url text;
  anon_key text;
begin
  select decrypted_secret into function_url
  from vault.decrypted_secrets where name = 'redrush_push_function_url' limit 1;
  select decrypted_secret into anon_key
  from vault.decrypted_secrets where name = 'redrush_push_anon_key' limit 1;

  if function_url is null or anon_key is null then
    raise warning 'RedRush push webhook is not configured';
    return new;
  end if;

  perform net.http_post(
    url := function_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || anon_key,
      'apikey', anon_key
    ),
    body := jsonb_build_object(
      'type', tg_op,
      'table', tg_table_name,
      'schema', tg_table_schema,
      'record', to_jsonb(new),
      'old_record', case when tg_op = 'UPDATE' then to_jsonb(old) else null end
    )
  );
  return new;
end;
$$;

revoke all on function public.handle_orders_push_webhook() from public, anon, authenticated;

drop trigger if exists on_orders_webhook on public.orders;
drop trigger if exists on_orders_push_webhook on public.orders;
create trigger on_orders_push_webhook
after insert or update on public.orders
for each row execute function public.handle_orders_push_webhook();

create or replace function public.order_push_webhook_ready()
returns boolean
language sql
security definer
set search_path = public, vault, pg_catalog
stable
as $$
  select
    (select count(*) = 2 from vault.decrypted_secrets where name in ('redrush_push_function_url', 'redrush_push_anon_key'))
    and exists (
      select 1 from pg_trigger
      where tgname = 'on_orders_push_webhook' and not tgisinternal
    );
$$;

revoke all on function public.order_push_webhook_ready() from public, anon, authenticated;
grant execute on function public.order_push_webhook_ready() to service_role;
