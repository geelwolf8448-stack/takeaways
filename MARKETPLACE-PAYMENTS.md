# Takeaways Tonight? — order and payment status

## Current operating model

The live customer order flow is a request-and-WhatsApp service:

- Customers browse published restaurant listings and menus.
- Customers submit an order request through the app.
- The restaurant receives the request and confirms availability, final prices, delivery or collection arrangements and timing directly with the customer.
- Customers pay the restaurant directly using the payment method agreed with that restaurant.
- Takeaways Tonight does not collect customer food-order payments or deduct any percentage from restaurant food sales.
- Restaurants retain 100% of their food-sale revenue. There are no order-based platform deductions.

The admin marketplace overview reports recent order counts, completed orders and order value only. It does not calculate or display deductions from restaurant sales.

## Payment integrations

PayFast checkout, payment notifications (ITN), split settlement, automated refunds and restaurant payouts are not active in this project. No PayFast merchant credentials have been supplied or stored.

Do not enable online payments until the payment provider has approved the merchant arrangement and the complete checkout, verification, cancellation, refund, settlement and reconciliation processes have been implemented and tested. Any future change to the direct-payment model must be reviewed, disclosed and agreed in writing before activation.

## Security and launch rules

- Never place PayFast merchant keys, passphrases, Supabase service-role keys or bank credentials in GitHub or browser JavaScript.
- Use Supabase Edge Function secrets for server-only credentials.
- Browser clients have no direct write access to orders, order items, payments or refunds.
- All privileged order actions must validate the signed-in user and restaurant membership on the server.
- Never treat a browser return page as proof of payment; only a verified provider notification can confirm a provider payment.
- Do not accept live customer payments through the platform until provider approval, security testing, refund handling, privacy notices and South African legal/accounting review are complete.

## Current links

- Customer portal: https://geelwolf8448-stack.github.io/takeaways/account.html
- Restaurant portal: https://geelwolf8448-stack.github.io/takeaways/restaurant-portal.html
- Administrator portal: https://geelwolf8448-stack.github.io/takeaways/admin.html
- Public website: https://geelwolf8448-stack.github.io/takeaways/
