-- Keep new restaurant applications private until the owner confirms their email
-- address and an allowlisted Takeaways Tonight administrator approves the listing.
-- This migration is safe to apply to the live project: existing historic
-- applications have no owner_user_id and stay pending until they are re-submitted
-- through the secure flow.

create schema if not exists private;

alter table public.partner_applications
  add column if not exists owner_user_id uuid references auth.users(id) on delete set null,
  add column if not exists owner_name text,
  add column if not exists owner_phone text,
  add column if not exists owner_email text,
  add column if not exists owner_email_confirmed_at timestamptz,
  add column if not exists business_type text,
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table public.partner_applications
  drop constraint if exists partner_applications_secure_owner_fields;
alter table public.partner_applications
  add constraint partner_applications_secure_owner_fields
  check (
    owner_user_id is null
    or (
      char_length(trim(coalesce(owner_name, ''))) between 2 and 120
      and owner_phone ~ '^27[0-9]{9}$'
      and char_length(trim(coalesce(owner_email, ''))) between 3 and 254
      and business_type in ('restaurant', 'takeaway_shop', 'home_based_takeaway', 'inyama_shop', 'coffee_shop')
      and latitude between -90 and 90
      and longitude between -180 and 180
    )
  );

create unique index if not exists partner_applications_one_pending_owner
  on public.partner_applications (owner_user_id)
  where status = 'pending' and owner_user_id is not null;
create unique index if not exists partner_applications_one_pending_email
  on public.partner_applications ((lower(owner_email)))
  where status = 'pending' and owner_email is not null;

-- A confirmation link updates auth.users. This trusted auth trigger copies only
-- the confirmation timestamp to the matching private application. It is not a
-- client-callable function.
create or replace function private.sync_partner_application_email_confirmation()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_catalog
as $$
begin
  if new.email_confirmed_at is not null then
    update public.partner_applications
    set owner_email_confirmed_at = new.email_confirmed_at
    where owner_user_id = new.id
      and owner_email_confirmed_at is distinct from new.email_confirmed_at;
  end if;
  return new;
end;
$$;

revoke all on function private.sync_partner_application_email_confirmation() from public, anon, authenticated;
drop trigger if exists sync_partner_application_email_confirmation on auth.users;
create trigger sync_partner_application_email_confirmation
after insert or update of email_confirmed_at on auth.users
for each row execute function private.sync_partner_application_email_confirmation();

-- Backfill the timestamp for any previously confirmed user who already has an
-- application, without exposing auth.users to browser roles.
update public.partner_applications application
set owner_email_confirmed_at = users.email_confirmed_at
from auth.users users
where application.owner_user_id = users.id
  and users.email_confirmed_at is not null
  and application.owner_email_confirmed_at is distinct from users.email_confirmed_at;

-- Browser users must not insert applications directly. The Edge Function below
-- is the only public entry point and uses the service-role server key.
drop policy if exists "Anyone can submit partner applications" on public.partner_applications;
revoke insert on public.partner_applications from anon, authenticated;

