# Takeaways Tonight? 🍔

A South Coast, KwaZulu-Natal food discovery directory concept, starting with Margate, Shelly Beach, Uvongo and Port Shepstone.

**Live preview:** https://geelwolf8448-stack.github.io/TAKEAWAYS-TONIGHT-/

## What is in this repository
- `index.html` — responsive food finder preview, search/filter UI, sample menu cards, basket and WhatsApp order-request flow for verified restaurant entries, plus a partner application draft.
- `manifest.webmanifest`, `icon.svg`, `service-worker.js` — installable/offline-capable web app foundation.
- `privacy.html`, `terms.html` — preliminary policy drafts. They are not legal advice and need the operator's real contact details and legal review before commercial launch.
- `supabase/schema.sql` — starting database schema for private partner applications and a separately published restaurant directory.
- `LAUNCH-SETUP.md` — setup notes for the shared database.
- `robots.txt`, `sitemap.xml` — basic search-engine discovery files.

## Important launch status
This is still a preview. The three visible restaurant cards are demo listings, not real businesses. Partner forms currently download an application summary; they do not submit it to the platform. A real shared database, administrator review process, restaurant owner accounts and verified partners are not yet connected.

No payment processing, delivery dispatch or customer accounts are active. WhatsApp messages, when enabled for a verified restaurant, are order requests; the restaurant must confirm availability, price and fulfilment.

## Next technical milestones
1. Create a Supabase project and run `supabase/schema.sql`.
2. Configure the public project URL and anon key in a safe client configuration (never expose a service-role key).
3. Implement and test shared application submission and public approved-listing reads.
4. Add an authenticated administrator review workflow and restaurant owner access.
5. Verify partner permissions, menus, pricing, WhatsApp numbers, privacy requirements and order flows before public marketing.

## Hosting
The project is designed for GitHub Pages static hosting. Static hosting alone cannot securely accept shared form submissions, authenticate restaurant owners, or store private application records.
