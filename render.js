function dailyScore(){
  const t=totals(),d=day(),s=state.settings; if(t.calories<=0)return null;
  const diff=Math.abs(t.calories-s.calories);
  const kcal=diff<=150?2.5:diff<=300?2:diff<=500?1.2:diff<=800?.5:0;
  const protein=clamp(t.protein/Math.max(1,s.protein),0,1)*2.5;
  const steps=s.steps===0?1.5:clamp(d.steps/s.steps,0,1)*1.5;
  const gym=d.gym===true?1.5:d.gym===false?1.1:0;
  const alcohol=d.alcohol===false?1:d.alcohol===true?.2:0;
  const completed=[d.steps>0||s.steps===0,d.gym!==null,d.alcohol!==null].filter(Boolean).length/3*.5;
  return Math.round(clamp(kcal+protein+steps+gym+alcohol+completed,0,10)*10)/10;
}
function feedback(){
  const t=totals(),d=day(),s=state.settings; if(!t.calories)return 'Trage deine Mahlzeiten und Aktivität ein. Danach bekommst du eine ehrliche Bewertung.';
  const p=[];
  p.push(t.protein>=s.protein-15?'Eiweiß passt':`${fmt(Math.max(0,s.protein-t.protein))} g Eiweiß fehlen`);
  p.push(t.calories>s.calories+250?'Kalorien deutlich über Ziel':t.calories<s.calories-500?'Nicht unnötig hungern':'Kalorien liegen gut');
  if(s.steps>0)p.push(d.steps>=s.steps?'Schrittziel erreicht':`${fmt(s.steps-d.steps)} Schritte fehlen`);
  if(d.gym===null)p.push('Gym-Status noch offen');
  if(d.alcohol===true)p.push('Alkohol als Ausnahme verbuchen und normal weitermachen');
  return `${p.join(' · ')}.`;
}
function completion(){
  const t=totals(),d=day(),items=[['Ernährung',t.calories>0],['Gewicht',d.weight!==null],['Schritte',d.steps>0||state.settings.steps===0],['Gym',d.gym!==null],['Alkohol',d.alcohol!==null]];
  const done=items.filter(x=>x[1]).length, missing=items.filter(x=>!x[1]).map(x=>x[0]);
  return done===0?'Noch keine Tagesdaten eingetragen.':done===items.length?'Tagescheck vollständig.':`${done}/${items.length} erledigt · Offen: ${missing.join(', ')}`;
}
function render(){
  const s=state.settings,d=day(),t=totals(),score=dailyScore(),balance=s.calories-t.calories;
  setText('#dateLabel',dateFromKey(selectedDate).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'long'}));
  $('#datePicker').value=selectedDate; $('#nextDay').disabled=selectedDate>=todayKey(); $('#todayButton').hidden=selectedDate===todayKey();
  setText('#kcalTotal',fmt(t.calories)); setText('#kcalStatus',balance>=0?`${fmt(balance)} kcal übrig`:`${fmt(Math.abs(balance))} kcal über Ziel`); $('#kcalStatus').className=balance<0?'bad':balance<250?'warn':''; setBar('#kcalBar',t.calories,s.calories);
  [['protein',t.protein,s.protein],['carbs',t.carbs,s.carbs],['fat',t.fat,s.fat]].forEach(([k,v,g])=>{ setText(`#${k}Total`,fmt(v)); setText(`#${k}Goal`,fmt(g)); setText(`#${k}Remaining`,v>=g?'Ziel erreicht':`${fmt(g-v)} g fehlen`); setBar(`#${k}Bar`,v,g); });
  setText('#todayWeight',d.weight===null?'–':fmt(d.weight,1)); setText('#stepGoal',fmt(s.steps)); if(document.activeElement!==$('#stepsInput'))$('#stepsInput').value=d.steps||''; setBar('#stepsBar',d.steps,s.steps); setText('#stepsView',fmt(d.steps));
  setText('#score',score===null?'–':fmt(score,1)); setText('#scoreCaption',score===null?'vorläufig':'/10'); $('#scoreRing')?.style.setProperty('--score',`${(score||0)*36}deg`);
  const energy=s.maintenance-t.calories; setText('#energyBalanceLabel',energy>=0?'Defizit*':'Überschuss*'); setText('#deficit',t.calories?fmt(Math.abs(energy)):'–');
  const week=range(todayKey(),7); setText('#gymWeek',week.filter(x=>x.data.gym===true).length); setText('#gymWeekGoal',s.gymGoal); setText('#feedback',feedback()); setText('#completionText',completion());
  setText('#foodKcal',fmt(t.calories)); setText('#foodProtein',fmt(t.protein)); setText('#foodBalanceLabel',balance>=0?'Noch offen':'Über Ziel'); setText('#foodOpen',fmt(Math.abs(balance)));
  $$('[data-gym],[data-alcohol]').forEach(b=>b.classList.remove('on')); if(d.gym!==null)$(`[data-gym="${d.gym}"]`)?.classList.add('on'); if(d.alcohol!==null)$(`[data-alcohol="${d.alcohol}"]`)?.classList.add('on');
  renderMeals(); renderProgress(); fillSettings(); renderMeta(); saveState();
}
function renderMeals(){
  const wrap=$('#mealList'); const icons={'Frühstück':'☀️','Mittagessen':'🥗','Abendessen':'🌙','Snack':'🍎'};
  const groups=MEAL_TYPES.map(type=>({type,items:day().meals.filter(m=>m.type===type)})).filter(g=>g.items.length);
  if(!groups.length){ wrap.innerHTML='<article class="card empty">Noch keine Mahlzeiten. Tippe auf „+ Mahlzeit“.</article>'; return; }
  wrap.innerHTML=groups.map(g=>`<section class="meal-group"><div class="meal-group-title"><h3>${g.type}</h3><span>${fmt(g.items.reduce((sum,m)=>sum+m.calories,0))} kcal</span></div><article class="card">${g.items.map(m=>`<div class="meal"><div class="meal-icon">${icons[g.type]}</div><button class="meal-main meal-edit" data-edit-meal="${m.id}" type="button"><b>${escapeHtml(m.name)}</b><small>E ${fmt(m.protein)} · KH ${fmt(m.carbs)} · F ${fmt(m.fat)} g</small></button><div class="meal-kcal">${fmt(m.calories)}<small>kcal</small></div><button class="meal-delete" data-delete-meal="${m.id}" type="button" aria-label="Mahlzeit löschen">×</button></div>`).join('')}</article></section>`).join('');
  $$('[data-edit-meal]').forEach(b=>b.onclick=()=>openMeal(b.dataset.editMeal)); $$('[data-delete-meal]').forEach(b=>b.onclick=()=>deleteMeal(b.dataset.deleteMeal));
}
function weightEntries(){ return Object.entries(state.days).filter(([,v])=>v.weight!==null).sort((a,b)=>a[0].localeCompare(b[0])); }
function renderProgress(){
  const s=state.settings,days=range(selectedDate,7),logged=days.filter(x=>x.totals.calories>0),stepDays=days.filter(x=>x.data.steps>0||s.steps===0);
  setText('#rangeLabel',`${dateFromKey(days[0].key).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})} – ${dateFromKey(days.at(-1).key).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}`);
  setText('#avgCalories',logged.length?`Ø ${fmt(avg(logged.map(x=>x.totals.calories)))}`:'Ø –');
  $('#weekBars').innerHTML=days.map(x=>{ const h=x.totals.calories?clamp(x.totals.calories/Math.max(1,s.calories)*125,6,140):6; return `<div class="week-item"><i style="height:${h}px;opacity:${x.totals.calories?1:.18}"></i>${dateFromKey(x.key).toLocaleDateString('de-DE',{weekday:'short'}).slice(0,2)}</div>`; }).join('');
  const weights=weightEntries().filter(([k])=>k<=selectedDate); let trend=null;
  if(weights.length>=2){ const latest=weights.at(-1),cutoff=shiftKey(latest[0],-7),base=[...weights].reverse().find(([k])=>k<=cutoff)||weights[0]; trend=latest[1].weight-base[1].weight; }
  setText('#weightTrend',trend===null?'–':`${trend>0?'+':''}${fmt(trend,1)}`); setText('#avgProtein',logged.length?fmt(avg(logged.map(x=>x.totals.protein))):'–'); setText('#weekGym',days.filter(x=>x.data.gym===true).length); setText('#avgSteps',stepDays.length?fmt(avg(stepDays.map(x=>x.data.steps))):'–');
  $('#weightHistory').innerHTML=weights.length?weights.slice(-12).reverse().map(([k,v])=>`<div class="weight-row"><span>${dateFromKey(k).toLocaleDateString('de-DE')}</span><b>${fmt(v.weight,1)} kg</b></div>`).join(''):'<div class="empty">Noch keine Gewichtseinträge.</div>';
  if(s.goalWeight===null)setText('#goalStatus','Trage dein Wunschgewicht in den Einstellungen ein.'); else if(weights.length){ const current=weights.at(-1)[1].weight,delta=current-s.goalWeight; setText('#goalStatus',delta>0?`Noch ${fmt(delta,1)} kg bis zum Wunschgewicht.`:'Wunschgewicht erreicht oder unterschritten.'); } else setText('#goalStatus',`Wunschgewicht: ${fmt(s.goalWeight,1)} kg.`);
  let advice='Nach mindestens fünf sauber dokumentierten Tagen wird die Bewertung aussagekräftiger.';
  if(logged.length>=5&&trend!==null){ advice=trend<-1.2?'Du verlierst aktuell sehr schnell. Erhöhe die Kalorien leicht und achte auf Leistung, Schlaf und Eiweiß.':trend<-0.3?'Der Trend passt. Behalte Kalorien, Eiweiß und Training zunächst unverändert bei.':trend>0.2?'Das Gewicht steigt. Prüfe Portionsgrößen und Einträge. Hält das zwei Wochen an, reduziere um etwa 100–150 kcal.':'Der Trend ist nahezu stabil. Noch eine Woche sauber dokumentieren, bevor du etwas änderst.'; }
  setText('#weekAdvice',advice);
}
function fillSettings(){ const map={setAge:'age',setHeight:'height',setCalories:'calories',setMaintenance:'maintenance',setProtein:'protein',setFat:'fat',setCarbs:'carbs',setSteps:'steps',setGymGoal:'gymGoal',setGoalWeight:'goalWeight'}; for(const [id,k] of Object.entries(map)){ const e=$(`#${id}`); if(e&&document.activeElement!==e)e.value=state.settings[k]??''; } }
function renderMeta(){ setText('#appVersion',`Version ${APP_VERSION}`); setText('#onlineStatus',navigator.onLine?'Online':'Offline'); $('#offlineBanner')?.classList.toggle('show',!navigator.onLine); setText('#backupStatus',state.meta.lastBackupAt?`Letztes Backup: ${new Date(state.meta.lastBackupAt).toLocaleString('de-DE')}`:'Noch kein Backup erstellt.'); }