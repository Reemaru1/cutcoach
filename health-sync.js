'use strict';
(function(){
  const VERSION='5.3.0',META='cutcoach_health_sync_v1',PAIR='cutcoach_cloud_pair_v1',MAX=100000;
  const REST='https://jzaktqzpiqhtjzstprmo.supabase.co/rest/v1';
  const KEY='sb_publishable_XaGAJ421We1klT5HQS7ZVQ_TvbluaPa';
  const BASE='https://reemaru1.github.io/cutcoach/health-bridge.html?steps=';
  const baseRender=window.render;
  let lastPull=0,pendingPull=null,status='idle';
  const read=(key,fallback={})=>{try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:fallback}catch{return fallback}};
  const write=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}};
  const standalone=()=>Boolean(matchMedia?.('(display-mode: standalone)').matches||navigator.standalone);
  const validToken=value=>/^[A-Za-z0-9_-]{24,80}$/.test(String(value||''));
  function parseSteps(value){let text=String(value??'').trim().replace(/[\s\u00a0\u202f]/g,'');if(!text)return null;text=text.replace(/([,.])0+$/,'');if(/^\d{1,3}([.,]\d{3})+$/.test(text))text=text.replace(/[.,]/g,'');if(!/^\d{1,6}$/.test(text))return null;const n=Math.round(Number(text));return Number.isFinite(n)&&n>=0&&n<=MAX?n:null}
  function makeToken(){const bytes=new Uint8Array(24);crypto.getRandomValues(bytes);let raw='';bytes.forEach(v=>raw+=String.fromCharCode(v));return btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
  const pair=()=>read(PAIR,{});
  function token(create=false){const current=pair().token;if(validToken(current))return current;if(!create)return '';const next=makeToken();write(PAIR,{...pair(),token:next,createdAt:new Date().toISOString()});return next}
  function setToken(value){if(!validToken(value))return false;write(PAIR,{...pair(),token:value,pairedAt:new Date().toISOString()});return true}
  const patchPair=patch=>write(PAIR,{...pair(),...patch});
  const suffix=()=>`&sync=${token(true)}&source=health`;
  const template=()=>`${BASE}[SUMME]${suffix()}`;
  function copy(text){if(navigator.clipboard?.writeText)return navigator.clipboard.writeText(text);const el=document.createElement('textarea');el.value=text;el.style.position='fixed';el.style.opacity='0';document.body.append(el);el.select();document.execCommand('copy');el.remove();return Promise.resolve()}
  async function rpc(name,body){const response=await fetch(`${REST}/rpc/${name}`,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});const text=await response.text();let data=null;if(text){try{data=JSON.parse(text)}catch{data=text}}if(!response.ok)throw new Error(typeof data==='object'&&data?.message?data.message:`Cloud-Fehler ${response.status}`);return data}
  async function push(payload,syncToken=token(false)){if(!validToken(syncToken))throw new Error('Kein persönlicher Sync-Code');const data=await rpc('cutcoach_upsert_steps',{p_sync_token:syncToken,p_day:payload.date,p_steps:payload.steps});const row=Array.isArray(data)?data[0]:data;patchPair({cloudReady:true,lastPushAt:new Date().toISOString(),lastError:''});return row||{steps:payload.steps,updated_at:new Date().toISOString()}}
  async function fetchDay(date=todayKey(),syncToken=token(false)){if(!validToken(syncToken))return null;const data=await rpc('cutcoach_get_steps',{p_sync_token:syncToken,p_day:date});const row=Array.isArray(data)?data[0]:data;patchPair({cloudReady:true,lastPullAt:new Date().toISOString(),lastError:''});const steps=parseSteps(row?.steps);return steps===null?null:{steps,date,source:'cloud',cloudUpdatedAt:row.updated_at||new Date().toISOString()}}
  function remember(payload,previous){const meta=read(META,{}),syncedAt=new Date().toISOString(),entry={date:payload.date,steps:payload.steps,previous,syncedAt,source:payload.source,context:standalone()?'standalone':'browser',cloudUpdatedAt:payload.cloudUpdatedAt||null};meta.version=4;meta.last=entry;meta.days=meta.days&&typeof meta.days==='object'?meta.days:{};meta.days[payload.date]=entry;write(META,meta)}
  function apply(payload,{silent=false}={}){const data=day(payload.date,true),previous=data.steps;data.steps=payload.steps;if(!saveState(true)){data.steps=previous;return false}remember(payload,previous);window.render();if(!silent)toast(`Aktualisiert: ${fmt(payload.steps)} Schritte`);return true}
  async function pull({silent=true,force=false}={}){if(!validToken(token(false))||!navigator.onLine)return null;if(!force&&Date.now()-lastPull<15000)return null;if(pendingPull)return pendingPull;lastPull=Date.now();status='syncing';window.render();pendingPull=(async()=>{try{const payload=await fetchDay();if(!payload){status='idle';return null}const current=day(payload.date,false).steps,meta=read(META,{}),known=meta.days?.[payload.date]?.cloudUpdatedAt;if(current!==payload.steps||known!==payload.cloudUpdatedAt)apply(payload,{silent});status='success';return payload}catch(error){status='error';patchPair({cloudReady:false,lastError:String(error?.message||error)});if(!silent)toast('Cloud gerade nicht erreichbar.');return null}finally{pendingPull=null;window.render()}})();return pendingPull}
  async function testCloud(){const syncToken=token(true),probe=Math.max(1,day(todayKey(),false).steps||1);await push({date:todayKey(),steps:probe},syncToken);const result=await fetchDay(todayKey(),syncToken);return Boolean(result&&result.steps===probe)}
  function ensurePanel(){const steps=document.querySelector('.steps-card');if(steps&&!document.querySelector('#healthSyncPanel'))steps.querySelector('.bar')?.insertAdjacentHTML('afterend','<div class="health-sync-panel" id="healthSyncPanel"></div>')}
  function post(){ensurePanel();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  window.CutCoachHealthSync={version:VERSION,pull,push,testCloud,ensureToken:()=>token(true),getToken:()=>token(false),setToken,shortcutSuffix:suffix,personalShortcutTemplate:template,pairData:pair,copyText:copy,syncStatus:()=>status};
  window.render=function(){baseRender();post()};
  const auto=()=>pull({silent:true,force:true});
  window.addEventListener('pageshow',auto);
  window.addEventListener('online',auto);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)auto()});
  setInterval(()=>{if(!document.hidden)pull({silent:true})},60000);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{window.render();setTimeout(auto,80)},{once:true});else{window.render();setTimeout(auto,80)}
})();