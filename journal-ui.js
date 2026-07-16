'use strict';
(function(){
  const VERSION='6.2.1';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v7';
  const WATER_MAX=6000;
  const root=()=>document.querySelector('#today560');
  let calendarMonth=null;

  function readObject(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {}}
  }
  function waterAmount(){
    return Math.max(0,Math.min(WATER_MAX,Math.round(Number(readObject(WATER_KEY)[selectedDate])||0)));
  }
  function renderNow(){
    if(typeof window.render==='function')window.render();
  }
  function updateUrl(){
    try{
      const url=new URL(location.href);
      url.searchParams.set('date',selectedDate);
      url.searchParams.delete('journal_steps');
      history.replaceState(null,'',url.pathname+'?'+url.searchParams.toString()+'#today');
    }catch{}
  }
  function selectDate(key){
    if(typeof validDateKey!=='function'||!validDateKey(key))return;
    selectedDate=key>todayKey()?todayKey():key;
    updateUrl();
    closeCalendar();
    renderNow();
  }

  function replaceButton(oldNode,id,text,handler,disabled=false){
    if(!oldNode)return null;
    const button=document.createElement('button');
    if(id)button.id=id;
    button.type='button';
    button.className=oldNode.className;
    button.innerHTML=text;
    button.disabled=disabled;
    for(const attr of oldNode.attributes){
      if(!['id','class','type','href','disabled','onclick'].includes(attr.name))button.setAttribute(attr.name,attr.value);
    }
    button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();handler()});
    oldNode.replaceWith(button);
    return button;
  }

  function mountHeader(){
    const host=root();
    const top=host?.querySelector('.journal-topbar');
    const date=host?.querySelector('#journalDateButton');
    const stats=host?.querySelector('.journal-mini-stats');
    const oldCalendar=host?.querySelector('#journalCalendarButton');
    if(!top||!date||!stats||!oldCalendar)return;

    const freshDate=date.cloneNode(true);
    freshDate.type='button';
    freshDate.onclick=null;
    freshDate.querySelectorAll('input').forEach(node=>node.remove());
    freshDate.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openCalendar()});
    date.replaceWith(freshDate);

    let tools=top.querySelector('.journal-topbar-tools');
    if(!tools){tools=document.createElement('div');tools.className='journal-topbar-tools';top.append(tools)}
    const controls=document.createElement('div');
    controls.className='journal-day-controls';
    const previous=document.createElement('button');
    previous.id='journalPrevDay';previous.type='button';previous.textContent='‹';previous.setAttribute('aria-label','Vorheriger Tag');
    previous.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();selectDate(shiftKey(selectedDate,-1))});
    const next=document.createElement('button');
    next.id='journalNextDay';next.type='button';next.textContent='›';next.setAttribute('aria-label','Nächster Tag');next.disabled=selectedDate>=todayKey();
    next.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();if(selectedDate<todayKey())selectDate(shiftKey(selectedDate,1))});
    controls.append(previous,next);

    const calendar=oldCalendar.cloneNode(true);
    calendar.type='button';calendar.onclick=null;calendar.removeAttribute('href');calendar.removeAttribute('onclick');calendar.dataset.journalController='1';
    calendar.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();openCalendar()});
    oldCalendar.remove();
    tools.replaceChildren(controls,stats,calendar);
    calendar.onclick=null;
    if(top.firstElementChild!==freshDate)top.prepend(freshDate);
  }

  function saveSteps(input,editor){
    const raw=String(input.value??'').trim();
    const value=Number(raw);
    if(raw===''||!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    const entry=day(selectedDate,true);
    entry.steps=value;
    if(typeof saveState==='function'&&saveState(true)===false){toast?.('Schritte konnten nicht gespeichert werden.');return}
    editor.hidden=true;
    renderNow();
    toast?.(`${value.toLocaleString('de-DE')} Schritte gespeichert.`);
  }
  function clearSteps(editor){
    const entry=day(selectedDate,true);
    entry.steps=null;
    if(typeof pruneDay==='function')pruneDay(selectedDate);
    if(typeof saveState==='function'&&saveState(true)===false){toast?.('Schritte konnten nicht entfernt werden.');return}
    editor.hidden=true;
    renderNow();
    toast?.('Schritte entfernt.');
  }
  function mountSteps(){
    const host=root();
    const card=host?.querySelector('.journal-steps-card');
    const oldEditor=host?.querySelector('#journalStepEditor');
    const oldToggle=host?.querySelector('#journalStepToggle');
    if(!card||!oldEditor||!oldToggle)return;
    const value=day(selectedDate,false).steps;
    const display=host.querySelector('#journalSteps');
    if(display)display.textContent=value===null?'–':Number(value).toLocaleString('de-DE');

    const editor=document.createElement('div');
    editor.id='journalStepEditor';editor.className='journal-step-editor';editor.hidden=oldEditor.hidden;
    const input=document.createElement('input');
    input.id='journalStepInput';input.type='number';input.min='0';input.max='100000';input.step='1';input.inputMode='numeric';input.placeholder='Schritte';input.value=value??'';
    const save=document.createElement('button');save.id='journalStepSave';save.type='button';save.textContent='Speichern';
    const clear=document.createElement('button');clear.id='journalStepClear';clear.type='button';clear.className='journal-clear';clear.textContent='×';clear.hidden=value===null;
    editor.append(input,save,clear);
    oldEditor.replaceWith(editor);

    const toggle=replaceButton(oldToggle,'journalStepToggle',oldToggle.innerHTML,()=>{
      editor.hidden=!editor.hidden;
      toggle.setAttribute('aria-expanded',String(!editor.hidden));
      if(!editor.hidden){input.value=day(selectedDate,false).steps??'';update();setTimeout(()=>input.focus(),20)}
    });
    const update=()=>{
      const raw=String(input.value).trim(),parsed=Number(raw);
      save.disabled=raw===''||!Number.isInteger(parsed)||parsed<0||parsed>100000;
    };
    input.addEventListener('input',update);
    input.addEventListener('keydown',event=>{
      if(event.key==='Enter'&&!save.disabled){event.preventDefault();saveSteps(input,editor)}
      if(event.key==='Escape'){event.preventDefault();editor.hidden=true}
    });
    save.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();saveSteps(input,editor)});
    clear.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();clearSteps(editor)});
    update();
  }

  function writeWater(next,remember=true){
    const previous=waterAmount();
    const amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0)));
    const all=readObject(WATER_KEY);
    if(remember&&amount!==previous){
      try{localStorage.setItem(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current:amount}))}catch{}
    }
    if(amount>0)all[selectedDate]=amount;else delete all[selectedDate];
    try{localStorage.setItem(WATER_KEY,JSON.stringify(all))}catch{toast?.('Wasser konnte nicht gespeichert werden.');return}
    renderNow();
  }
  function undoWater(){
    const current=waterAmount();
    if(current<=0)return;
    let target=Math.max(0,current-250);
    try{
      const undo=JSON.parse(localStorage.getItem(WATER_UNDO_KEY)||'null');
      if(undo&&undo.date===selectedDate&&Number(undo.current)===current&&Number.isFinite(Number(undo.previous)))target=Math.max(0,Number(undo.previous));
      localStorage.removeItem(WATER_UNDO_KEY);
    }catch{}
    writeWater(target,false);
  }
  function mountWater(){
    const host=root();
    if(!host)return;
    host.querySelectorAll('[data-journal-water]').forEach(old=>{
      const amount=Number(old.dataset.journalWater)||0;
      replaceButton(old,'',old.innerHTML,()=>writeWater(waterAmount()+amount));
      const latest=host.querySelectorAll('[data-journal-water]');
      const node=[...latest].find(item=>Number(item.dataset.journalWater)===amount);
      if(node)node.dataset.journalWater=String(amount);
    });
    const oldUndo=host.querySelector('#journalWaterUndo');
    if(oldUndo){
      const active=waterAmount()>0;
      const undo=replaceButton(oldUndo,'journalWaterUndo',oldUndo.innerHTML,undoWater,!active);
      if(undo){undo.style.opacity=active?'1':'.45';undo.style.pointerEvents=active?'auto':'none'}
    }
  }

  function ensureCalendar(){
    let modal=document.querySelector('#journalCalendarModal');
    if(modal)modal.remove();
    modal=document.createElement('div');modal.id='journalCalendarModal';modal.className='journal-calendar-modal';modal.hidden=true;
    modal.innerHTML='<div class="journal-calendar-backdrop"></div><section class="journal-calendar-sheet" role="dialog" aria-modal="true" aria-label="Datum auswählen"><header><button type="button" id="journalCalendarPrevMonth">‹</button><strong id="journalCalendarTitle"></strong><button type="button" id="journalCalendarNextMonth">›</button></header><div class="journal-calendar-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div id="journalCalendarDays" class="journal-calendar-days"></div><footer><button type="button" id="journalCalendarToday">Heute</button><button type="button" id="journalCalendarClose">Schließen</button></footer></section>';
    document.body.append(modal);
    modal.querySelector('.journal-calendar-backdrop').addEventListener('click',closeCalendar);
    modal.querySelector('#journalCalendarClose').addEventListener('click',closeCalendar);
    modal.querySelector('#journalCalendarToday').addEventListener('click',()=>selectDate(todayKey()));
    modal.querySelector('#journalCalendarPrevMonth').addEventListener('click',()=>{calendarMonth.setMonth(calendarMonth.getMonth()-1);renderCalendar()});
    modal.querySelector('#journalCalendarNextMonth').addEventListener('click',()=>{calendarMonth.setMonth(calendarMonth.getMonth()+1);renderCalendar()});
    return modal;
  }
  function openCalendar(){
    const modal=ensureCalendar();
    calendarMonth=dateFromKey(selectedDate);calendarMonth.setDate(1);
    renderCalendar();modal.hidden=false;document.body.classList.add('journal-calendar-open');
  }
  function closeCalendar(){
    const modal=document.querySelector('#journalCalendarModal');if(modal)modal.hidden=true;
    document.body.classList.remove('journal-calendar-open');
  }
  function renderCalendar(){
    const modal=document.querySelector('#journalCalendarModal');if(!modal||!calendarMonth)return;
    modal.querySelector('#journalCalendarTitle').textContent=calendarMonth.toLocaleDateString('de-DE',{month:'long',year:'numeric'});
    const days=modal.querySelector('#journalCalendarDays');days.replaceChildren();
    const first=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),1,12);
    const offset=(first.getDay()+6)%7;const start=new Date(first);start.setDate(first.getDate()-offset);const today=todayKey();
    for(let i=0;i<42;i++){
      const date=new Date(start);date.setDate(start.getDate()+i);const key=keyFromDate(date);
      const button=document.createElement('button');button.type='button';button.textContent=String(date.getDate());button.disabled=key>today;
      button.classList.toggle('outside',date.getMonth()!==calendarMonth.getMonth());button.classList.toggle('selected',key===selectedDate);button.classList.toggle('today',key===today);
      button.addEventListener('click',()=>selectDate(key));days.append(button);
    }
    const now=new Date();modal.querySelector('#journalCalendarNextMonth').disabled=calendarMonth.getFullYear()===now.getFullYear()&&calendarMonth.getMonth()>=now.getMonth();
  }

  function mount(){
    const host=root();
    if(!host)return;
    host.dataset.journalController=VERSION;
    mountHeader();mountSteps();mountWater();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();mount()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,200),{once:true});else setTimeout(mount,200);
})();
