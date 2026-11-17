-- Remove unnecessary elevated execution from restaurant-owner helper RPCs.
-- The caller's existing RLS policies already restrict each update to an owner,
-- manager, or allowlisted administrator.

drop policy if exists "Service role manages registration rate limits" on public.restaurant_registration_rate_limits;
create policy "Service role manages registration rate limits"
on public.restaurant_registration_rate_limits
for all to service_role
using (true)
with check (true);

drop policy if exists "Admins can update restaurants" on public.restaurants;
create policy "Admins can update restaurants"
on public.restaurants
for update to authenticated
using (
  is_published = true
  and exists (
    select 1 from public.admin_users administrator
    where administrator.user_id = (select auth.uid())
  )
)
with check (
  is_published = true
  and exists (
    select 1 from public.admin_users administrator
    where administrator.user_id = (select auth.uid())
  )
);

alter function public.set_my_restaurant_location(uuid, double precision, double precision) security invoker;
alter function public.set_restaurant_business_image(uuid, text) security invoker;
alter function public.set_restaurant_business_name(uuid, text) security invoker;
alter function public.set_restaurant_menu_file(uuid, text) security invoker;
alter function public.update_restaurant_menu(uuid, jsonb) security invoker;
