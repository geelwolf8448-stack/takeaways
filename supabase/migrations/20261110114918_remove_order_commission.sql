begin;

-- Preserve the existing direct-payment order lifecycle while removing the
-- old order-percentage accrual trigger and its storage.
drop trigger if exists marketplace_order_commission_trigger on public.marketplace_orders;

create or replace function private.set_marketplace_order_timestamps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    new.accepted_at := coalesce(new.accepted_at, now());
  end if;

  if new.status = 'completed' and old.status is distinct from 'completed' then
    if new.payment_status <> 'paid_directly_to_restaurant' then
      raise exception 'Order must be marked paid to the restaurant before completion';
    end if;
    new.completed_at := coalesce(new.completed_at, now());
  end if;

  return new;
end;
$$;

revoke all on function private.set_marketplace_order_timestamps() from public, anon, authenticated;

create trigger marketplace_order_timestamps_trigger
before update of status, payment_status on public.marketplace_orders
for each row execute function private.set_marketplace_order_timestamps();

drop function if exists private.record_completed_order_commission();
drop function if exists public.accrue_marketplace_commission();

alter table public.marketplace_orders
  drop column if exists commission_rate_bps,
  drop column if exists commission_cents;

alter table public.marketplace_payments
  drop column if exists platform_commission_split_cents,
  drop column if exists restaurant_split_cents;

drop table if exists public.commission_ledger;

commit;
