'use strict';

(function(root){
  const VERSION='2.3.0-alpha';
  const ICONS={
    food:'<svg viewBox="0 0 24 24"><path d="M7 3v7M4 3v5a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 1.2 4 4.1 4 7h-4"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>',
    edit:'<svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z"/><path d="m13.5 7 3.5 3.5"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    shield:'<svg viewBox="0 0 24 24"><path d="M12 3 5 6v5c0 4.4 2.8 8.3 7 10 4.2-1.7 7-5.6 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>'
  };
  const $=(selector,scope=document)=>scope?.querySelector?.(selector)||null;
  let scheduled=false;
  const observers=[];

  function action(button,icon,label,kind){
    if(!button)return;
    button.classList.add('nutrition-v230-action',`is-${kind}`);
    if(button.dataset.nutritionV230Label!==label){
      button.dataset.nutritionV230Label=label;
      button.innerHTML=`<span aria-hidden="true">${ICONS[icon]}</span><b>${label}</b>`;
    }
  }
  function addHandle(sheet){
    if(!sheet||$('.nutrition-v230-handle',sheet))return;
    sheet.insertAdjacentHTML('afterbegin','<span class="nutrition-v230-handle" aria-hidden="true"></span>');
  }
  function titleLockup(head,icon){
    if(!head)return;
    let lockup=$('.nutrition-v230-title-lockup,.nutrition-v210-title-icon,.cc-sheet-title-icon',head);
    if(!lockup){
      lockup=document.createElement('span');
      head.prepend(lockup);
    }
    lockup.classList.add('nutrition-v230-title-lockup','nutrition-v210-title-icon','cc-sheet-title-icon');
    lockup.setAttribute('aria-hidden','true');
    lockup.innerHTML=ICONS[icon]||ICONS.food;
    const duplicates=[...head.querySelectorAll('.nutrition-v230-title-lockup,.nutrition-v210-title-icon,.cc-sheet-title-icon')].filter(node=>node!==lockup);
    duplicates.forEach(node=>node.remove());
  }
  function decorateOffResult(){
    const modal=$('#offResultModal'),sheet=$('.sheet',modal),card=$('#offResultCard',modal);
    if(!modal||!sheet||!card)return;
    modal.classList.add('nutrition-v230-modal','nutrition-v230-result-modal');
    sheet.classList.add('nutrition-v230-sheet','nutrition-v230-result-sheet');
    addHandle(sheet);
    const head=$('.sheet-head',sheet);
    titleLockup(head,'shield');
    const name=$('b',card),notes=[...card.querySelectorAll('small')],image=$('img',card);
    if(name&&!$('.nutrition-v230-product-copy',card)){
      const imageMarkup=image?`<div class="nutrition-v230-product-image"><img src="${image.src}" alt=""></div>`:`<div class="nutrition-v230-product-image is-placeholder" aria-hidden="true">${ICONS.food}</div>`;
      card.innerHTML=`${imageMarkup}<div class="nutrition-v230-product-copy"><small class="nutrition-v230-eyebrow">Produktdaten geprüft</small><strong>${name.textContent}</strong><p>${notes[0]?.textContent||''}</p><span>${notes[1]?.textContent||''}</span></div>`;
    }
    const actions=$('.off-result-actions',sheet),eat=$('#offEatNow'),done=$('#offSaveOnly'),edit=$('#offEditNow');
    if(actions&&actions.firstElementChild!==eat)actions.prepend(eat);
    action(eat,'plus','Jetzt eintragen','primary');
    action(done,'check','Fertig','secondary');
    action(edit,'edit','Produkt bearbeiten','tertiary');
    const source=$('.off-result-source',sheet);
    if(source){
      source.classList.add('nutrition-v230-source');
      source.innerHTML=`<span aria-hidden="true">${ICONS.shield}</span><span>Open Food Facts · Nährwerte je 100 g/ml · lokal gespeichert</span>`;
    }
  }
  function decorateUseModal(){
    const modal=$('#libraryUseModal'),sheet=$('.sheet',modal),summary=$('#libraryUseSummary',modal),preview=$('#factorPreview',modal);
    if(!modal||!sheet)return;
    modal.classList.add('nutrition-v230-modal','nutrition-v230-use-modal');
    sheet.classList.add('nutrition-v230-sheet','nutrition-v230-use-sheet');
    addHandle(sheet);
    const head=$('.sheet-head',sheet);
    titleLockup(head,'food');
    if(summary){
      const name=$('b',summary),basis=$('small',summary);
      if(name&&!$('.nutrition-v230-product-copy',summary)){
        summary.innerHTML=`<div class="nutrition-v230-product-image is-placeholder" aria-hidden="true">${ICONS.food}</div><div class="nutrition-v230-product-copy"><small class="nutrition-v230-eyebrow">Aus deiner Bibliothek</small><strong>${name.textContent}</strong><p>${basis?.textContent||''}</p></div>`;
      }
    }
    const editor=$('.library-portion-editor',modal);
    editor?.classList.add('nutrition-v230-portion-editor');
    const category=$('#libraryMealType',modal)?.closest('label');
    category?.classList.add('nutrition-v230-category');
    if(preview){
      preview.classList.add('nutrition-v230-preview');
      if(!preview.previousElementSibling?.classList.contains('nutrition-v230-preview-label'))preview.insertAdjacentHTML('beforebegin','<small class="nutrition-v230-preview-label">Dein berechneter Eintrag</small>');
    }
    action($('#addLibraryMeal',modal),'plus','Zum Tagebuch hinzufügen','primary');
  }
  function sync(){
    scheduled=false;
    decorateOffResult();
    decorateUseModal();
  }
  function queue(){
    if(scheduled)return;
    scheduled=true;
    (root.requestAnimationFrame||setTimeout)(sync);
  }
  function observe(selector){
    const target=$(selector);
    if(!target)return;
    const observer=new MutationObserver(queue);
    observer.observe(target,{childList:true,subtree:true});
    observers.push(observer);
  }
  function start(){
    sync();
    observe('#offResultModal');
    observe('#libraryUseModal');
    document.addEventListener('click',event=>{
      if(event.target.closest?.('[data-use-lib],#offEatNow,#nutritionBarcode,#lookupManualCode'))setTimeout(queue,0);
    },true);
  }

  root.CutCoachNutrition230=Object.freeze({version:VERSION,refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
