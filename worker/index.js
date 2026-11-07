const CONSENT_VERSION = 'mbrace-capture-2026-10-29-v1';
const NEWSLETTER_CONSENT = 'Yes, send me the MBRACE INSIGHT newsletter. I can unsubscribe at any time.';
const REQUEST_CONSENT = 'You may email me about this page-clearance request.';
const RESOURCE_CONSENT = 'Use my email to handle this resource request. Newsletter signup is a separate choice.';
const DAY = 86400000;
const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const checked = value => value === true || value === 'on' || value === 'true';
const short = (value, max = 180) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const encodeToken = bytes => btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
const newToken = () => encodeToken(crypto.getRandomValues(new Uint8Array(32)));
const sha256 = async value => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'}});
}
function page(title, body, status = 200) {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escapeHTML(title)} | MBRACE INSIGHT</title><link rel="stylesheet" href="/styles.css"></head><body><main class="utility-page container"><a class="brand" href="/">MBRACE INSIGHT</a><h1>${escapeHTML(title)}</h1>${body}<p class="utility-back"><a href="/">← Back to the website</a></p></main></body></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store','referrer-policy':'same-origin','x-robots-tag':'noindex, nofollow','x-content-type-options':'nosniff'}});
}
function hasOwner(request, env) {
  const email = request.headers.get('oai-authenticated-user-email')?.toLowerCase();
  const userID = request.headers.get('oai-authenticated-user-id');
  return !!userID && !!email && !!env.ADMIN_EMAIL && email === env.ADMIN_EMAIL.toLowerCase();
}
function sameOrigin(request, env) {
  const origin = request.headers.get('origin');
  const allowed = env.SITE_ORIGIN || new URL(request.url).origin;
  return origin === allowed && request.headers.get('sec-fetch-site') !== 'cross-site';
}
async function bodyOf(request) {
  if (Number(request.headers.get('content-length') || 0) > 8192) throw new Error('Request is too large.');
  const text = await request.text();
  if (text.length > 8192) throw new Error('Request is too large.');
  if (request.headers.get('content-type')?.includes('application/json')) return JSON.parse(text);
  return Object.fromEntries(new URLSearchParams(text));
}
function validPageURL(value) {
  try {
    const url = new URL(value);
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) return false;
    if (/^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(url.hostname) || /\.(local|internal|invalid)$/.test(url.hostname)) return false;
    return true;
  } catch { return false; }
}
async function throttle(request, env) {
  const windowStart = Math.floor(Date.now() / 900000) * 900000;
  const key = await sha256((request.headers.get('cf-connecting-ip') || 'local')+'|'+windowStart);
  await env.DB.prepare('INSERT INTO rate_limits (key, window_start, hits) VALUES (?, ?, 1) ON CONFLICT(key) DO UPDATE SET hits = rate_limits.hits + 1').bind(key,windowStart).run();
  const row = await env.DB.prepare('SELECT hits FROM rate_limits WHERE key = ?').bind(key).first();
  return row.hits <= 40;
}
async function capture(request, env) {
  if (!sameOrigin(request,env)) return json({ok:false,error:'This form must be submitted from this website.'},403);
  if (!env.DB) return json({ok:false,error:'Signup could not be saved. Please try again later.'},503);
  let input;
  try { input = await bodyOf(request); } catch { return json({ok:false,error:'Check the form and try again.'},400); }
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ok:false,error:'Check the form and try again.'},400);
  if (short(input.company_website)) return json({ok:false,error:'Unable to save this request.'},400);
  const type = short(input.type,20);
  const email = short(input.email,255).toLowerCase();
  if (!['review','resource','newsletter'].includes(type)) return json({ok:false,error:'Choose a valid signup type.'},400);
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ok:false,error:'Enter a valid email address.'},400);
  const optIn = checked(input.newsletter_opt_in);
  const contactConsent = checked(input.request_contact_consent);
  const pageURL = short(input.page_url,1000);
  const query = short(input.target_query,180);
  const asset = type === 'resource' ? short(input.asset,60) : type === 'review' ? 'six-gate-checklist' : null;
  if (type === 'newsletter' && !optIn) return json({ok:false,error:'Please choose the newsletter opt-in before subscribing.'},400);
  if (type === 'review' && (!validPageURL(pageURL) || !query || !contactConsent)) return json({ok:false,error:'Enter a public page URL, a target query, and permission to contact you about the request.'},400);
  if (asset && !Object.hasOwn(__DOWNLOAD_ASSETS__,asset)) return json({ok:false,error:'This resource is unavailable.'},400);
  if (!await throttle(request,env)) return json({ok:false,error:'Too many requests. Please try again later.'},429);
  const created = new Date().toISOString();
  const contactID = crypto.randomUUID();
  const requestID = crypto.randomUUID();
  const isTest = email.endsWith('.invalid') ? 1 : 0;
  const token = newToken();
  const tokenHash = await sha256(token);
  const downloadToken = asset ? newToken() : null;
  const source = short(input.source,64).replace(/[^a-zA-Z0-9_-]/g,'') || 'website';
  const consentText = [type==='review' ? REQUEST_CONSENT : type==='resource' ? RESOURCE_CONSENT : '',optIn ? NEWSLETTER_CONSENT : ''].filter(Boolean).join('\n');
  const statements = [
    env.DB.prepare('INSERT INTO contacts (id,email,first_seen,last_seen,is_test) VALUES (?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET last_seen=excluded.last_seen').bind(contactID,email,created,created,isTest),
    env.DB.prepare('INSERT INTO capture_events (id,contact_id,event_type,asset_id,page_url,target_query,source,utm_source,utm_campaign,newsletter_requested,request_contact_consent,consent_version,consent_text,created_at,status,is_test) VALUES (?,(SELECT id FROM contacts WHERE email=?),?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(requestID,email,type,asset,type==='review'?pageURL:null,type==='review'?query:null,source,short(input.utm_source,80)||null,short(input.utm_campaign,80)||null,optIn?1:0,contactConsent?1:0,CONSENT_VERSION,consentText,created,type==='review'?'review_requested':'recorded',isTest),
    env.DB.prepare('INSERT INTO access_tokens (token_hash,contact_id,asset_id,kind,created_at,expires_at) VALUES (?,(SELECT id FROM contacts WHERE email=?),NULL,?,?,?)').bind(tokenHash,email,'preferences',created,new Date(Date.now()+365*DAY).toISOString())
  ];
  if (optIn) statements.push(env.DB.prepare("UPDATE contacts SET newsletter_status=CASE WHEN newsletter_status='confirmed' THEN 'confirmed' ELSE 'pending_confirmation' END,newsletter_requested_at=?,suppressed_at=NULL WHERE email=?").bind(created,email));
  if (asset) statements.push(env.DB.prepare('INSERT INTO access_tokens (token_hash,contact_id,asset_id,kind,created_at,expires_at) VALUES (?,(SELECT id FROM contacts WHERE email=?),?,?,?,?)').bind(await sha256(downloadToken),email,asset,'download',created,new Date(Date.now()+3*DAY).toISOString()));
  await env.DB.batch(statements);
  const data = {
    ok:true, request_id:requestID,
    message:type==='review'?'Your clearance request has been recorded. The review has not run yet.':type==='newsletter'?'Your email is saved for the Montgomery County briefing.':'Your resource is ready and your request has been recorded.',
    newsletter_requested:optIn,
    newsletter_status:optIn?'pending_confirmation':'not_requested_in_this_request',
    email_sent:false,
    preview_note:null,
    download_url:asset?`/download/${asset}?token=${downloadToken}`:null,
    preferences_url:`/preferences?token=${token}`
  };
  if (request.headers.get('accept')?.includes('text/html') && !request.headers.get('content-type')?.includes('application/json')) {
    return page('Request saved',`<p>${escapeHTML(data.message)}</p>${data.download_url?`<p><a class="button button-dark" href="${escapeHTML(data.download_url)}">Download your resource ↓</a></p>`:''}${data.preview_note?`<p>${escapeHTML(data.preview_note)}</p>`:''}<p><a href="${escapeHTML(data.preferences_url)}">Manage newsletter preferences</a></p>`);
  }
  return json(data,201);
}
async function tokenRow(env, token, kind, asset = null) {
  if (!env.DB || !/^[A-Za-z0-9_-]{43}$/.test(token || '')) return null;
  const row = await env.DB.prepare('SELECT * FROM access_tokens WHERE token_hash=? AND kind=? AND expires_at>?').bind(await sha256(token),kind,new Date().toISOString()).first();
  return row && (!asset || row.asset_id===asset) ? row : null;
}
async function preferences(request, env) {
  const token = new URL(request.url).searchParams.get('token');
  const row = await tokenRow(env,token,'preferences');
  if (!row) return page('Link unavailable','<p>This preference link is invalid or expired. Contact mfisher@mbraceinsight.com for help.</p>',400);
  const contact = await env.DB.prepare('SELECT newsletter_status FROM contacts WHERE id=?').bind(row.contact_id).first();
  return page('Newsletter preferences',`<p>Current status: <strong>${escapeHTML(contact.newsletter_status.replaceAll('_',' '))}</strong>.</p><p>You can stop newsletter signup or future newsletter delivery here.</p><form method="post" action="/api/preferences"><input type="hidden" name="token" value="${escapeHTML(token)}"><button class="button button-dark" type="submit">Unsubscribe / withdraw newsletter request</button></form>`);
}
async function withdraw(request, env) {
  if (!sameOrigin(request,env)) return json({ok:false,error:'Invalid form origin.'},403);
  const input = await bodyOf(request);
  const row = await tokenRow(env,short(input.token,60),'preferences');
  if (!row) return json({ok:false,error:'Preference link is invalid or expired.'},400);
  const contact = await env.DB.prepare('SELECT is_test FROM contacts WHERE id=?').bind(row.contact_id).first();
  const at = new Date().toISOString();
  await env.DB.batch([
    env.DB.prepare("UPDATE contacts SET newsletter_status='unsubscribed',suppressed_at=?,last_seen=? WHERE id=?").bind(at,at,row.contact_id),
    env.DB.prepare("INSERT INTO capture_events (id,contact_id,event_type,source,newsletter_requested,request_contact_consent,consent_version,consent_text,created_at,status,is_test) VALUES (?,?,'newsletter_withdrawal','preferences',0,0,?,?,?,'recorded',?)").bind(crypto.randomUUID(),row.contact_id,CONSENT_VERSION,'Newsletter request or subscription withdrawn through the preference form.',at,contact.is_test)
  ]);
  if (request.headers.get('content-type')?.includes('application/json')) return json({ok:true,message:'Newsletter preference updated.'});
  return page('Preference updated','<p>Your newsletter request has been withdrawn. This address is marked unsubscribed in this list.</p>');
}
const csvCell = value => '"'+String(value ?? '').replace(/^[=+\-@]/,"'$&").replaceAll('"','""')+'"';
async function admin(request, env) {
  if (!hasOwner(request,env)) return page('Owner access required','<p>Sign in with the site owner’s ChatGPT account to view the email list.</p><p><a href="/signin-with-chatgpt?return_to=%2Fadmin" target="_top">Sign in with ChatGPT</a></p>',403);
  if (!env.DB) return page('List unavailable','<p>The contact database is not available.</p>',503);
  const url = new URL(request.url);
  if (url.pathname === '/admin/export.csv') {
    const view = url.searchParams.get('view') || 'all';
    const query = view==='reviews' ? "SELECT c.email,e.page_url,e.target_query,e.source,e.created_at,e.status,e.request_contact_consent FROM capture_events e JOIN contacts c ON c.id=e.contact_id WHERE e.event_type='review' AND c.is_test=0 ORDER BY e.created_at DESC LIMIT 5000" : `SELECT c.email,c.newsletter_status,c.first_seen,c.last_seen,GROUP_CONCAT(DISTINCT e.asset_id) AS asset_sources,GROUP_CONCAT(DISTINCT e.source) AS signup_sources FROM contacts c LEFT JOIN capture_events e ON e.contact_id=c.id WHERE c.is_test=0 ${view==='newsletter'?"AND c.newsletter_status IN ('pending_confirmation','confirmed')":''} GROUP BY c.id ORDER BY c.last_seen DESC LIMIT 5000`;
    const rows = (await env.DB.prepare(query).all()).results;
    const keys = rows.length?Object.keys(rows[0]):view==='reviews'?['email','page_url','target_query','source','created_at','status','request_contact_consent']:['email','newsletter_status','first_seen','last_seen','asset_sources','signup_sources'];
    const csv = [keys.map(csvCell).join(','),...rows.map(row=>keys.map(key=>csvCell(row[key])).join(','))].join('\r\n');
    return new Response('\ufeff'+csv,{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':`attachment; filename="mbrace-${view}-contacts.csv"`,'cache-control':'no-store','x-robots-tag':'noindex,nofollow'}});
  }
  const counts = await env.DB.prepare("SELECT COUNT(*) AS contacts,SUM(CASE WHEN newsletter_status='pending_confirmation' THEN 1 ELSE 0 END) AS newsletter_requests,SUM(CASE WHEN newsletter_status='unsubscribed' THEN 1 ELSE 0 END) AS unsubscribed FROM contacts WHERE is_test=0").first();
  const requests = await env.DB.prepare("SELECT COUNT(*) AS total FROM capture_events WHERE event_type='review' AND is_test=0").first();
  return page('Your email list',`<p>Contacts: <strong>${counts.contacts}</strong> · Newsletter requests pending confirmation: <strong>${counts.newsletter_requests||0}</strong> · Review requests: <strong>${requests.total}</strong></p><p>Newsletter delivery is not connected. Do not treat pending requests as verified email addresses. Resource requests without newsletter opt-in are not newsletter subscribers.</p><div class="admin-actions"><a class="button button-dark" href="/admin/export.csv?view=all">Export all contacts ↓</a><a class="button button-email" href="/admin/export.csv?view=newsletter">Export newsletter requests ↓</a><a class="button button-email" href="/admin/export.csv?view=reviews">Export clearance queue ↓</a></div><p>Exports contain at most 5,000 rows. Reserved .invalid test addresses are excluded. Subscriber and consent records can also be inspected in Sites Settings.</p>`);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    try {
      if (url.pathname==='/api/capture' && request.method==='POST') return await capture(request,env);
      if (url.pathname==='/api/preferences' && request.method==='POST') return await withdraw(request,env);
      if (url.pathname==='/preferences' && request.method==='GET') return await preferences(request,env);
      if (url.pathname==='/admin' || url.pathname==='/admin/export.csv') return await admin(request,env);
      if (url.pathname.startsWith('/download/') && request.method==='GET') {
        const id = url.pathname.slice('/download/'.length);
        const asset = __DOWNLOAD_ASSETS__[id];
        if (!asset || !await tokenRow(env,url.searchParams.get('token'),'download',id)) return page('Download link unavailable','<p>Request this resource again to get a fresh download link.</p>',403);
        return new Response(asset.body,{headers:{'content-type':'text/markdown; charset=utf-8','content-disposition':`attachment; filename="${id}.md"`,'cache-control':'no-store','x-robots-tag':'noindex,nofollow','referrer-policy':'no-referrer'}});
      }
      if (!['GET','HEAD'].includes(request.method)) return json({ok:false,error:'Method not allowed.'},405);
      const key = url.pathname.endsWith('/index.html')?url.pathname.slice(0,-10):url.pathname;
      const asset = __SITE_ASSETS__[key] || __SITE_ASSETS__[key+'/'];
      if (!asset) return page('Page not found','<p>This page is not available.</p>',404);
      const bytes = Uint8Array.from(atob(asset.body),c=>c.charCodeAt(0));
      const mutable=['text/html','text/css','text/javascript','application/json'].some(type=>asset.type.startsWith(type));
      return new Response(request.method==='HEAD'?null:bytes,{headers:{'content-type':asset.type,'cache-control':mutable?'no-cache':'public,max-age=3600','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'}});
    } catch (error) {
      console.error('Request failed',error?.name || 'Error');
      return json({ok:false,error:'Your request could not be saved. Please try again later.'},503);
    }
  }
};
