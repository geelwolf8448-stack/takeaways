# Takeaways Tonight? — pre-launch compliance and operating checklist

This is an operational checklist, not a legal opinion or a licence. The operator must confirm the facts and obtain South African legal/accounting advice where appropriate before trading.

## Business identity and website disclosures
- Decide who legally operates Takeaways Tonight? (individual, registered company or other entity).
- Add the operator's full legal name, legal status, physical/business address, telephone number and monitored email address to the website.
- If operated by a company, add its registration number, office-bearer details and place of registration.
- Add the address for service of legal documents and clear customer/restaurant support details.
- Ensure the privacy notice and terms identify the real operator and describe the actual service, not planned features.
- ECTA section 43 requires prescribed supplier identity and contact information to be made available for relevant electronic transactions. Have a South African lawyer confirm how it applies to this directory and its paid restaurant listing service.

## POPIA and PAIA
- Identify and register the Information Officer with the Information Regulator where required.
- Prepare and maintain the PAIA manual and records of processing operations as applicable.
- Document what personal information is collected, why it is needed, who receives it, retention periods, security controls and how people can exercise their rights.
- Obtain appropriate permission before publishing a restaurant's contact details, menu, photographs, logo or other supplied material.
- Use written operator agreements with service providers that process personal information.
- Restrict access to private restaurant applications and customer enquiries; never expose private submissions in public database queries.
- Create a process for access, correction, objection and deletion requests, and for responding to security incidents.
- Do not collect card numbers, CVVs, banking passwords, OTPs or unnecessary identity documents.

## Customer orders and payment — mandatory platform rule
- Takeaways Tonight? is a discovery and order-request service only.
- A basket or WhatsApp message is an order request, not restaurant acceptance.
- The restaurant confirms availability, final price, delivery/collection arrangements and timing.
- Customers pay the restaurant directly using payment details verified with that restaurant.
- Takeaways Tonight? must not collect, process, hold, transfer or refund customer food-order funds.
- Takeaways Tonight? does not charge restaurants a commission on food orders.
- Do not display an order as accepted or paid until the restaurant confirms the relevant status directly.
- Restaurant subscriptions/setup fees are separate platform-to-business payments. Do not activate recurring billing until the subscription contract, invoices, cancellation/refund rules and a compliant payment method are ready.

## Restaurant onboarding
- Verify the restaurant's identity and that the person applying is authorised.
- Obtain written permission to publish the business listing, menu, prices, photos and contact number.
- Verify the WhatsApp number with the owner and test the order-request message.
- Record who is responsible for menu accuracy, allergens, pricing, food preparation, fulfilment, customer complaints and refunds.
- Obtain written agreement for the Premium listing price, R1,000 monthly subscription, once-off R250 setup fee, 7-day introductory trial, billing start date and cancellation process.
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
