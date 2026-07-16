'use strict';
(function(){
  const VERSION='6.2.4';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v2';
  const WATER_TARGET=3000;
  const WATER_MAX=6000;
  const fmt0=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(Math.max(0,Number(value)||0));
  const fmt1=value=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Math.max(0,Number(value)||0));
  const clamp570=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

  function safeJson(storage,key,fallback={}){
    try{
      const value=JSON.parse(storage.getItem(key)||'null');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
    }catch{return fallback}
  }
  function waterMap(){return safeJson(localStorage,WATER_KEY,{})}
  function waterFor(key=selectedDate){return Math.round(clamp570(waterMap()[key]||0,0,WATER_MAX))}
  function waterPace(key=selectedDate){
    if(key!==todayKey())return key<todayKey()?WATER_TARGET:0;
    const now=new Date(),hour=now.getHours()+now.getMinutes()/60;
    return Math.round(clamp570((hour-7)/15,.08,1)*WATER_TARGET/250)*250;
  }
  function undoRecord(){return safeJson(sessionStorage,WATER_UNDO_KEY,null)}
  function storeUndo(record){try{sessionStorage.setItem(WATER_UNDO_KEY,JSON.stringify(record))}catch{}}
  function clearUndo(){try{sessionStorage.removeItem(WATER_UNDO_KEY)}catch{}}
  function writeWater(next,remember=true){
    const previous=waterFor(),requested=Math.round(Number(next)||0),amount=Math.round(clamp570(requested,0,WATER_MAX)),all=waterMap();
    if(remember&&amount!==previous)storeUndo({date:selectedDate,previous,current:amount,at:Date.now()});
    if(amount)all[selectedDate]=amount;else delete all[selectedDate];
    try{
      localStorage.setItem(WATER_KEY,JSON.stringify(all));
      if(requested>WATER_MAX)toast?.('Maximal 6.000 ml pro Tag eintragbar.');
      navigator.vibrate?.(10);
      window.render();
    }catch{toast?.('Wasser konnte nicht gespeichert werden.')}
  }
  function undoWater(){
    const record=undoRecord();
    if(!record||record.date!==selectedDate||Number(record.current)!==waterFor())return;
    clearUndo();writeWater(record.previous,false);toast?.('Letzte Wasseränderung zurückgenommen.');
  }
  function hasDiaryEntry(key){
    const data=day(key,false);
    return Boolean(data.meals?.length||data.steps!==null||data.weight!==null||data.gym!==null||data.alcohol!==null||waterFor(key)>0);
  }
  function streakState(){
    const today=todayKey(),todayDone=hasDiaryEntry(today),start=todayDone?today:shiftKey(today,-1);
    let count=0,cursor=dateFromKey(start);
    for(let i=0;i<366;i++){
      const key=keyFromDate(cursor);if(!hasDiaryEntry(key))break;
      count++;cursor.setDate(cursor.getDate()-1);
    }
    return {count,pending:!todayDone&&count>0,todayDone};
  }
  function activityEstimate(data){
    const steps=data.steps===null?0:Number(data.steps)||0;
    return Math.max(0,Math.round(steps*.04)+(data.gym===true?180:0));
  }
  function ensureMeta(root){
    const mealTitle=root.querySelector('.journal-meals-card .journal-section-title');
    if(mealTitle&&!root.querySelector('#journalMealSummary')){
      const summary=document.createElement('small');summary.id='journalMealSummary';summary.className='journal-meal-summary';
      mealTitle.querySelector('div')?.append(summary);
    }
    const weightCard=root.querySelector('.journal-check-grid article:first-child');
    if(weightCard&&!root.querySelector('#journalWeightMeta')){
      const meta=document.createElement('small');meta.id='journalWeightMeta';meta.className='journal-weight-meta';
      weightCard.querySelector('strong')?.after(meta);
    }
    root.querySelector('#journalCoachText')?.setAttribute('aria-live','polite');
    root.querySelector('#journalCheckStatus')?.setAttribute('aria-live','polite');
    root.querySelector('#journalWaterHint')?.setAttribute('aria-live','polite');
    root.querySelector('#journalStepToggle')?.setAttribute('aria-expanded','false');
    const activityLabel=root.querySelector('.journal-energy-stats article:last-child small');
    if(activityLabel)activityLabel.textContent='Aktivität';
    const activityCard=root.querySelector('.journal-energy-stats article:last-child');
    if(activityCard)activityCard.title='Geschätzter Aktivitätsverbrauch aus Schritten und Training. Das feste Kalorienziel wird dadurch nicht automatisch erhöht.';
  }
  function configureSteps(root){
    if(root.dataset.journalController)return;
    const toggle=root.querySelector('#journalStepToggle'),editor=root.querySelector('#journalStepEditor'),input=root.querySelector('#journalStepInput'),save=root.querySelector('#journalStepSave'),clear=root.querySelector('#journalStepClear');
    if(!toggle||toggle.dataset.audit570)return;
    toggle.dataset.audit570='1';
    const syncSave=()=>{
      const raw=String(input.value??'').trim(),parsed=Number(raw),current=day(selectedDate,false).steps;
      save.disabled=raw===''||!Number.isFinite(parsed)||parsed<0||parsed>100000||Math.round(parsed)!==parsed||String(current??'')===raw;
    };
    toggle.onclick=()=>{editor.hidden=!editor.hidden;toggle.setAttribute('aria-expanded',String(!editor.hidden));if(!editor.hidden){input.value=day(selectedDate,false).steps??'';syncSave();setTimeout(()=>input.focus(),30)}};
    input.addEventListener('input',syncSave);
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();save.click()}
      if(event.key==='Escape'){editor.hidden=true;toggle.setAttribute('aria-expanded','false')}
    });
    save.onclick=()=>{
      const parsed=Number(String(input.value).trim());
      if(!Number.isInteger(parsed)||parsed<0||parsed>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
      const original=document.querySelector('#stepsInput');
      if(!original)return;
      original.value=String(parsed);document.querySelector('#saveSteps')?.click();
      editor.hidden=true;toggle.setAttribute('aria-expanded','false');
    };
    clear.onclick=()=>{document.querySelector('#clearSteps')?.click();editor.hidden=true;toggle.setAttribute('aria-expanded','false')};
  }
  function configureWater(root){
    if(root.dataset.journalController)return;
    root.querySelectorAll('[data-journal-water]').forEach(button=>{button.onclick=()=>writeWater(waterFor()+Number(button.dataset.journalWater))});
    const undo=root.querySelector('#journalWaterUndo');if(undo)undo.onclick=undoWater;
  }
  function configureWeight(root){
    const button=root.querySelector('#journalWeightButton');if(!button||button.dataset.audit570)return;
    button.dataset.audit570='1';button.onclick=()=>{
      const data=day(selectedDate,false),input=document.querySelector('#weightInput'),clear=document.querySelector('#clearWeight');
      if(input)input.value=data.weight??'';if(clear)clear.hidden=data.weight===null;openModal?.('weightModal');
    };
  }
  function enhance570(){
    const root=document.querySelector('#today560');if(!root)return;
    ensureMeta(root);configureSteps(root);configureWater(root);configureWeight(root);
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  function refresh570(){
    enhance570();
    const root=document.querySelector('#today560');if(!root)return;
    const data=day(selectedDate,false),settings=state.settings,total=totals(),score=typeof dailyScore==='function'?dailyScore():null;
    const remaining=settings.calories-total.calories,rawCaloriePct=settings.calories>0?total.calories/settings.calories*100:0;
    const ring=root.querySelector('#journalCalorieRing');
    if(ring){
      ring.style.setProperty('--journal-calories',`${clamp570(rawCaloriePct,0,100)*3.6}deg`);
      ring.classList.toggle('over',remaining<0);ring.classList.toggle('near',remaining>=0&&remaining<=200);ring.classList.toggle('empty',total.calories===0);
      ring.setAttribute('aria-label',`${fmt0(total.calories)} von ${fmt0(settings.calories)} Kilokalorien gegessen`);
    }
    const scoreNode=root.querySelector('#journalScore');
    if(scoreNode){
      scoreNode.textContent=score===null?'Offen':fmt1(score);
      const scoreItem=scoreNode.closest('.journal-status-item,span'),scoreLabel=score===null?'Tagesnote noch offen':`Tagesnote ${fmt1(score)} von 10`;
      scoreItem?.setAttribute('title',scoreLabel);scoreItem?.setAttribute('aria-label',scoreLabel);
    }
    const streak=streakState(),fire=root.querySelector('#journalGym');
    if(fire){
      fire.textContent=String(streak.count);
      const streakItem=fire.closest('.journal-status-item,span'),streakLabel=streak.pending?`${streak.count} Tage in Folge – heute fehlt noch ein Tagebucheintrag`:`${streak.count} Tage in Folge mit mindestens einem Tagebucheintrag`;
      streakItem?.classList.toggle('pending',streak.pending);streakItem?.setAttribute('title',streakLabel);streakItem?.setAttribute('aria-label',streakLabel);
    }
    const activity=root.querySelector('#journalBurned');if(activity)activity.textContent=`${fmt0(activityEstimate(data))} kcal`;

    [['protein',total.protein,settings.protein],['carbs',total.carbs,settings.carbs],['fat',total.fat,settings.fat]].forEach(([key,value,goal])=>{
      const raw=goal>0?value/goal*100:(value>0?100:0),shown=Math.round(raw),article=root.querySelector(`#${key}JournalText`)?.closest('article');
      const bar=root.querySelector(`#${key}JournalBar`),label=root.querySelector(`#${key}JournalPct`);
      if(bar)bar.style.width=`${clamp570(raw,0,100)}%`;if(label)label.textContent=goal===0?(value===0?'–':`${fmt0(value)} g`):`${shown} %`;
      article?.classList.toggle('complete',goal>0&&raw>=90&&raw<=110);article?.classList.toggle('over',goal>0&&raw>110);
    });

    const mealCount=data.meals.length,mealSummary=root.querySelector('#journalMealSummary');
    if(mealSummary)mealSummary.textContent=mealCount?`${mealCount} ${mealCount===1?'Eintrag':'Einträge'} · ${fmt0(total.calories)} kcal`:'Noch leer';
    const ratios={'Frühstück':.30,'Mittagessen':.35,'Abendessen':.25,'Snack':.10};
    root.querySelectorAll('.journal-meal-row').forEach((row,index)=>{
      const type=MEAL_TYPES[index],current=data.meals.filter(item=>item.type===type).reduce((sum,item)=>sum+(Number(item.calories)||0),0),goal=Math.round(settings.calories*(ratios[type]||.25));
      row.classList.toggle('filled',current>0);row.classList.toggle('complete',goal>0&&current>=goal*.85&&current<=goal*1.15);row.classList.toggle('over',goal>0&&current>goal*1.15);
    });

    const steps=data.steps===null?null:Number(data.steps)||0,stepGoal=Number(settings.steps)||0,stepCard=root.querySelector('.journal-steps-card'),stepMeta=root.querySelector('#journalStepMeta');
    stepCard?.classList.toggle('goal-reached',steps!==null&&(stepGoal===0||steps>=stepGoal));
    if(stepMeta){
      if(steps===null)stepMeta.textContent='Noch nicht eingetragen';
      else{
        const distance=fmt1(steps*.00075),calories=fmt0(Math.round(steps*.04));
        stepMeta.textContent=stepGoal>0&&steps<stepGoal?`Noch ${fmt0(stepGoal-steps)} bis Ziel · ${distance} km`:`Ziel erreicht · ${distance} km · ${calories} kcal`;
      }
    }
    const controllerOwnsInputs=Boolean(root.dataset.journalController);
    const stepInput=root.querySelector('#journalStepInput'),stepSave=root.querySelector('#journalStepSave');
    if(!controllerOwnsInputs&&stepInput&&document.activeElement!==stepInput)stepInput.value=data.steps??'';
    if(!controllerOwnsInputs&&stepSave&&document.activeElement!==stepInput)stepSave.disabled=true;

    const water=waterFor(),pace=waterPace(),waterCard=root.querySelector('.journal-water-card'),waterHint=root.querySelector('#journalWaterHint'),undo=root.querySelector('#journalWaterUndo'),record=undoRecord();
    waterCard?.classList.toggle('goal-reached',water>=WATER_TARGET);waterCard?.classList.toggle('on-pace',water<WATER_TARGET&&water>=pace);waterCard?.classList.toggle('behind',selectedDate===todayKey()&&water<pace-250);
    if(waterHint){
      if(water>=WATER_TARGET)waterHint.textContent=water>WATER_TARGET?`${fmt0(water-WATER_TARGET)} ml über dem Tagesziel.`:'Tagesziel erreicht – stark!';
      else if(selectedDate===todayKey()&&water>=pace)waterHint.textContent=`Im Trinkplan · noch ${fmt0(WATER_TARGET-water)} ml bis zum Tagesziel.`;
      else if(selectedDate===todayKey()&&water>0)waterHint.textContent=`Noch ${fmt0(Math.max(0,pace-water))} ml bis zum aktuellen Soll.`;
      else waterHint.textContent=water>0?`Noch ${fmt0(WATER_TARGET-water)} ml bis zum Tagesziel.`:'Starte mit dem ersten Glas.';
    }
    if(undo&&!controllerOwnsInputs){const canUndo=Boolean(record&&record.date===selectedDate&&Number(record.current)===water);undo.disabled=!canUndo;undo.textContent=canUndo?'↶ Letzte Änderung':'↶ Rückgängig'}

    const todayWeight=data.weight,allWeights=weightEntries(selectedDate),previous=allWeights.filter(([key])=>key<selectedDate).at(-1),weight=root.querySelector('#journalWeight'),weightMeta=root.querySelector('#journalWeightMeta');
    if(weight)weight.textContent=todayWeight===null?'– kg':`${fmt1(todayWeight)} kg`;
    if(weightMeta)weightMeta.textContent=todayWeight!==null?'Für diesen Tag':previous?`Zuletzt ${dateFromKey(previous[0]).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}: ${fmt1(previous[1].weight)} kg`:'Noch kein Messwert';
    const completed=[todayWeight!==null,data.gym!==null,data.alcohol!==null].filter(Boolean).length,check=root.querySelector('#journalCheckStatus'),checkCard=root.querySelector('.journal-check-card');
    if(check){check.textContent=completed===3?'Vollständig':`${completed}/3 Angaben`;check.classList.toggle('complete',completed===3);check.classList.toggle('partial',completed>0&&completed<3)}
    checkCard?.classList.toggle('complete',completed===3);
    root.querySelectorAll('[data-journal-gym]').forEach(button=>{const active=String(data.gym)===button.dataset.journalGym;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});
    root.querySelectorAll('[data-journal-alcohol]').forEach(button=>{const active=String(data.alcohol)===button.dataset.journalAlcohol;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active))});

    const coach=root.querySelector('.journal-coach-card'),scoreLarge=root.querySelector('#journalScoreLarge'),coachTitle=root.querySelector('#journalCoachTitle');
    if(scoreLarge)scoreLarge.textContent=score===null?'–':fmt1(score);
    if(coachTitle)coachTitle.textContent=selectedDate===todayKey()?(total.calories?'Dein nächster sinnvoller Schritt':'Bereit für deinen Tag'):(total.calories?'Rückblick auf diesen Tag':'Noch keine Einträge');
    coach?.classList.toggle('strong',score!==null&&score>=8);coach?.classList.toggle('attention',score!==null&&score<6);
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }

  const base=window.render;
  window.render=function(){base();refresh570()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh570,260),{once:true});else setTimeout(refresh570,260);
})();
