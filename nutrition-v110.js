'use strict';
(function(){
  const VERSION='1.1.0 Alpha';
  let root=null,observer=null,scheduled=false,rowObserver=null;
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
    if(!input)return;
    input.autocomplete='off';
    input.autocapitalize='none';
    input.spellcheck=false;
    input.setAttribute('enterkeyhint','search');
    input.setAttribute('aria-label','Lebensmittel, Gericht oder Rezept suchen');
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
    const rows=$$('.nutrition-result-row',root);
    rows.forEach(row=>{
      if(row.dataset.v110)return;
      row.dataset.v110='1';
      const add=$('.nutrition-result-add',row);
      if(add)add.setAttribute('aria-live','polite');
      rowObserver?.observe(row);
    });
  }

  function sync(){
    if(!root||!document.body.classList.contains('nutrition-mode'))return;
    root.dataset.nutritionV110='1';
    normalizeLabels();
    improveSearch();
    improveTabs();
    improveRows();
    const version=$('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  function queue(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{scheduled=false;sync()});
  }

  function lockRapidAdd(event){
    const button=event.target.closest?.('.nutrition-result-add,[data-nutrition-add]');
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
      button.classList.remove('is-committing');
      button.removeAttribute('aria-busy');
    },650);
  }

  function start(found){
    root=found;
    rowObserver='IntersectionObserver' in window?new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('is-ready');rowObserver.unobserve(entry.target)}
      });
    },{rootMargin:'180px 0px'}):null;
    observer=new MutationObserver(queue);
    observer.observe(root,{childList:true,subtree:true,characterData:true});
    root.addEventListener('click',lockRapidAdd,true);
    root.addEventListener('input',queue,{passive:true});
    root.addEventListener('change',queue,{passive:true});
    queue();
  }

  function boot(){
    const found=document.querySelector('[data-screen="food"]');
    if(found){start(found);return}
    const bootstrap=new MutationObserver(()=>{
      const node=document.querySelector('[data-screen="food"]');
      if(!node)return;
      bootstrap.disconnect();
      start(node);
    });
    bootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CutCoachNutritionV110=Object.freeze({version:VERSION,refresh:queue});
})();
