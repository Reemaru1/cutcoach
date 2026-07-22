'use strict';
(function(){
  const ICONS={
    today:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h10a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M8 3.5v17M10.5 9l1.5 1.5L15.5 7"/></svg></span><span class="cc-nav-label">Tagebuch</span>',
    progress:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V9M10 18V5M16 18v-7M22 18V3"/><path d="m3 8 5-3 5 4 7-6"/></svg></span><span class="cc-nav-label">Fortschritt</span>',
    settings:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19 15.2l1.1 1.7-2.2 2.2-1.7-1.1a7.8 7.8 0 0 1-1.8.8L14 21h-4l-.4-2.2a7.8 7.8 0 0 1-1.8-.8l-1.7 1.1-2.2-2.2L5 15.2a7.8 7.8 0 0 1-.8-1.8L2 13v-2l2.2-.4A7.8 7.8 0 0 1 5 8.8L3.9 7.1l2.2-2.2L7.8 6a7.8 7.8 0 0 1 1.8-.8L10 3h4l.4 2.2a7.8 7.8 0 0 1 1.8.8l1.7-1.1 2.2 2.2L19 8.8a7.8 7.8 0 0 1 .8 1.8L22 11v2l-2.2.4a7.8 7.8 0 0 1-.8 1.8Z"/></svg></span><span class="cc-nav-label">Einstellungen</span>',
    plus:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span>'
  };
  let observer;
  function activateFood(){
    const existing=document.querySelector('nav[aria-label="Hauptnavigation"] [data-tab="food"]');
    if(existing){existing.click();return}
    const target=document.querySelector('[data-screen="food"]');
    const current=document.querySelector('nav[aria-label="Hauptnavigation"] .active');
    if(!target)return;
    document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen===target));
    document.querySelectorAll('nav[aria-label="Hauptnavigation"] [data-tab]').forEach(button=>{button.classList.remove('active');button.setAttribute('aria-current','false')});
    current?.classList.remove('active');
    history.replaceState(null,'','#food');
    window.scrollTo({top:0,behavior:'auto'});
  }
  function apply(){
    const nav=document.querySelector('body>nav[aria-label="Hauptnavigation"]');
    if(!nav)return false;
    const today=nav.querySelector('[data-tab="today"]');
    const progress=nav.querySelector('[data-tab="progress"]');
    const settings=nav.querySelector('[data-tab="settings"]');
    if(!today||!progress||!settings)return false;
    nav.classList.add('cc-staging-nav');
    document.body.classList.add('cc-staging-nav-active');
    const decorate=(button,icon,label)=>{
      if(!button.querySelector('.cc-nav-icon'))button.innerHTML=icon;
      if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
    };
    decorate(today,ICONS.today,'Tagebuch öffnen');
    decorate(progress,ICONS.progress,'Fortschritt öffnen');
    decorate(settings,ICONS.settings,'Einstellungen öffnen');
    let plus=nav.querySelector('.cc-staging-plus');
    if(!plus){
      plus=document.createElement('button');plus.type='button';plus.className='cc-staging-plus';plus.setAttribute('aria-label','Ernährungsbereich öffnen');plus.innerHTML=ICONS.plus;plus.addEventListener('click',activateFood);nav.appendChild(plus);
    }
    const food=nav.querySelector('[data-tab="food"]');if(food)food.hidden=true;
    return true;
  }
  function start(){
    apply();
    observer=new MutationObserver(()=>apply());
    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('pageshow',apply);
    window.addEventListener('pagehide',()=>observer?.disconnect(),{once:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)apply()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
