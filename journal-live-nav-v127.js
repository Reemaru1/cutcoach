'use strict';
(function(){
  const VERSION='1.2.7-alpha';
  const $=selector=>document.querySelector(selector);
  let refreshTimer=0,renderWrapped=false,libraryWrapped=false,observer=null;

  const icons={
    today:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.5h11a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-11a2 2 0 0 1-2-2v-11a2 2 0 0 1 2-2Z"/><path d="M8 2.8v3.4M16 2.8v3.4M4.7 9h14.6"/><path d="m8.2 14 2.2 2.1 5-5"/></svg>',
    food:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v7M4.5 3v4.5A2.5 2.5 0 0 0 7 10v11M9.5 3v4.5A2.5 2.5 0 0 1 7 10"/><path d="M16.5 3c2 1.8 3 4.2 3 7v2h-4V8c0-2 .3-3.7 1-5Z"/><path d="M17.5 12v9"/></svg>',
    progress:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19V5M4 19h16"/><path d="m7 15 3.2-3.3 2.7 2.1L19 7.5"/><path d="M15.5 7.5H19V11"/></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.2"/><path d="M19.2 13.8a7.8 7.8 0 0 0 0-3.6l2-1.5-2-3.4-2.5 1a8 8 0 0 0-3.1-1.8L13.2 2H9.3l-.4 2.5a8 8 0 0 0-3.1 1.8l-2.4-1-2 3.4 2 1.5a7.8 7.8 0 0 0 0 3.6l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 3.1 1.8l.4 2.5h3.9l.4-2.5a8 8 0 0 0 3.1-1.8l2.5 1 2-3.4-2-1.5Z"/></svg>'
  };
  const labels={today:'Tagebuch',food:'Ernährung',progress:'Fortschritt',settings:'Einstellungen'};

  function refreshJournal(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      try{window.CutCoachJournalV72?.render?.()}catch{}
      try{window.CutCoachJournalV740?.refresh?.()}catch{}
      try{window.CutCoachJournalV71?.render?.()}catch{}
      fixStepCopy();decorateActions();decorateNav();
    },0);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy()},90);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy()},260);
  }

  function wrapRender(){
    if(renderWrapped||typeof window.render!=='function')return;
    const base=window.render;
    if(base.__journalLive127){renderWrapped=true;return}
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
      wrapped.__journalLive127=true;
      try{library[name]=wrapped}catch{}
    }
    libraryWrapped=true;
  }

  function fixStepCopy(){
    const card=$('.journal-steps-card')||[...document.querySelectorAll('article,section')].find(node=>/^Schritte$/i.test(node.querySelector('h2,h3,strong')?.textContent?.trim()||'')&&/Noch nicht eingetragen/i.test(node.textContent||''));
    if(!card)return;
    const candidates=[...card.querySelectorAll('strong,b,.journal-steps-value')];
    for(const node of candidates){
      const text=(node.textContent||'').trim();
      if(/^[-–—]\s*Schritte$/i.test(text))node.textContent='Noch nicht eingetragen';
    }
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

  function decorateNav(){
    const nav=$('nav[aria-label="Hauptnavigation"]');if(!nav)return;
    nav.classList.add('cutcoach-nav-v127');
    for(const button of nav.querySelectorAll('[data-tab]')){
      const key=button.dataset.tab,label=labels[key];if(!label)continue;
      if(button.dataset.nav127!=='1'){
        button.dataset.nav127='1';button.innerHTML=`<span class="nav-v127-icon">${icons[key]}</span><span class="nav-v127-label">${label}</span><i aria-hidden="true"></i>`;
      }
      const active=button.classList.contains('active')||button.getAttribute('aria-current')==='page';
      button.setAttribute('aria-label',`${label}${active?', ausgewählt':''}`);
    }
  }

  function installObserver(){
    if(observer)return;
    observer=new MutationObserver(records=>{
      if(records.some(record=>record.addedNodes.length||record.removedNodes.length)){
        wrapRender();wrapLibrary();decorateActions();decorateNav();fixStepCopy();
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }

  function start(){
    wrapRender();wrapMutationFunction('commitDayMutation');wrapMutationFunction('commitStateMutation');wrapLibrary();
    decorateActions();decorateNav();fixStepCopy();installObserver();refreshJournal();
    document.addEventListener('cutcoach:data-changed',refreshJournal);
    document.addEventListener('click',event=>{
      if(event.target.closest?.('#saveMeal,[data-nutrition-add],[data-canonical-add],[data-canonical-all],[data-delete-meal],[data-edit-meal],#copyPreviousMeals'))refreshJournal();
    },true);
    window.addEventListener('pageshow',refreshJournal);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshJournal()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachJournalLive127=Object.freeze({version:VERSION,refresh:refreshJournal});
})();