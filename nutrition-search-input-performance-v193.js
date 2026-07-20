'use strict';
(function(){
  const VERSION='1.9.3-alpha';
  const DEBOUNCE_MS=110;
  let timer=0,token=0,pendingInput=null,releaseCount=0;

  const isNutritionSearch=input=>input?.id==='nutritionSearch';
  function clearPending(){clearTimeout(timer);timer=0;pendingInput=null;token++}
  function release(input,reason='idle'){
    if(!isNutritionSearch(input)||!input.isConnected)return false;
    input.dataset.v193Release='1';
    releaseCount++;
    const event=typeof InputEvent==='function'?new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:null}):new Event('input',{bubbles:true});
    input.dispatchEvent(event);
    queueMicrotask(()=>{if(input.dataset.v193Release==='1')delete input.dataset.v193Release});
    try{window.dispatchEvent(new CustomEvent('cutcoach:search-input-released',{detail:{value:input.value,reason}}))}catch{}
    return true;
  }
  function schedule(input){
    clearTimeout(timer);const current=++token;pendingInput=input;
    timer=setTimeout(()=>{timer=0;if(current!==token||!input.isConnected)return;pendingInput=null;release(input,'idle')},DEBOUNCE_MS);
  }
  function handleInput(event){
    const input=event.target;
    if(!isNutritionSearch(input)||input.dataset.v193Release==='1'||input.dataset.v192Bypass==='1'||input.dataset.composing==='1'||input.dataset.voicePreview==='1')return;
    event.stopImmediatePropagation();
    schedule(input);
  }
  function handleKeydown(event){
    const input=event.target;if(!isNutritionSearch(input))return;
    if(event.key==='Escape'){clearPending();return}
    if(event.key!=='Enter'||!timer)return;
    clearTimeout(timer);timer=0;pendingInput=null;token++;release(input,'enter');
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
    debounceMs:DEBOUNCE_MS,
    flush(reason='manual'){const input=pendingInput||document.querySelector('#nutritionSearch');if(!input)return false;clearTimeout(timer);timer=0;pendingInput=null;token++;return release(input,reason)},
    cancel:clearPending,
    stats:()=>Object.freeze({pending:Boolean(timer),releaseCount})
  });
})();
