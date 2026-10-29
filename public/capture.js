'use strict';
const q = (selector, root=document) => root.querySelector(selector);
const qa = (selector, root=document) => [...root.querySelectorAll(selector)];
const menu = q('.menu-toggle');
const nav = q('#navigation');
function closeMenu(){if(!menu)return;menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Open navigation');nav.classList.remove('open');}
menu?.addEventListener('click',()=>{const open=menu.getAttribute('aria-expanded')!=='true';menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');nav.classList.toggle('open',open);});
qa('a',nav||document).forEach(link=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu();});
document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});

function safeLink(path, text, className='text-link'){
  const anchor=document.createElement('a');
  const url=new URL(path,location.origin);
  if(url.origin!==location.origin)throw new Error('Unexpected response link.');
  anchor.href=url.pathname+url.search;
  anchor.textContent=text;
  anchor.className=className;
  return anchor;
}
qa('[data-capture-form]').forEach(form=>form.addEventListener('submit',async event=>{
  event.preventDefault();
  const button=q('button[type="submit"]',form);
  const error=q('.form-error',form);
  const original=button.innerHTML;
  error.hidden=true;
  button.disabled=true;
  button.textContent='Saving your request…';
  const payload=Object.fromEntries(new FormData(form));
  const search=new URLSearchParams(location.search);
  payload.utm_source=search.get('utm_source')||'';
  payload.utm_campaign=search.get('utm_campaign')||'';
  try{
    const response=await fetch('/api/capture',{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},credentials:'same-origin',body:JSON.stringify(payload)});
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error||'We could not save your request. Please try again.');
    const result=q('.capture-result',form.parentElement);
    const title=document.createElement('h3');
    title.textContent=payload.type==='resource'?'Your resource is ready.':payload.type==='newsletter'?'Your newsletter request is saved.':'Your clearance request is saved.';
    const message=document.createElement('p');message.textContent=data.message;
    result.replaceChildren(title,message);
    if(data.download_url)result.append(safeLink(data.download_url,'Download your resource ↓','button button-dark'));
    if(data.preview_note){const note=document.createElement('p');note.className='capture-preview-note';note.textContent=data.preview_note;result.append(note);}
    if(payload.type==='review'){const status=document.createElement('p');status.className='capture-preview-note';status.textContent='Request recorded · evidence review pending. No report or email has been sent automatically.';result.append(status);}
    if(data.preferences_url)result.append(safeLink(data.preferences_url,'Manage newsletter preferences ↗'));
    form.hidden=true;result.hidden=false;result.focus({preventScroll:true});
  }catch(reason){error.textContent=reason.message||'We could not save your request. Please try again.';error.hidden=false;error.focus?.();}
  finally{button.disabled=false;button.innerHTML=original;}
}));

const resourceDialog=q('#resource-dialog');
if(resourceDialog){
  const resources=JSON.parse(q('#resources-metadata').textContent);
  let trigger=null;
  qa('[data-resource]').forEach(link=>link.addEventListener('click',event=>{
    if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const resource=resources.find(item=>item.id===link.dataset.resource);
    if(!resource)return;
    event.preventDefault();trigger=link;
    const form=q('form',resourceDialog);form.reset();form.hidden=false;
    q('.form-error',form).hidden=true;
    const result=q('.capture-result',resourceDialog);result.hidden=true;result.replaceChildren();
    q('#resource-title').textContent=resource.title;
    q('#resource-description').textContent=resource.description;
    q('#resource-asset').value=resource.id;
    resourceDialog.showModal();document.body.style.overflow='hidden';q('#resource-email').focus();
  }));
  qa('.close-resource').forEach(button=>button.addEventListener('click',()=>resourceDialog.close()));
  resourceDialog.addEventListener('close',()=>{document.body.style.overflow='';trigger?.focus({preventScroll:true});});
}
