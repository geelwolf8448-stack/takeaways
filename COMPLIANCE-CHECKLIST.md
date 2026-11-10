# Takeaways Tonight? — pre-launch compliance and operating checklist

This is an operational checklist, not a legal opinion or a licence. The operator must confirm the facts and obtain South African legal/accounting advice where appropriate before trading.

## Business identity and website disclosures
- [x] Business structure confirmed: individual sole proprietor trading as Takeaways Tonight?.
- [x] Proprietor's full legal name confirmed: Antione Els (individual sole proprietor trading as Takeaways Tonight?).
- Add the operator's full legal name, legal status, physical/business address, telephone number and monitored email address to the website.
- If operated by a company, add its registration number, office-bearer details and place of registration. Not applicable to the current sole-proprietor structure unless the structure changes.
- Add the address for service of legal documents and clear customer/restaurant support details.
- Ensure the privacy notice and terms identify the real operator and describe the actual service, not planned features.
- ECTA section 43 requires prescribed supplier identity and contact information to be made available for relevant electronic transactions. Have a South African lawyer confirm how it applies to this directory and its paid restaurant listing service.

## POPIA and PAIA
- [ ] Register the sole proprietor, Antione Els, as the proposed Information Officer with the Information Regulator before assuming the duties; retain registration confirmation.
- Prepare and maintain the PAIA manual and records of processing operations as applicable.
- Document what personal information is collected, why it is needed, who receives it, retention periods, security controls and how people can exercise their rights.
- Obtain appropriate permission before publishing a restaurant's contact details, menu, photographs, logo or other supplied material.
- Use written operator agreements with service providers that process personal information.
- Restrict access to private restaurant applications and customer enquiries; never expose private submissions in public database queries.
- Create a process for access, correction, objection and deletion requests, and for responding to security incidents.
- Do not collect card numbers, CVVs, banking passwords, OTPs or unnecessary identity documents.

## Customer orders and payment — current operating rule
- The current platform records customer order requests and sends a WhatsApp notification to the restaurant.
- A submitted order is not restaurant acceptance. The restaurant confirms availability, final price, delivery/collection arrangements and timing.
- Customers pay the restaurant directly using payment details verified with that restaurant. Takeaways Tonight? does not currently collect, hold, transfer or refund customer food-order funds.
- The restaurant portal can record that direct payment was received. Do not mark an order completed until the restaurant has confirmed payment.
- Takeaways Tonight does not deduct any percentage or order-based fee from restaurant food sales. Restaurants retain 100% of their food-sale revenue. Any future change must be disclosed in advance and agreed in writing before implementation.
- PayFast checkout and split settlement are not live. Do not activate online payments until PayFast approves the merchant arrangement and checkout, verification, refund and settlement processes are implemented and tested.
- Do not display an order as paid unless the restaurant confirms direct payment or a future verified payment-provider notification confirms it.
- Restaurant subscriptions/setup fees are separate platform-to-business payments. Do not activate recurring billing until the subscription contract, invoices, cancellation/refund rules and a compliant payment method are ready.

## Restaurant onboarding
- Verify the restaurant's identity and that the person applying is authorised.
- Obtain written permission to publish the business listing, menu, prices, photos and contact number.
- Verify the WhatsApp number with the owner and test the order-request message.
- Record who is responsible for menu accuracy, allergens, pricing, food preparation, fulfilment, customer complaints and refunds. Restaurant owners must notify the platform administrator of specials, menu additions/removals, price changes, opening-hour changes and delivery changes; the administrator publishes approved updates centrally.
- Obtain written agreement for the Premium listing price, R1,000 monthly subscription, once-off R250 setup fee, 14-day introductory trial, billing start date and cancellation process.
- Do not advertise a business as a partner until it has approved its listing.

## Technical release gates
- Keep Supabase service-role keys, database passwords and payment secrets out of browser code and GitHub.
- Enable Row Level Security on every table containing private or personal information; test policies using separate anonymous, customer, restaurant-owner and administrator accounts.
- Ensure restaurant owners can only access their own records and orders.
- Use server-side functions for privileged actions; never trust a browser-only admin flag.
- Test mobile layout, order-request content, invalid numbers, empty baskets, stale prices, failed network requests and accessibility.
- Add backups, monitoring, incident response and a way to disable compromised accounts.
- Test the live production URL after each deployment and verify that demo records cannot receive orders.

## Before describing the platform as fully operational
- Replace all demo listings with approved partner listings or remove them.
- Publish real operator contact and legal identity details.
- Complete POPIA/PAIA documentation and obtain legal review of the privacy notice, terms and restaurant agreement.
- Confirm tax, business registration and accounting treatment with a qualified South African adviser.
- Confirm whether any additional permissions or licences apply to the actual activities the operator will perform. A website or code deployment does not itself grant a business licence.
- Complete end-to-end testing with at least one restaurant and written owner approval.

## Additional work completed 5 November 2026
- Native Android Firebase push-notification integration code added; Firebase project configuration and real-device testing remain outstanding.
- Removed the planned order-percentage calculation, admin reporting and related database records from the active platform.
- PAIA manual, POPIA processing/retention register and incident-response plan drafts added; legal review and completion remain outstanding.
- Signed Android release workflow requires Firebase client configuration and the private Android signing secrets. API 36 targeting is configured by the release script; verify the generated bundle before submission.

- [ ] Complete the Google Play Data safety form against the final signed build; the working worksheet is `PLAY-STORE-DATA-SAFETY-WORKSHEET.md`.
