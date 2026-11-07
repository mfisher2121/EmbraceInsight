// End-to-end checks for the Vercel + Supabase setup, run against an in-process
// Postgres (PGlite) loaded with db/supabase/0001_init.sql. Requests go through the
// rewrites in vercel.json, then api/worker.js, then the unchanged worker/index.js.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { d1FromExecutor, toPostgresPlaceholders } from '../lib/d1-postgres.mjs';
import { createHandler } from '../api/worker.js';

const root = path.resolve(import.meta.dirname, '..');
const pg = new PGlite();
await pg.exec(await fs.readFile(path.join(root, 'db/supabase/0001_init.sql'), 'utf8'));
const wrap = runner => ({ async query(text, params) { const r = await runner.query(text, params); return { rows: r.rows, count: r.affectedRows ?? r.rows.length }; } });
const db = d1FromExecutor({ ...wrap(pg), transaction: fn => pg.transaction(tx => fn(wrap(tx))) });
const one = async (sql, ...params) => (await pg.query(toPostgresPlaceholders(sql), params)).rows[0];

// Placeholder conversion leaves quoted text alone.
assert.equal(toPostgresPlaceholders("SELECT ? AS a, 'x?' AS b, \"c?\" FROM t WHERE d=?"), "SELECT $1 AS a, 'x?' AS b, \"c?\" FROM t WHERE d=$2");

// Row-level security is on for every table, so Supabase's public API can't read signups.
for (const table of ['contacts', 'capture_events', 'access_tokens', 'rate_limits']) {
  assert.equal((await one('SELECT relrowsecurity FROM pg_class WHERE relname=?', table)).relrowsecurity, true, `RLS off for ${table}`);
}

