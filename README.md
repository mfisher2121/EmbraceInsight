# Embrace Insight — DMV resident education

The user-confirmed audience is DMV residents. Embrace Insight explains heat pumps, electrification, rebates, and BEPS through source-checked local context. The SEO agency will have a separate website. Semantic Gate remains this publication’s internal release standard; it is no longer the homepage service offer.

The homepage leads to the DMV Rebate Roadmap, four resident resources, and a dedicated newsletter form. Existing durable capture, separate consent, preferences, and owner exports remain intact. Prior professional/SEO resources stay available for historical links but are not promoted in the resident journey.

Newsletter confirmation and delivery still need a provider. No automatic emails are sent. Dated briefing content is editorial, not an automatic live status feed. No household eligibility, compliance determination, government affiliation, or guaranteed savings is claimed.

## Source and build

`public/` is authored HTML/browser source. `content/resources.json` is the resource catalog; add a matching Markdown file in `assets-downloads/` for every catalog item. `content/field-notes.json` controls resident guides and policy pages; `content/sources.json` records official sources and dates checked. `worker/index.js` is the server-side request handler. The supplied Worker ESM contract is preserved; build output embeds browser assets and protected downloads in one module.

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

The Site remains owner-private; both custom domains and DNS are untouched. The resident audience and topics are confirmed. DMV heat pump rebates is the working query; the exact primary query is not yet confirmed. Earlier query requirement files are historical. Freeze requirements and perform a fresh anonymous live six-gate review on the final URL before claiming eligibility.

The proposed domain split is Embrace Insight for regional reporting/context and DMVHeatPumps.com for practical homeowner heat pump education. This task edits only the existing Embrace Insight Site and does not verify the companion domain.

## Asset provenance

Four resident Markdown assets were authored as editable educational drafts, with official agency links. content/sources.json records the current evidence map. Archived earlier preparation assets remain in the catalog to preserve prior downloads. No subscriber records are included in source. Self-hosted fonts retain their licenses.
