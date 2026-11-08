import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'public');
const origin = 'https://embraceinsight.net';
const indexablePages = new Set(['/market-reports/', '/market-reports/five-zip-hvac-permits/', '/contractor-playbook/', '/contractor-playbook/ac-fails-furnace-works/', '/about/', '/montgomery-county/20814/beps-briefing/', '/editorial-policy/']);
const indexableResources = new Set(['moco-20814-beps-data-sheet']);
const pageKeys = new Set(['privacy', 'editorial', 'about', 'marketReports', 'playbookIndex']);
const content = JSON.parse(await fs.readFile(path.join(root, 'content/field-notes.json'), 'utf8'));
let home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const figures = JSON.parse(await fs.readFile(path.join(root, 'content/briefing-20814.json'), 'utf8'));
const permits = JSON.parse(await fs.readFile(path.join(root, 'content/permits-five-zip.json'), 'utf8'));
const ZIPS = ['20814', '20815', '20816', '20817', '20895'];
const num = n => typeof n === 'number' ? n.toLocaleString('en-US') : n;
const monthName = m => new Date(`${m}-15T12:00:00Z`).toLocaleString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
const permitTables = {
  p_buckets: () => `<div class="data-table-wrap"><table class="data-table"><thead><tr><th scope="col">What the description names</th><th scope="col">Permits</th><th scope="col">Share</th>${ZIPS.map(z => `<th scope="col">${z}</th>`).join('')}</tr></thead><tbody>${permits.buckets.map(b => `<tr><th scope="row">${escape(b.label)}</th><td>${num(b.total)}</td><td>${b.share}%</td>${ZIPS.map(z => `<td>${b.zips[z]}</td>`).join('')}</tr>`).join('')}</tbody><tfoot><tr><th scope="row">Residential replacements</th><td>${num(permits.replacements)}</td><td>100%</td>${ZIPS.map(z => `<td>${permits.replacements_zips[z]}</td>`).join('')}</tr></tfoot></table></div>`,
  p_monthly: () => `<div class="data-table-wrap"><table class="data-table"><thead><tr><th scope="col">Issued</th><th scope="col">All residential replacements</th><th scope="col">AC, no heating named</th><th scope="col">Furnace or boiler and AC</th><th scope="col">Furnace or boiler only</th><th scope="col">Any heat pump wording</th></tr></thead><tbody>${permits.monthly.map(m => `<tr><th scope="row">${monthName(m.month)}</th><td>${m.total}</td><td>${m.ac_only}</td><td>${m.fossil_and_ac}</td><td>${m.fossil_only}</td><td>${m.heat_pump}</td></tr>`).join('')}</tbody></table></div><p class="table-note">October 2026 runs through the 28th, the last issue date in the county data when we retrieved it. “Any heat pump wording” adds the heat pump only, heat pump with furnace or boiler, hybrid or dual-fuel, and explicit switch rows. Ductless permits are counted separately.</p>`,
  p_fuel: () => `<div class="data-table-wrap"><table class="data-table"><thead><tr><th scope="col">ZIP</th><th scope="col">Occupied homes</th><th scope="col">Heated with utility gas</th><th scope="col">Heated with electricity</th><th scope="col">Fuel oil or propane</th></tr></thead><tbody>${permits.fuel.map(f => `<tr><th scope="row">${f.zip}</th><td>${num(f.homes)} <small>±${num(f.homes_moe)}</small></td><td>${num(f.gas)} <small>±${num(f.gas_moe)}</small> · ${f.gas_share}%</td><td>${num(f.electric)} <small>±${num(f.electric_moe)}</small> · ${f.electric_share}%</td><td>${num(f.oil + f.propane)}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Five ZIPs</th><td>${num(permits.fuel_total.homes)}</td><td>${num(permits.fuel_total.gas)} · ${permits.fuel_total.gas_share}%</td><td>${num(permits.fuel_total.electric)} · ${permits.fuel_total.electric_share}%</td><td>${num(permits.fuel_total.oil_propane)}</td></tr></tfoot></table></div><p class="table-note">± is the Census Bureau's 90% margin of error. The five-ZIP total adds the estimates; we don't publish a combined margin of error.</p>`,
  p_rules: () => `<ol class="method-list">${permits.buckets.map(b => `<li>${escape(b.label)}</li>`).join('')}</ol>`
};
const permitFigure = key => key.split('.').reduce((value, part) => value?.[part], permits);
const titleCase = s => s.replace(/(^|[\s\/(])([a-z])/g, (_, p, c) => p + c.toUpperCase()).replace(/ (And|Or|Of) /g, w => w.toLowerCase());
function figure(key) {
  if (key === 'unmatched_count') return figures.unmatched.length;
  if (key.startsWith('use.')) {
    const [, rest] = key.split(/^use\./);
    const field = rest.slice(rest.lastIndexOf('.') + 1);
    const row = figures.by_use.find(u => u.use === rest.slice(0, rest.lastIndexOf('.')));
    return row?.[field];
  }
  return key.split('.').reduce((value, part) => value?.[part], figures);
}
const byUseTable = () => `<div class="data-table-wrap"><table class="data-table"><thead><tr><th scope="col">Use type</th><th scope="col">Records</th><th scope="col">Yes</th><th scope="col">No</th><th scope="col">Undisclosed</th></tr></thead><tbody>${figures.by_use.map(u => `<tr><th scope="row">${escape(titleCase(u.use))}</th><td>${u.records}</td><td>${u.yes}</td><td>${u.no}</td><td>${u.undisclosed}</td></tr>`).join('')}</tbody><tfoot><tr><th scope="row">Total</th><td>${figures.matched}</td><td>${figures.interim.yes}</td><td>${figures.interim.no}</td><td>${figures.interim.undisclosed}</td></tr></tfoot></table></div>`;
const fill = html => html.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
  if (key === 'TABLE:by_use') return byUseTable();
  if (key.startsWith('TABLE:p_')) return permitTables[key.slice(6)]();
  if (key.startsWith('p.')) {
    const value = permitFigure(key.slice(2));
    if (value === undefined || value === null || typeof value === 'object') throw new Error(`Unresolved permit figure: ${key}`);
    return escape(String(num(value)));
  }
  const value = figure(key);
  if (value === undefined || value === null || typeof value === 'object') throw new Error(`Unresolved briefing figure: ${key}`);
  return escape(String(value));
});
const escape = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const organization = {
  '@type': 'Organization', '@id': `${origin}/#organization`, name: 'Embrace Insight',
  url: `${origin}/`, email: 'max@maxfisher.net', areaServed: 'Montgomery County, Maryland'
};
for (const [key, a] of Object.entries(content)) {
  const url = origin + a.path;
  const body = fill(a.body).replace(/<h3( [^>]*)?>/g, (_, attrs = '') => `<h2${attrs}>`).replaceAll('</h3>', '</h2>');
  const editorial = !pageKeys.has(key);
  const article = {
    '@type': editorial ? 'Article' : 'WebPage', '@id': url + '#content', url,
    ...(editorial ? {headline: a.title} : {name: a.title}),
    author: {'@type':'Person', name:a.author, '@id':`${origin}/#publisher`},
    publisher: {'@id':organization['@id']}, inLanguage:'en-US',
    ...(!indexablePages.has(a.path) ? {creativeWorkStatus:'Draft'} : {}), ...(editorial ? {datePublished:a.date} : {})
  };
  const schema = JSON.stringify({'@context':'https://schema.org','@graph':[organization, article]}).replaceAll('<','\\u003c');
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0]
    .replaceAll('href="#', 'href="/#');
  const footer = home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0]
    .replaceAll('href="#', 'href="/#');
  const next = a.next ? `<aside class="article-next"><h2>${escape(a.next.heading)}</h2><p>${escape(a.next.text)}</p><a class="button button-dark" href="${a.next.href}">${escape(a.next.label)} <span aria-hidden="true">↗</span></a></aside>` : '';
  const back = a.back || { href: '/', label: 'Embrace Insight' };
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f6f6ef">${indexablePages.has(a.path) ? '' : '<meta name="robots" content="noindex,nofollow">'}<meta name="description" content="${escape(a.description || a.title + ' | Embrace Insight')}"/><title>${escape(a.title)} | Embrace Insight</title><link rel="canonical" href="${url}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${schema}</script><script src="/article-page.js" defer></script></head><body><a class="skip-link" href="#main">Skip to content</a>${header}<main id="main" class="article-page container"><a class="text-link" href="${back.href}">← Back to ${escape(back.label)}</a><article><div class="eyebrow">${escape(a.category)}</div><h1>${escape(a.title)}</h1>${editorial ? `<p class="article-byline">By ${escape(a.author)} · ${escape(a.editorialStatus)} · <time datetime="${a.date}">${a.date}</time></p>` : ''}<div class="article-body">${body}</div></article>${next}</main>${footer}</body></html>`;
  const directory = path.join(dist, a.path);
  await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,'index.html'),page);
}
const resources = JSON.parse(await fs.readFile(path.join(root,'content/resources.json'),'utf8'));
const metadata = JSON.stringify(resources.filter(r => r.featured).map(({id,title,category,description,format,tag,cover,featured}) => ({id,title,category,description,format,tag,cover,featured}))).replaceAll('<','\\u003c');
home = home.replace(/<script id="resources-metadata" type="application\/json">[\s\S]*?<\/script>/, `<script id="resources-metadata" type="application/json">${metadata}</script>`);
await fs.writeFile(path.join(dist, 'index.html'), home);
for (const resource of resources) {
  const route = `/resources/${resource.id}/`;
  const url = origin+route;
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0].replaceAll('href="#','href="/#');
  const footer = home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0].replaceAll('href="#','href="/#');
  const schema = JSON.stringify({'@context':'https://schema.org','@graph':[organization,{'@type':'WebPage',url,name:resource.title,publisher:{'@id':organization['@id']},author:{'@type':'Person',name:'Max Fisher'}}]}).replaceAll('<','\\u003c');
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${indexableResources.has(resource.id) ? '' : '<meta name="robots" content="noindex,nofollow">'}<meta name="description" content="${escape(resource.description)}"><title>${escape(resource.title)} | Embrace Insight</title><link rel="canonical" href="${url}"><link rel="stylesheet" href="/styles.css"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><script type="application/ld+json">${schema}</script><script src="/capture.js" defer></script></head><body>${header}<main id="main" class="article-page container"><a class="text-link" href="/#resources">← Back to the resource library</a><article><div class="eyebrow">${escape(resource.category)} / ${escape(resource.format)}</div><h1>${escape(resource.title)}</h1><p class="article-byline">By Max Fisher · Embrace Insight · Draft resource for review</p><div class="article-body"><p>${escape(resource.description)}</p><p>${escape(resource.note || (resource.featured ? "Use this editable guide to prepare useful questions. It does not approve a rebate, design a system, or certify building compliance." : "This is a retained preparation resource from an earlier draft. It is not a completed assessment or issued certification."))}</p></div></article><div class="resource-page-form"><h2>Get your download.</h2><form class="capture-form" data-capture-form method="post" action="/api/capture"><input type="hidden" name="type" value="resource"><input type="hidden" name="asset" value="${resource.id}"><input type="hidden" name="source" value="resource-${resource.id}"><label for="asset-email">Your email<input id="asset-email" name="email" type="email" maxlength="254" autocomplete="email" required placeholder="you@example.com"></label><div class="honeypot" aria-hidden="true"><label>Leave this empty<input name="company_website" tabindex="-1" autocomplete="off"></label></div><label class="consent-choice optional-consent"><input type="checkbox" name="newsletter_opt_in"><span>Also send me the Embrace Insight newsletter. I can unsubscribe at any time.</span></label><button type="submit" class="button button-dark">Unlock my download ↓</button><p class="capture-privacy">We use your email to handle this resource request. Newsletter signup is optional. <a href="/privacy/">Privacy</a>.</p><p class="form-error" hidden role="alert"></p></form><div class="capture-result" hidden tabindex="-1" aria-live="polite"></div></div></main>${footer}</body></html>`;
  const directory = path.join(dist,route);await fs.mkdir(directory,{recursive:true});await fs.writeFile(path.join(directory,'index.html'),page);
}
await fs.writeFile(path.join(dist,'field-notes.json'),JSON.stringify(content)+'\n');
const urls = [`${origin}/`,...[...indexablePages].map(route=>origin+route),...resources.filter(r=>indexableResources.has(r.id)).map(r=>origin+`/resources/${r.id}/`)];
await fs.writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
await fs.writeFile(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Prepared editorial pages, ${resources.length} resource pages, and discovery files.`);
