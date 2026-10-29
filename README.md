# MBRACE INSIGHT website concept

A responsive, buildless HTML/CSS/JavaScript website for private review through Sites. The canonical source for this draft is this folder and the Sites source repository linked by `.openai/hosting.json`.

Audience: HVAC owners and operators in the DMV. Job: help an operator scope a focused Four-ZIP Market Brief, inspect its sample format, and begin a conversation about a researched review. Local visibility and the customer journey lead; commercial qualification is a secondary educational path. Homeowner energy decisions belong to the separate Energy journey.

## Included

- One primary offer: the Four-ZIP Market Brief, with a visible sample and a simple choose / inspect / act process.
- A browser-local scope builder with optional business and website fields, four required unique ZIP codes, a starting market, service focus, and business question.
- A tailored Markdown worksheet with a research log for each ZIP code and source / date / observation / unknown / next-action fields.
- An optional mailto draft containing the entered scope. The visitor reviews and sends through their own mail app; the site does not send automatically.
- Three original field-note drafts, filters, progressive modal readers, and standalone pages with content in initial HTML.
- A compact secondary route for commercial readiness, plus primary references, responsible publisher, contact, FAQ, and privacy information.

ZIP validation checks format and uniqueness only. The builder creates a scope, not completed research. It does not fetch rankings, validate territory coverage, infer ownership, or provide live leads. Inputs are not submitted to a backend or persisted after reload.

## Editing and preview

Edit `dist/index.html`, `dist/styles.css`, and `dist/app.js`. The canonical field-note content lives in `content/field-notes.json`; run `node scripts/prepare-content.mjs` after editing it or shared page chrome to regenerate the five standalone pages, shared reader JSON, sitemap, and draft robots declaration. Run `python3 scripts/semantic-preflight.py` for source checks, then `python3 -m http.server 4173 --directory dist` for a local preview. No third-party dependencies are required. Fonts are served locally. `dist/assets/rooftop.jpg` is the optimized hero asset.

## Content and launch status

This is a private website concept. It does not modify mbraceinsight.com, its current hosting, or its DNS. All service descriptions and field notes are drafts; the commercial brief is expressly illustrative. There are no invented customers, testimonials, prices, conversion metrics, or live projects.

Before a public/domain launch, confirm the final offer, intake and consent requirements, editorial review, privacy language, and any referral relationship disclosures. The visible contact route is mfisher@mbraceinsight.com, corroborated by the existing MBRACE source's schema and contact routing; clicking it opens a visitor's mail app and does not send mail automatically. Add analytics or lead capture only with appropriate review.

## Semantic Gate is required

Semantic Gate remains the public-launch requirement. The user confirmed the homepage target query **HVAC business intelligence DMV**. The acceptance contract is in `semantic-gate/requirements.json`; `AGENTS.md` records it for continued work. Six gates, binary outcomes, no scores, no inferred passes, no ranking guarantees. The current private hosted URL returns an authentication gate to anonymous requests, and its source retains noindex and robots disallow. It cannot receive a public eligibility PASS. Source preflight results do not certify a live URL.

The implementation now includes a self canonical, query-aligned title and H1, visible publisher and business contact, Organization/Person/WebSite/WebPage schema, primary outbound sources, direct resource links, and article content in initial HTML. Public release requires deliberate alignment of canonical, metadata, sitemap, schema, and robots to the actual public origin, followed by a fresh anonymous live validation. Preserve private access until explicitly changed by the user. Do not display a certification badge without a full live PASS.

## Source context

- Existing mbraceinsight.com starter page, checked October 29, 2026: https://mbraceinsight.com/
- Related existing brand title, checked October 29, 2026: https://mbraceintelligence.com/
- Internal October 29 MBRACE Apple Ladder and Data Capture proposal supplied the intended Insight audience and separation from Energy. Its proposed operational system and products are not represented as deployed here.
- Public research reference linked in the commercial field note: https://mcbeps.org/

## Generated imagery

Created with the built-in image generation tool. `dist/assets/rooftop.jpg` is illustrative imagery, not a photographed client project. The original generated image is retained at `assets-source/rooftop-original.png`.

Prompt: "Premium editorial website hero photograph for MBRACE INSIGHT, a business intelligence brand for HVAC operators in Washington DC, Maryland and Virginia. A quiet architectural photograph of realistic silver and cream rooftop HVAC condensing units with radial fan grilles, flat roof, leafy mid-Atlantic low-rise city in the distance, slightly elevated diagonal view, soft late afternoon light, muted sage, olive and warm gray, wide landscape, no people, logos, text, or charts. Illustrative brand imagery, not a real project."

## Fonts

Manrope and IBM Plex Mono, obtained through Google Fonts and self-hosted with the site. See the included font license files in `dist/assets/`.
