'use strict';
(function(){
  const VERSION='6.0.5';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v5';
  const WATER_MAX=6000;
  const root=()=>document.querySelector('#today560');
  const readJson=(key,fallback={})=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}};
  const waterMap=()=>readJson(WATER_KEY,{});
  const waterAmount=()=>Math.max(0,Math.min(WATER_MAX,Math.round(Number(waterMap()[selectedDate])||0)));
  function persistApp(){if(typeof saveState!=='function')return false;return saveState(true)!==false}
  function saveSteps(){
    const host=root(),input=host?.querySelector('#journalStepInput'),editor=host?.querySelector('#journalStepEditor');
    const raw=String(input?.value??'').trim(),value=Number(raw);
    if(raw===''||!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    const data=day(selectedDate,true);data.steps=value;
    if(!persistApp()){toast?.('Schritte konnten nicht gespeichert werden.');return}
    const stored=readJson('cutcoach_v2',{});if(Number(stored?.days?.[selectedDate]?.steps)!==value){toast?.('Schritte konnten nicht dauerhaft gespeichert werden.');return}
    if(editor)editor.hidden=true;
    window.render?.();toast?.(`${value.toLocaleString('de-DE')} Schritte gespeichert.`);
  }
  function clearSteps(){const data=day(selectedDate,true);data.steps=null;pruneDay?.(selectedDate);if(!persistApp()){toast?.('Schritte konnten nicht entfernt werden.');return}window.render?.();toast?.('Schritte entfernt.')}
  function writeWater(next,remember=true){
    const previous=waterAmount(),amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0))),all=waterMap();
    if(remember&&amount!==previous)localStorage.setItem(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current:amount,at:Date.now()}));
    if(amount)all[selectedDate]=amount;else delete all[selectedDate];
    try{localStorage.setItem(WATER_KEY,JSON.stringify(all));if(Math.round(Number(readJson(WATER_KEY,{})[selectedDate])||0)!==amount)throw new Error('verify');}
    catch(error){console.error(error);toast?.('Wasser konnte nicht gespeichert werden.');return}
    window.render?.();
  }
  function undoWater(){
    const current=waterAmount();if(current<=0){toast?.('Kein Wassereintrag vorhanden.');return}
    const record=readJson(WATER_UNDO_KEY,null);let target=Math.max(0,current-250);
    if(record&&record.date===selectedDate&&Number(record.current)===current&&Number.isFinite(Number(record.previous)))target=Math.max(0,Number(record.previous));
    writeWater(target,false);localStorage.removeItem(WATER_UNDO_KEY);toast?.('Wasserstand zurückgesetzt.');
  }
  function setBoolean(field,value){day(selectedDate,true)[field]=value;if(!persistApp()){toast?.('Angabe konnte nicht gespeichert werden.');return}window.render?.()}
  function changeDay(delta){const next=shiftKey(selectedDate,delta);if(next>todayKey())return;selectedDate=next;window.render?.()}
  function bindCalendar(){
    const host=root(),button=host?.querySelector('#journalCalendarButton');if(!button)return;
    let input=button.querySelector('.journal-calendar-input');
    if(!input){input=document.createElement('input');input.type='date';input.className='journal-calendar-input';input.setAttribute('aria-label','Datum auswählen');button.append(input)}
    input.min='2020-01-01';input.max=todayKey();input.value=selectedDate;input.disabled=false;
    Object.assign(input.style,{position:'absolute',inset:'0',width:'100%',height:'100%',opacity:'0.01',zIndex:'20',pointerEvents:'auto'});
    if(!input.dataset.boundFinal){input.dataset.boundFinal='1';input.addEventListener('change',()=>{if(input.value&&validDateKey(input.value)){selectedDate=input.value>todayKey()?todayKey():input.value;window.render?.()}})}
  }
  function stabilize(){
    const host=root();if(!host)return;
    const save=host.querySelector('#journalStepSave');if(save){save.disabled=false;save.removeAttribute('disabled');save.style.pointerEvents='auto';save.style.opacity='1'}
    const undo=host.querySelector('#journalWaterUndo');if(undo){const active=waterAmount()>0;undo.disabled=!active;undo.toggleAttribute('disabled',!active);undo.style.pointerEvents=active?'auto':'none';undo.style.opacity=active?'1':'.45'}
    const prev=host.querySelector('#journalPrevDay');if(prev){prev.disabled=false;prev.style.pointerEvents='auto'}
    const next=host.querySelector('#journalNextDay');if(next){next.disabled=selectedDate>=todayKey();next.style.pointerEvents=next.disabled?'none':'auto'}
    const yes=host.querySelector('[data-journal-alcohol="true"]'),no=host.querySelector('[data-journal-alcohol="false"]');if(yes&&no&&yes.parentElement===no.parentElement)yes.parentElement.insertBefore(yes,no);
    bindCalendar();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  function handle(target,event){
    if(target.id==='journalStepSave'){event.preventDefault();event.stopImmediatePropagation();saveSteps();return true}
    if(target.id==='journalStepClear'){event.preventDefault();event.stopImmediatePropagation();clearSteps();return true}
    if(target.id==='journalWaterUndo'){event.preventDefault();event.stopImmediatePropagation();undoWater();return true}
    if(target.matches('[data-journal-water]')){event.preventDefault();event.stopImmediatePropagation();writeWater(waterAmount()+Number(target.dataset.journalWater));return true}
    if(target.matches('[data-journal-gym]')){event.preventDefault();event.stopImmediatePropagation();setBoolean('gym',target.dataset.journalGym==='true');return true}
    if(target.matches('[data-journal-alcohol]')){event.preventDefault();event.stopImmediatePropagation();setBoolean('alcohol',target.dataset.journalAlcohol==='true');return true}
    if(target.id==='journalPrevDay'){event.preventDefault();event.stopImmediatePropagation();changeDay(-1);return true}
    if(target.id==='journalNextDay'){event.preventDefault();event.stopImmediatePropagation();changeDay(1);return true}
    if(target.id==='journalDateButton'){event.preventDefault();event.stopImmediatePropagation();const input=root()?.querySelector('.journal-calendar-input');try{input?.showPicker?.()}catch{}input?.focus();return true}
    return false;
  }
  document.addEventListener('pointerdown',event=>{const target=event.target.closest('#today560 button');if(target)handle(target,event)},true);
  document.addEventListener('click',event=>{const target=event.target.closest('#today560 button');if(target)handle(target,event)},true);
  document.addEventListener('input',event=>{if(event.target?.id==='journalStepInput'){const save=root()?.querySelector('#journalStepSave');if(save){save.disabled=false;save.removeAttribute('disabled');save.style.opacity='1'}}},true);
  const observer=new MutationObserver(()=>requestAnimationFrame(stabilize));
  observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled','hidden']});
  const base=window.render;if(typeof base==='function')window.render=function(){base();stabilize()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(stabilize,150),{once:true});else setTimeout(stabilize,150);
})();