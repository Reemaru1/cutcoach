'use strict';
(function(){
  const VERSION='6.1.0';
  const root=()=>document.querySelector('#today560');
  let calendarMonth=null;

  function renderNow(){
    if(typeof window.render==='function')window.render();
  }

  function setSelectedDate(key){
    if(typeof validDateKey!=='function'||!validDateKey(key))return;
    const today=todayKey();
    selectedDate=key>today?today:key;
    const url=new URL(location.href);
    url.searchParams.set('date',selectedDate);
    url.searchParams.delete('journal_steps');
    history.replaceState(null,'',url.pathname+'?'+url.searchParams.toString()+'#today');
    closeCalendar();
    renderNow();
  }

  function makeButton(id,label,disabled=false){
    const button=document.createElement('button');
    button.id=id;
    button.type='button';
    button.textContent=label;
    button.disabled=disabled;
    return button;
  }

  function bindHeader(){
    const host=root();
    const top=host?.querySelector('.journal-topbar');
    const date=host?.querySelector('#journalDateButton');
    const stats=host?.querySelector('.journal-mini-stats');
    const calendar=host?.querySelector('#journalCalendarButton');
    if(!host||!top||!date||!stats||!calendar)return;

    date.querySelectorAll('input').forEach(node=>node.remove());
    date.type='button';
    date.onclick=()=>openCalendar();

    let tools=top.querySelector('.journal-topbar-tools');
    if(!tools){tools=document.createElement('div');tools.className='journal-topbar-tools';top.append(tools)}

    const controls=document.createElement('div');
    controls.className='journal-day-controls';
    const previous=makeButton('journalPrevDay','‹');
    const next=makeButton('journalNextDay','›',selectedDate>=todayKey());
    previous.setAttribute('aria-label','Vorheriger Tag');
    next.setAttribute('aria-label','Nächster Tag');
    previous.onclick=()=>setSelectedDate(shiftKey(selectedDate,-1));
    next.onclick=()=>{if(selectedDate<todayKey())setSelectedDate(shiftKey(selectedDate,1))};
    controls.append(previous,next);

    const calendarButton=calendar.cloneNode(true);
    calendarButton.type='button';
    calendarButton.removeAttribute('href');
    calendarButton.onclick=()=>openCalendar();

    tools.replaceChildren(controls,stats,calendarButton);
    if(top.firstElementChild!==date)top.prepend(date);
  }

  function saveSteps(value){
    const parsed=Number(String(value).trim());
    if(!Number.isInteger(parsed)||parsed<0||parsed>100000){
      if(typeof toast==='function')toast('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');
      return;
    }
    const entry=day(selectedDate,true);
    entry.steps=parsed;
    if(typeof saveState==='function'&&saveState(true)===false){
      if(typeof toast==='function')toast('Schritte konnten nicht gespeichert werden.');
      return;
    }
    renderNow();
    if(typeof toast==='function')toast(`${parsed.toLocaleString('de-DE')} Schritte gespeichert.`);
  }

  function clearSteps(){
    const entry=day(selectedDate,true);
    entry.steps=null;
    if(typeof pruneDay==='function')pruneDay(selectedDate);
    if(typeof saveState==='function'&&saveState(true)===false){
      if(typeof toast==='function')toast('Schritte konnten nicht entfernt werden.');
      return;
    }
    renderNow();
    if(typeof toast==='function')toast('Schritte entfernt.');
  }

  function bindSteps(){
    const host=root();
    const card=host?.querySelector('.journal-steps-card');
    const editor=host?.querySelector('#journalStepEditor');
    const oldToggle=host?.querySelector('#journalStepToggle');
    if(!host||!card||!editor||!oldToggle)return;

    const value=day(selectedDate,false).steps;
    const display=host.querySelector('#journalSteps');
    if(display)display.textContent=value===null?'–':Number(value).toLocaleString('de-DE');

    editor.innerHTML='<input id="journalStepInput" type="number" min="0" max="100000" step="1" inputmode="numeric" placeholder="Schritte"><button id="journalStepSave" type="button">Speichern</button><button id="journalStepClear" class="journal-clear" type="button">×</button>';
    const input=editor.querySelector('#journalStepInput');
    const save=editor.querySelector('#journalStepSave');
    const clear=editor.querySelector('#journalStepClear');
    input.value=value??'';
    clear.hidden=value===null;

    const toggle=oldToggle.cloneNode(true);
    toggle.type='button';
    toggle.onclick=()=>{
      editor.hidden=!editor.hidden;
      toggle.setAttribute('aria-expanded',String(!editor.hidden));
      if(!editor.hidden){input.value=day(selectedDate,false).steps??'';setTimeout(()=>input.focus(),20)}
    };
    oldToggle.replaceWith(toggle);

    const update=()=>{
      const raw=String(input.value).trim();
      const parsed=Number(raw);
      save.disabled=raw===''||!Number.isInteger(parsed)||parsed<0||parsed>100000;
    };
    input.oninput=update;
    input.onkeydown=event=>{
      if(event.key==='Enter'&&!save.disabled){event.preventDefault();saveSteps(input.value)}
      if(event.key==='Escape'){event.preventDefault();editor.hidden=true}
    };
    save.onclick=()=>saveSteps(input.value);
    clear.onclick=()=>clearSteps();
    update();
  }

  function ensureCalendar(){
    let modal=document.querySelector('#journalCalendarModal');
    if(modal)modal.remove();
    modal=document.createElement('div');
    modal.id='journalCalendarModal';
    modal.className='journal-calendar-modal';
    modal.hidden=true;
    modal.innerHTML='<div class="journal-calendar-backdrop"></div><section class="journal-calendar-sheet" role="dialog" aria-modal="true" aria-label="Datum auswählen"><header><button type="button" id="journalCalendarPrevMonth">‹</button><strong id="journalCalendarTitle"></strong><button type="button" id="journalCalendarNextMonth">›</button></header><div class="journal-calendar-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="journalCalendarDays" class="journal-calendar-days"></div><footer><button type="button" id="journalCalendarToday">Heute</button><button type="button" id="journalCalendarClose">Schließen</button></footer></section>';
    document.body.append(modal);
    modal.querySelector('.journal-calendar-backdrop').onclick=closeCalendar;
    modal.querySelector('#journalCalendarClose').onclick=closeCalendar;
    modal.querySelector('#journalCalendarToday').onclick=()=>setSelectedDate(todayKey());
    modal.querySelector('#journalCalendarPrevMonth').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar()};
    modal.querySelector('#journalCalendarNextMonth').onclick=()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar()};
    return modal;
  }

  function openCalendar(){
    const modal=ensureCalendar();
    calendarMonth=dateFromKey(selectedDate);
    calendarMonth.setDate(1);
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
    const modal=document.querySelector('#journalCalendarModal');
    if(!modal||!calendarMonth)return;
    const title=modal.querySelector('#journalCalendarTitle');
    const days=modal.querySelector('#journalCalendarDays');
    title.textContent=calendarMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    days.replaceChildren();
    const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1,12);
    const offset=(first.getDay()+6)%7;
    const start=new Date(first);start.setDate(first.getDate()-offset);
    const today=todayKey();
    for(let i=0;i<42;i++){
      const date=new Date(start);date.setDate(start.getDate()+i);
      const key=keyFromDate(date);
      const button=document.createElement('button');
      button.type='button';
      button.textContent=String(date.getDate());
      button.disabled=key>today;
      button.classList.toggle('outside',date.getMonth()!==calendarMonth.getMonth());
      button.classList.toggle('selected',key===selectedDate);
      button.classList.toggle('today',key===today);
      button.onclick=()=>setSelectedDate(key);
      days.append(button);
    }
    const now=new Date();
    modal.querySelector('#journalCalendarNextMonth').disabled=calendarMonth.getFullYear()===now.getFullYear()&&calendarMonth.getMonth()>=now.getMonth();
  }

  function bind(){
    bindHeader();
    bindSteps();
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();bind()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,180),{once:true});else setTimeout(bind,180);
})();
