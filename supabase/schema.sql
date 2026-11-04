-- Takeaways Tonight? shared directory + secure restaurant approval
-- Run this entire file in Supabase SQL Editor. Safe to re-run.
-- Never put a service_role key in the website.

create extension if not exists pgcrypto;

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null check (char_length(restaurant_name) between 2 and 120),
  area text not null check (char_length(area) between 2 and 80),
  category text not null check (char_length(category) between 2 and 60),
  whatsapp text not null check (whatsapp ~ '^27[0-9]{9}$'),
  menu jsonb not null check (jsonb_typeof(menu) = 'array' and jsonb_array_length(menu) between 1 and 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  permission_confirmed boolean not null default false,
  permission_confirmed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  area text not null,
  category text not null,
  whatsapp text not null check (whatsapp ~ '^27[0-9]{9}$'),
  description text not null default '',
  menu jsonb not null default '[]'::jsonb check (jsonb_typeof(menu) = 'array'),
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Only explicitly allowlisted Supabase Auth users can administer applications.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Server-side timestamp for permission declaration
create or replace function public.stamp_partner_permission_confirmation()
returns trigger language plpgsql set search_path = public as $
begin
  if new.permission_confirmed is true and new.permission_confirmed_at is null then new.permission_confirmed_at := now(); end if;
  return new;
end;
$;
drop trigger if exists partner_permission_confirmation_stamp on public.partner_applications;
create trigger partner_permission_confirmation_stamp before insert or update of permission_confirmed on public.partner_applications for each row execute function public.stamp_partner_permission_confirmation();

alter table public.partner_applications enable row level security;
alter table public.restaurants enable row level security;
alter table public.admin_users enable row level security;

drop policy if exists "Anyone can submit partner applications" on public.partner_applications;
create policy "Anyone can submit partner applications"
on public.partner_applications for insert to anon, authenticated
with check (status = 'pending' and permission_confirmed is true and permission_confirmed_at is not null);

drop policy if exists "Admins can view partner applications" on public.partner_applications;
create policy "Admins can view partner applications"
on public.partner_applications for select to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid()));

drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record"
on public.admin_users for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Public can view published restaurants" on public.restaurants;
create policy "Public can view published restaurants"
on public.restaurants for select to anon, authenticated
using (is_published = true);

grant insert on public.partner_applications to anon, authenticated;
grant select on public.partner_applications to authenticated;
grant select on public.admin_users to authenticated;
grant select on public.restaurants to anon, authenticated;

-- Approvals and rejections happen only through this checked database function.
-- It copies a verified application into the public directory only on approval.
create or replace function public.review_partner_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  application_row public.partner_applications%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
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
    if application_row.permission_confirmed is not true or application_row.permission_confirmed_at is null then
      raise exception 'Cannot publish: permission confirmation is missing';
    end if;
    insert into public.restaurants
      (name, area, category, whatsapp, description, menu, is_published)
    values
      (application_row.restaurant_name, application_row.area,
       application_row.category, application_row.whatsapp,
       'Restaurant partner · details submitted for approval',
       application_row.menu, true);
  end if;

  update public.partner_applications
  set status = p_decision
  where id = p_application_id;
end;
$$;

revoke all on function public.review_partner_application(uuid, text) from public;
grant execute on function public.review_partner_application(uuid, text) to authenticated;

-- IMPORTANT: keep the Supabase service_role key private.
