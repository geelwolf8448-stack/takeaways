-- Takeaways Tonight? marketplace ordering foundation
-- Apply only to a dedicated Supabase project after reviewing the schema.
-- Never expose the service_role key in browser code.
-- Client apps cannot create/modify orders or payment records directly; trusted Edge Functions do that.

create extension if not exists pgcrypto;

alter table public.restaurants
  add column if not exists payfast_merchant_id text,
  add column if not exists payment_onboarding_status text not null default 'not_started'
    check (payment_onboarding_status in ('not_started','pending','verified','suspended')),
  add column if not exists accepts_online_orders boolean not null default false;

create table if not exists public.restaurant_members (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'manager' check (member_role in ('owner','manager','staff')),
  created_at timestamptz not null default now(),
  primary key (restaurant_id, user_id)
);

create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  customer_id uuid not null references auth.users(id),
  restaurant_id uuid not null references public.restaurants(id),
  status text not null default 'pending_payment'
    check (status in ('pending_payment','paid','accepted','rejected','preparing','ready','completed','cancelled','refund_pending','partially_refunded','refunded')),
  currency char(3) not null default 'ZAR' check (currency = 'ZAR'),
  food_subtotal_cents integer not null check (food_subtotal_cents > 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  total_cents integer generated always as (food_subtotal_cents + delivery_fee_cents) stored,
  customer_name text not null,
  customer_phone text not null,
  fulfilment_type text not null check (fulfilment_type in ('collection','delivery')),
  delivery_address text,
  customer_notes text,
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fulfilment_type <> 'delivery' or delivery_address is not null)
);

create table if not exists public.marketplace_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id) on delete cascade,
  item_name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  line_total_cents integer generated always as (quantity * unit_price_cents) stored
);

create table if not exists public.marketplace_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id),
  provider text not null default 'payfast',
  provider_payment_id text unique,
  status text not null default 'created'
    check (status in ('created','pending','complete','failed','cancelled','refund_pending','partially_refunded','refunded')),
  amount_cents integer not null check (amount_cents > 0),
  provider_fee_cents integer,
  raw_provider_reference text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.marketplace_refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.marketplace_orders(id),
  payment_id uuid not null references public.marketplace_payments(id),
  amount_cents integer not null check (amount_cents > 0),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','approved','processing','complete','rejected')),
  created_at timestamptz not null default now()
);

create index if not exists marketplace_orders_customer_created_idx
  on public.marketplace_orders(customer_id, created_at desc);
create index if not exists marketplace_orders_restaurant_created_idx
  on public.marketplace_orders(restaurant_id, created_at desc);
create index if not exists marketplace_payments_order_idx
  on public.marketplace_payments(order_id);

alter table public.restaurant_members enable row level security;
alter table public.platform_admins enable row level security;
alter table public.marketplace_orders enable row level security;
alter table public.marketplace_order_items enable row level security;
alter table public.marketplace_payments enable row level security;
alter table public.marketplace_refunds enable row level security;

-- Users can see only their own orders; restaurant team members see only their restaurant's orders.
drop policy if exists "Customer or restaurant team can read marketplace orders" on public.marketplace_orders;
create policy "Customer or restaurant team can read marketplace orders"
on public.marketplace_orders for select to authenticated
using (
  customer_id = auth.uid()
  or exists (select 1 from public.restaurant_members rm
             where rm.restaurant_id = marketplace_orders.restaurant_id and rm.user_id = auth.uid())
  or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid())
);

drop policy if exists "Customer or restaurant team can read order items" on public.marketplace_order_items;
create policy "Customer or restaurant team can read order items"
on public.marketplace_order_items for select to authenticated
using (
  exists (
    select 1 from public.marketplace_orders o
    where o.id = marketplace_order_items.order_id
      and (o.customer_id = auth.uid()
        or exists (select 1 from public.restaurant_members rm where rm.restaurant_id = o.restaurant_id and rm.user_id = auth.uid())
        or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()))
  )
);

drop policy if exists "Customer or restaurant team can read payments" on public.marketplace_payments;
create policy "Customer or restaurant team can read payments"
on public.marketplace_payments for select to authenticated
using (
  exists (
    select 1 from public.marketplace_orders o
    where o.id = marketplace_payments.order_id
      and (o.customer_id = auth.uid()
        or exists (select 1 from public.restaurant_members rm where rm.restaurant_id = o.restaurant_id and rm.user_id = auth.uid())
        or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()))
  )
);

drop policy if exists "Platform admins can read refunds" on public.marketplace_refunds;
create policy "Platform admins can read refunds"
on public.marketplace_refunds for select to authenticated
using (exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()));

drop policy if exists "Members can view their restaurant membership" on public.restaurant_members;
create policy "Members can view their restaurant membership"
on public.restaurant_members for select to authenticated
using (user_id = auth.uid() or exists (select 1 from public.platform_admins pa where pa.user_id = auth.uid()));

drop policy if exists "Admins can view platform admins" on public.platform_admins;
create policy "Admins can view platform admins"
on public.platform_admins for select to authenticated
using (user_id = auth.uid());

-- Intentionally no client INSERT/UPDATE/DELETE policies on orders, payments or refunds.
-- Trusted Supabase Edge Functions using the service_role key must:
-- 1) validate menu prices and create an order for ONE restaurant only;
-- 2) keep customer payment arrangements directly between the customer and restaurant;
-- 3) let restaurant staff change status only through a checked transition endpoint;
-- 4) never trust a browser-supplied price or payment status.

grant select on public.marketplace_orders, public.marketplace_order_items, public.marketplace_payments,
  public.marketplace_refunds, public.restaurant_members, public.platform_admins
to authenticated;

-- Do not grant anon access to customer/order/payment tables.
