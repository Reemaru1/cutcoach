'use strict';
(function(){
  const VERSION='6.0.2';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v2';
  const WATER_MAX=6000;

  function root(){return document.querySelector('#today560')}
  function waterMap(){try{const value=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
  function waterAmount(){const all=waterMap();return Math.max(0,Math.min(WATER_MAX,Math.round(Number(all[selectedDate])||0)))}
  function storeUndo(previous,current){try{sessionStorage.setItem(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current,at:Date.now()}))}catch{}}
  function undoRecord(){try{return JSON.parse(sessionStorage.getItem(WATER_UNDO_KEY)||'null')}catch{return null}}
  function clearUndo(){try{sessionStorage.removeItem(WATER_UNDO_KEY)}catch{}}
  function writeWater(next,remember=true){
    const previous=waterAmount(),amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0))),all=waterMap();
    if(remember&&amount!==previous)storeUndo(previous,amount);
    if(amount)all[selectedDate]=amount;else delete all[selectedDate];
    try{localStorage.setItem(WATER_KEY,JSON.stringify(all));window.render?.()}catch{toast?.('Wasser konnte nicht gespeichert werden.')}
  }
  function undoWater(){const record=undoRecord();if(!record||record.date!==selectedDate||Number(record.current)!==waterAmount()){toast?.('Keine letzte Wasseränderung vorhanden.');return}clearUndo();writeWater(record.previous,false);toast?.('Letzte Wasseränderung zurückgenommen.')}

  function openStepEditor(){
    const host=root(),editor=host?.querySelector('#journalStepEditor'),input=host?.querySelector('#journalStepInput'),toggle=host?.querySelector('#journalStepToggle');
    if(!editor)return;editor.hidden=!editor.hidden;toggle?.setAttribute('aria-expanded',String(!editor.hidden));
    if(!editor.hidden){input.value=day(selectedDate,false).steps??'';setTimeout(()=>input.focus(),20)}
  }
  function saveSteps(){
    const host=root(),input=host?.querySelector('#journalStepInput'),editor=host?.querySelector('#journalStepEditor'),value=Number(String(input?.value??'').trim());
    if(!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    day().steps=value;editor.hidden=true;window.render?.();toast?.('Schritte gespeichert.')
  }
  function clearStepsDirect(){if(day(selectedDate,false).steps===null)return;day().steps=null;pruneDay?.();window.render?.();toast?.('Schritte entfernt.')}
  function openWeight(){
    const data=day(selectedDate,false),input=document.querySelector('#weightInput'),clear=document.querySelector('#clearWeight');
    if(input)input.value=data.weight??'';if(clear)clear.hidden=data.weight===null;openModal?.('weightModal')
  }
  function setBoolean(field,value){day()[field]=value;window.render?.();toast?.(field==='gym'?(value?'Training eingetragen.':'Ruhetag eingetragen.'):(value?'Alkohol eingetragen.':'Alkoholfrei eingetragen.'))}

  function reorderAlcohol(){
    const host=root(),wrap=host?.querySelector('[data-journal-alcohol]')?.parentElement;if(!wrap)return;
    const yes=wrap.querySelector('[data-journal-alcohol="true"]'),no=wrap.querySelector('[data-journal-alcohol="false"]');
    if(yes&&no&&wrap.firstElementChild!==yes){wrap.append(yes,no)}
  }
  function enableControls(){
    const host=root();if(!host)return;
    host.querySelectorAll('button,input').forEach(node=>{node.style.pointerEvents='auto'});
    host.querySelectorAll('.journal-steps-card,.journal-water-card,.journal-check-card').forEach(card=>{card.style.pointerEvents='auto';card.style.position='relative';card.style.zIndex='2'});
    reorderAlcohol();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }

  document.addEventListener('click',event=>{
    const target=event.target.closest('#today560 button');if(!target)return;
    if(target.matches('#journalStepToggle')){event.preventDefault();event.stopImmediatePropagation();openStepEditor();return}
    if(target.matches('#journalStepSave')){event.preventDefault();event.stopImmediatePropagation();saveSteps();return}
    if(target.matches('#journalStepClear')){event.preventDefault();event.stopImmediatePropagation();clearStepsDirect();return}
    if(target.matches('[data-journal-water]')){event.preventDefault();event.stopImmediatePropagation();writeWater(waterAmount()+Number(target.dataset.journalWater));return}
    if(target.matches('#journalWaterUndo')){event.preventDefault();event.stopImmediatePropagation();undoWater();return}
    if(target.matches('#journalWeightButton')){event.preventDefault();event.stopImmediatePropagation();openWeight();return}
    if(target.matches('[data-journal-gym]')){event.preventDefault();event.stopImmediatePropagation();setBoolean('gym',target.dataset.journalGym==='true');return}
    if(target.matches('[data-journal-alcohol]')){event.preventDefault();event.stopImmediatePropagation();setBoolean('alcohol',target.dataset.journalAlcohol==='true');return}
  },true);

  document.addEventListener('keydown',event=>{
    if(event.target?.id!=='journalStepInput')return;
    if(event.key==='Enter'){event.preventDefault();saveSteps()}
    if(event.key==='Escape'){const editor=root()?.querySelector('#journalStepEditor');if(editor)editor.hidden=true}
  });

  const base=window.render;
  if(typeof base==='function')window.render=function(){base();enableControls()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enableControls,{once:true});else enableControls();
})();