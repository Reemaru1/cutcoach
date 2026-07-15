'use strict';
(function(){
 const VERSION='5.6.3',WATER_KEY='cutcoach_water_v1';
 const waterFor=key=>{try{return Number(JSON.parse(localStorage.getItem(WATER_KEY)||'{}')[key])||0}catch{return 0}};
 function hasDiaryEntry(key){const d=day(key,false);return !!(d.meals?.length||d.steps!==null||d.weight!==null||d.gym!==null||d.alcohol!==null||waterFor(key)>0)}
 function streak(){let count=0,cursor=dateFromKey(todayKey());for(let i=0;i<366;i++){const key=keyFromDate(cursor);if(!hasDiaryEntry(key))break;count++;cursor.setDate(cursor.getDate()-1)}return count}
 function enhance(){
  const root=document.querySelector('#today560');if(!root)return;
  const top=root.querySelector('.journal-topbar');
  if(top&&!root.querySelector('.journal-day-controls')){
   const controls=document.createElement('div');controls.className='journal-day-controls';controls.innerHTML='<button id="journalPrevDay" type="button" aria-label="Vorheriger Tag">‹</button><button id="journalNextDay" type="button" aria-label="Nächster Tag">›</button>';
   top.insertBefore(controls,root.querySelector('.journal-mini-stats'));
   controls.querySelector('#journalPrevDay').onclick=()=>document.querySelector('#previousDay')?.click();
   controls.querySelector('#journalNextDay').onclick=()=>document.querySelector('#nextDay')?.click();
  }
  const dateButton=root.querySelector('#journalDateButton');if(dateButton){dateButton.title='Datum auswählen';dateButton.querySelector('i')?.remove()}
  const calendar=root.querySelector('#journalCalendarButton');if(calendar){calendar.textContent='📅';calendar.title='Datum im Kalender auswählen'}
  const flame=root.querySelector('.journal-mini-stats span:last-child');if(flame){flame.title='Tagebuch-Streak: aufeinanderfolgende Tage mit mindestens einem Eintrag'}
  root.querySelector('#journalSteps')?.classList.add('journal-step-value');
  root.querySelector('#journalCheckStatus')?.classList.add('journal-check-status');
 }
 function refresh(){
  enhance();const root=document.querySelector('#today560');if(!root)return;
  const date=dateFromKey(selectedDate),isToday=selectedDate===todayKey();
  root.querySelector('#journalDate').textContent=date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const next=root.querySelector('#journalNextDay');if(next)next.disabled=isToday;
  const data=day(selectedDate,false),latest=weightEntries(selectedDate).at(-1);
  const steps=root.querySelector('#journalSteps');if(steps)steps.textContent=data.steps===null?'–':new Intl.NumberFormat('de-DE').format(Number(data.steps)||0);
  const meta=root.querySelector('#journalStepMeta');if(meta&&data.steps===null)meta.textContent='Noch nicht eingetragen';
  const completed=[!!latest,data.gym!==null,data.alcohol!==null].filter(Boolean).length;
  const check=root.querySelector('#journalCheckStatus');if(check)check.textContent=`${completed}/3 Angaben`;
  const fire=root.querySelector('#journalGym');if(fire)fire.textContent=String(streak());
  const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
 }
 const base=window.render;window.render=function(){base();refresh()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,180),{once:true});else setTimeout(refresh,180);
})();
