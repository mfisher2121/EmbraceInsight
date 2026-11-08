// Checks that every figure the edition publishes matches content/briefing-20814.json
// (built from the county exports), and that the 20814 data sheet goes through the
// existing consent-separated download flow.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { webcrypto, randomUUID } from 'node:crypto';
import { localDatabase } from './local-db.mjs';
globalThis.crypto ||= webcrypto;
const root = path.resolve(import.meta.dirname, '..');
const f = JSON.parse(await fs.readFile(path.join(root, 'content/briefing-20814.json'), 'utf8'));
const app = (await import(pathToFileURL(path.join(root, 'dist/server/index.js')).href)).default;
const db = localDatabase(path.resolve(root, `../../work/briefing-test-${randomUUID()}.sqlite`));
await db.migrate();
const origin = 'https://site.test';
const env = { DB: db, ADMIN_EMAIL: 'owner@example.invalid', SITE_ORIGIN: origin };
const get = async route => { const r = await app.fetch(new Request(origin + route), env, {}); assert.equal(r.status, 200, route); return r.text(); };
const use = name => f.by_use.find(u => u.use === name);
const plain = html => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

const homeHTML = await get('/');
const home = plain(homeHTML);
const mf = use('multifamily housing'), hotel = use('hotel');
const p = JSON.parse(await fs.readFile(path.join(root, 'content/permits-five-zip.json'), 'utf8'));
const n = v => v.toLocaleString('en-US');
const homeClaims = [
  'Local reporting and practical guides for Montgomery County HVAC owners.',
  `${n(p.replacements)} replacement permits.`, `${p.switch} spelled-out switches.`,
  `${p.hp_any} Name a heat pump.`, `That's ${p.hp_any_described_share}% of the ${p.described} residential replacement permits`,
  `${p.fossil_no_hp} Name a furnace or boiler, no heat pump.`, `${p.fossil_no_hp_described_share}% of the described permits`,
  `utility gas heats about ${p.fuel_total.gas_share}% of occupied homes`,
  `${p.ac_only} Replace the AC, name no heating.`, `${p.ac_in_season_share}% were issued April through July`,
  `${n(p.replacements)} residential replacement permits, sorted`, `at ${p.fossil_and_ac} permits`,
  `${p.no_detail} replacement permits carry no equipment detail`
];
assert.ok(p.api_matches_download, 'Five-ZIP download must match the county API count');
for (const claim of homeClaims) assert.ok(home.includes(claim), `Homepage figure missing or stale: ${claim}`);
const navLinks = [...homeHTML.match(/<nav id="navigation"[\s\S]*?<\/nav>/)[0].matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map(m => m[1]);
assert.deepEqual(navLinks, ['Market Reports', 'Contractor Playbook', 'About']);
assert.ok(homeHTML.indexOf('Read the first briefing') < homeHTML.indexOf('<h1'), 'Read the first briefing should appear above the headline');
assert.doesNotMatch(homeHTML, /Get the next briefing|Join the list|id="newsletter"/, 'No newsletter signup until a test subscriber can receive email');

const reportHTML = await get('/market-reports/five-zip-hvac-permits/');
assert.doesNotMatch(reportHTML, /\{\{|\}\}/, 'Unresolved template token in report');
const report = plain(reportHTML);
for (const claim of [
  `issued ${n(p.replacements)} mechanical replacement permits`, `${p.described} of them say what equipment went in`,
  `${p.hp_any} (${p.hp_any_described_share}%) name a heat pump`, `${p.fossil_no_hp} (${p.fossil_no_hp_described_share}%) name a furnace or boiler`,
  `Just ${p.switch} spell out a switch`, `${p.ac_in_season} of the ${p.ac_only} AC-only replacements (${p.ac_in_season_share}%)`,
  `one of the five ZIP codes: ${n(p.all)} permits`, p.sources.permits.sha256, p.sources.acs.sha256
]) assert.ok(report.includes(claim), `Report figure missing: ${claim}`);
assert.equal([...reportHTML.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)][0][1].match(/<tr>/g).length, p.buckets.length);
const playbook = plain(await get('/contractor-playbook/ac-fails-furnace-works/'));
for (const claim of [`${p.ac_only} residential replacement permits`, `${p.ac_in_season_share}% of them were issued April through July`, `about ${p.fuel_total.gas_share}% of occupied homes`])
  assert.ok(playbook.includes(claim), `Playbook figure missing: ${claim}`);
