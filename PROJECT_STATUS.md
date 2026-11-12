# Takeaways Tonight? — Project Progress

Last updated: 11 November 2026

## Project identity
- App: Takeaways Tonight?
- Owner / platform administrator email: geelwolf8448@gmail.com
- GitHub repository: https://github.com/geelwolf8448-stack/takeaways
- Public website: https://geelwolf8448-stack.github.io/takeaways/
- Restaurant portal: https://geelwolf8448-stack.github.io/takeaways/restaurant-portal.html
- Admin portal: https://geelwolf8448-stack.github.io/takeaways/admin.html
- Supabase project: xsrmtokfrqdyfbrqljsm

## Commercial model — confirmed, do not change without owner instruction
- 14-day free pilot for every restaurant, takeaway shop, home-based takeaway, inyama shop and coffee shop.
- R250 once-off admin fee after the pilot.
- R500 monthly subscription after the pilot.
- No commission on food orders. Restaurants keep 100% of food sales.
- Food-order payments must go directly to the restaurant; platform subscriptions are separate and intended to be collected through the platform PayFast account linked to TymeBank.

## Latest completed work — restaurant payment method choices
Restaurants can configure which payment methods they accept. Customers should only see the methods enabled by the restaurant and choose one during checkout. The selected method is saved on the order and shown in the restaurant order dashboard and WhatsApp order notification.

Implemented payment methods:
- Cash on collection (only offered for collection orders).
- Cash on delivery (only offered for delivery orders).
- EFT / bank transfer.
- Card machine at the restaurant.

Implementation details:
- Added `restaurants.accepted_payment_methods` as a non-null text array with defaults for the four direct-payment methods.
- Restaurant portal provides owner/manager controls to enable or disable methods; other restaurant staff see the settings read-only.
- Public checkout loads the restaurant's accepted methods and presents the relevant options.
- The order API validates that the selected method is enabled for that restaurant and matches collection/delivery rules.
- The order record stores the chosen method in `payment_method`.
- Restaurant order cards show the chosen payment method.
- WhatsApp order notification includes the customer's selected payment method.
- Supabase Edge Function `marketplace-api` deployed as version 9 with JWT verification enabled.
- Public website and restaurant portal inline scripts passed JavaScript syntax checks.
- Service-worker cache name bumped to `takeaways-tonight-v36-all-food-business-pilot` after the pricing and pilot-eligibility copy updates.

## Latest saved progress — pricing and pilot eligibility (11 November 2026)
The owner confirmed the updated commercial offer:
- Every restaurant, takeaway shop, home-based takeaway, inyama shop and coffee shop receives the same 14-day free pilot.
- After the pilot: R250 once-off admin fee, then R500 per month.
- No commission on food orders; food businesses retain 100% of their food sales.

Updated customer-facing and project materials:
- Public website food-business section welcomes all five business categories and states the 14-day free pilot and updated fees.
- Public application/admin note states the same eligibility and pricing.
- WhatsApp invitation message names all five categories and the updated offer.
- Restaurant portal sign-in message confirms all five categories qualify for the free pilot.
- Updated launch kit, restaurant agreement template, README and this project status file.
- Service-worker cache version updated to `takeaways-tonight-v36-all-food-business-pilot`.

Relevant commits for this update:
- Public website and invitation wording: `5f5e1c4bbeba2525e4e0b4a986455c7b834e3c82`, with final public pricing correction in `7201783dd8ed7222b722338f179588fbe73130dd`.
- Restaurant portal eligibility wording: `d5c65bfc4a7d3187dd379400ac8dfea609419ff2`.
- Launch kit: `6263437e5336817a80e2c8b7d2cce8b66c122a27`.
- README: `10cb5a1ce4e0c9fd523bda137ab1b5d34e692fb0`.
- Restaurant agreement: `5a3cc33bff5d02d4100f04a503fdb914dd35287a`.
- Service-worker cache: `408179f601c9fe2d1549ea9032181e0997fbe4cd`.

Important: These updates change the published wording and project documentation. They do not activate automatic PayFast subscription billing. Online card payment through restaurants' own PayFast accounts also remains unimplemented. Browser-based end-to-end testing of the customer ordering journey remains outstanding.
## Other existing capabilities retained
- South African province filter across all nine provinces.
- Restaurant partner applications and owner/manager portal.
- Restaurant menu item editing and PDF/image menu upload.
- Restaurant adverts and specials with province targeting.
- Customer basket and order requests.
- Restaurant order dashboard and push notification support.

## Important payment limitation — not yet completed
- Online card payment through each restaurant's own PayFast merchant account is NOT active.
- The portal currently explains that PayFast online card payments will be added after each restaurant has its own merchant setup.
- Do not show an online PayFast option as available until merchant onboarding, secure server-side checkout, PayFast ITN/webhook verification, and successful end-to-end testing are completed.
- Do not route all customer food-order proceeds into the platform owner's PayFast/TymeBank account.
- Do not add platform commission or split deductions. The owner explicitly confirmed zero commission.

