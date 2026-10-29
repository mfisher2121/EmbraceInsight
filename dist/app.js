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

const tabs = $$('[role="tab"]');
function selectTab(tab, focus = false) {
  tabs.forEach(t => {
    const active = t === tab;
    t.setAttribute('aria-selected', String(active));
    t.tabIndex = active ? 0 : -1;
    $('#' + t.getAttribute('aria-controls')).hidden = !active;
  });
  if (focus) tab.focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', e => {
    let next;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') next = tabs[(index + 1) % tabs.length];
    if (e.key === 'Home') next = tabs[0];
    if (e.key === 'End') next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); selectTab(next, true); }
  });
});

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
  $('.dialog-top .mono').textContent = trigger.dataset.article === 'privacy' ? 'MBRACE / ABOUT THIS PREVIEW' : 'MBRACE / FIELD NOTES';
  dialog.showModal();
  dialog.scrollTop = 0;
  document.body.style.overflow = 'hidden';
  $('.dialog-top .close-dialog').focus();
}));
$$('.close-dialog').forEach(button => button.addEventListener('click', () => dialog.close()));
dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { document.body.style.overflow = ''; lastArticleTrigger?.focus({ preventScroll: true }); });

const markets = { dc: 'Washington, DC', md: 'Maryland', va: 'Virginia' };
const plans = {
  visibility: {
    title: 'Own a smaller part of the map.',
    intro: 'Start with a focused view of your service area. Learn what a potential customer sees before changing everything at once.',
    steps: [
      'Choose four ZIP codes you can serve reliably. Record your core services, drive-time boundaries, and the type of work you want to understand.',
      'Follow the search-to-contact journey in each area. Record the date and search context, then compare your website, business profile, and contact route.',
      'Choose one observed gap to improve. Record the change and a consistent way to assess it before claiming an improvement.'
    ]
  },
  commercial: {
    title: 'Qualify the opportunity. Then the fit.',
    intro: 'Begin with what your team can deliver. Use that capability to decide which building signals deserve a closer look.',
    steps: [
      'Document your commercial capabilities: system types, comparable projects, relevant credentials, service coverage, and current capacity.',
      'For each building you investigate, keep its exact identity, source, reporting period, and checked date. Separate observations from ownership, need, or procurement assumptions.',
      'Confirm scope, authority, stage, timing, and permission with an authorized representative before treating the record as an opportunity or making an introduction.'
    ]
  },
  operations: {
    title: 'Make the next handoff obvious.',
    intro: 'Look inside one customer journey. Find the point where the next action stops being clear to your team.',
    steps: [
      'Using authorized internal records, trace one inquiry from first contact to its most recent outcome. Record what happened and when.',
      'At each handoff, identify the responsible person, the information they need, the next action, and the event that confirms completion.',
      'Choose one transition to improve. Give it an owner and a review date, then assess it with the same method before expanding the change.'
    ]
  }
};
let currentBrief = null;
const form = $('#brief-form');
const result = $('#brief-result');
$('.planner-submit').disabled = false;
form.addEventListener('submit', e => {
  e.preventDefault();
  const data = new FormData(form);
  const market = data.get('market');
  const priority = data.get('priority');
  const plan = plans[priority];
  if (!plan || !markets[market]) return;
  currentBrief = { market: markets[market], ...plan };
  $('#result-market').textContent = currentBrief.market.toUpperCase();
  $('#result-title').textContent = plan.title;
  $('#result-intro').textContent = plan.intro;
  $('#result-steps').replaceChildren(...plan.steps.map(text => { const li = document.createElement('li'); li.textContent = text; return li; }));
  form.hidden = true;
  result.hidden = false;
  $('#result-title').focus({ preventScroll: true });
  $('#your-next-move').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
});
function showBriefForm() {
  result.hidden = true;
  form.hidden = false;
}
$('#restart-brief').addEventListener('click', () => { showBriefForm(); $('input:checked', form).focus({ preventScroll: true }); });
$$('[data-focus]').forEach(button => button.addEventListener('click', () => {
  showBriefForm();
  $(`input[name="priority"][value="${button.dataset.focus}"]`, form).checked = true;
  $('#your-next-move').scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
}));
let toastTimeout;
function toast(message) {
  clearTimeout(toastTimeout);
  $('#toast').textContent = message;
  $('#toast').hidden = false;
  toastTimeout = setTimeout(() => { $('#toast').hidden = true; }, 5000);
}
$('#download-brief').addEventListener('click', () => {
  if (!currentBrief) return;
  const text = `MBRACE INSIGHT | YOUR STARTING BRIEF\n\nMarket focus: ${currentBrief.market}\n\n${currentBrief.title}\n\n${currentBrief.intro}\n\n${currentBrief.steps.map((s, i) => `${i + 1}. ${s}`).join('\n\n')}\n\nReview date: __________________\nOwner of next action: __________________\n\nABOUT THIS BRIEF\nThis is a planning framework based only on your selections. It is not a site audit, live market research, engineering or compliance advice, or a verified project opportunity. Market selection labels the territory to investigate; the plan does not contain jurisdiction-specific rules.\n\nCreated in your browser. Your selections were not sent to MBRACE.\nWebsite concept for private review.\n`;
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'mbrace-insight-starting-brief.txt';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  toast('Your starting brief is ready to save.');
});
