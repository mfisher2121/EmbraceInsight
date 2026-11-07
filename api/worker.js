// Vercel function that runs the existing site Worker (worker/index.js) unchanged.
//
// Vercel serves every page from public/ as static files. vercel.json rewrites only the
// dynamic routes to this function, passing the original path in ?__path=:
//   /api/capture, /api/preferences, /preferences, /download/<asset>
// The Worker stores signups through a D1-compatible adapter over Supabase Postgres.
//
// Owner routes (/admin, /admin/export.csv) are not served on Vercel. They relied on
// identity headers that only ChatGPT Sites sets; here anyone could forge them. Read
// signups in the Supabase table editor instead.
import fs from 'node:fs/promises';
import path from 'node:path';
import { d1FromExecutor, postgresExecutor } from '../lib/d1-postgres.mjs';

const root = path.resolve(import.meta.dirname, '..');
const FORGEABLE_HEADERS = ['oai-authenticated-user-email', 'oai-authenticated-user-id', 'cf-connecting-ip'];
const isAllowedPath = p => ['/api/capture', '/api/preferences', '/preferences'].includes(p) || /^\/download\/[a-z0-9-]{1,60}$/.test(p);

let workerPromise;
function loadWorker() {
  workerPromise ||= (async () => {
    const resources = JSON.parse(await fs.readFile(path.join(root, 'content/resources.json'), 'utf8'));
    const downloads = {};
    for (const resource of resources) {
      downloads[resource.id] = { title: resource.title, body: await fs.readFile(path.join(root, 'assets-downloads', `${resource.id}.md`), 'utf8') };
    }
    // worker/index.js reads these as globals; the Sites build inlined them instead.
    globalThis.__DOWNLOAD_ASSETS__ = downloads;
    globalThis.__SITE_ASSETS__ = {};
    return (await import('../worker/index.js')).default;
  })();
  return workerPromise;
}

const notFound = () => new Response('Not found.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

export function createHandler({ db, siteOrigin }) {
  return async function handle(request) {
    const incoming = new URL(request.url);
    const target = incoming.searchParams.get('__path') || incoming.pathname;
    incoming.searchParams.delete('__path');
    if (!isAllowedPath(target)) return notFound();

    const headers = new Headers(request.headers);
    for (const name of FORGEABLE_HEADERS) headers.delete(name);
    // Vercel sets x-real-ip / x-forwarded-for from the connection; the Worker's rate
    // limit reads cf-connecting-ip, so map the trusted value onto it.
    const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    if (ip) headers.set('cf-connecting-ip', ip);

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || incoming.host;
    const proto = request.headers.get('x-forwarded-proto') || incoming.protocol.replace(':', '');
    const url = new URL(target + incoming.search, siteOrigin || `${proto}://${host}`);
    const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

    const worker = await loadWorker();
    return worker.fetch(new Request(url, { method: request.method, headers, body }), { DB: db, SITE_ORIGIN: siteOrigin || undefined }, {});
  };
}

let productionHandler;
async function handleProduction(request) {
  if (!productionHandler) {
    if (!process.env.SUPABASE_DB_URL) {
      return new Response(JSON.stringify({ ok: false, error: 'Signup could not be saved. Please try again later.' }), { status: 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }
    const db = d1FromExecutor(await postgresExecutor(process.env.SUPABASE_DB_URL));
    productionHandler = createHandler({ db, siteOrigin: process.env.SITE_ORIGIN || '' });
  }
  return productionHandler(request);
}

export const GET = handleProduction;
export const POST = handleProduction;
