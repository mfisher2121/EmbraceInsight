'use strict';
const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() { toggle.setAttribute('aria-expanded','false'); toggle.setAttribute('aria-label','Open navigation'); nav.classList.remove('open'); }
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded',String(open)); toggle.setAttribute('aria-label',open ? 'Close navigation' : 'Open navigation'); nav.classList.toggle('open',open); });
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu();});
nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