-- Record only irreversible SHA-256 fingerprints to throttle public registration
-- attempts. There is deliberately no browser policy for this table.
create table if not exists public.restaurant_registration_rate_limits (
  id uuid primary key default gen_random_uuid(),
  email_fingerprint text not null check (email_fingerprint ~ '^[0-9a-f]{64}$'),
  ip_fingerprint text not null check (ip_fingerprint ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);
alter table public.restaurant_registration_rate_limits enable row level security;
revoke all on table public.restaurant_registration_rate_limits from public, anon, authenticated;
create index if not exists restaurant_registration_rate_limits_email_created_idx
  on public.restaurant_registration_rate_limits (email_fingerprint, created_at desc);
create index if not exists restaurant_registration_rate_limits_ip_created_idx
  on public.restaurant_registration_rate_limits (ip_fingerprint, created_at desc);

-- This server-only RPC performs the count and insert together. Advisory locks
-- stop parallel requests from bypassing the limit for one email address or IP.
create or replace function public.record_restaurant_registration_attempt(
  p_email_fingerprint text,
  p_ip_fingerprint text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare
  v_email_lock bigint := hashtextextended('email:' || coalesce(p_email_fingerprint, ''), 81721);
  v_ip_lock bigint := hashtextextended('ip:' || coalesce(p_ip_fingerprint, ''), 81721);
  v_email_attempts integer;
  v_ip_attempts integer;
begin
  if coalesce(p_email_fingerprint, '') !~ '^[0-9a-f]{64}$'
     or coalesce(p_ip_fingerprint, '') !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid registration rate-limit key';
  end if;

  if v_email_lock <= v_ip_lock then
    perform pg_advisory_xact_lock(v_email_lock);
    perform pg_advisory_xact_lock(v_ip_lock);
  else
    perform pg_advisory_xact_lock(v_ip_lock);
    perform pg_advisory_xact_lock(v_email_lock);
  end if;

  delete from public.restaurant_registration_rate_limits
  where created_at < now() - interval '30 days';

  select count(*) into v_email_attempts
  from public.restaurant_registration_rate_limits
  where email_fingerprint = p_email_fingerprint
    and created_at >= now() - interval '24 hours';

  select count(*) into v_ip_attempts
  from public.restaurant_registration_rate_limits
  where ip_fingerprint = p_ip_fingerprint
    and created_at >= now() - interval '15 minutes';

  if v_email_attempts >= 2 or v_ip_attempts >= 3 then
    return false;
  end if;

  insert into public.restaurant_registration_rate_limits (email_fingerprint, ip_fingerprint)
  values (p_email_fingerprint, p_ip_fingerprint);
  return true;
end;
$$;
revoke all on function public.record_restaurant_registration_attempt(text, text) from public, anon, authenticated;
grant execute on function public.record_restaurant_registration_attempt(text, text) to service_role;

-- Review remains an administrator action, but now creates the owner membership
-- and pilot only after a recorded email confirmation.
drop policy if exists "Admins can create restaurant memberships" on public.restaurant_members;
create policy "Admins can create restaurant memberships"
on public.restaurant_members
for insert to authenticated
with check (
  exists (
    select 1 from public.admin_users administrator
    where administrator.user_id = (select auth.uid())
  )
);
grant insert on public.restaurant_members to authenticated;

drop policy if exists "Admins can create billing subscriptions" on public.billing_subscriptions;
create policy "Admins can create billing subscriptions"
on public.billing_subscriptions
for insert to authenticated
with check (
  exists (
    select 1 from public.admin_users administrator
    where administrator.user_id = (select auth.uid())
  )
);
grant insert on public.billing_subscriptions to authenticated;

create or replace function public.review_partner_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security invoker
set search_path = public, pg_catalog
as $$
declare
  application_row public.partner_applications%rowtype;
  v_started_at timestamptz := now();
  v_restaurant_id uuid;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users administrator
    where administrator.user_id = auth.uid()
  ) then
    raise exception 'Not authorised to review partner applications';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected';
  end if;

  select * into application_row
  from public.partner_applications
  where id = p_application_id
  for update;

  if not found then
    raise exception 'Application not found';
  end if;
  if application_row.status <> 'pending' then
    raise exception 'Application has already been reviewed';
  end if;

  if p_decision = 'approved' then
    if application_row.permission_confirmed is not true
       or application_row.permission_confirmed_at is null then
      raise exception 'Cannot publish: owner permission confirmation is missing';
    end if;
    if application_row.owner_user_id is null
       or application_row.owner_email_confirmed_at is null then
      raise exception 'Cannot publish: the owner must confirm their email address first';
    end if;

    insert into public.restaurants
      (name, area, province, business_type, category, whatsapp, description, menu, is_published, latitude, longitude)
    values
      (application_row.restaurant_name, application_row.area, application_row.province,
       application_row.business_type, application_row.category, application_row.whatsapp,
       'Verified Takeaways Tonight restaurant partner.', application_row.menu, true,
       application_row.latitude, application_row.longitude)
    returning id into v_restaurant_id;

    insert into public.restaurant_members (restaurant_id, user_id, member_role)
    values (v_restaurant_id, application_row.owner_user_id, 'owner');

    insert into public.billing_subscriptions
      (restaurant_id, status, currency, admin_fee_amount_cents, monthly_amount_cents,
       pilot_started_at, pilot_ends_at, next_billing_at, updated_at)
    values
      (v_restaurant_id, 'trialing', 'ZAR', 25000, 50000,
       v_started_at, v_started_at + interval '14 days', null, now());
  end if;

  update public.partner_applications
  set status = p_decision
  where id = p_application_id;
end;
$$;
revoke all on function public.review_partner_application(uuid, text) from public, anon;
grant execute on function public.review_partner_application(uuid, text) to authenticated;

-- The location helper only reads rows that public RLS already exposes. It does
-- not need elevated privileges for anonymous customers.
alter function public.list_nearby_food_businesses(double precision, double precision) security invoker;

-- The previous direct-publish RPC must remain inaccessible to browser roles.
revoke all on function public.register_food_business(uuid, text, text, text, text, text, text, text, text, jsonb, double precision, double precision)
  from public, anon, authenticated;
