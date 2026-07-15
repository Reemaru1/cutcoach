'use strict';
(function(){
  const PARAM='journal_steps';
  function process(){
    const p=new URLSearchParams(location.search);
    if(!p.has(PARAM))return false;
    const key=p.get('date');
    if(key&&typeof validDateKey==='function'&&validDateKey(key))selectedDate=key>todayKey()?todayKey():key;
    const raw=p.get(PARAM);
    const data=day(selectedDate,true);
    if(raw==='clear')data.steps=null;
    else{
      const value=Number(raw);
      if(!Number.isInteger(value)||value<0||value>100000)return false;
      data.steps=value;
    }
    if(typeof saveState==='function'&&!saveState(true))return false;
    p.delete(PARAM);
    history.replaceState(null,'',location.pathname+(p.toString()?'?'+p.toString():'')+'#today');
    return true;
  }
  function bind(){
    const host=document.querySelector('#today560');
    const editor=host?.querySelector('#journalStepEditor');
    if(!host||!editor)return;
    const value=day(selectedDate,false).steps;
    const display=host.querySelector('#journalSteps');
    if(display)display.textContent=value===null?'–':Number(value).toLocaleString('de-DE');
    editor.innerHTML='<form id="journalStepNativeForm" method="get" action="./#today" style="display:contents"><input type="hidden" name="date" value="'+selectedDate+'"><input id="journalStepInput" name="'+PARAM+'" type="number" min="0" max="100000" step="1" inputmode="numeric" required placeholder="Schritte" value="'+(value??'')+'"><button id="journalStepSave" type="submit">Speichern</button><button id="journalStepClear" class="journal-clear" type="submit" name="'+PARAM+'" value="clear" formnovalidate>×</button></form>';
    const clear=host.querySelector('#journalStepClear');
    if(clear)clear.hidden=value===null;
  }
  const submitted=process();
  const base=window.render;
  if(typeof base==='function')window.render=function(){base();bind()};
  const start=()=>{if(submitted&&typeof window.render==='function')window.render();else bind()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,180),{once:true});else setTimeout(start,180);
})();