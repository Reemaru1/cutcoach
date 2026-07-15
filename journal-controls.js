'use strict';
(function(){
  const VERSION='6.0.6';
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
  function saveSteps(){
    const host=root();
    const input=host?.querySelector('#journalStepInput');
    const editor=host?.querySelector('#journalStepEditor');
    const raw=String(input?.value??'').trim();
    const value=Number(raw);
    if(raw===''||!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    day(selectedDate,true).steps=value;
    if(!persistState()){toast?.('Schritte konnten nicht gespeichert werden.');return}
    const stored=readJson('cutcoach_v2',{});
    if(Number(stored?.days?.[selectedDate]?.steps)!==value){toast?.('Schritte konnten nicht dauerhaft gespeichert werden.');return}
    if(editor)editor.hidden=true;
    rerender();
    toast?.(`${value.toLocaleString('de-DE')} Schritte gespeichert.`);
  }
  function clearSteps(){
    const editor=root()?.querySelector('#journalStepEditor');
    day(selectedDate,true).steps=null;
    if(typeof pruneDay==='function')pruneDay(selectedDate);
    if(!persistState()){toast?.('Schritte konnten nicht entfernt werden.');return}
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
    if(!editor.hidden){input.value=day(selectedDate,false).steps??'';setTimeout(()=>input.focus(),20)}
  }
  function writeWater(next,remember=true){
    const previous=waterAmount();
    const amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0)));
    const all=waterMap();
    if(remember&&amount!==previous){
      try{localStorage.setItem(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current:amount,at:Date.now()}))}catch{}
    }
    if(amount>0)all[selectedDate]=amount;else delete all[selectedDate];
    try{
      localStorage.setItem(WATER_KEY,JSON.stringify(all));
      if(Math.round(Number(readJson(WATER_KEY,{})[selectedDate])||0)!==amount)throw new Error('water-verify-failed');
    }catch(error){console.error(error);toast?.('Wasser konnte nicht gespeichert werden.');return}
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
    toast?.('Wasserstand zurückgesetzt.');
  }
  function setBoolean(field,value){
    day(selectedDate,true)[field]=value;
    if(!persistState()){toast?.('Angabe konnte nicht gespeichert werden.');return}
    rerender();
  }
  function changeDay(delta){
    const next=shiftKey(selectedDate,delta);
    if(next>todayKey())return;
    selectedDate=next;
    rerender();
  }
  function openCalendar(){
    const picker=document.querySelector('#datePicker');
    if(!picker)return;
    picker.max=todayKey();
    picker.value=selectedDate;
    picker.style.pointerEvents='auto';
    try{if(typeof picker.showPicker==='function'){picker.showPicker();return}}catch{}
    picker.focus({preventScroll:true});
    picker.click();
  }
  function bind(){
    const host=root();
    if(!host)return;
    const assign=(selector,handler)=>{const node=host.querySelector(selector);if(node){node.disabled=false;node.removeAttribute('disabled');node.style.pointerEvents='auto';node.onclick=handler}return node};
    assign('#journalStepToggle',toggleSteps);
    assign('#journalStepSave',saveSteps);
    assign('#journalStepClear',clearSteps);
    const input=host.querySelector('#journalStepInput');
    if(input){input.oninput=()=>{const save=host.querySelector('#journalStepSave');if(save){save.disabled=false;save.removeAttribute('disabled')}};input.onkeydown=event=>{if(event.key==='Enter'){event.preventDefault();saveSteps()}if(event.key==='Escape'){const editor=host.querySelector('#journalStepEditor');if(editor)editor.hidden=true}}}
    host.querySelectorAll('[data-journal-water]').forEach(button=>{button.disabled=false;button.style.pointerEvents='auto';button.onclick=()=>writeWater(waterAmount()+Number(button.dataset.journalWater))});
    const undo=assign('#journalWaterUndo',undoWater);if(undo){const active=waterAmount()>0;undo.disabled=!active;undo.style.opacity=active?'1':'.45';undo.style.pointerEvents=active?'auto':'none'}
    host.querySelectorAll('[data-journal-gym]').forEach(button=>{button.onclick=()=>setBoolean('gym',button.dataset.journalGym==='true')});
    host.querySelectorAll('[data-journal-alcohol]').forEach(button=>{button.onclick=()=>setBoolean('alcohol',button.dataset.journalAlcohol==='true')});
    const yes=host.querySelector('[data-journal-alcohol="true"]');const no=host.querySelector('[data-journal-alcohol="false"]');if(yes&&no&&yes.parentElement===no.parentElement)yes.parentElement.insertBefore(yes,no);
    assign('#journalPrevDay',()=>changeDay(-1));
    const next=assign('#journalNextDay',()=>changeDay(1));if(next){next.disabled=selectedDate>=todayKey();next.style.pointerEvents=next.disabled?'none':'auto'}
    assign('#journalDateButton',openCalendar);
    assign('#journalCalendarButton',openCalendar);
    const picker=document.querySelector('#datePicker');if(picker){picker.max=todayKey();picker.value=selectedDate;picker.onchange=()=>{if(picker.value&&validDateKey(picker.value)){selectedDate=picker.value>todayKey()?todayKey():picker.value;rerender()}}}
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  const previousRender=window.render;
  if(typeof previousRender==='function')window.render=function(){previousRender();bind()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(bind,120),{once:true});else setTimeout(bind,120);
})();