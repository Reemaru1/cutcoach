'use strict';
(function(global){
  const VERSION='1.8.0-alpha';
  const BUILD='1.8.0-stage6-production-acceptance';
  const MAX_QUERY_LENGTH=240;
  if(global.CutCoachNutritionStage6)return;

  const metrics={inputs:0,emptyClears:0,staleHides:0,truncations:0,focuses:0,appPauses:0,refreshes:0};
  let bootstrapObserver=null,focusTimer=0,viewportTimer=0;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const field=()=>document.querySelector('#nutritionSearch');
  const host=()=>document.querySelector('#nutritionMultiSearch');

  function restoreSuppressed(){
    document.body?.classList.remove('canonical-multisearch-active');
    for(const node of document.querySelectorAll('[data-cutcoach-canonical-suppressed="1"]')){
      node.hidden=node.dataset.cutcoachCanonicalWasHidden==='1';
      delete node.dataset.cutcoachCanonicalSuppressed;
      delete node.dataset.cutcoachCanonicalWasHidden;
    }
  }
  function clearCanonical(reason='empty'){
    const node=host();
    if(node){node.hidden=true;node.innerHTML='';node._canonicalRows=null;delete node.dataset.canonical;delete node.dataset.query}
    restoreSuppressed();
    if(reason==='empty')metrics.emptyClears++;
  }
  function hideStale(){
    const input=field(),node=host();if(!input||!node||node.hidden||node.dataset.canonical!=='1')return false;
    if(node.dataset.query===normalize(input.value))return false;
    node.hidden=true;restoreSuppressed();metrics.staleHides++;return true;
  }
  function prepareInput(){
    const input=field();if(!input)return false;
    input.setAttribute('maxlength',String(MAX_QUERY_LENGTH));
    input.setAttribute('enterkeyhint','search');
    input.setAttribute('autocapitalize','sentences');
    input.setAttribute('autocomplete','off');
    input.spellcheck=true;
    input.dataset.stage6Prepared='1';
    return true;
  }
  function refreshCurrent(){
    const input=field();if(!input||!String(input.value||'').trim()||document.hidden)return false;
    try{
      const facade=global.CutCoachNutritionMultiSearch120;
      const refreshed=facade?.refresh?.();
      if(refreshed){metrics.refreshes++;return true}
      const rendered=global.CutCoachIntelligentSearch128?.render?.(input);
      if(rendered)metrics.refreshes++;
      return Boolean(rendered);
    }catch{return false}
  }
  function handleInput(event){
    const input=event.target;if(input?.id!=='nutritionSearch')return;
    metrics.inputs++;
    if(input.value.length>MAX_QUERY_LENGTH){const end=input.selectionEnd;input.value=input.value.slice(0,MAX_QUERY_LENGTH);metrics.truncations++;try{input.setSelectionRange(Math.min(end??MAX_QUERY_LENGTH,MAX_QUERY_LENGTH),Math.min(end??MAX_QUERY_LENGTH,MAX_QUERY_LENGTH))}catch{}}
    if(input.dataset.composing==='1'||input.dataset.voicePreview==='1')return;
    if(!String(input.value||'').trim()){clearCanonical();return}
    queueMicrotask(hideStale);
  }
  function handleCompositionStart(event){if(event.target?.id==='nutritionSearch')event.target.dataset.composing='1'}
  function handleCompositionEnd(event){if(event.target?.id!=='nutritionSearch')return;delete event.target.dataset.composing;if(!String(event.target.value||'').trim())clearCanonical();else queueMicrotask(()=>{hideStale();refreshCurrent()})}
  function handleFocus(event){if(event.target?.id!=='nutritionSearch')return;metrics.focuses++;document.body?.classList.add('cutcoach-search-focused');updateViewport();clearTimeout(focusTimer);focusTimer=setTimeout(()=>{try{event.target.scrollIntoView({block:'center',inline:'nearest',behavior:'smooth'})}catch{}},160)}
  function handleBlur(event){if(event.target?.id!=='nutritionSearch')return;clearTimeout(focusTimer);setTimeout(()=>{if(document.activeElement?.id!=='nutritionSearch')document.body?.classList.remove('cutcoach-search-focused')},80)}
  function stopTransient(){
    metrics.appPauses++;
    try{global.CutCoachNutritionVoice111?.stop?.(false)}catch{}
    try{global.CutCoachScannerV2?.stop?.()}catch{}
  }
  function handleVisibility(){
    if(document.hidden){stopTransient();return}
    prepareInput();updateNetwork();updateViewport();hideStale();setTimeout(refreshCurrent,80);
  }
  function updateNetwork(){document.body?.classList.toggle('cutcoach-network-offline',navigator.onLine===false)}
  function handleOnline(){updateNetwork();setTimeout(refreshCurrent,80);navigator.serviceWorker?.getRegistration?.().then(registration=>registration?.update?.()).catch(()=>{})}
  function updateViewport(){
    clearTimeout(viewportTimer);viewportTimer=setTimeout(()=>{
      const viewport=global.visualViewport,height=Math.round(viewport?.height||global.innerHeight||0),offset=Math.round(viewport?.offsetTop||0);
      if(height)document.documentElement.style.setProperty('--cutcoach-visual-height',`${height}px`);
      document.documentElement.style.setProperty('--cutcoach-visual-offset',`${offset}px`);
      const keyboardOpen=Boolean(viewport&&global.innerHeight-height>120);
      document.body?.classList.toggle('cutcoach-keyboard-open',keyboardOpen);
    },32);
  }
  function install(){
    document.addEventListener('input',handleInput,true);
    document.addEventListener('compositionstart',handleCompositionStart,true);
    document.addEventListener('compositionend',handleCompositionEnd,true);
    document.addEventListener('focusin',handleFocus,true);
    document.addEventListener('focusout',handleBlur,true);
    document.addEventListener('visibilitychange',handleVisibility);
    global.addEventListener('pagehide',stopTransient);
    global.addEventListener('pageshow',()=>{prepareInput();updateNetwork();updateViewport();hideStale();setTimeout(refreshCurrent,80)});
    global.addEventListener('online',handleOnline);
    global.addEventListener('offline',updateNetwork);
    global.visualViewport?.addEventListener?.('resize',updateViewport,{passive:true});
    global.visualViewport?.addEventListener?.('scroll',updateViewport,{passive:true});
    if(!prepareInput()){
      bootstrapObserver=new MutationObserver(()=>{if(prepareInput()){bootstrapObserver.disconnect();bootstrapObserver=null}});
      bootstrapObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});
    }
    document.body?.setAttribute('data-nutrition-stage6','1');
    updateNetwork();updateViewport();
  }

  const api=Object.freeze({version:VERSION,build:BUILD,frozenArchitecture:true,maxQueryLength:MAX_QUERY_LENGTH,prepare:prepareInput,clear:clearCanonical,refresh:refreshCurrent,snapshot:()=>Object.freeze({...metrics})});
  global.CutCoachNutritionStage6=api;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})(window);
