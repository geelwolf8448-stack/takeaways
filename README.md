# Takeaways Tonight? 🍔

A South Coast, KwaZulu-Natal restaurant discovery and takeaway-order request platform, intended to cover Hibberdene to Port Edward.

**Website:** https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/

## Current implementation status

The project has moved beyond the original static preview. Use the code in `index.html`, `admin.html`, `config.js` and `supabase/` as the source of truth; older planning documents may not describe the current code.

### Implemented in the repository
- Responsive restaurant discovery page with search and category filters.
- Sample/demo restaurant cards and menu dialogs.
- Basket and WhatsApp order-request flow for approved, non-demo restaurant records.
- Supabase shared restaurant directory: reads only rows with `is_published=true`.
- Restaurant partner application form: submits to `partner_applications`; if submission fails, it downloads a local draft.
- Private admin portal with Supabase email/password sign-in, pending application list, and approve/reject actions.
- Database-side approval function checks the administrator allowlist and publishes an approved application into `restaurants`.
- Password recovery page and Supabase recovery integration.
- PWA manifest, service worker, branding assets, privacy and terms draft pages.
- Capacitor Android build workflow. A successful Android build has been recorded in GitHub Actions; retrieve its APK from the workflow run's Artifacts while it remains available.

### Still requires live verification or further development
- Confirm the SQL setup actually added the intended owner account to `public.admin_users`; a successful SQL run alone is not an end-to-end admin login test.
- Test a real partner application from the public site and approve it in the admin portal.
- Replace demo listings with restaurants that have given written permission and whose details, menus, prices and ordering numbers have been verified.
- Customer accounts, restaurant-owner accounts and role-specific dashboards are not implemented.
- In-app checkout, PayFast marketplace split payments, refunds, order status management, delivery dispatch and commission collection are not implemented. `MARKETPLACE-PAYMENTS.md` and `supabase/marketplace-schema.sql` are planning/foundation materials, not a live payment system.
- Android APK build success does not mean Play Store publication, signing, device testing or release approval is complete.

## Important operating rules
- WhatsApp orders are requests. The restaurant must confirm availability, final prices, fulfilment and payment directly.
- The platform does not currently collect customer food-order payments.
- Do not present demo cards as participating restaurants.
- Do not promise delivery, sales, payments or commission automation that is not active.
- The proposed Premium listing price (R1,000/month plus R250 setup and a 7-day introductory trial) must be agreed in writing with each restaurant before being charged.

## Key files
- `index.html` — public restaurant directory and partner application.
- `admin.html` — private application review portal.
- `config.js` — public Supabase URL and publishable key only. Never put service-role keys here.
- `supabase/schema.sql` — shared directory, application and approval schema.
- `supabase/admin-setup.sql` — adds the owner Auth account to the admin allowlist.
- `supabase/marketplace-schema.sql` and `MARKETPLACE-PAYMENTS.md` — future marketplace planning; not live.
- `COMPLIANCE-CHECKLIST.md` — pre-launch operational and legal review checklist.
