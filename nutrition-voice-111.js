'use strict';
(function(){
  const VERSION='1.1.1-alpha';
  const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  let recognition=null,state='idle',finalText='',interimText='',startedAt=0,timeoutId=0,session=0;
  const $=selector=>document.querySelector(selector);
  const normalize=value=>String(value||'').replace(/\s+/g,' ').trim();
  function nodes(){return{button:$('#nutritionVoice'),input:$('#nutritionSearch'),status:$('#nutritionVoiceStatus')}}
  function setStatus(text,kind='info',hidden=false){const {status}=nodes();if(!status)return;status.hidden=hidden;status.textContent=text||'';status.dataset.voiceState=kind}
  function setButton(next){const {button}=nodes();if(!button)return;state=next;button.classList.toggle('listening',next==='listening');button.classList.toggle('processing',next==='processing');button.setAttribute('aria-pressed',String(next==='listening'));button.setAttribute('aria-label',next==='listening'?'Spracheingabe beenden':'Spracheingabe starten');button.title=next==='listening'?'Aufnahme beenden':'Lebensmittel per Sprache suchen'}
  function clearTimer(){clearTimeout(timeoutId);timeoutId=0}
  function dispatchSearch(text){const {input}=nodes();const value=normalize(text);if(!input||!value)return false;input.value=value;input.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromDictation',data:value}));input.dispatchEvent(new Event('change',{bubbles:true}));return true}
  function cleanup(next='idle'){clearTimer();recognition=null;setButton(next)}
  function fallback(message='Nutze die Diktierfunktion der iPhone-Tastatur.'){cleanup();const {input}=nodes();setStatus(message,'fallback');input?.focus({preventScroll:true});try{input?.setSelectionRange(input.value.length,input.value.length)}catch{}}
  function stop(commit=true){if(!recognition){cleanup();return}setButton('processing');clearTimer();try{commit?recognition.stop():recognition.abort()}catch{cleanup()} }
  function errorMessage(code){return code==='not-allowed'||code==='service-not-allowed'?'Mikrofonzugriff blockiert. Erlaube den Zugriff in Safari oder nutze die iPhone-Diktierfunktion.':code==='audio-capture'?'Kein Mikrofon verfügbar. Prüfe, ob eine andere App das Mikrofon verwendet.':code==='network'?'Spracherkennung benötigt gerade eine stabile Internetverbindung.':code==='no-speech'?'Keine Sprache erkannt. Tippe erneut und sprich direkt nach dem Signal.':code==='aborted'?'Spracheingabe beendet.':'Spracheingabe konnte nicht abgeschlossen werden.'}
  function begin(){
    const {button,input}=nodes();if(!button||!input)return;
    if(state==='listening'||state==='processing'){stop(true);return}
    if(!SpeechRecognition){fallback();return}
    const token=++session;finalText='';interimText='';startedAt=Date.now();
    const instance=new SpeechRecognition();recognition=instance;instance.lang='de-DE';instance.continuous=false;instance.interimResults=true;instance.maxAlternatives=1;
    instance.onstart=()=>{if(token!==session)return;setButton('listening');setStatus('Sprich jetzt – zum Beenden erneut tippen.','listening');timeoutId=setTimeout(()=>{if(token===session&&state==='listening')stop(true)},12000)};
    instance.onspeechstart=()=>{if(token===session)setStatus('Ich höre zu …','listening')};
    instance.onresult=event=>{if(token!==session)return;let finalChunk='',interimChunk='';for(let i=event.resultIndex;i<event.results.length;i++){const text=event.results[i]?.[0]?.transcript||'';if(event.results[i].isFinal)finalChunk+=` ${text}`;else interimChunk+=` ${text}`}if(finalChunk)finalText=normalize(`${finalText} ${finalChunk}`);interimText=normalize(interimChunk);const preview=normalize(`${finalText} ${interimText}`);if(preview){dispatchSearch(preview);setStatus(`Erkannt: „${preview}“`,'result')}};
    instance.onerror=event=>{if(token!==session)return;const code=event.error||'unknown';if(code==='aborted'&&Date.now()-startedAt<500)return;setStatus(errorMessage(code),'error');cleanup()};
    instance.onnomatch=()=>{if(token===session)setStatus('Nicht eindeutig erkannt. Bitte noch einmal versuchen.','error')};
    instance.onend=()=>{if(token!==session)return;const result=normalize(finalText||interimText||input.value);cleanup();if(result){dispatchSearch(result);setStatus(`Suche nach „${result}“`,'success');input.blur();setTimeout(()=>{const status=$('#nutritionVoiceStatus');if(status?.dataset.voiceState==='success')status.hidden=true},2600)}else if(Date.now()-startedAt>400){setStatus('Keine Sprache erkannt. Tippe erneut oder nutze die Tastatur.','error')}};
    try{instance.start()}catch(error){console.warn('CutCoach voice start failed',error);fallback('Spracheingabe ist gerade belegt. Kurz warten oder die iPhone-Diktierfunktion nutzen.')}
  }
  document.addEventListener('click',event=>{const button=event.target.closest?.('#nutritionVoice');if(!button)return;event.preventDefault();event.stopImmediatePropagation();begin()},true);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop(false)});
  document.addEventListener('click',event=>{if(event.target.closest?.('#nutritionBack,#nutritionDone,nav [data-tab]'))stop(false)},true);
  window.addEventListener('pagehide',()=>stop(false));
  const observer=new MutationObserver(()=>{const button=$('#nutritionVoice');if(button&&!button.dataset.voice111){button.dataset.voice111='1';button.setAttribute('aria-pressed','false');button.title='Lebensmittel per Sprache suchen'}});observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
  window.CutCoachNutritionVoice111=Object.freeze({version:VERSION,start:begin,stop:()=>stop(true),state:()=>state});
})();