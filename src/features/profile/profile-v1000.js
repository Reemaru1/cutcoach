'use strict';

(function(root){
  const VERSION='10.0.5-alpha';
  const $=selector=>document.querySelector(selector);
  const goalLabels={lose:'Fettverlust',maintain:'Gewicht halten',gain:'Muskelaufbau'};
  const activityLabels={sedentary:'Sitzender Alltag',light:'Leicht aktiv',active:'Aktiver Alltag','very-active':'Sehr aktiv'};
  const paceLabels={gentle:'Ruhiges Tempo',balanced:'Ausgewogenes Tempo',focused:'Fokussiertes Tempo'};
  let syncing=false;

  function appState(){try{return root.state}catch{return null}}
  function number(value,fallback=null){
    if(value===null||value===undefined||value==='')return fallback;
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function positive(value,fallback=null){const parsed=number(value);return parsed!==null&&parsed>0?parsed:fallback}
  function format(value,digits=0){const parsed=number(value);return parsed===null?'–':parsed.toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
  function today(){return typeof root.todayKey==='function'?root.todayKey():new Date().toISOString().slice(0,10)}
  function latestWeightEntry(current){
    const entries=Object.entries(current?.days||{})
      .map(([date,entry])=>({date,weight:positive(entry?.weight)}))
      .filter(entry=>entry.weight!==null)
      .sort((a,b)=>b.date.localeCompare(a.date));
    if(entries.length)return entries[0];
    const baseline=positive(current?.profile?.baselineWeight);
    return baseline===null?null:{date:current?.profile?.completedAt?.slice(0,10)||today(),weight:baseline};
  }
  function profileCompleteness(profile,weight){
    const checks=[
      Boolean(profile?.goal),positive(profile?.age)!==null,positive(profile?.height)!==null,
      positive(weight)!==null,Boolean(profile?.activityLevel),number(profile?.trainingDays)!==null,Boolean(profile?.pace)
    ];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  }
  function icon(name){
    const paths={
      settings:'<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.12-1.28l2.02-1.56-2-3.46-2.48 1a7.2 7.2 0 0 0-2.22-1.28L13.85 3h-4l-.35 2.42A7.2 7.2 0 0 0 7.28 6.7l-2.48-1-2 3.46 2.02 1.56A7 7 0 0 0 4.7 12c0 .44.04.87.12 1.28L2.8 14.84l2 3.46 2.48-1a7.2 7.2 0 0 0 2.22 1.28l.35 2.42h4l.35-2.42a7.2 7.2 0 0 0 2.22-1.28l2.48 1 2-3.46-2.02-1.56c.08-.41.12-.84.12-1.28Z"/>',
      body:'<circle cx="12" cy="7" r="3"/><path d="M7 21v-4a5 5 0 0 1 10 0v4M9 12l-2 4m8-4 2 4"/>',
      activity:'<path d="M3 13h4l2-7 4 14 2-8h6"/>',
      food:'<path d="M7 3v8m4-8v8M5 7h8M9 11v10M17 3v18m0-18c3 2 3 7 0 9"/>',
      target:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3m10 7h-3M12 22v-3M2 12h3"/>',
      edit:'<path d="m4 20 4-1 10-10-3-3L5 16l-1 4Z"/><path d="m13 8 3 3"/>',
      shield:'<path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.target}</svg>`;
  }
  function differs(settings,plan){
    return ['maintenance','calories','protein','fat','carbs','steps'].some(key=>number(settings?.[key])!==number(plan?.[key]))||number(settings?.gymGoal)!==number(plan?.trainingDays);
  }
  function syncAutomaticPlan(){
    const current=appState(),profile=current?.profile;
    if(syncing||!current||!profile||profile.planSource==='manual'||!root.CutCoachProfile900?.calculatePlan)return false;
    const weight=latestWeightEntry(current)?.weight??positive(profile.baselineWeight);
    if(weight===null)return false;
    const plan=root.CutCoachProfile900.calculatePlan({...profile,weight});
    if(!differs(current.settings,plan))return false;
    syncing=true;
    const committed=root.commitStateMutation?.(draft=>{
      Object.assign(draft.settings,{
        age:plan.age,height:plan.height,maintenance:plan.maintenance,calories:plan.calories,
        protein:plan.protein,fat:plan.fat,carbs:plan.carbs,steps:plan.steps,gymGoal:plan.trainingDays
      });
      draft.profile.baselineWeight=plan.weight;
      draft.profile.planSource='profile';
    });
    syncing=false;
    if(committed)root.render?.();
    return Boolean(committed);
  }
  function ensureStructure(){
    const screen=$('.profile-screen');
    if(!screen||screen.dataset.coachHub===VERSION)return screen;
    const manual=$('#profileManualTargets')||[...document.querySelectorAll('.settings-group')].find(group=>group.querySelector('#saveSettings'));
    screen.dataset.coachHub=VERSION;
    screen.classList.add('profile-coach-hub');
    screen.innerHTML=`
      <header class="coach-hub-head">
        <h2>Profil</h2>
        <button id="openSettingsCenter" data-open="settingsCenterModal" type="button" aria-label="App-Einstellungen öffnen">${icon('settings')}</button>
      </header>
      <section class="coach-route coach-plan-overview" aria-labelledby="coachRouteTitle">
        <div class="coach-route-top">
          <div><small>Dein persönlicher Kurs</small><h3 id="coachRouteTitle">Dein CutCoach-Plan</h3><p id="coachRouteCopy">Diese Angaben steuern deinen persönlichen Tagesrahmen.</p></div>
        </div>
        <div class="coach-course-summary">
          <article><span>Ziel</span><strong id="coachCourseGoal">–</strong></article>
          <article><span>Alltag</span><strong id="coachCourseActivity">–</strong></article>
          <article><span>Tempo</span><strong id="coachCoursePace">–</strong></article>
        </div>
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
      </section>
      <div id="coachManualMount"></div>
      <aside class="coach-privacy">${icon('shield')}<div><strong>Privat und lokal</strong><span>Deine Profil- und Gesundheitsdaten bleiben auf diesem Gerät.</span></div></aside>`;
    if(manual){
      manual.removeAttribute('open');
      manual.classList.add('coach-manual-panel');
      $('#coachManualMount')?.append(manual);
    }
    document.querySelector('.coach-plan-status')?.remove();
    return screen;
  }
  function bindRows(){
    for(const id of ['coachBodyRow','coachActivityRow','coachNutritionRow','coachTargetRow']){
      const button=$(`#${id}`);
      if(button&&!button.dataset.bound){button.dataset.bound='1';button.addEventListener('click',()=>root.CutCoachProfile900?.openOnboarding?.({mode:'edit'}));}
    }
  }
  function render(){
    syncAutomaticPlan();
    const screen=ensureStructure(),current=appState();
    if(!screen||!current)return;
    bindRows();
    const profile=current.profile||{},settings=current.settings||{},weightEntry=latestWeightEntry(current);
    const currentWeight=weightEntry?.weight??positive(profile.baselineWeight),goalWeight=positive(profile.goalWeight??settings.goalWeight);
    const confidence=profileCompleteness(profile,currentWeight),manual=profile.planSource==='manual';
    const goal=goalLabels[profile.goal]||'Persönlicher Kurs';
    const activity=activityLabels[profile.activityLevel]||'Aktivität offen';
    const pace=paceLabels[profile.pace]||'Tempo offen';
    const trainingDays=number(profile.trainingDays,settings.gymGoal)||0;

    $('#coachRouteTitle').textContent='Dein CutCoach-Plan';
    $('#coachRouteCopy').textContent='Ziel, Alltag und Tempo bilden automatisch deinen Tagesrahmen.';
    $('#coachCourseGoal').textContent=goal;
    $('#coachCourseActivity').textContent=`${activity} · ${trainingDays}× Training`;
    $('#coachCoursePace').textContent=pace;

    $('#coachBodyValue').textContent=profile.age&&profile.height?`${profile.age} Jahre · ${profile.height} cm`:'Angaben ergänzen';
    $('#coachBodyMeta').textContent=currentWeight===null?'Aktuelles Gewicht noch offen':`${format(currentWeight,1)} kg aktuell${goalWeight!==null?` · Ziel ${format(goalWeight,1)} kg`:''}`;
    $('#coachActivityValue').textContent=activity;
    $('#coachActivityMeta').textContent=`${trainingDays}× Training · ${format(settings.steps)} Schritte`;
    $('#coachNutritionMeta').textContent=manual?'Manuelle Zielwerte aktiv':'Wird bei Profiländerungen automatisch neu berechnet';
    $('#coachTargetValue').textContent=goal;
    $('#coachTargetMeta').textContent=pace;

    $('#coachCalories').textContent=format(settings.calories);
    $('#coachCalorieContext').textContent=`Erhaltung ca. ${format(settings.maintenance)} kcal`;
    $('#coachProtein').textContent=`${format(settings.protein)} g`;
    $('#coachFat').textContent=`${format(settings.fat)} g`;
    $('#coachCarbs').textContent=`${format(settings.carbs)} g`;
    $('#coachSteps').textContent=format(settings.steps);
    $('#coachTraining').textContent=`${format(settings.gymGoal)}×`;
    $('#coachTargetSource').textContent=manual?'Manuell angepasst':'Automatisch aktuell';
    $('#coachTargetSource').classList.toggle('manual',manual);
    screen.dataset.profileConfidence=String(confidence);
  }
  function scheduleRender(delay=80){setTimeout(()=>{syncAutomaticPlan();render();},delay)}
  function boot(){
    ensureStructure();render();
    root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='profile')scheduleRender(0)});
    document.addEventListener('click',event=>{
      if(event.target.closest('#editProfile'))scheduleRender(50);
      if(event.target.closest('#saveSettings,#startApp,#saveWeight,[data-action="save-weight"]'))scheduleRender(120);
    });
  }
  root.CutCoachProfile1000=Object.freeze({version:VERSION,render,latestWeightEntry,syncAutomaticPlan});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
