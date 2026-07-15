'use strict';
(function(){
  const VERSION='6.0.10';
  const root=()=>document.querySelector('#today560');
  let viewMonth=dateFromKey(selectedDate);

  function dateHref(key){
    const capped=key>todayKey()?todayKey():key;
    return `./?date=${encodeURIComponent(capped)}#today`;
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
    date.setAttribute('role','button');
    date.setAttribute('tabindex','0');
    calendar.setAttribute('role','button');
    calendar.setAttribute('tabindex','0');
    calendar.setAttribute('aria-label','Kalender öffnen');

    let tools=top.querySelector('.journal-topbar-tools');
    if(!tools){tools=document.createElement('div');tools.className='journal-topbar-tools';top.append(tools)}

    const controls=document.createElement('div');
    controls.className='journal-day-controls';
    const previous=shiftKey(selectedDate,-1);
    const next=shiftKey(selectedDate,1);
    controls.innerHTML=`<a id="journalPrevDay" href="${dateHref(previous)}" aria-label="Vorheriger Tag">‹</a><a id="journalNextDay" href="${selectedDate<todayKey()?dateHref(next):'#'}" aria-label="Nächster Tag" ${selectedDate>=todayKey()?'aria-disabled="true" tabindex="-1"':''}>›</a>`;

    tools.replaceChildren(controls,stats,calendar);
    if(date.parentElement!==top||top.firstElementChild!==date)top.prepend(date);
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
    modal.innerHTML=`<div class="journal-calendar-backdrop" data-calendar-close></div><section class="journal-calendar-sheet" role="dialog" aria-modal="true" aria-label="Datum auswählen"><header><button type="button" data-calendar-month="-1" aria-label="Vorheriger Monat">‹</button><strong id="journalCalendarTitle"></strong><button type="button" data-calendar-month="1" aria-label="Nächster Monat">›</button></header><div class="journal-calendar-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="journalCalendarDays" class="journal-calendar-days"></div><footer><a href="${dateHref(todayKey())}">Heute</a><button type="button" data-calendar-close>Schließen</button></footer></section>`;
    document.body.append(modal);
    return modal;
  }

  function openCalendar(){
    const modal=ensureCalendar();
    viewMonth=dateFromKey(selectedDate);viewMonth.setDate(1);
    renderCalendar();modal.hidden=false;document.body.classList.add('journal-calendar-open');
  }
  function closeCalendar(){
    const modal=document.querySelector('#journalCalendarModal');if(modal)modal.hidden=true;
    document.body.classList.remove('journal-calendar-open');
  }
  function renderCalendar(){
    const modal=ensureCalendar(),title=modal.querySelector('#journalCalendarTitle'),days=modal.querySelector('#journalCalendarDays');
    const today=todayKey();
    title.textContent=viewMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'});days.innerHTML='';
    const first=new Date(viewMonth.getFullYear(),viewMonth.getMonth(),1,12),offset=(first.getDay()+6)%7,start=new Date(first);start.setDate(first.getDate()-offset);
    for(let i=0;i<42;i++){
      const date=new Date(start);date.setDate(start.getDate()+i);const key=keyFromDate(date);
      const node=document.createElement(key<=today?'a':'span');
      node.textContent=String(date.getDate());
      if(key<=today)node.href=dateHref(key);
      node.classList.toggle('outside',date.getMonth()!==viewMonth.getMonth());
      node.classList.toggle('selected',key===selectedDate);node.classList.toggle('today',key===today);node.classList.toggle('disabled',key>today);
      days.append(node);
    }
    const nextMonth=modal.querySelector('[data-calendar-month="1"]'),now=new Date();
    nextMonth.disabled=viewMonth.getFullYear()===now.getFullYear()&&viewMonth.getMonth()>=now.getMonth();
  }

  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('#journalDateButton,#journalCalendarButton,[data-calendar-close],[data-calendar-month]'):null;
    if(!target)return;
    if(target.matches('#journalDateButton,#journalCalendarButton')){event.preventDefault();openCalendar()}
    else if(target.hasAttribute('data-calendar-close')){event.preventDefault();closeCalendar()}
    else if(target.dataset.calendarMonth){event.preventDefault();viewMonth.setMonth(viewMonth.getMonth()+Number(target.dataset.calendarMonth));renderCalendar()}
  },true);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeCalendar()},true);

  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();ensureLayout()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureLayout,120),{once:true});else setTimeout(ensureLayout,120);
})();
