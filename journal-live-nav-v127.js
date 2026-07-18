'use strict';
(function(){
  const VERSION='1.2.9-alpha';
  const $=selector=>document.querySelector(selector);
  let refreshTimer=0,renderWrapped=false,libraryWrapped=false,observer=null;
  const navLabels={today:'Tagebuch',food:'Ernährung',progress:'Fortschritt',settings:'Einstellungen'};
  const navIcons={
    today:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="3"/><path d="M8 2.5v4M16 2.5v4M4 8.5h16M8 13l2.2 2.2L16 10"/></svg>',
    food:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M7 3v8M4.5 3v5.5A2.5 2.5 0 0 0 7 11v10M9.5 3v5.5A2.5 2.5 0 0 1 7 11M17 3v18M17 3c2 2 3 4.5 3 7.5h-3"/></svg>',
    progress:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M4 19V5M4 19h16M7 15l3.2-3.2 2.8 2.1L19 7.5M15.5 7.5H19V11"/></svg>',
    settings:'<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.5 1a8 8 0 0 0-2.7-1.6L13.4 2H9.5L9 5a8 8 0 0 0-2.7 1.6l-2.5-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.5-1A8 8 0 0 0 9 19l.5 3h3.9l.4-3a8 8 0 0 0 2.7-1.6l2.5 1 2-3.4-2-1.5Z"/></svg>'
  };

  function cleanSummaryExtras(){
    $('#journalSummaryVerdict')?.remove();
    $('#journalSummaryNext')?.remove();
  }
  function fixCoachTitle(){
    const card=$('.journal-coach-card.coach-v71')||$('.journal-coach-card');
    if(!card)return;
    const candidates=[...card.querySelectorAll('h2,h3,strong')];
    const title=candidates.find(node=>/Dein nächster sinnvoller/i.test(node.textContent||''));
    if(!title)return;
    title.textContent='Dein nächster sinnvoller Schritt';
    title.classList.add('coach-title-v129');
  }
  function polishNav(){
    const nav=$('nav[aria-label="Hauptnavigation"]');if(!nav)return;
    nav.classList.remove('cutcoach-nav-v127');nav.classList.add('cutcoach-nav-v129');
    for(const button of nav.querySelectorAll('[data-tab]')){
      const key=button.dataset.tab,label=navLabels[key];if(!label)continue;
      if(button.dataset.nav129!=='1'){
        button.dataset.nav129='1';delete button.dataset.nav127;
        button.innerHTML=`<span class="nav-v129-icon">${navIcons[key]}</span><span class="nav-v129-label">${label}</span>`;
      }
      const active=button.classList.contains('active')||button.getAttribute('aria-current')==='page';
      button.setAttribute('aria-label',`${label}${active?', ausgewählt':''}`);
    }
  }
  function refreshJournal(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      try{window.CutCoachJournalV72?.render?.()}catch{}
      try{window.CutCoachJournalV740?.refresh?.()}catch{}
      try{window.CutCoachJournalV71?.render?.()}catch{}
      fixStepCopy();decorateActions();cleanSummaryExtras();fixCoachTitle();polishNav();
    },0);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy();cleanSummaryExtras();fixCoachTitle();polishNav()},90);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy();cleanSummaryExtras();fixCoachTitle();polishNav()},260);
  }
  function wrapRender(){
    if(renderWrapped||typeof window.render!=='function')return;
    const base=window.render;if(base.__journalLive127){renderWrapped=true;return}
    const wrapped=function(){const value=base.apply(this,arguments);queueMicrotask(refreshJournal);return value};
    wrapped.__journalLive127=true;window.render=wrapped;renderWrapped=true;
  }
  function wrapMutationFunction(name){
    const original=window[name];if(typeof original!=='function'||original.__journalLive127)return;
    const wrapped=function(){const result=original.apply(this,arguments);if(result!==false)refreshJournal();return result};
    wrapped.__journalLive127=true;window[name]=wrapped;
  }
  function wrapLibrary(){
    const library=window.CutCoachLibrary;if(!library||libraryWrapped)return;
    for(const name of ['addCatalogItemToDay','addItemToDay','removeDayItem','updateDayItem']){
      const original=library[name];if(typeof original!=='function'||original.__journalLive127)continue;
      const wrapped=function(){const result=original.apply(this,arguments);if(result!==false)refreshJournal();return result};
      wrapped.__journalLive127=true;try{library[name]=wrapped}catch{}
    }
    libraryWrapped=true;
  }
  function fixStepCopy(){
    const card=$('.journal-steps-card')||[...document.querySelectorAll('article,section')].find(node=>/^Schritte$/i.test(node.querySelector('h2,h3,strong')?.textContent?.trim()||'')&&/Noch nicht eingetragen/i.test(node.textContent||''));
    if(!card)return;
    for(const node of card.querySelectorAll('strong,b,.journal-steps-value'))if(/^[-–—]\s*Schritte$/i.test((node.textContent||'').trim()))node.textContent='Noch nicht eingetragen';
    const empty=[...card.querySelectorAll('p,small,span')].find(node=>/Noch nicht eingetragen/i.test(node.textContent||''));
    if(empty&&/Noch nicht eingetragen/i.test(card.textContent||''))empty.textContent='Ziel noch offen';
  }
  function decorateActions(){
    const root=$('[data-screen="food"]')||document;
    for(const button of root.querySelectorAll('button')){
      const text=(button.textContent||'').trim();
      if(text==='Manuell'){button.lastChild.textContent='Schnell anlegen';button.setAttribute('aria-label','Lebensmittel mit eigenen Nährwerten schnell anlegen')}
      else if(text==='Lebensmittel'){button.lastChild.textContent='Suchen';button.setAttribute('aria-label','Einzelnes Lebensmittel in der Datenbank suchen')}
      else if(text==='Rezept')button.setAttribute('aria-label','Rezept aus mehreren Zutaten erstellen oder auswählen');
      else if(text==='Barcode')button.setAttribute('aria-label','Produkt über den Barcode suchen');
    }
  }
  function installObserver(){
    if(observer)return;
    observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length)){wrapRender();wrapLibrary();decorateActions();cleanSummaryExtras();fixCoachTitle();polishNav();fixStepCopy()}});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function start(){
    wrapRender();wrapMutationFunction('commitDayMutation');wrapMutationFunction('commitStateMutation');wrapLibrary();
    decorateActions();cleanSummaryExtras();fixCoachTitle();polishNav();fixStepCopy();installObserver();refreshJournal();
    document.addEventListener('cutcoach:data-changed',refreshJournal);
    document.addEventListener('click',event=>{if(event.target.closest?.('#saveMeal,[data-nutrition-add],[data-canonical-add],[data-canonical-all],[data-delete-meal],[data-edit-meal],#copyPreviousMeals'))refreshJournal()},true);
    window.addEventListener('pageshow',refreshJournal);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshJournal()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachJournalLive127=Object.freeze({version:VERSION,refresh:refreshJournal});
})();