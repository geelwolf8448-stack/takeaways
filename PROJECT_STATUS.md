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
- Service-worker cache name bumped to `takeaways-tonight-v34-payment-method-choices`.

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
