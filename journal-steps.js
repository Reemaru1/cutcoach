'use strict';
(function(){
  const VERSION='6.0.11';

  function queryFor(value){
    const params=new URLSearchParams(location.search);
    params.set('date',selectedDate);
    params.set('steps',String(value));
    return `./?${params.toString()}#today`;
  }

  function processIncoming(){
    const params=new URLSearchParams(location.search);
    const raw=params.get('steps');
    if(raw===null)return false;
    const date=params.get('date');
    if(date&&typeof validDateKey==='function'&&validDateKey(date))selectedDate=date>todayKey()?todayKey():date;
    if(raw==='clear'){
      day(selectedDate,true).steps=null;
      if(typeof pruneDay==='function')pruneDay(selectedDate);
    }else{
      const value=Number(raw);
      if(!Number.isInteger(value)||value<0||value>100000)return false;
      day(selectedDate,true).steps=value;
    }
    if(typeof saveState==='function')saveState(true);
    params.delete('steps');
    history.replaceState(null,'',`./?${params.toString()}#today`);
    return true;
  }

  function enhance(){
    const root=document.querySelector('#today560');
    if(!root)return;
    const value=day(selectedDate,false).steps;
    const display=root.querySelector('#journalSteps');
    if(display)display.textContent=value===null?'–':Number(value).toLocaleString('de-DE');

    const editor=root.querySelector('#journalStepEditor');
    const input=root.querySelector('#journalStepInput');
    const oldSave=root.querySelector('#journalStepSave');
    const oldClear=root.querySelector('#journalStepClear');
    if(!editor||!input||!oldSave)return;

    let save=editor.querySelector('#journalStepSaveLink');
    if(!save){
      save=document.createElement('a');
      save.id='journalStepSaveLink';
      save.className='journal-step-save-link';
      save.textContent='Speichern';
      oldSave.replaceWith(save);
    }
    let clear=editor.querySelector('#journalStepClearLink');
    if(!clear&&oldClear){
      clear=document.createElement('a');
      clear.id='journalStepClearLink';
      clear.className='journal-step-clear-link';
      clear.textContent='×';
      oldClear.replaceWith(clear);
    }

    const syncLinks=()=>{
      const raw=String(input.value||'').trim();
      const parsed=Number(raw);
      const valid=raw!==''&&Number.isInteger(parsed)&&parsed>=0&&parsed<=100000;
      save.href=valid?queryFor(parsed):'#';
      save.setAttribute('aria-disabled',String(!valid));
      save.classList.toggle('disabled',!valid);
      if(clear){
        clear.href=queryFor('clear');
        clear.hidden=value===null;
      }
    };
    input.oninput=syncLinks;
    input.onkeydown=event=>{
      if(event.key==='Enter'&&!save.classList.contains('disabled')){event.preventDefault();location.href=save.href}
      if(event.key==='Escape'){event.preventDefault();editor.hidden=true}
    };
    save.onclick=event=>{
      if(save.classList.contains('disabled')){event.preventDefault();toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.')}
    };
    syncLinks();

    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  const changed=processIncoming();
  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();enhance()};
  const start=()=>{if(changed&&typeof window.render==='function')window.render();else enhance()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,0),{once:true});else setTimeout(start,0);
})();