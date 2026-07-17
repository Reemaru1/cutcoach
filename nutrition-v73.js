'use strict';
(function(){
  const VERSION='7.3.0';
  const TERMS=[
    ['🥨','Butterbreze'],['🧀','Käsesemmel'],['🥙','Dürüm'],['🥙','Döner'],
    ['🥪','Leberkässemmel'],['🌭','Currywurst'],['🍕','Pizza'],['🍝','Käsespätzle']
  ];
  const $=selector=>document.querySelector(selector);
  function ensure(){
    const card=$('.nutrition-search-card'),input=$('#nutritionSearch');
    if(!card||!input)return;
    let quick=$('#nutritionEverydayQuick');
    if(!quick){
      quick=document.createElement('section');
      quick.id='nutritionEverydayQuick';
      quick.className='nutrition-everyday-quick';
      quick.setAttribute('aria-label','Beliebte Alltagsgerichte');
      quick.innerHTML=`<div><strong>Alltagsgerichte</strong><small>Regionale Begriffe wie Semmel, Breze, Yufka oder Weckle werden mitgesucht.</small></div><div class="nutrition-everyday-chips">${TERMS.map(([icon,term])=>`<button type="button" data-everyday-search="${term}"><span aria-hidden="true">${icon}</span>${term}</button>`).join('')}</div>`;
      card.append(quick);
      quick.addEventListener('click',event=>{
        const button=event.target.closest('[data-everyday-search]');if(!button)return;
        input.value=button.dataset.everydaySearch||'';
        input.dispatchEvent(new Event('input',{bubbles:true}));
        input.focus();
      });
      input.addEventListener('input',()=>{quick.hidden=Boolean(input.value.trim())});
    }
    quick.hidden=Boolean(input.value.trim());
    const note=$('.nutrition-catalog-note');
    if(note&&!note.dataset.v73){
      note.dataset.v73='1';
      note.insertAdjacentHTML('beforeend',' · <span>CutCoach-Standardgerichte aus BLS-Zutaten</span>');
    }
  }
  const observer=new MutationObserver(ensure);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensure,{once:true});else ensure();
  window.CutCoachNutritionV73=Object.freeze({version:VERSION,refresh:ensure});
})();
