# Takeaways Tonight? — simple launch plan

**Live preview:** https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/

## Important: no Supabase setup is needed right now

We are changing the order of work to keep the launch simple and avoid unnecessary setup. The website preview can run on GitHub Pages without Supabase. Leave the Supabase dashboard alone for now. Do not create database tables or copy API keys at this stage.

## What works in the current preview

- Mobile-friendly South Coast food directory preview.
- Search and category filters.
- Demonstration menus and basket.
- WhatsApp order-request flow for a real restaurant only after its verified number and menu are added.
- A restaurant application form that prepares a downloadable draft on the device.

## What is not live yet

- The three visible restaurants are demo listings, not actual partners.
- Partner applications are not submitted to the platform.
- There are no restaurant logins, shared admin dashboard, online payments or delivery dispatch.
- No restaurant should be shown as a partner until it has given permission and its details have been checked.

## First real-world launch steps

1. Approach restaurants across Hibberdene, Pumula, Umzumbe, Umtentweni, Port Shepstone, Shelly Beach, Uvongo, Margate, Ramsgate, Southbroom and Port Edward.
2. Ask permission to display their business name, current menu, prices and WhatsApp ordering number.
3. Verify the WhatsApp number and test an order request with the owner.
4. Add only confirmed restaurant details to the website.
5. Start with collection and direct restaurant confirmation. Treat every WhatsApp message as an order request until the restaurant confirms it.
6. After the first partners and real applications exist, connect Supabase for shared applications and an approved public directory.

## Future database setup (not required today)

The repository includes `supabase/schema.sql` and `config.js` as a later foundation. When we are ready, we can connect them. Never place a database password or Supabase `service_role` key in website code or share either in chat. Only a Supabase anon/public key is intended for browser use, with correct Row Level Security policies.

## Before commercial launch

- Confirm written permission from each restaurant.
- Confirm menus, prices, opening hours and fulfilment arrangements.
- Add accurate operator contact details to the privacy notice and terms.
- Get appropriate legal/privacy review.
- Do not collect or process customer payments until a compliant payment setup has been designed and tested.