assert.doesNotMatch(homeHTML, /<meta name="robots"[^>]+noindex/);
assert.ok(homeHTML.includes('<link rel="canonical" href="https://embraceinsight.net/">'));
assert.doesNotMatch(await get('/robots.txt'), /^Disallow: \/$/m);
const sitemap = await get('/sitemap.xml');
for (const route of ['/market-reports/five-zip-hvac-permits/', '/contractor-playbook/ac-fails-furnace-works/', '/about/', '/montgomery-county/20814/beps-briefing/']) assert.ok(sitemap.includes(`<loc>https://embraceinsight.net${route}</loc>`), route);
assert.ok(!sitemap.includes('chatgpt.site'));
assert.match(await get('/guides/dmv-heat-pump-rebates/'), /<meta name="robots"[^>]+noindex/);

const briefingHTML = await get('/montgomery-county/20814/beps-briefing/');
assert.doesNotMatch(briefingHTML, /\{\{|\}\}/, 'Unresolved template token in briefing');
assert.doesNotMatch(briefingHTML, /<meta name="robots"[^>]+noindex/);
const briefing = plain(briefingHTML);
for (const claim of [
  `the county marks ${f.interim.no} of ${f.matched} buildings`, `lists ${f.interim.no} of the ${f.matched} matched buildings`,
  `Hotels (${hotel.no} of ${hotel.records})`, `multifamily housing (${mf.no} of ${mf.records})`,
  `${f.final.no} read No, ${f.final.yes} read Yes`, f.sources.inventory.sha256, f.sources.energy.sha256
]) assert.ok(briefing.includes(claim), `Briefing figure missing: ${claim}`);
const tableRows = [...briefingHTML.matchAll(/<tbody>([\s\S]*?)<\/tbody>/g)][0][1].match(/<tr>/g).length;
assert.equal(tableRows, f.by_use.length);
const allowedExternal = ['https://maxfisher.net', 'https://www.linkedin.com/in/maxfisher21/', 'https://data.census.gov/table/ACSDT5Y2024.B25040', 'https://censusreporter.org/tables/B25040/', 'https://target-finder.mcbeps.org/building-inventory', 'https://mcbeps.org/', 'https://data.montgomerycountymd.gov/d/ih88-a6aa', 'https://www2.montgomerycountymd.gov/mcgportalapps/Press_Detail.aspx?Item_ID=46611', 'https://mde.maryland.gov/programs/air/ClimateChange/Clean-Buildings/Pages/BEPS.aspx'];
for (const html of [briefingHTML, reportHTML, await get('/'), await get('/contractor-playbook/ac-fails-furnace-works/'), await get('/about/')]) for (const [, href] of html.matchAll(/href="(https?:[^"]+)"/g)) {
  if (new URL(href).origin === 'https://embraceinsight.net') continue;
  assert.ok(allowedExternal.includes(href), `Unreviewed external link: ${href}`);
}
for (const [, href] of (await get('/')).matchAll(/href="(\/[^"#?]*)/g)) await get(href);

const post = payload => app.fetch(new Request(origin + '/api/capture', { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(payload) }), env, {});
let response = await post({ type: 'resource', asset: 'moco-20814-beps-data-sheet', email: 'operator@example.invalid', source: 'test-briefing' });
assert.equal(response.status, 201);
const result = await response.json();
assert.equal(result.newsletter_requested, false); assert.equal(result.email_sent, false);
assert.equal((await app.fetch(new Request(origin + '/download/moco-20814-beps-data-sheet'), env, {})).status, 403);
const sheet = await (await app.fetch(new Request(origin + result.download_url), env, {})).text();
assert.match(sheet, /# The 20814 BEPS Data Sheet/);
const section = (start, end) => sheet.slice(sheet.indexOf(start), sheet.indexOf(end)).split('\n').filter(line => line.startsWith('| ') && !line.startsWith('| ---') && !line.startsWith('| County building ID'));
assert.equal(section('## Building-level records', '## Method').length, f.inventory_in_zip, 'Data sheet should list every 20814 inventory record');
assert.equal(section('## Inventory records with no energy map match', '## Building-level records').length, f.unmatched.length);
assert.equal((await db.prepare("SELECT newsletter_status FROM contacts WHERE email='operator@example.invalid'").first()).newsletter_status, 'not_requested');
const meta = JSON.parse((await get('/')).match(/<script id="resources-metadata" type="application\/json">([\s\S]*?)<\/script>/)[1]);
for (const id of ['moco-20814-beps-data-sheet', 'four-zip-worksheet', 'evidence-worksheet']) assert.ok(meta.some(r => r.id === id), `Homepage dialog metadata missing ${id}`);
console.log(`Briefing checks passed: ${homeClaims.length} homepage figures, the five-ZIP report, the playbook and the 20814 briefing match the source-derived figures, links are reviewed, and the 20814 data sheet unlocks through the consent-separated download flow.`);
