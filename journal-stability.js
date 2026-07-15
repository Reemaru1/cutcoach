'use strict';
(function(){
  const VERSION='6.0.4';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v3';
  const WATER_MAX=6000;
  const root=()=>document.querySelector('#today560');
  const readJson=(key,fallback={})=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}};
  const waterMap=()=>readJson(WATER_KEY,{});
  const waterAmount=()=>Math.max(0,Math.min(WATER_MAX,Math.round(Number(waterMap()[selectedDate])||0)));
  const persistState=()=>{if(typeof saveState==='function'&&!saveState(true))throw new Error('state-save-failed')};
  function saveStepsDirect(){
    const host=root(),input=host?.querySelector('#journalStepInput'),editor=host?.querySelector('#journalStepEditor');
    const raw=String(input?.value??'').trim(),value=Number(raw);
    if(raw===''||!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    day().steps=value;
    try{persistState()}catch{toast?.('Schritte konnten nicht gespeichert werden.');return}
    if(editor)editor.hidden=true;
    window.render?.();
    toast?.(`${value.toLocaleString('de-DE')} Schritte gespeichert.`);
  }
  function clearStepsDirect(){
    day().steps=null;pruneDay?.();
    try{persistState()}catch{toast?.('Schritte konnten nicht entfernt werden.');return}
    window.render?.();toast?.('Schritte entfernt.');
  }
  function writeWaterDirect(next,remember=true){
    const previous=waterAmount(),amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0))),all=waterMap();
    if(remember&&amount!==previous){try{localStorage.setItem(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current:amount,at:Date.now()}))}catch{}}
    if(amount>0)all[selectedDate]=amount;else delete all[selectedDate];
    try{
      localStorage.setItem(WATER_KEY,JSON.stringify(all));
      const verified=Math.round(Number(readJson(WATER_KEY,{})[selectedDate])||0);
      if(verified!==amount)throw new Error('verify-failed');
    }catch(error){console.error(error);toast?.('Wasser konnte nicht gespeichert werden.');return false}
    window.render?.();return true;
  }
  function undoWaterDirect(){
    const current=waterAmount();
    if(current<=0){toast?.('Kein Wassereintrag zum Rückgängigmachen vorhanden.');return}
    let target=Math.max(0,current-250);
    const record=readJson(WATER_UNDO_KEY,null);
    if(record&&record.date===selectedDate&&Number(record.current)===current&&Number.isFinite(Number(record.previous)))target=Math.max(0,Number(record.previous));
    if(writeWaterDirect(target,false)){
      try{localStorage.removeItem(WATER_UNDO_KEY)}catch{}
      toast?.('Letzte Wasseränderung zurückgenommen.');
    }
  }
  function setBooleanDirect(field,value){
    day()[field]=value;
    try{persistState()}catch{toast?.('Angabe konnte nicht gespeichert werden.');return}
    window.render?.();
  }
  function changeDay(delta){
    const next=shiftKey(selectedDate,delta);
    if(next>todayKey())return;
    selectedDate=next;window.render?.();
  }
  function ensureCalendar(){
    const host=root(),button=host?.querySelector('#journalCalendarButton');if(!button)return;
    button.disabled=false;button.style.pointerEvents='auto';button.style.position='relative';
    let input=button.querySelector('.journal-calendar-input');
    if(!input){input=document.createElement('input');input.type='date';input.className='journal-calendar-input';input.setAttribute('aria-label','Datum auswählen');button.append(input)}
    input.max=todayKey();input.value=selectedDate;input.disabled=false;
    Object.assign(input.style,{position:'absolute',inset:'0',width:'100%',height:'100%',opacity:'0.01',zIndex:'5',pointerEvents:'auto',cursor:'pointer'});
    if(!input.dataset.stabilityBound){input.dataset.stabilityBound='1';input.addEventListener('change',()=>{if(input.value&&validDateKey(input.value)){selectedDate=input.value>todayKey()?todayKey():input.value;window.render?.()}})}
  }
  function reorderAlcohol(){
    const host=root(),yes=host?.querySelector('[data-journal-alcohol="true"]'),no=host?.querySelector('[data-journal-alcohol="false"]');
    const wrap=yes?.parentElement;if(!wrap||!no)return;
    wrap.insertBefore(yes,no);yes.style.order='1';no.style.order='2';
  }
  function stabilize(){
    const host=root();if(!host)return;
    const save=host.querySelector('#journalStepSave');if(save){save.disabled=false;save.removeAttribute('disabled');save.style.pointerEvents='auto';save.style.opacity='1'}
    const undo=host.querySelector('#journalWaterUndo');if(undo){const active=waterAmount()>0;undo.disabled=!active;undo.toggleAttribute('disabled',!active);undo.style.pointerEvents=active?'auto':'none';undo.style.opacity=active?'1':'.45'}
    const prev=host.querySelector('#journalPrevDay');if(prev){prev.disabled=false;prev.style.pointerEvents='auto'}
    const next=host.querySelector('#journalNextDay');if(next){next.disabled=selectedDate>=todayKey();next.style.pointerEvents=next.disabled?'none':'auto'}
    reorderAlcohol();ensureCalendar();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  document.addEventListener('click',event=>{
    const target=event.target.closest('#today560 button');if(!target)return;
    if(target.id==='journalStepSave'){event.preventDefault();event.stopImmediatePropagation();saveStepsDirect();return}
    if(target.id==='journalStepClear'){event.preventDefault();event.stopImmediatePropagation();clearStepsDirect();return}
    if(target.id==='journalWaterUndo'){event.preventDefault();event.stopImmediatePropagation();undoWaterDirect();return}
    if(target.matches('[data-journal-water]')){event.preventDefault();event.stopImmediatePropagation();writeWaterDirect(waterAmount()+Number(target.dataset.journalWater));return}
    if(target.matches('[data-journal-gym]')){event.preventDefault();event.stopImmediatePropagation();setBooleanDirect('gym',target.dataset.journalGym==='true');return}
    if(target.matches('[data-journal-alcohol]')){event.preventDefault();event.stopImmediatePropagation();setBooleanDirect('alcohol',target.dataset.journalAlcohol==='true');return}
    if(target.id==='journalPrevDay'){event.preventDefault();event.stopImmediatePropagation();changeDay(-1);return}
    if(target.id==='journalNextDay'){event.preventDefault();event.stopImmediatePropagation();changeDay(1);return}
    if(target.id==='journalDateButton'){event.preventDefault();event.stopImmediatePropagation();const input=root()?.querySelector('.journal-calendar-input');try{input?.showPicker?.()}catch{}input?.focus();return}
  },true);
  document.addEventListener('input',event=>{if(event.target?.id==='journalStepInput'){const button=root()?.querySelector('#journalStepSave');if(button){button.disabled=false;button.removeAttribute('disabled');button.style.opacity='1'}}},true);
  const base=window.render;
  if(typeof base==='function')window.render=function(){base();stabilize()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(stabilize,250),{once:true});else setTimeout(stabilize,250);
})();