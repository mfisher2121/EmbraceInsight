import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

// Builds the five-ZIP permit report figures from the county export and the ACS heating-fuel table.
// Every bucket is a keyword rule on the permit description, applied in the order listed in BUCKETS.

const root = path.resolve(import.meta.dirname, '..');
const evidence = path.join(root, 'evidence/five-zip');
const read = name => fs.readFile(path.join(evidence, name), 'utf8');
const sha = async name => crypto.createHash('sha256').update(await fs.readFile(path.join(evidence, name))).digest('hex');

function parseCSV(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const ZIPS = ['20814', '20815', '20816', '20817', '20895'];
const RESIDENTIAL = new Set(['SINGLE FAMILY DWELLING', 'TOWNHOUSE']);

const words = {
  heatPump: /heat\s*-?\s*pumps?|\bhps?\b|\bh\/p\b|geothermal|ground\s*source/,
  fossil: /furnaces?|furance|boilers?|\bgf\b|gas\s*pack/,
  ac: /air\s*-?\s*condition|\ba\s*\/?\s*c\b|\bacs\b|condens(er|ing\s*unit)/,
  ductless: /ductless|mini\s*-?\s*splits?|multi\s*-?\s*splits?|ductfree|duct\s*free/,
  hybrid: /hybrid|dual\s*-?\s*fuel/,
  switchTo: /(convert|conversion|switch|changing|change over|from)\b.{0,60}\b(gas|oil|propane|furnace|boiler)\b.{0,60}\b(to|with)\b.{0,40}heat\s*-?\s*pump|(remove|abandon|eliminat)\w*\b.{0,40}\b(gas|oil|propane)\b.{0,40}(furnace|boiler).{0,80}heat\s*-?\s*pump|electrification/,
  duct: /\bducts?\b|ductwork|duct\s*work/,
  notSpace: /water\s*heater|hot\s*water\s*heater|fireplace|kitchen\s*(exhaust|hood)|\bhood\b|exhaust\s*fan|generator|gas\s*(line|pipe|piping)|dryer|range\b|grill|fire\s*pit|pool\s*heater|log\s*set/,
  hvacOther: /hvac|air\s*handler|\bahu\b|rooftop|\brtu\b|like\s*for\s*like|replace|equipment|system|unit|coil|\bton\b|btu/
};

// Description text the county uses that carries no equipment detail.
const boilerplate = d => d
  .replace(/customer wants to use eplans,?/g, '')
  .replace(/refer\s*(back|to)\s*#?\s*\d*/g, '')
  .replace(/(suite|unit)\s*\/\s*floor\s*-?\s*[\w#]*/g, '')
  .replace(/per applicant\s*-?\s*/g, '')
  .replace(/[#\d\s.,\-:;()/]+/g, ' ')
  .trim();

// "Replace gas furnace and AC into heat pump": the old furnace or boiler comes first, then "into/to/with",
// then a heat pump, with no furnace, boiler, dual fuel or hybrid named on the new side.
function isSwitch(d) {
  if (words.switchTo.test(d)) return true;
  const m = d.match(/(furnace|furance|boiler)\b[^.]{0,60}?\b(into|to|with)\b([^.]{0,60})/);
  if (!m) return false;
  const before = d.slice(0, m.index);
  const after = m[3];
  return /heat\s*-?\s*pump|\bhp\b/.test(after) && !/heat\s*-?\s*pump|\bhp\b/.test(before)
    && !/furnace|\bgf\b|boiler|dual|hybrid/.test(after);
}

export const BUCKETS = [
  ['no_detail', 'No equipment detail in the description', d => !boilerplate(d)],
  ['switch', 'Explicit gas, oil or propane to heat pump switch', isSwitch],
  ['hybrid', 'Hybrid or dual-fuel wording', d => words.hybrid.test(d)],
  ['hp_and_fossil', 'Heat pump and furnace or boiler both named', d => words.heatPump.test(d) && words.fossil.test(d)],
  ['ductless', 'Ductless or mini-split named', d => words.ductless.test(d)],
  ['hp_only', 'Heat pump named, no furnace or boiler', d => words.heatPump.test(d)],
  ['fossil_and_ac', 'Furnace or boiler and AC both named', d => words.fossil.test(d) && words.ac.test(d)],
  ['fossil_only', 'Furnace or boiler named, no AC or heat pump', d => words.fossil.test(d)],
  ['ac_only', 'AC named, no heating equipment', d => words.ac.test(d)],
  ['not_space', 'Not heating or cooling equipment (water heaters, fireplaces, exhaust, gas piping)', d => words.notSpace.test(d)],
  ['duct_only', 'Ductwork named, no equipment type', d => words.duct.test(d)],
  ['hvac_unclear', 'HVAC work named, equipment type unclear', d => words.hvacOther.test(d)],
  ['other', 'Other wording', () => true]
];

export function classify(description) {
  const d = (description || '').toLowerCase().replace(/\s+/g, ' ');
  return BUCKETS.find(([, , test]) => test(d))[0];
}

const summary = JSON.parse(await read('permits-summary.json'));
const records = parseCSV(await read('permits-records-five-zip.csv'));
const acs = JSON.parse(await read('acs2024-5yr-b25040.json'));
const acsSource = JSON.parse(await read('acs-source.json'));

for (const r of records) r.bucket = classify(r.description);

const count = (rows, key) => rows.reduce((m, r) => (m[key(r)] = (m[key(r)] || 0) + 1, m), {});
const perZip = rows => Object.fromEntries(ZIPS.map(z => [z, rows.filter(r => r.zip === z).length]));
const pct = (n, d) => d ? Math.round((n / d) * 100) : 0;

const residential = records.filter(r => RESIDENTIAL.has(r.usecode));
const replacements = residential.filter(r => r.worktype === 'REPLACE');
const byBucket = count(replacements, r => r.bucket);
const bucketRows = BUCKETS.map(([id, label]) => ({
  id, label, total: byBucket[id] || 0,
  share: pct(byBucket[id] || 0, replacements.length),
  zips: Object.fromEntries(ZIPS.map(z => [z, replacements.filter(r => r.zip === z && r.bucket === id).length]))
}));

const months = [...new Set(replacements.map(r => r.issueddate.slice(0, 7)))].sort();
const monthly = months.map(m => {
  const rows = replacements.filter(r => r.issueddate.startsWith(m));
  const b = count(rows, r => r.bucket);
  return { month: m, total: rows.length, ac_only: b.ac_only || 0, fossil_and_ac: b.fossil_and_ac || 0, fossil_only: b.fossil_only || 0,
    heat_pump: (b.hp_only || 0) + (b.hp_and_fossil || 0) + (b.hybrid || 0) + (b.switch || 0) };
});
const acSeason = ['2026-04', '2026-05', '2026-06', '2026-07'];
const acInSeason = monthly.filter(m => acSeason.includes(m.month)).reduce((s, m) => s + m.ac_only, 0);
const winter = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03'];
const fossilInWinter = monthly.filter(m => winter.includes(m.month)).reduce((s, m) => s + m.fossil_only, 0);

const fuel = ZIPS.map(z => {
  const e = acs.data[`86000US${z}`].B25040.estimate, m = acs.data[`86000US${z}`].B25040.error;
  return { zip: z, homes: e.B25040001, homes_moe: m.B25040001, gas: e.B25040002, gas_moe: m.B25040002, electric: e.B25040004, electric_moe: m.B25040004,
    oil: e.B25040005, propane: e.B25040003, gas_share: pct(e.B25040002, e.B25040001), electric_share: pct(e.B25040004, e.B25040001) };
});
const fuelTotal = ['homes', 'gas', 'electric', 'oil', 'propane'].reduce((t, k) => (t[k] = fuel.reduce((s, f) => s + f[k], 0), t), {});
fuelTotal.gas_share = pct(fuelTotal.gas, fuelTotal.homes);
fuelTotal.electric_share = pct(fuelTotal.electric, fuelTotal.homes);
fuelTotal.oil_propane = fuelTotal.oil + fuelTotal.propane;

const hpAny = ['hp_only', 'hp_and_fossil', 'hybrid', 'switch'].reduce((s, k) => s + (byBucket[k] || 0), 0);
const fossilNoHp = (byBucket.fossil_and_ac || 0) + (byBucket.fossil_only || 0);
const described = replacements.length - (byBucket.no_detail || 0);

const figures = {
  period_start: summary.period_start,
  period_last: '2026-10-28',
  retrieved: summary.retrieved_at_utc.slice(0, 10),
  rows_updated: summary.source_rows_updated_at_utc.slice(0, 10),
  all: records.length,
  all_zips: perZip(records),
  api_matches_download: ZIPS.every(z => perZip(records)[z] === summary.api_group_count[z]),
  usecode: count(records, r => r.usecode),
  residential: residential.length,
  residential_install: residential.length - replacements.length,
  replacements: replacements.length,
  replacements_zips: perZip(replacements),
  described,
  no_detail: byBucket.no_detail || 0,
  no_detail_share: pct(byBucket.no_detail || 0, replacements.length),
  hp_any: hpAny, hp_any_share: pct(hpAny, replacements.length), hp_any_described_share: pct(hpAny, described),
  fossil_no_hp: fossilNoHp, fossil_no_hp_share: pct(fossilNoHp, replacements.length), fossil_no_hp_described_share: pct(fossilNoHp, described),
  ac_only: byBucket.ac_only || 0, ac_only_share: pct(byBucket.ac_only || 0, replacements.length),
  ac_in_season: acInSeason, ac_in_season_share: pct(acInSeason, byBucket.ac_only || 0),
  fossil_and_ac: byBucket.fossil_and_ac || 0,
  fossil_only: byBucket.fossil_only || 0,
  fossil_only_winter: fossilInWinter, fossil_only_winter_share: pct(fossilInWinter, byBucket.fossil_only || 0),
  hp_only: byBucket.hp_only || 0,
  hp_and_fossil: byBucket.hp_and_fossil || 0,
  hybrid: byBucket.hybrid || 0,
  switch: byBucket.switch || 0,
  ductless: byBucket.ductless || 0,
  buckets: bucketRows,
  monthly,
  fuel, fuel_total: fuelTotal,
  acs_release: acs.release.name,
  earlier_file_rows: (await read('earlier-classification-1542.csv')).trim().split('\n').length - 1,
  sources: {
    permits: { url: summary.url, retrieved_utc: summary.retrieved_at_utc, rows_updated_utc: summary.source_rows_updated_at_utc, sha256: await sha('permits-records-five-zip.csv') },
    acs: { url: acsSource.census_table_url, via: acsSource.retrieved_via, retrieved_utc: acsSource.retrieved_at_utc, sha256: await sha('acs2024-5yr-b25040.json') }
  }
};

if (!figures.api_matches_download) throw new Error('Five-ZIP permit download does not match the county API count.');
if (bucketRows.reduce((s, b) => s + b.total, 0) !== replacements.length) throw new Error('Buckets do not add up to replacements.');

await fs.writeFile(path.join(root, 'content/permits-five-zip.json'), JSON.stringify(figures, null, 1) + '\n');

if (process.argv.includes('--samples')) {
  for (const [id] of BUCKETS) {
    const rows = replacements.filter(r => r.bucket === id);
    console.log(`\n## ${id} (${rows.length})`);
    for (const r of rows.slice(0, 400).filter((_, i) => i % Math.max(1, Math.floor(rows.length / 12)) === 0).slice(0, 12)) console.log('  -', r.description.replace(/\s+/g, ' ').slice(0, 130));
  }
}
console.log(`Prepared five-ZIP permit figures: ${figures.all} permits, ${figures.replacements} residential replacements, ${figures.no_detail} without equipment detail.`);
