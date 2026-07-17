'use strict';
(function(){
  const VERSION=typeof APP_VERSION==='string'?APP_VERSION:'7.0.0';
  const $=selector=>document.querySelector(selector);
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const parseText=value=>Number(String(value||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0;
  const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const previous=new Map();
  let initialized=false;
  let premiumBound=false;

  function waterAmount(){return Math.round(parseText($('#journalWaterAmount')?.textContent)*1000)}
  function waterMap(){try{const value=JSON.parse(localStorage.getItem('cutcoach_water_v1')||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
  function selectedWater(){try{return Number(waterMap()[selectedDate])||0}catch{return waterAmount()}}

  function decorateWater(){
    const ring=$('#journalWaterRing');if(!ring||ring.dataset.v7Decorated)return;ring.dataset.v7Decorated='1';ring.insertAdjacentHTML('beforeend','<span class="water-v7-bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i></span><span class="water-v7-marks" aria-hidden="true"><i style="--mark:33%">1 l</i><i style="--mark:66%">2 l</i><i style="--mark:96%">3 l</i></span>');const copy=ring.querySelector('div:not(.water-fill)');if(copy&&!copy.querySelector('.water-v7-glasses'))copy.insertAdjacentHTML('beforeend','<small class="water-v7-glasses"></small>');
  }

  function decorateMacros(){
    document.querySelectorAll('.journal-macros article').forEach(article=>{if(article.querySelector('.macro-v7-gap'))return;article.insertAdjacentHTML('beforeend','<small class="macro-v7-gap"></small>')});
  }

  function injectSummary(){
    if($('#journalSummaryModal'))return;document.body.insertAdjacentHTML('beforeend','<div class="modal" id="journalSummaryModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="journalSummaryTitle"><div class="sheet journal-summary-sheet"><div class="sheet-head"><h2 id="journalSummaryTitle">Tagesabschluss</h2><button id="journalSummaryClose" type="button" aria-label="Schließen">×</button></div><div id="journalSummaryHero" class="journal-summary-hero"></div><div id="journalSummaryGrid" class="journal-summary-grid"></div><section class="journal-score-explain"><strong>So entsteht deine Tagesnote</strong><div id="journalScoreDrivers"></div></section><button id="journalSummaryDone" type="button">Abschluss ansehen</button></div></div>');$('#journalSummaryClose').onclick=$('#journalSummaryDone').onclick=()=>closeSummary();$('#journalSummaryModal').addEventListener('click',event=>{if(event.target.id==='journalSummaryModal')closeSummary()});
  }

  function ensureJournalExtras(){
    const check=$('.journal-check-card');if(check&&!$('#journalFinishDay'))check.insertAdjacentHTML('beforeend','<button id="journalFinishDay" class="journal-finish-day" type="button">Tagesabschluss ansehen</button>');const finishButton=$('#journalFinishDay');if(finishButton&&!finishButton.dataset.v7Bound){finishButton.dataset.v7Bound='1';finishButton.addEventListener('click',openSummary)}const coach=$('.journal-coach-card');if(coach&&!$('#journalAchievements'))coach.insertAdjacentHTML('beforeend','<div id="journalAchievements" class="journal-achievements" aria-label="Heutige Meilensteine"></div>');decorateWater();decorateMacros();injectSummary();
  }

  function scoreDrivers(total,data,settings,water){
    const rows=[];const calorieDelta=total.calories-settings.calories;rows.push({label:'Kalorien',value:Math.abs(calorieDelta)<=200?'im Zielbereich':calorieDelta<0?`${fmt(-calorieDelta)} kcal offen`:`${fmt(calorieDelta)} kcal darüber`,good:Math.abs(calorieDelta)<=200});const proteinGap=settings.protein-total.protein;rows.push({label:'Eiweiß',value:proteinGap<=0?'Ziel erreicht':`${fmt(proteinGap)} g offen`,good:proteinGap<=10});if(settings.steps>0)rows.push({label:'Schritte',value:data.steps===null?'nicht eingetragen':data.steps>=settings.steps?'Ziel erreicht':`${fmt(settings.steps-data.steps)} offen`,good:data.steps!==null&&data.steps>=settings.steps});rows.push({label:'Wasser',value:water>=3000?'Ziel erreicht':`${fmt(3000-water)} ml offen`,good:water>=3000});rows.push({label:'Regeneration',value:data.alcohol===false?'alkoholfrei':data.alcohol===true?'Alkohol eingetragen':'noch offen',good:data.alcohol===false});return rows;
  }

  function openSummary(){
    if(typeof totals!=='function'||typeof day!=='function')return;const total=totals(selectedDate),data=day(selectedDate,false),settings=state.settings,water=selectedWater(),score=typeof window.dailyScore==='function'?window.dailyScore():null,modal=$('#journalSummaryModal');$('#journalSummaryHero').innerHTML=`<span>${score===null?'–':fmt(score,1)}</span><div><small>Tagesnote</small><strong>${score===null?'Noch offen':score>=8?'Starker Tag':score>=6?'Solider Tag':'Verbesserungspotenzial'}</strong></div>`;$('#journalSummaryGrid').innerHTML=`<article><small>Kalorien</small><b>${fmt(total.calories)} / ${fmt(settings.calories)}</b></article><article><small>Eiweiß</small><b>${fmt(total.protein)} / ${fmt(settings.protein)} g</b></article><article><small>Schritte</small><b>${data.steps===null?'–':fmt(data.steps)}</b></article><article><small>Wasser</small><b>${fmt(water/1000,2)} l</b></article>`;$('#journalScoreDrivers').innerHTML=scoreDrivers(total,data,settings,water).map(row=>`<div class="${row.good?'good':''}"><span>${row.label}</span><b>${row.value}</b></div>`).join('');if(typeof openModal==='function')openModal('journalSummaryModal');else{modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
  }
  function closeSummary(){const modal=$('#journalSummaryModal');if(!modal)return;if(typeof closeModal==='function')closeModal(modal);else{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}}

  function animateNumber(node,target,{digits=0,suffix=''}={}){
    if(!node)return;const start=previous.has(node.id)?previous.get(node.id):target;previous.set(node.id,target);if(reduceMotion()||Math.abs(target-start)<.01){node.textContent=`${fmt(target,digits)}${suffix}`;return}const began=performance.now(),duration=520;const frame=now=>{const progress=Math.min(1,(now-began)/duration),eased=1-(1-progress)**3,value=start+(target-start)*eased;node.textContent=`${fmt(value,digits)}${suffix}`;if(progress<1)requestAnimationFrame(frame)};requestAnimationFrame(frame);
  }

  function renderEffects(){
    ensureJournalExtras();if(typeof totals!=='function'||typeof day!=='function'||typeof state!=='object')return;const total=totals(selectedDate),data=day(selectedDate,false),settings=state.settings,water=selectedWater(),remaining=settings.calories-total.calories;
    animateNumber($('#journalRemaining'),Math.abs(remaining));const eaten=$('#journalEaten');if(eaten)animateNumber(eaten,total.calories,{suffix:' kcal'});const score=typeof window.dailyScore==='function'?window.dailyScore():null;if(score!==null){animateNumber($('#journalScoreLarge'),score,{digits:1});animateNumber($('#journalScore'),score,{digits:1})}
    const ring=$('#journalCalorieRing');ring?.classList.toggle('v7-balanced',Math.abs(remaining)<=200&&total.calories>0);ring?.classList.toggle('v7-warning',remaining>200&&remaining<=450);ring?.classList.toggle('v7-over',remaining<0);
    [['protein',total.protein,settings.protein],['carbs',total.carbs,settings.carbs],['fat',total.fat,settings.fat]].forEach(([key,value,goal])=>{const article=$(`#${key}JournalText`)?.closest('article'),gap=goal-value,label=article?.querySelector('.macro-v7-gap');if(label)label.textContent=gap>0?`${fmt(gap)} g fehlen`:gap===0?'Ziel genau erreicht':`${fmt(-gap)} g darüber`;article?.classList.toggle('v7-goal-hit',goal>0&&value>=goal*.9&&value<=goal*1.1)});
    const glasses=$('.water-v7-glasses');if(glasses)glasses.textContent=`≈ ${fmt(water/250,0)} Gläser`;const waterRing=$('#journalWaterRing');waterRing?.classList.toggle('v7-water-goal',water>=3000);waterRing?.style.setProperty('--water-ratio',`${Math.min(100,water/3000*100)}%`);
    const steps=Number(data.steps)||0,stepGoal=Number(settings.steps)||0,stepCard=$('.journal-steps-card');stepCard?.classList.toggle('v7-quarter',stepGoal>0&&steps>=stepGoal*.25);stepCard?.classList.toggle('v7-half',stepGoal>0&&steps>=stepGoal*.5);stepCard?.classList.toggle('v7-three-quarter',stepGoal>0&&steps>=stepGoal*.75);stepCard?.classList.toggle('v7-complete',stepGoal>0&&steps>=stepGoal);
    const check=$('.journal-check-card'),complete=data.weight!==null&&data.gym!==null&&data.alcohol!==null;check?.classList.toggle('v7-check-complete',complete);const finish=$('#journalFinishDay');if(finish)finish.textContent=complete?'✓ Tagesabschluss ansehen':'Tagesabschluss ansehen';
    const achievements=[];if(settings.protein>0&&total.protein>=settings.protein*.9)achievements.push('Eiweiß im Ziel');if(water>=3000)achievements.push('Hydration erreicht');if(stepGoal>0&&steps>=stepGoal)achievements.push('Schrittziel');if(complete)achievements.push('Tagescheck vollständig');const host=$('#journalAchievements');if(host)host.innerHTML=achievements.map(text=>`<span>${text}</span>`).join('');
    const greeting=$('#journalGreeting');if(greeting&&selectedDate===todayKey()){const hour=new Date().getHours(),base=hour<11?'Guten Morgen! 👋':hour<17?'Guten Tag! 👋':'Guten Abend! 👋';greeting.textContent=achievements.length>=3?`${base} Starker Lauf.`:total.calories>0?`${base} Bleib auf Kurs.`:base}
  }

  function bindPremium(){
    if(premiumBound)return;premiumBound=true;
    document.addEventListener('click',event=>{const target=event.target.closest?.('[data-nutrition-add],[data-journal-water],[data-journal-gym],[data-journal-alcohol],#saveMeal,#saveWeight,#journalStepSave');if(target)try{navigator.vibrate?.(target.matches('[data-journal-water]')?8:12)}catch{}},true);
    let startX=0,current=null;document.addEventListener('touchstart',event=>{const row=event.target.closest?.('.nutrition-current-row');if(!row)return;startX=event.changedTouches[0]?.clientX||0;current=row},{passive:true});document.addEventListener('touchend',event=>{if(!current)return;const delta=(event.changedTouches[0]?.clientX||0)-startX;if(delta<-45)current.classList.add('v7-swiped');else if(delta>35)current.classList.remove('v7-swiped');current=null},{passive:true});
    const search=$('#nutritionSearch');if(search&&!search.dataset.v7Skeleton){search.dataset.v7Skeleton='1';search.addEventListener('input',()=>{const results=$('#nutritionResults');results?.classList.add('v7-loading');setTimeout(()=>results?.classList.remove('v7-loading'),140)})}
  }

  function start(){
    if(initialized)return;if(!$('#today560')){setTimeout(start,80);return}initialized=true;ensureJournalExtras();bindPremium();const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){baseRender();renderEffects()};const observer=new MutationObserver(()=>{ensureJournalExtras();bindPremium()});observer.observe(document.body,{childList:true,subtree:true});renderEffects();const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
