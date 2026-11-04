# Takeaways Tonight? — private restaurant approval setup

The public website accepts partner applications. This private admin page lets an allowlisted administrator review them and publish approved restaurants.

## One-time Supabase setup

1. Open the Supabase project dashboard: https://supabase.com/dashboard/project/xsrmtokfrqdyfbrqljsm
2. Open **SQL Editor** and run the complete contents of `supabase/schema.sql` from this repository. It is safe to re-run and adds the protected administrator allowlist and approval function.
3. In Supabase, open **Authentication → Users → Add user**. Create an administrator account using an email address and a strong password you control. Confirm the user if the dashboard offers that option.
4. Copy the new user's **UID** from the Users list.
5. In SQL Editor, run this statement after replacing the example UUID with that exact UID:

```sql
insert into public.admin_users (user_id)
values ('PASTE-THE-ADMIN-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

Only add accounts you personally control. Do not add a restaurant applicant as an administrator.

## Open the admin page

After GitHub Pages deploys, open:

https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/admin.html

Sign in with the administrator email and password created above. Pending applications will appear for review. **Approve & publish** copies the application into the public restaurant directory; **Reject** marks it rejected. The database rechecks the user's admin permission on every action.

## Security notes

- The page contains only the public Supabase publishable key.
- Never paste a Supabase `service_role` or secret key into GitHub, website files, or chat.
- Public visitors can submit applications and read published restaurants only.
- The admin page is not a substitute for verifying the restaurant and obtaining owner permission before publication.
