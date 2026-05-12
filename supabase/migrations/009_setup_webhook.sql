-- Enable pg_net for HTTP requests if not already enabled
create extension if not exists "pg_net";

-- Create the webhook function
create or replace function public.handle_orders_webhook()
returns trigger
language plpgsql
security definer
as $$
declare
  request_body jsonb;
  project_ref text;
  service_key text;
begin
  -- Supabase stores these in settings
  project_ref := current_setting('app.settings.project_ref', true);
  service_key := current_setting('app.settings.service_role_key', true);

  if project_ref is null or project_ref = '' or service_key is null or service_key = '' then
    raise warning 'RedRush orders webhook skipped: app.settings.project_ref or app.settings.service_role_key is not configured.';
    return NEW;
  end if;

  request_body := jsonb_build_object(
    'type', TG_OP,
    'record', row_to_json(NEW),
    'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE null END
  );

  perform net.http_post(
    url := 'https://' || project_ref || '.supabase.co/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body := request_body
  );
  
  return NEW;
end;
$$;

-- Drop trigger if it exists
drop trigger if exists on_orders_webhook on public.orders;

-- Create the trigger
create trigger on_orders_webhook
  after insert or update on public.orders
  for each row execute function public.handle_orders_webhook();