## Next work / testing checklist
1. Test a restaurant owner signing in and saving a combination of accepted payment methods.
2. Test that customers only see that restaurant's enabled methods.
3. Test collection vs delivery filtering for cash on collection/delivery.
4. Place a test order and verify the chosen method is stored, displayed in the restaurant portal, and included in the WhatsApp notification.
5. Test with at least two restaurants using different payment settings.
6. Add PayFast online card payment only after each restaurant's merchant-account arrangement is confirmed and the secure payment flow is implemented.
7. Complete separate PayFast subscription collection for the R250 once-off admin fee and R500 monthly subscription.
8. Test the full customer-to-restaurant order journey in a real browser and on mobile.

## Latest relevant GitHub commits
- Restaurant portal payment settings and display: `ff001d2de7b19330bb2e10d6972ed74e2fcf97bd`
- Public checkout payment selection and WhatsApp notification: `b937e3965d911e4c16d976df26bedba271d3b251`
- Service-worker cache update: `933434fab19e88f520edd7b8d920351cff62f089`
- Restaurant portal async rendering correction: `0c8bb897ac02536ef468a1f4af8769f02a5fd4bd`
- Latest portal permissions adjustment: `ff001d2de7b19330bb2e10d6972ed74e2fcf97bd`

## Security notes
- Never place Supabase service-role keys, PayFast merchant keys, or other secrets in public HTML/JavaScript.
- Keep payment creation and PayFast notification verification server-side.
- Preserve row-level security and authenticated owner/manager authorization.


## Separate platform billing — groundwork deployed (12 November 2026)

The platform billing system is separate from customer food-order payments and restaurant payouts.

Confirmed pricing:
- Every approved restaurant, takeaway shop, home-based takeaway, inyama shop and coffee shop receives one 14-day free pilot.
- R250 once-off administration fee, due at the end of the pilot.
- R500 monthly subscription, to begin after the once-off admin fee is settled.
- No food-order commission; businesses keep 100% of food sales.

Completed technical groundwork:
- Created `billing_subscriptions` to track each approved food business, pilot start/end dates, status, once-off admin fee, monthly fee, and next billing date.
- Created `billing_invoices` with separate invoice types for the R250 admin fee and R500 monthly subscription.
- Created `billing_payment_events` for idempotent payment-notification records.
- Prepared secure server-side fields for the PayFast recurring subscription token/status and last payment result; unique indexes prevent duplicate provider tokens/payment references.
- Enforced fixed ZAR prices in database constraints: 25,000 cents admin fee and 50,000 cents monthly subscription.
- Enabled row-level security; billing records are readable only by platform administrators. No public browser write access.
- Deployed Supabase Edge Function `platform-billing` version 1 with JWT verification. It checks administrator access server-side, lists food businesses and billing records, and starts a one-time 14-day pilot for an approved/published business.
- Updated `admin.html` with a Business Subscriptions & Pilot Periods panel. Administrators can view each business, see pilot/billing status, and start its 14-day pilot. Starting a pilot creates the R250 admin-fee invoice due at the end of the 14 days.
- The monthly R500 charge is deliberately not invoiced or collected until the R250 admin fee has been settled.

Not yet live:
- PayFast checkout for the R250 administration invoice.
- PayFast recurring subscription/token billing for R500 monthly.
- PayFast ITN signature/amount verification and idempotent invoice settlement.
- Automated overdue reminders, retry handling, cancellation and suspension rules.
- End-to-end test using a real/sandbox PayFast merchant account.

Important: The deployed billing function currently manages pilot dates and billing records only. It does not collect money, mark invoices paid, or start automatic recurring charges. Do not tell businesses that PayFast billing is active until the payment integration has been configured and tested. Keep all PayFast merchant credentials and passphrases in server-side Supabase secrets only; never put them in public HTML or GitHub.

## PayFast integration preparation update (12 November 2026)

- Confirmed from PayFast's current merchant support guidance that setting a Security Passphrase under Settings → Developer Settings enables subscription payments. Tokenization is a separate Recurring Billing setting and is not required for the standard fixed monthly subscription flow planned here.
- PayFast recurring subscriptions use credit cards, monthly frequency, and an indefinite cycle count where appropriate. PayFast requires the passphrase in the payment signature for subscription setup.
- PayFast sandbox supports custom integration and recurring-billing tests without transferring real money. Sandbox ITNs can be inspected in the sandbox dashboard.
- Supabase Edge Function `platform-billing` is ACTIVE at version 4. Its administrator-authenticated `payment_config_status` action reports only whether required server-side PayFast settings are present; it never returns secret values and does not create payments.
- Deployed Supabase Edge Function `payfast-itn` version 2 as the public PayFast notification receiver. It checks the PayFast source IP allowlist, verifies the notification signature, calls PayFast's server-side validation endpoint, checks merchant/reference/amount, records idempotent payment events, and updates invoice/subscription records only after validation. JWT verification is disabled only for this function because PayFast's server callback cannot supply an administrator JWT; the callback performs its own payment-origin and payload verification.
- The ITN receiver URL is `https://xsrmtokfrqdyfbrqljsm.supabase.co/functions/v1/payfast-itn`.
- The admin billing panel continues to show whether secure PayFast settings are configured. This is a readiness indicator only, not proof of a successful payment integration.
- Added and verified index `billing_payment_events_invoice_id_idx` for the payment-event invoice foreign key.
- No checkout form is exposed to the browser yet. The PayFast custom form specification includes the merchant key in the submitted form; the project security rule is to keep merchant keys and passphrases out of public frontend code. A safe checkout handoff must be completed before any payment button is enabled.

