'use strict';
(function(){
  const STORAGE_KEY='cutcoach_v2';
  const DEFAULT_SETTINGS={calories:2300,maintenance:3000,protein:190,steps:6000,gymGoal:5,goalWeight:null};
  const $=selector=>document.querySelector(selector);
  const $$=selector=>[...document.querySelectorAll(selector)];
  const app=$('.bpv2-app');
  let period=7;
  let mode='body';

  function number(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}
  function clamp(value,min,max){return Math.max(min,Math.min(max,value))}
  function keyFromDate(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
  function dateFromKey(key){const [year,month,day]=String(key).split('-').map(Number);return new Date(year,month-1,day,12)}
  function formatInt(value){return Math.round(number(value)).toLocaleString('de-DE')}
  function formatOne(value){return number(value).toLocaleString('de-DE',{minimumFractionDigits:1,maximumFractionDigits:1})}
  function formatDate(key){return dateFromKey(key).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'})}
  function escapeText(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}

  function readState(){
    try{
      const raw=localStorage.getItem(STORAGE_KEY);
      if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object')return null;
      return {settings:{...DEFAULT_SETTINGS,...(parsed.settings||{})},days:parsed.days&&typeof parsed.days==='object'?parsed.days:{}};
    }catch(error){console.warn('Body Progress Vorschau konnte Live-Daten nicht lesen:',error);return null}
  }

  function demoState(){
    const today=new Date();
    const days={};
    const weights=[97.4,97.1,97.0,96.8,96.9,96.5,96.3,96.1];
    for(let index=0;index<14;index++){
      const date=new Date(today);date.setDate(today.getDate()-index);
      const key=keyFromDate(date);
      const calories=[2230,2360,2175,2295,2410,2210,2325][index%7];
      const protein=[186,194,171,201,181,196,188][index%7];
      days[key]={weight:index<weights.length?weights[index]:null,steps:5200+(index%5)*620,gym:[0,2,4].includes(index%7),meals:[{name:'Vorschau',calories,protein,carbs:205,fat:64}]};
    }
    return {settings:{...DEFAULT_SETTINGS,goalWeight:90},days,demo:true};
  }

  function mealTotals(day){
    const meals=Array.isArray(day?.meals)?day.meals:[];
    return meals.reduce((sum,meal)=>{sum.calories+=number(meal?.calories);sum.protein+=number(meal?.protein);return sum},{calories:0,protein:0});
  }

  function buildMetrics(){
    const state=readState()||demoState();
    const settings={...DEFAULT_SETTINGS,...state.settings};
    const now=new Date();
    const start=new Date(now);start.setDate(now.getDate()-(period-1));start.setHours(0,0,0,0);
    const periodRows=[];
    for(let index=period-1;index>=0;index--){
      const date=new Date(now);date.setDate(now.getDate()-index);
      const key=keyFromDate(date),day=state.days[key]||{};const totals=mealTotals(day);
      periodRows.push({key,day,totals});
    }
    const allWeightRows=Object.entries(state.days).filter(([key,day])=>/^\d{4}-\d{2}-\d{2}$/.test(key)&&Number.isFinite(Number(day?.weight))).sort(([a],[b])=>a.localeCompare(b)).map(([key,day])=>({key,weight:number(day.weight)}));
    const periodWeightRows=allWeightRows.filter(row=>dateFromKey(row.key)>=start&&dateFromKey(row.key)<=now);
    const latestWeight=allWeightRows.at(-1)?.weight??null;
    const firstWeight=allWeightRows[0]?.weight??null;
    const firstPeriodWeight=periodWeightRows[0]?.weight??null;
    const lastPeriodWeight=periodWeightRows.at(-1)?.weight??null;
    const daySpan=periodWeightRows.length>1?Math.max(1,(dateFromKey(periodWeightRows.at(-1).key)-dateFromKey(periodWeightRows[0].key))/86400000):0;
    const weeklyTrend=daySpan&&firstPeriodWeight!==null&&lastPeriodWeight!==null?(lastPeriodWeight-firstPeriodWeight)/daySpan*7:null;
    const mealRows=periodRows.filter(row=>row.totals.calories>0);
    const stepRows=periodRows.filter(row=>Number.isFinite(Number(row.day.steps)));
    const gymCount=periodRows.filter(row=>row.day.gym===true).length;
    const avgCalories=mealRows.length?mealRows.reduce((sum,row)=>sum+row.totals.calories,0)/mealRows.length:0;
    const avgProtein=mealRows.length?mealRows.reduce((sum,row)=>sum+row.totals.protein,0)/mealRows.length:0;
    const avgSteps=stepRows.length?stepRows.reduce((sum,row)=>sum+number(row.day.steps),0)/stepRows.length:0;
    const calorieTargetDays=mealRows.filter(row=>row.totals.calories>=settings.calories*.9&&row.totals.calories<=settings.calories*1.1).length;
    const proteinTargetDays=mealRows.filter(row=>row.totals.protein>=settings.protein*.9).length;
    const stepTargetDays=stepRows.filter(row=>number(row.day.steps)>=settings.steps).length;
    const calorieAdherence=mealRows.length?calorieTargetDays/mealRows.length*100:0;
    const proteinAdherence=mealRows.length?proteinTargetDays/mealRows.length*100:0;
    const stepAdherence=stepRows.length?stepTargetDays/stepRows.length*100:0;
    const expectedGym=Math.max(1,settings.gymGoal*period/7);
    const gymAdherence=clamp(gymCount/expectedGym*100,0,100);
    const deficit=mealRows.length?settings.maintenance-avgCalories:0;
    const documented=periodRows.filter(row=>row.totals.calories>0||Number.isFinite(Number(row.day.steps))||typeof row.day.gym==='boolean'||Number.isFinite(Number(row.day.weight))).length;
    const dataQuality=clamp(documented/period*100,0,100);
    let goalProgress=0;
    if(firstWeight!==null&&latestWeight!==null&&Number.isFinite(Number(settings.goalWeight))&&firstWeight!==number(settings.goalWeight))goalProgress=clamp((firstWeight-latestWeight)/(firstWeight-number(settings.goalWeight))*100,0,100);
    const routineScore=clamp(calorieAdherence*.28+proteinAdherence*.32+stepAdherence*.18+gymAdherence*.22,0,100);
    const recoveryScore=clamp(proteinAdherence*.55+stepAdherence*.15+gymAdherence*.3,0,100);
    return {state,settings,periodRows,allWeightRows,periodWeightRows,latestWeight,firstWeight,weeklyTrend,avgCalories,avgProtein,avgSteps,gymCount,calorieAdherence,proteinAdherence,stepAdherence,gymAdherence,deficit,dataQuality,goalProgress,routineScore,recoveryScore};
  }

  function sparkPath(values){
    const clean=values.map(value=>number(value,0));if(clean.length<2)return 'M2 34 L118 8';
    const min=Math.min(...clean),max=Math.max(...clean),range=Math.max(1,max-min);
    return clean.map((value,index)=>`${index?'L':'M'}${2+index*(116/(clean.length-1))} ${37-(value-min)/range*31}`).join(' ');
  }

  function setText(selector,value){const node=$(selector);if(node)node.textContent=value}
  function setMeter(selector,value){const node=$(selector);if(node)node.style.width=`${clamp(value,0,100)}%`}
  function setRing(value){const ring=$('#rightRing');if(ring)ring.style.setProperty('--progress',`${clamp(value,0,100)*3.6}deg`)}

  function renderBody(metrics){
    setText('#bpv2Subtitle','Dein Körper verändert sich. Daten, Analyse und Ergebnisse in einem System.');
    setText('#leftCard1Label','KÖRPERSTATUS');
    const status=metrics.dataQuality<25?'Daten aufbauen':metrics.weeklyTrend===null?'Trend startet':metrics.weeklyTrend<-1.2?'Kurs zu schnell':metrics.weeklyTrend<-.15?'Auf Kurs':metrics.weeklyTrend>.25?'Trend steigt':'Trend stabil';
    setText('#leftCard1Value',status);
    setText('#leftCard1Text',metrics.dataQuality<25?'Mehr Einträge machen deinen Trend genauer.':'Deine Werte werden als gemeinsamer Körpertrend bewertet.');
    $('#leftSpark1').setAttribute('d',sparkPath(metrics.periodRows.map(row=>row.totals.calories||metrics.settings.calories)));
    setText('#leftCard2Label','GEWICHTSTREND');setText('#leftCard2Value',metrics.latestWeight===null?'–':`${formatOne(metrics.latestWeight)} kg`);
    setText('#leftCard2Delta',metrics.weeklyTrend===null?'Noch keine Trenddaten':`${metrics.weeklyTrend>0?'+':''}${formatOne(metrics.weeklyTrend)} kg/Woche`);
    setText('#leftCard2Text',`${metrics.periodWeightRows.length} Messungen`);$('#leftSpark2').setAttribute('d',sparkPath(metrics.periodWeightRows.map(row=>row.weight)));
    setText('#leftCard3Label','KALORIENDEFIZIT');setText('#leftCard3Value',metrics.avgCalories?`${formatInt(metrics.deficit)} kcal`:'–');setText('#leftCard3Text',metrics.avgCalories?'Ø täglich aus protokollierten Tagen':'noch keine Ernährungstage');setMeter('#leftCard3Meter',metrics.avgCalories?clamp(metrics.deficit/800*100,0,100):0);
    setText('#rightCard1Label','ZIELFORTSCHRITT');setText('#rightCard1Value',`${Math.round(metrics.goalProgress)}%`);setText('#rightCard1Text','seit Beginn');setText('#rightCard1Status',metrics.goalProgress>0?'Gesamttrend Richtung Ziel':'Ziel und Gewicht aufbauen');setRing(metrics.goalProgress);
    setText('#rightCard2Label','ZIELKURS');setText('#rightCard2Value',Number.isFinite(Number(metrics.settings.goalWeight))?`${formatOne(metrics.settings.goalWeight)} kg`:'–');setText('#rightCard2Text','Zielgewicht');setMeter('#rightCard2Meter',metrics.goalProgress);setText('#rightCard2Delta',Number.isFinite(Number(metrics.settings.goalWeight))?`${Math.round(metrics.goalProgress)}% erreicht`:'Ziel noch festlegen');
    $('.bpv2-card-training-only').hidden=true;
    setText('#insightLabel','KÖRPER INSIGHT');
    const title=metrics.dataQuality<30?'Deine Datenbasis entsteht':metrics.weeklyTrend!==null&&metrics.weeklyTrend<-.15?'Dein Gesamttrend bewegt sich Richtung Ziel':metrics.weeklyTrend!==null&&metrics.weeklyTrend>.25?'Gewichtstrend aktuell beobachten':'Routine stabilisieren und weiter messen';
    setText('#insightTitle',title);setText('#insightText','CutCoach verbindet Gewicht, Ernährung, Schritte und Training. Die Körpergrafik visualisiert den Gesamttrend – nicht lokales Körperfett.');setText('#insightDelta',`${Math.round(metrics.dataQuality)}%`);setText('#insightDeltaText','Datenqualität');
  }

  function renderTraining(metrics){
    setText('#bpv2Subtitle','Trainingsrhythmus analysiert. Muskelmapping und Entwicklung in einem gemeinsamen Fortschrittsbereich.');
    setText('#leftCard1Label','TRAININGSSTATUS');setText('#leftCard1Value',metrics.gymAdherence>=80?'Rhythmus stark':metrics.gymAdherence>=45?'Rhythmus aktiv':'Rhythmus aufbauen');setText('#leftCard1Text',`${metrics.gymCount} Einheiten im gewählten Zeitraum.`);$('#leftSpark1').setAttribute('d',sparkPath(metrics.periodRows.map(row=>row.day.gym===true?1:0)));
    setText('#leftCard2Label','TRAININGSKONSTANZ');setText('#leftCard2Value',`${Math.round(metrics.gymAdherence)}%`);setText('#leftCard2Delta',`${metrics.gymCount} von ca. ${Math.round(Math.max(1,metrics.settings.gymGoal*period/7))} Einheiten`);setText('#leftCard2Text','bezogen auf dein Wochenziel');$('#leftSpark2').setAttribute('d',sparkPath(metrics.periodRows.map((row,index)=>row.day.gym===true?index+2:index*.2)));
    setText('#leftCard3Label','PROTEINBASIS');setText('#leftCard3Value',metrics.avgProtein?`${formatInt(metrics.avgProtein)} g`:'–');setText('#leftCard3Text',`Zieltreue ${Math.round(metrics.proteinAdherence)}%`);setMeter('#leftCard3Meter',metrics.proteinAdherence);
    setText('#rightCard1Label','REGENERATION');setText('#rightCard1Value',`${(metrics.recoveryScore/10).toLocaleString('de-DE',{maximumFractionDigits:1})}/10`);setText('#rightCard1Text','Schätzung aus Routinewerten');setText('#rightCard1Status',metrics.recoveryScore>=75?'Routine unterstützt Erholung':'Mehr Daten verbessern die Schätzung');setRing(metrics.recoveryScore);
    setText('#rightCard2Label','MUSKELMAPPING');setText('#rightCard2Value','Gym-Modul');setText('#rightCard2Text','detaillierte Muskelgruppen folgen');setMeter('#rightCard2Meter',metrics.gymAdherence);setText('#rightCard2Delta','Vektor-Layer vorbereitet');
    $('.bpv2-card-training-only').hidden=false;setText('#rightCard3Value',`${metrics.gymCount} Einheiten`);setText('#rightCard3Text',`Konstanz ${Math.round(metrics.gymAdherence)}%`);
    setText('#insightLabel','TRAININGS INSIGHT');setText('#insightTitle',metrics.gymCount?'Dein Trainingsrhythmus ist sichtbar':'Trainingseinheiten protokollieren');setText('#insightText','Die Vorschau zeigt bereits Muskel-Overlays. Exakte Haupt- und Sekundärmuskeln werden später aus Übungen, Sätzen und Volumen berechnet.');setText('#insightDelta',`${Math.round(metrics.gymAdherence)}%`);setText('#insightDeltaText','Trainingsziel');
  }

  function renderSummary(metrics){
    setText('#bpv2DataSource',metrics.state.demo?'Design-Demo · keine Live-Daten gefunden':'Live-Daten dieses Geräts');
    setText('#summaryCalories',metrics.avgCalories?`${formatInt(metrics.avgCalories)} kcal`:'–');setText('#summaryCaloriesSub',metrics.avgCalories?`Zieltreue ${Math.round(metrics.calorieAdherence)}%`:'keine protokollierten Tage');
    setText('#summaryProtein',metrics.avgProtein?`${formatInt(metrics.avgProtein)} g`:'–');setText('#summaryProteinSub',`Zieltreue ${Math.round(metrics.proteinAdherence)}%`);
    setText('#summarySteps',metrics.avgSteps?formatInt(metrics.avgSteps):'–');setText('#summaryStepsSub',`Zieltreue ${Math.round(metrics.stepAdherence)}%`);
    setText('#summaryGym',String(metrics.gymCount));setText('#summaryGymSub','Einheiten im Zeitraum');
    const list=$('#bpv2WeightList');
    const rows=metrics.allWeightRows.slice(-6).reverse();
    list.innerHTML=rows.length?rows.map((row,index)=>{const next=rows[index+1];const delta=next?row.weight-next.weight:null;return `<div class="bpv2-weight-row"><div><strong>${escapeText(formatDate(row.key))}</strong><span>${delta===null?'Start':`${delta>0?'+':''}${formatOne(delta)} kg`}</span></div><b>${formatOne(row.weight)} kg</b></div>`}).join(''):'<div class="bpv2-empty">Noch keine Gewichtseinträge vorhanden.</div>';
  }

  function render(){
    const metrics=buildMetrics();app.dataset.mode=mode;
    $('#bpv2BodyFigure').hidden=mode!=='body';$('#bpv2TrainingFigure').hidden=mode!=='training';
    $$('[data-mode]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.mode===mode)));
    if(mode==='body')renderBody(metrics);else renderTraining(metrics);renderSummary(metrics);
  }

  function install(){
    $('#bpv2Period').value=String(period);
    $('#bpv2Period').addEventListener('change',event=>{period=Number(event.target.value)||7;render()});
    $('.bpv2-mode-switch').addEventListener('click',event=>{const button=event.target.closest('[data-mode]');if(!button)return;mode=button.dataset.mode==='training'?'training':'body';render()});
    window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY)render()});
    render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();