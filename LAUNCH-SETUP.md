# Takeaways Tonight? — current launch checklist

**Website:** https://geelwolf8448-stack.github.io/takeaways/

This document reflects the current repository implementation. Do not repeat setup steps that have already been completed.

## Already implemented in code
- Public responsive restaurant directory with search and category filters.
- Demo menu cards, menu dialog and basket.
- WhatsApp order-request flow for approved non-demo listings.
- Supabase shared restaurant directory read for published restaurants.
- Partner application submission to Supabase, with local draft fallback if the online request fails.
- Private admin portal: sign-in, pending applications, approve/reject, owner-access review and marketplace overview.
- Customer account portal: passwordless sign-in, profile and private order history.
- Restaurant owner portal: passwordless sign-in, access requests, menu updates and order management for approved restaurant members.
- Authenticated marketplace Edge Function validates live menu prices, saves orders and enforces restaurant-authorised status changes.
- Commission ledger records the proposed 15% of food subtotal on completed orders that the restaurant has marked paid directly. It does not collect commission.
- SQL approval function with an administrator allowlist.
- PWA assets and Capacitor Android build workflow.
- Launch-ready draft copy, restaurant onboarding checklist, customer FAQ and store listing in `LAUNCH-KIT.md`.
- Manual signed Android release workflow prepared in `.github/workflows/android-release.yml`; secure keystore setup is documented in `ANDROID-RELEASE.md`.
- Password recovery page.

## Setup already present — verify only if a real test fails
- GitHub Pages repository and website.
- Supabase project and browser configuration in `config.js`.
- Supabase schema in `supabase/schema.sql`.
- Owner allowlist setup script in `supabase/admin-setup.sql` (owner reports it has been run).
- Brevo SMTP configuration was completed in Supabase; a fresh password recovery flow has not yet been verified end to end.
- Supabase Security Advisor currently reports leaked-password protection disabled. Enable it in Auth password-security settings if the current Supabase plan supports it; otherwise record the plan limitation and retain the warning.

## Next technical acceptance tests (do these once, in order)
1. Open the live public website and confirm the directory status says the shared directory is connected (zero published restaurants is acceptable at first).
2. In Supabase Authentication → URL Configuration, allow the web portal URLs `https://geelwolf8448-stack.github.io/takeaways/account.html` and `https://geelwolf8448-stack.github.io/takeaways/restaurant-portal.html`, plus the Android callback URLs `takeawaystonight://auth/callback?target=account` and `takeawaystonight://auth/callback?target=restaurant`.
3. Submit one clearly labelled test restaurant application using details controlled by the project owner.
4. Sign in to `admin.html`; confirm the owner account is recognised as an administrator and the test application appears.
5. Approve the test application and confirm it appears on the public directory.
6. Remove the test listing/application after verification if it is not a real partner.
7. Create a test customer account and verify the profile appears in the account page.
8. After a real restaurant is approved, have its authorised owner create an account and submit an access request. Approve it in the admin portal and verify that the owner can see only that restaurant.
9. Submit a test customer order against a real approved menu, verify the saved order and WhatsApp notification, and test the full restaurant status flow including direct-payment confirmation.
10. Verify the 15% ledger calculation on a completed test order, then remove test records if they are not genuine business transactions.
11. On a physical Android device, request a customer and restaurant-owner sign-in link and confirm each opens the installed app, restores the session and routes to the correct portal.

Do not repeat SQL setup, SMTP setup or password recovery unless the corresponding acceptance test proves it is necessary.

## Not implemented yet
- PayFast checkout, verified ITN notifications, split settlement, automated refunds and payout reconciliation.
- Delivery dispatch, push/email order notifications, restaurant subscription billing and automatic commission collection.
- Full production acceptance testing with real customer and restaurant accounts.
- Google Play publication and signed production release. A signed build can be generated after the owner creates a private upload keystore and adds the four required GitHub Actions secrets.
- Physical-device testing of the new Android magic-link deep-link flow and Supabase redirect allowlist.

The Android workflow has produced successful builds in GitHub Actions. Download the debug APK from the successful workflow run's Artifacts for device testing; do not treat that as a Play Store release.

## Commercial and compliance release gates
- Obtain written permission and verify every restaurant's menu, prices, WhatsApp number, opening hours and fulfilment arrangements.
- Replace/remove demo restaurants before public launch.
- Complete operator identity/contact details, privacy notice, terms, POPIA/PAIA processes and appropriate South African legal/accounting review.
- Agree restaurant subscription terms in writing before billing.
- Keep customer food payments outside the platform until PayFast approves the merchant/split model and a secure, approved and tested payment integration is genuinely deployed. Do not invoice or collect the proposed 15% commission until written restaurant agreements and legal/accounting review are complete.
