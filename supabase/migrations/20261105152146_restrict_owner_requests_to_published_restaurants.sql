-- Prevent owner access requests for listings that are not currently published.
drop policy if exists "Users submit own restaurant ownership requests" on public.restaurant_owner_requests;
create policy "Users submit own restaurant ownership requests"
on public.restaurant_owner_requests for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1 from public.restaurants r
    where r.id = restaurant_owner_requests.restaurant_id
      and r.is_published = true
  )
);