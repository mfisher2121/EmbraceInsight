# MBRACE INSIGHT site changelog

The source history of the MBRACE INSIGHT site as published through ChatGPT Sites. Every published version was committed as "Update Site source", so this file records what each one changed. Tags mark the versions confirmed against the Sites console and the release notes.

Live site: https://mbraceinsight.com (custom domain pending DNS verification on Nov 7, 2026) · Sites address: https://mbrace-insight.mfisher23013.chatgpt.site

| Commit | Tag | Published | What changed |
| --- | --- | --- | --- |
| `d046cf1` | `v7` | Nov 7, 2026 07:58 | **Live.** The mobile hero headline now wraps (no sideways scroll at phone width). The sign-up FAQ now says email delivery comes in a later release; the old "private preview" wording is gone. Editorial-policy and privacy intros now describe the Montgomery County home services audience. |
| `685f464` | `v6` | Nov 7, 2026 07:52 | **Montgomery County edition.** New homepage for Montgomery County home service operators, starting with HVAC. Adds the 20814 BEPS briefing (`/montgomery-county/20814/beps-briefing/`), the protected 20814 BEPS Data Sheet, the Nov 7 county evidence in `evidence/20814/`, a figures script (`scripts/briefing-20814.mjs`) and a figures test (`scripts/test-briefing.mjs`). Canonical URLs move to `https://mbraceinsight.com`. Indexing is on for four launch pages; the older resident guides stay noindex and out of the sitemap. Sign-up acknowledgment wording updated in the Worker. |
| `3782b73` | `v5` | Oct 29, 2026 16:46 | Resident edition, final ("Heat pumps. Rebates. DMV, explained."). Source-register content (`content/sources.json`), the resource library, and updated Semantic Gate requirement sets. This is the design the county edition keeps. |
| `8fe59e1` | — | Oct 29, 2026 16:34 | Small fixes to styles, the Worker build and the capture Worker. |
| `1786e61` | — | Oct 29, 2026 16:29 | Adds the Worker (`worker/index.js`) with email capture, consent-separated downloads, preferences and owner export, plus the D1 schema (`drizzle/`) and HVAC Semantic Gate requirements. |
| `bf944fc` | — | Oct 29, 2026 15:55 | Homepage and app revisions; adds `product-build-contract.json`. |
| `19e023a` | — | Oct 29, 2026 15:41 | Adds the Semantic Gate preflight (`scripts/semantic-preflight.py`, `semantic-gate/`) and field-note content. |
| `d1e9995` | — | Oct 29, 2026 15:28 | First source: static homepage, styles and fonts. |

## Branches

- `main`: the published Sites history above.
- `vercel-supabase`: runs the site on Vercel, with signups stored in Supabase Postgres (see `VERCEL.md`). Adds `api/worker.js`, `lib/d1-postgres.mjs`, `db/supabase/0001_init.sql`, `vercel.json` and `scripts/test-vercel.mjs`. The one Worker change is the rate-limit upsert (`hits = rate_limits.hits + 1`), which Postgres requires and SQLite also accepts. Owner routes are not served on Vercel.
- `reference/claude-county-edition`: the local county edition that v6 was built from (Claude, Nov 7), committed on top of v5 for comparison. It is not deployed. Compare with `git diff v5 reference/claude-county-edition` or `git diff reference/claude-county-edition v6`.

## Not in this repository

Subscriber and contact records, Sites runtime secrets (`ADMIN_EMAIL`, `SITE_ORIGIN`) and build output (`dist/`) are excluded. The county CSVs in `evidence/20814/` are public records.

## Recording future updates

Use a descriptive commit message for each change, then tag each Sites publish with the next version (`v8`, `v9`, …) and add a row above.
