'use strict';
(function(){
  const VERSION='6.0.8';
  const root=()=>document.querySelector('#today560');

  function safeSelect(key){
    if(typeof validDateKey!=='function'||!validDateKey(key))return;
    const capped=key>todayKey()?todayKey():key;
    if(typeof selectDate==='function')selectDate(capped);
    else{selectedDate=capped;window.render?.()}
  }

  function shift(days){
    if(typeof shiftKey!=='function')return;
    const next=shiftKey(selectedDate,days);
    if(next>todayKey())return;
    safeSelect(next);
  }

  function makePicker(className,label){
    const input=document.createElement('input');
    input.type='date';
    input.className=className;
    input.min='2020-01-01';
    input.max=todayKey();
    input.value=selectedDate;
    input.setAttribute('aria-label',label);
    input.addEventListener('change',()=>{if(input.value)safeSelect(input.value)});
    return input;
  }

  function rebuild(){
    const host=root();
    if(!host)return;
    const top=host.querySelector('.journal-topbar');
    const oldDate=host.querySelector('#journalDateButton');
    const stats=host.querySelector('.journal-mini-stats');
    const oldCalendar=host.querySelector('#journalCalendarButton');
    if(!top||!oldDate||!stats||!oldCalendar)return;

    const date=document.createElement('label');
    date.id='journalDateButton';
    date.className='journal-date-button';
    date.setAttribute('aria-label','Datum auswählen');
    date.innerHTML=oldDate.innerHTML;
    date.querySelector('i')?.remove();
    date.append(makePicker('journal-date-overlay','Datum auswählen'));

    const tools=document.createElement('div');
    tools.className='journal-topbar-tools';

    const controls=document.createElement('div');
    controls.className='journal-day-controls';
    controls.innerHTML='<button id="journalPrevDay" type="button" aria-label="Vorheriger Tag">‹</button><button id="journalNextDay" type="button" aria-label="Nächster Tag">›</button>';
    const prev=controls.querySelector('#journalPrevDay');
    const next=controls.querySelector('#journalNextDay');
    prev.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();shift(-1)});
    next.disabled=selectedDate>=todayKey();
    next.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(!next.disabled)shift(1)});

    const calendar=document.createElement('label');
    calendar.id='journalCalendarButton';
    calendar.className='journal-calendar-button';
    calendar.setAttribute('aria-label','Datum auswählen');
    calendar.append(makePicker('journal-calendar-input','Datum auswählen'));

    tools.append(controls,stats,calendar);
    top.replaceChildren(date,tools);

    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();rebuild()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(rebuild,120),{once:true});
  else setTimeout(rebuild,120);
})();