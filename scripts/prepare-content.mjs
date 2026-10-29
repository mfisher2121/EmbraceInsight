import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const origin = 'https://mbrace-insight.niceshark22.chatgpt.site';
const content = JSON.parse(await fs.readFile(path.join(root, 'content/field-notes.json'), 'utf8'));
const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const escape = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const organization = {
  '@type': 'Organization', '@id': `${origin}/#organization`, name: 'MBRACE INSIGHT',
  url: `${origin}/`, email: 'mfisher@mbraceinsight.com', areaServed: ['Washington, DC', 'Maryland', 'Virginia']
};
for (const [key, a] of Object.entries(content)) {
  const url = origin + a.path;
  const body = a.body.replaceAll('<h3>', '<h2>').replaceAll('</h3>', '</h2>');
  const editorial = key !== 'privacy';
  const article = {
    '@type': editorial ? 'Article' : 'WebPage', '@id': url + '#content', url,
    ...(editorial ? {headline: a.title} : {name: a.title}),
    author: {'@type':'Person', name:a.author, '@id':`${origin}/#publisher`},
    publisher: {'@id':organization['@id']}, inLanguage:'en-US',
    creativeWorkStatus:'Draft', ...(editorial ? {datePublished:a.date} : {})
  };
  const schema = JSON.stringify({'@context':'https://schema.org','@graph':[organization, article]}).replaceAll('<','\\u003c');
  const header = home.match(/<header class="site-header">[\s\S]*?<\/header>/)[0]
    .replaceAll('href="#', 'href="/#');
  const footer = home.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0]
    .replaceAll('href="#', 'href="/#');
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#f6f6ef"><meta name="robots" content="noindex, nofollow"><meta name="description" content="${escape(a.description || a.title + ' — an MBRACE INSIGHT editorial draft for HVAC business operators.')}"/><title>${escape(a.title)} | MBRACE INSIGHT</title><link rel="canonical" href="${url}"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${schema}</script><script src="/article-page.js" defer></script></head><body><a class="skip-link" href="#main">Skip to content</a>${header}<main id="main" class="article-page container"><a class="text-link" href="/#field-notes">← Back to MBRACE INSIGHT</a><article><div class="eyebrow">${escape(a.category)}</div><h1>${escape(a.title)}</h1><p class="article-byline">By ${escape(a.author)} · ${escape(a.editorialStatus)} · <time datetime="${a.date}">${a.date}</time></p><div class="article-body">${body}</div></article><aside class="article-next"><h2>A useful next step.</h2><p>Define your territory, service, and question in a four-ZIP review scope.</p><a class="button button-dark" href="/#your-next-move">Start your four-ZIP brief <span aria-hidden="true">↗</span></a></aside></main>${footer}</body></html>`;
  const directory = path.join(dist, a.path);
  await fs.mkdir(directory,{recursive:true});
  await fs.writeFile(path.join(directory,'index.html'),page);
}
await fs.writeFile(path.join(dist,'field-notes.json'),JSON.stringify(content)+'\n');
const urls = [`${origin}/`,...Object.values(content).map(a=>origin+a.path)];
await fs.writeFile(path.join(dist,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url=>`  <url><loc>${url}</loc></url>`).join('\n')}\n</urlset>\n`);
// The private draft must stay private and noindex. Public release requires a separate live scan.
await fs.writeFile(path.join(dist,'robots.txt'),`# Owner-private review build. Not eligible for public indexing.\nUser-agent: *\nDisallow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
console.log(`Prepared ${Object.keys(content).length} initial-HTML pages, shared reader content, and discovery files.`);
