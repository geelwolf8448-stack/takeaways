# Takeaways Tonight? — administrator portal

**Admin portal:** https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/admin.html

## Current implementation
The admin page signs in through Supabase Auth. It checks the signed-in user's UUID against `public.admin_users`, then reads pending rows from `public.partner_applications`. Approve/reject actions call the database function `public.review_partner_application`, which performs its own allowlist check.

## Setup status
The project owner reports that:
- The main schema in `supabase/schema.sql` was run.
- The owner allowlist script in `supabase/admin-setup.sql` was run.

Do not run these again just because the admin page is open. The scripts are designed to be safe to re-run, but first verify the actual status message shown in the admin portal.

## Admin setup script
`supabase/admin-setup.sql` looks up the existing Supabase Auth user for `geelwolf8448@gmail.com`, inserts its UUID into `public.admin_users` if not already present, and returns a confirmation row. It requires the Auth user to exist first.

## One-time acceptance test
1. Open the admin portal.
2. Sign in with the existing Supabase Auth account.
3. Read the status under Pending applications.
4. If it reports that the account is not allowlisted, inspect the result of `supabase/admin-setup.sql` in Supabase SQL Editor before making any further changes.
5. Submit a test partner application from the public site, then refresh the admin list.
6. Approve only a test listing or a restaurant that has explicitly authorised publication.

## Security
- Browser code uses only the public Supabase publishable key.
- Never place a Supabase service-role key or database password in GitHub or browser code.
- Public users may submit applications and read published restaurant listings only.
- Application review is restricted by database-side administrator checks.
