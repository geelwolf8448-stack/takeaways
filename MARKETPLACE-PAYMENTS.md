# Takeaways Tonight? — 15% marketplace commission build

## Commercial rule selected
- Platform commission: **15% of the food subtotal on each completed order**.
- Delivery charges are excluded from the commission base in this first design.
- A rejected, cancelled or fully refunded order earns no commission.
- Partial refunds require a proportional commission adjustment.
- Commission is recorded in the ledger only when the order reaches `completed`.
- Example: R200 food subtotal = R30 gross platform commission, before payment-provider fees, refunds, operating costs and tax.

## Intended customer and restaurant journey
1. Customer chooses items from one restaurant only and checks out in ZAR.
2. Server creates a pending order using trusted menu prices.
3. Customer is sent to the approved payment provider to pay securely.
4. A verified provider notification updates the payment status; a browser return page is never proof of payment.
5. Restaurant staff sign in and accept or reject the paid order.
6. Restaurant updates preparing → ready → completed.
7. On completed status, the database records the 15% commission.
8. Customer sees order status and receipt; platform owner sees sales, commission, refunds and settlement reports.

## Payment-provider design decision
PayFast documentation describes Split Payments and says a split transaction can allocate a percentage to one secondary merchant account. It also says the primary account must enable the feature and the custom integration uses merchant credentials. A split transaction supports only one receiving merchant. See:
- https://support.payfast.help/portal/en/kb/articles/can-i-split-a-payment-20-9-2022
- https://support.payfast.help/portal/en/kb/articles/how-do-i-enable-split-payments-20-9-2022
- https://developers.payfast.co.za/docs#splitpayments

**Important architecture constraint:** one restaurant per basket/order. The platform would be the primary PayFast merchant and the restaurant the secondary split merchant. If the restaurant receives 85% as the secondary split, the platform retains the remaining 15% before provider fees (subject to PayFast's exact split semantics and written approval). This split happens at payment processing time; it does not mean the provider waits until an order is completed to release the commission. The provider must confirm the rejection/refund/reversal and settlement model in writing before live use.

## What is not live
This repository does not yet have:
- a configured Supabase project or production database;
- customer/restaurant authentication and role provisioning;
- Supabase Edge Functions for order creation, payment initiation, ITN verification, status transitions or refunds;
- approved PayFast marketplace/split-payment merchant configuration;
- merchant verification and restaurant payout onboarding;
- a production owner dashboard, automated salary/withdrawal, or reconciliation;
- legal approval for collecting and splitting customer funds.

The SQL file `supabase/marketplace-schema.sql` is a foundation only. It must be reviewed and tested in a separate Supabase project before production. It intentionally grants no browser write access to orders, payments or commission records.

## Credentials and launch safety
- Never put PayFast merchant keys, passphrases, Supabase service_role keys, or bank credentials in GitHub or browser JavaScript.
- Store secrets only in Supabase Edge Function secrets.
- Use PayFast Sandbox first; test payment success, failed payment, duplicate ITN, restaurant rejection, full refund, partial refund, payout reconciliation and commission math.
- Do not accept real customer payments until provider approval, refund handling, security testing, restaurant agreements, privacy notices, and South African legal/accounting review are complete.
- Do not describe earnings as a guaranteed salary. The owner dashboard can show earned commission; withdrawals are subject to actual settlements, fees, refunds and tax.
