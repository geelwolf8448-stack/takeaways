-- Takeaways Tonight? — one-time administrator setup
-- Run this in Supabase SQL Editor AFTER the owner has created an account
-- in Supabase Authentication using geelwolf8448@gmail.com.
-- This adds only that exact account to the private administrator allowlist.

do $$
declare
  owner_user_id uuid;
begin
  select id
    into owner_user_id
  from auth.users
  where lower(email) = lower('geelwolf8448@gmail.com')
  limit 1;

  if owner_user_id is null then
    raise exception 'No Supabase Auth account found for geelwolf8448@gmail.com. Create the account in Authentication first, then run this script again.';
  end if;

  insert into public.admin_users (user_id)
  values (owner_user_id)
  on conflict (user_id) do nothing;
end
$$;

-- Confirm the allowlist entry was created:
select
  u.email,
  a.user_id,
  a.created_at
from public.admin_users a
join auth.users u on u.id = a.user_id
where lower(u.email) = lower('geelwolf8448@gmail.com');
