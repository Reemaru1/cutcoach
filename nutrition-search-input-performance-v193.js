'use strict';
(function(){
  const VERSION='1.9.8-alpha';
  const IDLE_MS=230;
  const PASTE_MS=110;
  const MIN_QUERY_LENGTH=2;
  let timer=0,token=0,pendingInput=null,nativeInputCount=0,releaseCount=0,lastReason='',lastDelay=IDLE_MS,typingBursts=0,composing=false;

  const isNutritionSearch=input=>input?.id==='nutritionSearch';
  const queryLength=input=>Array.from(String(input?.value||'').trim()).length;
  const bypassed=input=>input?.dataset?.v198Release==='1'||input?.dataset?.v193Release==='1'||input?.dataset?.v195Release==='1'||input?.dataset?.v192Bypass==='1'||input?.dataset?.voicePreview==='1'||input?.dataset?.composing==='1';

  function clearPending(){
    clearTimeout(timer);timer=0;pendingInput=null;token++;
  }

  function release(input,reason='idle'){
    if(!isNutritionSearch(input)||!input.isConnected)return false;
    clearTimeout(timer);timer=0;pendingInput=null;token++;lastReason=reason;releaseCount++;
    input.dataset.v198Release='1';
    input.dataset.v193Release='1';
    input.dataset.v195Release='1';
    const event=typeof InputEvent==='function'
      ?new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:null})
      :new Event('input',{bubbles:true});
    input.dispatchEvent(event);
    queueMicrotask(()=>{
      delete input.dataset.v198Release;
      delete input.dataset.v193Release;
      delete input.dataset.v195Release;
    });
    try{window.dispatchEvent(new CustomEvent('cutcoach:search-input-released',{detail:{value:input.value,reason,delay:lastDelay}}))}catch{}
    return true;
  }

  function schedule(input,event){
    clearTimeout(timer);timer=0;pendingInput=input;const current=++token;nativeInputCount++;typingBursts++;
    const length=queryLength(input);
    if(!length){queueMicrotask(()=>{if(current===token&&input.isConnected)release(input,'clear')});return}
    if(length<MIN_QUERY_LENGTH)return;
    lastDelay=event?.inputType==='insertFromPaste'||event?.inputType==='insertFromDrop'?PASTE_MS:IDLE_MS;
    timer=setTimeout(()=>{
      timer=0;
      if(current!==token||!input.isConnected)return;
      release(input,lastDelay===PASTE_MS?'paste':'idle');
    },lastDelay);
  }

  function handleBeforeInput(event){
    const input=event.target;
    if(!isNutritionSearch(input)||bypassed(input)||composing)return;
    event.stopImmediatePropagation();
  }

  function handleInput(event){
    const input=event.target;
    if(!isNutritionSearch(input)||bypassed(input)||composing)return;
    event.stopImmediatePropagation();
    schedule(input,event);
  }

  function handleKeydown(event){
    const input=event.target;if(!isNutritionSearch(input))return;
    if(event.key==='Escape'){clearPending();return}
    if(event.key!=='Enter')return;
    event.preventDefault();event.stopImmediatePropagation();release(input,'enter');
  }

  function handleCompositionStart(event){
    if(!isNutritionSearch(event.target))return;composing=true;clearPending();
  }

  function handleCompositionEnd(event){
    const input=event.target;if(!isNutritionSearch(input))return;composing=false;queueMicrotask(()=>{if(input.isConnected)schedule(input,event)});
  }

  window.addEventListener('beforeinput',handleBeforeInput,true);
  window.addEventListener('input',handleInput,true);
  window.addEventListener('keydown',handleKeydown,true);
  window.addEventListener('pagehide',clearPending);
  document.addEventListener('compositionstart',handleCompositionStart,true);
  document.addEventListener('compositionend',handleCompositionEnd,true);

  window.CutCoachSearchInputPerformance193=Object.freeze({
    version:VERSION,
    debounceMs:IDLE_MS,
    debounceRange:Object.freeze({min:IDLE_MS,max:IDLE_MS}),
    idleMs:IDLE_MS,
    pasteMs:PASTE_MS,
    shortQueryLength:MIN_QUERY_LENGTH,
    flush(reason='manual'){const input=pendingInput||document.querySelector('#nutritionSearch');return input?release(input,reason):false},
    cancel:clearPending,
    stats:()=>Object.freeze({pending:Boolean(timer),releaseCount,nativeInputCount,lastDelay,lastReason,typingBursts,typing:false,noticeCount:0})
  });
})();
