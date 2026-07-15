'use strict';
(function(){
  const VERSION='6.0.9';
  const root=()=>document.querySelector('#today560');
  let viewMonth=dateFromKey(selectedDate);
  let lastTouchAt=0;

  function safeSelect(key){
    if(typeof validDateKey!=='function'||!validDateKey(key))return;
    const capped=key>todayKey()?todayKey():key;
    selectedDate=capped;
    closeCalendar();
    window.render?.();
  }

  function shift(days){
    if(typeof shiftKey!=='function')return;
    const next=shiftKey(selectedDate,days);
    if(next>todayKey())return;
    safeSelect(next);
  }

  function ensureLayout(){
    const host=root();
    if(!host)return;
    const top=host.querySelector('.journal-topbar');
    const date=host.querySelector('#journalDateButton');
    const stats=host.querySelector('.journal-mini-stats');
    const calendar=host.querySelector('#journalCalendarButton');
    if(!top||!date||!stats||!calendar)return;

    date.querySelectorAll('input').forEach(node=>node.remove());
    calendar.querySelectorAll('input').forEach(node=>node.remove());
    date.setAttribute('role','button');
    date.setAttribute('tabindex','0');
    calendar.setAttribute('role','button');
    calendar.setAttribute('tabindex','0');
    calendar.setAttribute('aria-label','Kalender öffnen');

    let tools=top.querySelector('.journal-topbar-tools');
    if(!tools){
      tools=document.createElement('div');
      tools.className='journal-topbar-tools';
      top.append(tools);
    }
    let controls=tools.querySelector('.journal-day-controls');
    if(!controls){
      controls=document.createElement('div');
      controls.className='journal-day-controls';
      controls.innerHTML='<button id="journalPrevDay" type="button" aria-label="Vorheriger Tag">‹</button><button id="journalNextDay" type="button" aria-label="Nächster Tag">›</button>';
    }
    tools.replaceChildren(controls,stats,calendar);
    if(date.parentElement!==top||top.firstElementChild!==date)top.prepend(date);
    const next=controls.querySelector('#journalNextDay');
    if(next)next.disabled=selectedDate>=todayKey();
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  function ensureCalendar(){
    let modal=document.querySelector('#journalCalendarModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='journalCalendarModal';
    modal.className='journal-calendar-modal';
    modal.hidden=true;
    modal.innerHTML=`<div class="journal-calendar-backdrop" data-calendar-close></div><section class="journal-calendar-sheet" role="dialog" aria-modal="true" aria-label="Datum auswählen"><header><button type="button" data-calendar-month="-1" aria-label="Vorheriger Monat">‹</button><strong id="journalCalendarTitle"></strong><button type="button" data-calendar-month="1" aria-label="Nächster Monat">›</button></header><div class="journal-calendar-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="journalCalendarDays" class="journal-calendar-days"></div><footer><button type="button" data-calendar-today>Heute</button><button type="button" data-calendar-close>Schließen</button></footer></section>`;
    document.body.append(modal);
    return modal;
  }

  function openCalendar(){
    const modal=ensureCalendar();
    viewMonth=dateFromKey(selectedDate);
    viewMonth.setDate(1);
    renderCalendar();
    modal.hidden=false;
    document.body.classList.add('journal-calendar-open');
  }

  function closeCalendar(){
    const modal=document.querySelector('#journalCalendarModal');
    if(modal)modal.hidden=true;
    document.body.classList.remove('journal-calendar-open');
  }

  function renderCalendar(){
    const modal=ensureCalendar();
    const title=modal.querySelector('#journalCalendarTitle');
    const days=modal.querySelector('#journalCalendarDays');
    const today=todayKey();
    title.textContent=viewMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    days.innerHTML='';
    const first=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1,12);
    const offset=(first.getDay()+6)%7;
    const start=new Date(first);start.setDate(first.getDate()-offset);
    for(let i=0;i<42;i++){
      const date=new Date(start);date.setDate(start.getDate()+i);
      const key=keyFromDate(date);
      const button=document.createElement('button');
      button.type='button';
      button.textContent=String(date.getDate());
      button.dataset.calendarDate=key;
      button.classList.toggle('outside',date.getMonth()!==viewMonth.getMonth());
      button.classList.toggle('selected',key===selectedDate);
      button.classList.toggle('today',key===today);
      button.disabled=key>today;
      days.append(button);
    }
    const nextMonth=modal.querySelector('[data-calendar-month="1"]');
    const thisMonth=new Date();
    nextMonth.disabled=viewMonth.getFullYear()===thisMonth.getFullYear()&&viewMonth.getMonth()>=thisMonth.getMonth();
  }

  function activate(target,event){
    const element=target instanceof Element?target.closest('#journalPrevDay,#journalNextDay,#journalDateButton,#journalCalendarButton,[data-calendar-date],[data-calendar-close],[data-calendar-month],[data-calendar-today]'):null;
    if(!element)return false;
    event?.preventDefault();
    event?.stopPropagation();
    event?.stopImmediatePropagation?.();
    if(element.id==='journalPrevDay')shift(-1);
    else if(element.id==='journalNextDay'){if(!element.disabled)shift(1)}
    else if(element.id==='journalDateButton'||element.id==='journalCalendarButton')openCalendar();
    else if(element.hasAttribute('data-calendar-close'))closeCalendar();
    else if(element.hasAttribute('data-calendar-today'))safeSelect(todayKey());
    else if(element.dataset.calendarDate&&!element.disabled)safeSelect(element.dataset.calendarDate);
    else if(element.dataset.calendarMonth){viewMonth.setMonth(viewMonth.getMonth()+Number(element.dataset.calendarMonth));renderCalendar()}
    return true;
  }

  document.addEventListener('touchend',event=>{if(activate(event.target,event))lastTouchAt=Date.now()},{capture:true,passive:false});
  document.addEventListener('click',event=>{if(Date.now()-lastTouchAt<700)return;activate(event.target,event)},true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCalendar();if((event.key==='Enter'||event.key===' ')&&activate(event.target,event))event.preventDefault()},true);

  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();ensureLayout()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureLayout,120),{once:true});
  else setTimeout(ensureLayout,120);
})();