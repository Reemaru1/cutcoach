'use strict';
(function(){
  const VERSION='1.1.2-alpha';
  let root=null,observer=null,scheduled=false,rowObserver=null,started=false;
  const locked=new WeakSet();
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];

  function normalizeLabels(){
    $$('.nutrition-macro-compass article',root).forEach(card=>{
      const label=card.querySelector('small');
      if(label&&label.textContent.trim()==='KH')label.textContent='Kohlenhydrate';
    });
  }

  function improveSearch(){
    const input=$('#nutritionSearch',root);
    if(!input||input.dataset.nutrition112)return;
    input.dataset.nutrition112='1';
    input.autocomplete='off';
    input.autocapitalize='none';
    input.spellcheck=false;
    input.setAttribute('enterkeyhint','search');
    input.setAttribute('aria-label','Intelligente Suche nach Lebensmitteln, Gerichten oder Rezepten');
  }

  function improveTabs(){
    const tabs=$('.nutrition-tabs',root);
    if(!tabs)return;
    tabs.setAttribute('role','tablist');
    $$('button',tabs).forEach(button=>{
      button.setAttribute('role','tab');
      button.setAttribute('aria-selected',String(button.classList.contains('active')));
    });
  }

  function improveRows(){
    $$('.nutrition-result-row',root).forEach(row=>{
      if(row.dataset.v112)return;
      row.dataset.v112='1';
      const add=$('.nutrition-result-add',row);
      if(add){add.setAttribute('aria-live','polite');add.setAttribute('aria-label',`${row.querySelector('b')?.textContent?.trim()||'Lebensmittel'} hinzufügen`)}
      rowObserver?.observe(row);
    });
  }

  function sync(){
    if(!root||!root.isConnected||!document.body.classList.contains('nutrition-mode'))return;
    root.dataset.nutritionV112='1';
    normalizeLabels();
    improveSearch();
    improveTabs();
    improveRows();
  }

  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sync()});
  }

  function lockRapidAdd(event){
    const button=event.target.closest?.('.nutrition-result-add,[data-nutrition-add],[data-canonical-add],[data-canonical-all]');
    if(!button||button.disabled)return;
    if(locked.has(button)){
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    locked.add(button);
    button.classList.add('is-committing');
    button.setAttribute('aria-busy','true');
    setTimeout(()=>{
      locked.delete(button);
      if(!button.isConnected)return;
      button.classList.remove('is-committing');
      button.removeAttribute('aria-busy');
    },700);
  }

  function start(found){
    if(started&&root===found)return;
    started=true;root=found;
    rowObserver?.disconnect();observer?.disconnect();
    rowObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('is-ready');rowObserver.unobserve(entry.target)}
      });
    },{rootMargin:'220px 0px'}):null;
    observer=new MutationObserver(queue);
    observer.observe(root,{childList:true,subtree:true});
    root.addEventListener('click',lockRapidAdd,true);
    queue();
  }

  function boot(){
    const found=document.querySelector('[data-screen="food"]');
    if(found){start(found);return}
    const bootstrap=new MutationObserver(()=>{
      const node=document.querySelector('[data-screen="food"]');
      if(!node)return;
      bootstrap.disconnect();start(node);
    });
    bootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CutCoachNutritionV110=Object.freeze({version:VERSION,refresh:queue});
})();