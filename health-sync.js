'use strict';
(function(){
  const VERSION='5.1.0',META='cutcoach_health_sync_v1',PAIR='cutcoach_cloud_pair_v1',MAX=100000;
  const REST='https://jzaktqzpiqhtjzstprmo.supabase.co/rest/v1';
  const KEY='sb_publishable_XaGAJ421We1klT5HQS7ZVQ_TvbluaPa';
  const BASE='https://reemaru1.github.io/cutcoach/#health-sync?steps=';
  const baseRender=window.render;
  let lastPull=0,pendingPull=null;

  const read=(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const standalone=()=>Boolean(matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  const validToken=value=>/^[A-Za-z0-9_-]{24,80}$/.test(String(value||''));
  function parseSteps(value){
    let text=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'');
    if(!text)return null;
    text=text.replace(/([,.])0+$/,'');
    if(/^\d{1,3}([.,]\d{3})+$/.test(text))text=text.replace(/[.,]/g,'');
    if(!/^\d{1,6}$/.test(text))return null;
    const n=Math.round(Number(text));
    return Number.isFinite(n)&&n>=0&&n<=MAX?n:null;
  }
  function makeToken(){
    const bytes=new Uint8Array(24);
    if(crypto?.getRandomValues)crypto.getRandomValues(bytes);
    else for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
    let raw='';bytes.forEach(v=>raw+=String.fromCharCode(v));
    return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  const pair=()=>read(PAIR,{});
  function token(create=false){
    const current=pair().token;
    if(validToken(current))return current;
    if(!create)return '';
    const next=makeToken();
    write(PAIR,{...pair(),token:next,createdAt:new Date().toISOString()});
    return next;
  }
  function setToken(value){
    if(!validToken(value))return false;
    write(PAIR,{...pair(),token:value,pairedAt:new Date().toISOString()});
    return true;
  }
  const patchPair=patch=>write(PAIR,{...pair(),...patch});
  const suffix=()=>`&sync=${token(true)}&source=health`;
  const template=()=>`${BASE}[SUMME]${suffix()}`;
  function copy(text){
    if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);
    const el=document.createElement('textarea');el.value=text;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();document.execCommand('copy');el.remove();return Promise.resolve();
  }
  function cleanHash(){try{history.replaceState(null,'',`${location.pathname}${location.search}#today`)}catch{location.hash='today'}}
  function incoming(){
    const raw=location.hash.replace(/^#/,'');
    let query='';
    if(raw.startsWith('health-sync?'))query=raw.slice(12);
    else if(raw.startsWith('health-sync&'))query=raw.slice(12);
    else if(raw.startsWith('syncSteps='))query=raw.replace(/^syncSteps=/,'steps=');
    else return null;
    const params=new URLSearchParams(query),steps=parseSteps(params.get('steps'));
    if(steps===null)return {error:'Die übergebene Schrittzahl ist ungültig.'};
    const date=String(params.get('date')||todayKey());
    if(!validDateKey(date)||date>todayKey())return {error:'Das übergebene Datum ist ungültig.'};
    const sync=String(params.get('sync')||params.get('token')||'');
    if(sync&&!validToken(sync))return {error:'Der persönliche Sync-Code ist ungültig.'};
    return {steps,date,source:/^fitness$/i.test(params.get('source')||'')?'fitness':'health',token:sync};
  }
  async function rpc(name,body){
    const response=await fetch(`${REST}/rpc/${name}`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
    const text=await response.text();let data=null;
    if(text){try{data=JSON.parse(text)}catch{data=text}}
    if(!response.ok)throw new Error(typeof data==='object'&&data?.message?data.message:`Cloud-Fehler ${response.status}`);
    return data;
  }
  async function push(payload,syncToken=token(false)){
    if(!validToken(syncToken))throw new Error('Kein persönlicher Sync-Code');
    const data=await rpc('cutcoach_upsert_steps',{p_sync_token:syncToken,p_day:payload.date,p_steps:payload.steps});
    const row=Array.isArray(data)?data[0]:data;
    patchPair({cloudReady:true,lastPushAt:new Date().toISOString(),lastError:''});
    return row||{steps:payload.steps,updated_at:new Date().toISOString()};
  }
  async function fetchDay(date=todayKey(),syncToken=token(false)){
    if(!validToken(syncToken))return null;
    const data=await rpc('cutcoach_get_steps',{p_sync_token:syncToken,p_day:date});
    const row=Array.isArray(data)?data[0]:data;
    patchPair({cloudReady:true,lastPullAt:new Date().toISOString(),lastError:''});
    const steps=parseSteps(row?.steps);
    return steps===null?null:{steps,date,source:'cloud',cloudUpdatedAt:row.updated_at||new Date().toISOString()};
  }
  function remember(payload,previous,extra={}){
    const meta=read(META,{}),syncedAt=new Date().toISOString();
    const entry={date:payload.date,steps:payload.steps,previous,syncedAt,source:payload.source,context:standalone()?'standalone':'browser',cloudUpdatedAt:payload.cloudUpdatedAt||extra.cloudUpdatedAt||null,cloud:extra.cloud||null};
    meta.version=2;meta.last=entry;meta.days=meta.days&&typeof meta.days==='object'?meta.days:{};meta.days[payload.date]=entry;
    const keys=Object.keys(meta.days).sort();while(keys.length>120)delete meta.days[keys.shift()];
    write(META,meta);
  }
  function apply(payload,{silent=false,focus=true,clean=false,cloud=null}={}){
    const data=day(payload.date,true),previous=data.steps;data.steps=payload.steps;
    if(!saveState(true)){data.steps=previous;pruneDay(payload.date);if(!silent)toast('Health-Sync konnte nicht gespeichert werden.');return false}
    remember(payload,previous,{cloud,cloudUpdatedAt:payload.cloudUpdatedAt});
    if(focus){selectedDate=payload.date;document.querySelector('[data-tab="today"]')?.click()}
    if(clean)cleanHash();
    window.render();
    if(!silent){const label=payload.source==='cloud'?'Health-Cloud':payload.source==='fitness'?'Apple Fitness':'Apple Health';toast(`${label}: ${fmt(payload.steps)} Schritte übernommen · ${standalone()?'CutCoach':'Safari'}`)}
    return true;
  }
  async function process(){
    const payload=incoming();if(!payload)return false;
    if(payload.error){cleanHash();toast(payload.error);return true}
    if(payload.token)setToken(payload.token);
    const syncToken=payload.token||token(false);
    apply(payload,{clean:true});
    if(!validToken(syncToken)){toast('Lokal übernommen. Für die Home-App fehlt noch der Sync-Code.');return true}
    try{
      const row=await push(payload,syncToken);
      remember({...payload,cloudUpdatedAt:row?.updated_at},payload.steps,{cloud:'saved',cloudUpdatedAt:row?.updated_at});
      window.render();toast('Schritte in der Health-Cloud gespeichert.');
    }catch(error){
      patchPair({cloudReady:false,lastError:String(error?.message||error)});window.render();toast('Lokal übernommen. Supabase-SQL fehlt noch.');
    }
    return true;
  }
  async function pull({silent=true,force=false}={}){
    if(!validToken(token(false))||!navigator.onLine)return null;
    if(!force&&Date.now()-lastPull<30000)return null;
    if(pendingPull)return pendingPull;
    lastPull=Date.now();
    pendingPull=(async()=>{try{
      const payload=await fetchDay();
      if(!payload)return null;
      const meta=read(META,{}),current=day(payload.date,false).steps,known=meta.days?.[payload.date]?.cloudUpdatedAt;
      if(current!==payload.steps||known!==payload.cloudUpdatedAt)apply(payload,{silent,focus:false});
      return payload;
    }catch(error){
      patchPair({cloudReady:false,lastError:String(error?.message||error)});if(!silent)toast('Cloud nicht erreichbar. SQL-Einrichtung prüfen.');window.render();return null;
    }finally{pendingPull=null}})();
    return pendingPull;
  }
  async function testCloud(){
    const current=day(todayKey(),false).steps??0,syncToken=token(true);
    await push({date:todayKey(),steps:current,source:'health'},syncToken);
    const result=await fetchDay(todayKey(),syncToken);
    return Boolean(result&&result.steps===current);
  }
  function ensurePanel(){
    const steps=document.querySelector('.steps-card');
    if(steps&&!document.querySelector('#healthSyncPanel'))steps.querySelector('.bar')?.insertAdjacentHTML('afterend','<div class="health-sync-panel" id="healthSyncPanel"></div>');
  }
  function post(){ensurePanel();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  window.CutCoachHealthSync={version:VERSION,process,pull,push,testCloud,ensureToken:()=>token(true),getToken:()=>token(false),setToken,shortcutSuffix:suffix,personalShortcutTemplate:template,pairData:pair,copyText:copy};
  window.render=function(){baseRender();post()};
  window.addEventListener('hashchange',process);
  window.addEventListener('pageshow',()=>{process();pull({silent:true})});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){process();pull({silent:true})}});
  setInterval(()=>{if(!document.hidden)pull({silent:true})},300000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{window.render();setTimeout(()=>{process();pull({silent:true})},60)},{once:true});
  else{window.render();setTimeout(()=>{process();pull({silent:true})},60)}
})();
