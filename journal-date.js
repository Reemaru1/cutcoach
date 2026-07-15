'use strict';
(function(){
  const VERSION='6.0.7';
  const root=()=>document.querySelector('#today560');
  function setDate(next){
    if(typeof validDateKey!=='function'||!validDateKey(next))return;
    const today=typeof todayKey==='function'?todayKey():next;
    selectedDate=next>today?today:next;
    window.render?.();
  }
  function shift(delta){
    if(typeof shiftKey!=='function')return;
    const next=shiftKey(selectedDate,delta);
    if(next>todayKey())return;
    setDate(next);
  }
  function openPicker(input){
    if(!input)return;
    try{input.showPicker?.()}catch{}
    input.focus({preventScroll:true});
    input.click();
  }
  function rebuildDateControls(){
    const host=root();
    if(!host)return;
    const top=host.querySelector('.journal-topbar');
    const dateButton=host.querySelector('#journalDateButton');
    const stats=host.querySelector('.journal-mini-stats');
    const oldCalendar=host.querySelector('#journalCalendarButton');
    if(!top||!dateButton||!stats||!oldCalendar)return;
    top.querySelector('.journal-day-controls')?.remove();
    const controls=document.createElement('div');
    controls.className='journal-day-controls';
    controls.innerHTML='<button id="journalPrevDay" type="button" aria-label="Vorheriger Tag">‹</button><button id="journalNextDay" type="button" aria-label="Nächster Tag">›</button>';
    stats.before(controls);
    const prev=controls.querySelector('#journalPrevDay');
    const next=controls.querySelector('#journalNextDay');
    prev.onclick=event=>{event.preventDefault();shift(-1)};
    next.disabled=selectedDate>=todayKey();
    next.onclick=event=>{event.preventDefault();if(!next.disabled)shift(1)};
    const calendar=oldCalendar.cloneNode(false);
    calendar.id='journalCalendarButton';
    calendar.type='button';
    calendar.className='journal-calendar-button';
    calendar.setAttribute('aria-label','Datum auswählen');
    calendar.title='Datum auswählen';
    calendar.innerHTML='<span aria-hidden="true">▣</span>';
    calendar.style.position='relative';
    const input=document.createElement('input');
    input.type='date';
    input.className='journal-calendar-input';
    input.min='2020-01-01';
    input.max=todayKey();
    input.value=selectedDate;
    input.setAttribute('aria-label','Datum auswählen');
    Object.assign(input.style,{position:'absolute',inset:'0',width:'100%',height:'100%',opacity:'0.01',zIndex:'5',cursor:'pointer'});
    input.onchange=()=>{if(input.value)setDate(input.value)};
    calendar.append(input);
    oldCalendar.replaceWith(calendar);
    const cleanDate=dateButton.cloneNode(true);
    cleanDate.id='journalDateButton';
    cleanDate.type='button';
    cleanDate.setAttribute('aria-label','Datum auswählen');
    cleanDate.onclick=event=>{event.preventDefault();openPicker(input)};
    dateButton.replaceWith(cleanDate);
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }
  const base=window.render;
  if(typeof base==='function')window.render=function(){base();rebuildDateControls()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(rebuildDateControls,180),{once:true});
  else setTimeout(rebuildDateControls,180);
})();