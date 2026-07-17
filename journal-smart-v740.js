'use strict';
(function(){
  const VERSION='7.4.0';
  const COLLAPSE_KEY='cutcoach_coach_compact_v1';
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const hour=()=>new Date().getHours()+new Date().getMinutes()/60;
  const preferredMeal=()=>hour()<10.5?'Frühstück':hour()<15?'Mittagessen':hour()<20.5?'Abendessen':'Snack';
  let scheduled=false;

  function coachCard(){return $('.journal-coach-card.coach-v71')||$('.journal-coach-card')}
  function readCollapsed(){try{return localStorage.getItem(COLLAPSE_KEY)==='1'}catch{return false}}
  function writeCollapsed(value){try{localStorage.setItem(COLLAPSE_KEY,value?'1':'0')}catch{}}

  function enhanceCoach(){
    const card=coachCard(),header=card?.querySelector('.coach-v71-header');
    if(!card||!header)return;
    let toggle=card.querySelector('#coachV74Toggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.id='coachV74Toggle';toggle.type='button';toggle.className='coach-v74-toggle';
      toggle.setAttribute('aria-label','CutCoach Impuls ein- oder ausklappen');
      header.append(toggle);
      toggle.addEventListener('click',()=>{
        const collapsed=!card.classList.contains('coach-v74-collapsed');
        card.classList.toggle('coach-v74-collapsed',collapsed);writeCollapsed(collapsed);syncCoachToggle(card,toggle);
      });
    }
    card.classList.toggle('coach-v74-collapsed',readCollapsed());syncCoachToggle(card,toggle);
  }
  function syncCoachToggle(card,toggle){const collapsed=card.classList.contains('coach-v74-collapsed');toggle.textContent=collapsed?'Mehr':'Weniger';toggle.setAttribute('aria-expanded',String(!collapsed))}

  function prioritizeMeals(){
    const wanted=preferredMeal(),host=$('#journalMeals');if(!host)return;
    const cards=$$('#journalMeals .journal-meal-row, #journalMeals article, #journalMeals section').filter(node=>node.querySelector?.('.journal-meal-add,[data-add-journal-meal]'));
    cards.forEach(card=>{const text=card.textContent||'';card.classList.remove('meal-v74-current','meal-v74-past','meal-v74-upcoming');if(text.includes(wanted))card.classList.add('meal-v74-current');else if((wanted==='Mittagessen'&&text.includes('Frühstück'))||(wanted==='Abendessen'&&(text.includes('Frühstück')||text.includes('Mittagessen')))||(wanted==='Snack'&&!text.includes('Snack')))card.classList.add('meal-v74-past');else card.classList.add('meal-v74-upcoming')});
    const current=cards.find(card=>card.classList.contains('meal-v74-current'));
    if(current&&!current.querySelector('.meal-v74-badge'))current.insertAdjacentHTML('afterbegin','<span class="meal-v74-badge">Jetzt passend</span>');
    cards.filter(card=>card!==current).forEach(card=>card.querySelector('.meal-v74-badge')?.remove());
  }

  function directCoachAction(){
    const button=$('#coachV71Action');if(!button||button.dataset.v74Bound)return;
    button.dataset.v74Bound='1';
    button.addEventListener('click',event=>{
      if(button.dataset.action!=='meal')return;
      const title=$('#coachV71FocusTitle')?.textContent||'';
      const query=/eiweiß/i.test(title)?'eiweißreich':/kalorien/i.test(title)?'sättigend':'optimal';
      setTimeout(()=>{
        const search=$('#nutritionSearch');if(!search)return;
        search.value=query;search.dispatchEvent(new Event('input',{bubbles:true}));search.focus();
      },180);
    });
  }

  function compactOverview(){document.body.classList.add('journal-v740')}
  function sync(){compactOverview();enhanceCoach();prioritizeMeals();directCoachAction();const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  function queue(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sync()},0)}
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',queue,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  window.CutCoachJournalV740=Object.freeze({version:VERSION,refresh:queue,preferredMeal});
})();