'use strict';
(function(){
  const VERSION='5.1.0';
  const META_KEY='cutcoach_health_sync_v1';
  const PAIR_KEY='cutcoach_cloud_pair_v1';
  const MAX_STEPS=100000;
  const SUPABASE_REST='https://jzaktqzpiqhtjzstprmo.supabase.co/rest/v1';
  const SUPABASE_KEY='sb_publishable_XaGAJ421We1klT5HQS7ZVQ_TvbluaPa';
  const BASE_URL='https://reemaru1.github.io/cutcoach/#health-sync?steps=';
  const baseRender=window.render;
  let lastHash='',lastPullAt=0,pullPromise=null;

  function readJson(key,fallback={}){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'null');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback;
    }catch{return fallback;}
  }
  function writeJson(key,value){
    try{localStorage.setItem(key,JSON.stringify(value));return true;}catch{return false;}
  }
  function standalone(){
    return Boolean(window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  }
  function sourceLabel(source){
    return source==='fitness'?'Apple Fitness':source==='cloud'?'Health-Cloud':'Apple Health';
  }
  function formatStamp(value){
    const date=new Date(value);
    if(!Number.isFinite(date.getTime()))return 'unbekannt';
    const sameDay=date.toDateString()===new Date().toDateString();
    return sameDay?`heute ${date.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`:date.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
  }
  function parseStepNumber(value){
    let text=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'');
    if(!text)return null;
    text=text.replace(/([,.])0+$/,'');
    if(/^\d{1,3}([.,]\d{3})+$/.test(text))text=text.replace(/[.,]/g,'');
    if(!/^\d{1,6}$/.test(text))return null;
    const number=Math.round(Number(text));
    return Number.isFinite(number)&&number>=0&&number<=MAX_STEPS?number:null;
  }
  function validToken(value){
    return /^[A-Za-z0-9_-]{24,80}$/.test(String(value||''));
  }
  function newToken(){
    const bytes=new Uint8Array(24);
    if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    let binary='';
    bytes.forEach(byte=>binary+=String.fromCharCode(byte));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function pairData(){return readJson(PAIR_KEY,{});}
  function pairToken(create=false){
    const current=pairData().token;
    if(validToken(current))return current;
    if(!create)return '';
    const token=newToken();
    writeJson(PAIR_KEY,{...pairData(),token,createdAt:new Date().toISOString()});
    return token;
  }
  function setPairToken(token){
    if(!validToken(token))return false;
    writeJson(PAIR_KEY,{...pairData(),token,pairedAt:new Date().toISOString()});
    return true;
  }
  function updatePair(patch){
    writeJson(PAIR_KEY,{...pairData(),...patch});
  }
  function personalShortcutTemplate(){
    const token=pairToken(true);
    return `${BASE_URL}[SUMME]&sync=${token}&source=health`;
  }
  function shortcutSuffix(){
    return `&sync=${pairToken(true)}&source=health`;
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
    const params=new URLSearchParams(query);
    const steps=parseStepNumber(params.get('steps'));
    if(steps===null)return {error:'Die übergebene Schrittzahl ist ungültig.'};
    const date=String(params.get('date')||todayKey());
    if(!validDateKey(date)||date>todayKey())return {error:'Das übergebene Datum ist ungültig.'};
    const source=/^(fitness)$/i.test(params.get('source')||'')?'fitness':'health';
    const token=String(params.get('sync')||params.get('token')||'');
    if(token&&!validToken(token))return {error:'Der persönliche Sync-Code ist ungültig.'};
    return {steps,date,source,token};
  }
  function cloudHeaders(){
    return {'apikey':SUPABASE_KEY,'Authorization':`Bearer ${SUPABASE_KEY}`,'Content-Type':'application/json'};
  }
  async function cloudRpc(name,body){
    const response=await fetch(`${SUPABASE_REST}/rpc/${name}`,{
      method:'POST',
      headers:cloudHeaders(),
      body:JSON.stringify(body),
      cache:'no-store'
    });
    const text=await response.text();
    let data=null;
    if(text){try{data=JSON.parse(text);}catch{data=text;}}
    if(!response.ok){
      const message=typeof data==='object'&&data?.message?data.message:`Cloud-Fehler ${response.status}`;
      throw new Error(message);
    }
    return data;
  }
  async function pushCloud(payload,token=pairToken(false)){
    if(!validToken(token))throw new Error('Kein persönlicher Sync-Code');
    const data=await cloudRpc('cutcoach_upsert_steps',{
      p_sync_token:token,
      p_day:payload.date,
      p_steps:payload.steps
    });
    const row=Array.isArray(data)?data[0]:data;
    updatePair({cloudReady:true,lastPushAt:new Date().toISOString(),lastError:''});
    return row||{steps:payload.steps,updated_at:new Date().toISOString()};
  }
  async function fetchCloud(date=todayKey(),token=pairToken(false)){
    if(!validToken(token))return null;
    const data=await cloudRpc('cutcoach_get_steps',{p_sync_token:token,p_day:date});
    const row=Array.isArray(data)?data[0]:data;
    updatePair({cloudReady:true,lastPullAt:new Date().toISOString(),lastError:''});
    if(!row)return null;
    const steps=parseStepNumber(row.steps);
    if(steps===null)return null;
    return {steps,date,source:'cloud',cloudUpdatedAt:row.updated_at||new Date().toISOString()};
  }
  function rememberSync(payload,previous,extra={}){
    const meta=readJson(META_KEY,{}),syncedAt=extra.syncedAt||new Date().toISOString();
    meta.version=2;
    meta.last={
      date:payload.date,steps:payload.steps,previous,syncedAt,source:payload.source,
      context:standalone()?'standalone':'browser',cloudUpdatedAt:payload.cloudUpdatedAt||extra.cloudUpdatedAt||null,
      cloud:extra.cloud||null
    };
    meta.days=meta.days&&typeof meta.days==='object'&&!Array.isArray(meta.days)?meta.days:{};
    meta.days[payload.date]={...meta.last};
    const keys=Object.keys(meta.days).sort();
    while(keys.length>120)delete meta.days[keys.shift()];
    writeJson(META_KEY,meta);
  }
  function applySync(payload,{silent=false,clean=false,cloud=null}={}){
    const data=day(payload.date,true),previous=data.steps;
    data.steps=payload.steps;
    if(!saveState(true)){
      data.steps=previous;
      pruneDay(payload.date);
      if(!silent)toast('Health-Sync konnte nicht gespeichert werden.');
      return false;
    }
    rememberSync(payload,previous,{cloud,cloudUpdatedAt:payload.cloudUpdatedAt});
    selectedDate=payload.date;
    if(clean)cleanHash();
    document.querySelector('[data-tab="today"]')?.click();
    window.render();
    if(!silent){
      const context=standalone()?'CutCoach':'Safari';
      toast(`${sourceLabel(payload.source)}: ${fmt(payload.steps)} Schritte übernommen · ${context}`);
    }
    return true;
  }
  async function processIncoming(){
    const rawHash=location.hash;
    if(rawHash===lastHash)return false;
    const payload=parseIncoming();
    if(!payload)return false;
    lastHash=rawHash;
    if(payload.error){
      cleanHash();
      toast(payload.error);
      return true;
    }
    if(payload.token)setPairToken(payload.token);
    const token=payload.token||pairToken(false);
    applySync(payload,{clean:true});
    if(validToken(token)){
      try{
        const row=await pushCloud(payload,token);
        rememberSync({...payload,cloudUpdatedAt:row?.updated_at},day(payload.date,false).steps,{cloud:'saved',cloudUpdatedAt:row?.updated_at});
        window.render();
        toast('Schritte zusätzlich in der Health-Cloud gespeichert.');
      }catch(error){
        updatePair({cloudReady:false,lastError:String(error?.message||error)});
        window.render();
        toast('Schritte lokal übernommen. Cloud ist noch nicht eingerichtet.');
      }
    }else{
      toast('Lokal übernommen. Für die Home-App fehlt noch der persönliche Sync-Code.');
    }
    return true;
  }
  async function pullCloud({silent=true,force=false}={}){
    const token=pairToken(false);
    if(!validToken(token)||!navigator.onLine)return null;
    const now=Date.now();
    if(!force&&now-lastPullAt<30000)return null;
    if(pullPromise)return pullPromise;
    lastPullAt=now;
    pullPromise=(async()=>{
      try{
        const payload=await fetchCloud(todayKey(),token);
        if(!payload)return null;
        const current=day(payload.date,false).steps;
        const meta=readJson(META_KEY,{}),known=meta.days?.[payload.date]?.cloudUpdatedAt;
        const changed=current!==payload.steps||known!==payload.cloudUpdatedAt;
        if(changed)applySync(payload,{silent});
        return payload;
      }catch(error){
        updatePair({cloudReady:false,lastError:String(error?.message||error)});
        if(!silent)toast('Cloud-Sync nicht erreichbar. Supabase-SQL prüfen.');
        window.render();
        return null;
      }finally{
        pullPromise=null;
      }
    })();
    return pullPromise;
  }
  async function testCloud(){
    const token=pairToken(true),current=day(todayKey(),false).steps??0;
    const row=await pushCloud({date:todayKey(),steps:current,source:'health'},token);
    const pulled=await fetchCloud(todayKey(),token);
    return Boolean(row&&pulled&&pulled.steps===current);
  }
  function copyText(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const area=document.createElement('textarea');
    area.value=text;area.style.position='fixed';area.style.opacity='0';
    document.body.append(area);area.select();document.execCommand('copy');area.remove();
    return Promise.resolve();
  }
  function ensureUi(){
    const steps=document.querySelector('.steps-card');
    if(steps&&!document.querySelector('#healthSyncPanel')){
      const bar=steps.querySelector('.bar');
      bar?.insertAdjacentHTML('afterend','<div class="health-sync-panel" id="healthSyncPanel" data-state="ready"><div class="health-sync-status" aria-live="polite"><span class="health-sync-heart" aria-hidden="true">♥</span><div><strong id="healthSyncTitle">Health-Cloud bereit</strong><small id="healthSyncText">Wird eingerichtet</small></div></div><button type="button" class="secondary health-sync-open" id="healthSyncOpen">Öffnen</button></div>');
    }
    if(!document.querySelector('#healthSyncModal')){
      document.body.insertAdjacentHTML('beforeend','<div class="modal" id="healthSyncModal" role="dialog" aria-modal="true" aria-hidden="true"><div class="sheet health-sync-sheet"><div class="sheet-head"><div><h2>Health-Cloud</h2><small>Safari und Home-App verbinden</small></div><button type="button" id="healthSyncClose" aria-label="Schließen">×</button></div><div class="health-sync-url"><code id="healthSyncBaseUrl"></code><button type="button" id="healthSyncCopy">Persönliche Vorlage kopieren</button></div><button type="button" id="healthSyncPull">Jetzt aus Cloud laden</button></div></div>');
      const modal=document.querySelector('#healthSyncModal');
      document.querySelector('#healthSyncClose').onclick=()=>closeModal(modal);
      modal.onclick=event=>{if(event.target===modal)closeModal(modal);};
      document.querySelector('#healthSyncCopy').onclick=async()=>{await copyText(personalShortcutTemplate());toast('Persönliche Vorlage kopiert.');};
      document.querySelector('#healthSyncPull').onclick=()=>pullCloud({silent:false,force:true});
    }
    const open=document.querySelector('#healthSyncOpen');
    if(open&&!open.dataset.bound){open.dataset.bound='1';open.onclick=()=>openModal('healthSyncModal');}
  }
  function renderStatus(){
    const panel=document.querySelector('#healthSyncPanel'),title=document.querySelector('#healthSyncTitle'),text=document.querySelector('#healthSyncText');
    if(!panel||!title||!text)return;
    const meta=readJson(META_KEY,{}),pair=pairData(),entry=meta.days?.[selectedDate],current=day(selectedDate,false).steps;
    if(entry){
      const same=current===entry.steps;
      panel.dataset.state=same?'synced':'changed';
      title.textContent=pair.cloudReady?'Health-Cloud synchronisiert':same?`${sourceLabel(entry.source)} synchronisiert`:'Seit dem Sync geändert';
      text.textContent=pair.cloudReady?`${formatStamp(pair.lastPullAt||pair.lastPushAt||entry.syncedAt)} · ${fmt(entry.steps)} Schritte`:pair.lastError?'Cloud-Einrichtung fehlt':`${formatStamp(entry.syncedAt)} · ${fmt(entry.steps)} Schritte`;
    }else{
      panel.dataset.state='ready';
      title.textContent=pair.cloudReady?'Health-Cloud verbunden':'Health-Cloud vorbereiten';
      text.textContent=pair.cloudReady?'Noch keine Schritte für diesen Tag':'Persönlicher Sync-Code wird benötigt';
    }
    const code=document.querySelector('#healthSyncBaseUrl');
    if(code)code.textContent=personalShortcutTemplate();
  }
  function postRender(){
    ensureUi();
    renderStatus();
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }

  window.CutCoachHealthSync={
    version:VERSION,
    process:processIncoming,
    pull:pullCloud,
    push:pushCloud,
    testCloud,
    ensureToken:()=>pairToken(true),
    getToken:()=>pairToken(false),
    setToken:setPairToken,
    shortcutSuffix,
    personalShortcutTemplate,
    pairData,
    copyText
  };
  window.render=function(){baseRender();postRender();};
  window.addEventListener('hashchange',()=>processIncoming());
  window.addEventListener('pageshow',()=>{processIncoming();postRender();pullCloud({silent:true});});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){processIncoming();pullCloud({silent:true});}});
  setInterval(()=>{if(!document.hidden)pullCloud({silent:true});},300000);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>{window.render();setTimeout(()=>{processIncoming();pullCloud({silent:true});},60);},{once:true});
  }else{
    window.render();
    setTimeout(()=>{processIncoming();pullCloud({silent:true});},60);
  }
})();
