# Hosting on Vercel with Supabase

Vercel serves the pages in `public/` and runs one function, `api/worker.js`, for signups and downloads. Signups are stored in Supabase Postgres. Cloudflare keeps managing DNS.

## How it fits together

| Path | Served by |
| --- | --- |
| Every page, stylesheet, font and image | Vercel static files from `public/` |
| `POST /api/capture` (newsletter and download requests) | `api/worker.js` → `worker/index.js` |
| `GET /preferences`, `POST /api/preferences` | same |
| `GET /download/<resource>?token=…` | same |
| `/admin`, `/admin/export.csv` | **Not served.** Read signups in Supabase instead (see below). |

`worker/index.js` is the same Worker that runs on ChatGPT Sites. `lib/d1-postgres.mjs` gives it a database with the same interface as Cloudflare D1, backed by Postgres.

## 1. Supabase (once)

1. In the Supabase dashboard, pick or create the project for Embrace Insight. Region: **East US (North Virginia)** keeps it close to Vercel's default region.
2. Open **SQL Editor**, paste all of `db/supabase/0001_init.sql`, and run it. It creates four tables (`contacts`, `capture_events`, `access_tokens`, `rate_limits`) with row-level security on and no public access.
3. Open **Connect** (top of the project), choose **Transaction pooler**, and copy the connection string. It looks like `postgresql://postgres.<project-ref>:[YOUR-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`. Put your database password in place of `[YOUR-PASSWORD]`. Keep it private: it's the key to the signup list.

## 2. Vercel project settings

Import `mfisher2121/MBRACEINSIGHTNEWNEW` with:

- **Framework preset:** Other. `vercel.json` sets the install command, build command and output directory, so leave those fields on their defaults.
- **Root directory:** `./`
- **Production branch:** `main` (after this branch is merged)

Then **Settings → Environment Variables**:

| Name | Value | Environments |
| --- | --- | --- |
| `SUPABASE_DB_URL` | the transaction-pooler connection string from step 1 | Production and Preview |
| `SITE_ORIGIN` | `https://embraceinsight.net` | **Production only** |

Leave `SITE_ORIGIN` off Preview, so forms work on `*.vercel.app` preview addresses. Without `SUPABASE_DB_URL`, the pages still load, but signup returns "could not be saved" (a 503) rather than failing silently.

## 3. Check a deployment before adding the domain

On the `*.vercel.app` address:

1. The homepage, `/montgomery-county/20814/beps-briefing/` and the stylesheet load.
2. Join the newsletter with an obvious test address such as `you+test@example.invalid`. You should see "Your email is saved for future county briefings."
3. Request the 20814 BEPS Data Sheet with a test address. The download should open.
4. In Supabase **Table Editor → contacts**, the test rows appear with `is_test = 1` (any `.invalid` address is marked as a test).
5. `/admin` returns 404.

## 4. Point embraceinsight.net at Vercel

1. Vercel **Settings → Domains**: add `embraceinsight.net` and `www.embraceinsight.net`. Set `www` to redirect to `embraceinsight.net`.
2. In Cloudflare DNS, make the records match what Vercel's Domains page shows. Usually that means replacing the two Sites `A` records with Vercel's `A` record and pointing `www` at Vercel's CNAME, both **DNS only** (gray cloud).
3. Don't add the ChatGPT Sites TXT records. Don't touch the Google mail records (MX, SPF, DKIM, DMARC, google-site-verification).
4. Once Vercel shows the domain as valid, remove the custom domain from the ChatGPT Sites project so the two hosts don't compete.

## Reading signups

Supabase **Table Editor**:

- `contacts`: one row per email; `newsletter_status` is `not_requested`, `pending_confirmation` or `unsubscribed`.
- `capture_events`: every request, with the exact consent text shown at the time.

Filter out `is_test = 1`. Pending newsletter requests are not confirmed subscribers until an email provider sends a confirmation.

## Tests

```bash
npm test
```

`scripts/test-vercel.mjs` runs the full flow (vercel.json rewrites, then the function, then the Worker) against an in-process Postgres loaded with the Supabase schema.
