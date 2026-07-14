'use strict';
(function(){
  const VERSION='4.4.0',WATER_KEY='cutcoach_water_v1',UNDO_KEY='cutcoach_water_undo_v1',WATER_TARGET=3000;
  const baseRender=window.render;
  const waterMap=()=>{try{const v=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}};
  const waterFor=(key=selectedDate)=>clamp(Number(waterMap()[key]||0),0,6000);
  const hour=()=>{const n=new Date();return n.getHours()+n.getMinutes()/60};
  const today=()=>selectedDate===todayKey(),past=()=>selectedDate<todayKey(),final=()=>past()||(today()&&hour()>=22);
  function progress(){if(!today())return 1;const h=hour();if(h<8)return .08;if(h<11)return .18+(h-8)*.06;if(h<14)return .36+(h-11)*.09;if(h<18)return .63+(h-14)*.065;if(h<22)return .89+(h-18)*.0275;return 1}
  const paceTarget=(target,min=0)=>Math.max(min,Math.round(target*progress()));
  function activity(){const d=day(selectedDate,false),s=state.settings,delta=d.steps===null||!s.steps?0:d.steps-s.steps,step=d.steps===null?0:Math.round(clamp(delta*.035,-200,350)),gym=d.gym===true?180:0;return{maintenance:s.maintenance+step+gym,step,gym}}
  function addPart(parts,value,weight){parts.push({value:clamp(value,0,1),weight})}
  window.dailyScore=function(){
    const t=totals(),d=day(selectedDate,false),s=state.settings;if(t.calories<=0)return null;
    const parts=[],p=final()?1:progress(),calTarget=s.calories*p,proteinTarget=s.protein*p,fatMin=s.fat*.8*p,fatMax=s.fat*1.2*p;
    const calDelta=t.calories-(final()?s.calories:calTarget),calAbs=Math.abs(calDelta);
    addPart(parts,calAbs<=Math.max(120,calTarget*.12)?1:calAbs<=Math.max(250,calTarget*.22)?.78:calDelta<0?.5:.25,3);
    addPart(parts,t.protein/Math.max(20,proteinTarget),2.2);
    addPart(parts,t.fat>=fatMin&&t.fat<=fatMax?1:t.fat<=fatMax*1.25?.68:.3,1);
    if(d.steps!==null)addPart(parts,d.steps/Math.max(500,final()?s.steps:paceTarget(s.steps,500)),1.35);
    if(d.gym!==null)addPart(parts,d.gym?1:range(selectedDate,7).filter(x=>x.data.gym===true).length>=s.gymGoal?.9:.72,1.05);
    if(d.alcohol!==null)addPart(parts,d.alcohol?0:1,.75);
    addPart(parts,waterFor()/Math.max(250,final()?WATER_TARGET:paceTarget(WATER_TARGET,250)),.65);
    let score=parts.reduce((a,x)=>a+x.value*x.weight,0)/Math.max(1,parts.reduce((a,x)=>a+x.weight,0))*10;
    const status=completionStatus();if(!final()&&!status.complete)score=Math.min(score,8.4);if(final()&&!status.complete)score=Math.min(score,7.4);
    return Math.round(clamp(score,0,10)*10)/10;
  };
  window.feedback=function(){
    const t=totals(),d=day(selectedDate,false),s=state.settings,lines=[],p=final()?1:progress(),remaining=s.calories-t.calories,proteinNeed=Math.max(0,Math.round(s.protein*p-t.protein)),waterNeed=Math.max(0,(final()?WATER_TARGET:paceTarget(WATER_TARGET,250))-waterFor());
    if(!t.calories)lines.push('🎯 Erste Mahlzeit eintragen');
    else if(final()&&activity().maintenance-t.calories>1000)lines.push('🎯 Defizit nicht weiter vergrößern · eiweißreich essen');
    else if(proteinNeed>20&&remaining>120)lines.push(`🎯 Bis jetzt noch etwa ${fmt(proteinNeed)} g Eiweiß einplanen`);
    else if(t.calories>s.calories+300)lines.push('🎯 Kalorienziel überschritten · heute kalorienfrei trinken');
    else if(final()&&remaining>400)lines.push(`🎯 Noch rund ${fmt(remaining)} kcal sinnvoll verteilen`);
    else lines.push(final()?'🎯 Tageskurs halten':'🎯 Aktueller Tageskurs passt');
    if(waterNeed>250)lines.push(`💧 ${fmt(waterNeed)} ml bis zum aktuellen Trinkplan`);else if(waterFor()>=WATER_TARGET)lines.push('✅ Hydration erreicht');
    if(d.alcohol===true)lines.push('⚠️ Alkohol reduziert Regeneration');else if(d.steps!==null&&d.steps>=s.steps)lines.push('✅ Schrittziel erreicht');else if(d.alcohol===false&&lines.length<3)lines.push('✅ Regeneration: alkoholfrei');
    return lines.slice(0,3).join('\n');
  };
  function robustInputs(){
    const input=document.querySelector('#stepsInput'),save=document.querySelector('#saveSteps');if(input&&save&&!input.dataset.audit440){input.dataset.audit440='1';const sync=()=>{const raw=input.value.trim(),n=Number(raw),valid=raw===''||(Number.isFinite(n)&&n>=0&&n<=100000);input.classList.toggle('invalid',!valid);save.disabled=!valid||String(day(selectedDate,false).steps??'')===raw};input.addEventListener('input',sync);input.addEventListener('blur',()=>{if(input.value.trim()!==''){input.value=String(Math.round(clamp(Number(input.value)||0,0,100000)));sync()}});}
    const card=document.querySelector('#waterCard'),undo=document.querySelector('#waterUndo');if(card&&undo&&!card.dataset.audit440){card.dataset.audit440='1';card.querySelectorAll('[data-water-add]').forEach(btn=>btn.addEventListener('pointerdown',()=>sessionStorage.setItem(UNDO_KEY,JSON.stringify({date:selectedDate,value:waterFor()})),{capture:true}));undo.textContent='Rückgängig';undo.addEventListener('click',e=>{const raw=sessionStorage.getItem(UNDO_KEY);if(!raw)return;try{const u=JSON.parse(raw);if(u.date!==selectedDate)return;const all=waterMap();if(u.value>0)all[selectedDate]=u.value;else delete all[selectedDate];localStorage.setItem(WATER_KEY,JSON.stringify(all));sessionStorage.removeItem(UNDO_KEY);e.preventDefault();e.stopImmediatePropagation();window.render()}catch{}},{capture:true});}
  }
  function post(){
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;robustInputs();
    const score=dailyScore(),status=completionStatus(),a=activity(),t=totals();setText('#scoreCaption',score===null?'offen':final()?(status.complete?'Tagesnote':'unvollständig'):(status.complete?'Live-Score':'vorläufig'));
    setText('#energyBalanceLabel',final()?(a.maintenance-t.calories>=0?'Defizit inkl. Aktivität*':'Überschuss inkl. Aktivität*'):'Tagesstand · noch nicht final*');
    const badge=document.querySelector('.badge');if(badge&&today()&&!final()&&t.calories>0&&/Defizit|Kalorienziel/.test(badge.textContent)){badge.textContent='⏳ Tagesstand läuft';badge.dataset.tone='neutral'}
    const undo=document.querySelector('#waterUndo');if(undo){let enabled=false;try{enabled=JSON.parse(sessionStorage.getItem(UNDO_KEY)||'null')?.date===selectedDate}catch{}undo.disabled=!enabled}
    document.querySelector('.summary')?.classList.toggle('is-final',final());
  }
  window.render=function(){baseRender();post()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.render(),{once:true});else window.render();
})();