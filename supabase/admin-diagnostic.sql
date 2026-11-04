-- Read-only administrator and RLS diagnostics for Takeaways Tonight?
-- Run in Supabase SQL Editor. This script makes no changes.

-- 1. Confirm the owner Auth account exists and is allowlisted.
select
  u.email,
  u.id as auth_user_id,
  (a.user_id is not null) as is_admin_allowlisted,
  a.created_at as admin_added_at
from auth.users u
left join public.admin_users a on a.user_id = u.id
where lower(u.email) = lower('geelwolf8448@gmail.com');

-- 2. Confirm the expected tables exist and RLS is enabled.
select
  c.relname as table_name,
  c.relrowsecurity as row_level_security_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('admin_users','partner_applications','restaurants')
order by c.relname;

-- 3. Show the policies that currently protect the three tables.
select
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('admin_users','partner_applications','restaurants')
order by tablename, policyname;

-- 4. Confirm the authenticated role can call the guarded review function.
select
  to_regprocedure('public.review_partner_application(uuid,text)') is not null
    as review_function_exists,
  has_function_privilege(
    'authenticated',
    'public.review_partner_application(uuid,text)',
    'EXECUTE'
  ) as authenticated_can_execute_review_function;
