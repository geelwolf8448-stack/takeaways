# Takeaways Tonight? — marketplace orders, commission and PayFast status

## Live implementation as at 5 November 2026

The linked Supabase project is configured and the following is now deployed:

- Customer profiles are created automatically when an Auth account is created.
- Customers can sign in using a one-time email link, update their contact details and view their private order history.
- Restaurant owners can request access to an already approved restaurant. The platform administrator must review the request before membership is granted.
- Approved restaurant owners/managers can update their menu and manage orders for their own restaurant.
- Customer orders are created through the authenticated `marketplace-api` Edge Function.
- The server reads the restaurant's current published menu and calculates the order prices itself. Browser-supplied prices are not trusted.
- Orders are restricted to one restaurant each. The customer is redirected to the restaurant's WhatsApp after the order is saved.
- The restaurant confirms availability, delivery fee, final total and payment directly with the customer.
- Restaurant staff can accept/reject, prepare, mark ready, confirm direct payment and complete orders. Completion is blocked until the restaurant confirms it has been paid.
- The commission ledger records 15% of the food subtotal only after completion. Delivery charges are excluded.

The live customer order method is still **pay the restaurant directly**. Takeaways Tonight? does not currently collect customer food-order money.

## Proposed commercial commission

The proposed marketplace commission is **15% of the food subtotal on completed orders**.

Example: R200 food subtotal × 15% = R30 gross commission, before payment-provider fees, refunds, operating costs and tax.

The current ledger is an internal record only. It does not collect the R30, debit a restaurant, issue an invoice or transfer money. The commercial terms must be agreed in writing with each restaurant and reviewed by a South African accountant/lawyer before any collection or invoicing is activated.

A rejected, cancelled or unpaid order earns no commission. Refunds and partial refunds still need an approved operational process and ledger adjustments before a paid checkout is launched.

## PayFast — not connected yet

PayFast has not been configured in this project. No PayFast merchant ID, merchant key, passphrase or split-payment credentials have been supplied or stored. There is no active PayFast checkout, ITN webhook, automated refund or settlement process.

The intended integration requires:

1. PayFast's current Split Payments guidance describes the restaurant as the primary merchant and the platform as the secondary split account: the platform supplies its Merchant ID and Merchant Key to the primary account holder, and both accounts must enable Split Payments. Confirm eligibility and this account arrangement directly with PayFast before activation.
2. A confirmed settlement and refund model, including what happens when a restaurant rejects an order or a customer receives a full/partial refund.
3. A verified PayFast merchant account for every restaurant that receives a split payout. Each restaurant (primary merchant) must enable Split Payments and allow the platform's Merchant ID as the secondary account.
4. A clear commercial decision on whether the 15% is collected at payment time or invoiced after a completed order. These are not the same cash-flow model.
5. PayFast Sandbox credentials and tests for successful payment, failed payment, duplicate ITN, invalid signature, amount mismatch, restaurant rejection, full refund, partial refund and reconciliation.
6. Production credentials stored only as Supabase Edge Function secrets, never in GitHub, browser code or customer devices.
7. Signed restaurant agreements, updated customer terms/privacy notice and South African legal/accounting review.

### Split-payment architecture constraint

The commercial proposal is to allocate 85% of the food subtotal to the restaurant's primary PayFast account and 15% to Takeaways Tonight?'s secondary split account. PayFast's published guidance describes the platform as the secondary account and requires both account holders to enable Split Payments. The basket must remain limited to one restaurant because each transaction can split to only one secondary receiving merchant. PayFast confirms that the primary restaurant merchant enables the split, the platform is the secondary account, and both account holders must take action. The current one-restaurant-per-order database design already supports this constraint.

A provider split at checkout distributes money at payment time; it does not wait for an order to be completed. Therefore, it must not be enabled until PayFast confirms the exact account structure, settlement, cancellation and refund rules and the business chooses a consistent commission-recognition policy.

Official provider references to verify during implementation:
- https://support.payfast.help/portal/en/kb/articles/can-i-split-a-payment-20-9-2022
- https://support.payfast.help/portal/en/kb/articles/how-do-i-enable-split-payments-20-9-2022
- https://support.payfast.help/portal/en/kb/articles/how-do-i-integrate-split-payments-into-my-platform
- https://support.payfast.help/portal/en/kb/articles/can-i-split-a-payment-with-numerous-accounts-19-8-2020
- https://developers.payfast.co.za/docs#splitpayments

## Security and launch rules

- Never place PayFast merchant keys, passphrases, Supabase service-role keys or bank credentials in GitHub or browser JavaScript.
- Use Supabase Edge Function secrets for server-only credentials.
- Browser clients have no direct write access to orders, order items, payments, refunds or commission records.
- All privileged order actions must validate the signed-in user and restaurant membership on the server.
- Never treat a browser return page as proof of payment; only a verified provider notification can confirm a payment.
- Do not accept live customer payments until PayFast approval, security testing, restaurant agreements, refund handling, privacy notices and South African legal/accounting review are complete.
- Do not describe commission as guaranteed income. Any amount shown is subject to actual completed orders, refunds, provider fees, operating costs and tax.

## Current links

- Customer portal: https://geelwolf8448-stack.github.io/takeaways/account.html
- Restaurant portal: https://geelwolf8448-stack.github.io/takeaways/restaurant-portal.html
- Administrator portal: https://geelwolf8448-stack.github.io/takeaways/admin.html
- Public website: https://geelwolf8448-stack.github.io/takeaways/
