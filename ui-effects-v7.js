'use strict';
(function(){
  const VERSION=typeof APP_VERSION==='string'?APP_VERSION:'7.1.0';
  const $=selector=>document.querySelector(selector);
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const parseText=value=>Number(String(value||'').replace(/[^0-9,.-]/g,'').replace(',','.'))||0;
  const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
  const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const previous=new Map();
  let initialized=false;
  let premiumBound=false;

  function waterAmount(){return Math.round(parseText($('#journalWaterAmount')?.textContent)*1000)}
  function waterMap(){try{const value=JSON.parse(localStorage.getItem('cutcoach_water_v1')||'{}');return value&&typeof value==='object'?value:{}}catch{return{}}}
  function selectedWater(){try{return Number(waterMap()[selectedDate])||0}catch{return waterAmount()}}
  function isToday(){return selectedDate===todayKey()}
  function isPast(){return selectedDate<todayKey()}
  function currentHour(){const now=new Date();return now.getHours()+now.getMinutes()/60}
  function dayProgress(){
    if(!isToday())return 1;
    const hour=currentHour();
    if(hour<8)return .08;
    if(hour<11)return .18+(hour-8)*.06;
    if(hour<14)return .36+(hour-11)*.09;
    if(hour<18)return .63+(hour-14)*.065;
    if(hour<22)return .89+(hour-18)*.0275;
    return 1;
  }
  function paceTarget(target,min=0){return Math.max(min,Math.round((Number(target)||0)*dayProgress()))}
  function waterPace(){
    if(isPast())return 3000;
    if(!isToday())return 0;
    return Math.round(clamp((currentHour()-7)/15,.08,1)*3000/250)*250;
  }
  function recommendedMealType(){const hour=currentHour();return hour<10.5?'Frühstück':hour<15?'Mittagessen':hour<20?'Abendessen':'Snack'}

  function decorateWater(){
    const ring=$('#journalWaterRing');if(!ring)return;
    ring.querySelector('.water-v7-marks')?.remove();
    if(ring.dataset.v7Decorated)return;
    ring.dataset.v7Decorated='1';
    ring.insertAdjacentHTML('beforeend','<span class="water-v7-bubbles" aria-hidden="true"><i></i><i></i><i></i><i></i></span>');
    const copy=ring.querySelector('div:not(.water-fill)');
    if(copy&&!copy.querySelector('.water-v7-glasses'))copy.insertAdjacentHTML('beforeend','<small class="water-v7-glasses"></small>');
  }

  function decorateMacros(){
    document.querySelectorAll('.journal-macros article').forEach(article=>{if(article.querySelector('.macro-v7-gap'))return;article.insertAdjacentHTML('beforeend','<small class="macro-v7-gap"></small>')});
  }

  function injectSummary(){
    if($('#journalSummaryModal'))return;
    document.body.insertAdjacentHTML('beforeend','<div class="modal" id="journalSummaryModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="journalSummaryTitle"><div class="sheet journal-summary-sheet"><div class="sheet-head"><h2 id="journalSummaryTitle">Tagesabschluss</h2><button id="journalSummaryClose" type="button" aria-label="Schließen">×</button></div><div id="journalSummaryHero" class="journal-summary-hero"></div><div id="journalSummaryGrid" class="journal-summary-grid"></div><section class="journal-score-explain"><strong>So entsteht deine Tagesnote</strong><div id="journalScoreDrivers"></div></section><button id="journalSummaryDone" type="button">Abschluss ansehen</button></div></div>');
    $('#journalSummaryClose').onclick=$('#journalSummaryDone').onclick=()=>closeSummary();
    $('#journalSummaryModal').addEventListener('click',event=>{if(event.target.id==='journalSummaryModal')closeSummary()});
  }

  function upgradeCoach(){
    const coach=$('.journal-coach-card');if(!coach||coach.dataset.coachVersion==='7.1')return;
    coach.dataset.coachVersion='7.1';coach.classList.add('coach-v71');
    coach.innerHTML=`
      <header class="coach-v71-header">
        <div class="journal-coach-icon" aria-hidden="true">✦</div>
        <div class="coach-v71-heading"><small>CutCoach Impuls</small><strong id="journalCoachTitle">Dein Tagesfokus</strong><span id="coachV71Phase">Tageskurs</span></div>
        <div class="journal-score" aria-label="Tagesnote"><strong id="journalScoreLarge">–</strong><small>/10</small></div>
      </header>
      <p id="journalCoachText" class="coach-v71-summary" aria-live="polite">Dein persönlicher Tagesimpuls wird vorbereitet.</p>
      <section class="coach-v71-focus" aria-labelledby="coachV71FocusTitle">
        <div><small>Nächster sinnvoller Schritt</small><strong id="coachV71FocusTitle">Tagesdaten ergänzen</strong><p id="coachV71FocusReason"></p></div>
        <button id="coachV71Action" type="button" data-action="check">Jetzt ansehen</button>
      </section>
      <div class="coach-v71-pillars" aria-label="Coaching-Bereiche">
        <article data-coach-pillar="nutrition"><span>🍴</span><div><small>Ernährung</small><b></b><em></em></div><i></i></article>
        <article data-coach-pillar="movement"><span>👣</span><div><small>Bewegung</small><b></b><em></em></div><i></i></article>
        <article data-coach-pillar="recovery"><span>◌</span><div><small>Regeneration</small><b></b><em></em></div><i></i></article>
      </div>
      <footer class="coach-v71-footer"><span id="coachV71Coverage">0 von 6 Kernpunkten erfasst</span><div id="journalAchievements" class="journal-achievements" aria-label="Heutige Meilensteine"></div></footer>`;
    $('#coachV71Action').addEventListener('click',runCoachAction);
  }

  function ensureJournalExtras(){
    const check=$('.journal-check-card');
    if(check&&!$('#journalFinishDay'))check.insertAdjacentHTML('beforeend','<button id="journalFinishDay" class="journal-finish-day" type="button">Tagesabschluss ansehen</button>');
    const finishButton=$('#journalFinishDay');
    if(finishButton&&!finishButton.dataset.v7Bound){finishButton.dataset.v7Bound='1';finishButton.addEventListener('click',openSummary)}
    upgradeCoach();decorateWater();decorateMacros();injectSummary();
  }

  function scoreDrivers(total,data,settings,water){
    const rows=[];
    const calorieDelta=total.calories-settings.calories;
    rows.push({label:'Kalorien',value:Math.abs(calorieDelta)<=200?'im Zielbereich':calorieDelta<0?`${fmt(-calorieDelta)} kcal offen`:`${fmt(calorieDelta)} kcal darüber`,good:Math.abs(calorieDelta)<=200});
    const proteinGap=settings.protein-total.protein;
    rows.push({label:'Eiweiß',value:proteinGap<=0?'Ziel erreicht':`${fmt(proteinGap)} g offen`,good:proteinGap<=10});
    if(settings.steps>0)rows.push({label:'Schritte',value:data.steps===null?'nicht eingetragen':data.steps>=settings.steps?'Ziel erreicht':`${fmt(settings.steps-data.steps)} offen`,good:data.steps!==null&&data.steps>=settings.steps});
    rows.push({label:'Wasser',value:water>=3000?'Ziel erreicht':`${fmt(3000-water)} ml offen`,good:water>=3000});
    rows.push({label:'Regeneration',value:data.alcohol===false?'alkoholfrei':data.alcohol===true?'Alkohol eingetragen':'noch offen',good:data.alcohol===false});
    return rows;
  }

  function openSummary(){
    if(typeof totals!=='function'||typeof day!=='function')return;
    const total=totals(selectedDate),data=day(selectedDate,false),settings=state.settings,water=selectedWater(),score=typeof window.dailyScore==='function'?window.dailyScore():null,modal=$('#journalSummaryModal');
    $('#journalSummaryHero').innerHTML=`<span>${score===null?'–':fmt(score,1)}</span><div><small>Tagesnote</small><strong>${score===null?'Noch offen':score>=8?'Starker Tag':score>=6?'Solider Tag':'Verbesserungspotenzial'}</strong></div>`;
    $('#journalSummaryGrid').innerHTML=`<article><small>Kalorien</small><b>${fmt(total.calories)} / ${fmt(settings.calories)}</b></article><article><small>Eiweiß</small><b>${fmt(total.protein)} / ${fmt(settings.protein)} g</b></article><article><small>Schritte</small><b>${data.steps===null?'–':fmt(data.steps)}</b></article><article><small>Wasser</small><b>${fmt(water/1000,2)} l</b></article>`;
    $('#journalScoreDrivers').innerHTML=scoreDrivers(total,data,settings,water).map(row=>`<div class="${row.good?'good':''}"><span>${row.label}</span><b>${row.value}</b></div>`).join('');
    if(typeof openModal==='function')openModal('journalSummaryModal');else{modal.classList.add('open');modal.setAttribute('aria-hidden','false')}
  }
  function closeSummary(){const modal=$('#journalSummaryModal');if(!modal)return;if(typeof closeModal==='function')closeModal(modal);else{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}}

  function pulseCard(selector){
    const card=$(selector);if(!card)return;
    card.scrollIntoView?.({behavior:reduceMotion()?'auto':'smooth',block:'center'});card.classList.remove('coach-v71-pulse');void card.offsetWidth;card.classList.add('coach-v71-pulse');setTimeout(()=>card.classList.remove('coach-v71-pulse'),1100);
  }
  function runCoachAction(event){
    const button=event.currentTarget,action=button.dataset.action;
    if(action==='meal'){
      const type=button.dataset.mealType||recommendedMealType();
      const add=document.querySelector(`.journal-meal-add[data-add-journal-meal="${type}"]`)||document.querySelector('.journal-meal-add');
      add?.click();return;
    }
    if(action==='water'){pulseCard('.journal-water-card');return}
    if(action==='steps'){
      const toggle=$('#journalStepToggle');if(toggle?.getAttribute('aria-expanded')!=='true')toggle?.click();
      pulseCard('.journal-steps-card');setTimeout(()=>$('#journalStepInput')?.focus(),300);return;
    }
    if(action==='check'){pulseCard('.journal-check-card');return}
    openSummary();
  }

  function priorityModel(total,data,settings,water){
    const progress=dayProgress(),hour=currentHour(),pace=waterPace(),calorieRemaining=settings.calories-total.calories,proteinRemaining=settings.protein-total.protein,steps=Number(data.steps)||0,stepGap=Math.max(0,(Number(settings.steps)||0)-steps),priorities=[];
    const add=(urgency,type,title,reason,label,mealType='')=>priorities.push({urgency,type,title,reason,label,mealType});
    if(isPast()){
      if(total.calories<=0&&water<=0&&data.steps===null)return{type:'summary',title:'Für diesen Tag fehlen Daten',reason:'Ohne Ernährung, Wasser und Bewegung ist keine seriöse Rückschau möglich. Ergänze nur Werte, die du noch zuverlässig weißt.',label:'Rückblick ansehen',mealType:''};
      const notes=[];if(total.calories>settings.calories+250)notes.push(`${fmt(total.calories-settings.calories)} kcal über Ziel`);if(total.protein<settings.protein*.8)notes.push(`${fmt(Math.max(0,proteinRemaining))} g Eiweiß offen`);if(water<3000)notes.push(`${fmt(3000-water)} ml unter Trinkziel`);
      return{type:'summary',title:notes.length?'Größter Hebel im Rückblick':'Solider dokumentierter Tag',reason:notes.length?`${notes[0]}. Nutze das als Muster für deine nächste Planung – nicht als Aufforderung, einen vergangenen Tag nachträglich zu korrigieren.`:'Die erfassten Kernwerte zeigen keinen dringenden Ausreißer. Entscheidend ist jetzt der Trend über mehrere Tage.',label:'Tagesanalyse öffnen',mealType:''};
    }
    if(!isToday())return{type:'summary',title:'Tag vorausschauend planen',reason:'Für zukünftige Tage bewertet CutCoach noch keinen Ist-Stand. Plane Mahlzeiten und Training erst, wenn sie konkret feststehen.',label:'Planung ansehen',mealType:''};
    if(total.calories<=0)add(100,'meal','Erste Mahlzeit eintragen','Ohne Mahlzeit fehlen dem Coach Kalorien- und Makrodaten für eine belastbare Tagesbewertung.','Mahlzeit eintragen',recommendedMealType());
    if(total.calories>settings.calories+250)add(98,'summary','Kalorienkurs beruhigen',`Du liegst aktuell ${fmt(total.calories-settings.calories)} kcal über deinem Ziel. Kalorienfreie Getränke und ein ruhiger Tagesabschluss sind jetzt sinnvoller als weiteres Nachsteuern.`,`Tageskurs prüfen`);
    if(water<Math.max(250,pace-250)){const gap=Math.max(250,pace-water),now=Math.min(500,Math.max(250,Math.ceil(Math.min(gap,500)/250)*250)),after=Math.max(0,gap-now);add(94,'water',water<=0?`Mit ${fmt(now)} ml ruhig starten`:'Trinkkurs in kleinen Schritten aufholen',`Bis zum aktuellen Trinkkurs fehlen ${fmt(gap)} ml. Trinke jetzt ${fmt(now)} ml${after?` und verteile die übrigen ${fmt(after)} ml über die nächsten Stunden`:''} – nicht alles auf einmal.`,`Wasser öffnen`)}
    const proteinPace=Math.max(25,settings.protein*progress);
    if(total.calories>0&&total.protein<proteinPace-15&&calorieRemaining>120){const nextProtein=Math.min(40,Math.max(20,Math.round(Math.min(proteinRemaining,35)/5)*5));add(90,'meal',`${fmt(nextProtein)} g Eiweiß gezielt einplanen`,`Bis zum aktuellen Tageskurs fehlen etwa ${fmt(proteinPace-total.protein)} g Eiweiß. Eine Portion mit ${fmt(nextProtein)} g schließt die Lücke kontrolliert und lässt ${fmt(Math.max(0,calorieRemaining))} kcal Spielraum.`,`Passende Mahlzeit finden`,recommendedMealType())}
    if(isToday()&&hour>=18&&calorieRemaining>450)add(84,'meal','Restkalorien sinnvoll verteilen',`${fmt(calorieRemaining)} kcal sind noch offen. Eine eiweißreiche, planbare Mahlzeit verhindert ein unnötig großes Defizit.`,`Mahlzeit planen`,recommendedMealType());
    if(settings.steps>0&&data.steps===null)add(78,'steps','Schritte erfassen','Der Bewegungsbereich ist noch leer. Ein aktueller Wert macht Aktivität und Tagesnote deutlich aussagekräftiger.','Schritte eintragen');
    else if(settings.steps>0&&stepGap>0&&hour>=15){const minutes=Math.max(5,Math.ceil(Math.min(stepGap,3000)/100/5)*5);add(72,'steps',`${fmt(minutes)} Minuten Bewegung einplanen`,`${fmt(stepGap)} Schritte fehlen bis zum Tagesziel. Etwa ${fmt(minutes)} Minuten zügiges Gehen schließen einen realistischen Teil der Lücke, ohne den Abend zu überladen.`,`Schritte öffnen`)}
    const missing=[];if(data.weight===null)missing.push('Gewicht');if(data.gym===null)missing.push('Training');if(data.alcohol===null)missing.push('Alkohol');
    if(missing.length)add(58,'check','Tagescheck vervollständigen',`${missing.join(', ')} ${missing.length===1?'ist':'sind'} noch offen. Vollständige Angaben verbessern Rückblick und Tagesnote.`,`Zum Tagescheck`);
    if(!priorities.length)add(10,'summary','Kurs halten und abschließen','Die wichtigsten Bereiche sind im Soll. Prüfe den Tagesabschluss, bevor du den Tag beendest.','Tagesabschluss');
    return priorities.sort((a,b)=>b.urgency-a.urgency)[0];
  }

  function pillarModels(total,data,settings,water){
    const progress=dayProgress(),caloriePace=Math.max(200,settings.calories*progress),proteinPace=Math.max(20,settings.protein*progress),calorieRatio=total.calories/caloriePace,proteinRatio=total.protein/proteinPace;
    const nutritionProgress=total.calories<=0?0:clamp((Math.min(calorieRatio,1)*.45+Math.min(proteinRatio,1)*.55)*100);
    const calorieRemaining=settings.calories-total.calories,proteinRemaining=settings.protein-total.protein;
    const nutrition={key:'nutrition',progress:nutritionProgress,tone:total.calories<=0?'neutral':total.calories>settings.calories+250?'attention':proteinRemaining>25?'warning':'good',value:total.calories<=0?'Noch keine Mahlzeit':`${fmt(total.calories)} kcal · ${fmt(total.protein)} g Eiweiß`,detail:total.calories<=0?'Ernährungsdaten fehlen':calorieRemaining<0?`${fmt(-calorieRemaining)} kcal über Ziel`:proteinRemaining>0?`${fmt(proteinRemaining)} g Eiweiß offen`:'Eiweißziel erreicht'};
    const stepGoal=Number(settings.steps)||0,steps=Number(data.steps)||0,movementProgress=stepGoal===0?100:data.steps===null?0:clamp(steps/stepGoal*100),training=data.gym===true?'Training: Ja':data.gym===false?'Training: Nein':'Training offen';
    const movement={key:'movement',progress:movementProgress,tone:stepGoal===0?'good':data.steps===null?'neutral':steps>=stepGoal?'good':movementProgress>=60?'warning':'attention',value:stepGoal===0?'Kein Schrittziel':data.steps===null?'Noch nicht erfasst':`${fmt(steps)} / ${fmt(stepGoal)} Schritte`,detail:training};
    const pace=Math.max(250,waterPace()),waterProgress=clamp(water/Math.max(3000,pace)*100),alcohol=data.alcohol===false?'alkoholfrei':data.alcohol===true?'Alkohol eingetragen':'Alkohol offen';
    const recovery={key:'recovery',progress:Math.round((Math.min(water/Math.max(250,pace),1)*.65+(data.alcohol===false?1:data.alcohol===true?0:.35)*.35)*100),tone:data.alcohol===true?'attention':water>=pace&&data.alcohol===false?'good':water<pace-250?'warning':'neutral',value:`${fmt(water/1000,2)} l Wasser`,detail:alcohol};
    return [nutrition,movement,recovery];
  }

  function coachPhase(){
    if(isPast())return 'Tagesrückblick';
    if(!isToday())return 'Planung';
    const hour=currentHour();return hour<11?'Morgenstart':hour<17?'Tageskurs':hour<21?'Abendfokus':'Tagesabschluss';
  }
  function coachTitle(total,score){
    if(isPast())return total.calories>0?'Was diesen Tag geprägt hat':'Noch keine Tagesdaten';
    if(total.calories<=0)return 'Bereit für deinen Tag';
    if(score===null)return 'Dein Tageskurs entsteht';
    if(score>=8)return 'Starker Tageskurs';
    if(score>=6)return 'Solider Kurs mit Potenzial';
    return 'Jetzt gezielt nachsteuern';
  }

  function renderCoach(total,data,settings,water,score){
    upgradeCoach();const coach=$('.journal-coach-card.coach-v71');if(!coach)return;
    const action=priorityModel(total,data,settings,water),pillars=pillarModels(total,data,settings,water),pace=waterPace();
    const checks=[total.calories>0,data.steps!==null||settings.steps===0,water>=(isToday()?pace:3000),data.weight!==null,data.gym!==null,data.alcohol!==null],coverage=checks.filter(Boolean).length;
    $('#journalCoachTitle').textContent=coachTitle(total,score);$('#coachV71Phase').textContent=coachPhase();
    const missing=[];if(total.calories<=0)missing.push('Ernährung');if(data.steps===null&&settings.steps>0)missing.push('Schritte');if(water<(isToday()?pace:3000))missing.push('Wasser');if(data.weight===null)missing.push('Gewicht');if(data.gym===null)missing.push('Training');if(data.alcohol===null)missing.push('Alkohol');
    $('#journalCoachText').textContent=coverage===6?'Alle Kernbereiche sind erfasst. Der Impuls priorisiert jetzt Zielabweichung, Tageszeit und den kleinsten wirksamen nächsten Schritt.':missing.length?`Datenbasis ${coverage}/6. Noch offen oder unter Plan: ${missing.slice(0,3).join(', ')}${missing.length>3?' und weitere':''}. Die Empfehlung nutzt nur belastbar erfasste Werte.`:'Die Empfehlung nutzt Tageszeit, Zielabstand und deine erfassten Werte.';
    $('#coachV71FocusTitle').textContent=action.title;$('#coachV71FocusReason').textContent=action.reason;
    const button=$('#coachV71Action');button.textContent=action.label;button.dataset.action=action.type;button.dataset.mealType=action.mealType||'';coach.dataset.focus=action.type;
    $('#coachV71Coverage').textContent=`${coverage} von 6 Kernpunkten erfasst`;
    for(const pillar of pillars){const article=$(`[data-coach-pillar="${pillar.key}"]`);if(!article)continue;article.className=pillar.tone;article.style.setProperty('--coach-progress',`${clamp(pillar.progress)}%`);article.querySelector('b').textContent=pillar.value;article.querySelector('em').textContent=pillar.detail}
  }

  function animateNumber(node,target,{digits=0,suffix=''}={}){
    if(!node)return;const start=previous.has(node.id)?previous.get(node.id):target;previous.set(node.id,target);
    if(reduceMotion()||Math.abs(target-start)<.01){node.textContent=`${fmt(target,digits)}${suffix}`;return}
    const began=performance.now(),duration=520;
    const frame=now=>{const progress=Math.min(1,(now-began)/duration),eased=1-(1-progress)**3,value=start+(target-start)*eased;node.textContent=`${fmt(value,digits)}${suffix}`;if(progress<1)requestAnimationFrame(frame)};
    requestAnimationFrame(frame);
  }

  function renderEffects(){
    ensureJournalExtras();if(typeof totals!=='function'||typeof day!=='function'||typeof state!=='object')return;
    const total=totals(selectedDate),data=day(selectedDate,false),settings=state.settings,water=selectedWater(),remaining=settings.calories-total.calories,score=typeof window.dailyScore==='function'?window.dailyScore():null;
    animateNumber($('#journalRemaining'),Math.abs(remaining));const eaten=$('#journalEaten');if(eaten)animateNumber(eaten,total.calories,{suffix:' kcal'});if(score!==null){animateNumber($('#journalScoreLarge'),score,{digits:0});animateNumber($('#journalScore'),score,{digits:0})}
    const ring=$('#journalCalorieRing');ring?.classList.toggle('v7-balanced',Math.abs(remaining)<=200&&total.calories>0);ring?.classList.toggle('v7-warning',remaining>200&&remaining<=450);ring?.classList.toggle('v7-over',remaining<0);
    [['protein',total.protein,settings.protein],['carbs',total.carbs,settings.carbs],['fat',total.fat,settings.fat]].forEach(([key,value,goal])=>{const article=$(`#${key}JournalText`)?.closest('article'),gap=goal-value,label=article?.querySelector('.macro-v7-gap');if(label)label.textContent=gap>0?`${fmt(gap)} g fehlen`:gap===0?'Ziel genau erreicht':`${fmt(-gap)} g darüber`;article?.classList.toggle('v7-goal-hit',goal>0&&value>=goal*.9&&value<=goal*1.1)});
    const glasses=$('.water-v7-glasses');if(glasses)glasses.textContent=water>0?`≈ ${fmt(water/250,0)} Gläser`:'Noch leer';const waterRing=$('#journalWaterRing');waterRing?.classList.toggle('water-empty',water<=0);waterRing?.classList.toggle('water-started',water>0);waterRing?.classList.toggle('v7-water-goal',water>=3000);waterRing?.style.setProperty('--water-ratio',`${Math.min(100,water/3000*100)}%`);
    const steps=Number(data.steps)||0,stepGoal=Number(settings.steps)||0,stepCard=$('.journal-steps-card');stepCard?.classList.toggle('v7-quarter',stepGoal>0&&steps>=stepGoal*.25);stepCard?.classList.toggle('v7-half',stepGoal>0&&steps>=stepGoal*.5);stepCard?.classList.toggle('v7-three-quarter',stepGoal>0&&steps>=stepGoal*.75);stepCard?.classList.toggle('v7-complete',stepGoal>0&&steps>=stepGoal);
    const check=$('.journal-check-card'),complete=data.weight!==null&&data.gym!==null&&data.alcohol!==null;check?.classList.toggle('v7-check-complete',complete);const finish=$('#journalFinishDay');if(finish)finish.textContent=complete?'✓ Tagesabschluss ansehen':'Tagesabschluss ansehen';
    const achievements=[];if(settings.protein>0&&total.protein>=settings.protein*.9)achievements.push('Eiweiß im Ziel');if(water>=3000)achievements.push('Hydration erreicht');if(stepGoal>0&&steps>=stepGoal)achievements.push('Schrittziel');if(complete)achievements.push('Tagescheck vollständig');const host=$('#journalAchievements');if(host)host.innerHTML=achievements.map(text=>`<span>${text}</span>`).join('');
    const greeting=$('#journalGreeting');if(greeting&&isToday()){const hour=new Date().getHours(),base=hour<11?'Guten Morgen!':hour<17?'Guten Tag!':'Guten Abend!';greeting.textContent=achievements.length>=3?`${base} Starker Lauf.`:total.calories>0?`${base} Bleib auf Kurs.`:base}
    renderCoach(total,data,settings,water,score);
  }

  function bindPremium(){
    if(premiumBound)return;premiumBound=true;
    document.addEventListener('click',event=>{const target=event.target.closest?.('[data-nutrition-add],[data-journal-water],[data-journal-gym],[data-journal-alcohol],#saveMeal,#saveWeight,#journalStepSave,#coachV71Action');if(target)try{navigator.vibrate?.(target.matches('[data-journal-water]')?8:12)}catch{}},true);
    let startX=0,current=null;document.addEventListener('touchstart',event=>{const row=event.target.closest?.('.nutrition-current-row');if(!row)return;startX=event.changedTouches[0]?.clientX||0;current=row},{passive:true});document.addEventListener('touchend',event=>{if(!current)return;const delta=(event.changedTouches[0]?.clientX||0)-startX;if(delta<-45)current.classList.add('v7-swiped');else if(delta>35)current.classList.remove('v7-swiped');current=null},{passive:true});
    const search=$('#nutritionSearch');if(search&&!search.dataset.v7Skeleton){search.dataset.v7Skeleton='1';search.addEventListener('input',()=>{const results=$('#nutritionResults');results?.classList.add('v7-loading');setTimeout(()=>results?.classList.remove('v7-loading'),140)})}
  }

  function start(){
    if(initialized)return;if(!$('#today560')){setTimeout(start,80);return}initialized=true;ensureJournalExtras();bindPremium();
    const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){baseRender();renderEffects()};
    const observer=new MutationObserver(()=>{ensureJournalExtras();bindPremium()});observer.observe(document.body,{childList:true,subtree:true});
    renderEffects();const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
