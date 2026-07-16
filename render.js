'use strict';

function completionStatus(){
  const t=totals(),data=day(selectedDate,false),items=[
    ['Ernährung',t.calories>0],['Gewicht',data.weight!==null],['Schritte',data.steps!==null||state.settings.steps===0],['Gym',data.gym!==null],['Alkohol',data.alcohol!==null]
  ];
  const done=items.filter(([,complete])=>complete).length;
  return {done,total:items.length,complete:done===items.length,missing:items.filter(([,complete])=>!complete).map(([name])=>name)};
}
function dailyScore(){
  const t=totals(),data=day(selectedDate,false),settings=state.settings;
  if(t.calories<=0)return null;
  const difference=Math.abs(t.calories-settings.calories);
  const calories=difference<=150?2.5:difference<=300?2:difference<=500?1.2:difference<=800?.5:0;
  const protein=clamp(t.protein/Math.max(1,settings.protein),0,1)*2.5;
  const steps=settings.steps===0?1.5:data.steps===null?0:clamp(data.steps/settings.steps,0,1)*1.5;
  const rollingGym=range(selectedDate,7).filter(item=>item.data.gym===true).length;
  const gym=data.gym===true?1.5:data.gym===false?(settings.gymGoal===0||rollingGym>=settings.gymGoal?1.5:1.25):0;
  const alcohol=data.alcohol===false?1:data.alcohol===true?.15:0;
  const completed=[data.steps!==null||settings.steps===0,data.gym!==null,data.alcohol!==null].filter(Boolean).length/3*.5;
  return Math.round(clamp(calories+protein+steps+gym+alcohol+completed,0,10)*10)/10;
}
function feedback(){
  const t=totals(),data=day(selectedDate,false),settings=state.settings;
  if(!t.calories)return 'Trage deine Mahlzeiten und Aktivität ein. Danach bekommst du eine ehrliche Bewertung.';
  const points=[];
  points.push(t.protein>=settings.protein-15?'Eiweiß passt':`${fmt(Math.max(0,settings.protein-t.protein))} g Eiweiß fehlen`);
  points.push(t.calories>settings.calories+250?'Kalorien deutlich über Ziel':t.calories<settings.calories-500?'Nicht unnötig hungern':'Kalorien liegen gut');
  if(settings.steps>0)points.push(data.steps===null?'Schritte noch eintragen':data.steps>=settings.steps?'Schrittziel erreicht':`${fmt(settings.steps-data.steps)} Schritte fehlen`);
  if(data.gym===null)points.push('Gym-Status noch offen');
  else if(data.gym===false)points.push('Ruhetag eingetragen');
  if(data.alcohol===true)points.push('Alkohol als Ausnahme verbuchen und normal weitermachen');
  return `${points.join(' · ')}.`;
}
function completionText(){
  const status=completionStatus();
  return status.done===0?'Noch keine Tagesdaten eingetragen.':status.complete?'Tagescheck vollständig.':`${status.done}/${status.total} erledigt · Offen: ${status.missing.join(', ')}`;
}
function macroStatus(value,goal){
  if(goal===0)return value===0?'Ziel erreicht':`${fmt(value)} g über Ziel`;
  if(value>goal)return `${fmt(value-goal)} g über Ziel`;
  if(value===goal)return 'Ziel erreicht';
  return `${fmt(goal-value)} g fehlen`;
}
function render(){
  const settings=state.settings,data=day(selectedDate,false),t=totals(),score=dailyScore(),balance=settings.calories-t.calories,status=completionStatus();
  setText('#dateLabel',dateFromKey(selectedDate).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'}));
  $('#datePicker').value=selectedDate;
  $('#nextDay').disabled=selectedDate>=todayKey();
  $('#todayButton').hidden=selectedDate===todayKey();
  setText('#kcalTotal',fmt(t.calories));
  setText('#kcalStatus',balance>=0?`${fmt(balance)} kcal übrig`:`${fmt(Math.abs(balance))} kcal über Ziel`);
  $('#kcalStatus').classList.toggle('over',balance<0);
  $('#kcalStatus').classList.toggle('near',balance>=0&&balance<=200);
  setBar('#kcalBar',t.calories,settings.calories);
  [['protein',t.protein,settings.protein],['carbs',t.carbs,settings.carbs],['fat',t.fat,settings.fat]].forEach(([key,value,goal])=>{
    setText(`#${key}Total`,fmt(value));setText(`#${key}Goal`,fmt(goal));
    setText(`#${key}Remaining`,macroStatus(value,goal));setBar(`#${key}Bar`,value,goal);
  });
  setText('#todayWeight',data.weight===null?'–':fmt(data.weight,1));
  setText('#stepGoal',fmt(settings.steps));
  if(document.activeElement!==$('#stepsInput'))$('#stepsInput').value=data.steps??'';
  $('#clearSteps').hidden=data.steps===null;
  setBar('#stepsBar',data.steps??0,settings.steps);
  setText('#stepsView',data.steps===null?'–':fmt(data.steps));
  setText('#score',score===null?'–':fmt(score,1));
  setText('#scoreCaption',score===null?'vorläufig':status.complete?'/10':'vorläufig');
  $('#scoreRing').style.setProperty('--score-angle',`${score===null?0:score/10*360}deg`);
  const energy=settings.maintenance-t.calories;
  setText('#energyBalanceLabel',energy>=0?'Defizit*':'Überschuss*');
  setText('#deficit',t.calories?fmt(Math.abs(energy)):'–');
  const week=range(selectedDate,7);
  setText('#gymWeek',week.filter(item=>item.data.gym===true).length);setText('#gymWeekGoal',settings.gymGoal);
  setText('#feedback',feedback());setText('#completionText',completionText());
  setText('#foodKcal',fmt(t.calories));setText('#foodProtein',fmt(t.protein));
  setText('#foodBalanceLabel',balance>=0?'Noch offen':'Über Ziel');setText('#foodOpen',fmt(Math.abs(balance)));
  $$('[data-gym],[data-alcohol]').forEach(button=>{button.classList.remove('on');button.setAttribute('aria-pressed','false');});
  if(data.gym!==null){const button=$(`[data-gym="${data.gym}"]`);button?.classList.add('on');button?.setAttribute('aria-pressed','true');}
  if(data.alcohol!==null){const button=$(`[data-alcohol="${data.alcohol}"]`);button?.classList.add('on');button?.setAttribute('aria-pressed','true');}
  renderMeals();renderProgress();fillSettings();renderMeta();saveState();
}
function renderMeals(){
  const wrap=$('#mealList');
  if(!wrap)return;
  const data=day(selectedDate,false);
  const icons={'Frühstück':'☀️','Mittagessen':'🥗','Abendessen':'🌙','Snack':'🍎'};
  const groups=MEAL_TYPES.map(type=>({type,items:data.meals.filter(meal=>meal.type===type)})).filter(group=>group.items.length);
  const previousMeals=day(shiftKey(selectedDate,-1),false).meals;
  const copyButton=$('#copyPreviousMeals');
  if(copyButton){copyButton.disabled=previousMeals.length===0;copyButton.title=previousMeals.length?`${previousMeals.length} Mahlzeiten vom Vortag übernehmen`:'Am Vortag sind keine Mahlzeiten eingetragen';}
  if(!groups.length){wrap.innerHTML='<article class="card empty">Noch keine Mahlzeiten. Tippe auf „+ Mahlzeit“ oder übernimm den Vortag.</article>';return;}
  wrap.innerHTML=groups.map(group=>`<section class="meal-group"><div class="meal-group-title"><h3>${group.type}</h3><span>${fmt(group.items.reduce((sum,meal)=>sum+meal.calories,0))} kcal</span></div><article class="card">${group.items.map(meal=>`<div class="meal"><div class="meal-icon">${icons[group.type]}</div><button class="meal-main meal-edit" data-edit-meal="${meal.id}" type="button"><b>${escapeHtml(meal.name)}</b><small>E ${fmt(meal.protein)} · KH ${fmt(meal.carbs)} · F ${fmt(meal.fat)} g</small></button><div class="meal-kcal">${fmt(meal.calories)}<small>kcal</small></div><div class="meal-actions"><button class="meal-action" data-copy-meal="${meal.id}" type="button" aria-label="Mahlzeit duplizieren">⧉</button><button class="meal-action delete" data-delete-meal="${meal.id}" type="button" aria-label="Mahlzeit löschen">×</button></div></div>`).join('')}</article></section>`).join('');
  $$('[data-edit-meal]').forEach(button=>button.onclick=()=>openMeal(button.dataset.editMeal));
  $$('[data-copy-meal]').forEach(button=>button.onclick=()=>duplicateMeal(button.dataset.copyMeal));
  $$('[data-delete-meal]').forEach(button=>button.onclick=()=>deleteMeal(button.dataset.deleteMeal));
}
function weightEntries(end=selectedDate){return Object.entries(state.days).filter(([key,value])=>key<=end&&value.weight!==null).sort(([a],[b])=>a.localeCompare(b));}
function weightTrend(end=selectedDate){
  const entries=weightEntries(end);
  const currentStart=shiftKey(end,-6),previousStart=shiftKey(end,-13),previousEnd=shiftKey(end,-7);
  const current=entries.filter(([key])=>key>=currentStart&&key<=end).map(([,value])=>value.weight);
  const previous=entries.filter(([key])=>key>=previousStart&&key<=previousEnd).map(([,value])=>value.weight);
  if(current.length>=2&&previous.length>=2)return {value:avg(current)-avg(previous),basis:'7-Tage-Ø',reliable:true};
  const recent=entries.filter(([key])=>key>=shiftKey(end,-13)).slice(-8);
  if(recent.length>=2){
    const span=Math.max(1,Math.round((dateFromKey(recent.at(-1)[0])-dateFromKey(recent[0][0]))/86400000));
    return {value:recent.at(-1)[1].weight-recent[0][1].weight,basis:`${span} Tage`,reliable:false};
  }
  return null;
}
function renderProgress(){
  const settings=state.settings,days=range(selectedDate,7),logged=days.filter(item=>item.totals.calories>0),stepDays=days.filter(item=>item.data.steps!==null);
  setText('#rangeLabel',`${dateFromKey(days[0].key).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} – ${dateFromKey(days.at(-1).key).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}`);
  setText('#avgCalories',logged.length?`Ø ${fmt(avg(logged.map(item=>item.totals.calories)))}`:'Ø –');
  $('#weekBars').innerHTML=days.map(item=>{
    const height=item.totals.calories?clamp(item.totals.calories/Math.max(1,settings.calories)*125,6,140):6;
    const label=`${dateFromKey(item.key).toLocaleDateString('de-DE',{weekday:'long'})}: ${fmt(item.totals.calories)} kcal`;
    return `<div class="week-item" role="img" aria-label="${label}"><i style="height:${height}px;opacity:${item.totals.calories?1:.18}"></i>${dateFromKey(item.key).toLocaleDateString('de-DE',{weekday:'short'}).slice(0,2)}</div>`;
  }).join('');
  const trend=weightTrend();
  setText('#weightTrend',trend?`${trend.value>0?'+':''}${fmt(trend.value,1)}`:'–');
  setText('#weightTrendBasis',trend?trend.basis:'');
  setText('#avgProtein',logged.length?fmt(avg(logged.map(item=>item.totals.protein))):'–');
  setText('#weekGym',days.filter(item=>item.data.gym===true).length);
  setText('#avgSteps',stepDays.length?fmt(avg(stepDays.map(item=>item.data.steps))):'–');
  const weights=weightEntries();
  $('#weightHistory').innerHTML=weights.length?weights.slice(-12).reverse().map(([key,value])=>`<button class="weight-row" data-weight-date="${key}" type="button"><span>${dateFromKey(key).toLocaleDateString('de-DE')}</span><b>${fmt(value.weight,1)} kg</b></button>`).join(''):'<div class="empty">Noch keine Gewichtseinträge.</div>';
  $$('[data-weight-date]').forEach(button=>button.onclick=()=>{selectDate(button.dataset.weightDate);const data=day(selectedDate,false);$('#weightInput').value=data.weight??'';$('#clearWeight').hidden=data.weight===null;openModal('weightModal');});
  if(settings.goalWeight===null)setText('#goalStatus','Trage dein Wunschgewicht in den Einstellungen ein.');
  else if(weights.length){
    const current=weights.at(-1)[1].weight,delta=current-settings.goalWeight;
    setText('#goalStatus',delta>0?`Noch ${fmt(delta,1)} kg bis zum Wunschgewicht.`:'Wunschgewicht erreicht oder unterschritten.');
  }else setText('#goalStatus',`Wunschgewicht: ${fmt(settings.goalWeight,1)} kg.`);
  let advice='Nach mindestens fünf sauber dokumentierten Tagen und mehreren Gewichtsmessungen wird die Bewertung aussagekräftiger.';
  if(logged.length>=5&&trend?.reliable){
    advice=trend.value<-1.2?'Du verlierst aktuell sehr schnell. Erhöhe die Kalorien leicht und achte auf Leistung, Schlaf und Eiweiß.':trend.value<-0.3?'Der Trend passt. Behalte Kalorien, Eiweiß und Training zunächst unverändert bei.':trend.value>0.2?'Das durchschnittliche Gewicht steigt. Prüfe Portionsgrößen und Einträge. Hält das zwei Wochen an, reduziere um etwa 100–150 kcal.':'Der Trend ist nahezu stabil. Noch eine Woche sauber dokumentieren, bevor du etwas änderst.';
  }
  setText('#weekAdvice',advice);
}
function fillSettings(){
  const map={setAge:'age',setHeight:'height',setCalories:'calories',setMaintenance:'maintenance',setProtein:'protein',setFat:'fat',setCarbs:'carbs',setSteps:'steps',setGymGoal:'gymGoal',setGoalWeight:'goalWeight'};
  for(const [id,key] of Object.entries(map)){
    const element=$(`#${id}`);
    if(element&&document.activeElement!==element)element.value=state.settings[key]??'';
  }
}
function renderMeta(){
  setText('#appVersion',`Version ${APP_VERSION}`);setText('#onlineStatus',navigator.onLine?'Online':'Offline');
  $('#offlineBanner')?.classList.toggle('show',!navigator.onLine);
  setText('#backupStatus',state.meta.lastBackupAt?`Letztes Backup: ${new Date(state.meta.lastBackupAt).toLocaleString('de-DE')}`:'Noch kein Backup erstellt.');
  const warning=$('#dataWarning');
  if(warning){warning.hidden=!startupWarning;setText('#dataWarningMessage',startupWarning||'');}
  const recovery=$('#exportRecovery');if(recovery)recovery.hidden=!hasRecoveryData();
  const restore=$('#restorePrevious');if(restore)restore.hidden=!hasPreviousState();
  setText('#dataSummary',`${Object.keys(state.days).length} Tage · ${Object.values(state.days).reduce((sum,item)=>sum+item.meals.length,0)} Mahlzeiten`);
}
