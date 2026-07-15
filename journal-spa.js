'use strict';
(function(){
  const VERSION='6.0.14';

  function syncUrl(){
    const url=new URL(location.href);
    url.searchParams.set('date',selectedDate);
    url.searchParams.delete('journal_steps');
    history.replaceState(null,'',url.pathname+'?'+url.searchParams.toString()+'#today');
  }

  function updateDate(key){
    if(typeof validDateKey==='function'&&!validDateKey(key))return false;
    const today=typeof todayKey==='function'?todayKey():key;
    selectedDate=key>today?today:key;
    syncUrl();
    const modal=document.querySelector('#journalCalendarModal');
    if(modal)modal.hidden=true;
    document.body.classList.remove('journal-calendar-open');
    if(typeof window.render==='function')window.render();
    return true;
  }

  function saveSteps(form,submitter){
    const data=new FormData(form,submitter||undefined);
    const raw=String(data.get('journal_steps')??'').trim();
    const targetDate=String(data.get('date')||selectedDate);
    if(typeof validDateKey==='function'&&validDateKey(targetDate))selectedDate=targetDate;
    const entry=typeof day==='function'?day(selectedDate,true):null;
    if(!entry)return false;
    if(raw==='clear')entry.steps=null;
    else{
      const value=Number(raw);
      if(!Number.isInteger(value)||value<0||value>100000){
        if(typeof toast==='function')toast('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');
        return false;
      }
      entry.steps=value;
    }
    if(typeof pruneDay==='function')pruneDay(selectedDate);
    if(typeof saveState==='function'&&saveState(true)===false){
      if(typeof toast==='function')toast('Schritte konnten nicht gespeichert werden.');
      return false;
    }
    syncUrl();
    if(typeof window.render==='function')window.render();
    if(typeof toast==='function')toast(raw==='clear'?'Schritte entfernt.':`${Number(raw).toLocaleString('de-DE')} Schritte gespeichert.`);
    return true;
  }

  document.addEventListener('submit',event=>{
    const form=event.target instanceof HTMLFormElement?event.target:null;
    if(!form||form.id!=='journalStepNativeForm')return;
    event.preventDefault();
    event.stopImmediatePropagation();
    saveSteps(form,event.submitter);
  },true);

  document.addEventListener('click',event=>{
    const link=event.target instanceof Element?event.target.closest('#journalPrevDay,#journalNextDay,#journalCalendarDays a,#journalCalendarModal footer a'):null;
    if(!link||link.getAttribute('aria-disabled')==='true')return;
    const href=link.getAttribute('href');
    if(!href)return;
    const url=new URL(href,location.href);
    const key=url.searchParams.get('date');
    if(!key)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    updateDate(key);
  },true);

  function applyVersion(){
    const node=document.querySelector('#appVersion');
    if(node)node.textContent=`Version ${VERSION}`;
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyVersion,{once:true});else applyVersion();
})();
