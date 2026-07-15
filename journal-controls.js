'use strict';
(function(){
  const VERSION='6.0.12';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v6';
  const WATER_MAX=6000;
  const root=()=>document.querySelector('#today560');
  const readJson=(key,fallback={})=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}};
  const waterMap=()=>readJson(WATER_KEY,{});
  const waterAmount=()=>Math.max(0,Math.min(WATER_MAX,Math.round(Number(waterMap()[selectedDate])||0)));

  function persistState(){
    return typeof saveState==='function'&&saveState(true)!==false;
  }
  function rerender(){
    if(typeof window.render==='function')window.render();
  }
  function currentDay(){
    return typeof day==='function'?day(selectedDate,true):null;
  }
  function stepValue(){
    const data=typeof day==='function'?day(selectedDate,false):null;
    return data?.steps??null;
  }
  function saveSteps(){
    const host=root();
    const input=host?.querySelector('#journalStepInput');
    const editor=host?.querySelector('#journalStepEditor');
    const raw=String(input?.value??'').trim();
    const value=Number(raw);
    if(raw===''||!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    const data=currentDay();
    if(!data){toast?.('Der Tag konnte nicht geladen werden.');return}
    data.steps=value;
    if(!persistState()){toast?.('Schritte konnten nicht gespeichert werden.');return}
    if(editor)editor.hidden=true;
    rerender();
    toast?.(`${value.toLocaleString('de-DE')} Schritte gespeichert.`);
  }
  function clearSteps(){
    const data=currentDay();
    if(!data)return;
    data.steps=null;
    if(typeof pruneDay==='function')pruneDay(selectedDate);
    if(!persistState()){toast?.('Schritte konnten nicht entfernt werden.');return}
    const editor=root()?.querySelector('#journalStepEditor');
    if(editor)editor.hidden=true;
    rerender();
    toast?.('Schritte entfernt.');
  }
  function toggleSteps(){
    const host=root();
    const editor=host?.querySelector('#journalStepEditor');
    const input=host?.querySelector('#journalStepInput');
    const toggle=host?.querySelector('#journalStepToggle');
    if(!editor||!input)return;
    editor.hidden=!editor.hidden;
    toggle?.setAttribute('aria-expanded',String(!editor.hidden));
    if(!editor.hidden){input.value=stepValue()??'';updateStepSaveState();setTimeout(()=>input.focus(),20)}
  }
  function updateStepSaveState(){
    const host=root();
    const input=host?.querySelector('#journalStepInput');
    const save=host?.querySelector('#journalStepSave');
    if(!input||!save)return;
    const raw=String(input.value??'').trim();
    const value=Number(raw);
    const valid=raw!==''&&Number.isInteger(value)&&value>=0&&value<=100000;
    save.disabled=!valid;
    save.setAttribute('aria-disabled',String(!valid));
  }
  function freshButton(selector,handler){
    const host=root();
    const old=host?.querySelector(selector);
    if(!old)return null;
    const node=old.cloneNode(true);
    node.removeAttribute('style');
    node.onclick=event=>{event.preventDefault();event.stopPropagation();handler(event)};
    old.replaceWith(node);
    return node;
  }
  function bindSteps(){
    const host=root();
    if(!host)return;
    const value=stepValue();
    const display=host.querySelector('#journalSteps');
    if(display)display.textContent=value===null?'–':Number(value).toLocaleString('de-DE');
    freshButton('#journalStepToggle',toggleSteps);
    const save=freshButton('#journalStepSave',saveSteps);
    const clear=freshButton('#journalStepClear',clearSteps);
    const input=host.querySelector('#journalStepInput');
    if(input){
      input.oninput=updateStepSaveState;
      input.onkeydown=event=>{
        if(event.key==='Enter'){event.preventDefault();if(!host.querySelector('#journalStepSave')?.disabled)saveSteps()}
        if(event.key==='Escape'){event.preventDefault();const editor=host.querySelector('#journalStepEditor');if(editor)editor.hidden=true}
      };
      if(document.activeElement!==input)input.value=value??'';
    }
    if(clear)clear.hidden=value===null;
    if(save)updateStepSaveState();
  }
  function writeWater(next,remember=true){
    const previous=waterAmount();
    const amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0)));
    const all=waterMap();
    if(remember&&amount!==previous){try{localStorage.setItem(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current:amount,at:Date.now()}))}catch{}}
    if(amount>0)all[selectedDate]=amount;else delete all[selectedDate];
    try{localStorage.setItem(WATER_KEY,JSON.stringify(all))}catch(error){console.error(error);toast?.('Wasser konnte nicht gespeichert werden.');return}
    rerender();
  }
  function undoWater(){
    const current=waterAmount();
    if(current<=0){toast?.('Kein Wassereintrag vorhanden.');return}
    const record=readJson(WATER_UNDO_KEY,null);
    let target=Math.max(0,current-250);
    if(record&&record.date===selectedDate&&Number(record.current)===current&&Number.isFinite(Number(record.previous)))target=Math.max(0,Number(record.previous));
    writeWater(target,false);
    try{localStorage.removeItem(WATER_UNDO_KEY)}catch{}
  }
  function setBoolean(field,value){
    const data=currentDay();if(!data)return;
    data[field]=value;
    if(!persistState()){toast?.('Angabe konnte nicht gespeichert werden.');return}
    rerender();
  }
  function bindOtherControls(){
    const host=root();if(!host)return;
    host.querySelectorAll('[data-journal-water]').forEach(button=>{button.disabled=false;button.onclick=()=>writeWater(waterAmount()+Number(button.dataset.journalWater))});
    const undo=host.querySelector('#journalWaterUndo');if(undo){const active=waterAmount()>0;undo.disabled=!active;undo.style.pointerEvents=active?'auto':'none';undo.onclick=undoWater}
    host.querySelectorAll('[data-journal-gym]').forEach(button=>{button.onclick=()=>setBoolean('gym',button.dataset.journalGym==='true')});
    host.querySelectorAll('[data-journal-alcohol]').forEach(button=>{button.onclick=()=>setBoolean('alcohol',button.dataset.journalAlcohol==='true')});
    const yes=host.querySelector('[data-journal-alcohol="true"]');const no=host.querySelector('[data-journal-alcohol="false"]');if(yes&&no&&yes.parentElement===no.parentElement)yes.parentElement.insertBefore(yes,no);
  }
  function bind(){
    bindSteps();
    bindOtherControls();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();bind()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,150),{once:true});else setTimeout(bind,150);
})();