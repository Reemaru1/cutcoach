'use strict';
(function(){
  const VERSION='1.9.5-alpha';
  const MIN_DEBOUNCE_MS=320;
  const DEFAULT_DEBOUNCE_MS=420;
  const MAX_DEBOUNCE_MS=540;
  let timer=0,frame=0,token=0,pendingInput=null,releaseCount=0,nativeInputCount=0,lastInputAt=0,lastDelay=DEFAULT_DEBOUNCE_MS;

  const isNutritionSearch=input=>input?.id==='nutritionSearch';
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  function cancelFrame(){if(frame){cancelAnimationFrame(frame);frame=0}}
  function clearPending(){clearTimeout(timer);timer=0;cancelFrame();pendingInput=null;token++}
  function adaptiveDelay(now){
    const interval=lastInputAt?Math.max(0,now-lastInputAt):0;
    lastInputAt=now;
    if(!interval)return DEFAULT_DEBOUNCE_MS;
    return Math.round(clamp(interval*1.35+160,MIN_DEBOUNCE_MS,MAX_DEBOUNCE_MS));
  }
  function release(input,reason='idle'){
    if(!isNutritionSearch(input)||!input.isConnected)return false;
    input.dataset.v193Release='1';
    input.dataset.v195Release='1';
    releaseCount++;
    const event=typeof InputEvent==='function'?new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:null}):new Event('input',{bubbles:true});
    input.dispatchEvent(event);
    queueMicrotask(()=>{delete input.dataset.v193Release;delete input.dataset.v195Release});
    try{window.dispatchEvent(new CustomEvent('cutcoach:search-input-released',{detail:{value:input.value,reason,delay:lastDelay}}))}catch{}
    return true;
  }
  function releaseAfterPaint(input,current,reason){
    cancelFrame();
    frame=requestAnimationFrame(()=>{
      frame=0;
      if(current!==token||!input.isConnected)return;
      pendingInput=null;
      setTimeout(()=>{if(current===token&&input.isConnected)release(input,reason)},0);
    });
  }
  function schedule(input){
    clearTimeout(timer);cancelFrame();
    const current=++token,now=performance.now?.()||Date.now();
    pendingInput=input;nativeInputCount++;lastDelay=adaptiveDelay(now);
    try{window.dispatchEvent(new CustomEvent('cutcoach:search-input-pending',{detail:{value:input.value,delay:lastDelay}}))}catch{}
    if(!String(input.value||'').trim()){
      timer=0;releaseAfterPaint(input,current,'clear');return;
    }
    timer=setTimeout(()=>{timer=0;if(current!==token||!input.isConnected)return;releaseAfterPaint(input,current,'idle')},lastDelay);
  }
  function handleInput(event){
    const input=event.target;
    if(!isNutritionSearch(input)||input.dataset.v193Release==='1'||input.dataset.v195Release==='1'||input.dataset.v192Bypass==='1'||input.dataset.composing==='1'||input.dataset.voicePreview==='1')return;
    event.stopImmediatePropagation();
    schedule(input);
  }
  function handleKeydown(event){
    const input=event.target;if(!isNutritionSearch(input))return;
    if(event.key==='Escape'){clearPending();return}
    if(event.key!=='Enter'||(!timer&&!frame))return;
    clearTimeout(timer);timer=0;cancelFrame();pendingInput=null;token++;release(input,'enter');
  }
  function handleCompositionEnd(event){
    const input=event.target;if(!isNutritionSearch(input))return;
    queueMicrotask(()=>{if(input.isConnected&&!input.dataset.composing)schedule(input)});
  }

  window.addEventListener('input',handleInput,true);
  window.addEventListener('keydown',handleKeydown,true);
  document.addEventListener('compositionend',handleCompositionEnd,true);
  window.CutCoachSearchInputPerformance193=Object.freeze({
    version:VERSION,
    debounceMs:DEFAULT_DEBOUNCE_MS,
    debounceRange:Object.freeze({min:MIN_DEBOUNCE_MS,max:MAX_DEBOUNCE_MS}),
    flush(reason='manual'){const input=pendingInput||document.querySelector('#nutritionSearch');if(!input)return false;clearTimeout(timer);timer=0;cancelFrame();pendingInput=null;token++;return release(input,reason)},
    cancel:clearPending,
    stats:()=>Object.freeze({pending:Boolean(timer||frame),releaseCount,nativeInputCount,lastDelay})
  });
})();
