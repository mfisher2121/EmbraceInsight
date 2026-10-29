# MBRACE INSIGHT implementation requirements

## Current user direction

The user explicitly corrected the product focus on October 29, 2026: **the six-gate review / clearance engine is the main offer, and email capture plus newsletter signup are the main website CTAs**. The names **Semantic Gate** and **Clearance Engine** remain undecided. Use neutral page-clearance language until the user chooses. The Four-ZIP Worksheet and other assets support list growth; do not restore the assistant-selected Four-ZIP offer as the flagship.

The audience is provisionally website owners and SEO agencies, with HVAC resources retained as a specialist lane. An optional user question about audience and newsletter platform is pending. Do not claim that the broader audience, product name, newsletter title/cadence, price, or delivery provider has been approved.

## Capturing the list

Use the Sites D1 database through server-side routes. No browser-only or mailto-only fake capture. Record normalized email, request/asset/source attribution, timestamp, and consent wording/version. Resource permission and newsletter opt-in are separate. Optional newsletter checkboxes start unchecked. Newsletter-only signup requires explicit opt-in. Deduplicate contact email while preserving distinct events. Unknown email ownership stays unverified; newsletter requests remain pending confirmation until a tested delivery/confirmation workflow is connected.

A resource download can be unlocked after a successful durable write. Do not show success after a failed write. Protect subscriber records and exports using Sites-provided owner identity. Use the hashed-token preference form for withdrawal. Test addresses ending in .invalid stay marked as tests and are excluded from exports. Do not email the list, import prospects as subscribers, or claim a report has run without explicit authorization and verified functionality.

## Semantic Gate remains required for this website

Use the user's protocol at /Users/maxfisher/semantic-gate-protocol/skills/semantic-gate/SKILL.md and its references. Exactly six gates, unchanged names: G0 Crawlability, G1 Index Eligibility, G2 Query Alignment, G3 Semantic Coverage, G4 Citation Map, G5 Trust Signals. Missing evidence fails. No scores, inferred passes, ranking guarantees, or fabricated verification badges.

The old user-confirmed HVAC homepage query is historical and preserved in semantic-gate/hvac-requirements-v1.json. The revised working query in semantic-gate/requirements.json is not user-confirmed. Freeze finite requirements before evaluation and obtain a fresh evidence snapshot for the revised public page. Do not invent PAA.

The Sites project remains owner-private. Preserve that audience until explicitly changed. Do not remove noindex or robots restrictions to force a pass. Private requests return a sign-in gate to anonymous crawlers, so source checks cannot certify public eligibility. The intended mbraceinsight.com domain has not been cut over.

## Source and runtime

public/ holds authored initial-HTML pages and browser assets. content/field-notes.json and content/resources.json are canonical content inputs. assets-downloads/ holds protected resource contents. worker/index.js owns the API, private preferences, protected downloads, and owner exports. npm run build generates the embedded-asset Worker; npm test exercises the same handler against SQLite. Preserve the supplied Worker ESM default.fetch contract and Sites project identity.

D1 schema changes use db/schema.ts and npm run db:generate. Applied Drizzle migrations and metadata are immutable. Do not create tables in request handling. Store runtime configuration and secrets through Sites tools, never in source. Keep subscriber records out of unrestricted RAG and source archives.
