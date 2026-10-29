# MBRACE INSIGHT — page clearance and email-list growth

The user-selected direction is the six-gate review / clearance-engine offer, supported by resource lead magnets and newsletter signup. **Semantic Gate** and **Clearance Engine** are provisional product names. The Four-ZIP Worksheet is a supporting HVAC resource, not the primary offer.

## Current experience

- A six-gate overview and an honest review-request form for one public URL and one query.
- Four resource lead magnets with email capture and immediate protected downloads.
- A separate newsletter CTA; optional newsletter choices on resource/review forms start unchecked.
- Real Sites D1 storage for deduplicated contacts and distinct request/consent/source events.
- Private preference links and explicit withdrawal. Opening a link does not change a subscription.
- Owner-only contact, newsletter-request, and review-queue CSV exports at `/admin`.

The review form queues a request; it does not run an automated assessment or issue a simulated PASS/FAIL. Newsletter requests remain pending email confirmation. No newsletter platform is connected, and no emails are sent automatically by this preview.

## Source and build

`public/` is authored HTML/browser source. `content/resources.json` is the resource catalog; add a matching Markdown file in `assets-downloads/` for every catalog item. `content/field-notes.json` controls editorial pages, the privacy draft, and sample format. `worker/index.js` is the server-side request handler. The supplied Worker ESM contract is preserved; build output embeds browser assets and protected downloads in one module.

- `npm run build` generates initial-HTML resource pages, sitemap, and `dist/server/index.js`.
- `npm test` runs capture integration checks with SQLite using the same Worker handler.
- `python3 scripts/semantic-preflight.py` checks source requirements; it is not a public certification.
- `npm run dev` serves the built Worker on http://127.0.0.1:4173 using a separate local SQLite database in the task's work folder.
- `/__dev/owner` enables a local-only owner simulation. That route exists only in the development server and is absent from production.

For browser-source edits, rebuild and restart the preview. No live subscriber data belongs in source or generated archives.

## Storage and configuration

The hosting manifest preserves the Sites project ID and declares D1 binding `DB`. Drizzle migrations are generated from `db/schema.ts` with `npm run db:generate`; applied migrations and metadata are immutable. The publisher applies hosted migrations. Request handlers never create or alter tables.

Runtime keys `ADMIN_EMAIL` and `SITE_ORIGIN` are configured through Sites, not in source. Owner exports require Sites-supplied user ID and owner email. Captures use parameterized queries, bounded inputs, origin checks, a honeypot, and a hashed rate marker. Access tokens are stored as hashes. Newsletter/resource consent records remain distinct. Test addresses ending in .invalid are excluded from real-list exports; no real messages are sent in tests.

Exports contain at most 5,000 rows and keep newsletter status explicit. Pending confirmation is not verified ownership or permission for an unsolicited blast.

## Launch status

The site remains owner-private. mbraceinsight.com, DNS, and its existing deployment are unchanged. Audience and newsletter-platform clarification was requested; current copy provisionally serves website owners/SEO agencies while retaining HVAC resources.

The former confirmed HVAC query is preserved in semantic-gate/hvac-requirements-v1.json. The revised working query, website rank eligibility check, is not user-confirmed. Semantic Gate remains a separate requirement for this website's public launch: fresh query-specific requirements, anonymous access/indexing checks, sources, identity, and a complete six-gate result on the actual public URL.

Before public signup or sending: select the delivery provider, verify confirmation/delivery/unsubscribe integration, finalize privacy/retention terms and editorial content, and approve the final product/audience/query decisions. The private database can capture requests now; no sending or automated certification is claimed.

## Asset provenance

Three new preparation assets summarize the user's local Semantic Gate v1.0 protocol and link to primary Google Search documentation. The Four-ZIP Worksheet comes from the user's existing HVAC newsletter launch kit. All are editable drafts. Previous illustrative rooftop imagery and self-hosted font files are retained with their licenses; the gate-focused hero uses native HTML/CSS rather than a project photograph.
