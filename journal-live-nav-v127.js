'use strict';
(function(){
  const VERSION='1.3.0-alpha';
  const $=selector=>document.querySelector(selector);
  let refreshTimer=0,renderWrapped=false,libraryWrapped=false,observer=null;
  const NAV_ITEMS=Object.freeze([
    {key:'today',label:'Tagebuch',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 3.5v17M11.5 9.5l2 2 3.5-4"/></svg>'},
    {key:'progress',label:'Fortschritt',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18.5V12l4 3 4-7 4 3 4-6"/><circle cx="4" cy="18.5" r="1"/><circle cx="8" cy="15" r="1"/><circle cx="12" cy="8" r="1"/><circle cx="16" cy="11" r="1"/><circle cx="20" cy="5" r="1"/></svg>'},
    {key:'food',label:'Ernährung öffnen',central:true,icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'},
    {key:'settings',label:'Einstellungen',icon:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5v-3l-2.2-.7-.7-1.6 1.1-2-2.1-2.1-2 1.1-1.6-.7L10.5 2h-3l-.7 2.2-1.6.7-2-1.1-2.1 2.1 1.1 2-.7 1.6L0 10.5v3l2.2.7.7 1.6-1.1 2 2.1 2.1 2-1.1 1.6.7.7 2.2h3l.7-2.2 1.6-.7 2 1.1 2.1-2.1-1.1-2 .7-1.6z" transform="translate(2.25 0) scale(.82)"/></svg>'}
  ]);

  function enhanceNav(){
    const nav=$('nav[aria-label="Hauptnavigation"]');if(!nav)return;
    nav.classList.add('cutcoach-glass-nav');
    const buttons=new Map([...nav.querySelectorAll('[data-tab]')].map(button=>[button.dataset.tab,button]));
    for(const item of NAV_ITEMS){
      const button=buttons.get(item.key);if(!button)continue;
      button.classList.toggle('cutcoach-glass-nav__primary',Boolean(item.central));
      button.dataset.glassNav='1';
      button.setAttribute('aria-label',item.label);
      button.innerHTML=`<span class="cutcoach-glass-nav__icon">${item.icon}</span>${item.central?'':`<span class="cutcoach-glass-nav__label">${item.label}</span>`}`;
      nav.append(button);
    }
    for(const [key,button] of buttons){if(!NAV_ITEMS.some(item=>item.key===key))button.hidden=true}
    syncNavState(nav);
  }
  function syncNavState(nav=$('nav[aria-label="Hauptnavigation"]')){
    if(!nav)return;
    for(const button of nav.querySelectorAll('[data-tab]')){
      const active=button.classList.contains('active')||button.getAttribute('aria-current')==='page';
      button.classList.toggle('is-active',active);
      if(button.dataset.tab!=='food')button.setAttribute('aria-label',`${button.querySelector('.cutcoach-glass-nav__label')?.textContent||button.getAttribute('aria-label')}${active?', ausgewählt':''}`);
    }
  }

  function refreshJournal(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      try{window.CutCoachJournalV72?.render?.()}catch{}
      try{window.CutCoachJournalV740?.refresh?.()}catch{}
      try{window.CutCoachJournalV71?.render?.()}catch{}
      fixStepCopy();decorateActions();enhanceNav();
    },0);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy();enhanceNav()},90);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy();enhanceNav()},260);
  }
  function wrapRender(){if(renderWrapped||typeof window.render!=='function')return;const base=window.render;if(base.__journalLive127){renderWrapped=true;return}const wrapped=function(){const value=base.apply(this,arguments);queueMicrotask(refreshJournal);return value};wrapped.__journalLive127=true;window.render=wrapped;renderWrapped=true}
  function wrapMutationFunction(name){const original=window[name];if(typeof original!=='function'||original.__journalLive127)return;const wrapped=function(){const result=original.apply(this,arguments);if(result!==false)refreshJournal();return result};wrapped.__journalLive127=true;window[name]=wrapped}
  function wrapLibrary(){const library=window.CutCoachLibrary;if(!library||libraryWrapped)return;for(const name of ['addCatalogItemToDay','addItemToDay','removeDayItem','updateDayItem']){const original=library[name];if(typeof original!=='function'||original.__journalLive127)continue;const wrapped=function(){const result=original.apply(this,arguments);if(result!==false)refreshJournal();return result};wrapped.__journalLive127=true;try{library[name]=wrapped}catch{}}libraryWrapped=true}
  function fixStepCopy(){const card=$('.journal-steps-card')||[...document.querySelectorAll('article,section')].find(node=>/^Schritte$/i.test(node.querySelector('h2,h3,strong')?.textContent?.trim()||'')&&/Noch nicht eingetragen/i.test(node.textContent||''));if(!card)return;for(const node of card.querySelectorAll('strong,b,.journal-steps-value')){if(/^[-–—]\s*Schritte$/i.test((node.textContent||'').trim()))node.textContent='Noch nicht eingetragen'}const empty=[...card.querySelectorAll('p,small,span')].find(node=>/Noch nicht eingetragen/i.test(node.textContent||''));if(empty&&/Noch nicht eingetragen/i.test(card.textContent||''))empty.textContent='Ziel noch offen'}
  function decorateActions(){const root=$('[data-screen="food"]')||document;for(const button of root.querySelectorAll('button')){const text=(button.textContent||'').trim();if(text==='Manuell'){button.lastChild.textContent='Schnell anlegen';button.setAttribute('aria-label','Lebensmittel mit eigenen Nährwerten schnell anlegen')}else if(text==='Lebensmittel'){button.lastChild.textContent='Suchen';button.setAttribute('aria-label','Einzelnes Lebensmittel in der Datenbank suchen')}else if(text==='Rezept')button.setAttribute('aria-label','Rezept aus mehreren Zutaten erstellen oder auswählen');else if(text==='Barcode')button.setAttribute('aria-label','Produkt über den Barcode suchen')}}
  function installObserver(){if(observer)return;observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length)){wrapRender();wrapLibrary();decorateActions();enhanceNav();fixStepCopy()}else syncNavState()});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','aria-current']})}
  function start(){wrapRender();wrapMutationFunction('commitDayMutation');wrapMutationFunction('commitStateMutation');wrapLibrary();decorateActions();enhanceNav();fixStepCopy();installObserver();refreshJournal();document.addEventListener('cutcoach:data-changed',refreshJournal);document.addEventListener('click',event=>{if(event.target.closest?.('#saveMeal,[data-nutrition-add],[data-canonical-add],[data-canonical-all],[data-delete-meal],[data-edit-meal],#copyPreviousMeals'))refreshJournal();if(event.target.closest?.('nav[aria-label="Hauptnavigation"]'))setTimeout(()=>syncNavState(),0)},true);window.addEventListener('pageshow',refreshJournal);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshJournal()})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachJournalLive127=Object.freeze({version:VERSION,refresh:refreshJournal,navItems:NAV_ITEMS});
})();