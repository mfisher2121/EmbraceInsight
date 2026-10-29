"""Initial-HTML source checks. This does not certify a live URL's six gates."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit
import json
import re
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'public'
requirements = json.loads((ROOT / 'semantic-gate/requirements.json').read_text())
origin = requirements['evaluated_url'].rstrip('/')


class Page(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.ids = {}
        self.duplicates = []
        self.links = []
        self.canonical = []
        self.meta = {}
        self.schemas = []
        self.title = ''
        self.h1 = []
        self.main = ''
        self.stack = []
        self.schema_text = None
        self.feed(source)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag not in {'meta', 'link', 'img', 'input', 'br', 'hr', 'source'}:
            self.stack.append((tag, a.get('id')))
        if a.get('id'):
            if a['id'] in self.ids:
                self.duplicates.append(a['id'])
            self.ids[a['id']] = ''
        if tag == 'a':
            self.links.append(a.get('href', ''))
        if tag == 'link' and a.get('rel') == 'canonical':
            self.canonical.append(a.get('href'))
        if tag == 'meta':
            self.meta[a.get('name', a.get('property'))] = a.get('content', '')
        if tag == 'h1':
            self.h1.append('')
        if tag == 'script' and a.get('type') == 'application/ld+json':
            self.schema_text = ''

    def handle_endtag(self, tag):
        if tag == 'script' and self.schema_text is not None:
            self.schemas.append(json.loads(self.schema_text))
            self.schema_text = None
        for i in range(len(self.stack)-1, -1, -1):
            if self.stack[i][0] == tag:
                self.stack = self.stack[:i]
                break

    def handle_data(self, text):
        tags = [tag for tag, _ in self.stack]
        if self.schema_text is not None:
            self.schema_text += text
        if 'script' in tags or 'style' in tags:
            return
        if 'title' in tags:
            self.title += text
        if 'h1' in tags:
            self.h1[-1] += text + ' '
        if 'main' in tags:
            self.main += text + ' '
        for _, id_ in self.stack:
            if id_:
                self.ids[id_] += text + ' '


home = Page((DIST / 'index.html').read_text())
checks = []


def check(name, result, evidence):
    checks.append({'requirement': name, 'satisfied_in_source': bool(result), 'evidence': evidence})


check('Exactly one H1', len(home.h1) == 1, home.h1)
for name, text in [('Title', home.title), ('H1', ' '.join(home.h1))]:
    tokens = requirements['identity_tokens']['title' if name == 'Title' else 'h1']
    check(name + ' reflects the working page identity', all(w.lower() in text.lower() for w in tokens), text)
check('Homepage self canonical', home.canonical == [origin+'/'], home.canonical)
check('Description exists', bool(home.meta.get('description')), home.meta.get('description'))
check('Private draft remains noindex', 'noindex' in home.meta.get('robots',''), home.meta.get('robots'))
check('No duplicate homepage IDs', not home.duplicates, home.duplicates)
for item in requirements['required_questions']:
    id_ = item['selector'].removeprefix('#')
    present = re.sub(r'\s+', ' ', home.ids.get(id_, ''))
    check(item['id'] + ': ' + item['question'], item['evidence'].lower() in present.lower(), present)
for item in requirements['required_sections']:
    check(item['id'] + ': ' + item['name'], item['selector'].removeprefix('#') in home.ids, item['selector'])
for entity in requirements['required_entities']:
    check('Main-content entity: '+entity, entity.lower() in home.main.lower(), entity)
check('Primary technical-requirements citation', 'https://developers.google.com/search/docs/essentials/technical' in home.links, 'Google Search technical requirements')
check('Primary content-guidance citation', 'https://developers.google.com/search/docs/fundamentals/creating-helpful-content' in home.links, 'Google people-first content guidance')
check('Visible publisher and direct contact', 'Max Fisher' in home.ids.get('publisher','') and 'mailto:mfisher@mbraceinsight.com' in home.links, home.ids.get('publisher',''))
nodes = [n for s in home.schemas for n in s.get('@graph', [s])]
check('Organization, person, website, and page schema', {'Organization','Person','WebSite','WebPage'}.issubset({n['@type'] for n in nodes}), [n['@type'] for n in nodes])
content = json.loads((ROOT / 'content/field-notes.json').read_text())
for key, item in content.items():
    article_path = DIST / item['path'].lstrip('/') / 'index.html'
    page = Page(article_path.read_text())
    check('Initial-HTML content: '+item['path'], len(page.main) > 500 and item['title'] in page.main, str(article_path.relative_to(ROOT)))
    check('Self canonical: '+item['path'], page.canonical == [origin+item['path']], page.canonical)
    for href in page.links:
        if href.startswith('/') and not href.startswith('//'):
            parsed=urlsplit(href)
            if parsed.path.endswith('/'):
                target=DIST / parsed.path.lstrip('/') / 'index.html'
            else:
                target=DIST / parsed.path.lstrip('/')
            check('Local article link resolves: '+href, target.exists(), href)
resources=json.loads((ROOT/'content/resources.json').read_text())
for resource in resources:
    route='/resources/'+resource['id']+'/'
    page=Page((DIST/route.lstrip('/')/'index.html').read_text())
    check('Resource has initial HTML and self canonical: '+route, resource['title'] in page.main and page.canonical==[origin+route], route)
    check('Resource is linked from the homepage: '+route, route in home.links, route)
check('Review, resource, and newsletter sections are present', all(id_ in home.ids for id_ in ['clearance','resources','newsletter']), 'Primary conversion sections')
urls=[n.text for n in ET.fromstring((DIST/'sitemap.xml').read_text()).findall('.//{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]
expected=[origin+'/']+[origin+a['path'] for a in content.values()]+[origin+'/resources/'+r['id']+'/' for r in resources]
check('Sitemap includes all authored pages', set(urls)==set(expected), urls)
robots=(DIST/'robots.txt').read_text()
check('Discovery declaration exists and preserves draft restriction', 'Disallow: /' in robots and origin+'/sitemap.xml' in robots, robots)
unmet=[c for c in checks if not c['satisfied_in_source']]
output={'scope':'Initial-HTML source preflight only; not a live Semantic Gate certification','target_query':requirements['target_query'],'source_checks':checks,'unmet_source_requirements':unmet,'live_public_eligibility':'NOT CERTIFIED: owner-private authentication and draft indexing restrictions remain'}
(ROOT/'semantic-gate/source-preflight.json').write_text(json.dumps(output,indent=2)+'\n')
print('Source preflight satisfied. Live public eligibility is not certified.' if not unmet else 'Source preflight has unmet requirements.')
for item in unmet:
    print('UNMET:',item['requirement'])
sys.exit(1 if unmet else 0)
