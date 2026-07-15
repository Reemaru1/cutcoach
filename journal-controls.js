'use strict';
(function(){
  const VERSION='6.0.3';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_UNDO_KEY='cutcoach_water_undo_v3';
  const WATER_MAX=6000;

  function root(){return document.querySelector('#today560')}
  function waterMap(){try{const value=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
  function waterAmount(){return Math.max(0,Math.min(WATER_MAX,Math.round(Number(waterMap()[selectedDate])||0)))}
  function persist(key,value){try{if(typeof writeStorage==='function')return writeStorage(key,value)!==false;localStorage.setItem(key,value);return true}catch{return false}}
  function storeUndo(previous,current){persist(WATER_UNDO_KEY,JSON.stringify({date:selectedDate,previous,current,at:Date.now()}))}
  function undoRecord(){try{return JSON.parse(localStorage.getItem(WATER_UNDO_KEY)||'null')}catch{return null}}
  function clearUndo(){try{localStorage.removeItem(WATER_UNDO_KEY)}catch{}}

  function writeWater(next,remember=true){
    const previous=waterAmount(),amount=Math.max(0,Math.min(WATER_MAX,Math.round(Number(next)||0))),all=waterMap();
    if(amount===previous)return true;
    if(amount)all[selectedDate]=amount;else delete all[selectedDate];
    if(!persist(WATER_KEY,JSON.stringify(all))){toast?.('Wasser konnte nicht gespeichert werden.');return false}
    if(remember)storeUndo(previous,amount);
    window.render?.();
    return true;
  }
  function undoWater(){
    const current=waterAmount(),record=undoRecord();
    if(record&&record.date===selectedDate&&Number(record.current)===current){
      clearUndo();
      if(writeWater(record.previous,false))toast?.('Letzte Wasseränderung zurückgenommen.');
      return;
    }
    if(current>0){
      if(writeWater(Math.max(0,current-250),false))toast?.('250 ml zurückgenommen.');
      return;
    }
    toast?.('Keine Wasseränderung zum Rückgängigmachen vorhanden.');
  }

  function syncStepSave(){
    const host=root(),input=host?.querySelector('#journalStepInput'),save=host?.querySelector('#journalStepSave');
    if(!input||!save)return;
    const raw=String(input.value??'').trim(),value=Number(raw);
    save.disabled=!(raw!==''&&Number.isInteger(value)&&value>=0&&value<=100000);
  }
  function openStepEditor(){
    const host=root(),editor=host?.querySelector('#journalStepEditor'),input=host?.querySelector('#journalStepInput'),toggle=host?.querySelector('#journalStepToggle');
    if(!editor||!input)return;
    editor.hidden=!editor.hidden;
    toggle?.setAttribute('aria-expanded',String(!editor.hidden));
    if(!editor.hidden){input.value=day(selectedDate,false).steps??'';syncStepSave();setTimeout(()=>input.focus(),20)}
  }
  function saveSteps(){
    const host=root(),input=host?.querySelector('#journalStepInput'),editor=host?.querySelector('#journalStepEditor'),value=Number(String(input?.value??'').trim());
    if(!Number.isInteger(value)||value<0||value>100000){toast?.('Bitte ganze Schritte zwischen 0 und 100.000 eingeben.');return}
    const data=day();data.steps=value;
    try{saveState?.(true)}catch{}
    if(editor)editor.hidden=true;
    window.render?.();
    toast?.('Schritte gespeichert.');
  }
  function clearStepsDirect(){
    if(day(selectedDate,false).steps===null)return;
    day().steps=null;pruneDay?.();
    try{saveState?.(true)}catch{}
    window.render?.();toast?.('Schritte entfernt.');
  }
  function openWeight(){
    const data=day(selectedDate,false),input=document.querySelector('#weightInput'),clear=document.querySelector('#clearWeight');
    if(input)input.value=data.weight??'';if(clear)clear.hidden=data.weight===null;openModal?.('weightModal');
  }
  function setBoolean(field,value){
    day()[field]=value;
    try{saveState?.(true)}catch{}
    window.render?.();
    toast?.(field==='gym'?(value?'Training eingetragen.':'Ruhetag eingetragen.'):(value?'Alkohol eingetragen.':'Alkoholfrei eingetragen.'));
  }

  function reorderAlcohol(){
    const host=root(),yes=host?.querySelector('[data-journal-alcohol="true"]'),no=host?.querySelector('[data-journal-alcohol="false"]'),wrap=yes?.parentElement;
    if(!wrap||!no)return;
    wrap.insertBefore(yes,no);
    yes.style.order='1';no.style.order='2';
  }
  function enableControls(){
    const host=root();if(!host)return;
    host.querySelectorAll('button,input').forEach(node=>{node.style.pointerEvents='auto'});
    host.querySelectorAll('.journal-steps-card,.journal-water-card,.journal-check-card').forEach(card=>{card.style.pointerEvents='auto';card.style.position='relative';card.style.zIndex='2'});
    const input=host.querySelector('#journalStepInput');
    if(input&&!input.dataset.control603){input.dataset.control603='1';input.addEventListener('input',syncStepSave)}
    syncStepSave();
    const undo=host.querySelector('#journalWaterUndo');if(undo){undo.disabled=waterAmount()<=0;undo.removeAttribute('aria-disabled')}
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