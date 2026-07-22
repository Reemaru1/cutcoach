'use strict';
(function(){
  const VERSION='2.2.0-production';
  const PERIOD_KEY='cutcoach_body_progress_period_v2';
  const MODE_KEY='cutcoach_body_progress_mode_v2';
  const BODY_ASSET='./assets/body-progress-body-v3.png?v=2.2.0';
  const TRAINING_ASSET='./assets/body-progress-training-v3.png?v=2.2.0';
  const NEUTRAL_ASSET='./assets/body-progress-neutral-v3.png?v=2.2.0';
  const MUSCLES={
    shoulders:'Schultern',arms:'Arme',chest:'Brust',back:'Rücken',legs:'Beine',core:'Core',glutes:'Gesäß'
  };
  const FOOD_PROGRESS_ICON='<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 21c4.6 0 7-4.1 7-8.3C19 8.9 16.5 6 13.3 6c-.6 0-1 .1-1.3.3C11.7 6.1 11.3 6 10.7 6 7.5 6 5 8.9 5 12.7 5 16.9 7.4 21 12 21Z"/><path d="M12 6c0-2 1.2-3.3 3.4-3.8M9 4.3c1.6 0 2.7.6 3 2"/></svg></span><span class="cc-nav-label">Ernährung</span>';
  let mode=readMode(),period=readPeriod(),built=false,wasActive=false,renderQueued=false,navObserver=null,screenObserver=null;
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number(value)||0));
  const hasNumber=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));
  const fmt=(value,digits=0)=>hasNumber(value)?new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)):'–';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const signed=(value,digits=1,suffix='')=>hasNumber(value)?`${Number(value)>0?'+':''}${fmt(value,digits)}${suffix}`:'–';
  function readMode(){try{return localStorage.getItem(MODE_KEY)==='training'?'training':'body'}catch{return'body'}}
  function readPeriod(){try{const value=Number(localStorage.getItem(PERIOD_KEY));return[7,14,30].includes(value)?value:7}catch{return 7}}
  function remember(key,value){try{localStorage.setItem(key,String(value))}catch{}}
  function appState(){try{if(typeof state==='object'&&state)return state}catch{}return window.state&&typeof window.state==='object'?window.state:null}
  function selectedKey(){try{if(typeof selectedDate==='string')return selectedDate}catch{}return typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}
  function shift(key,days){return typeof window.shiftKey==='function'?window.shiftKey(key,days):new Date(new Date(`${key}T12:00:00`).setDate(new Date(`${key}T12:00:00`).getDate()+days)).toISOString().slice(0,10)}
  function dateLabel(key){return new Date(`${key}T12:00:00`).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
  function stateDays(){const current=appState();return current?.days&&typeof current.days==='object'?current.days:{}}
  function settings(){return appState()?.settings||{calories:2300,maintenance:3000,protein:190,steps:6000,gymGoal:5,goalWeight:null}}
  function totalsFor(data={}){return (Array.isArray(data.meals)?data.meals:[]).reduce((sum,meal)=>{sum.calories+=Number(meal?.calories)||0;sum.protein+=Number(meal?.protein)||0;return sum},{calories:0,protein:0})}
  function rangeRows(count=period,end=selectedKey()){
    return Array.from({length:count},(_,index)=>{const key=shift(end,index-count+1),data=stateDays()[key]||{};return{key,data,totals:totalsFor(data)}});
  }
  function datedEntries(field,end=selectedKey()){
    return Object.entries(stateDays()).filter(([key,data])=>key<=end&&hasNumber(data?.[field])).sort(([left],[right])=>left.localeCompare(right)).map(([key,data])=>({key,value:Number(data[field])}));
  }
  function regressionTrend(entries,maxDays=Math.max(14,period)){
    const cutoff=shift(selectedKey(),-maxDays+1),recent=entries.filter(item=>item.key>=cutoff).slice(-20);
    if(recent.length<2)return null;
    const origin=new Date(`${recent[0].key}T12:00:00`),points=recent.map(item=>({x:(new Date(`${item.key}T12:00:00`)-origin)/86400000,y:item.value}));
    const meanX=points.reduce((sum,item)=>sum+item.x,0)/points.length,meanY=points.reduce((sum,item)=>sum+item.y,0)/points.length;
    const denominator=points.reduce((sum,item)=>sum+(item.x-meanX)**2,0);if(!denominator)return null;
    const slope=points.reduce((sum,item)=>sum+(item.x-meanX)*(item.y-meanY),0)/denominator,span=points.at(-1).x-points[0].x;
    return{value:slope*7,basis:`${Math.max(1,Math.round(span))} Tage`,reliable:recent.length>=4&&span>=5};
  }
  function targetProgress(weights,goal){
    if(weights.length<1||!hasNumber(goal)||Number(goal)<=0)return null;
    const start=weights[0].value,current=weights.at(-1).value,target=Number(goal),distance=target-start;
    if(Math.abs(distance)<.1)return current===target?1:0;
    return clamp((current-start)/distance);
  }
  function directionToGoal(current,goal){return !hasNumber(current)||!hasNumber(goal)||Math.abs(Number(goal)-Number(current))<.1?0:Math.sign(Number(goal)-Number(current))}
  function bodySnapshot(){
    const config=settings(),rows=rangeRows(),weights=datedEntries('weight'),waists=datedEntries('waist'),bodyFat=datedEntries('bodyFat');
    const logged=rows.filter(item=>item.totals.calories>0),stepRows=rows.filter(item=>hasNumber(item.data?.steps)),trend=regressionTrend(weights);
    const currentWeight=weights.at(-1)?.value??null,goalWeight=hasNumber(config.goalWeight)&&Number(config.goalWeight)>0?Number(config.goalWeight):null,progress=targetProgress(weights,goalWeight);
    const average=list=>list.length?list.reduce((sum,item)=>sum+item,0)/list.length:null;
    const avgCalories=average(logged.map(item=>item.totals.calories)),avgProtein=average(logged.map(item=>item.totals.protein)),avgSteps=average(stepRows.map(item=>Number(item.data.steps)));
    const avgDeficit=avgCalories===null?null:Number(config.maintenance)-avgCalories;
    const calorieTolerance=Math.max(150,Number(config.calories)*.08),calorieAdherence=logged.length?logged.filter(item=>Math.abs(item.totals.calories-Number(config.calories))<=calorieTolerance).length/logged.length:null;
    const proteinAdherence=logged.length?logged.filter(item=>item.totals.protein>=Number(config.protein)*.9).length/logged.length:null;
    const stepAdherence=stepRows.length&&Number(config.steps)>0?stepRows.filter(item=>Number(item.data.steps)>=Number(config.steps)).length/stepRows.length:null;
    const documented=rows.filter(item=>item.totals.calories>0||hasNumber(item.data?.steps)||hasNumber(item.data?.weight)||hasNumber(item.data?.waist)||hasNumber(item.data?.bodyFat)||typeof item.data?.gym==='boolean').length;
    const coverage=clamp(documented/period),hasGoal=hasNumber(currentWeight)&&hasNumber(goalWeight),goalDirection=directionToGoal(currentWeight,goalWeight),towardGoal=trend&&goalDirection?Math.sign(trend.value)===goalDirection:null;
    let status='Daten aufbauen',tone='neutral',description='Regelmäßige Messungen und Einträge machen deinen Gesamttrend belastbar.';
    if(trend?.reliable){
      if(Math.abs(trend.value)>1.2){status='Kurs prüfen';tone='warning';description='Der Gewichtsverlauf ist sehr schnell. Leistung, Hunger und Erholung mitbeobachten.'}
      else if(hasGoal&&Math.abs(currentWeight-goalWeight)<=.3){status='Im Zielbereich';tone='positive';description='Dein aktuelles Gewicht liegt im eingestellten Zielbereich.'}
      else if(towardGoal){status='Auf Kurs';tone='positive';description='Dein gemessener Gewichtstrend bewegt sich kontrolliert in Richtung Ziel.'}
      else if(Math.abs(trend.value)<=.2){status='Trend stabil';description='Dein Gewicht ist aktuell weitgehend stabil. Erst bei einem längeren Plateau reagieren.'}
      else if(!hasGoal){status=trend.value<0?'Gewicht sinkt':'Gewicht steigt';description='Der gemessene Verlauf wird neutral angezeigt, solange kein Zielgewicht festgelegt ist.'}
      else{status='Trend beobachten';tone='warning';description='Der aktuelle Verlauf bewegt sich nicht in Richtung deines eingestellten Zielgewichts.'}
    }
    const waistChange=waists.length>1?(waists.at(-1).value-waists[0].value)/waists[0].value*100:null;
    const bodyFatChange=bodyFat.length>1?bodyFat.at(-1).value-bodyFat[0].value:null;
    return{config,rows,weights,waists,bodyFat,logged,stepRows,trend,currentWeight,goalWeight,progress,avgCalories,avgProtein,avgSteps,avgDeficit,calorieAdherence,proteinAdherence,stepAdherence,coverage,status,tone,description,waistChange,bodyFatChange};
  }
  function workoutVolume(workout){return (workout?.exercises||[]).reduce((sum,item)=>sum+(Number(item.weight)||0)*(Number(item.reps)||0)*(Number(item.sets)||0),0)}
  function workoutSets(workout){return (workout?.exercises||[]).reduce((sum,item)=>sum+(Number(item.sets)||0),0)}
  function workoutEntries(start,end){return Object.entries(stateDays()).filter(([key,data])=>key>=start&&key<=end&&data?.workout?.exercises?.length).sort(([left],[right])=>left.localeCompare(right)).map(([key,data])=>({key,workout:data.workout}))}
  function muscleScores(workouts){
    const scores=Object.fromEntries(Object.keys(MUSCLES).map(key=>[key,0])),sets=Object.fromEntries(Object.keys(MUSCLES).map(key=>[key,0]));
    for(const {workout} of workouts)for(const exercise of workout.exercises||[]){
      const exerciseSets=Number(exercise.sets)||0,load=(Number(exercise.weight)>0?Number(exercise.weight):20)*(Number(exercise.reps)||0)*exerciseSets;
      if(scores[exercise.muscle]!==undefined){scores[exercise.muscle]+=load;sets[exercise.muscle]+=exerciseSets}
      for(const secondary of exercise.secondary||[])if(scores[secondary]!==undefined){scores[secondary]+=load*.45;sets[secondary]+=exerciseSets*.45}
    }
    return{scores,sets};
  }
  function trainingSnapshot(){
    const end=selectedKey(),start=shift(end,-period+1),previousEnd=shift(start,-1),previousStart=shift(previousEnd,-period+1);
    const workouts=workoutEntries(start,end),previous=workoutEntries(previousStart,previousEnd),gymDays=rangeRows(period,end).filter(item=>item.data?.gym===true).length;
    const volume=workouts.reduce((sum,item)=>sum+workoutVolume(item.workout),0),previousVolume=previous.reduce((sum,item)=>sum+workoutVolume(item.workout),0),volumeDelta=previousVolume>0?(volume-previousVolume)/previousVolume*100:null;
    const {scores,sets}=muscleScores(workouts),scoreEntries=Object.entries(scores).sort((left,right)=>right[1]-left[1]),focusKey=scoreEntries[0]?.[1]>0?scoreEntries[0][0]:null,totalScore=scoreEntries.reduce((sum,item)=>sum+item[1],0),focusShare=focusKey&&totalScore?scores[focusKey]/totalScore:null;
    const focusSets=focusKey?sets[focusKey]:0,weeklyTarget=12*(period/7),stimulusRatio=weeklyTarget?focusSets/weeklyTarget:0;
    const recoveryValues=workouts.map(item=>item.workout.recovery).filter(hasNumber).map(Number),recovery=recoveryValues.length?recoveryValues.reduce((sum,value)=>sum+value,0)/recoveryValues.length:null;
    const totalSets=workouts.reduce((sum,item)=>sum+workoutSets(item.workout),0),exerciseCount=workouts.reduce((sum,item)=>sum+(item.workout.exercises?.length||0),0);
    const daily=rangeRows(period,end).map(item=>item.data?.workout?workoutVolume(item.data.workout):0);
    return{start,end,workouts,previous,gymDays,volume,previousVolume,volumeDelta,scores,sets,focusKey,focusShare,focusSets,stimulusRatio,recovery,totalSets,exerciseCount,daily};
  }
  function sparkline(values,tone='mint'){
    const nums=values.map(Number).filter(Number.isFinite);if(nums.length<2||nums.every(value=>value===nums[0]))return'<div class="bp220-spark-empty"></div>';
    const min=Math.min(...nums),max=Math.max(...nums),span=Math.max(.001,max-min),points=nums.map((value,index)=>`${(index/(nums.length-1)*100).toFixed(1)},${(36-(value-min)/span*28).toFixed(1)}`).join(' '),last=points.split(' ').at(-1).split(',');
    return`<svg class="bp220-spark bp220-spark-${tone}" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"/><circle cx="${last[0]}" cy="${last[1]}" r="2.6"/></svg>`;
  }
  function ring(value,display,label,tone='mint'){
    const percent=hasNumber(value)?Math.round(clamp(value)*100):0;
    return`<div class="bp220-ring bp220-ring-${tone}" style="--bp220-ring:${percent*3.6}deg"><div><b>${esc(display)}</b><span>${esc(label)}</span></div></div>`;
  }
  function progressBar(value,tone='mint'){return`<div class="bp220-progress"><i class="${tone}" style="width:${Math.round(clamp(value)*100)}%"></i></div>`}
  function statusIcon(type='body'){
    const paths=type==='target'?'<circle cx="12" cy="12" r="7"/><path d="M12 8v4l3 2M16 4l2-2M18 2v4h-4"/>':type==='training'?'<path d="M4 12h16M6 8v8M3 10v4M18 8v8M21 10v4"/>':'<path d="M12 3a3 3 0 1 1 0 6 3 3 0 0 1 0-6ZM8 21l1-7-3-3m10 10-1-7 3-3M9 11h6"/>';
    return`<span class="bp220-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${paths}</svg></span>`;
  }
  function miniMuscleMap(active){
    const keys=Object.keys(MUSCLES);return`<svg class="bp220-mini-map" data-active="${esc(active||'none')}" viewBox="0 0 100 210" role="img" aria-label="${active?`${esc(MUSCLES[active])} als stärkste protokollierte Muskelgruppe`:'Noch kein Muskelmapping vorhanden'}"><g class="silhouette"><circle cx="50" cy="18" r="10"/><path d="M39 29Q50 25 61 29L69 83 61 116 58 195H48L45 121 42 195H32L35 116 28 83Z"/><path d="M31 40 16 95M69 40 84 95"/></g><g class="zones">${keys.map(key=>`<g class="zone zone-${key}">${key==='shoulders'?'<circle cx="35" cy="43" r="10"/><circle cx="65" cy="43" r="10"/>':key==='arms'?'<path d="M27 45 18 91M73 45 82 91"/>':key==='chest'?'<ellipse cx="42" cy="54" rx="11" ry="9"/><ellipse cx="58" cy="54" rx="11" ry="9"/>':key==='back'?'<path d="M35 50Q50 63 65 50L62 88Q50 98 38 88Z"/>':key==='core'?'<rect x="40" y="65" width="20" height="38" rx="8"/>':key==='legs'?'<path d="M37 112 34 190M55 112 55 190"/>':'<ellipse cx="50" cy="108" rx="15" ry="10"/>'}</g>`).join('')}</g></svg>`;
  }
  function bodyCards(view){
    const weightValues=view.weights.slice(-10).map(item=>item.value),trend=view.trend?.value,trendTone=trend!==null&&trend<=0?'positive':'warning',progress=view.progress;
    const bellyValue=view.waistChange!==null?signed(view.waistChange,1,'%'):view.bodyFatChange!==null?signed(view.bodyFatChange,1,' Pkt.'):'–';
    const bellyLabel=view.waistChange!==null?'Taille':view.bodyFatChange!==null?'Körperfett':'Messung fehlt';
    const bellyProgress=view.waistChange!==null?clamp(Math.abs(view.waistChange)/15):view.bodyFatChange!==null?clamp(Math.abs(view.bodyFatChange)/10):0;
    const left=`<article><span>KÖRPERSTATUS</span>${statusIcon()}<h3 class="${view.tone}">${esc(view.status)}</h3><p>${esc(view.description)}</p>${sparkline(weightValues.length>1?weightValues:[0,.2,.3,.5],'mint')}</article><article><span>GEWICHTSTREND</span><h3>${view.currentWeight===null?'–':`${fmt(view.currentWeight,1)} <small>kg</small>`}</h3><em class="${trendTone}">${trend===null?'–':signed(trend,1,' kg/Wo')}</em><p>${esc(view.trend?.basis||'mindestens zwei Messungen')}</p>${sparkline(weightValues,'mint')}</article><article><span>KALORIENDEFIZIT</span>${statusIcon('target')}<h3>${view.avgDeficit===null?'–':`${signed(view.avgDeficit,0)} <small>kcal</small>`}</h3><p>Ø täglich aus protokollierten Tagen</p>${progressBar(view.avgDeficit===null?0:Math.abs(view.avgDeficit)/800)}</article>`;
    const right=`<article class="bp220-ring-card"><span>BAUCHBEREICH</span>${ring(bellyProgress,bellyValue,bellyLabel)}<small>seit erster Messung</small><div class="bp220-mini-status"><i></i><b>${view.waistChange!==null?(view.waistChange<0?'Taillenumfang sinkt':'Taillenumfang beobachten'):view.bodyFatChange!==null?(view.bodyFatChange<0?'Körperfettwert sinkt':'Körperfettwert beobachten'):'Taille oder Körperfett eintragen'}</b></div></article><article><span>ZIELKURS</span>${statusIcon('target')}<h3>${view.goalWeight===null?'–':`${fmt(view.goalWeight,1)} <small>kg</small>`}</h3><p>Zielgewicht</p>${progressBar(progress||0)}<em>${progress===null?'Ziel oder Startgewicht fehlt':`${Math.round(progress*100)}% erreicht`}</em></article>`;
    let insightTitle=view.status,insightText=view.description,insightValue='–',insightMeta='Datenbasis';
    if(view.waistChange!==null){insightTitle=view.waistChange<0?'Taillenumfang entwickelt sich positiv':'Taillenumfang aktuell beobachten';insightText=`Gemessene Veränderung von ${fmt(Math.abs(view.waistChange),1)}% seit der ersten dokumentierten Taillenmessung.`;insightValue=signed(view.waistChange,1,'%');insightMeta='gemessene Taille'}
    else if(view.trend){insightTitle=view.status;insightText=view.description;insightValue=signed(view.trend.value,1,' kg');insightMeta='pro Woche'}
    return{left,right,subtitle:'Dein Körper verändert sich. Daten. Analyse. Ergebnisse.',insightTitle,insightText,insightValue,insightMeta,figure:BODY_ASSET,focus:null};
  }
  function trainingCards(view){
    const exact=view.workouts.length>0,focusLabel=view.focusKey?MUSCLES[view.focusKey]:'Training erfassen',focusDisplay=view.focusKey?`${focusLabel}${view.focusKey==='shoulders'&&view.scores.arms>0?' & Arme':''}`:focusLabel,share=view.focusShare;
    const stimulus=view.stimulusRatio===0?'–':view.stimulusRatio<.6?'Aufbauen':view.stimulusRatio<=1.25?'Optimal':'Hoch';
    const recoveryDisplay=view.recovery===null?'–':`${fmt(view.recovery,1)} /10`,deltaDisplay=view.volumeDelta===null?'–':signed(view.volumeDelta,0,'%');
    const left=`<article class="bp220-focus-card"><span>TRAININGSFOKUS</span>${statusIcon('training')}<h3 class="orange">${esc(focusDisplay)}</h3><p>${exact?`${view.exerciseCount} Übungen · ${view.totalSets} Arbeitssätze`:`${view.gymDays} Gymtage, aber noch keine Übungen protokolliert.`}</p>${ring(share,share===null?'–':`${Math.round(share*100)}%`,'Fokusanteil','orange')}</article><article><span>MUSKELREIZ</span><span class="bp220-wave">≈</span><h3 class="orange">${stimulus}</h3><p>${exact?'Bewertung aus den protokollierten Arbeitssätzen der Fokusgruppe.':'Übungen und Sätze eintragen, damit die Belastung berechnet werden kann.'}</p>${sparkline(view.daily.map(value=>value||0),'orange')}</article><article><span>VOLUMEN</span>${statusIcon('training')}<h3>${view.volume>0?`${fmt(view.volume/1000,1)} <small>t</small>`:'–'}</h3><em class="orange">${deltaDisplay}</em><p>${view.previousVolume>0?'gegenüber vorherigem Zeitraum':'Vergleich nach zwei Zeiträumen'}</p>${sparkline(view.daily,'orange')}</article>`;
    const right=`<article class="bp220-muscle-card"><span>BELASTETE MUSKELN</span>${miniMuscleMap(view.focusKey)}<p><i class="primary"></i> stärkste protokollierte Gruppe</p><p><i class="secondary"></i> weitere Belastung</p></article><article><span>REGENERATION</span><div class="bp220-heart">♡ <b>${recoveryDisplay}</b></div><h3 class="orange">${view.recovery===null?'Noch offen':view.recovery>=8?'Sehr gut':view.recovery>=6?'Solide':'Erholung beachten'}</h3><p>${view.recovery===null?'Nach dem Training optional selbst bewerten.':'Durchschnitt deiner eigenen Regenerationsbewertungen.'}</p>${ring(view.recovery===null?null:view.recovery/10,view.recovery===null?'–':`${Math.round(view.recovery*10)}%`,'erholt','orange')}</article><article><span>FORTSCHRITT</span><span class="bp220-trend-icon">↗</span><h3 class="orange">${deltaDisplay}</h3><p>${view.volumeDelta===null?'Volumenvergleich noch nicht verfügbar':'Trainingsvolumen zum vorherigen Zeitraum'}</p>${sparkline(view.daily,'orange')}</article>`;
    const figure=(view.focusKey==='shoulders'||view.focusKey==='arms')?TRAINING_ASSET:NEUTRAL_ASSET;
    const insightTitle=exact?`${focusLabel} bilden aktuell deinen stärksten Trainingsfokus`:'Detaillierte Trainingsdaten aufbauen';
    const insightText=exact?`Die Auswertung basiert auf ${view.totalSets} protokollierten Arbeitssätzen und ${view.exerciseCount} Übungen.`:'Öffne „Training eintragen“ und dokumentiere Übungen, Sätze, Wiederholungen und Gewicht.';
    return{left,right,subtitle:'Trainingsreiz analysiert. Muskeln im Fokus & in Entwicklung.',insightTitle,insightText,insightValue:deltaDisplay,insightMeta:view.volumeDelta===null?'noch kein Vergleich':'Volumenvergleich',figure,focus:view.focusKey};
  }
  function history(view){
    if(mode==='training'){
      const items=view.workouts.slice().reverse();if(!items.length)return'<div class="bp220-empty">Noch keine detaillierte Trainingseinheit erfasst.</div>';
      return items.map(item=>`<button type="button" data-bp220-workout-date="${item.key}"><span><b>${dateLabel(item.key)}</b><small>${item.workout.exercises.length} Übungen · ${workoutSets(item.workout)} Sätze</small></span><strong>${workoutVolume(item.workout)>0?`${fmt(workoutVolume(item.workout)/1000,1)} t`:'Körpergewicht'}</strong></button>`).join('');
    }
    const keys=[...new Set([...view.weights.map(item=>item.key),...view.waists.map(item=>item.key),...view.bodyFat.map(item=>item.key)])].sort().slice(-8).reverse();
    if(!keys.length)return'<div class="bp220-empty">Noch keine Körpermessung erfasst.</div>';
    return keys.map(key=>{const data=stateDays()[key]||{};return`<button type="button" data-bp220-measurement-date="${key}"><span><b>${dateLabel(key)}</b><small>${hasNumber(data.waist)?`Taille ${fmt(data.waist,1)} cm`:hasNumber(data.bodyFat)?`Körperfett ${fmt(data.bodyFat,1)}%`:'Gewicht'}</small></span><strong>${hasNumber(data.weight)?`${fmt(data.weight,1)} kg`:'–'}</strong></button>`}).join('');
  }
  function topbar(){return`<header class="bp220-topbar"><button type="button" class="bp220-top-icon" data-bp220-menu aria-label="Schnellaktionen öffnen"><span></span><span></span><span></span></button><div class="bp220-logo"><b>Cut</b><strong>Coach</strong></div><button type="button" class="bp220-bell" data-bp220-insight aria-label="Aktuellen Hinweis anzeigen"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><i></i></button></header>`}
  function template(){return`<div class="bp220-shell" data-mode="${mode}">${topbar()}<div class="bp220-quick-menu" hidden><button type="button" data-bp220-action="measurement">Körpermessung</button><button type="button" data-bp220-action="workout">Training eintragen</button><button type="button" data-bp220-settings>Einstellungen</button></div><section class="bp220-heading"><div><h1>BODY<br><span>PROGRESS</span></h1><p id="bp220Subtitle"></p></div><div class="bp220-heading-actions"><label class="bp220-period"><span class="sr-only">Zeitraum</span><select id="bp220Period"><option value="7">Diese Woche</option><option value="14">14 Tage</option><option value="30">30 Tage</option></select></label><button type="button" class="bp220-add" data-bp220-primary-action></button></div></section><div class="bp220-mode-switch" role="tablist" aria-label="Fortschrittsansicht"><button type="button" role="tab" data-bp220-mode="body">Körper</button><button type="button" role="tab" data-bp220-mode="training">Training</button></div><section class="bp220-hero"><aside class="bp220-column bp220-left" id="bp220Left"></aside><div class="bp220-figure"><div class="bp220-figure-glow"></div><img id="bp220Figure" src="${BODY_ASSET}" alt="Anatomische CutCoach Körperdarstellung"><svg class="bp220-central-zones" id="bp220CentralZones" data-active="none" viewBox="0 0 100 220" aria-hidden="true"><g class="zone zone-shoulders"><circle cx="34" cy="46" r="11"/><circle cx="66" cy="46" r="11"/></g><g class="zone zone-arms"><path d="M25 48 16 95M75 48 84 95"/></g><g class="zone zone-chest"><ellipse cx="42" cy="60" rx="12" ry="10"/><ellipse cx="58" cy="60" rx="12" ry="10"/></g><g class="zone zone-back"><path d="M35 55Q50 72 65 55L62 96Q50 106 38 96Z"/></g><g class="zone zone-core"><rect x="39" y="72" width="22" height="40" rx="9"/></g><g class="zone zone-legs"><path d="M37 120 33 190M57 120 58 190"/></g><g class="zone zone-glutes"><ellipse cx="50" cy="116" rx="17" ry="11"/></g></svg><div class="bp220-floor"></div></div><aside class="bp220-column bp220-right" id="bp220Right"></aside></section><section class="bp220-insight" id="bp220Insight"></section><section class="bp220-history-section"><div class="bp220-history-head"><div><small id="bp220HistoryEyebrow">VERLAUF</small><h2 id="bp220HistoryTitle">Messungen</h2></div><button type="button" data-bp220-primary-action></button></div><div class="bp220-history" id="bp220History"></div></section><p class="bp220-method">Körper- und Trainingsdarstellungen visualisieren ausschließlich deine protokollierten Daten. Regionale Fettabnahme, Muskelwachstum und Regeneration werden ohne passende Messwerte nicht behauptet.</p></div>`}
  function injectModals(){
    if(q('#bp220MeasurementModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal bp220-modal" id="bp220MeasurementModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="bp220MeasurementTitle"><div class="sheet"><div class="sheet-head"><h2 id="bp220MeasurementTitle">Körpermessung</h2><button type="button" data-bp220-close aria-label="Schließen">×</button></div><label>Datum<input id="bp220MeasurementDate" type="date"></label><div class="two"><label>Gewicht (kg)<input id="bp220MeasurementWeight" type="number" inputmode="decimal" min="30" max="300" step="0.1" placeholder="optional"></label><label>Taille (cm)<input id="bp220MeasurementWaist" type="number" inputmode="decimal" min="40" max="250" step="0.1" placeholder="optional"></label></div><label>Körperfett (%)<input id="bp220MeasurementBodyFat" type="number" inputmode="decimal" min="2" max="70" step="0.1" placeholder="optional"></label><p class="bp220-form-hint">Taille immer an derselben Stelle und unter ähnlichen Bedingungen messen.</p><div class="button-row"><button type="button" id="bp220SaveMeasurement">Messung speichern</button><button type="button" id="bp220ClearMeasurement" class="secondary danger-secondary">Messung entfernen</button></div></div></div><div class="modal bp220-modal" id="bp220WorkoutModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="bp220WorkoutTitle"><div class="sheet bp220-workout-sheet"><div class="sheet-head"><h2 id="bp220WorkoutTitle">Training eintragen</h2><button type="button" data-bp220-close aria-label="Schließen">×</button></div><div class="two"><label>Datum<input id="bp220WorkoutDate" type="date"></label><label>Dauer (Min.)<input id="bp220WorkoutDuration" type="number" inputmode="numeric" min="5" max="360" step="1" placeholder="optional"></label></div><div class="two"><label>Regeneration (1–10)<input id="bp220WorkoutRecovery" type="number" inputmode="decimal" min="1" max="10" step="0.5" placeholder="optional"></label><label>Notiz<input id="bp220WorkoutNotes" maxlength="300" placeholder="optional"></label></div><div class="bp220-exercise-head"><h3>Übungen</h3><button type="button" class="secondary compact" id="bp220AddExercise">+ Übung</button></div><div id="bp220ExerciseRows"></div><div class="button-row"><button type="button" id="bp220SaveWorkout">Training speichern</button><button type="button" id="bp220ClearWorkout" class="secondary danger-secondary">Training entfernen</button></div></div></div>`);
  }
  function exerciseRow(item={}){
    const options=Object.entries(MUSCLES).map(([key,label])=>`<option value="${key}" ${item.muscle===key?'selected':''}>${label}</option>`).join('');
    const secondary=Object.entries(MUSCLES).map(([key,label])=>`<option value="${key}" ${(item.secondary||[]).includes(key)?'selected':''}>${label}</option>`).join('');
    return`<div class="bp220-exercise-row" data-exercise-id="${esc(item.id||'')}"><div class="bp220-exercise-title"><label>Übung<input data-field="name" maxlength="80" value="${esc(item.name||'')}" placeholder="z. B. Schulterdrücken"></label><button type="button" data-bp220-remove-exercise aria-label="Übung entfernen">×</button></div><div class="two"><label>Primäre Muskelgruppe<select data-field="muscle"><option value="">Auswählen</option>${options}</select></label><label>Sekundär<select data-field="secondary"><option value="">Keine</option>${secondary}</select></label></div><div class="bp220-set-grid"><label>Sätze<input data-field="sets" type="number" inputmode="numeric" min="1" max="20" value="${item.sets??3}"></label><label>Wdh.<input data-field="reps" type="number" inputmode="numeric" min="1" max="100" value="${item.reps??8}"></label><label>Gewicht kg<input data-field="weight" type="number" inputmode="decimal" min="0" max="1000" step="0.5" value="${item.weight??0}"></label><label>RPE<input data-field="rpe" type="number" inputmode="decimal" min="1" max="10" step="0.5" value="${item.rpe??''}" placeholder="opt."></label></div></div>`;
  }
  function addExercise(item={}){q('#bp220ExerciseRows')?.insertAdjacentHTML('beforeend',exerciseRow(item))}
  function setMode(next){mode=next==='training'?'training':'body';remember(MODE_KEY,mode);render();configureNav()}
  function actionForMode(){return mode==='training'?'workout':'measurement'}
  function render(){
    const screen=q('[data-screen="progress"]');if(!screen)return null;
    if(!built){screen.dataset.bodyProgressV220='1';screen.innerHTML=template();bind(screen);built=true}
    const view=mode==='training'?trainingSnapshot():bodySnapshot(),cards=mode==='training'?trainingCards(view):bodyCards(view),shell=q('.bp220-shell',screen);
    shell.dataset.mode=mode;q('#bp220Subtitle',screen).textContent=cards.subtitle;q('#bp220Period',screen).value=String(period);
    q('#bp220Left',screen).innerHTML=cards.left;q('#bp220Right',screen).innerHTML=cards.right;
    q('#bp220Insight',screen).innerHTML=`<div class="bp220-insight-icon">✦</div><div><span>KÖRPER INSIGHT</span><h3>${esc(cards.insightTitle)}</h3><p>${esc(cards.insightText)}</p></div><div class="bp220-insight-stat"><b>${esc(cards.insightValue)}</b><small>${esc(cards.insightMeta)}</small></div>`;
    q('#bp220Figure',screen).src=cards.figure;q('#bp220Figure',screen).alt=mode==='training'?'Anatomische Trainingsdarstellung mit datenabhängigem Muskelfokus':'Anatomische Körperdarstellung mit Fokus auf Taille und Gesamtfortschritt';
    q('#bp220CentralZones',screen).dataset.active=cards.focus||'none';q('#bp220History',screen).innerHTML=history(view);q('#bp220HistoryTitle',screen).textContent=mode==='training'?'Trainingseinheiten':'Messungen';
    qa('[data-bp220-mode]',screen).forEach(button=>{const active=button.dataset.bp220Mode===mode;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});
    qa('[data-bp220-primary-action]',screen).forEach(button=>{button.dataset.bp220Action=actionForMode();button.textContent=mode==='training'?'+ Training':'+ Messung'});
    configureNav();return view;
  }
  function openMeasurement(key=selectedKey()){
    const data=stateDays()[key]||{};q('#bp220MeasurementDate').value=key;q('#bp220MeasurementDate').max=typeof todayKey==='function'?todayKey():key;q('#bp220MeasurementWeight').value=data.weight??'';q('#bp220MeasurementWaist').value=data.waist??'';q('#bp220MeasurementBodyFat').value=data.bodyFat??'';q('#bp220ClearMeasurement').hidden=!hasNumber(data.weight)&&!hasNumber(data.waist)&&!hasNumber(data.bodyFat);openModal?.('bp220MeasurementModal');
  }
  function saveMeasurement(){
    const key=q('#bp220MeasurementDate').value,weight=nullable(q('#bp220MeasurementWeight').value,30,300),waist=nullable(q('#bp220MeasurementWaist').value,40,250),bodyFat=nullable(q('#bp220MeasurementBodyFat').value,2,70);
    if(!validDateKey?.(key)||key>todayKey()){toast?.('Bitte ein gültiges Datum auswählen.');return}
    if(weight===null&&waist===null&&bodyFat===null){toast?.('Bitte mindestens einen Messwert eintragen.');return}
    if(!commitDayMutation(data=>{data.weight=weight;data.waist=waist;data.bodyFat=bodyFat},key)){toast?.('Messung konnte nicht gespeichert werden.');return}
    closeModal?.(q('#bp220MeasurementModal'));window.render?.();toast?.('Körpermessung gespeichert.');
  }
  function clearMeasurement(){
    const key=q('#bp220MeasurementDate').value;if(!validDateKey?.(key))return;
    if(!commitDayMutation(data=>{data.weight=null;data.waist=null;data.bodyFat=null},key)){toast?.('Messung konnte nicht entfernt werden.');return}
    closeModal?.(q('#bp220MeasurementModal'));window.render?.();toast?.('Körpermessung entfernt.');
  }
  function openWorkout(key=selectedKey()){
    const workout=stateDays()[key]?.workout||null;q('#bp220WorkoutDate').value=key;q('#bp220WorkoutDate').max=typeof todayKey==='function'?todayKey():key;q('#bp220WorkoutDuration').value=workout?.duration??'';q('#bp220WorkoutRecovery').value=workout?.recovery??'';q('#bp220WorkoutNotes').value=workout?.notes??'';q('#bp220ExerciseRows').innerHTML='';
    if(workout?.exercises?.length)workout.exercises.forEach(addExercise);else addExercise();q('#bp220ClearWorkout').hidden=!workout;openModal?.('bp220WorkoutModal');
  }
  function collectWorkout(){
    const exercises=qa('.bp220-exercise-row',q('#bp220ExerciseRows')).map(row=>{const name=q('[data-field="name"]',row).value.trim(),muscle=q('[data-field="muscle"]',row).value,secondary=q('[data-field="secondary"]',row).value;return{id:row.dataset.exerciseId||undefined,name,muscle,secondary:secondary?[secondary]:[],sets:q('[data-field="sets"]',row).value,reps:q('[data-field="reps"]',row).value,weight:q('[data-field="weight"]',row).value,rpe:q('[data-field="rpe"]',row).value}}).filter(item=>item.name||item.muscle);
    return sanitizeWorkout?.({duration:q('#bp220WorkoutDuration').value,recovery:q('#bp220WorkoutRecovery').value,notes:q('#bp220WorkoutNotes').value,exercises})||null;
  }
  function saveWorkout(){
    const key=q('#bp220WorkoutDate').value,workout=collectWorkout();if(!validDateKey?.(key)||key>todayKey()){toast?.('Bitte ein gültiges Datum auswählen.');return}if(!workout){toast?.('Bitte mindestens eine Übung mit Muskelgruppe eintragen.');return}
    if(!commitDayMutation(data=>{data.workout=workout;data.gym=true},key)){toast?.('Training konnte nicht gespeichert werden.');return}
    closeModal?.(q('#bp220WorkoutModal'));window.render?.();toast?.('Training gespeichert.');
  }
  function clearWorkout(){
    const key=q('#bp220WorkoutDate').value;if(!validDateKey?.(key))return;if(!commitDayMutation(data=>{data.workout=null;data.gym=null},key)){toast?.('Training konnte nicht entfernt werden.');return}
    closeModal?.(q('#bp220WorkoutModal'));window.render?.();toast?.('Training entfernt.');
  }
  function bind(screen){
    screen.addEventListener('change',event=>{if(event.target.id==='bp220Period'){period=[7,14,30].includes(Number(event.target.value))?Number(event.target.value):7;remember(PERIOD_KEY,period);render()}});
    screen.addEventListener('click',event=>{
      const modeButton=event.target.closest('[data-bp220-mode]');if(modeButton){setMode(modeButton.dataset.bp220Mode);return}
      const action=event.target.closest('[data-bp220-action]')?.dataset.bp220Action;if(action==='measurement'){openMeasurement();return}if(action==='workout'){openWorkout();return}
      const measurement=event.target.closest('[data-bp220-measurement-date]');if(measurement){openMeasurement(measurement.dataset.bp220MeasurementDate);return}
      const workout=event.target.closest('[data-bp220-workout-date]');if(workout){openWorkout(workout.dataset.bp220WorkoutDate);return}
      if(event.target.closest('[data-bp220-menu]')){const menu=q('.bp220-quick-menu',screen);menu.hidden=!menu.hidden;return}
      if(event.target.closest('[data-bp220-settings]')){location.hash='#settings';window.dispatchEvent(new Event('hashchange'));return}
      if(event.target.closest('[data-bp220-insight]')){const view=render();toast?.(mode==='training'?(view.workouts.length?`${MUSCLES[view.focusKey]}: ${view.totalSets} protokollierte Sätze.`:'Noch keine detaillierte Trainingseinheit vorhanden.'):(view.description||'Noch keine Fortschrittsdaten vorhanden.'))}
    });
  }
  function bindModals(){
    qa('[data-bp220-close]').forEach(button=>button.addEventListener('click',()=>closeModal?.(button.closest('.modal'))));qa('.bp220-modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal)closeModal?.(modal)}));
    q('#bp220SaveMeasurement').addEventListener('click',saveMeasurement);q('#bp220ClearMeasurement').addEventListener('click',clearMeasurement);q('#bp220AddExercise').addEventListener('click',()=>addExercise());q('#bp220SaveWorkout').addEventListener('click',saveWorkout);q('#bp220ClearWorkout').addEventListener('click',clearWorkout);
    q('#bp220ExerciseRows').addEventListener('click',event=>{const button=event.target.closest('[data-bp220-remove-exercise]');if(!button)return;const rows=qa('.bp220-exercise-row',q('#bp220ExerciseRows'));if(rows.length===1){rows[0].querySelectorAll('input').forEach(input=>input.value='');rows[0].querySelectorAll('select').forEach(select=>select.value='');return}button.closest('.bp220-exercise-row')?.remove()});
  }
  function configureNav(){
    const nav=q('nav[aria-label="Hauptnavigation"]'),screen=q('[data-screen="progress"]');if(!nav||!screen?.classList.contains('active'))return;
    const today=q('[data-tab="today"]',nav),food=q('[data-tab="food"]',nav),progress=q('[data-tab="progress"]',nav),settingsButton=q('[data-tab="settings"]',nav);if(!today||!food||!progress||!settingsButton)return;let training=q('[data-bp220-training-nav]',nav);
    if(!training){training=document.createElement('button');training.type='button';training.dataset.bp220TrainingNav='1';training.setAttribute('aria-label','Trainingsfortschritt öffnen');training.innerHTML='<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/></svg></span><span class="cc-nav-label">Training</span>';training.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();setMode('training');window.scrollTo({top:0,behavior:'smooth'})})}
    if(food.dataset.glassNavKey!=='food-progress'){food.innerHTML=FOOD_PROGRESS_ICON;food.dataset.glassNavKey='food-progress'}
    const desired=[today,food,progress,training,settingsButton],current=[...nav.children].filter(node=>node.matches?.('button'));if(desired.some((node,index)=>current[index]!==node))nav.append(...desired);
    nav.classList.add('bp220-five-nav');
    const bodyActive=mode==='body';progress.classList.toggle('active',bodyActive);progress.setAttribute('aria-current',bodyActive?'page':'false');training.classList.toggle('active',!bodyActive);training.setAttribute('aria-current',!bodyActive?'page':'false');
    if(progress.dataset.bp220Bound!=='1'){progress.dataset.bp220Bound='1';progress.addEventListener('click',()=>setMode('body'),true)}
  }
  function restoreNav(){const nav=q('nav[aria-label="Hauptnavigation"]');if(!nav)return;q('[data-bp220-training-nav]',nav)?.remove();nav.classList.remove('bp220-five-nav');const food=q('[data-tab="food"]',nav);if(food?.dataset.glassNavKey==='food-progress')food.dataset.glassNavKey='';window.CutCoachGlassNavV131?.enhance?.()}
  function syncActive(){
    const active=Boolean(q('[data-screen="progress"]')?.classList.contains('active'));document.body.classList.toggle('body-progress-v220-active',active);
    if(active){render();if(!wasActive)queueMicrotask(()=>window.scrollTo({top:0,left:0,behavior:'auto'}))}else restoreNav();wasActive=active;
  }
  function scheduleSync(){if(renderQueued)return;renderQueued=true;queueMicrotask(()=>{renderQueued=false;syncActive()})}
  function install(){
    injectModals();bindModals();render();window.renderProgress=render;
    const screen=q('[data-screen="progress"]');if(screen&&!screenObserver){screenObserver=new MutationObserver(scheduleSync);screenObserver.observe(screen,{attributes:true,attributeFilter:['class']})}
    const nav=q('nav[aria-label="Hauptnavigation"]');if(nav&&!navObserver){navObserver=new MutationObserver(()=>{if(document.body.classList.contains('body-progress-v220-active'))scheduleSync()});navObserver.observe(nav,{childList:true})}
    window.addEventListener('hashchange',scheduleSync);window.addEventListener('pageshow',scheduleSync);window.addEventListener('resize',()=>{if(wasActive)configureNav()},{passive:true});syncActive();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else queueMicrotask(install);
  window.CutCoachBodyProgress220=Object.freeze({version:VERSION,refresh:render,setMode,snapshot(){return mode==='training'?trainingSnapshot():bodySnapshot()},openMeasurement,openWorkout});
})();