// Apply vercel.json rewrites the way Vercel does: matching source, destination query merged with the original.
const config = JSON.parse(await fs.readFile(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(config.outputDirectory, 'public');
assert.ok(!config.rewrites.some(r => r.source.startsWith('/admin')), 'Owner routes must not be routed on Vercel');
function rewrite(urlString) {
  const url = new URL(urlString);
  for (const { source, destination } of config.rewrites) {
    const pattern = new RegExp('^' + source.replace(/:([a-z]+)/g, '(?<$1>[^/]+)') + '$');
    const match = url.pathname.match(pattern);
    if (!match) continue;
    const dest = new URL(destination.replace(/:([a-z]+)/g, (_, k) => match.groups[k]), url.origin);
    for (const [k, v] of url.searchParams) dest.searchParams.append(k, v);
    return dest;
  }
  return null;
}
// Every form and dynamic link in the built pages has a rewrite.
for (const route of ['/api/capture', '/api/preferences', '/preferences', '/download/moco-20814-beps-data-sheet']) assert.ok(rewrite('https://x.test' + route), `No rewrite for ${route}`);
const pages = (await fs.readdir(path.join(root, 'public'), { recursive: true })).filter(f => f.endsWith('.html'));
for (const page of pages) for (const [, action] of (await fs.readFile(path.join(root, 'public', page), 'utf8')).matchAll(/action="([^"]+)"/g)) assert.ok(rewrite('https://x.test' + action), `${page} posts to ${action}, which has no rewrite`);

const origin = 'https://site.test';
const handle = createHandler({ db, siteOrigin: origin });
let ipCounter = 1;
async function call(route, { method = 'GET', body, headers = {}, ip } = {}) {
  const target = rewrite(origin + route);
  if (!target) return { status: 404, text: async () => '', json: async () => ({}) };
  return handle(new Request(target, {
    method,
    headers: { host: 'site.test', 'x-forwarded-proto': 'https', 'x-real-ip': ip || `203.0.113.${ipCounter++ % 250}`, ...(body ? { 'content-type': 'application/json', origin } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  }));
}

// Download request without newsletter opt-in.
let res = await call('/api/capture', { method: 'POST', body: { type: 'resource', asset: 'moco-20814-beps-data-sheet', email: 'Operator@example.invalid', source: 'test-vercel' } });
assert.equal(res.status, 201);
const first = await res.json();
assert.equal(first.newsletter_requested, false); assert.equal(first.email_sent, false);
let contact = await one('SELECT * FROM contacts WHERE email=?', 'operator@example.invalid');
assert.equal(contact.newsletter_status, 'not_requested'); assert.equal(contact.is_test, 1);

// Protected download: needs the token, and the token only opens its own asset.
assert.equal((await call('/download/moco-20814-beps-data-sheet')).status, 403);
res = await call(first.download_url);
assert.equal(res.status, 200);
assert.match(await res.text(), /# The 20814 BEPS Data Sheet/);
assert.equal((await call(first.download_url.replace('moco-20814-beps-data-sheet', 'evidence-worksheet'))).status, 403);

// Newsletter needs explicit opt-in; opting in leaves it pending confirmation; no duplicate contact.
assert.equal((await call('/api/capture', { method: 'POST', body: { type: 'newsletter', email: 'operator@example.invalid' } })).status, 400);
res = await call('/api/capture', { method: 'POST', body: { type: 'newsletter', email: 'operator@example.invalid', newsletter_opt_in: true, source: 'homepage-newsletter' } });
assert.equal(res.status, 201);
const second = await res.json();
assert.equal(second.newsletter_status, 'pending_confirmation');
assert.equal((await one('SELECT COUNT(*) AS n FROM contacts')).n, 1);
assert.equal((await one('SELECT newsletter_status FROM contacts WHERE email=?', 'operator@example.invalid')).newsletter_status, 'pending_confirmation');
assert.match((await one('SELECT consent_text FROM capture_events WHERE newsletter_requested=1')).consent_text, /Yes, send me/);

// Bad input, bots, other sites and unknown assets are refused.
assert.equal((await call('/api/capture', { method: 'POST', body: { type: 'newsletter', email: 'not-an-email', newsletter_opt_in: true } })).status, 400);
assert.equal((await call('/api/capture', { method: 'POST', body: { type: 'resource', asset: 'moco-20814-beps-data-sheet', email: 'bot@example.invalid', company_website: 'spam' } })).status, 400);
assert.equal((await call('/api/capture', { method: 'POST', body: { type: 'resource', asset: 'moco-20814-beps-data-sheet', email: 'x@example.invalid' }, headers: { origin: 'https://other-site.test' } })).status, 403);
assert.equal((await call('/api/capture', { method: 'POST', body: { type: 'resource', asset: 'no-such-file', email: 'x@example.invalid' } })).status, 400);

// Preferences: the link shows status; the form withdraws and suppresses.
res = await call(second.preferences_url);
assert.equal(res.status, 200);
assert.match(await res.text(), /pending confirmation/);
const token = new URL(origin + second.preferences_url).searchParams.get('token');
assert.equal((await call('/api/preferences', { method: 'POST', body: { token } })).status, 200);
contact = await one('SELECT * FROM contacts WHERE email=?', 'operator@example.invalid');
assert.equal(contact.newsletter_status, 'unsubscribed'); assert.ok(contact.suppressed_at);

// Owner routes are closed on Vercel, even with forged Sites identity headers.
const forged = { 'oai-authenticated-user-email': 'owner@example.invalid', 'oai-authenticated-user-id': 'x' };
assert.equal((await call('/admin', { headers: forged })).status, 404);
assert.equal((await call('/admin/export.csv?view=all', { headers: forged })).status, 404);
assert.equal((await handle(new Request(origin + '/api/worker?__path=/admin/export.csv', { headers: forged }))).status, 404);
assert.equal((await handle(new Request(origin + '/api/worker?__path=/etc/passwd'))).status, 404);

// Rate limit keys on Vercel's client IP; a forged cf-connecting-ip doesn't reset it.
let last;
for (let i = 0; i < 41; i++) {
  last = await call('/api/capture', { method: 'POST', ip: '198.51.100.7', headers: { 'cf-connecting-ip': `10.0.0.${i}` }, body: { type: 'resource', asset: 'evidence-worksheet', email: `rate${i}@example.invalid` } });
}
assert.equal(last.status, 429);
assert.ok(Number((await one('SELECT MAX(window_start) AS w FROM rate_limits')).w) > 1e12, 'window_start must hold a millisecond timestamp');

// Missing database configuration fails closed instead of crashing.
const { POST } = await import('../api/worker.js');
const saved = process.env.SUPABASE_DB_URL; delete process.env.SUPABASE_DB_URL;
assert.equal((await POST(new Request(origin + '/api/worker?__path=/api/capture', { method: 'POST', body: '{}' }))).status, 503);
if (saved) process.env.SUPABASE_DB_URL = saved;

await pg.close();
console.log('Vercel checks passed: rewrites cover every form, signups land in Postgres with RLS on, consent stays separate, downloads need their token, preferences withdraw, owner routes are closed, the rate limit uses the trusted client IP, and a missing database fails closed.');
