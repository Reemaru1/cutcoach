'use strict';
(function(){
  const RELEASE='6.8.1';
  const ADD_LOCK_MS=900;
  let lastAdd={key:'',at:0};

  function toastMessage(message){
    if(typeof window.toast==='function')window.toast(message);
  }

  function activeNutrition(){
    return document.body.classList.contains('nutrition-mode')&&document.querySelector('[data-screen="food"]')?.classList.contains('active');
  }

  function addKey(button){
    const type=document.body.dataset.nutritionMealType||document.querySelector('#nutritionMealSelect')?.value||'';
    const date=typeof window.selectedDate==='string'?window.selectedDate:'';
    return `${date}|${type}|${button.dataset.nutritionAdd||''}`;
  }

  function guardDuplicateAdd(event){
    const button=event.target.closest?.('[data-nutrition-add]');
    if(!button||!activeNutrition())return;
    const now=Date.now(),key=addKey(button);
    if(lastAdd.key===key&&now-lastAdd.at<ADD_LOCK_MS){
      event.preventDefault();
      event.stopImmediatePropagation();
      toastMessage('Dieser Eintrag wurde bereits hinzugefügt.');
      return;
    }
    lastAdd={key,at:now};
    button.setAttribute('aria-busy','true');
    setTimeout(()=>button.removeAttribute('aria-busy'),ADD_LOCK_MS);
  }

  function normalizeDecimalInput(input){
    if(!input||input.dataset.decimalGuard)return;
    input.dataset.decimalGuard='1';
    input.addEventListener('change',()=>{
      const raw=String(input.value||'').trim();
      if(!raw.includes(','))return;
      const normalized=raw.replace(',','.');
      if(Number.isFinite(Number(normalized)))input.value=normalized;
    });
  }

  function enhanceSearch(){
    const input=document.querySelector('#nutritionSearch');
    if(!input||input.dataset.hardened)return;
    input.dataset.hardened='1';
    input.setAttribute('spellcheck','false');
    input.setAttribute('aria-describedby','nutritionSearchHint');
    const card=input.closest('.nutrition-search-card');
    if(card&&!document.querySelector('#nutritionSearchHint')){
      const hint=document.createElement('small');
      hint.id='nutritionSearchHint';
      hint.className='nutrition-search-hint';
      hint.textContent='Tipp: Menge direkt mitsuchen, z. B. „250 g Skyr“.';
      card.appendChild(hint);
    }
    input.addEventListener('keydown',event=>{
      if(event.key!=='Enter')return;
      event.preventDefault();
      input.blur();
      document.querySelector('#nutritionResults [data-nutrition-open]')?.focus({preventScroll:false});
    });
  }

  function improveResultState(){
    document.querySelectorAll('[data-nutrition-add][aria-busy="true"]').forEach(button=>button.disabled=true);
    const results=document.querySelector('#nutritionResults');
    if(results)results.setAttribute('aria-live','polite');
  }

  function improveVersion(){
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${RELEASE}`;
  }

  function enhance(){
    enhanceSearch();
    improveResultState();
    improveVersion();
    ['#libraryExactAmount','#mealQuantity','#mealCalories','#mealProtein','#mealCarbs','#mealFat','#mealFiber','#mealSugar','#mealSaturatedFat','#mealSalt','#libAmount','#libCalories','#libProtein','#libCarbs','#libFat','#libFiber','#libSugar','#libSaturatedFat','#libSalt'].forEach(selector=>normalizeDecimalInput(document.querySelector(selector)));
  }

  document.addEventListener('click',guardDuplicateAdd,true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)lastAdd={key:'',at:0};});
  window.addEventListener('pageshow',enhance);
  document.addEventListener('DOMContentLoaded',()=>{
    enhance();
    const observer=new MutationObserver(enhance);
    observer.observe(document.body,{childList:true,subtree:true});
  },{once:true});
})();
