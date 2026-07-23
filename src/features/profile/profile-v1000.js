'use strict';

(function(root){
  const VERSION='10.0.0-alpha';
  const $=selector=>document.querySelector(selector);
  const goalLabels={lose:'Fettverlust',maintain:'Gewicht halten',gain:'Muskelaufbau'};
  const activityLabels={sedentary:'Sitzender Alltag',light:'Leicht aktiv',active:'Aktiver Alltag','very-active':'Sehr aktiv'};
  const paceLabels={gentle:'Ruhiges Tempo',balanced:'Ausgewogenes Tempo',focused:'Fokussiertes Tempo'};

  function appState(){try{return root.state}catch{return null}}
  function number(value,fallback=null){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}
  function format(value,digits=0){return Number(value||0).toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
  function escape(value=''){return String(value).replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function today(){return typeof root.todayKey==='function'?root.todayKey():new Date().toISOString().slice(0,10)}
  function latestWeightEntry(current){
    const entries=Object.entries(current?.days||{}).filter(([,entry])=>number(entry?.weight)!==null).sort(([a],[b])=>b.localeCompare(a));
    if(entries.length)return {date:entries[0][0],weight:number(entries[0][1].weight)};
    const baseline=number(current?.profile?.baselineWeight);
    return baseline===null?null:{date:current?.profile?.completedAt?.slice(0,10)||today(),weight:baseline};
  }
  function daysSince(dateKey){
    if(!dateKey)return null;
    const start=new Date(`${dateKey}T12:00:00`),end=new Date(`${today()}T12:00:00`);
    return Math.max(0,Math.round((end-start)/86400000));
  }
  function profileCompleteness(profile,weight){
    const checks=[profile?.goal,profile?.age,profile?.height,weight,profile?.activityLevel,profile?.trainingDays!==undefined,profile?.pace];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  }
  function weightProgress(start,current,goal){
    if(start===null||current===null||goal===null||start===goal)return 0;
    const raw=(start-current)/(start-goal)*100;
    return Math.max(0,Math.min(100,Math.round(raw)));
  }
  function currentDay(current){return current?.days?.[today()]||{meals:[],steps:null,gym:null,alcohol:null}}
  function dayTotals(entry){
    return (entry?.meals||[]).reduce((sum,meal)=>({
      calories:sum.calories+number(meal.calories,0),protein:sum.protein+number(meal.protein,0),carbs:sum.carbs+number(meal.carbs,0),fat:sum.fat+number(meal.fat,0)
    }),{calories:0,protein:0,carbs:0,fat:0});
  }
  function coachSignals(current,weightEntry){
    const profile=current.profile||{},settings=current.settings||{},entry=currentDay(current),totals=dayTotals(entry);
    const age=daysSince(weightEntry?.date),signals=[];
    if(age!==null&&age>10)signals.push({tone:'warn',title:'Gewicht aktualisieren',text:`Letzter Wert vor ${age} Tagen – eine neue Messung verbessert deine Planbasis.`});
    else signals.push({tone:'good',title:'Gewicht aktuell',text:age===0?'Heute aktualisiert.':`Vor ${age||1} Tag${age===1?'':'en'} aktualisiert.`});
    const missingProtein=Math.max(0,number(settings.protein,0)-totals.protein);
    if(totals.calories>0&&missingProtein>20)signals.push({tone:'focus',title:'Protein im Blick',text:`Heute fehlen noch etwa ${format(missingProtein)} g bis zu deinem Ziel.`});
    else if(totals.calories>0)signals.push({tone:'good',title:'Protein auf Kurs',text:'Dein heutiger Eiweißstand passt zu deinem Plan.'});
    else signals.push({tone:'neutral',title:'Tag noch offen',text:'Nach den ersten Mahlzeiten kann CutCoach deinen Tageskurs bewerten.'});
    const stepGoal=number(settings.steps,0),steps=number(entry.steps,0);
    if(stepGoal>0&&entry.steps!==null&&steps<stepGoal)signals.push({tone:'neutral',title:'Bewegung',text:`Noch ${format(stepGoal-steps)} Schritte bis zum Tagesziel.`});
    else if(stepGoal>0&&entry.steps!==null)signals.push({tone:'good',title:'Schrittziel erreicht',text:'Deine Alltagsbewegung ist heute vollständig.'});
    else signals.push({tone:'neutral',title:'Bewegung offen',text:`Dein persönlicher Rahmen liegt bei ${format(stepGoal)} Schritten.`});
    if(profile.planSource==='manual')signals.unshift({tone:'focus',title:'Manueller Plan aktiv',text:'Deine Zielwerte überschreiben aktuell die automatische Profilberechnung.'});
    return signals.slice(0,3);
  }
  function icon(name){
    const paths={
      route:'<path d="M5 18c3-7 5-9 8-9 2 0 3 1 3 3 0 3-4 3-4 6"/><circle cx="6" cy="18" r="2"/><circle cx="16" cy="7" r="2"/>',
      body:'<circle cx="12" cy="7" r="3"/><path d="M7 21v-4a5 5 0 0 1 10 0v4M9 12l-2 4m8-4 2 4"/>',
      activity:'<path d="M3 13h4l2-7 4 14 2-8h6"/>',
      food:'<path d="M7 3v8m4-8v8M5 7h8M9 11v10M17 3v18m0-18c3 2 3 7 0 9"/>',
      target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m10 7h-3M12 22v-3M2 12h3"/>',
      edit:'<path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z"/><path d="m13 8 3 3"/>',
      shield:'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.target}</svg>`;
  }
  function ensureStructure(){
    const screen=$('.profile-screen');
    if(!screen||screen.dataset.coachHub==='10')return screen;
    const manual=$('#profileManualTargets')||[...document.querySelectorAll('.settings-group')].find(group=>group.querySelector('#saveSettings'));
    screen.dataset.coachHub='10';
    screen.classList.add('profile-coach-hub');
    screen.innerHTML=`
      <header class="coach-hub-head">
        <div><small>Deine persönliche Steuerzentrale</small><h2>Profil</h2></div>
        <button id="openSettingsCenter" data-open="settingsCenterModal" type="button" aria-label="App-Einstellungen öffnen">${icon('target')}</button>
      </header>
      <section class="coach-route" aria-labelledby="coachRouteTitle">
        <div class="coach-route-top">
          <div class="coach-route-mark">${icon('route')}</div>
          <div><small id="coachGoalLabel">Dein aktueller Kurs</small><h3 id="coachRouteTitle">Dein CutCoach-Plan</h3><p id="coachRouteCopy"></p></div>
          <span id="coachPlanBadge">Profilplan</span>
        </div>
        <div class="coach-weight-line">
          <div><small>Start</small><strong id="coachStartWeight">–</strong></div>
          <div class="coach-weight-track"><i id="coachWeightProgress"></i><b id="coachWeightDot"></b></div>
          <div><small>Ziel</small><strong id="coachGoalWeight">–</strong></div>
        </div>
        <div class="coach-route-meta">
          <div><span>Aktuell</span><strong id="coachCurrentWeight">–</strong></div>
          <div><span>Planbasis</span><strong id="coachConfidence">–</strong></div>
          <div><span>Tempo</span><strong id="coachPace">–</strong></div>
        </div>
      </section>
      <section class="coach-insights" aria-labelledby="coachInsightsTitle">
        <div class="coach-section-title"><div><small>Coach Intelligence</small><h3 id="coachInsightsTitle">Was heute zählt</h3></div><span id="coachInsightDate">Heute</span></div>
        <div id="coachSignalList" class="coach-signal-list"></div>
      </section>
      <section class="coach-dna" aria-labelledby="coachDnaTitle">
        <div class="coach-section-title"><div><small>Deine Grundlage</small><h3 id="coachDnaTitle">Persönliche DNA</h3></div><button id="editProfile" type="button">Bearbeiten ${icon('edit')}</button></div>
        <div class="coach-dna-list">
          <button id="coachBodyRow" type="button"><span class="coach-row-icon">${icon('body')}</span><span><small>Körper</small><strong id="coachBodyValue">–</strong><em id="coachBodyMeta">–</em></span><b>›</b></button>
          <button id="coachActivityRow" type="button"><span class="coach-row-icon">${icon('activity')}</span><span><small>Alltag & Training</small><strong id="coachActivityValue">–</strong><em id="coachActivityMeta">–</em></span><b>›</b></button>
          <button id="coachNutritionRow" type="button"><span class="coach-row-icon">${icon('food')}</span><span><small>Ernährungsausrichtung</small><strong id="coachNutritionValue">Automatischer Tagesrahmen</strong><em id="coachNutritionMeta">–</em></span><b>›</b></button>
          <button id="coachTargetRow" type="button"><span class="coach-row-icon">${icon('target')}</span><span><small>Zielstrategie</small><strong id="coachTargetValue">–</strong><em id="coachTargetMeta">–</em></span><b>›</b></button>
        </div>
      </section>
      <section class="coach-targets" aria-labelledby="coachTargetsTitle">
        <div class="coach-section-title"><div><small>Dein Tagesrahmen</small><h3 id="coachTargetsTitle">Persönliche Ziele</h3></div><span id="coachTargetSource">Automatisch</span></div>
        <div class="coach-target-grid">
          <article class="coach-target-primary"><span>Kalorien</span><strong><b id="coachCalories">–</b> kcal</strong><small id="coachCalorieContext">Tagesziel</small></article>
          <article><span>Eiweiß</span><strong id="coachProtein">–</strong><small>Muskelerhalt</small></article>
          <article><span>Fett</span><strong id="coachFat">–</strong><small>Hormonbasis</small></article>
          <article><span>Kohlenhydrate</span><strong id="coachCarbs">–</strong><small>Leistung</small></article>
          <article><span>Schritte</span><strong id="coachSteps">–</strong><small>Alltagsbewegung</small></article>
          <article><span>Training</span><strong id="coachTraining">–</strong><small>pro Woche</small></article>
        </div>
        <div class="coach-target-actions"><button id="recalculateProfile" type="button">Plan aktualisieren</button><button id="coachManualToggle" type="button">Feinabstimmung</button></div>
      </section>
      <div id="coachManualMount"></div>
      <aside class="coach-privacy">${icon('shield')}<div><strong>Privat und lokal</strong><span>Deine Profil- und Gesundheitsdaten bleiben auf diesem Gerät.</span></div></aside>`;
    if(manual){
      manual.removeAttribute('open');
      manual.classList.add('coach-manual-panel');
      $('#coachManualMount')?.append(manual);
    }
    return screen;
  }
  function bindRows(){
    for(const id of ['coachBodyRow','coachActivityRow','coachNutritionRow','coachTargetRow']){
      const button=$(`#${id}`);if(button&&!button.dataset.bound){button.dataset.bound='1';button.addEventListener('click',()=>root.CutCoachProfile900?.openOnboarding?.({mode:'edit'}));}
    }
    const toggle=$('#coachManualToggle');
    if(toggle&&!toggle.dataset.bound){toggle.dataset.bound='1';toggle.addEventListener('click',()=>{const panel=$('#profileManualTargets');if(panel){panel.open=!panel.open;panel.scrollIntoView({behavior:'smooth',block:'start'});}})}
  }
  function render(){
    const screen=ensureStructure(),current=appState();
    if(!screen||!current)return;
    bindRows();
    const profile=current.profile||{},settings=current.settings||{},weightEntry=latestWeightEntry(current);
    const currentWeight=weightEntry?.weight??number(profile.baselineWeight),startWeight=number(profile.baselineWeight,currentWeight),goalWeight=number(profile.goalWeight??settings.goalWeight);
    const confidence=profileCompleteness(profile,currentWeight),progress=weightProgress(startWeight,currentWeight,goalWeight),signals=coachSignals(current,weightEntry);
    const manual=profile.planSource==='manual';
    const goal=goalLabels[profile.goal]||'Persönlicher Kurs';
    const activity=activityLabels[profile.activityLevel]||'Aktivität offen';
    const pace=paceLabels[profile.pace]||'Tempo offen';
    const name=profile.name?.trim();

    $('#coachRouteTitle').textContent=name?`${name}s ${goal}`:`Dein ${goal}`;
    $('#coachGoalLabel').textContent='Dein aktueller Kurs';
    $('#coachRouteCopy').textContent=`${activity} · ${number(profile.trainingDays,settings.gymGoal)||0}× Training pro Woche`;
    $('#coachPlanBadge').textContent=manual?'Manuell angepasst':'Profilgesteuert';
    $('#coachPlanBadge').classList.toggle('manual',manual);
    $('#coachStartWeight').textContent=startWeight===null?'–':`${format(startWeight,1)} kg`;
    $('#coachCurrentWeight').textContent=currentWeight===null?'–':`${format(currentWeight,1)} kg`;
    $('#coachGoalWeight').textContent=goalWeight===null?'Offen':`${format(goalWeight,1)} kg`;
    $('#coachConfidence').textContent=`${confidence}%`;
    $('#coachPace').textContent=pace.replace(' Tempo','');
    $('#coachWeightProgress').style.width=`${progress}%`;
    $('#coachWeightDot').style.left=`${progress}%`;
    $('#coachInsightDate').textContent=new Date().toLocaleDateString('de-DE',{weekday:'short',day:'2-digit',month:'2-digit'});
    $('#coachSignalList').innerHTML=signals.map(signal=>`<article data-tone="${signal.tone}"><i></i><div><strong>${escape(signal.title)}</strong><span>${escape(signal.text)}</span></div></article>`).join('');

    $('#coachBodyValue').textContent=profile.age&&profile.height?`${profile.age} Jahre · ${profile.height} cm`:'Angaben ergänzen';
    $('#coachBodyMeta').textContent=currentWeight===null?'Gewicht offen':`${format(currentWeight,1)} kg aktuell${goalWeight!==null?` · Ziel ${format(goalWeight,1)} kg`:''}`;
    $('#coachActivityValue').textContent=activity;
    $('#coachActivityMeta').textContent=`${number(profile.trainingDays,settings.gymGoal)||0}× Training · ${format(settings.steps)} Schritte`;
    $('#coachNutritionMeta').textContent=manual?'Manuelle Zielwerte aktiv':'Aus Körper, Alltag und Ziel berechnet';
    $('#coachTargetValue').textContent=goal;
    $('#coachTargetMeta').textContent=pace;

    $('#coachCalories').textContent=format(settings.calories);
    $('#coachCalorieContext').textContent=`Erhaltung ca. ${format(settings.maintenance)} kcal`;
    $('#coachProtein').textContent=`${format(settings.protein)} g`;
    $('#coachFat').textContent=`${format(settings.fat)} g`;
    $('#coachCarbs').textContent=`${format(settings.carbs)} g`;
    $('#coachSteps').textContent=format(settings.steps);
    $('#coachTraining').textContent=`${format(settings.gymGoal)}×`;
    $('#coachTargetSource').textContent=manual?'Manuell angepasst':'Automatisch berechnet';
    $('#coachTargetSource').classList.toggle('manual',manual);
    $('#recalculateProfile').textContent=manual?'Automatik wiederherstellen':'Plan aktualisieren';
  }
  function boot(){
    ensureStructure();render();
    root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='profile')setTimeout(render,0)});
    document.addEventListener('click',event=>{if(event.target.closest('#editProfile'))setTimeout(render,50);if(event.target.closest('#recalculateProfile,#saveSettings,#startApp'))setTimeout(render,80)});
  }
  root.CutCoachProfile1000=Object.freeze({version:VERSION,render});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
