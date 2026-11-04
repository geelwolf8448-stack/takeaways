# Changelog

## 2026-11-04 — pilot launch and Android release preparation

### Website and customer journey
- Clarified that the live pilot sends WhatsApp order requests; it does not take food payments or confirm orders.
- Reworded the restaurant delivery navigation so it describes restaurant delivery options, not a platform-operated delivery fleet.
- Removed unfinished Favourites, Orders and Settings items from the mobile navigation and linked the remaining items to real page sections.
- Changed the restaurant section heading so sample cards are not presented as confirmed featured partners.
- Aligned PWA install colors with the black-and-gold brand and refreshed the service-worker cache version.

### Admin and database support
- Corrected Supabase magic-link callback verification to use the matching magiclink token type, while retaining support for email, recovery, PKCE and hash-session callbacks.
- Added actionable SMTP troubleshooting text when Supabase reports an email delivery failure.
- Added a read-only SQL diagnostic for the administrator allowlist, RLS policies and review function.
- Added documentation for the one-time sign-in and safe SMTP diagnosis.

### Launch materials
- Added public launch copy, restaurant invitation, customer FAQ, onboarding checklist and Google Play listing draft.
- Added a restaurant listing permission and commercial-terms agreement template for legal review.
- Kept all proposed fees and any future order commission explicitly labelled as proposals/not active.

### Android release preparation
- Added a manual signed APK/AAB workflow that uses private GitHub Actions secrets and does not commit the keystore.
- Added versionCode/versionName configuration for release builds.
- Added secure keystore generation and secret-storage instructions.
- Expanded the automated release checks, including a fixture test for the Android signing configuration.

### Still not verified / not live
- Supabase magic-link email delivery: the open admin portal previously showed "Error sending magic link email"; check Supabase Auth Logs and Brevo sender verification.
- Administrator allowlist and application review end-to-end.
- Test partner application, approval and public listing.
- Live WhatsApp hand-off with a real restaurant that has approved the listing.
- Signed Android build: requires the owner-created upload keystore and four GitHub Actions secrets.
- Google Play submission and approval.
- Real partner listings, final operator identity/contact details and legal review.
