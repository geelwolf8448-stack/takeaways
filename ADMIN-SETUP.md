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

## Email delivery troubleshooting

The current admin browser session has shown Supabase's generic "Error sending magic link email" response. The portal now displays a more useful diagnostic note for that error.

If it appears again:
1. Open Supabase Dashboard → Logs → Auth Logs and inspect the failed email event and SMTP response.
2. Confirm the sender address is verified/approved in Brevo.
3. Confirm Supabase SMTP host is `smtp-relay.brevo.com`, port is `587`, and the username is the Brevo SMTP login (not an API key).
4. Confirm the SMTP key is current and the Supabase Auth email rate limit has not been reached.
5. Do not put SMTP credentials in the repository or share them in a chat.

Do not request repeated links until the delivery error is understood. A successful request should display a message telling the owner to open the newest email and click its one-time link in the same browser.

## Read-only diagnostic query\n\nIf the admin page reports that the account is not allowlisted or cannot read applications, run `supabase/admin-diagnostic.sql` in Supabase SQL Editor. It only reads account, RLS and function status; it makes no database changes. Use its result to identify the specific failed check before changing anything.\n\n## One-time acceptance test
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
