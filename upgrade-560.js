'use strict';
(function(){
  const VERSION='6.2.3';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_TARGET=3000;
  const WATER_MAX=6000;
  const mealIcons={'Frühstück':'☕','Mittagessen':'🥗','Abendessen':'🌙','Snack':'🍎'};
  const mealRatios={'Frühstück':.30,'Mittagessen':.35,'Abendessen':.25,'Snack':.10};
  const clampLocal=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const fmt0=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(Math.max(0,Number(value)||0));
  const fmt1=value=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1}).format(Math.max(0,Number(value)||0));
  const pct=(value,goal)=>goal>0?clampLocal(value/goal*100,0,100):0;
  const selectedData=()=>day(selectedDate,false);
  const selectedTotals=()=>totals();
  const selectedSettings=()=>state.settings;
  const isJournalActive=()=>document.querySelector('[data-screen="today"]')?.classList.contains('active');

  function greeting(){
    if(selectedDate!==todayKey())return 'Tagesrückblick';
    const hour=new Date().getHours();
    return hour<11?'Guten Morgen! 👋':hour<17?'Guten Tag! 👋':'Guten Abend! 👋';
  }

  function waterMap(){
    try{
      const parsed=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');
      return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{};
    }catch{return {}}
  }

  function waterAmount(){
    return Math.round(clampLocal(waterMap()[selectedDate]||0,0,WATER_MAX));
  }

  function setWater560(next){
    const amount=Math.round(clampLocal(next,0,WATER_MAX));
    const all=waterMap();
    if(amount)all[selectedDate]=amount;else delete all[selectedDate];
    try{
      localStorage.setItem(WATER_KEY,JSON.stringify(all));
      navigator.vibrate?.(10);
      window.render();
    }catch{
      toast?.('Wasser konnte nicht gespeichert werden.');
    }
  }

  function openMeal(type){
    document.querySelector('[data-tab="food"]')?.click();
    setTimeout(()=>{
      const select=document.querySelector('#mealType');
      if(select)select.value=type;
      openModal?.('mealModal');
    },50);
  }

  function openDatePicker(){
    const picker=document.querySelector('#datePicker');
    if(!picker)return;
    try{picker.showPicker?.()}catch{}
    if(!picker.matches(':focus'))picker.focus();
  }

  function ensureJournal(){
    const screen=document.querySelector('[data-screen="today"]');
    if(!screen||document.querySelector('#today560'))return;
    const root=document.createElement('div');
    root.id='today560';
    root.className='journal560';
    root.innerHTML=`
      <section class="journal-topbar">
        <button class="journal-date-button" id="journalDateButton" type="button" aria-label="Datum auswählen">
          <img src="icon.svg" alt="">
          <span><strong id="journalWeekday">Heute</strong><small id="journalDate">–</small></span>
          <i aria-hidden="true">⌄</i>
        </button>
        <div class="journal-mini-stats" role="group" aria-label="Tagesnote und Tagesserie">
          <span class="journal-status-item journal-score-status" title="Tagesnote">
            <i class="journal-status-icon" aria-hidden="true">💎</i><small>Tagesnote</small><b id="journalScore">Offen</b>
          </span>
          <span class="journal-status-item journal-streak-status" title="Tagesserie">
            <i class="journal-status-icon" aria-hidden="true">🔥</i><small>Tagesserie</small><b id="journalGym">0</b>
          </span>
        </div>
        <button class="journal-calendar-button" id="journalCalendarButton" type="button" aria-label="Kalender öffnen">▣</button>
      </section>

      <section class="journal-heading">
        <div><small id="journalGreeting">Guten Tag! 👋</small><h1 id="journalHeadline">Dein Tagesüberblick</h1></div>
      </section>

      <section class="journal-energy-card">
        <div class="journal-energy-grid">
          <div class="journal-calorie-ring" id="journalCalorieRing">
            <div>
              <small id="journalRingLabel">Noch verfügbar</small>
              <strong id="journalRemaining">0</strong>
              <span>kcal</span>
              <em>von <b id="journalGoalInside">0</b> kcal</em>
            </div>
          </div>
          <div class="journal-energy-stats">
            <article><span class="stat-icon green">🍴</span><div><small>Gegessen</small><strong id="journalEaten">0 kcal</strong></div></article>
            <article><span class="stat-icon blue">◎</span><div><small>Tagesziel</small><strong id="journalGoal">0 kcal</strong></div></article>
            <article><span class="stat-icon violet">♨</span><div><small>Verbrannt</small><strong id="journalBurned">0 kcal</strong></div></article>
          </div>
        </div>
        <div class="journal-macros">
          ${[
            ['protein','Eiweiß','💪','green'],
            ['carbs','Kohlenhydrate','🌾','yellow'],
            ['fat','Fett','💧','violet']
          ].map(([key,label,icon,tone])=>`
            <article>
              <div class="journal-macro-title"><span class="${tone}">${icon}</span><div><b>${label}</b><small id="${key}JournalText">0 / 0 g</small></div></div>
              <div class="journal-macro-bar"><i id="${key}JournalBar" class="${tone}"></i></div>
              <em id="${key}JournalPct">0 %</em>
            </article>`).join('')}
        </div>
      </section>

      <section class="journal-meals-card">
        <div class="journal-section-title"><div><span>🍴</span><h2>Deine Mahlzeiten</h2></div><button id="journalOpenFood" type="button">Alle anzeigen <b>›</b></button></div>
        <div id="journalMeals" class="journal-meals"></div>
      </section>

      <section class="journal-steps-card">
        <div class="journal-card-head">
          <div><span>👣</span><div><h2>Schritte</h2><strong id="journalSteps">– Schritte</strong><small id="journalStepMeta">Noch nicht eingetragen</small></div></div>
          <div class="journal-step-target"><small>Ziel: <b id="journalStepGoal">0</b></small><button id="journalStepToggle" type="button" aria-label="Schritte bearbeiten">›</button></div>
        </div>
        <div class="journal-step-progress"><i id="journalStepBar"></i><b id="journalStepPct">0%</b></div>
        <div class="journal-step-editor" id="journalStepEditor" hidden>
          <input id="journalStepInput" type="number" min="0" max="100000" step="1" inputmode="numeric" placeholder="Schritte">
          <button id="journalStepSave" type="button">Speichern</button>
          <button id="journalStepClear" class="journal-clear" type="button">×</button>
        </div>
      </section>

      <section class="journal-water-card">
        <div class="journal-card-head compact">
          <div><span>💧</span><div><h2>Wasser</h2><small>Ziel: 3,0 l</small></div></div>
          <button class="journal-info" id="journalWaterInfo" type="button" aria-label="Wasser erklären">i</button>
        </div>
        <div class="journal-water-layout">
          <div class="journal-water-ring" id="journalWaterRing"><div><strong id="journalWaterAmount">0,00 l</strong><small>Getrunken</small></div></div>
          <div class="journal-water-actions">
            <button type="button" data-journal-water="250">+250 ml</button>
            <button type="button" data-journal-water="500">+500 ml</button>
            <button type="button" id="journalWaterUndo">↶ Rückgängig</button>
          </div>
        </div>
        <p id="journalWaterHint">Starte mit dem ersten Glas.</p>
      </section>

      <section class="journal-check-card">
        <div class="journal-section-title"><div><span>✓</span><h2>Tagescheck</h2></div><small id="journalCheckStatus">Noch offen</small></div>
        <div class="journal-check-grid">
          <article><small>Gewicht</small><strong id="journalWeight">– kg</strong><button id="journalWeightButton" type="button">Eintragen</button></article>
          <article><small>Training</small><div><button data-journal-gym="true" type="button">Ja</button><button data-journal-gym="false" type="button">Nein</button></div></article>
          <article><small>Alkohol</small><div><button data-journal-alcohol="false" type="button">Nein</button><button data-journal-alcohol="true" type="button">Ja</button></div></article>
        </div>
      </section>

      <section class="journal-coach-card">
        <div class="journal-coach-icon">✦</div>
        <div><small>CutCoach Impuls</small><strong id="journalCoachTitle">Dein Tagesfokus</strong><p id="journalCoachText">Trage deine ersten Werte ein.</p></div>
        <div class="journal-score"><strong id="journalScoreLarge">–</strong><small>/10</small></div>
      </section>`;

    screen.prepend(root);
    root.querySelector('#journalDateButton').onclick=openDatePicker;
    root.querySelector('#journalCalendarButton').onclick=openDatePicker;
    root.querySelector('#journalOpenFood').onclick=()=>document.querySelector('[data-tab="food"]')?.click();
    root.querySelector('#journalStepToggle').onclick=()=>{
      const editor=root.querySelector('#journalStepEditor');
      editor.hidden=!editor.hidden;
      if(!editor.hidden)root.querySelector('#journalStepInput')?.focus();
    };
    root.querySelector('#journalStepSave').onclick=()=>{
      const value=root.querySelector('#journalStepInput').value;
      const original=document.querySelector('#stepsInput');
      if(original){
        original.value=value;
        original.dispatchEvent(new Event('input',{bubbles:true}));
        document.querySelector('#saveSteps')?.click();
      }
      root.querySelector('#journalStepEditor').hidden=true;
    };
    root.querySelector('#journalStepClear').onclick=()=>{
      document.querySelector('#clearSteps')?.click();
      root.querySelector('#journalStepEditor').hidden=true;
    };
    root.querySelectorAll('[data-journal-water]').forEach(button=>button.onclick=()=>setWater560(waterAmount()+Number(button.dataset.journalWater)));
    root.querySelector('#journalWaterUndo').onclick=()=>setWater560(waterAmount()-250);
    root.querySelector('#journalWaterInfo').onclick=()=>{
      const oldInfo=document.querySelector('#waterCard .coach-info-button');
      if(oldInfo)oldInfo.click();else toast?.('Tagesziel: 3 Liter. Du kannst in 250- oder 500-ml-Schritten eintragen.');
    };
    root.querySelector('#journalWeightButton').onclick=()=>openModal?.('weightModal');
    root.querySelectorAll('[data-journal-gym]').forEach(button=>button.onclick=()=>document.querySelector(`.checks [data-gym="${button.dataset.journalGym}"]`)?.click());
    root.querySelectorAll('[data-journal-alcohol]').forEach(button=>button.onclick=()=>document.querySelector(`.checks [data-alcohol="${button.dataset.journalAlcohol}"]`)?.click());

    let touchStart=0;
    root.querySelector('#journalDateButton').addEventListener('touchstart',event=>{touchStart=event.changedTouches[0]?.clientX||0},{passive:true});
    root.querySelector('#journalDateButton').addEventListener('touchend',event=>{
      const delta=(event.changedTouches[0]?.clientX||0)-touchStart;
      if(Math.abs(delta)<55)return;
      if(delta>0)document.querySelector('#previousDay')?.click();
      else if(selectedDate<todayKey())document.querySelector('#nextDay')?.click();
    },{passive:true});

    configureNavigation();
    syncJournalMode();
  }

  function configureNavigation(){
    const nav=document.querySelector('nav');
    const journal=nav?.querySelector('[data-tab="today"]');
    if(journal&&!journal.dataset.journalNamed){
      journal.dataset.journalNamed='1';
      journal.innerHTML='<span aria-hidden="true">▣</span>Tagebuch';
    }
    const iconMap={food:'🍴',progress:'⌁',settings:'⚙',library:'★'};
    Object.entries(iconMap).forEach(([tab,icon])=>{
      const button=nav?.querySelector(`[data-tab="${tab}"]`);
      const span=button?.querySelector('span');
      if(span)span.textContent=icon;
    });
    nav?.querySelectorAll('[data-tab]').forEach(button=>{
      if(button.dataset.journalWatch)return;
      button.dataset.journalWatch='1';
      button.addEventListener('click',()=>setTimeout(syncJournalMode,0));
    });
  }

  function syncJournalMode(){
    document.body.classList.toggle('journal-mode',isJournalActive());
  }

  function renderMeals560(data,settings){
    const host=document.querySelector('#journalMeals');
    if(!host)return;
    host.innerHTML=MEAL_TYPES.map(type=>{
      const items=data.meals.filter(item=>item.type===type);
      const current=items.reduce((sum,item)=>sum+(Number(item.calories)||0),0);
      const target=Math.round(settings.calories*(mealRatios[type]||.25));
      const progress=pct(current,target);
      return `<article class="journal-meal-row">
        <button class="journal-meal-main" type="button" data-open-journal-meal="${type}">
          <span class="journal-meal-accent ${type==='Frühstück'?'green':type==='Snack'?'red':'yellow'}"></span>
          <span class="journal-meal-icon">${mealIcons[type]||'🍽️'}</span>
          <span class="journal-meal-copy"><b>${type==='Snack'?'Snacks':type}</b><small>${fmt0(current)} / ${fmt0(target)} kcal</small></span>
          <span class="journal-meal-progress"><i style="width:${progress}%"></i></span>
        </button>
        <button class="journal-meal-add" type="button" data-add-journal-meal="${type}" aria-label="${type} hinzufügen">+</button>
      </article>`;
    }).join('');
    host.querySelectorAll('[data-open-journal-meal]').forEach(button=>button.onclick=()=>document.querySelector('[data-tab="food"]')?.click());
    host.querySelectorAll('[data-add-journal-meal]').forEach(button=>button.onclick=()=>openMeal(button.dataset.addJournalMeal));
  }

  function render560(){
    ensureJournal();
    configureNavigation();
    syncJournalMode();
    const root=document.querySelector('#today560');
    if(!root)return;
    const settings=selectedSettings();
    const data=selectedData();
    const totalsNow=selectedTotals();
    const date=dateFromKey(selectedDate);
    const isToday=selectedDate===todayKey();
    const remaining=settings.calories-totalsNow.calories;
    const caloriePct=pct(totalsNow.calories,settings.calories);
    const steps=Number(data.steps)||0;
    const burned=Math.round(steps*.04)+(data.gym===true?180:0);
    const score=typeof dailyScore==='function'?dailyScore():null;
    const weekGym=range(selectedDate,7).filter(item=>item.data.gym===true).length;

    root.querySelector('#journalWeekday').textContent=isToday?'Heute':date.toLocaleDateString('de-DE',{weekday:'long'});
    root.querySelector('#journalDate').textContent=date.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
    root.querySelector('#journalGreeting').textContent=greeting();
    root.querySelector('#journalHeadline').textContent=isToday?'Dein Tagesüberblick':'Dein Tagesrückblick';
    root.querySelector('#journalScore').textContent=score===null?'0':fmt1(score);
    root.querySelector('#journalGym').textContent=fmt0(weekGym);
    root.querySelector('#journalRemaining').textContent=fmt0(Math.abs(remaining));
    root.querySelector('#journalRingLabel').textContent=remaining>=0?'Noch verfügbar':'Über Tagesziel';
    root.querySelector('#journalGoalInside').textContent=fmt0(settings.calories);
    root.querySelector('#journalEaten').textContent=`${fmt0(totalsNow.calories)} kcal`;
    root.querySelector('#journalGoal').textContent=`${fmt0(settings.calories)} kcal`;
    root.querySelector('#journalBurned').textContent=`${fmt0(burned)} kcal`;
    root.querySelector('#journalCalorieRing').style.setProperty('--journal-calories',`${Math.min(320,caloriePct*3.2)}deg`);
    root.querySelector('#journalCalorieRing').classList.toggle('over',remaining<0);

    [['protein',totalsNow.protein,settings.protein],['carbs',totalsNow.carbs,settings.carbs],['fat',totalsNow.fat,settings.fat]].forEach(([key,value,goal])=>{
      const percent=Math.round(pct(value,goal));
      root.querySelector(`#${key}JournalText`).textContent=`${fmt0(value)} / ${fmt0(goal)} g`;
      root.querySelector(`#${key}JournalBar`).style.width=`${percent}%`;
      root.querySelector(`#${key}JournalPct`).textContent=`${percent} %`;
    });

    renderMeals560(data,settings);

    root.querySelector('#journalSteps').textContent=data.steps===null?'– Schritte':`${fmt0(data.steps)} Schritte`;
    root.querySelector('#journalStepGoal').textContent=fmt0(settings.steps);
    root.querySelector('#journalStepMeta').textContent=data.steps===null?'Noch nicht eingetragen':`${fmt1(steps*.00075)} km · ${fmt0(Math.round(steps*.04))} kcal`;
    const stepPercent=Math.round(pct(steps,settings.steps));
    root.querySelector('#journalStepBar').style.width=`${stepPercent}%`;
    root.querySelector('#journalStepPct').textContent=`${stepPercent}%`;
    if(document.activeElement!==root.querySelector('#journalStepInput'))root.querySelector('#journalStepInput').value=data.steps??'';
    root.querySelector('#journalStepClear').hidden=data.steps===null;

    const water=waterAmount();
    const waterPercent=pct(water,WATER_TARGET);
    root.querySelector('#journalWaterAmount').textContent=`${new Intl.NumberFormat('de-DE',{minimumFractionDigits:2,maximumFractionDigits:2}).format(water/1000)} l`;
    root.querySelector('#journalWaterRing').style.setProperty('--journal-water',`${waterPercent*3.6}deg`);
    root.querySelector('#journalWaterUndo').disabled=water<=0;
    root.querySelector('#journalWaterHint').textContent=water>=WATER_TARGET?'Tagesziel erreicht – stark!':water>0?`Noch ${fmt0(WATER_TARGET-water)} ml bis zum Tagesziel.`:'Starte mit dem ersten Glas.';

    const latest=weightEntries(selectedDate).at(-1);
    root.querySelector('#journalWeight').textContent=latest?`${fmt1(latest[1].weight)} kg`:'– kg';
    root.querySelector('#journalWeightButton').textContent=data.weight===null?'Eintragen':'Ändern';

    root.querySelectorAll('[data-journal-gym]').forEach(button=>button.classList.toggle('active',String(data.gym)===button.dataset.journalGym));
    root.querySelectorAll('[data-journal-alcohol]').forEach(button=>button.classList.toggle('active',String(data.alcohol)===button.dataset.journalAlcohol));
    const completed=[totalsNow.calories>0,data.steps!==null,data.gym!==null,data.alcohol!==null,water>0].filter(Boolean).length;
    root.querySelector('#journalCheckStatus').textContent=completed===5?'Vollständig':`${completed}/5 erledigt`;

    const feedbackText=typeof feedback==='function'?feedback():'Trage deine Tageswerte ein.';
    root.querySelector('#journalCoachText').textContent=feedbackText;
    root.querySelector('#journalCoachTitle').textContent=totalsNow.calories?'Dein Fokus für heute':'Bereit für deinen Tag';
    root.querySelector('#journalScoreLarge').textContent=score===null?'–':fmt1(score);
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  const baseRender=window.render;
  window.render=function(){baseRender();render560();};

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ensureJournal();render560()},120),{once:true});
  }else{
    setTimeout(()=>{ensureJournal();render560()},120);
  }
})();
