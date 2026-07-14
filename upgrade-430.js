'use strict';
(function(){
  const VERSION='4.3.0';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_TARGET=3000;
  const baseRender=window.render;
  let knownToday=todayKey();
  let lastWaterAmount=null;

  const waterMap=()=>{try{const value=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}};
  const waterFor=(key=selectedDate)=>clamp(Number(waterMap()[key]||0),0,6000);
  const isPast=(key=selectedDate)=>key<todayKey();
  const isToday=(key=selectedDate)=>key===todayKey();
  const currentHour=()=>new Date().getHours()+new Date().getMinutes()/60;
  const dayPhase=()=>{const h=currentHour();return h<11?'Morgen':h<17?'Tag':h<21?'Abend':'Tagesende'};
  const paceRatio=()=>clamp((currentHour()-7)/15,.08,1);
  const waterPace=()=>Math.round(WATER_TARGET*paceRatio()/250)*250;
  const stepPace=()=>Math.round(state.settings.steps*clamp((currentHour()-7)/15,.08,1)/100)*100;
  const finalEvaluation=()=>isPast()||(isToday()&&currentHour()>=20);

  function activityModel(){
    const data=day(selectedDate,false),settings=state.settings;
    const stepDelta=data.steps===null||settings.steps===0?0:data.steps-settings.steps;
    const stepAdjustment=data.steps===null?0:Math.round(clamp(stepDelta*.035,-200,350));
    const gymAdjustment=data.gym===true?180:0;
    return {stepAdjustment,gymAdjustment,maintenance:settings.maintenance+stepAdjustment+gymAdjustment};
  }

  window.dailyScore=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings;if(t.calories<=0)return null;
    const components=[];
    const add=(score,weight)=>components.push({score:clamp(score,0,1),weight});
    const calorieDelta=t.calories-settings.calories,abs=Math.abs(calorieDelta);
    if(finalEvaluation())add(abs<=150?1:abs<=300?.83:abs<=500?.57:calorieDelta<0?.23:.12,3);
    else add(clamp(t.calories/Math.max(1,settings.calories*clamp(currentHour()/22,.18,.9)),.35,1),1.2);
    add(clamp(t.protein/Math.max(1,settings.protein),0,1),2);
    const fatMin=settings.fat*.8,fatMax=settings.fat*1.2;
    add(t.fat>=fatMin&&t.fat<=fatMax?1:t.fat<=settings.fat*1.4?.65:.25,1);
    if(data.steps!==null)add(clamp(data.steps/Math.max(1,isToday()&&!finalEvaluation()?stepPace():settings.steps),0,1),1.4);
    if(data.gym!==null)add(data.gym?1:range(selectedDate,7).filter(item=>item.data.gym===true).length>=settings.gymGoal?.9:.7,1.1);
    if(data.alcohol!==null)add(data.alcohol?0:1,.7);
    const waterTarget=isToday()&&!finalEvaluation()?Math.max(250,waterPace()):WATER_TARGET;
    add(clamp(waterFor()/waterTarget,0,1),.6);
    const totalWeight=components.reduce((sum,item)=>sum+item.weight,0);
    return Math.round(components.reduce((sum,item)=>sum+item.score*item.weight,0)/Math.max(1,totalWeight)*100)/10;
  };

  window.feedback=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings,water=waterFor(),lines=[];
    if(!t.calories)lines.push('🎯 Erste Mahlzeit eintragen');
    else {
      const proteinGap=Math.max(0,settings.protein-t.protein),remaining=settings.calories-t.calories;
      if(finalEvaluation()&&activityModel().maintenance-t.calories>1000)lines.push('🎯 Ausreichend essen und Eiweiß priorisieren');
      else if(proteinGap>25&&remaining>150)lines.push(`🎯 Noch etwa ${fmt(proteinGap)} g Eiweiß einplanen`);
      else if(t.calories>settings.calories+300)lines.push('🎯 Heute nur noch kalorienfreie Getränke');
      else if(remaining>400)lines.push(`🎯 Noch rund ${fmt(remaining)} kcal sinnvoll verteilen`);
      else lines.push('🎯 Kurs halten');
    }
    const pace=isToday()&&!finalEvaluation()?waterPace():WATER_TARGET;
    if(water<pace*.75)lines.push(`💧 ${fmt(Math.max(0,pace-water))} ml bis zum aktuellen Trinkplan`);
    else if(water>=WATER_TARGET)lines.push('✅ Hydration: Tagesziel erreicht');
    if(data.alcohol===true)lines.push('⚠️ Alkohol reduziert Regeneration');
    else if(data.alcohol===false&&lines.length<3)lines.push('✅ Regeneration: alkoholfrei');
    if(data.steps!==null&&data.steps>=settings.steps&&lines.length<3)lines.push('✅ Schrittziel erreicht');
    return lines.slice(0,3).join('\n');
  };

  function sanitizeSteps(){
    const input=document.querySelector('#stepsInput'),button=document.querySelector('#saveSteps');if(!input||!button)return;
    input.min='0';input.max='100000';input.step='100';
    if(!input.dataset.audit430){input.dataset.audit430='1';input.addEventListener('input',()=>{const n=Number(input.value);input.classList.toggle('invalid',input.value!==''&&(!Number.isFinite(n)||n<0||n>100000));button.disabled=input.classList.contains('invalid')||String(day(selectedDate,false).steps??'')===String(input.value??'');});input.addEventListener('blur',()=>{if(input.value!=='')input.value=String(Math.round(clamp(Number(input.value)||0,0,100000)));});}
  }

  function improveWaterUndo(){
    const card=document.querySelector('#waterCard'),undo=document.querySelector('#waterUndo');if(!card||!undo||card.dataset.audit430)return;card.dataset.audit430='1';
    card.querySelectorAll('[data-water-add]').forEach(button=>button.addEventListener('click',()=>{lastWaterAmount=waterFor();},{capture:true}));
    undo.textContent='Rückgängig';
    undo.addEventListener('click',event=>{if(lastWaterAmount===null)return;event.preventDefault();event.stopImmediatePropagation();const all=waterMap();if(lastWaterAmount>0)all[selectedDate]=lastWaterAmount;else delete all[selectedDate];localStorage.setItem(WATER_KEY,JSON.stringify(all));lastWaterAmount=null;window.render();},{capture:true});
  }

  function postRender(){
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
    sanitizeSteps();improveWaterUndo();
    const t=totals(),activity=activityModel(),score=dailyScore(),status=completionStatus();
    const badge=document.querySelector('.badge');
    if(badge&&t.calories>0&&!finalEvaluation()&&badge.textContent.includes('Defizit')){badge.textContent='⏳ Tagesstand läuft';badge.dataset.tone='neutral';}
    setText('#scoreCaption',score===null?'offen':status.complete?(finalEvaluation()?'Tagesnote':'Live-Score'):'vorläufig');
    setText('#energyBalanceLabel',finalEvaluation()?(activity.maintenance-t.calories>=0?'Defizit inkl. Aktivität*':'Überschuss inkl. Aktivität*'):`${dayPhase()} · Bilanz aktuell*`);
    const summary=document.querySelector('.summary');if(summary&&!finalEvaluation()){summary.classList.remove('large-deficit','surplus');}
    const waterTargetLabel=document.querySelector('#waterTargetLabel');if(waterTargetLabel&&isToday()&&!finalEvaluation())waterTargetLabel.textContent=`Jetzt ${fmt(waterPace())} ml · Ziel 3,0 l`;
  }

  function handleDayRollover(){const now=todayKey();if(now!==knownToday){if(selectedDate===knownToday)selectedDate=now;knownToday=now;window.render();}}
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)handleDayRollover();});
  window.addEventListener('focus',handleDayRollover);
  window.render=function(){baseRender();postRender();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.render(),{once:true});else window.render();
})();