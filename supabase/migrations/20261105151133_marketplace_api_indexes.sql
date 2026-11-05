alter table public.marketplace_orders add column if not exists idempotency_key text;
create unique index if not exists marketplace_orders_idempotency_key_idx
  on public.marketplace_orders(idempotency_key) where idempotency_key is not null;
create index if not exists restaurant_owner_requests_restaurant_idx
  on public.restaurant_owner_requests(restaurant_id);
create index if not exists restaurant_owner_requests_reviewed_by_idx
  on public.restaurant_owner_requests(reviewed_by);
create index if not exists marketplace_refunds_order_idx
  on public.marketplace_refunds(order_id);
create index if not exists marketplace_refunds_payment_idx
  on public.marketplace_refunds(payment_id);
create or replace function private.touch_marketplace_profile_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_marketplace_profile_updated_at() from public, anon, authenticated;
drop trigger if exists marketplace_profiles_touch_updated_at on public.marketplace_profiles;
create trigger marketplace_profiles_touch_updated_at
before update on public.marketplace_profiles
for each row execute function private.touch_marketplace_profile_updated_at();