# Takeaways Tonight? — launch setup

The live site is a static GitHub Pages website. It can display the directory, but GitHub Pages alone cannot securely receive shared submissions or provide owner accounts. The SQL in `supabase/schema.sql` prepares a Supabase database with private partner applications and a separate public directory.

## Current state
- Website preview: https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/
- The three sample restaurants are demos, not real businesses.
- Partner applications are currently downloadable drafts; they are not sent to the team or published.
- No payment gateway, delivery dispatch, customer accounts, or restaurant logins are active.

## Connect the shared database (free-tier starting point)
1. Create a Supabase account and a new project at https://supabase.com/.
2. In the project, open **SQL Editor**, create a query, paste the complete contents of `supabase/schema.sql`, and run it.
3. Open **Project Settings → API**. Copy the Project URL and the **anon/public** key only.
4. Keep the **service_role** key private. Never send it in chat, email, screenshots, or website code.
5. The website still needs its database integration configured with the Project URL and anon/public key before applications can be submitted online. Do not announce public onboarding until this is tested.

## Approving a restaurant
Review the application, contact the owner, verify permission, WhatsApp number, menu and prices, then create/update its row in `restaurants` and set `is_published = true`. The public site should only display rows where `is_published` is true.

## Before taking real orders
- Confirm every restaurant's written permission and current menu/prices.
- Test WhatsApp order messages with the owner.
- Explain that WhatsApp orders are requests until the restaurant confirms stock, delivery/collection, final price and payment.
- Add spam protection and an admin workflow before promoting the application form widely.
- Add a privacy notice and terms before collecting customer or restaurant information at scale.

## Suggested growth roadmap
1. Shared database and secure application intake.
2. Admin review and published restaurant directory.
3. Restaurant owner accounts and menu editing.
4. Customer favourites, ratings/moderation and campaign submissions.
5. Order status, delivery options and payment integration only after local restaurant partnerships are established.

This project is an independent directory, not a restaurant, payment processor, or delivery company. Database provider free-tier limits and terms may change.
