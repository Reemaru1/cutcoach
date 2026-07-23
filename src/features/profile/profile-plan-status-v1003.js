'use strict';

(function(root){
  const $=selector=>document.querySelector(selector);
  function number(value,fallback=null){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback}
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
  function completeness(profile,weight){
    const checks=[profile?.goal,profile?.age,profile?.height,weight,profile?.activityLevel,profile?.trainingDays!==undefined,profile?.pace];
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
    const confidence=completeness(profile,weightEntry?.weight??number(profile.baselineWeight));
    const manual=profile.planSource==='manual';
    const age=daysSince(weightEntry?.date);

    setStatus('#coachProfileStatus',confidence===100?'good':confidence>=70?'warn':'neutral',confidence===100?'Alle Grundlagen vollständig.':`${confidence}% deiner Planbasis vollständig.`);
    setStatus('#coachCalculationStatus',manual?'focus':'good',manual?'Manuelle Zielwerte überschreiben die Automatik.':'Ziele werden automatisch aus deinem Profil berechnet.');
    if(age===null)setStatus('#coachWeightStatus','neutral','Noch kein aktuelles Gewicht hinterlegt.');
    else if(age>10)setStatus('#coachWeightStatus','warn',`Letzte Messung vor ${age} Tagen.`);
    else setStatus('#coachWeightStatus','good',age===0?'Heute aktualisiert.':`Vor ${age} Tag${age===1?'':'en'} aktualisiert.`);

    const badge=$('#coachPlanStatusBadge');
    if(badge){badge.textContent=manual?'Manuell angepasst':confidence===100?'Planbasis vollständig':'Profil ergänzen';badge.classList.toggle('manual',manual)}
  }
  function boot(){ensureStructure();render();root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='profile')setTimeout(render,20)});document.addEventListener('click',event=>{if(event.target.closest('#editProfile,#recalculateProfile,#saveSettings,#startApp'))setTimeout(render,100)})}
  root.CutCoachProfilePlanStatus=Object.freeze({version:'10.0.3-alpha',render});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