Required server-side Supabase secrets (to be entered only after PayFast account access is recovered):
- `PAYFAST_MERCHANT_ID`
- `PAYFAST_MERCHANT_KEY`
- `PAYFAST_PASSPHRASE`
- `PAYFAST_MODE` (must remain `sandbox` during testing)
- `PAYFAST_RETURN_URL`
- `PAYFAST_CANCEL_URL`
- `PAYFAST_NOTIFY_URL` (set to the ITN receiver URL above)

Still not implemented or enabled:
- A safe server-side checkout handoff for the R250 once-off admin fee.
- Recurring subscription checkout for R500 per month, only after the R250 admin fee is confirmed paid.
- Monthly invoice generation and recurring billing lifecycle handling.
- Sandbox end-to-end payment tests.
- Explicit owner approval before changing any payment configuration from sandbox to live.

Safety rule: never send merchant keys or passphrases through chat, email, GitHub, or public frontend files. Never mark an invoice paid based only on the browser return URL. Only a verified PayFast notification can settle an invoice. Food-order payments must continue going directly to the business; do not enable split payments or platform commission deductions.

## PayFast sandbox account update (12 November 2026)

- Owner confirmed access to the PayFast Sandbox dashboard and confirmed that the Security/Salt Passphrase has now been created and saved in the sandbox merchant account.
- Merchant ID and Merchant Key are visible to the owner in the sandbox dashboard. Their values and the passphrase have not been shared in chat, written to GitHub, or stored in project documentation.
- These credentials have not yet been added to Supabase Edge Function secrets. The available connected Supabase tools do not expose a secrets-management action, so the owner must add them through the Supabase Dashboard's Edge Function Secrets settings.
- Keep `PAYFAST_MODE=sandbox`. Do not enable live payments. After credentials are added, verify the configuration readiness indicator and complete sandbox payment testing.
- ITN notification URL: `https://xsrmtokfrqdyfbrqljsm.supabase.co/functions/v1/payfast-itn`.

## PayFast setup checkpoint (12 November 2026, latest)

- Owner confirms the Supabase Edge Functions area is open and has authorised saving the current project progress.
- PayFast Sandbox dashboard access is available; sandbox Merchant ID and Merchant Key are visible to the owner; sandbox Security/Salt Passphrase has been created and saved in PayFast.
- Next manual step: add the seven `PAYFAST_*` values in Supabase Dashboard → Edge Functions → Secrets. Do not paste credentials into ChatGPT, GitHub, or public website files.
- Required values: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE=sandbox`, `PAYFAST_RETURN_URL=https://geelwolf8448-stack.github.io/takeaways/`, `PAYFAST_CANCEL_URL=https://geelwolf8448-stack.github.io/takeaways/`, and `PAYFAST_NOTIFY_URL=https://xsrmtokfrqdyfbrqljsm.supabase.co/functions/v1/payfast-itn`.
- Credentials have NOT been confirmed as saved in Supabase yet. The configuration readiness check and sandbox payment tests remain pending.
- Live payments remain disabled. No food-order payment routing, split payments, or platform commission deductions are to be enabled.

## PayFast Supabase secrets entry checkpoint (12 November 2026, latest)

- Owner reports entering all seven required PayFast Sandbox secret entries in the Supabase Dashboard → Edge Functions → Secrets form.
- Entries are: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`, `PAYFAST_RETURN_URL`, `PAYFAST_CANCEL_URL`, and `PAYFAST_NOTIFY_URL`.
- The owner has not yet confirmed that the final page-level **Save** action was clicked successfully or that Supabase displayed a saved confirmation. Treat the entries as entered but not yet verified/persisted.
- The assistant cannot operate the owner's open Supabase browser page or save the secret values directly. The owner must click the final **Save** button in Supabase and confirm success. Never request the secret values in chat.
- After save confirmation, check `payment_config_status` from the authenticated admin billing panel/function. Then review the PayFast ITN implementation and current official PayFast source-IP/signature requirements before any sandbox end-to-end payment test.
- Keep `PAYFAST_MODE=sandbox`. Live payments remain disabled; do not enable platform checkout or recurring charges until the implementation is reviewed and sandbox-tested.

