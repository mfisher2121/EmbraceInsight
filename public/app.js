'use strict';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const menuButton = $('.menu-toggle');
const navigation = $('#navigation');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.setAttribute('aria-label', 'Open navigation');
  navigation.classList.remove('open');
}
menuButton.addEventListener('click', () => {
  const open = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  navigation.classList.toggle('open', open);
});
$$('a', navigation).forEach(a => a.addEventListener('click', closeMenu));
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
document.addEventListener('click', e => { if (!e.target.closest('.site-header')) closeMenu(); });
window.addEventListener('resize', () => { if (window.innerWidth > 700) closeMenu(); });

$$('[data-filter]').forEach(button => button.addEventListener('click', () => {
  const filter = button.dataset.filter;
  $$('[data-filter]').forEach(b => {
    b.classList.toggle('active', b === button);
    b.setAttribute('aria-pressed', String(b === button));
  });
  let count = 0;
  $$('.resource').forEach(card => {
    card.hidden = filter !== 'all' && card.dataset.category !== filter;
    if (!card.hidden) count++;
  });
  $('.note-count').textContent = `${String(count).padStart(2, '0')} ${count === 1 ? 'NOTE' : 'NOTES'}`;
}));

let articlesPromise;
function loadArticles() {
  if (!articlesPromise) articlesPromise = fetch('/field-notes.json').then(r => { if (!r.ok) throw new Error('Article unavailable'); return r.json(); });
  return articlesPromise;
}
const dialog = $('#article-dialog');
let lastArticleTrigger = null;
$$('[data-article]').forEach(trigger => trigger.addEventListener('click', async e => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  e.preventDefault();
  let articles;
  try { articles = await loadArticles(); } catch { window.location.assign(trigger.href); return; }
  const article = articles[trigger.dataset.article];
  if (!article) return;
  lastArticleTrigger = trigger;
  $('#article-content').innerHTML = `<div class="eyebrow">${article.category}</div><h2 id="article-title">${article.title}</h2><p class="article-byline">By ${article.author} · ${article.editorialStatus} · ${article.date}</p>${article.body}<p class="article-permalink"><a href="${article.path}">Open this note on its own page ↗</a></p>`;
  $('.dialog-top .mono').textContent = trigger.dataset.article === 'privacy' ? 'EMBRACE / ABOUT THIS PREVIEW' : 'EMBRACE / FIELD NOTES';
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  $('.dialog-top .close-dialog').focus();
}));
$$('.close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { document.body.style.overflow = ''; lastArticleTrigger?.focus({ preventScroll: true }); });

const markets = { dc: 'Washington, DC', md: 'Maryland', va: 'Virginia' };
const priorities = {
  visibility: {
    question: 'Can the right customers find us?',
    steps: [
      'Record the local search journey for your chosen service in each ZIP code. Keep the query, search context, source, and checked date with every observation.',
      'Compare the business profile and service pages with your actual offer and coverage. Identify what is clear and what needs confirmation.',
      'Choose one evidenced gap to investigate first. Assign a next action, an owner, and a review date before describing a result.'
    ]
  },
  operations: {
    question: 'What happens after customers find us?',
    steps: [
      'Follow the service-page-to-contact route for each part of your territory. Record the steps, device, checked date, and any questions a visitor still has.',
      'Using authorized internal records, trace one inquiry through the business. Identify the next owner and the information needed at each handoff.',
      'Choose one transition to investigate first. State who acts next, what completion looks like, and when to review the change.'
    ]
  }
};
const form = $('#brief-form');
const result = $('#brief-result');
const zipInputs = [1,2,3,4].map(i => $('#zip-' + i));
const websiteInput = $('#business-website');
let currentBrief = null;
$('.planner-submit').disabled = false;

zipInputs.forEach(input => input.addEventListener('input', () => {
  zipInputs.forEach(field => field.setCustomValidity(''));
}));
websiteInput.addEventListener('input', () => websiteInput.setCustomValidity(''));

form.addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(form);
  const zips = zipInputs.map(input => input.value.trim());
  for (let i = 0; i < zips.length; i++) {
    if (!/^\d{5}$/.test(zips[i])) {
      zipInputs[i].setCustomValidity('Enter a five-digit ZIP code.');
      zipInputs[i].reportValidity();
      return;
    }
    if (zips.indexOf(zips[i]) !== i) {
      zipInputs[i].setCustomValidity('Use four different ZIP codes.');
      zipInputs[i].reportValidity();
      return;
    }
  }
  const website = websiteInput.value.trim();
  if (website) {
    try {
      const parsed = new URL(website);
      if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname.includes('.')) throw new Error('Unsupported URL');
    } catch {
      websiteInput.setCustomValidity('Enter a complete business website beginning with https:// or http://.');
      websiteInput.reportValidity();
      return;
    }
  }
  const market = data.get('market');
  const priority = priorities[data.get('priority')];
  if (!markets[market] || !priority) return;
  currentBrief = {
    business: String(data.get('business') || '').trim(),
    website, market: markets[market], zips,
    service: String(data.get('service')), question: priority.question,
    steps: priority.steps
  };
  $('#result-market').textContent = currentBrief.market.toUpperCase();
  $('#result-title').textContent = currentBrief.business ? `${currentBrief.business}: your scope is ready.` : 'Your four-ZIP scope is ready.';
  $('#result-intro').textContent = `${currentBrief.service} · ${currentBrief.market}. Start with the territory below, then collect the evidence before choosing an action.`;
  $('#result-zips').replaceChildren(...zips.map(zip => { const span = document.createElement('span'); span.textContent = zip; return span; }));
  $('#result-question').textContent = 'Your question: ' + priority.question;
  $('#result-steps').replaceChildren(...priority.steps.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  const subject = `Four-ZIP Market Brief${currentBrief.business ? ' — '+currentBrief.business : ''}`;
  const body = `Hi Max,\n\nI would like to discuss a Four-ZIP Market Brief.\n\nBusiness: ${currentBrief.business || 'To discuss'}\nWebsite: ${currentBrief.website || 'To discuss'}\nStarting market: ${currentBrief.market}\nZIP codes: ${zips.join(', ')}\nService focus: ${currentBrief.service}\nQuestion: ${priority.question}\n\nCan we discuss the proposed scope, fee, and timing? This is a review scope; observations have not yet been collected.\n\nThanks`;
  $('#email-brief').href = `mailto:max@maxfisher.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  form.hidden = true;
  result.hidden = false;
  $('#result-title').focus({ preventScroll: true });
  $('.planner-card').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});

$('#restart-brief').addEventListener('click', () => {
  result.hidden = true;
  form.hidden = false;
  zipInputs[0].focus({ preventScroll: true });
});

let toastTimeout;
function toast(message) {
  clearTimeout(toastTimeout);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}

$('#download-brief').addEventListener('click', () => {
  if (!currentBrief) return;
  const b = currentBrief;
  const logs = b.zips.map(zip => `## Research area: ZIP ${zip}\n\n- Service coverage confirmed: [ ]\n- Query or customer-journey steps: \n- Source URL / authorized record: \n- Checked date and context: \n- What was observed: \n- What remains unknown: \n- Proposed next action: \n- Person responsible: \n- Review date: \n`).join('\n');
  const text = `# Embrace Insight — FOUR-ZIP MARKET BRIEF\n\nResearch scope · observations pending\nCreated: ${new Date().toISOString().slice(0,10)}\n\nBusiness: ${b.business || 'To be added'}\nWebsite: ${b.website || 'To be added'}\nStarting market: ${b.market}\nZIP codes: ${b.zips.join(', ')}\nService focus: ${b.service}\n\n## The question\n\n${b.question}\n\n## What to investigate\n\n${b.steps.map((step,i)=>`${i+1}. ${step}`).join('\n\n')}\n\n${logs}\n## One decision after the evidence review\n\n- Finding and supporting source: \n- Why it matters to the chosen question: \n- Evidence still missing: \n- Next action: \n- Owner: \n- Review date: \n\n## Research references\n\nGoogle Business Profile local ranking guidance:\nhttps://support.google.com/business/answer/7091?hl=en\n\nSBA market research and competitive analysis:\nhttps://www.sba.gov/counseling/plan-your-business/#market-research-and-competitive-analysis\n\n## Scope and status\n\nThis worksheet was generated from your inputs in your browser. It is a research scope, not a completed audit, live ranking report, geographic validation, verified lead list, engineering assessment, or compliance determination. ZIP codes were checked for format and uniqueness only. The four-ZIP boundary is Embrace Insight's proposed scoping method, not an official ranking rule.\n\nTo discuss a researched review, contact Max Fisher: max@maxfisher.net. Scope, fee, and timing require agreement. No email has been sent by this site.\n`;
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'embrace-four-zip-market-brief.md';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('Your four-ZIP worksheet is ready to save.');
});
