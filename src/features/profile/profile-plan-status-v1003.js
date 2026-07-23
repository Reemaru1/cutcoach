'use strict';

(function(root){
  const VERSION='10.0.4-alpha';
  const $=selector=>document.querySelector(selector);
  function number(value,fallback=null){
    if(value===null||value===undefined||value==='')return fallback;
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function positive(value,fallback=null){const parsed=number(value);return parsed!==null&&parsed>0?parsed:fallback}
  function today(){return typeof root.todayKey==='function'?root.todayKey():new Date().toISOString().slice(0,10)}
  function latestWeightEntry(current){
    const entries=Object.entries(current?.days||{})
      .map(([date,entry])=>({date,weight:positive(entry?.weight)}))
      .filter(entry=>entry.weight!==null)
      .sort((a,b)=>b.date.localeCompare(a.date));
    if(entries.length)return entries[0];
    const baseline=positive(current?.profile?.baselineWeight);
    return baseline===null?null:{date:current?.profile?.completedAt?.slice(0,10)||null,weight:baseline};
  }
  function daysSince(dateKey){
    if(!dateKey)return null;
    const start=new Date(`${dateKey}T12:00:00`),end=new Date(`${today()}T12:00:00`);
    if(Number.isNaN(start.getTime()))return null;
    return Math.max(0,Math.round((end-start)/86400000));
  }
  function completeness(profile,weight){
    const checks=[
      Boolean(profile?.goal),positive(profile?.age)!==null,positive(profile?.height)!==null,
      positive(weight)!==null,Boolean(profile?.activityLevel),number(profile?.trainingDays)!==null,Boolean(profile?.pace)
    ];
    return Math.round(checks.filter(Boolean).length/checks.length*100);
  }
  function ensureStructure(){
    const hub=$('.profile-coach-hub');
    if(!hub)return null;
    const old=$('.coach-insights');
    let status=$('.coach-plan-status');
    if(!status){
      status=document.createElement('section');
      status.className='coach-plan-status';
      status.setAttribute('aria-labelledby','coachPlanStatusTitle');
      status.innerHTML=`
        <div class="coach-section-title">
          <div><small>Planbasis</small><h3 id="coachPlanStatusTitle">Planstatus</h3></div>
          <span id="coachPlanStatusBadge">Aktuell</span>
        </div>
        <div class="coach-status-list">
          <article id="coachProfileStatus"><i></i><div><strong>Profilbasis</strong><span>–</span></div></article>
          <article id="coachCalculationStatus"><i></i><div><strong>Zielberechnung</strong><span>–</span></div></article>
          <article id="coachWeightStatus"><i></i><div><strong>Gewichtsdaten</strong><span>–</span></div></article>
        </div>`;
      if(old)old.replaceWith(status);else hub.querySelector('.coach-route')?.after(status);
    }else old?.remove();
    return status;
  }
  function setStatus(selector,tone,text){
    const article=$(selector);if(!article)return;
    article.dataset.tone=tone;
    const span=article.querySelector('span');if(span)span.textContent=text;
  }
  function render(){
    const status=ensureStructure(),current=root.state;
    if(!status||!current)return;
    const profile=current.profile||{},weightEntry=latestWeightEntry(current);
    const confidence=completeness(profile,weightEntry?.weight??positive(profile.baselineWeight));
    const manual=profile.planSource==='manual',age=daysSince(weightEntry?.date);

    setStatus('#coachProfileStatus',confidence===100?'good':confidence>=70?'warn':'neutral',confidence===100?'Alle Grundlagen vollständig.':`${confidence}% deiner Planbasis vollständig.`);
    setStatus('#coachCalculationStatus',manual?'focus':'good',manual?'Manuelle Zielwerte überschreiben die Automatik.':'Ziele werden automatisch aus deinem Profil berechnet.');
    if(!weightEntry)setStatus('#coachWeightStatus','neutral','Noch kein gültiges Gewicht hinterlegt.');
    else if(age===null)setStatus('#coachWeightStatus','good',`Gültige Planbasis: ${weightEntry.weight.toLocaleString('de-DE',{maximumFractionDigits:1})} kg.`);
    else if(age>10)setStatus('#coachWeightStatus','warn',`Letzte Messung vor ${age} Tagen.`);
    else setStatus('#coachWeightStatus','good',age===0?'Heute aktualisiert.':`Vor ${age} Tag${age===1?'':'en'} aktualisiert.`);

    const badge=$('#coachPlanStatusBadge');
    if(badge){badge.textContent=manual?'Manuell angepasst':confidence===100?'Planbasis vollständig':'Profil ergänzen';badge.classList.toggle('manual',manual)}
  }
  function boot(){ensureStructure();render();root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='profile')setTimeout(render,20)});document.addEventListener('click',event=>{if(event.target.closest('#editProfile,#recalculateProfile,#saveSettings,#startApp'))setTimeout(render,100)})}
  root.CutCoachProfilePlanStatus=Object.freeze({version:VERSION,render,latestWeightEntry});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
