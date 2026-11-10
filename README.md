# Takeaways Tonight? 🍔

A South Coast, KwaZulu-Natal restaurant discovery and takeaway-order request platform, intended to cover Hibberdene to Port Edward.

**Website:** https://geelwolf8448-stack.github.io/takeaways/

## Current implementation status

The project has moved beyond the original static preview. Use the code in `index.html`, `admin.html`, `config.js` and `supabase/` as the source of truth; older planning documents may not describe the current code.

### Implemented in the repository
- Responsive restaurant discovery page with search and category filters.
- Sample/demo restaurant cards and menu dialogs.
- Basket and WhatsApp order-request flow for approved, non-demo restaurant records.
- Supabase shared restaurant directory: reads only rows with `is_published=true`.
- Restaurant partner application form: submits to `partner_applications`; if submission fails, it downloads a local draft.
- Private admin portal with Supabase passwordless email-link sign-in, pending application list, restaurant-owner access review, and marketplace reporting.
- Database-side approval function checks the administrator allowlist and publishes an approved application into `restaurants`.
- Secure one-time sign-in callback page for Supabase email-link authentication.
- PWA manifest, service worker, branding assets, privacy and terms draft pages.
- Customer account portal with passwordless sign-in, editable contact profile and private order history.
- Restaurant-owner portal with verified access requests, customer order management, browser pop-up notifications and 15-second polling while the portal is open. Menu, prices, specials and listing changes are managed centrally by the platform administrator.
- Marketplace order database and authenticated Edge Function: validates live menu prices server-side, creates one-restaurant orders, supports idempotency, and enforces restaurant-authorised order status changes.
- Commission ledger records the proposed 15% food-subtotal commission only after an order is completed and marked paid directly to the restaurant. No commission payment or PayFast split is currently collected.
- Capacitor Android build workflow with a static release-validation test gate (`npm test`). Customer and restaurant-owner email sign-in uses a custom Android deep link to return to the installed app. Debug APK and unsigned AAB are build outputs for testing/release preparation, not Play Store-ready signed releases.

### Still requires live verification or further development
- Complete a real passwordless administrator sign-in and confirm the owner account is in `public.admin_users`; a successful SQL run or deployment alone is not an end-to-end admin login test.
- Test a real partner application from the public site and approve it in the admin portal.
- Replace demo listings with restaurants that have given written permission and whose details, menus, prices and ordering numbers have been verified.
- Customer and restaurant-owner portals are implemented in code; real-user sign-in, restaurant-owner verification and end-to-end testing remain outstanding. Restaurant order pop-up notifications require the owner to sign in, keep the portal open and allow browser notifications on that device; they are not yet push notifications when the portal/browser is closed.
- PayFast checkout, ITN verification, split settlement, automated refunds, delivery dispatch and commission collection are not implemented. Order status management is implemented for direct-pay orders. `supabase/marketplace-schema.sql` is an older planning reference; use the dated migration files for the live schema.
- Android APK build success does not mean Play Store publication, signing, device testing or release approval is complete.

## Important operating rules
- WhatsApp orders are requests. The restaurant must confirm availability, final prices, fulfilment and payment directly.
- The platform does not currently collect customer food-order payments.
- Do not present demo cards as participating restaurants.
- Do not promise delivery, sales, payments or commission automation that is not active.
- The proposed Premium listing price (R1,000/month plus R250 setup and a 14-day introductory trial) must be agreed in writing with each restaurant before being charged.

## Key files
- `index.html` — public restaurant directory and partner application.
- `admin.html` — private application review portal.
- `config.js` — public Supabase URL and publishable key only. Never put service-role keys here.
- `supabase/schema.sql` — shared directory, application and approval schema.
- `supabase/admin-setup.sql` — adds the owner Auth account to the admin allowlist.
- `account.html` — customer sign-in, profile and order history.
- `native-auth.js` — restores Supabase email-link sessions when the Android app is opened through its custom URL scheme.
- `scripts/configure-android-deeplinks.js` — configures the Android intent filter and `za.co.takeawaystonight.app` scheme during builds.
- `restaurant-portal.html` — restaurant-owner access requests, menu management and order dashboard.
- `supabase/functions/marketplace-api/index.ts` — deployed authenticated order and owner-access API.
- `supabase/migrations/20261105151101_customer_accounts_orders_foundation.sql` — source for the deployed customer, restaurant-owner and order schema.
- `supabase/marketplace-schema.sql` — original marketplace planning reference; do not run it over the current schema without review.
- `MARKETPLACE-PAYMENTS.md` — current payment status, commission design and activation gates.
- `COMPLIANCE-CHECKLIST.md` — pre-launch operational and legal review checklist.
- `scripts/validate-release.js` — static release checks, run with `npm test`.
- `LAUNCH-KIT.md` — ready-to-adapt public launch copy, restaurant invitation, onboarding checklist, customer FAQ and Google Play listing draft.
- `ANDROID-RELEASE.md` — secure upload-keystore instructions and signed release process.
- `RESTAURANT-AGREEMENT-TEMPLATE.md` — draft listing permission and commercial terms template for legal review.
- `.github/workflows/android-release.yml` — manual signed APK/AAB workflow; requires four private GitHub Actions signing secrets.
