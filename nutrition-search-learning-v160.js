'use strict';
(function(global){
  const VERSION='1.6.0-alpha';
  const BUILD='1.6.0-local-learning';
  const STORAGE_KEY='cutcoach_search_learning_v1';
  const RECOVERY_KEY='cutcoach_search_learning_recovery_v1';
  const DB_VERSION=1;
  const MAX_RECORDS=320;
  const MAX_AGE_MS=180*24*60*60*1000;
  const VALID_MEALS=new Set(['Frühstück','Mittagessen','Abendessen','Snack']);
  if(global.CutCoachSearchLearning160)return;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ').slice(0,80);
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const validTimestamp=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?new Date(time).toISOString():null};
  const itemKey=item=>String(item?.id||`${normalize(item?.name)}:${Number(item?.amount)||0}:${String(item?.unit||'')}`).slice(0,160);
  const mealType=value=>VALID_MEALS.has(String(value||''))?String(value):VALID_MEALS.has(document?.body?.dataset?.nutritionMealType)?document.body.dataset.nutritionMealType:'Snack';

  function blank(){return{version:DB_VERSION,records:[]}}
  function sanitizeRecord(raw){
    const query=normalize(raw?.query),itemId=String(raw?.itemId||'').slice(0,160),context=mealType(raw?.mealType),lastUsedAt=validTimestamp(raw?.lastUsedAt);
    if(query.length<2||!itemId||!lastUsedAt)return null;
    return{query,itemId,mealType:context,adds:Math.round(clamp(raw?.adds,0,999)),choices:Math.round(clamp(raw?.choices,0,999)),lastUsedAt};
  }
  function sanitizeDb(raw){
    const now=Date.now(),dedup=new Map();
    for(const candidate of Array.isArray(raw?.records)?raw.records:[]){
      const record=sanitizeRecord(candidate);if(!record||now-Date.parse(record.lastUsedAt)>MAX_AGE_MS)continue;
      const key=`${record.query}\u0000${record.mealType}\u0000${record.itemId}`,existing=dedup.get(key);
      if(!existing||record.adds+record.choices>existing.adds+existing.choices||record.lastUsedAt>existing.lastUsedAt)dedup.set(key,record);
    }
    return{version:DB_VERSION,records:[...dedup.values()].sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt))).slice(0,MAX_RECORDS)};
  }
  function load(){
    let raw='';
    try{raw=localStorage.getItem(STORAGE_KEY)||'';if(!raw)return blank();const parsed=JSON.parse(raw),clean=sanitizeDb(parsed);if(parsed?.version!==DB_VERSION||clean.records.length!==(parsed?.records?.length||0))localStorage.setItem(STORAGE_KEY,JSON.stringify(clean));return clean}
    catch{try{if(raw&&!localStorage.getItem(RECOVERY_KEY))localStorage.setItem(RECOVERY_KEY,raw)}catch{}return blank()}
  }
  let db=load();
  function save(){try{db=sanitizeDb(db);localStorage.setItem(STORAGE_KEY,JSON.stringify(db));return true}catch{return false}}
  function notify(){try{global.dispatchEvent(new CustomEvent('cutcoach:search-learningchange'))}catch{}}
  function record(query,item,{kind='add',mealType:requestedMealType}={}){
    const q=normalize(query),id=itemKey(item),context=mealType(requestedMealType);if(q.length<2||!id)return false;
    const key=`${q}\u0000${context}\u0000${id}`,records=[...db.records],index=records.findIndex(entry=>`${entry.query}\u0000${entry.mealType}\u0000${entry.itemId}`===key),now=new Date().toISOString();
    const previous=index>=0?records[index]:{query:q,itemId:id,mealType:context,adds:0,choices:0,lastUsedAt:now};
    const next={...previous,lastUsedAt:now,adds:previous.adds+(kind==='add'?1:0),choices:previous.choices+(kind==='choice'?1:0)};
    if(index>=0)records[index]=next;else records.push(next);db={version:DB_VERSION,records};if(!save())return false;notify();return true;
  }
  function ageScore(timestamp){const age=Date.now()-Date.parse(timestamp||'');if(!Number.isFinite(age)||age<0)return 0;if(age<=7*86400000)return 3;if(age<=30*86400000)return 2;if(age<=90*86400000)return 1;return 0}
  function signal(item,origin,query,requestedMealType){
    const id=itemKey(item),q=normalize(query),context=mealType(requestedMealType),uses=Math.max(0,Number(item?.uses)||0),favorite=Boolean(item?.favorite),records=db.records.filter(entry=>entry.itemId===id&&entry.query===q);
    const contextRecord=records.find(entry=>entry.mealType===context),adds=records.reduce((sum,entry)=>sum+entry.adds,0),choices=records.reduce((sum,entry)=>sum+entry.choices,0),lastRecord=records.reduce((latest,entry)=>!latest||entry.lastUsedAt>latest?entry.lastUsedAt:latest,null);
    const useScore=Math.min(7,Math.floor(Math.log2(uses+1)*2)),favoriteScore=favorite?6:0,recencyScore=Math.max(ageScore(item?.lastUsedAt),ageScore(lastRecord)),learnedScore=Math.min(8,adds*2+choices*3),contextScore=contextRecord?Math.min(3,contextRecord.adds+contextRecord.choices):0,sourceScore=origin==='library'||item?.source==='user'?1:0;
    const score=Math.min(18,useScore+favoriteScore+recencyScore+learnedScore+contextScore+sourceScore),decisive=favorite||uses>=3||adds>=3||choices>=2;
    let reason='';if(choices>=2)reason='Deine Wahl';else if(uses>=3||adds>=3)reason='Häufig genutzt';else if(favorite)reason='Favorit';else if(recencyScore)reason='Kürzlich genutzt';
    return Object.freeze({score,decisive,reason,uses,adds,choices,contextHits:contextRecord?(contextRecord.adds+contextRecord.choices):0,itemId:id});
  }
  function queryForItem(item){
    const id=itemKey(item),node=document.querySelector('#nutritionMultiSearch'),rows=Array.isArray(node?._canonicalRows)?node._canonicalRows:[],row=rows.find(candidate=>candidate?.item&&itemKey(candidate.item)===id);
    return row?.query||document.querySelector('#nutritionSearch')?.value||'';
  }
  function installLibraryHook(){
    const library=global.CutCoachLibrary,original=library?.addCatalogItemToDay;if(typeof original!=='function'||original.__cutcoachLearning160)return false;
    function wrapped(item,options={}){const result=original.call(library,item,options);if(result)record(queryForItem(item),item,{kind:'add',mealType:options?.type});return result}
    Object.defineProperty(wrapped,'__cutcoachLearning160',{value:true});library.addCatalogItemToDay=wrapped;return true;
  }
  function clear(){db=blank();try{localStorage.removeItem(STORAGE_KEY)}catch{}notify();return true}
  function snapshot(){return JSON.parse(JSON.stringify(db))}

  global.CutCoachSearchLearning160=Object.freeze({version:VERSION,build:BUILD,record,signal,clear,snapshot,normalize,itemKey,installLibraryHook});
  installLibraryHook();
})(window);