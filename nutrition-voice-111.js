'use strict';
(function(){
  const VERSION='1.9.3-alpha';
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const MAX_TRANSCRIPT=240;
  if(window.CutCoachNutritionVoice111)return;
  let recognition=null,state='idle',finalText='',interimText='',initialValue='',startedAt=0,timeoutId=0,session=0,commitOnEnd=true,sessionActive=false;
  const $=selector=>document.querySelector(selector);
  const normalize=value=>String(value||'').replace(/\s+/g,' ').trim().slice(0,MAX_TRANSCRIPT);
  function nodes(){return{button:$('#nutritionVoice'),input:$('#nutritionSearch'),status:$('#nutritionVoiceStatus')}}
  function setStatus(text,kind='info',hidden=false){const {status}=nodes();if(!status)return;status.hidden=hidden;status.textContent=text||'';status.dataset.voiceState=kind}
  function setButton(next){const {button}=nodes();state=next;if(!button)return;button.classList.toggle('listening',next==='listening');button.classList.toggle('processing',next==='processing');button.setAttribute('aria-pressed',String(next==='listening'));button.setAttribute('aria-busy',String(next==='processing'));button.setAttribute('aria-label',next==='listening'?'Spracheingabe beenden':next==='processing'?'Sprache wird verarbeitet':'Spracheingabe starten');button.title=next==='listening'?'Aufnahme beenden':'Lebensmittel per Sprache suchen'}
  function clearTimer(){clearTimeout(timeoutId);timeoutId=0}
  function restoreSuppressed(){document.body?.classList.remove('canonical-multisearch-active');for(const node of document.querySelectorAll('[data-v192-suppressed="1"]')){node.hidden=node.dataset.v192WasHidden==='1';delete node.dataset.v192Suppressed;delete node.dataset.v192WasHidden}for(const node of document.querySelectorAll('[data-cutcoach-canonical-suppressed="1"]')){node.hidden=node.dataset.cutcoachCanonicalWasHidden==='1';delete node.dataset.cutcoachCanonicalSuppressed;delete node.dataset.cutcoachCanonicalWasHidden}}
  function clearStaleResults(){try{window.dispatchEvent(new CustomEvent('cutcoach:search-input-pending',{detail:{source:'voice-preview'}}))}catch{}try{window.CutCoachNutritionStage6?.clear?.('voice-preview')}catch{}const host=$('#nutritionMultiSearch');if(host){host.hidden=true;host.replaceChildren();host._canonicalRows=null;host._v192Rows=null;delete host.dataset.canonical;delete host.dataset.presentationV192;delete host.dataset.query;delete host.dataset.renderSignature}restoreSuppressed()}
  function updatePreview(text){const {input}=nodes(),value=normalize(text);if(!input||!value)return false;clearStaleResults();input.value=value;input.dataset.voicePreview='1';return true}
  function dispatchSearch(text){const {input}=nodes(),value=normalize(text);if(!input||!value)return false;input.value=value;delete input.dataset.voicePreview;let event;try{event=new InputEvent('input',{bubbles:true,inputType:'insertFromDictation',data:value})}catch{event=new Event('input',{bubbles:true})}input.dispatchEvent(event);input.dispatchEvent(new Event('change',{bubbles:true}));return true}
  function restoreInitial(){const {input}=nodes();if(!input||(!sessionActive&&input.dataset.voicePreview!=='1'))return false;input.value=initialValue;delete input.dataset.voicePreview;clearStaleResults();try{window.CutCoachNutritionStability201?.refresh?.()}catch{}return true}
  function cleanup(next='idle'){clearTimer();recognition=null;commitOnEnd=true;sessionActive=false;finalText='';interimText='';initialValue='';setButton(next)}
  function fallback(message='Nutze die Diktierfunktion der iPhone-Tastatur.'){cleanup();const {input}=nodes();setStatus(message,'fallback');input?.focus({preventScroll:true});try{input?.setSelectionRange(input.value.length,input.value.length)}catch{}}
  function stop(commit=true){const instance=recognition;if(!instance){if(!commit&&sessionActive)restoreInitial();cleanup();return false}clearTimer();commitOnEnd=Boolean(commit);if(!commit){session++;restoreInitial();recognition=null;try{instance.abort()}catch{}cleanup();return true}setButton('processing');try{instance.stop();return true}catch{const result=normalize(finalText||interimText);if(result){cleanup();dispatchSearch(result)}else{restoreInitial();cleanup()}return false}}
  function errorMessage(code){return code==='not-allowed'||code==='service-not-allowed'?'Mikrofonzugriff wurde nicht erlaubt. Tippe erneut auf das Mikrofon und erlaube den Zugriff oder nutze die iPhone-Diktierfunktion.':code==='audio-capture'?'Kein Mikrofon verfügbar. Prüfe, ob eine andere App das Mikrofon verwendet.':code==='network'?'Spracherkennung benötigt gerade eine stabile Internetverbindung.':code==='no-speech'?'Keine Sprache erkannt. Tippe erneut und sprich direkt nach dem Signal.':code==='aborted'?'Spracheingabe beendet.':'Spracheingabe konnte nicht abgeschlossen werden.'}
  function begin(){
    const {button,input}=nodes();if(!button||!input)return false;
    if(state==='listening'||state==='processing'){stop(true);return true}
    if(navigator.onLine===false){fallback('Offline ist die Browser-Spracherkennung nicht verfügbar. Nutze die iPhone-Diktierfunktion oder tippe den Begriff ein.');return false}
    if(!SpeechRecognition){fallback();return false}
    const token=++session;finalText='';interimText='';initialValue=input.value;startedAt=Date.now();commitOnEnd=true;sessionActive=true;
    const instance=new SpeechRecognition();recognition=instance;instance.lang='de-DE';instance.continuous=false;instance.interimResults=true;instance.maxAlternatives=1;
    instance.onstart=()=>{if(token!==session)return;setButton('listening');setStatus('Sprich jetzt – zum Beenden erneut tippen.','listening');timeoutId=setTimeout(()=>{if(token===session&&state==='listening')stop(true)},12000)};
    instance.onspeechstart=()=>{if(token===session)setStatus('Ich höre zu …','listening')};
    instance.onresult=event=>{if(token!==session)return;let finalChunk='',interimChunk='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i]?.[0]?.transcript||'';if(event.results[i].isFinal)finalChunk+=` ${text}`;else interimChunk+=` ${text}`}if(finalChunk)finalText=normalize(`${finalText} ${finalChunk}`);interimText=normalize(interimChunk);const preview=normalize(`${finalText} ${interimText}`);if(preview){updatePreview(preview);setStatus(`Erkannt: „${preview}“`,'result')}};
    instance.onerror=event=>{if(token!==session)return;const code=event.error||'unknown';if(code==='aborted'&&!commitOnEnd){restoreInitial();cleanup();return}if(code==='aborted'&&Date.now()-startedAt<500)return;restoreInitial();setStatus(errorMessage(code),'error');cleanup()};
    instance.onnomatch=()=>{if(token!==session)return;commitOnEnd=false;restoreInitial();setStatus('Nicht eindeutig erkannt. Bitte noch einmal versuchen.','error')};
    instance.onend=()=>{if(token!==session)return;const shouldCommit=commitOnEnd,result=normalize(finalText||interimText);if(!shouldCommit){restoreInitial();cleanup();return}if(result){cleanup();dispatchSearch(result);setStatus(`Intelligente Suche nach „${result}“`,'success');input.focus({preventScroll:true});setTimeout(()=>{const status=$('#nutritionVoiceStatus');if(status?.dataset.voiceState==='success')status.hidden=true},2600)}else{restoreInitial();const elapsed=Date.now()-startedAt;cleanup();if(elapsed>400)setStatus('Keine Sprache erkannt. Tippe erneut oder nutze die Tastatur.','error')}};
    try{instance.start();return true}catch(error){console.warn('CutCoach voice start failed',error);restoreInitial();fallback('Spracheingabe ist gerade belegt. Kurz warten oder die iPhone-Diktierfunktion nutzen.');return false}
  }
  function prepareButton(){const button=$('#nutritionVoice');if(!button||button.dataset.voice193)return false;button.dataset.voice193='1';button.setAttribute('aria-pressed','false');button.setAttribute('aria-busy','false');button.title='Lebensmittel per Sprache suchen';return true}
  document.addEventListener('click',event=>{const button=event.target.closest?.('#nutritionVoice');if(!button)return;event.preventDefault();event.stopImmediatePropagation();begin()},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop(false)});
  document.addEventListener('click',event=>{if(event.target.closest?.('#nutritionBack,#nutritionDone,nav [data-tab]'))stop(false)},true);
  window.addEventListener('pagehide',()=>stop(false));
  window.addEventListener('offline',()=>{if(state==='listening'||state==='processing'){stop(false);setStatus('Verbindung unterbrochen. Spracheingabe wurde beendet.','error')}});
  if(!prepareButton()){const observer=new MutationObserver(()=>{if(prepareButton())observer.disconnect()});observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  window.CutCoachNutritionVoice111=Object.freeze({version:VERSION,start:begin,stop,state:()=>state,maxTranscript:MAX_TRANSCRIPT,sessionActive:()=>sessionActive,clearStaleResults});
})();
