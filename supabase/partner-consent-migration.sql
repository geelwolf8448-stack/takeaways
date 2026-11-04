-- Takeaways Tonight? — partner permission audit upgrade
-- Run this ONCE in Supabase SQL Editor. It does not recreate tables or delete applications.
alter table public.partner_applications
  add column if not exists permission_confirmed boolean not null default false,
  add column if not exists permission_confirmed_at timestamptz;

create or replace function public.stamp_partner_permission_confirmation()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.permission_confirmed is true and new.permission_confirmed_at is null then
    new.permission_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists partner_permission_confirmation_stamp on public.partner_applications;
create trigger partner_permission_confirmation_stamp
before insert or update on public.partner_applications
for each row execute function public.stamp_partner_permission_confirmation();

drop policy if exists "Anyone can submit partner applications" on public.partner_applications;
create policy "Anyone can submit partner applications"
on public.partner_applications for insert to anon, authenticated
with check (status = 'pending' and permission_confirmed is true and permission_confirmed_at is not null);

create or replace function public.review_partner_application(
  p_application_id uuid, p_decision text
)
returns void language plpgsql security definer set search_path = public as $$
declare application_row public.partner_applications%rowtype;
begin
  if auth.uid() is null or not exists (select 1 from public.admin_users a where a.user_id = auth.uid()) then
    raise exception 'Not authorised to review applications';
  end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid decision'; end if;
  select * into application_row from public.partner_applications where id = p_application_id for update;
  if not found then raise exception 'Application not found'; end if;
  if application_row.status <> 'pending' then raise exception 'Application already reviewed'; end if;
  if p_decision = 'approved' then
    if application_row.permission_confirmed is not true or application_row.permission_confirmed_at is null then
      raise exception 'Cannot publish: permission confirmation is missing';
    end if;
    insert into public.restaurants (name, area, category, whatsapp, description, menu, is_published)
    values (application_row.restaurant_name, application_row.area, application_row.category,
      application_row.whatsapp, 'Restaurant partner · details submitted for approval', application_row.menu, true);
  end if;
  update public.partner_applications set status = p_decision where id = p_application_id;
end;
$$;
revoke all on function public.review_partner_application(uuid, text) from public;
grant execute on function public.review_partner_application(uuid, text) to authenticated;
