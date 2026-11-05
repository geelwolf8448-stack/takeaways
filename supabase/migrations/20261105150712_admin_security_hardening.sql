-- Takeaways Tonight? — administrator security hardening
-- Applied to the linked Supabase project on 2026-11-05.
-- Safe to re-run. Keeps admin review available only to authenticated allowlisted admins.

-- Efficiently evaluate auth.uid() once per statement in RLS policies.
drop policy if exists "Admins can view partner applications" on public.partner_applications;
create policy "Admins can view partner applications"
on public.partner_applications
for select to authenticated
using (
  exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);

drop policy if exists "Admins can view their own admin record" on public.admin_users;
create policy "Admins can view their own admin record"
on public.admin_users
for select to authenticated
using (user_id = (select auth.uid()));

-- The RPC runs as the caller. RLS now protects the application row and published
-- restaurant insert, instead of relying on a SECURITY DEFINER bypass.
drop policy if exists "Admins can review partner applications" on public.partner_applications;
create policy "Admins can review partner applications"
on public.partner_applications
for update to authenticated
using (
  status = 'pending'
  and exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);
grant update on public.partner_applications to authenticated;

drop policy if exists "Admins can publish restaurants" on public.restaurants;
create policy "Admins can publish restaurants"
on public.restaurants
for insert to authenticated
with check (
  is_published = true
  and exists (
    select 1 from public.admin_users a
    where a.user_id = (select auth.uid())
  )
);
grant insert on public.restaurants to authenticated;

create or replace function public.review_partner_application(
  p_application_id uuid,
  p_decision text
)
returns void
language plpgsql
security invoker
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
    if application_row.permission_confirmed is not true
       or application_row.permission_confirmed_at is null then
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

-- No anonymous or PUBLIC callers. Authenticated callers are still constrained by
-- auth.uid(), admin_users, and the table RLS policies above.
revoke all on function public.review_partner_application(uuid, text) from public, anon;
grant execute on function public.review_partner_application(uuid, text) to authenticated;

-- Internal DDL event-trigger function, not a client API.
revoke all on function public.rls_auto_enable() from public, anon, authenticated;
