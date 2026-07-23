'use strict';
(function(){
  const VERSION='1.3.7-alpha';
  const ICONS={
    today:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h10a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M8 3.5v17M10.5 9l1.5 1.5L15.5 7"/></svg></span><span class="cc-nav-label">Tagebuch</span>',
    progress:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V9M10 18V5M16 18v-7M22 18V3"/><path d="m3 8 5-3 5 4 7-6"/></svg></span><span class="cc-nav-label">Fortschritt</span>',
    food:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="cc-nav-label">Ernährung</span>',
    settings:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg></span><span class="cc-nav-label">Profil</span>'
  };
  function addStyle(key,href){
    let link=document.querySelector(`link[data-${key}]`);
    if(link){if(link.getAttribute('href')!==href)link.setAttribute('href',href);return link}
    link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset[key.replace(/-([a-z])/g,(_,char)=>char.toUpperCase())]='1';document.head.append(link);return link;
  }
  function addScript(key,src){
    let script=document.querySelector(`script[data-${key}]`);
    if(script)return script;
    script=document.createElement('script');script.src=src;script.async=false;script.dataset[key.replace(/-([a-z])/g,(_,char)=>char.toUpperCase())]='1';document.head.append(script);return script;
  }
  function isDomTest(){if(!document.defaultView)return true;try{return location.hostname==='example.test'||(typeof navigator==='object'&&/jsdom/i.test(navigator.userAgent||''))}catch{return true}}
  function ensureProductionUi(){
    if(isDomTest())return;
    addStyle('nutrition-ui-consistency-v206','./nutrition-ui-consistency-v206.css?v=2.0.9-loader');
    addStyle('liquid-glass-ui-v207','./liquid-glass-ui-v207.css?v=2.0.8-loader');
    addStyle('scrollbar-cleanup-v209','./scrollbar-cleanup-v209.css?v=2.0.9-alpha');
    if(!window.CutCoachNutritionMath206)addScript('nutrition-ui-consistency-v206','./nutrition-ui-consistency-v206.js?v=2.0.9-loader');
  }
  function replaceHash(hash){
    try{const url=new URL(location.href);url.hash=hash;history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`)}catch{history.replaceState(null,'',hash)}
  }
  function openNutrition(){
    const trigger=document.querySelector('#journalQuickAdd:not([disabled]),[data-add-journal-meal]:not([disabled])');
    if(trigger){trigger.click();return;}
    if(location.hash!=='#food')replaceHash('#food');
    document.body.classList.remove('journal-mode');document.body.classList.add('nutrition-mode');
    const EventType=globalThis.HashChangeEvent||Event;window.dispatchEvent(new EventType('hashchange'));window.render?.();
  }
  function ensureFoodButton(nav){
    let button=nav.querySelector('[data-tab="food"]');
    if(!button){button=document.createElement('button');button.type='button';button.dataset.tab='food';button.setAttribute('aria-current','false');const settings=nav.querySelector('[data-tab="settings"]');if(settings)nav.insertBefore(button,settings);else nav.appendChild(button)}
    if(button.dataset.glassFoodBound!=='1'){button.dataset.glassFoodBound='1';button.addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();openNutrition()},true)}
    return button;
  }
  function markupIsCurrent(button,key){
    const expectedLabel={today:'Tagebuch',progress:'Fortschritt',food:'Ernährung',settings:'Profil'}[key];
    return button.dataset.glassNavKey===key
      &&button.querySelector('.cc-nav-icon > svg')
      &&button.querySelector('.cc-nav-label')?.textContent===expectedLabel;
  }
  function enhance(){
    ensureProductionUi();
    const nav=document.querySelector('nav[aria-label="Hauptnavigation"]');if(!nav)return false;
    const buttons={today:nav.querySelector('[data-tab="today"]'),progress:nav.querySelector('[data-tab="progress"]'),food:ensureFoodButton(nav),settings:nav.querySelector('[data-tab="settings"]')};
    if(!buttons.today||!buttons.progress||!buttons.settings)return false;
    nav.dataset.glassNavV131='1';nav.dataset.glassNavVersion=VERSION;nav.classList.add('cc-glass-nav-v131');document.body.classList.add('cc-glass-nav-active');
    for(const key of ['today','progress','food','settings']){const button=buttons[key];button.hidden=false;button.style.removeProperty('display');if(!markupIsCurrent(button,key)){button.innerHTML=ICONS[key];button.dataset.glassNavKey=key}button.setAttribute('aria-label',key==='today'?'Tagebuch öffnen':key==='progress'?'Fortschritt öffnen':key==='food'?'Ernährungsbereich öffnen':'Profil öffnen')}
    return true;
  }
  let repairQueued=false;
  function queueRepair(){if(repairQueued)return;repairQueued=true;queueMicrotask(()=>{repairQueued=false;try{enhance()}catch{}})}
  function start(){ensureProductionUi();enhance();const observer=new MutationObserver(records=>{if(records.some(record=>record.type==='childList'))queueRepair()});observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachGlassNavV131=Object.freeze({version:VERSION,enhance,openNutrition,ensureProductionUi});
})();
