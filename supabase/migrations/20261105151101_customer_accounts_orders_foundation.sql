-- Takeaways Tonight? customer accounts, restaurant ownership and order workflow.
-- Applied to the linked Supabase project on 2026-11-05.
-- Additive migration: existing directory/admin data is preserved.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.marketplace_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function private.handle_new_marketplace_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.marketplace_profiles (user_id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name',''),
          coalesce(new.raw_user_meta_data ->> 'phone',''))
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_marketplace_profile() from public, anon, authenticated;
drop trigger if exists on_auth_user_created_marketplace_profile on auth.users;
create trigger on_auth_user_created_marketplace_profile
after insert on auth.users for each row execute function private.handle_new_marketplace_profile();

insert into public.marketplace_profiles (user_id, full_name, phone)
select id, coalesce(raw_user_meta_data ->> 'full_name',''), coalesce(raw_user_meta_data ->> 'phone','')
from auth.users on conflict (user_id) do nothing;

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
insert into public.platform_admins(user_id)
select user_id from public.admin_users on conflict (user_id) do nothing;

create table if not exists public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'owner' check (member_role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id,user_id)
);

create table if not exists public.restaurant_owner_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  applicant_name text not null check (char_length(applicant_name) between 2 and 120),
  contact_phone text not null check (contact_phone ~ '^27[0-9]{9}$'),
  role_requested text not null default 'owner' check (role_requested in ('owner','manager')),
  notes text not null default '',
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists restaurant_owner_requests_one_pending_per_user_restaurant
on public.restaurant_owner_requests(user_id,restaurant_id) where status='pending';

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references auth.users(id),
  restaurant_id uuid not null references public.restaurants(id),
  status text not null default 'submitted'
    check (status in ('submitted','accepted','rejected','preparing','ready','completed','cancelled')),
  payment_method text not null default 'pay_restaurant_directly'
    check (payment_method='pay_restaurant_directly'),
  payment_status text not null default 'not_paid'
    check (payment_status in ('not_paid','paid_directly_to_restaurant','refund_requested','refunded')),
  currency char(3) not null default 'ZAR' check (currency='ZAR'),
  food_subtotal_cents integer not null check (food_subtotal_cents>0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents>=0),
  total_cents integer generated always as (food_subtotal_cents+delivery_fee_cents) stored,
  commission_rate_bps integer not null default 1500 check (commission_rate_bps=1500),
  commission_cents integer,
  customer_name text not null check (char_length(customer_name) between 2 and 120),
  customer_phone text not null check (customer_phone ~ '^27[0-9]{9}$'),
  fulfilment_type text not null check (fulfilment_type in ('collection','delivery')),
  delivery_address text,
  customer_notes text not null default '',
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fulfilment_type <> 'delivery' or char_length(coalesce(delivery_address,''))>=5)
);
create index if not exists marketplace_orders_customer_created_idx on public.marketplace_orders(customer_id,created_at desc);
create index if not exists marketplace_orders_restaurant_created_idx on public.marketplace_orders(restaurant_id,created_at desc);

create table if not exists public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  item_name text not null check (char_length(item_name) between 1 and 160),
  quantity integer not null check (quantity between 1 and 99),
  unit_price_cents integer not null check (unit_price_cents>=0),
  line_total_cents integer generated always as (quantity*unit_price_cents) stored
);
create index if not exists marketplace_order_items_order_idx on public.marketplace_order_items(order_id);

create table if not exists public.marketplace_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id),
  provider text not null default 'payfast' check (provider='payfast'),
  provider_payment_id text unique,
  status text not null default 'created'
    check (status in ('created','pending','complete','failed','cancelled','refund_pending','partially_refunded','refunded')),
  amount_cents integer not null check (amount_cents>0),
  platform_commission_split_cents integer,
  restaurant_split_cents integer,
  provider_fee_cents integer,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists marketplace_payments_order_idx on public.marketplace_payments(order_id);

create table if not exists public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.marketplace_orders(id),
  restaurant_id uuid not null references public.restaurants(id),
  food_subtotal_cents integer not null,
  commission_rate_bps integer not null default 1500 check (commission_rate_bps=1500),
  commission_cents integer not null,
  status text not null default 'earned' check (status in ('earned','adjusted','reversed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commission_ledger_restaurant_idx on public.commission_ledger(restaurant_id,created_at desc);

create table if not exists public.marketplace_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id),
  payment_id uuid references public.marketplace_payments(id),
  amount_cents integer not null check (amount_cents>0),
  reason text not null check (char_length(reason) between 3 and 500),
  status text not null default 'requested' check (status in ('requested','approved','processing','complete','rejected')),
  created_at timestamptz not null default now()
);
create index if not exists marketplace_refunds_order_idx on public.marketplace_refunds(order_id);
create index if not exists marketplace_refunds_payment_idx on public.marketplace_refunds(payment_id);
create index if not exists restaurant_members_user_idx on public.restaurant_members(user_id,restaurant_id);

