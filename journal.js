'use strict';
(function(){
  const VERSION=typeof APP_VERSION==='string'?APP_VERSION:'2.2.1-alpha';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_RECOVERY_KEY='cutcoach_water_recovery_raw_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v10';
  const WATER_TARGET=3000;
  const WATER_MAX=6000;
  const mealIcons={'Frühstück':'☕','Mittagessen':'🥗','Abendessen':'🌙','Snack':'🍎'};
  const mealRatios={'Frühstück':.30,'Mittagessen':.35,'Abendessen':.25,'Snack':.10};
  const clampValue=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const fmt0=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(Math.max(0,Number(value)||0));
  const fmt1=value=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Math.max(0,Number(value)||0));
  const percent=(value,goal)=>goal>0?clampValue(value/goal*100,0,100):0;
  const root=()=>document.querySelector('#today560');
  let calendarMonth=null;
  let calendarReturnFocus=null;
  let volatileWaterUndo=null;

  function readObject(storage,key,fallback={}){
    try{
      const value=JSON.parse(storage.getItem(key)||'null');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
    }catch{return fallback}
  }
  function preserveWaterRecovery(raw){
    if(!raw)return;
    try{if(!localStorage.getItem(WATER_RECOVERY_KEY))localStorage.setItem(WATER_RECOVERY_KEY,raw)}catch{}
  }
  function waterMap(){
    let raw='';
    try{raw=localStorage.getItem(WATER_KEY)||''}catch{return {}}
    if(!raw)return {};
    try{
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('invalid-water-data');
      const clean={};
      for(const [key,value] of Object.entries(parsed)){
        if(typeof validDateKey==='function'&&!validDateKey(key))continue;
        const amount=Number(value);
        if(Number.isFinite(amount)&&amount>0)clean[key]=Math.round(clampValue(amount,0,WATER_MAX));
      }
      return clean;
    }catch{
      preserveWaterRecovery(raw);
      return {};
    }
  }
  function waterFor(key=selectedDate){return Math.round(clampValue(waterMap()[key]||0,0,WATER_MAX))}
  function waterPace(key=selectedDate){
    if(key!==todayKey())return key<todayKey()?WATER_TARGET:0;
    const now=new Date(),hour=now.getHours()+now.getMinutes()/60;
    return Math.round(clampValue((hour-7)/15,.08,1)*WATER_TARGET/250)*250;
  }
  function undoRecord(){return readObject(localStorage,WATER_UNDO_KEY,null)||volatileWaterUndo}
  function storeUndo(record){volatileWaterUndo=record;try{localStorage.setItem(WATER_UNDO_KEY,JSON.stringify(record))}catch{}}
  function clearUndo(){volatileWaterUndo=null;try{localStorage.removeItem(WATER_UNDO_KEY)}catch{}}
  function isJournalActive(){return document.querySelector('[data-screen="today"]')?.classList.contains('active')}
  function renderNow(){if(typeof window.render==='function')window.render()}

  function greeting(){
    if(selectedDate!==todayKey())return 'Tagesrückblick';
    const hour=new Date().getHours();
    return hour<11?'Guten Morgen! 👋':hour<17?'Guten Tag! 👋':'Guten Abend! 👋';
  }
  function activityEstimate(data){
    const steps=data.steps===null?0:Number(data.steps)||0;
    return Math.max(0,Math.round(steps*.04)+(data.gym===true?180:0));
  }
  function hasDiaryEntry(key){
    const data=day(key,false);
    return Boolean(data.meals?.length||data.steps!==null||data.weight!==null||data.gym!==null||data.alcohol!==null||waterFor(key)>0);
  }
  function streakState(){
    const today=todayKey(),todayDone=hasDiaryEntry(today),start=todayDone?today:shiftKey(today,-1);
    let count=0,cursor=dateFromKey(start);
    for(let index=0;index<366;index++){
      const key=keyFromDate(cursor);
      if(!hasDiaryEntry(key))break;
      count++;cursor.setDate(cursor.getDate()-1);
    }
    return {count,pending:!todayDone&&count>0};
  }

  function dayProgress(){
    if(selectedDate!==todayKey())return 1;
    const now=new Date(),hour=now.getHours()+now.getMinutes()/60;
    if(hour<8)return .08;
    if(hour<11)return .18+(hour-8)*.06;
    if(hour<14)return .36+(hour-11)*.09;
    if(hour<18)return .63+(hour-14)*.065;
    if(hour<22)return .89+(hour-18)*.0275;
    return 1;
  }
  function isFinalDay(){
    if(selectedDate<todayKey())return true;
    if(selectedDate>todayKey())return false;
    const now=new Date();return now.getHours()+now.getMinutes()/60>=22;
  }
  function paceTarget(target,min=0){return Math.max(min,Math.round(target*dayProgress()))}
  function addScorePart(parts,value,weight){parts.push({value:clampValue(value,0,1),weight})}
  function completionStatusJournal(){
    const total=totals(),data=day(selectedDate,false),water=waterFor();
    const hydrationComplete=selectedDate===todayKey()?water>=waterPace():water>=WATER_TARGET;
    const items=[
      ['Ernährung',total.calories>0],
      ['Schritte',data.steps!==null||state.settings.steps===0],
      ['Wasser',hydrationComplete],
      ['Training',data.gym!==null],
      ['Alkohol',data.alcohol!==null]
    ];
    const done=items.filter(([,complete])=>complete).length;
    return {done,total:items.length,complete:done===items.length,missing:items.filter(([,complete])=>!complete).map(([name])=>name)};
  }
  function dailyScoreJournal(){
    const total=totals(),data=day(selectedDate,false),settings=state.settings;
    if(total.calories<=0)return null;
    const parts=[],progress=isFinalDay()?1:dayProgress();
    const calorieTarget=settings.calories*progress,proteinTarget=settings.protein*progress;
    const fatMin=settings.fat*.8*progress,fatMax=settings.fat*1.2*progress;
    const calorieDelta=total.calories-(isFinalDay()?settings.calories:calorieTarget),absolute=Math.abs(calorieDelta);
    addScorePart(parts,absolute<=Math.max(120,calorieTarget*.12)?1:absolute<=Math.max(250,calorieTarget*.22)?.78:calorieDelta<0?.5:.25,3);
    addScorePart(parts,total.protein/Math.max(20,proteinTarget),2.2);
    addScorePart(parts,total.fat>=fatMin&&total.fat<=fatMax?1:total.fat<=fatMax*1.25?.68:.3,1);
    if(settings.steps===0)addScorePart(parts,1,1.35);
    else if(data.steps!==null)addScorePart(parts,data.steps/Math.max(500,isFinalDay()?settings.steps:paceTarget(settings.steps,500)),1.35);
    if(data.gym!==null)addScorePart(parts,data.gym||settings.gymGoal===0?1:range(selectedDate,7).filter(item=>item.data.gym===true).length>=settings.gymGoal?.9:.72,1.05);
    if(data.alcohol!==null)addScorePart(parts,data.alcohol?0:1,.75);
    addScorePart(parts,waterFor()/Math.max(250,isFinalDay()?WATER_TARGET:paceTarget(WATER_TARGET,250)),.65);
    const weight=parts.reduce((sum,item)=>sum+item.weight,0);
    let score=parts.reduce((sum,item)=>sum+item.value*item.weight,0)/Math.max(1,weight)*10;
    const status=completionStatusJournal();
    if(!isFinalDay()&&!status.complete)score=Math.min(score,8.4);
    if(isFinalDay()&&!status.complete)score=Math.min(score,7.4);
    return Math.round(clampValue(score,0,10)*10)/10;
  }
  function feedbackJournal(){
    const total=totals(),data=day(selectedDate,false),settings=state.settings,lines=[];
    const progress=isFinalDay()?1:dayProgress(),remaining=settings.calories-total.calories;
    const proteinNeed=Math.max(0,Math.round(settings.protein*progress-total.protein));
    const hydrationTarget=isFinalDay()?WATER_TARGET:paceTarget(WATER_TARGET,250);
    const waterNeed=Math.max(0,hydrationTarget-waterFor());
    if(!total.calories)lines.push('🎯 Erste Mahlzeit eintragen');
    else if(isFinalDay()&&settings.maintenance-total.calories>1000)lines.push('🎯 Defizit nicht weiter vergrößern · eiweißreich essen');
    else if(proteinNeed>20&&remaining>120)lines.push(`🎯 Bis jetzt noch etwa ${fmt0(proteinNeed)} g Eiweiß einplanen`);
    else if(total.calories>settings.calories+300)lines.push('🎯 Kalorienziel überschritten · heute kalorienfrei trinken');
    else if(isFinalDay()&&remaining>400)lines.push(`🎯 Noch rund ${fmt0(remaining)} kcal sinnvoll verteilen`);
    else lines.push(isFinalDay()?'🎯 Tageskurs halten':'🎯 Aktueller Tageskurs passt');
    if(waterNeed>250)lines.push(`💧 ${fmt0(waterNeed)} ml bis zum aktuellen Trinkplan`);
    else if(waterFor()>=WATER_TARGET)lines.push('✅ Hydration erreicht');
    if(data.alcohol===true)lines.push('⚠️ Alkohol reduziert Regeneration');
    else if(data.steps!==null&&data.steps>=settings.steps)lines.push('✅ Schrittziel erreicht');
    else if(data.alcohol===false&&lines.length<3)lines.push('✅ Regeneration: alkoholfrei');
    return lines.slice(0,3).join('\n');
  }
  window.completionStatus=completionStatusJournal;
  window.dailyScore=dailyScoreJournal;
  window.feedback=feedbackJournal;

  function commitDay(change,errorMessage){
    if(typeof commitDayMutation==='function'&&commitDayMutation(change,selectedDate))return true;
    toast?.(errorMessage);return false;
  }
  function saveSteps(input,editor,toggle){
    const raw=String(input.value??'').trim(),value=Number(raw);
    if(raw===''||!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    if(!commitDay(entry=>{entry.steps=value},'Schritte konnten nicht gespeichert werden.'))return;
    editor.hidden=true;toggle.setAttribute('aria-expanded','false');renderNow();
    toast?.(`${value.toLocaleString('de-DE')} Schritte gespeichert.`);
  }
  function clearSteps(editor,toggle){
    if(!commitDay(entry=>{entry.steps=null},'Schritte konnten nicht entfernt werden.'))return;
    editor.hidden=true;toggle.setAttribute('aria-expanded','false');renderNow();toast?.('Schritte entfernt.');
  }
  function toggleCheck(type,value){
    const field=type==='gym'?'gym':'alcohol',current=day(selectedDate,false)[field];
    if(!commitDay(entry=>{entry[field]=current===value?null:value},'Tagescheck konnte nicht gespeichert werden.'))return;
    renderNow();
  }

  function writeWater(next,remember=true){
    const previous=waterFor(),requested=Math.round(Number(next)||0),amount=Math.round(clampValue(requested,0,WATER_MAX));
    if(amount===previous)return true;
    const all=waterMap();
    if(amount)all[selectedDate]=amount;else delete all[selectedDate];
    try{localStorage.setItem(WATER_KEY,JSON.stringify(all))}
    catch(error){console.error(error);toast?.('Wasser konnte nicht gespeichert werden.');return false}
    if(remember)storeUndo({date:selectedDate,previous,current:amount,at:Date.now()});
    else clearUndo();
    if(requested>WATER_MAX)toast?.('Maximal 6.000 ml pro Tag eintragbar.');
    try{navigator.vibrate?.(10)}catch{}
    renderNow();return true;
  }
  function undoWater(){
    const record=undoRecord(),current=waterFor();
    if(current<=0)return;
    const exact=Boolean(record&&record.date===selectedDate&&Number(record.current)===current&&Number(record.previous)>=0&&Number(record.previous)<current);
    const previous=exact?Math.round(clampValue(record.previous,0,WATER_MAX)):Math.max(0,current-Math.min(250,current));
    if(writeWater(previous,false))toast?.(exact?'Letzte Wasseränderung zurückgenommen.':`${fmt0(current-previous)} ml entfernt.`);
  }

  function selectJournalDate(key){
    if(typeof setSelectedDate!=='function'||!setSelectedDate(key,{hash:'#today'}))return;
    closeCalendar();renderNow();
  }

  function ensureCalendar(){
    let modal=document.querySelector('#journalCalendarModal');
    if(modal)return modal;
    modal=document.createElement('div');modal.id='journalCalendarModal';modal.className='journal-calendar-modal';modal.hidden=true;
    modal.innerHTML='<div class="journal-calendar-backdrop"></div><section class="journal-calendar-sheet" role="dialog" aria-modal="true" aria-labelledby="journalCalendarTitle"><header><button type="button" id="journalCalendarPrevMonth" aria-label="Vorheriger Monat">‹</button><strong id="journalCalendarTitle"></strong><button type="button" id="journalCalendarNextMonth" aria-label="Nächster Monat">›</button></header><div class="journal-calendar-weekdays" aria-hidden="true"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="journalCalendarDays" class="journal-calendar-days" role="grid" aria-label="Kalendertage"></div><footer><button type="button" id="journalCalendarToday">Heute</button><button type="button" id="journalCalendarClose">Schließen</button></footer></section>';
    document.body.append(modal);
    modal.querySelector('.journal-calendar-backdrop').addEventListener('click',closeCalendar);
    modal.querySelector('#journalCalendarClose').addEventListener('click',closeCalendar);
    modal.querySelector('#journalCalendarToday').addEventListener('click',()=>selectJournalDate(todayKey()));
    modal.querySelector('#journalCalendarPrevMonth').addEventListener('click',()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar()});
    modal.querySelector('#journalCalendarNextMonth').addEventListener('click',()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar()});
    modal.querySelector('#journalCalendarDays').addEventListener('keydown',event=>{
      const button=event.target.closest('button[data-date]'),offset={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key];
      if(!button||offset===undefined)return;
      const targetKey=shiftKey(button.dataset.date,offset);
      event.preventDefault();
      if(targetKey>todayKey())return;
      const targetDate=dateFromKey(targetKey);
      if(targetDate.getFullYear()!==calendarMonth.getFullYear()||targetDate.getMonth()!==calendarMonth.getMonth()){
        calendarMonth=new Date(targetDate.getFullYear(),targetDate.getMonth(),1,12);
        renderCalendar();
      }
      const target=modal.querySelector(`[data-date="${targetKey}"]:not(:disabled)`);
      if(target){modal.querySelectorAll('#journalCalendarDays button').forEach(dayButton=>{dayButton.tabIndex=-1});target.tabIndex=0;target.focus()}
    });
    modal.addEventListener('keydown',event=>{
      if(event.key==='Escape'){event.preventDefault();closeCalendar();return}
      if(event.key!=='Tab')return;
      const controls=[...modal.querySelectorAll('button:not([disabled])')];
      if(!controls.length)return;
      const first=controls[0],last=controls.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    });
    return modal;
  }
  function openCalendar(){
    const modal=ensureCalendar();
    calendarReturnFocus=document.activeElement;
    calendarMonth=dateFromKey(selectedDate);calendarMonth.setDate(1);
    renderCalendar();modal.hidden=false;document.body.classList.add('journal-calendar-open');
    setTimeout(()=>modal.querySelector('.selected:not(:disabled),#journalCalendarClose')?.focus(),0);
  }
  function closeCalendar(){
    const modal=document.querySelector('#journalCalendarModal');
    if(!modal||modal.hidden)return;
    modal.hidden=true;document.body.classList.remove('journal-calendar-open');
    if(calendarReturnFocus instanceof HTMLElement)calendarReturnFocus.focus({preventScroll:true});
    calendarReturnFocus=null;
  }
  function renderCalendar(){
    const modal=ensureCalendar();if(!calendarMonth)return;
    modal.querySelector('#journalCalendarTitle').textContent=calendarMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    const days=modal.querySelector('#journalCalendarDays');days.replaceChildren();
    const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1,12);
    const offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(first.getDate()-offset);
    const today=todayKey();
    for(let index=0;index<42;index++){
      const date=new Date(start);date.setDate(start.getDate()+index);
      const key=keyFromDate(date),button=document.createElement('button');
      button.type='button';button.textContent=String(date.getDate());button.dataset.date=key;button.disabled=key>today;
      button.tabIndex=-1;
      button.setAttribute('role','gridcell');button.setAttribute('aria-label',date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
      button.classList.toggle('outside',date.getMonth()!==calendarMonth.getMonth());
      button.classList.toggle('selected',key===selectedDate);button.classList.toggle('today',key===today);
      if(key===selectedDate)button.setAttribute('aria-selected','true');
      if(key===today)button.setAttribute('aria-current','date');
      button.addEventListener('click',()=>selectJournalDate(key));days.append(button);
    }
    const tabStop=days.querySelector(`[data-date="${selectedDate}"]:not(:disabled)`)||days.querySelector('button:not(.outside):not(:disabled)')||days.querySelector('button:not(:disabled)');
    if(tabStop)tabStop.tabIndex=0;
    const now=new Date();
    modal.querySelector('#journalCalendarNextMonth').disabled=calendarMonth.getFullYear()===now.getFullYear()&&calendarMonth.getMonth()>=now.getMonth();
  }

  function ensureJournal(){
    const screen=document.querySelector('[data-screen="today"]');
    if(!screen||root())return root();
    const host=document.createElement('div');host.id='today560';host.className='journal560';host.dataset.journalController=VERSION;
    host.innerHTML=`
      <section class="journal-topbar">
        <button class="journal-date-button" id="journalDateButton" type="button" aria-label="Datum auswählen">
          <img src="icon.svg" alt=""><span><strong id="journalWeekday">Heute</strong><small id="journalDate">–</small></span>
        </button>
        <div class="journal-topbar-tools">
          <div class="journal-day-controls">
            <button id="journalPrevDay" type="button" aria-label="Vorheriger Tag">‹</button>
            <button id="journalNextDay" type="button" aria-label="Nächster Tag">›</button>
          </div>
          <div class="journal-mini-stats" role="group" aria-label="Tagesnote und Tagesserie">
            <span class="journal-status-item journal-score-status" title="Tagesnote"><i class="journal-status-icon" aria-hidden="true">💎</i><small>Tagesnote</small><b id="journalScore">Offen</b></span>
            <span class="journal-status-item journal-streak-status" title="Tagesserie"><i class="journal-status-icon" aria-hidden="true">🔥</i><small>Tagesserie</small><b id="journalGym">0</b></span>
          </div>
          <button class="journal-calendar-button" id="journalCalendarButton" type="button" aria-label="Kalender öffnen"></button>
        </div>
      </section>
      <section class="journal-heading"><div><small id="journalGreeting">Guten Tag! 👋</small><h1 id="journalHeadline">Dein Tagesüberblick</h1></div></section>
      <section class="journal-energy-card">
        <div class="journal-energy-grid">
          <div class="journal-calorie-ring" id="journalCalorieRing"><div><small id="journalRingLabel">Noch verfügbar</small><strong id="journalRemaining">0</strong><span>kcal</span><em>von <b id="journalGoalInside">0</b> kcal</em></div></div>
          <div class="journal-energy-stats">
            <article><span class="stat-icon green">🍴</span><div><small>Gegessen</small><strong id="journalEaten">0 kcal</strong></div></article>
            <article><span class="stat-icon blue">◎</span><div><small>Tagesziel</small><strong id="journalGoal">0 kcal</strong></div></article>
            <article title="Geschätzter Aktivitätsverbrauch aus Schritten und Training. Das feste Kalorienziel wird dadurch nicht automatisch erhöht."><span class="stat-icon violet">♨</span><div><small>Aktivität</small><strong id="journalBurned">0 kcal</strong></div></article>
          </div>
        </div>
        <div class="journal-macros">
          ${[['protein','Eiweiß','💪','green'],['carbs','Kohlenhydrate','🌾','yellow'],['fat','Fett','💧','violet']].map(([key,label,icon,tone])=>`<article><div class="journal-macro-title"><span class="${tone}">${icon}</span><div><b>${label}</b><small id="${key}JournalText">0 / 0 g</small></div></div><div class="journal-macro-bar"><i id="${key}JournalBar" class="${tone}"></i></div><em id="${key}JournalPct">0 %</em></article>`).join('')}
        </div>
      </section>
      <section class="journal-meals-card">
        <div class="journal-section-title"><div><span>🍴</span><h2>Deine Mahlzeiten</h2><small id="journalMealSummary" class="journal-meal-summary">Noch leer</small></div></div>
        <div id="journalMeals" class="journal-meals"></div>
      </section>
      <section class="journal-steps-card">
        <div class="journal-card-head"><div><span>👣</span><div><h2>Schritte</h2><strong id="journalSteps">– Schritte</strong><small id="journalStepMeta">Noch nicht eingetragen</small></div></div><div class="journal-step-target"><small>Ziel: <b id="journalStepGoal">0</b></small><button id="journalStepToggle" type="button" aria-label="Schritte bearbeiten" aria-expanded="false">›</button></div></div>
        <div class="journal-step-progress"><i id="journalStepBar"></i><b id="journalStepPct">0%</b></div>
        <div class="journal-step-editor" id="journalStepEditor" hidden><input id="journalStepInput" type="number" min="0" max="100000" step="1" inputmode="numeric" placeholder="Schritte"><button id="journalStepSave" type="button">Speichern</button><button id="journalStepClear" class="journal-clear" type="button" aria-label="Schritte entfernen">×</button></div>
      </section>
      <section class="journal-water-card">
        <div class="journal-card-head compact"><div><span>💧</span><div><h2>Wasser</h2><small>Ziel: 3,0 l</small></div></div><button class="journal-info" id="journalWaterInfo" type="button" aria-label="Wasser erklären">i</button></div>
        <div class="journal-water-layout"><div class="journal-water-ring" id="journalWaterRing"><div><strong id="journalWaterAmount">0,00 l</strong><small>Getrunken</small></div></div><div class="journal-water-actions"><button type="button" data-journal-water="250">+250 ml</button><button type="button" data-journal-water="500">+500 ml</button><button type="button" id="journalWaterUndo">↶ Rückgängig</button></div></div>
        <p id="journalWaterHint" aria-live="polite">Starte mit dem ersten Glas.</p>
      </section>
      <section class="journal-check-card">
        <div class="journal-section-title"><div><span>✓</span><h2>Tagescheck</h2></div><small id="journalCheckStatus" class="journal-check-status" aria-live="polite">Noch offen</small></div>
        <div class="journal-check-grid">
          <article><small>Gewicht</small><strong id="journalWeight">– kg</strong><small id="journalWeightMeta" class="journal-weight-meta">Noch kein Messwert</small><button id="journalWeightButton" type="button">Eintragen</button></article>
          <article><small>Training</small><div><button data-journal-gym="true" type="button" aria-pressed="false">Ja</button><button data-journal-gym="false" type="button" aria-pressed="false">Nein</button></div></article>
          <article><small>Alkohol</small><div><button data-journal-alcohol="true" type="button" aria-pressed="false">Ja</button><button data-journal-alcohol="false" type="button" aria-pressed="false">Nein</button></div></article>
        </div>
      </section>
      <section class="journal-coach-card"><div class="journal-coach-icon">✦</div><div><small>CutCoach Impuls</small><strong id="journalCoachTitle">Dein Tagesfokus</strong><p id="journalCoachText" aria-live="polite">Trage deine ersten Werte ein.</p></div><div class="journal-score"><strong id="journalScoreLarge">–</strong><small>/10</small></div></section>`;
    screen.prepend(host);
    bindJournal(host);configureNavigation();syncJournalMode();return host;
  }

  function bindJournal(host){
    host.querySelector('#journalDateButton').addEventListener('click',openCalendar);
    host.querySelector('#journalCalendarButton').addEventListener('click',openCalendar);
    host.querySelector('#journalPrevDay').addEventListener('click',()=>selectJournalDate(shiftKey(selectedDate,-1)));
    host.querySelector('#journalNextDay').addEventListener('click',()=>{if(selectedDate<todayKey())selectJournalDate(shiftKey(selectedDate,1))});
    const editor=host.querySelector('#journalStepEditor'),input=host.querySelector('#journalStepInput'),save=host.querySelector('#journalStepSave'),clear=host.querySelector('#journalStepClear'),toggle=host.querySelector('#journalStepToggle');
    const syncStepSave=()=>{const raw=String(input.value).trim(),value=Number(raw),current=day(selectedDate,false).steps;save.disabled=raw===''||!Number.isInteger(value)||value<0||value>100000||String(current??'')===raw};
    toggle.addEventListener('click',()=>{editor.hidden=!editor.hidden;toggle.setAttribute('aria-expanded',String(!editor.hidden));if(!editor.hidden){input.value=day(selectedDate,false).steps??'';syncStepSave();setTimeout(()=>input.focus(),20)}});
    input.addEventListener('input',syncStepSave);
    input.addEventListener('keydown',event=>{if(event.key==='Enter'&&!save.disabled){event.preventDefault();saveSteps(input,editor,toggle)}else if(event.key==='Escape'){event.preventDefault();editor.hidden=true;toggle.setAttribute('aria-expanded','false')}});
    save.addEventListener('click',()=>saveSteps(input,editor,toggle));
    clear.addEventListener('click',()=>clearSteps(editor,toggle));
    host.querySelectorAll('[data-journal-water]').forEach(button=>button.addEventListener('click',()=>writeWater(waterFor()+Number(button.dataset.journalWater))));
    host.querySelector('#journalWaterUndo').addEventListener('click',undoWater);
    host.querySelector('#journalWaterInfo').addEventListener('click',()=>toast?.('Das Tagesziel liegt bei 3 Litern. Der aktuelle Trinkplan berücksichtigt bei heute auch die Tageszeit.'));
    host.querySelector('#journalWeightButton').addEventListener('click',()=>{const data=day(selectedDate,false),weight=document.querySelector('#weightInput'),remove=document.querySelector('#clearWeight');if(weight)weight.value=data.weight??'';if(remove)remove.hidden=data.weight===null;openModal?.('weightModal')});
    host.querySelectorAll('[data-journal-gym]').forEach(button=>button.addEventListener('click',()=>toggleCheck('gym',button.dataset.journalGym==='true')));
    host.querySelectorAll('[data-journal-alcohol]').forEach(button=>button.addEventListener('click',()=>toggleCheck('alcohol',button.dataset.journalAlcohol==='true')));
    let touchStart=0;
    host.querySelector('#journalDateButton').addEventListener('touchstart',event=>{touchStart=event.changedTouches[0]?.clientX||0},{passive:true});
    host.querySelector('#journalDateButton').addEventListener('touchend',event=>{const delta=(event.changedTouches[0]?.clientX||0)-touchStart;if(Math.abs(delta)<55)return;if(delta>0)selectJournalDate(shiftKey(selectedDate,-1));else if(selectedDate<todayKey())selectJournalDate(shiftKey(selectedDate,1))},{passive:true});
  }
  function configureNavigation(){
    const nav=document.querySelector('nav'),journal=nav?.querySelector('[data-tab="today"]');
    if(journal&&!journal.dataset.journalNamed){journal.dataset.journalNamed='1';journal.innerHTML='<span aria-hidden="true">▣</span>Tagebuch'}
    const iconMap={food:'🍴',progress:'⌁',settings:'⚙',library:'★'};
    Object.entries(iconMap).forEach(([tab,icon])=>{const span=nav?.querySelector(`[data-tab="${tab}"] span`);if(span)span.textContent=icon});
    nav?.querySelectorAll('[data-tab]').forEach(button=>{if(button.dataset.journalWatch)return;button.dataset.journalWatch='1';button.addEventListener('click',()=>setTimeout(syncJournalMode,0))});
  }
  function syncJournalMode(){document.body.classList.toggle('journal-mode',isJournalActive())}

  function renderMeals(data,settings){
    const host=document.querySelector('#journalMeals');if(!host)return;
    const full=typeof mealCapacity==='function'&&mealCapacity()===0;
    host.innerHTML=MEAL_TYPES.map(type=>{
      const items=data.meals.filter(item=>item.type===type),current=items.reduce((sum,item)=>sum+(Number(item.calories)||0),0),target=Math.round(settings.calories*(mealRatios[type]||.25)),progress=percent(current,target);
      return `<article class="journal-meal-row"><button class="journal-meal-main" type="button" data-add-journal-meal="${type}"><span class="journal-meal-accent ${type==='Frühstück'?'green':type==='Snack'?'red':'yellow'}"></span><span class="journal-meal-icon">${mealIcons[type]||'🍽️'}</span><span class="journal-meal-copy"><b>${type==='Snack'?'Snacks':type}</b><small>${fmt0(current)} / ${fmt0(target)} kcal</small></span><span class="journal-meal-progress"><i style="width:${progress}%"></i></span></button><button class="journal-meal-add" type="button" data-add-journal-meal="${type}" aria-label="${full?'Tageslimit erreicht':`${type} hinzufügen`}" ${full?'disabled title="Tageslimit erreicht"':''}>+</button></article>`;
    }).join('');
  }

  function renderJournal(){
    const host=ensureJournal();if(!host)return;
    configureNavigation();syncJournalMode();
    const settings=state.settings,data=day(selectedDate,false),total=totals(),date=dateFromKey(selectedDate),isToday=selectedDate===todayKey();
    const remaining=settings.calories-total.calories,rawCaloriePct=settings.calories>0?total.calories/settings.calories*100:0,score=dailyScoreJournal(),streak=streakState();
    host.querySelector('#journalWeekday').textContent=isToday?'Heute':date.toLocaleDateString('de-DE',{weekday:'long'});
    host.querySelector('#journalDate').textContent=date.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
    host.querySelector('#journalGreeting').textContent=greeting();host.querySelector('#journalHeadline').textContent=isToday?'Dein Tagesüberblick':'Dein Tagesrückblick';
    host.querySelector('#journalNextDay').disabled=selectedDate>=todayKey();
    const scoreNode=host.querySelector('#journalScore'),scoreLabel=score===null?'Tagesnote noch offen':`Tagesnote ${fmt1(score)} von 10`;
    scoreNode.textContent=score===null?'Offen':fmt1(score);scoreNode.closest('.journal-status-item').setAttribute('aria-label',scoreLabel);scoreNode.closest('.journal-status-item').title=scoreLabel;
    const streakNode=host.querySelector('#journalGym'),streakItem=streakNode.closest('.journal-status-item');streakNode.textContent=String(streak.count);
    const streakLabel=streak.pending?`${streak.count} Tage in Folge – heute fehlt noch ein Tagebucheintrag`:`${streak.count} Tage in Folge mit mindestens einem Tagebucheintrag`;
    streakItem.classList.toggle('pending',streak.pending);streakItem.setAttribute('aria-label',streakLabel);streakItem.title=streakLabel;
    host.querySelector('#journalRemaining').textContent=fmt0(Math.abs(remaining));host.querySelector('#journalRingLabel').textContent=remaining>=0?'Noch verfügbar':'Über Tagesziel';host.querySelector('#journalGoalInside').textContent=fmt0(settings.calories);
    host.querySelector('#journalEaten').textContent=`${fmt0(total.calories)} kcal`;host.querySelector('#journalGoal').textContent=`${fmt0(settings.calories)} kcal`;host.querySelector('#journalBurned').textContent=`${fmt0(activityEstimate(data))} kcal`;
    const ring=host.querySelector('#journalCalorieRing');ring.style.setProperty('--journal-calories',`${clampValue(rawCaloriePct,0,100)*3.6}deg`);ring.classList.toggle('over',remaining<0);ring.classList.toggle('near',remaining>=0&&remaining<=200);ring.classList.toggle('empty',total.calories===0);ring.setAttribute('aria-label',`${fmt0(total.calories)} von ${fmt0(settings.calories)} Kilokalorien gegessen`);
    [['protein',total.protein,settings.protein],['carbs',total.carbs,settings.carbs],['fat',total.fat,settings.fat]].forEach(([key,value,goal])=>{const raw=goal>0?value/goal*100:(value>0?100:0),shown=Math.round(raw),article=host.querySelector(`#${key}JournalText`).closest('article');host.querySelector(`#${key}JournalText`).textContent=`${fmt0(value)} / ${fmt0(goal)} g`;host.querySelector(`#${key}JournalBar`).style.width=`${clampValue(raw,0,100)}%`;host.querySelector(`#${key}JournalPct`).textContent=goal===0?(value===0?'–':`${fmt0(value)} g`):`${shown} %`;article.classList.toggle('complete',goal>0&&raw>=90&&raw<=110);article.classList.toggle('over',goal>0&&raw>110)});
    renderMeals(data,settings);
    const mealCount=data.meals.length;host.querySelector('#journalMealSummary').textContent=mealCount?`${mealCount} ${mealCount===1?'Eintrag':'Einträge'} · ${fmt0(total.calories)} kcal`:'Noch leer';
    host.querySelectorAll('.journal-meal-row').forEach((row,index)=>{const type=MEAL_TYPES[index],current=data.meals.filter(item=>item.type===type).reduce((sum,item)=>sum+(Number(item.calories)||0),0),goal=Math.round(settings.calories*(mealRatios[type]||.25));row.classList.toggle('filled',current>0);row.classList.toggle('complete',goal>0&&current>=goal*.85&&current<=goal*1.15);row.classList.toggle('over',goal>0&&current>goal*1.15)});
    const steps=data.steps===null?null:Number(data.steps)||0,stepGoal=Number(settings.steps)||0,stepPercent=stepGoal>0?Math.round(percent(steps||0,stepGoal)):0;
    host.querySelector('#journalSteps').textContent=steps===null?'– Schritte':`${fmt0(steps)} Schritte`;host.querySelector('#journalStepGoal').textContent=stepGoal>0?fmt0(stepGoal):'–';host.querySelector('#journalStepBar').style.width=`${stepPercent}%`;host.querySelector('#journalStepPct').textContent=stepGoal>0?`${stepPercent}%`:'Kein Ziel';host.querySelector('.journal-steps-card').classList.toggle('goal-reached',steps!==null&&stepGoal>0&&steps>=stepGoal);
    host.querySelector('#journalStepMeta').textContent=stepGoal===0?(steps===null?'Kein Schrittziel gesetzt':`${fmt1(steps*.00075)} km · ${fmt0(Math.round(steps*.04))} kcal`):steps===null?'Noch nicht eingetragen':steps<stepGoal?`Noch ${fmt0(stepGoal-steps)} bis Ziel · ${fmt1(steps*.00075)} km`:`Ziel erreicht · ${fmt1(steps*.00075)} km · ${fmt0(Math.round(steps*.04))} kcal`;
    const stepInput=host.querySelector('#journalStepInput');if(document.activeElement!==stepInput)stepInput.value=data.steps??'';host.querySelector('#journalStepClear').hidden=data.steps===null;
    const water=waterFor(),pace=waterPace(),waterPercent=percent(water,WATER_TARGET),waterCard=host.querySelector('.journal-water-card'),record=undoRecord(),hasExactUndo=Boolean(record&&record.date===selectedDate&&Number(record.current)===water&&Number(record.previous)>=0&&Number(record.previous)<water),undoAmount=water>0?(hasExactUndo?water-Number(record.previous):Math.min(250,water)):0;
    host.querySelector('#journalWaterAmount').textContent=`${new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(water/1000)} l`;host.querySelector('#journalWaterRing').style.setProperty('--journal-water',`${waterPercent*3.6}deg`);
    waterCard.classList.toggle('goal-reached',water>=WATER_TARGET);waterCard.classList.toggle('on-pace',water<WATER_TARGET&&water>=pace);waterCard.classList.toggle('behind',isToday&&water<pace-250);
    const waterHint=host.querySelector('#journalWaterHint');waterHint.textContent=water>=WATER_TARGET?(water>WATER_TARGET?`${fmt0(water-WATER_TARGET)} ml über dem Tagesziel.`:'Tagesziel erreicht – stark!'):isToday&&water>=pace?`Im Trinkplan · noch ${fmt0(WATER_TARGET-water)} ml bis zum Tagesziel.`:isToday&&water>0?`Noch ${fmt0(Math.max(0,pace-water))} ml bis zum aktuellen Soll.`:water>0?`Noch ${fmt0(WATER_TARGET-water)} ml bis zum Tagesziel.`:'Starte mit dem ersten Glas.';
    const undo=host.querySelector('#journalWaterUndo');undo.disabled=water<=0;undo.textContent=water>0?`↶ −${fmt0(undoAmount)} ml`:'↶ Rückgängig';undo.setAttribute('aria-label',water>0?`${fmt0(undoAmount)} Milliliter Wasser entfernen`:'Keine Wasseränderung zum Rückgängigmachen');
    const allWeights=weightEntries(selectedDate),previous=allWeights.filter(([key])=>key<selectedDate).at(-1);host.querySelector('#journalWeight').textContent=data.weight===null?'– kg':`${fmt1(data.weight)} kg`;host.querySelector('#journalWeightMeta').textContent=data.weight!==null?'Für diesen Tag':previous?`Zuletzt ${dateFromKey(previous[0]).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}: ${fmt1(previous[1].weight)} kg`:'Noch kein Messwert';host.querySelector('#journalWeightButton').textContent=data.weight===null?'Eintragen':'Ändern';
    const completed=[data.weight!==null,data.gym!==null,data.alcohol!==null].filter(Boolean).length,check=host.querySelector('#journalCheckStatus'),checkCard=host.querySelector('.journal-check-card');check.textContent=completed===3?'Vollständig':`${completed}/3 Angaben`;check.classList.toggle('complete',completed===3);check.classList.toggle('partial',completed>0&&completed<3);checkCard.classList.toggle('complete',completed===3);
    host.querySelectorAll('[data-journal-gym]').forEach(button=>{const active=String(data.gym)===button.dataset.journalGym;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});host.querySelectorAll('[data-journal-alcohol]').forEach(button=>{const active=String(data.alcohol)===button.dataset.journalAlcohol;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
    host.querySelector('#journalCoachText').textContent=feedbackJournal();host.querySelector('#journalCoachTitle').textContent=isToday?(total.calories?'Dein nächster sinnvoller Schritt':'Bereit für deinen Tag'):(total.calories?'Rückblick auf diesen Tag':'Noch keine Einträge');host.querySelector('#journalScoreLarge').textContent=score===null?'–':fmt1(score);host.querySelector('.journal-coach-card').classList.toggle('strong',score!==null&&score>=8);host.querySelector('.journal-coach-card').classList.toggle('attention',score!==null&&score<6);
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }

  const baseRender=window.render;
  if(typeof baseRender==='function')window.render=function(){baseRender();renderJournal()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureJournal();renderJournal()},{once:true});
  else{ensureJournal();renderJournal()}
})();
