# Takeaways Tonight? 🍔

A South Coast, KwaZulu-Natal food discovery directory concept, starting with Margate, Shelly Beach, Uvongo and Port Shepstone.

**Live preview:** https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/

## Current launch approach

We are deliberately starting with a simple, low-cost directory and WhatsApp order-request model. **Supabase is optional for the first preview and is not required to view the website.** Do not spend time configuring a database until the basic directory and first restaurant partnerships are ready.

## What's in this repository

- `index.html` — responsive food finder, search/filter UI, sample menu cards, basket and WhatsApp order-request flow for verified restaurant entries, plus a partner application draft.
- `manifest.webmanifest`, `icon.svg`, `service-worker.js` — installable/offline-capable web app foundation.
- `privacy.html`, `terms.html` — preliminary policy drafts; add the operator's real contact details and obtain legal review before commercial launch.
- `supabase/schema.sql` and `config.js` — optional future shared-database foundation. No database setup is needed for the current preview.
- `LAUNCH-SETUP.md` — simplified launch plan.

## Important status — please read

- The three visible restaurant cards are demonstrations, **not real businesses**.
- No restaurant has been verified or onboarded through this repository yet.
- The partner form currently creates a downloadable application draft on the device. It does not send the application to the business owner or platform.
- WhatsApp order requests work only after a real restaurant has given permission and its WhatsApp number, menu and prices have been verified.
- No payment processing, delivery dispatch, customer accounts or restaurant logins are active.

Never claim a demo listing is a participating restaurant. Orders are requests until the restaurant confirms availability, final price, collection/delivery and payment.

## First launch milestones

1. Finalise the website preview and mobile experience.
2. Contact local restaurants and obtain written permission, their WhatsApp number, current menu and prices.
3. Add only verified partners to the directory.
4. Test the WhatsApp order-request flow with each partner.
5. Once there are real partners and incoming applications, connect a shared database and build a secure admin review process.
6. Consider payments and delivery integrations only after the operating model and partnerships are proven.

## Hosting

The project is hosted as a static GitHub Pages website. Static hosting is enough for the first directory preview, but it cannot securely store shared applications, provide restaurant owner accounts, or manage payments. Those features require a backend later.