create or replace function private.record_completed_order_commission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status='accepted' and old.status is distinct from 'accepted' then
    new.accepted_at := coalesce(new.accepted_at,now());
  end if;
  if new.status='completed' and old.status is distinct from 'completed' then
    if new.payment_status <> 'paid_directly_to_restaurant' then
      raise exception 'Order must be marked paid to the restaurant before completion';
    end if;
    new.completed_at := coalesce(new.completed_at,now());
    new.commission_cents := round(new.food_subtotal_cents*0.15)::integer;
    insert into public.commission_ledger(order_id,restaurant_id,food_subtotal_cents,commission_rate_bps,commission_cents,status)
    values(new.id,new.restaurant_id,new.food_subtotal_cents,1500,new.commission_cents,'earned')
    on conflict(order_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function private.record_completed_order_commission() from public, anon, authenticated;
drop trigger if exists marketplace_order_commission_trigger on public.marketplace_orders;
create trigger marketplace_order_commission_trigger
before update of status,payment_status on public.marketplace_orders
for each row execute function private.record_completed_order_commission();

alter table public.marketplace_profiles enable row level security;
alter table public.platform_admins enable row level security;
alter table public.restaurant_members enable row level security;
alter table public.restaurant_owner_requests enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_items enable row level security;
alter table public.marketplace_payments enable row level security;
alter table public.commission_ledger enable row level security;
alter table public.marketplace_refunds enable row level security;

drop policy if exists "Users read own marketplace profile" on public.marketplace_profiles;
create policy "Users read own marketplace profile" on public.marketplace_profiles for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists "Users update own marketplace profile" on public.marketplace_profiles;
create policy "Users update own marketplace profile" on public.marketplace_profiles for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

drop policy if exists "Platform admins read platform admins" on public.platform_admins;
create policy "Platform admins read platform admins" on public.platform_admins for select to authenticated using(user_id=(select auth.uid()));

drop policy if exists "Users read own restaurant memberships" on public.restaurant_members;
create policy "Users read own restaurant memberships" on public.restaurant_members for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));

drop policy if exists "Users submit own restaurant ownership requests" on public.restaurant_owner_requests;
create policy "Users submit own restaurant ownership requests" on public.restaurant_owner_requests for insert to authenticated
with check(user_id=(select auth.uid()) and status='pending' and reviewed_by is null and reviewed_at is null);
drop policy if exists "Users read own restaurant ownership requests" on public.restaurant_owner_requests;
create policy "Users read own restaurant ownership requests" on public.restaurant_owner_requests for select to authenticated
using(user_id=(select auth.uid()) or exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));

drop policy if exists "Restaurant team update their published listing" on public.restaurants;
create policy "Restaurant team update their published listing" on public.restaurants for update to authenticated
using(is_published=true and exists(select 1 from public.restaurant_members rm where rm.restaurant_id=restaurants.id and rm.user_id=(select auth.uid()) and rm.member_role in ('owner','manager')))
with check(is_published=true and exists(select 1 from public.restaurant_members rm where rm.restaurant_id=restaurants.id and rm.user_id=(select auth.uid()) and rm.member_role in ('owner','manager')));

drop policy if exists "Customers and restaurant teams read relevant orders" on public.marketplace_orders;
create policy "Customers and restaurant teams read relevant orders" on public.marketplace_orders for select to authenticated
using(customer_id=(select auth.uid())
or exists(select 1 from public.restaurant_members rm where rm.restaurant_id=marketplace_orders.restaurant_id and rm.user_id=(select auth.uid()))
or exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())));

drop policy if exists "Customers and restaurant teams read relevant order items" on public.marketplace_order_items;
create policy "Customers and restaurant teams read relevant order items" on public.marketplace_order_items for select to authenticated
using(exists(select 1 from public.marketplace_orders o where o.id=marketplace_order_items.order_id and
(o.customer_id=(select auth.uid()) or exists(select 1 from public.restaurant_members rm where rm.restaurant_id=o.restaurant_id and rm.user_id=(select auth.uid()))
or exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())))));

drop policy if exists "Customers and restaurant teams read relevant payment records" on public.marketplace_payments;
create policy "Customers and restaurant teams read relevant payment records" on public.marketplace_payments for select to authenticated
using(exists(select 1 from public.marketplace_orders o where o.id=marketplace_payments.order_id and
(o.customer_id=(select auth.uid()) or exists(select 1 from public.restaurant_members rm where rm.restaurant_id=o.restaurant_id and rm.user_id=(select auth.uid()))
or exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())))));

drop policy if exists "Admins and restaurant teams read own commission" on public.commission_ledger;
create policy "Admins and restaurant teams read own commission" on public.commission_ledger for select to authenticated
using(exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid()))
or exists(select 1 from public.restaurant_members rm where rm.restaurant_id=commission_ledger.restaurant_id and rm.user_id=(select auth.uid())));

drop policy if exists "Customers and admins read relevant refunds" on public.marketplace_refunds;
create policy "Customers and admins read relevant refunds" on public.marketplace_refunds for select to authenticated
using(exists(select 1 from public.marketplace_orders o where o.id=marketplace_refunds.order_id and
(o.customer_id=(select auth.uid()) or exists(select 1 from public.platform_admins pa where pa.user_id=(select auth.uid())))));

grant select on public.marketplace_profiles,public.platform_admins,public.restaurant_members,public.restaurant_owner_requests,
public.marketplace_orders,public.marketplace_order_items,public.marketplace_payments,public.commission_ledger,public.marketplace_refunds to authenticated;
grant update(full_name,phone,updated_at) on public.marketplace_profiles to authenticated;
grant update(name,area,category,whatsapp,description,menu,updated_at) on public.restaurants to authenticated;
grant insert on public.restaurant_owner_requests to authenticated;

-- No browser write policies or grants on orders, items, payments, commission or refunds.
-- All privileged writes are performed by the authenticated marketplace-api Edge Function.
