'use strict';
(function(){
  const VERSION='1.9.7-alpha';
  const MIN_DEBOUNCE_MS=560;
  const DEFAULT_DEBOUNCE_MS=680;
  const MAX_DEBOUNCE_MS=900;
  const SHORT_QUERY_LENGTH=2;
  const PASTE_DEBOUNCE_MS=90;
  const DELETE_DEBOUNCE_MS=440;
  let timer=0,frame=0,noticeFrame=0,token=0,pendingInput=null,pendingNoticeInput=null,releaseCount=0,nativeInputCount=0,lastInputAt=0,lastDelay=DEFAULT_DEBOUNCE_MS,noticeCount=0,typingBursts=0,typing=false;

  const isNutritionSearch=input=>input?.id==='nutritionSearch';
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const queryLength=input=>Array.from(String(input?.value||'').trim()).length;
  function installTypingStyle(){
    if(document.querySelector('style[data-search-typing-performance-v197]'))return;
    const style=document.createElement('style');
    style.dataset.searchTypingPerformanceV197='1';
    style.textContent=`body.cutcoach-search-typing.nutrition-mode #nutritionMultiSearch,body.cutcoach-search-typing.nutrition-mode .nutrition-results{visibility:hidden!important}body.cutcoach-search-typing.nutrition-mode .nutrition-shell *,body.cutcoach-search-typing.nutrition-mode .nutrition-shell *::before,body.cutcoach-search-typing.nutrition-mode .nutrition-shell *::after{animation-play-state:paused!important;transition:none!important}body.cutcoach-search-typing.nutrition-mode .nutrition-search-card,body.cutcoach-search-typing.nutrition-mode .nutrition-search-row,body.cutcoach-search-typing.nutrition-mode #nutritionMultiSearch{backdrop-filter:none!important;-webkit-backdrop-filter:none!important;box-shadow:none!important}`;
    (document.head||document.documentElement).append(style);
  }
  function setTyping(active,input=pendingInput){
    const next=Boolean(active);if(typing===next){if(input){if(next)input.dataset.searchTyping='1';else delete input.dataset.searchTyping}return}
    typing=next;
    document.body?.classList.toggle('cutcoach-search-typing',next);
    if(input){if(next)input.dataset.searchTyping='1';else delete input.dataset.searchTyping}
    if(next)typingBursts++;
  }
  function cancelFrame(){if(frame){cancelAnimationFrame(frame);frame=0}}
  function cancelNotice(){if(noticeFrame){cancelAnimationFrame(noticeFrame);noticeFrame=0}pendingNoticeInput=null}
  function clearPending(){clearTimeout(timer);timer=0;cancelFrame();cancelNotice();const input=pendingInput;pendingInput=null;token++;setTyping(false,input)}
  function adaptiveDelay(now,event){
    if(event?.inputType==='insertFromPaste'||event?.inputType==='insertFromDrop')return PASTE_DEBOUNCE_MS;
    if(String(event?.inputType||'').startsWith('delete'))return DELETE_DEBOUNCE_MS;
    const interval=lastInputAt?Math.max(0,now-lastInputAt):0;
    lastInputAt=now;
    if(!interval)return DEFAULT_DEBOUNCE_MS;
    return Math.round(clamp(interval*.7+500,MIN_DEBOUNCE_MS,MAX_DEBOUNCE_MS));
  }
  function notifyPending(input){
    pendingNoticeInput=input;if(noticeFrame)return;
    noticeFrame=requestAnimationFrame(()=>{
      noticeFrame=0;const current=pendingNoticeInput;pendingNoticeInput=null;if(!current?.isConnected)return;
      noticeCount++;
      try{window.dispatchEvent(new CustomEvent('cutcoach:search-input-pending',{detail:{value:current.value,delay:lastDelay}}))}catch{}
    });
  }
  function release(input,reason='idle'){
    if(!isNutritionSearch(input)||!input.isConnected)return false;
    setTyping(false,input);
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
  function settleShortQuery(input,current){
    timer=setTimeout(()=>{timer=0;if(current!==token||!input.isConnected)return;pendingInput=null;setTyping(false,input)},MAX_DEBOUNCE_MS);
  }
  function schedule(input,event=null){
    clearTimeout(timer);timer=0;cancelFrame();
    const current=++token,now=performance.now?.()||Date.now();
    pendingInput=input;nativeInputCount++;lastDelay=adaptiveDelay(now,event);setTyping(true,input);notifyPending(input);
    const length=queryLength(input);
    if(!length){releaseAfterPaint(input,current,'clear');return}
    if(length<SHORT_QUERY_LENGTH){settleShortQuery(input,current);return}
    timer=setTimeout(()=>{timer=0;if(current!==token||!input.isConnected)return;releaseAfterPaint(input,current,event?.inputType==='insertFromPaste'?'paste':'idle')},lastDelay);
  }
  function bypassed(input){return input.dataset.v193Release==='1'||input.dataset.v195Release==='1'||input.dataset.v192Bypass==='1'||input.dataset.composing==='1'||input.dataset.voicePreview==='1'}
  function handleBeforeInput(event){const input=event.target;if(!isNutritionSearch(input)||bypassed(input))return;installTypingStyle();setTyping(true,input)}
  function handleInput(event){
    const input=event.target;
    if(!isNutritionSearch(input)||bypassed(input))return;
    event.stopImmediatePropagation();
    schedule(input,event);
  }
  function handleKeydown(event){
    const input=event.target;if(!isNutritionSearch(input))return;
    if(event.key==='Escape'){clearPending();return}
    if(event.key!=='Enter'||(!timer&&!frame&&!pendingInput))return;
    clearTimeout(timer);timer=0;cancelFrame();cancelNotice();pendingInput=null;token++;release(input,'enter');
  }
  function handleCompositionEnd(event){
    const input=event.target;if(!isNutritionSearch(input))return;
    queueMicrotask(()=>{if(input.isConnected&&!input.dataset.composing)schedule(input,event)});
  }
  function handlePageHide(){clearPending()}

  installTypingStyle();
  window.addEventListener('beforeinput',handleBeforeInput,true);
  window.addEventListener('input',handleInput,true);
  window.addEventListener('keydown',handleKeydown,true);
  window.addEventListener('pagehide',handlePageHide);
  document.addEventListener('compositionend',handleCompositionEnd,true);
  window.CutCoachSearchInputPerformance193=Object.freeze({
    version:VERSION,
    debounceMs:DEFAULT_DEBOUNCE_MS,
    debounceRange:Object.freeze({min:MIN_DEBOUNCE_MS,max:MAX_DEBOUNCE_MS}),
    shortQueryLength:SHORT_QUERY_LENGTH,
    flush(reason='manual'){const input=pendingInput||document.querySelector('#nutritionSearch');if(!input)return false;clearTimeout(timer);timer=0;cancelFrame();cancelNotice();pendingInput=null;token++;return release(input,reason)},
    cancel:clearPending,
    stats:()=>Object.freeze({pending:Boolean(timer||frame),releaseCount,nativeInputCount,lastDelay,noticeCount,typingBursts,typing})
  });
})();
