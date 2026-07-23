'use strict';

(function(root){
  const VERSION='9.1.0-alpha';
  const PAL={sedentary:1.4,light:1.55,active:1.7,'very-active':1.9};
  const GOAL_LABELS={lose:'Gewicht reduzieren',maintain:'Gewicht halten',gain:'Muskeln aufbauen'};
  const ACTIVITY_LABELS={sedentary:'Überwiegend sitzend',light:'Leicht aktiv',active:'Aktiver Alltag','very-active':'Sehr aktiv'};
  const $=selector=>document.querySelector(selector);
  let step=0;
  let mode='start';
  let abandonmentRecorded=false;

  function appState(){try{return state}catch{return null}}
  function numeric(value,fallback=null){
    if(value===''||value===null||value===undefined)return fallback;
    const parsed=Number(String(value).trim().replace(',','.'));
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function roundTo(value,stepSize=1){return Math.round(value/stepSize)*stepSize}
  function selectedValue(name,fallback){return document.querySelector(`[name="${name}"]:checked`)?.value||fallback}
  function setText(selector,text){const element=$(selector);if(element)element.textContent=text}
  function latestWeight(){
    const current=appState();
    const profileWeight=numeric(current?.profile?.baselineWeight);
    const entries=Object.entries(current?.days||{}).sort(([a],[b])=>b.localeCompare(a));
    const recorded=entries.find(([,entry])=>numeric(entry?.weight)!==null)?.[1]?.weight;
    return numeric(recorded,profileWeight);
  }
  function referenceWeight(weight,height,goalWeight){
    const healthyCeiling=25*Math.pow(height/100,2);
    const desired=numeric(goalWeight);
    if(desired&&desired<=weight)return clamp(desired,healthyCeiling*.86,weight);
    return weight>healthyCeiling?healthyCeiling:weight;
  }

  function calculatePlan(input={}){
    const age=clamp(Math.round(numeric(input.age,28)),18,100);
    const height=clamp(numeric(input.height,179),120,230);
    const weight=clamp(numeric(input.weight??input.baselineWeight,75),30,300);
    const sex=['female','male','neutral'].includes(input.calculationSex)?input.calculationSex:'neutral';
    const activity=Object.hasOwn(PAL,input.activityLevel)?input.activityLevel:'light';
    const goal=['lose','maintain','gain'].includes(input.goal)?input.goal:'maintain';
    const pace=['gentle','balanced','focused'].includes(input.pace)?input.pace:'balanced';
    const trainingDays=clamp(Math.round(numeric(input.trainingDays,3)),0,7);
    const sexConstant=sex==='male'?5:sex==='female'?-161:-78;
    const rmr=10*weight+6.25*height-5*age+sexConstant;
    const maintenance=roundTo(clamp(rmr*PAL[activity],1200,7000),25);
    const lossRates={gentle:.10,balanced:.15,focused:.20};
    const gainRates={gentle:.05,balanced:.08,focused:.10};
    let calories=maintenance;
    if(goal==='lose')calories=Math.max(rmr*1.1,maintenance-Math.min(750,maintenance*lossRates[pace]));
    if(goal==='gain')calories=maintenance+Math.min(400,maintenance*gainRates[pace]);
    calories=roundTo(clamp(calories,1200,6000),25);
    const refWeight=referenceWeight(weight,height,input.goalWeight);
    const proteinFactor=trainingDays>=2||goal!=='maintain'?1.6:1.1;
    const protein=roundTo(clamp(refWeight*proteinFactor,50,250),5);
    let fat=roundTo(clamp(Math.max(refWeight*.8,calories*.25/9),40,160),5);
    let carbs=roundTo((calories-protein*4-fat*9)/4,5);
    if(carbs<50){
      carbs=50;
      fat=roundTo(clamp((calories-protein*4-carbs*4)/9,40,160),5);
    }
    const steps={sedentary:6000,light:7500,active:9000,'very-active':11000}[activity];
    return Object.freeze({
      age,height,weight,calculationSex:sex,activityLevel:activity,goal,pace,trainingDays,
      rmr:roundTo(rmr),maintenance,calories,protein,fat,carbs,steps
    });
  }

  function values(){
    return {
      name:$('#profileNameInput')?.value.trim()||'',
      goal:selectedValue('profileGoal','lose'),
      age:numeric($('#profileAgeInput')?.value),
      height:numeric($('#profileHeightInput')?.value),
      weight:numeric($('#startWeight')?.value),
      goalWeight:numeric($('#startGoal')?.value),
      calculationSex:$('#profileSexInput')?.value||'neutral',
      activityLevel:selectedValue('profileActivity','light'),
      trainingDays:numeric($('#profileTrainingInput')?.value,3),
      pace:selectedValue('profilePace','balanced')
    };
  }
  function fill(profile={}){
    const current=appState();
    const assign=(selector,value)=>{const element=$(selector);if(element&&value!==null&&value!==undefined)element.value=value};
    assign('#profileNameInput',profile.name||'');
    assign('#profileAgeInput',profile.age??current?.settings?.age??28);
    assign('#profileHeightInput',profile.height??current?.settings?.height??179);
    assign('#startWeight',profile.baselineWeight??latestWeight()??'');
    assign('#startGoal',profile.goalWeight??current?.settings?.goalWeight??'');
    assign('#profileTrainingInput',profile.trainingDays??current?.settings?.gymGoal??3);
    assign('#profileSexInput',profile.calculationSex||'neutral');
    for(const [name,value] of [
      ['profileGoal',profile.goal||'lose'],
      ['profileActivity',profile.activityLevel||'light'],
      ['profilePace',profile.pace||'balanced']
    ]){
      const input=document.querySelector(`[name="${name}"][value="${value}"]`);
      if(input)input.checked=true;
    }
    updateDynamicFields();
    root.CutCoachInsights?.track('onboarding_step_view',{step:step+1,mode});
  }
  function validationMessage(currentStep,input){
    if(currentStep===0&&!['lose','maintain','gain'].includes(input.goal))return 'Bitte wähle dein persönliches Ziel.';
    if(currentStep===1){
      if(input.age<18||input.age>100)return 'Bitte gib ein Alter zwischen 18 und 100 Jahren ein.';
      if(input.height<120||input.height>230)return 'Bitte gib eine Körpergröße zwischen 120 und 230 cm ein.';
      if(input.weight<30||input.weight>300)return 'Bitte gib ein aktuelles Gewicht zwischen 30 und 300 kg ein.';
      if(input.goal==='lose'&&input.goalWeight&&input.goalWeight>=input.weight)return 'Zum Abnehmen sollte das Wunschgewicht unter deinem aktuellen Gewicht liegen.';
      if(input.goal==='gain'&&input.goalWeight&&input.goalWeight<=input.weight)return 'Für den Aufbau sollte das Wunschgewicht über deinem aktuellen Gewicht liegen.';
    }
    return '';
  }
  function updateDynamicFields(){
    const input=values();
    setText('#profileTrainingValue',String(input.trainingDays));
    const goalWeight=$('#profileGoalWeightField');
    if(goalWeight)goalWeight.hidden=input.goal==='maintain';
    if(input.age&&input.height&&input.weight){
      const plan=calculatePlan(input);
      setText('#profilePreviewCalories',plan.calories.toLocaleString('de-DE'));
      setText('#profilePreviewProtein',`${plan.protein} g`);
      setText('#profilePreviewCarbs',`${plan.carbs} g`);
      setText('#profilePreviewFat',`${plan.fat} g`);
      setText('#profilePreviewSteps',plan.steps.toLocaleString('de-DE'));
      setText('#profilePreviewGoal',GOAL_LABELS[input.goal]||'persönlich berechnet');
    }
  }
  function showStep(nextStep){
    step=clamp(nextStep,0,3);
    for(const panel of document.querySelectorAll('[data-profile-step]')){
      const active=Number(panel.dataset.profileStep)===step;
      panel.hidden=!active;
      panel.classList.toggle('active',active);
    }
    setText('#profileStepLabel',`Schritt ${step+1} von 4`);
    setText('#profileStepPercent',`${(step+1)*25}%`);
    const progress=$('#profileStepBar');
    if(progress)progress.style.width=`${(step+1)*25}%`;
    const back=$('#profileStepBack');
    if(back)back.hidden=step===0;
    const next=$('#profileStepNext');
    if(next)next.hidden=step===3;
    const finish=$('#startApp');
    if(finish)finish.hidden=step!==3;
    updateDynamicFields();
    $('#onboardingModal [data-profile-step]:not([hidden]) input:not([type="radio"])')?.focus({preventScroll:true});
  }
  function openOnboarding(options={}){
    mode=options.mode==='edit'?'edit':'start';
    abandonmentRecorded=false;
    fill(appState()?.profile||{});
    const modal=$('#onboardingModal');
    if(!modal)return false;
    modal.dataset.mode=mode;
    const close=$('#profileOnboardingClose');
    if(close)close.hidden=mode!=='edit';
    showStep(0);
    if(typeof root.openModal==='function')root.openModal('onboardingModal');
    else{modal.classList.add('open');modal.setAttribute('aria-hidden','false');document.body.classList.add('modal-open')}
    root.CutCoachInsights?.track('onboarding_open',{mode});
    root.CutCoachInsights?.track('onboarding_started',{mode});
    return true;
  }
  function nextStep(){
    const message=validationMessage(step,values());
    if(message){root.toast?.(message);return}
    showStep(step+1);
  }
  function closeOnboarding(){
    if(mode!=='edit')return;
    const modal=$('#onboardingModal');
    if(typeof root.closeModal==='function')root.closeModal(modal);
    else{modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
    root.CutCoachInsights?.track('profile_edit_cancelled',{step:step+1});
  }
  function completeOnboarding(){
    const input=values();
    const message=[0,1,2,3].map(index=>validationMessage(index,input)).find(Boolean);
    if(message){root.toast?.(message);showStep(message.includes('Ziel')?0:1);return false}
    const plan=calculatePlan(input);
    const completedAt=new Date().toISOString();
    const committed=root.commitStateMutation?.(current=>{
      current.profile={
        version:1,name:input.name.slice(0,40),age:plan.age,height:plan.height,
        calculationSex:plan.calculationSex,goal:plan.goal,baselineWeight:plan.weight,
        goalWeight:input.goal==='maintain'?null:input.goalWeight,activityLevel:plan.activityLevel,
        trainingDays:plan.trainingDays,pace:plan.pace,completedAt,planSource:'profile'
      };
      current.settings={
        ...current.settings,age:plan.age,height:plan.height,maintenance:plan.maintenance,
        calories:plan.calories,protein:plan.protein,fat:plan.fat,carbs:plan.carbs,
        steps:plan.steps,gymGoal:plan.trainingDays,goalWeight:input.goal==='maintain'?null:input.goalWeight
      };
      current.onboarded=true;
      const key=typeof root.todayKey==='function'?root.todayKey():new Date().toISOString().slice(0,10);
      if(!current.days[key])current.days[key]={meals:[],weight:null,waist:null,bodyFat:null,steps:null,gym:null,alcohol:null,workout:null};
      current.days[key].weight=plan.weight;
    });
    if(!committed){root.toast?.('Dein Profil konnte nicht gespeichert werden.');return false}
    const modal=$('#onboardingModal');
    if(typeof root.closeModal==='function')root.closeModal(modal);
    else{modal?.classList.remove('open');modal?.setAttribute('aria-hidden','true');document.body.classList.remove('modal-open')}
    root.render?.();
    render();
    root.navigator?.storage?.persist?.().catch(()=>{});
    root.CutCoachInsights?.track('onboarding_complete',{goal:plan.goal,activity:plan.activityLevel,mode});
    root.toast?.(mode==='edit'?'Profil und automatische Ziele aktualisiert.':'Dein persönlicher Startplan ist bereit.');
    return true;
  }
  function recalculate(){
    const profile=appState()?.profile;
    const weight=latestWeight();
    if(!profile||!weight){openOnboarding({mode:'edit'});return}
    const plan=calculatePlan({...profile,weight});
    const committed=root.commitStateMutation?.(current=>{
      Object.assign(current.settings,{
        age:plan.age,height:plan.height,maintenance:plan.maintenance,calories:plan.calories,
        protein:plan.protein,fat:plan.fat,carbs:plan.carbs,steps:plan.steps,gymGoal:plan.trainingDays
      });
      current.profile.baselineWeight=plan.weight;
      current.profile.planSource='profile';
    });
    if(committed){root.render?.();render();root.toast?.('Automatische Ziele aus deinem Profil wiederhergestellt.')}
  }

  function hidePersonalOverrideFields(form){
    for(const id of ['setAge','setHeight','setGymGoal','setGoalWeight']){
      const input=$(`#${id}`);
      const label=input?.closest('label');
      if(label){label.hidden=true;label.classList.add('profile-hidden-setting')}
    }
    for(const row of form?.querySelectorAll('.two')||[]){
      const visible=[...row.children].some(child=>!child.hidden);
      row.hidden=!visible;
    }
  }
  function ensureProfileLayout(){
    const screen=$('.profile-screen');
    if(!screen||screen.dataset.profileUx==='9.1')return;
    screen.dataset.profileUx='9.1';
    screen.classList.add('profile-v910');
    const pageKicker=screen.querySelector('.profile-page-head small');
    if(pageKicker)pageKicker.textContent='Profil & persönliche Ziele';

    const identity=screen.querySelector('.profile-identity-card');
    identity?.classList.add('profile-summary-card');
    const bodyCard=$('#profileBodyFacts')?.closest('article');
    const activityCard=$('#profileActivityFacts')?.closest('article');
    const bodyMeta=bodyCard?.querySelector('small');
    const activityMeta=activityCard?.querySelector('small');
    if(bodyMeta)bodyMeta.id='profileBodyMeta';
    if(activityMeta)activityMeta.id='profileActivityMeta';

    const settingsSheet=$('#settingsCenterModal .settings-center-sheet');
    const settingsIntro=settingsSheet?.querySelector('.settings-center-intro');
    if(settingsIntro)settingsIntro.textContent='Backups, Datenschutz, Produktqualität und Feedback – getrennt von deinen persönlichen Zielen.';

    const manualGroup=[...document.querySelectorAll('.settings-group')].find(group=>group.querySelector('#saveSettings'));
    if(manualGroup){
      manualGroup.id='profileManualTargets';
      manualGroup.classList.add('profile-manual-goals');
      manualGroup.removeAttribute('open');
      const summary=manualGroup.querySelector('summary');
      if(summary)summary.innerHTML='<span>Ziele manuell anpassen</span><small id="profileManualSummary">Optional · überschreibt nur deinen Tagesplan</small>';
      const form=manualGroup.querySelector('.settings-center-form');
      hidePersonalOverrideFields(form);
      if(form&&!form.querySelector('.profile-manual-note')){
        const note=document.createElement('p');
        note.className='profile-manual-note';
        note.textContent='Alter, Körperdaten, Wunschgewicht und Training bearbeitest du ausschließlich über „Profil bearbeiten“.';
        form.prepend(note);
      }
      const save=$('#saveSettings');
      if(save)save.textContent='Manuelle Ziele speichern';
      const privacy=screen.querySelector('.profile-privacy');
      screen.insertBefore(manualGroup,privacy||null);
    }

    const privacyTitle=screen.querySelector('.profile-privacy strong');
    const privacyText=screen.querySelector('.profile-privacy span');
    if(privacyTitle)privacyTitle.textContent='Privat auf deinem Gerät';
    if(privacyText)privacyText.textContent='Profil, Ziele und Einträge werden lokal gespeichert und nicht in dein GitHub-Repository hochgeladen.';
  }

  function profileCompletion(profile,weight){
    const checks=[
      ['Ziel',Boolean(profile.goal)],
      ['Alter',numeric(profile.age)!==null],
      ['Größe',numeric(profile.height)!==null],
      ['Gewicht',numeric(weight)!==null],
      ['Alltag',Boolean(profile.activityLevel)],
      ['Training',numeric(profile.trainingDays)!==null],
      ['Tempo',Boolean(profile.pace)]
    ];
    const done=checks.filter(([,complete])=>complete).length;
    return {done,total:checks.length,percent:Math.round(done/checks.length*100),missing:checks.filter(([,complete])=>!complete).map(([name])=>name)};
  }
  function render(){
    ensureProfileLayout();
    const current=appState();
    if(!current)return;
    const profile=current.profile||{};
    const settings=current.settings||{};
    const weight=latestWeight();
    const completion=profileCompletion(profile,weight);
    const completed=Boolean(profile.completedAt&&completion.done===completion.total);
    const manual=profile.planSource==='manual';
    const firstName=profile.name?.trim().split(/\s+/)[0]||'';
    const goalLabel=GOAL_LABELS[profile.goal]||'Persönliches Ziel';
    const activityLabel=ACTIVITY_LABELS[profile.activityLevel]||'Alltag noch offen';
    const trainingDays=Number(profile.trainingDays??settings.gymGoal??0);
    const goalWeight=numeric(profile.goalWeight??settings.goalWeight);

    setText('#profileGreeting',firstName?`${firstName}s persönlicher Plan`:'Dein persönlicher Plan');
    setText('#profileGoalEyebrow',goalLabel);
    setText('#profileSummary',completed?`${activityLabel} · ${trainingDays}× Training pro Woche`:`Noch ${completion.total-completion.done} Angaben ergänzen, damit alle Ziele zuverlässig berechnet werden.`);
    setText('#profileStatus',completed?'Profil vollständig':`${completion.total-completion.done} Angaben offen`);
    const status=$('#profileStatus');
    status?.classList.toggle('complete',completed);
    status?.classList.toggle('incomplete',!completed);

    const completionCard=$('#profileCompletionCard');
    if(completionCard)completionCard.hidden=completed;
    setText('#profileCompletionLabel',`${completion.percent}% eingerichtet`);
    const completionBar=$('#profileCompletionBar');
    if(completionBar)completionBar.style.width=`${completion.percent}%`;
    const completeButton=$('#completeProfile');
    if(completeButton)completeButton.textContent='Fehlende Angaben ergänzen';

    setText('#profileCalories',Number(settings.calories||0).toLocaleString('de-DE'));
    setText('#profileMaintenance',Number(settings.maintenance||0).toLocaleString('de-DE'));
    setText('#profileProtein',`${Number(settings.protein||0).toLocaleString('de-DE')} g`);
    setText('#profileCarbs',`${Number(settings.carbs||0).toLocaleString('de-DE')} g`);
    setText('#profileFat',`${Number(settings.fat||0).toLocaleString('de-DE')} g`);
    setText('#profileSteps',Number(settings.steps||0).toLocaleString('de-DE'));

    setText('#profileBodyFacts',profile.age&&profile.height?`${profile.age} Jahre · ${profile.height} cm`:'Körperdaten ergänzen');
    setText('#profileBodyMeta',weight?`${Number(weight).toLocaleString('de-DE',{maximumFractionDigits:1})} kg aktuell${goalWeight?` · Ziel ${goalWeight.toLocaleString('de-DE',{maximumFractionDigits:1})} kg`:''}`:'Gewicht noch offen');
    setText('#profileActivityFacts',activityLabel);
    setText('#profileActivityMeta',`${trainingDays}× Training · ${Number(settings.steps||0).toLocaleString('de-DE')} Schritte Ziel`);
    setText('#profilePlanSource',manual?'Manuell angepasst':completed?'Automatisch berechnet':'Vorläufig berechnet');

    const planCard=$('.profile-plan-card');
    if(planCard)planCard.dataset.planSource=manual?'manual':completed?'profile':'estimate';
    const recalculate=$('#recalculateProfile');
    if(recalculate)recalculate.textContent=manual?'Automatische Ziele wiederherstellen':'Ziele aktualisieren';
    const manualGroup=$('#profileManualTargets');
    manualGroup?.classList.toggle('manual-active',manual);
    setText('#profileManualSummary',manual?'Aktiv · automatische Berechnung überschrieben':'Optional · überschreibt nur deinen Tagesplan');

    const avatar=$('#profileAvatar');
    if(avatar)avatar.textContent=firstName?firstName.charAt(0).toUpperCase():'C';
  }
  function bind(){
    ensureProfileLayout();
    document.addEventListener('click',event=>{
      if(event.target.closest('#profileStepNext'))nextStep();
      else if(event.target.closest('#profileStepBack'))showStep(step-1);
      else if(event.target.closest('#profileOnboardingClose'))closeOnboarding();
      else if(event.target.closest('#editProfile,#completeProfile'))openOnboarding({mode:'edit'});
      else if(event.target.closest('#recalculateProfile'))recalculate();
      else if(event.target.closest('#saveSettings'))setTimeout(render,0);
    });
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&mode==='edit'&&$('#onboardingModal')?.classList.contains('open'))closeOnboarding()});
    document.addEventListener('input',event=>{if(event.target.closest('#onboardingModal'))updateDynamicFields()});
    document.addEventListener('change',event=>{if(event.target.closest('#onboardingModal'))updateDynamicFields()});
    root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='profile')render()});
    root.addEventListener('pagehide',()=>{
      if(abandonmentRecorded||mode!=='start'||!$('#onboardingModal')?.classList.contains('open')||appState()?.onboarded)return;
      abandonmentRecorded=true;
      root.CutCoachInsights?.track('onboarding_abandoned',{step:step+1});
    });
    render();
  }

  root.CutCoachProfile900=Object.freeze({
    version:VERSION,calculatePlan,openOnboarding,completeOnboarding,render,recalculate
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})(window);
