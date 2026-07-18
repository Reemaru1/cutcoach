'use strict';
(function(){
  const VERSION='1.2.8-alpha';
  const $=selector=>document.querySelector(selector);
  let refreshTimer=0,renderWrapped=false,libraryWrapped=false,observer=null;
  const navLabels={today:'Tagebuch',food:'Ernährung',progress:'Fortschritt',settings:'Einstellungen'};
  const navIcons={today:'▣',food:'🍽️',progress:'⌁',settings:'⚙️'};

  function restoreNav(){
    const nav=$('nav[aria-label="Hauptnavigation"]');if(!nav)return;
    nav.classList.remove('cutcoach-nav-v127');
    for(const button of nav.querySelectorAll('[data-tab]')){
      const key=button.dataset.tab,label=navLabels[key];if(!label)continue;
      if(button.dataset.nav127==='1'||button.querySelector('.nav-v127-icon,.nav-v127-label')){
        button.innerHTML=`<span aria-hidden="true">${navIcons[key]}</span>${label}`;
      }
      delete button.dataset.nav127;
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
      fixStepCopy();decorateActions();restoreNav();
    },0);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy();restoreNav()},90);
    setTimeout(()=>{try{window.CutCoachJournalV72?.render?.();window.CutCoachJournalV740?.refresh?.()}catch{}fixStepCopy();restoreNav()},260);
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
    for(const node of card.querySelectorAll('strong,b,.journal-steps-value')){
      if(/^[-–—]\s*Schritte$/i.test((node.textContent||'').trim()))node.textContent='Noch nicht eingetragen';
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
  function installObserver(){
    if(observer)return;
    observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length)){wrapRender();wrapLibrary();decorateActions();restoreNav();fixStepCopy()}});
    observer.observe(document.body,{childList:true,subtree:true});
  }
  function start(){
    wrapRender();wrapMutationFunction('commitDayMutation');wrapMutationFunction('commitStateMutation');wrapLibrary();
    decorateActions();restoreNav();fixStepCopy();installObserver();refreshJournal();
    document.addEventListener('cutcoach:data-changed',refreshJournal);
    document.addEventListener('click',event=>{if(event.target.closest?.('#saveMeal,[data-nutrition-add],[data-canonical-add],[data-canonical-all],[data-delete-meal],[data-edit-meal],#copyPreviousMeals'))refreshJournal()},true);
    window.addEventListener('pageshow',refreshJournal);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshJournal()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachJournalLive127=Object.freeze({version:VERSION,refresh:refreshJournal});
})();