-- Takeaways Tonight? shared directory foundation
-- Run this in Supabase SQL Editor. Never put a service-role key in the website.
create extension if not exists pgcrypto;

create table if not exists public.partner_applications (
  id uuid primary key default gen_random_uuid(),
  restaurant_name text not null check (char_length(restaurant_name) between 2 and 120),
  area text not null check (char_length(area) between 2 and 80),
  category text not null check (char_length(category) between 2 and 60),
  whatsapp text not null check (whatsapp ~ '^27[0-9]{9}$'),
  menu jsonb not null check (jsonb_typeof(menu) = 'array' and jsonb_array_length(menu) between 1 and 100),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
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

alter table public.partner_applications enable row level security;
alter table public.restaurants enable row level security;

-- Visitors can submit applications, but cannot read private submissions.
drop policy if exists "Anyone can submit partner applications" on public.partner_applications;
create policy "Anyone can submit partner applications"
on public.partner_applications for insert to anon, authenticated
with check (status = 'pending');

-- Public visitors can only read listings that an administrator has published.
drop policy if exists "Public can view published restaurants" on public.restaurants;
create policy "Public can view published restaurants"
on public.restaurants for select to anon, authenticated
using (is_published = true);

-- No public update/delete policies are created. Manage approvals and listings
-- in the Supabase dashboard while signed in as the project owner.
grant insert on public.partner_applications to anon, authenticated;
grant select on public.restaurants to anon, authenticated;

-- IMPORTANT: keep the Supabase service_role key private. Do not add it to index.html.
