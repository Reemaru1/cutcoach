'use strict';
(function(){
  const VERSION='4.5.0';
  const META_KEY='cutcoach_health_sync_v1';
  const MAX_STEPS=100000;
  const baseRender=window.render;

  function readMeta(){
    try{
      const value=JSON.parse(localStorage.getItem(META_KEY)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {};}
  }
  function writeMeta(value){
    try{localStorage.setItem(META_KEY,JSON.stringify(value));return true;}catch{return false;}
  }
  function standalone(){return Boolean(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);}
  function sourceLabel(source){return source==='fitness'?'Apple Fitness':'Apple Health';}
  function formatStamp(value){
    const date=new Date(value);if(!Number.isFinite(date.getTime()))return 'unbekannt';
    const today=date.toDateString()===new Date().toDateString();
    return today?`heute ${date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`:date.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  function cleanHash(){
    try{history.replaceState(null,'',`${location.pathname}${location.search}#today`);}catch{location.hash='today';}
  }
  function parseIncoming(){
    const raw=location.hash.replace(/^#/,'');
    let query='';
    if(raw.startsWith('health-sync?'))query=raw.slice('health-sync?'.length);
    else if(raw.startsWith('health-sync&'))query=raw.slice('health-sync&'.length);
    else if(raw.startsWith('syncSteps='))query=raw.replace(/^syncSteps=/,'steps=');
    else return null;
    const params=new URLSearchParams(query),rawSteps=String(params.get('steps')??'').trim();
    if(!/^\d{1,6}$/.test(rawSteps))return {error:'Die übergebene Schrittzahl ist ungültig.'};
    const steps=Math.round(Number(rawSteps));
    if(!Number.isFinite(steps)||steps<0||steps>MAX_STEPS)return {error:'Die Schrittzahl muss zwischen 0 und 100.000 liegen.'};
    const date=String(params.get('date')||todayKey());
    if(!validDateKey(date)||date>todayKey())return {error:'Das übergebene Datum ist ungültig.'};
    const source=/^(fitness)$/i.test(params.get('source')||'')?'fitness':'health';
    return {steps,date,source};
  }
  function rememberSync(payload,previous){
    const meta=readMeta(),syncedAt=new Date().toISOString();
    meta.version=1;
    meta.last={date:payload.date,steps:payload.steps,previous,syncedAt,source:payload.source,context:standalone()?'standalone':'browser'};
    meta.days=meta.days&&typeof meta.days==='object'&&!Array.isArray(meta.days)?meta.days:{};
    meta.days[payload.date]={steps:payload.steps,previous,syncedAt,source:payload.source,context:meta.last.context};
    const keys=Object.keys(meta.days).sort();
    while(keys.length>120)delete meta.days[keys.shift()];
    writeMeta(meta);
  }
  function applySync(payload){
    const data=day(payload.date,true),previous=data.steps;
    data.steps=payload.steps;
    if(!saveState(true)){toast('Health-Sync konnte nicht gespeichert werden.');return false;}
    rememberSync(payload,previous);
    selectedDate=payload.date;
    cleanHash();
    window.render();
    const context=standalone()?'CutCoach':'Safari';
    toast(`${sourceLabel(payload.source)}: ${fmt(payload.steps)} Schritte übernommen · ${context}`);
    return true;
  }
  function processIncoming(){
    const payload=parseIncoming();if(!payload)return false;
    if(payload.error){cleanHash();toast(payload.error);return true;}
    return applySync(payload);
  }
  function copyText(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();document.execCommand('copy');area.remove();return Promise.resolve();
  }
  function ensureUi(){
    const steps=document.querySelector('.steps-card');
    if(steps&&!document.querySelector('#healthSyncPanel')){
      const bar=steps.querySelector('.bar');
      bar?.insertAdjacentHTML('afterend','<div class="health-sync-panel" id="healthSyncPanel" data-state="ready"><div class="health-sync-status" aria-live="polite"><span class="health-sync-heart" aria-hidden="true">♥</span><div><strong id="healthSyncTitle">Health-Sync bereit</strong><small id="healthSyncText">Noch nicht eingerichtet</small></div></div><button type="button" class="secondary health-sync-open" id="healthSyncOpen">Einrichten</button></div>');
    }
    if(!document.querySelector('#healthSyncModal')){
      document.body.insertAdjacentHTML('beforeend','<div class="modal" id="healthSyncModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="healthSyncModalTitle"><div class="sheet health-sync-sheet"><div class="sheet-head"><div><h2 id="healthSyncModalTitle">Apple Health synchronisieren</h2><small>Kostenlos über Kurzbefehle</small></div><button type="button" id="healthSyncClose" aria-label="Schließen">×</button></div><div class="health-sync-explainer"><span>1</span><p>In Kurzbefehle die heutigen Gesundheitsdaten vom Typ <b>Schritte</b> suchen.</p><span>2</span><p>Die <b>Summe</b> dieser Schrittwerte berechnen.</p><span>3</span><p>Die Summe hinter die folgende Basisadresse setzen und anschließend die URL öffnen.</p></div><div class="health-sync-url"><code id="healthSyncBaseUrl">https://reemaru1.github.io/cutcoach/#health-sync?steps=</code><button type="button" id="healthSyncCopy">Basisadresse kopieren</button></div><div class="health-sync-automation"><strong>Nahezu automatisch</strong><p>Nutze diesen Kurzbefehl als CutCoach-Startsymbol und ergänze persönliche Automationen, zum Beispiel morgens, mittags und abends. Der aktuelle Gesamtwert ersetzt den alten Wert; es wird nichts doppelt addiert.</p></div><div class="health-sync-test"><label>Übertragung testen<input id="healthSyncTestInput" type="number" min="0" max="100000" inputmode="numeric" placeholder="z. B. 4500"></label><button type="button" id="healthSyncTest">Testwert übernehmen</button><small>Der Test ersetzt die heutige Schrittzahl.</small></div></div></div>');
      const modal=document.querySelector('#healthSyncModal'),close=()=>closeModal(modal);
      document.querySelector('#healthSyncClose').onclick=close;
      modal.onclick=event=>{if(event.target===modal)close();};
      document.querySelector('#healthSyncCopy').onclick=async()=>{try{await copyText(document.querySelector('#healthSyncBaseUrl').textContent);toast('Basisadresse kopiert.');}catch{toast('Kopieren nicht möglich.');}};
      document.querySelector('#healthSyncTest').onclick=()=>{
        const input=document.querySelector('#healthSyncTestInput'),steps=Math.round(Number(input.value));
        if(!Number.isFinite(steps)||steps<0||steps>MAX_STEPS){toast('Bitte eine gültige Schrittzahl eingeben.');return;}
        if(!confirm(`${fmt(steps)} Schritte als Health-Sync-Test für heute übernehmen?`))return;
        applySync({steps,date:todayKey(),source:'health'});close();
      };
    }
    const open=document.querySelector('#healthSyncOpen');if(open&&!open.dataset.bound){open.dataset.bound='1';open.onclick=()=>openModal('healthSyncModal');}
  }
  function renderStatus(){
    const panel=document.querySelector('#healthSyncPanel'),title=document.querySelector('#healthSyncTitle'),text=document.querySelector('#healthSyncText'),open=document.querySelector('#healthSyncOpen');if(!panel||!title||!text)return;
    const meta=readMeta(),entry=meta.days?.[selectedDate],current=day(selectedDate,false).steps;
    if(entry){
      const same=current===entry.steps;
      panel.dataset.state=same?'synced':'changed';
      title.textContent=same?`${sourceLabel(entry.source)} synchronisiert`:'Seit dem Sync manuell geändert';
      text.textContent=same?`${formatStamp(entry.syncedAt)} · ${fmt(entry.steps)} Schritte`:`Health: ${fmt(entry.steps)} · aktuell: ${current===null?'–':fmt(current)}`;
      if(open)open.textContent='Sync-Info';
    }else if(meta.last){
      panel.dataset.state='ready';title.textContent='Health-Sync bereit';text.textContent=`Letzter Sync ${formatStamp(meta.last.syncedAt)}`;if(open)open.textContent='Sync-Info';
    }else{
      panel.dataset.state='ready';title.textContent='Health-Sync bereit';text.textContent='Noch nicht eingerichtet';if(open)open.textContent='Einrichten';
    }
    const input=document.querySelector('#healthSyncTestInput');if(input&&document.activeElement!==input)input.value=String(day(todayKey(),false).steps??'');
  }
  function postRender(){ensureUi();renderStatus();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;}

  window.render=function(){baseRender();postRender();};
  window.addEventListener('hashchange',processIncoming);
  window.addEventListener('pageshow',()=>{processIncoming();postRender();});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)processIncoming();});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{window.render();setTimeout(processIncoming,40);},{once:true});else{window.render();setTimeout(processIncoming,40);}
})();
