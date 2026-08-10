-- RedRush Migration 015: enforce the order state machine in the database.
-- RLS controls who can update an order; this trigger also controls which
-- status change each role may make so stale or modified clients cannot skip.

create or replace function public.enforce_order_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor_role text := public.current_role();
  valid_sequence boolean := false;
  valid_for_role boolean := false;
begin
  if new.status = old.status then
    return new;
  end if;

  valid_sequence := case old.status
    when 'pending' then new.status in ('accepted', 'cancelled')
    when 'accepted' then new.status in ('preparing', 'cancelled')
    when 'preparing' then new.status in ('ready', 'cancelled')
    when 'ready' then new.status in ('assigned', 'cancelled')
    when 'assigned' then new.status in ('picked_up', 'cancelled')
    when 'picked_up' then new.status in ('delivered', 'cancelled')
    else false
  end;

  valid_for_role := case actor_role
    when 'admin' then true
    when 'customer' then new.status = 'cancelled' and old.status in ('pending', 'accepted')
    when 'vendor' then
      (old.status = 'pending' and new.status = 'accepted')
      or (old.status = 'accepted' and new.status = 'preparing')
      or (old.status = 'preparing' and new.status = 'ready')
      or (new.status = 'cancelled' and old.status in ('pending', 'accepted', 'preparing', 'ready'))
    when 'rider' then
      (old.status = 'ready' and new.status = 'assigned' and new.rider_id = auth.uid())
      or (old.status = 'assigned' and new.status = 'picked_up' and old.rider_id = auth.uid())
      or (old.status = 'picked_up' and new.status = 'delivered' and old.rider_id = auth.uid())
    else false
  end;

  if not valid_sequence or not valid_for_role then
    raise exception 'Invalid order status transition from % to % for role %', old.status, new.status, actor_role
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists orders_enforce_status_transition on public.orders;
create trigger orders_enforce_status_transition
before update of status on public.orders
for each row execute function public.enforce_order_status_transition();
