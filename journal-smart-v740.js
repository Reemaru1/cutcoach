'use strict';
(function(){
  const VERSION='1.0.0 Alpha';
  const COLLAPSE_KEY='cutcoach_coach_compact_v2';
  const $=selector=>document.querySelector(selector);
  const mealOrder=['Frühstück','Mittagessen','Abendessen','Snack'];
  let frame=0,rootObserver=null,bootstrapObserver=null,lastMeal='';

  function loadLive127(){
    const stale=document.querySelector('link[data-journal-live-nav-v127]');if(stale)stale.remove();
    if(!window.CutCoachJournalLive127&&!document.querySelector('script[data-journal-live-nav-v132]')){const script=document.createElement('script');script.src='./journal-live-nav-v127.js?v=1.3.2-alpha';script.async=false;script.dataset.journalLiveNavV132='1';document.head.append(script)}
  }
  function nowHour(){const now=new Date();return now.getHours()+now.getMinutes()/60}
  function preferredMeal(){const value=nowHour();return value<10.5?'Frühstück':value<15?'Mittagessen':value<20.5?'Abendessen':'Snack'}
  function readCollapsed(){try{const value=localStorage.getItem(COLLAPSE_KEY);return value===null?true:value==='1'}catch{return true}}
  function writeCollapsed(value){try{localStorage.setItem(COLLAPSE_KEY,value?'1':'0')}catch{}}
  function coachCard(){return $('.journal-coach-card.coach-v71')||$('.journal-coach-card')}
  function syncCoachToggle(card,toggle){const collapsed=card.classList.contains('coach-v74-collapsed');toggle.textContent=collapsed?'Analyse anzeigen':'Analyse ausblenden';toggle.setAttribute('aria-expanded',String(!collapsed));toggle.setAttribute('aria-label',collapsed?'Coaching-Analyse anzeigen':'Coaching-Analyse ausblenden')}
  function enhanceCoach(){const card=coachCard(),header=card?.querySelector('.coach-v71-header');if(!card||!header)return;let toggle=card.querySelector('#coachV74Toggle');if(!toggle){toggle=document.createElement('button');toggle.id='coachV74Toggle';toggle.type='button';toggle.className='coach-v74-toggle';toggle.setAttribute('aria-controls','coachV74Details');header.append(toggle);const details=card.querySelector('.coach-v71-focus');if(details)details.id='coachV74Details';toggle.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const collapsed=!card.classList.contains('coach-v74-collapsed');card.classList.toggle('coach-v74-collapsed',collapsed);writeCollapsed(collapsed);syncCoachToggle(card,toggle)})}card.classList.toggle('coach-v74-collapsed',readCollapsed());syncCoachToggle(card,toggle)}
  function mealType(card){const button=card.querySelector('[data-add-journal-meal]'),explicit=button?.dataset.addJournalMeal;if(mealOrder.includes(explicit))return explicit;const text=card.querySelector('h3,strong,b')?.textContent||card.textContent||'';return mealOrder.find(type=>text.includes(type))||''}
  function prioritizeMeals(){const host=$('#journalMeals');if(!host)return;const wanted=preferredMeal(),wantedIndex=mealOrder.indexOf(wanted);const cards=[...host.querySelectorAll('.journal-meal-row,article,section')].filter(node=>node.querySelector('.journal-meal-add,[data-add-journal-meal]'));cards.forEach(card=>{const type=mealType(card),index=mealOrder.indexOf(type);card.classList.remove('meal-v74-current','meal-v74-past','meal-v74-upcoming');card.classList.add(type===wanted?'meal-v74-current':index>=0&&index<wantedIndex?'meal-v74-past':'meal-v74-upcoming');const badge=card.querySelector('.meal-v74-badge');if(type===wanted){if(!badge)card.insertAdjacentHTML('afterbegin','<span class="meal-v74-badge" aria-label="Aktuell passende Mahlzeit">Jetzt passend</span>')}else badge?.remove()});lastMeal=wanted}
  function suggestedQuery(){const title=$('#coachV71FocusTitle')?.textContent||'';if(/eiweiß/i.test(title))return 'Skyr';if(/kalorien|sättig/i.test(title))return 'Haferflocken';if(/abend/i.test(title))return 'Hähnchen';return preferredMeal()==='Frühstück'?'Skyr':'Hähnchen'}
  function directCoachAction(){const button=$('#coachV71Action');if(!button||button.dataset.alphaBound)return;button.dataset.alphaBound='1';button.addEventListener('click',()=>{if(button.dataset.action!=='meal')return;const query=suggestedQuery();window.setTimeout(()=>{const search=$('#nutritionSearch');if(!search)return;search.value=query;search.dispatchEvent(new Event('input',{bubbles:true}));search.focus({preventScroll:true})},220)})}
  function compactOverview(){document.body.classList.add('journal-v740','cutcoach-alpha')}
  function sync(){frame=0;loadLive127();compactOverview();enhanceCoach();prioritizeMeals();directCoachAction();const version=$('#appVersion');if(version)version.textContent='Version 1.0.0 Alpha'}
  function queue(){if(frame)return;frame=requestAnimationFrame(sync)}
  function observeJournal(){const root=$('#today560');if(!root)return false;bootstrapObserver?.disconnect();bootstrapObserver=null;rootObserver?.disconnect();rootObserver=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length))queue()});rootObserver.observe(root,{childList:true,subtree:true});queue();return true}
  function bootstrap(){loadLive127();if(observeJournal())return;bootstrapObserver=new MutationObserver(()=>observeJournal());bootstrapObserver.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  document.addEventListener('click',event=>{if(event.target.closest?.('#today560 button,#today560 [role="button"]'))queue()},true);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
  window.setInterval(()=>{if(preferredMeal()!==lastMeal)queue()},60000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
  window.CutCoachJournalV740=Object.freeze({version:VERSION,refresh:queue,preferredMeal});
})();
