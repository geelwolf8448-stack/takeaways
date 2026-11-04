# Takeaways Tonight? — current launch checklist

**Website:** https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/

This document reflects the current repository implementation. Do not repeat setup steps that have already been completed.

## Already implemented in code
- Public responsive restaurant directory with search and category filters.
- Demo menu cards, menu dialog and basket.
- WhatsApp order-request flow for approved non-demo listings.
- Supabase shared restaurant directory read for published restaurants.
- Partner application submission to Supabase, with local draft fallback if the online request fails.
- Private admin portal: sign-in, pending applications, approve/reject.
- SQL approval function with an administrator allowlist.
- PWA assets and Capacitor Android build workflow.
- Password recovery page.

## Setup already present — verify only if a real test fails
- GitHub Pages repository and website.
- Supabase project and browser configuration in `config.js`.
- Supabase schema in `supabase/schema.sql`.
- Owner allowlist setup script in `supabase/admin-setup.sql` (owner reports it has been run).
- Brevo SMTP configuration was completed in Supabase; a fresh password recovery flow has not yet been verified end to end.

## Next technical acceptance tests (do these once, in order)
1. Open the live public website and confirm the directory status says the shared directory is connected (zero published restaurants is acceptable at first).
2. Submit one clearly labelled test restaurant application using details controlled by the project owner.
3. Sign in to `admin.html`; confirm the owner account is recognised as an administrator and the test application appears.
4. Approve the test application and confirm it appears on the public directory.
5. Remove the test listing/application after verification if it is not a real partner.
6. Test the WhatsApp order-request message with a real partner only after written permission and verified details.

Do not repeat SQL setup, SMTP setup or password recovery unless the corresponding acceptance test proves it is necessary.

## Not implemented yet
- Customer registration/login and order history.
- Restaurant-owner accounts, menu management and restaurant dashboard.
- Live in-app checkout, PayFast split settlement, refunds, order status management, commission ledger automation and delivery dispatch.
- Google Play publication and signed production release.

The Android workflow has produced successful builds in GitHub Actions. Download the debug APK from the successful workflow run's Artifacts for device testing; do not treat that as a Play Store release.

## Commercial and compliance release gates
- Obtain written permission and verify every restaurant's menu, prices, WhatsApp number, opening hours and fulfilment arrangements.
- Replace/remove demo restaurants before public launch.
- Complete operator identity/contact details, privacy notice, terms, POPIA/PAIA processes and appropriate South African legal/accounting review.
- Agree restaurant subscription terms in writing before billing.
- Keep customer food payments outside the platform until a secure, approved and tested payment integration is genuinely deployed.
