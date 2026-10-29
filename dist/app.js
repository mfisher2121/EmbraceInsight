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

const articles = {
  fourzip: {
    category: 'LOCAL VISIBILITY / 4 MIN READ',
    title: 'Start with four ZIP codes. Not the whole map.',
    body: `<p>A broad service area can make a business feel bigger while making its marketing harder to understand. Before trying to understand an entire region, choose a small part of your territory and look closely.</p><h3>Choose a useful starting area.</h3><p>Pick four ZIP codes you already serve or can serve reliably. Consider drive time, your existing work, and the kinds of systems your team handles. This is a research boundary, not a rule that customers outside it are less valuable.</p><h3>Follow the customer’s questions.</h3><p>For each area, record what a person would need to know: who serves it, which services are clearly explained, and how someone takes the next step. Use a consistent set of search terms. Record the date, search location, and device, because results can vary.</p><h3>Check your own story.</h3><p>Compare your website and business profile with the services you actually deliver. Is the service area accurate? Does the language name the problem you solve? Can a visitor find a working contact route without searching for it?</p><h3>Work on one gap.</h3><p>Choose one observed problem to address, such as an unclear service page or a broken contact path. Keep a record of what changed. Compare the same journey again before claiming that the change improved results.</p><div class="article-takeaway"><p>Take this back to the business: four areas, one repeatable observation sheet, one improvement to test. A manageable market is a better place to learn.</p></div><p class="article-label">Original editorial draft · A planning framework, not a completed market audit.</p>`
  },
  signal: {
    category: 'COMMERCIAL / 3 MIN READ',
    title: 'A building is a signal. A project is a conversation.',
    body: `<p>A public building record can help you decide what to investigate. It cannot tell you, by itself, that the owner wants an HVAC project or is ready to buy.</p><h3>Keep the observation intact.</h3><p>Start with the exact building identity, source, reporting period, and date checked. Preserve building-ID suffixes and separate multiple buildings on the same parcel. If a number is missing or a target conflicts, make the gap visible.</p><h3>Ask what is still unknown.</h3><p>A measured performance gap does not establish noncompliance, a need to replace equipment, an approved budget, or an active procurement. Current ownership, the decision route, system condition, and project intent need their own evidence.</p><h3>Qualify the work and the fit.</h3><p>Before making an introduction, confirm the need with the owner or an authorized representative. Establish project stage, scope, timing, and permission to share details. Then check comparable contractor experience, technical capability, capacity, and availability.</p><div class="article-takeaway"><p>The next useful action may be a question, a document request, or an engineering assessment. A qualified next step is more useful than a confident guess.</p></div><p>Public research starting point: <a href="https://mcbeps.org/" target="_blank" rel="noopener noreferrer">Montgomery County’s building energy performance map ↗</a>. Check the applicable official requirements and building record before drawing conclusions.</p><p class="article-label">Original editorial draft · General research discipline, not engineering or compliance advice.</p>`
  },
  handoff: {
    category: 'OPERATIONS / 3 MIN READ',
    title: 'The next missed opportunity might be in the handoff.',
    body: `<p>Before you look for more inquiries, follow one through the business. A person can be interested, qualified, and ready to talk—and still disappear between two ordinary steps.</p><h3>Trace a real journey.</h3><p>With appropriate internal access, choose a recent inquiry and reconstruct the sequence: first contact, initial reply, qualification, appointment, estimate, and follow-up. Record what happened rather than what the process document says should happen.</p><h3>Name an owner for each step.</h3><p>For every handoff, identify the person responsible, the information they need, and the event that tells them it is their turn. If responsibility is shared, clarify how someone knows the work is complete.</p><h3>Look for a useful gap.</h3><p>Common things to investigate include unanswered questions, missing service details, and unclear follow-up dates. These are questions for your own records, not a diagnosis of every HVAC business.</p><h3>Improve one transition.</h3><p>Choose one change your team can actually maintain. It might be a clearer intake prompt, a named follow-up owner, or a visible appointment status. Decide how you will assess it before declaring success.</p><div class="article-takeaway"><p>Write the handoff in one line: who does what next, by when, using which information, and how the team knows it happened.</p></div><p class="article-label">Original editorial draft · Keep customer records and private information inside authorized business systems.</p>`
  },
  sample: {
    category: 'COMMERCIAL / ILLUSTRATIVE SAMPLE',
    title: 'Before a building becomes an opportunity.',
    body: `<p>This example demonstrates the structure of a commercial research brief. It describes no actual building, owner, contractor, or available project.</p><ul class="sample-list"><li><b>1. The research question</b>Is this building worth a permission-based qualification conversation with an authorized representative?</li><li><b>2. Public evidence to collect</b>Exact building ID, address, reporting period, energy observation, applicable target source, and checked date. Retain any conflicting records.</li><li><b>3. What the record can establish</b>A dated observation from a named source. A comparison is meaningful only when identity, units, reporting period, and target are compatible.</li><li><b>4. What remains unknown</b>Current decision authority, equipment condition, owner intent, project stage, approved scope, budget, procurement route, and timing.</li><li><b>5. Contractor fit to verify</b>Comparable projects, system expertise, commissioning capability, geographic coverage, and confirmed capacity.</li><li><b>6. The next action</b>Confirm the owner’s need and permission, then decide whether a scoped technical assessment or an introduction is appropriate.</li></ul><div class="article-takeaway"><p>A record moves from research to a qualified opportunity when the missing pieces are confirmed. A public performance gap alone does not make that transition.</p></div><p class="article-label">Illustrative structure only · No live lead, compliance determination, or project commitment.</p>`
  },
  privacy: {
    category: 'ABOUT THIS PREVIEW',
    title: 'A private draft. A clear boundary.',
    body: `<p>This is a website concept for MBRACE INSIGHT. Service descriptions and editorial material are drafts for review. The sample brief is illustrative and does not represent a real project or customer result.</p><h3>Your starting brief</h3><p>The interactive planner uses your selections in this browser to create a text download. Its application code does not send those selections to MBRACE, create an account, or subscribe you to a mailing list. It does not save your selections after a reload.</p><h3>Site access and hosting</h3><p>This draft is hosted through Sites with private access. The hosting provider may process technical access information to deliver and protect the site; this page is not a substitute for the provider’s privacy terms.</p><h3>Images and external sources</h3><p>The rooftop photograph is AI-generated illustrative imagery. Fonts are served with the site. External reference links open third-party websites, which have their own practices.</p><h3>Before a public launch</h3><p>Confirm service scope, contact and intake routing, editorial review, privacy terms, and any commercial or referral disclosures. A subscription, live project feed, client dashboard, or CRM connection is not active in this concept.</p>`
  }
};
const dialog = $('#article-dialog');
let lastArticleTrigger = null;
$$('[data-article]').forEach(trigger => trigger.addEventListener('click', () => {
  const article = articles[trigger.dataset.article];
  if (!article) return;
  lastArticleTrigger = trigger;
  $('#article-content').innerHTML = `<div class="eyebrow">${article.category}</div><h2 id="article-title">${article.title}</h2>${article.body}`;
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
