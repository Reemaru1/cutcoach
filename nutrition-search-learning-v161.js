'use strict';
(function(global){
  const VERSION='1.6.1-alpha';
  const BUILD='1.6.1-stage4-hardening';
  const STORAGE_KEY='cutcoach_search_learning_v1';
  const RECOVERY_KEY='cutcoach_search_learning_recovery_v1';
  const DB_VERSION=1;
  const MAX_RECORDS=320;
  const MAX_AGE_MS=180*24*60*60*1000;
  const MAX_FUTURE_SKEW_MS=24*60*60*1000;
  const VALID_MEALS=new Set(['Frühstück','Mittagessen','Abendessen','Snack']);
  const VALID_KINDS=new Set(['add','choice']);
  const TOKEN_META=Symbol('cutcoach-search-learning-161');
  if(global.CutCoachSearchLearning161?.version===VERSION)return;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ').slice(0,80);
  const compact=value=>normalize(value).replace(/\s+/g,'');
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const itemKey=item=>String(typeof item==='string'?item:item?.id||`${normalize(item?.name)}:${Number(item?.amount)||0}:${String(item?.unit||'')}`).slice(0,160);
  const cleanMealType=value=>VALID_MEALS.has(String(value||''))?String(value):null;
  const currentMealType=value=>cleanMealType(value)||cleanMealType(global.document?.body?.dataset?.nutritionMealType)||'Snack';
  const nowIso=()=>new Date().toISOString();
  function blank(){return{version:DB_VERSION,records:[]}}
  function timestamp(value){const time=Date.parse(value||'');return Number.isFinite(time)?time:null}
  function sanitizeRecord(raw,now=Date.now()){
    const query=normalize(raw?.query),itemId=itemKey(raw?.itemId),context=cleanMealType(raw?.mealType),time=timestamp(raw?.lastUsedAt),adds=Math.round(clamp(raw?.adds,0,999)),choices=Math.round(clamp(raw?.choices,0,999));
    if(query.length<2||!itemId||!context||time===null||time>now+MAX_FUTURE_SKEW_MS||now-time>MAX_AGE_MS||adds+choices<1)return null;
    return{query,itemId,mealType:context,adds,choices,lastUsedAt:new Date(time).toISOString()};
  }
  function sanitizeDb(raw){
    const now=Date.now(),dedup=new Map();
    for(const candidate of Array.isArray(raw?.records)?raw.records:[]){const record=sanitizeRecord(candidate,now);if(!record)continue;const key=`${record.query}\u0000${record.mealType}\u0000${record.itemId}`,existing=dedup.get(key);if(!existing||record.lastUsedAt>existing.lastUsedAt||(record.lastUsedAt===existing.lastUsedAt&&record.adds+record.choices>existing.adds+existing.choices))dedup.set(key,record)}
    return{version:DB_VERSION,records:[...dedup.values()].sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt))).slice(0,MAX_RECORDS)};
  }
  function recover(raw){try{if(raw&&!global.localStorage.getItem(RECOVERY_KEY))global.localStorage.setItem(RECOVERY_KEY,raw)}catch{}}
  function parseRaw(raw,{writeRecovery=false}={}){if(!raw)return blank();try{return sanitizeDb(JSON.parse(raw))}catch{if(writeRecovery)recover(raw);return blank()}}
  function readStored({writeRecovery=false}={}){try{return parseRaw(global.localStorage.getItem(STORAGE_KEY)||'',{writeRecovery})}catch{return blank()}}
  let db=readStored({writeRecovery:true});
  function persist(next){const clean=sanitizeDb(next);try{global.localStorage.setItem(STORAGE_KEY,JSON.stringify(clean));db=clean;return true}catch{return false}}
  function mergeDb(left,right){const merged=new Map();for(const source of [sanitizeDb(left),sanitizeDb(right)])for(const record of source.records){const key=`${record.query}\u0000${record.mealType}\u0000${record.itemId}`,existing=merged.get(key);if(!existing||record.lastUsedAt>existing.lastUsedAt||(record.lastUsedAt===existing.lastUsedAt&&record.adds+record.choices>existing.adds+existing.choices))merged.set(key,record)}return sanitizeDb({version:DB_VERSION,records:[...merged.values()]})}
  function notify(){try{global.dispatchEvent(new CustomEvent('cutcoach:search-learningchange'))}catch{}}
  function editDistanceWithin(left,right,limit){if(left===right)return 0;if(Math.abs(left.length-right.length)>limit)return limit+1;let previous=Array.from({length:right.length+1},(_,index)=>index);for(let row=1;row<=left.length;row++){const current=[row];let best=current[0];for(let column=1;column<=right.length;column++){const value=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+Number(left[row-1]!==right[column-1]));current[column]=value;best=Math.min(best,value)}if(best>limit)return limit+1;previous=current}return previous[right.length]}
  function tokenRelated(queryToken,candidateToken){if(queryToken===candidateToken)return true;if(queryToken.length>=3&&(candidateToken.startsWith(queryToken)||queryToken.startsWith(candidateToken)))return true;const limit=queryToken.length>=9?2:queryToken.length>=4?1:0;return limit>0&&editDistanceWithin(queryToken,candidateToken,limit)<=limit}
  function namesOf(item){return[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[item?.aliases])].filter(Boolean).map(normalize).filter(Boolean)}
  function queryRelatedToItem(query,item){const q=normalize(query);if(q.length<2||!item)return false;const qCompact=compact(q),qTokens=q.split(' ').filter(Boolean);for(const name of namesOf(item)){const nameCompact=compact(name),nameTokens=name.split(' ').filter(Boolean);if(q===name||qCompact===nameCompact)return true;if(qCompact.length>=3&&(nameCompact.includes(qCompact)||qCompact.includes(nameCompact)))return true;if(qTokens.every(queryToken=>nameTokens.some(candidateToken=>tokenRelated(queryToken,candidateToken))))return true}return false}
  function recordKey(query,mealType,itemId){return`${query}\u0000${mealType}\u0000${itemId}`}
  function adjust(query,item,{kind='add',mealType:requestedMealType,delta=1,validateRelation=true}={}){
    const q=normalize(query),id=itemKey(item),context=currentMealType(requestedMealType),cleanKind=VALID_KINDS.has(kind)?kind:null,change=delta>=0?1:-1;
    if(q.length<2||!id||!cleanKind||(validateRelation&&!queryRelatedToItem(q,item)))return false;
    const base=mergeDb(db,readStored()),key=recordKey(q,context,id),records=[...base.records],index=records.findIndex(entry=>recordKey(entry.query,entry.mealType,entry.itemId)===key),previous=index>=0?records[index]:{query:q,itemId:id,mealType:context,adds:0,choices:0,lastUsedAt:nowIso()};
    const next={...previous,lastUsedAt:nowIso(),adds:Math.max(0,previous.adds+(cleanKind==='add'?change:0)),choices:Math.max(0,previous.choices+(cleanKind==='choice'?change:0))};
    if(next.adds+next.choices<1){if(index>=0)records.splice(index,1);else return true}else if(index>=0)records[index]=next;else records.push(next);
    const saved=persist({version:DB_VERSION,records});if(saved)notify();return saved;
  }
  function record(query,item,options={}){return adjust(query,item,{...options,delta:1,validateRelation:true})}
  function attachToken(token,meta){if(!token||typeof token!=='object')return;try{Object.defineProperty(token,TOKEN_META,{value:Object.freeze(meta),configurable:true})}catch{}}
  function recordAdd(query,item,{mealType:requestedMealType,token=null}={}){const context=currentMealType(requestedMealType),saved=record(query,item,{kind:'add',mealType:context});if(saved)attachToken(token,{query:normalize(query),itemId:itemKey(item),mealType:context,kind:'add'});return saved}
  function revertToken(token){const meta=token?.[TOKEN_META];if(!meta)return false;const reverted=adjust(meta.query,meta.itemId,{kind:meta.kind,mealType:meta.mealType,delta:-1,validateRelation:false});try{delete token[TOKEN_META]}catch{}return reverted}
  function ageScore(value){const age=Date.now()-(timestamp(value)??NaN);if(!Number.isFinite(age)||age<0)return 0;if(age<=7*86400000)return 3;if(age<=30*86400000)return 2;if(age<=90*86400000)return 1;return 0}
  function signal(item,origin,query,requestedMealType){const id=itemKey(item),q=normalize(query),context=currentMealType(requestedMealType),uses=Math.max(0,Number(item?.uses)||0),favorite=Boolean(item?.favorite),records=db.records.filter(entry=>entry.itemId===id&&entry.query===q);const contextRecord=records.find(entry=>entry.mealType===context),adds=records.reduce((sum,entry)=>sum+entry.adds,0),choices=records.reduce((sum,entry)=>sum+entry.choices,0),lastRecord=records.reduce((latest,entry)=>!latest||entry.lastUsedAt>latest?entry.lastUsedAt:latest,null);const useScore=Math.min(7,Math.floor(Math.log2(uses+1)*2)),favoriteScore=favorite?6:0,recencyScore=Math.max(ageScore(item?.lastUsedAt),ageScore(lastRecord)),learnedScore=Math.min(8,adds*2+choices*3),contextScore=contextRecord?Math.min(3,contextRecord.adds+contextRecord.choices):0,sourceScore=origin==='library'||item?.source==='user'?1:0;const decisive=favorite||uses>=3||adds>=3||choices>=2,rawScore=useScore+favoriteScore+recencyScore+learnedScore+contextScore+sourceScore,score=decisive?Math.min(18,rawScore):Math.min(3,rawScore);let reason='';if(choices>=2)reason='Deine Wahl';else if(uses>=3||adds>=3)reason='Häufig genutzt';else if(favorite)reason='Favorit';else if(recencyScore)reason='Kürzlich genutzt';return Object.freeze({score,decisive,reason,uses,adds,choices,contextHits:contextRecord?(contextRecord.adds+contextRecord.choices):0,itemId:id})}
  function sameItem(left,right){if(!left||!right)return false;if(itemKey(left)===itemKey(right))return true;if(left.source&&left.sourceId&&left.source===right.source&&left.sourceId===right.sourceId)return true;return normalize(left.name)===normalize(right.name)&&String(left.unit||'')===String(right.unit||'')&&Math.abs((Number(left.amount)||0)-(Number(right.amount)||0))<.001}
  function stripAmount(value){return normalize(String(value||'').replace(/^\s*(?:\d+(?:[.,]\d+)?|halb(?:e|en|er|es)?|anderthalb|ein(?:e|en|er|es)?|eins|zwei|drei|vier|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn)\s*(?:kg|kilogramm|kilo|g|gramm|ml|milliliter|l|liter|st(?:ü|ue)ck|portion(?:en)?|dose(?:n)?|glas|gl(?:ä|ae)ser|flasche(?:n)?|scheibe(?:n)?|essl(?:ö|oe)ffel|el|teel(?:ö|oe)ffel|tl|handvoll)?\b\s*/i,''))}
  function activeSearchContext(item){const page=global.document,screen=page?.querySelector?.('[data-screen="food"]'),input=page?.querySelector?.('#nutritionSearch');if(!screen?.classList.contains('active')||!input?.isConnected||!String(input.value||'').trim())return null;const host=page.querySelector('#nutritionMultiSearch'),hostRows=Array.isArray(host?._canonicalRows)?host._canonicalRows:[];if(host&&!host.hidden&&host.dataset.canonical==='1'&&normalize(input.value)===host.dataset.query){const row=hostRows.find(candidate=>sameItem(candidate?.item,item));if(row?.query&&queryRelatedToItem(row.query,item))return{query:row.query,mealType:currentMealType(),source:'intelligent-search'}}try{const rows=global.CutCoachIntelligentSearch128?.rowsFor?.(input.value)||[],row=rows.find(candidate=>sameItem(candidate?.item,item));if(row?.query&&queryRelatedToItem(row.query,item))return{query:row.query,mealType:currentMealType(),source:'search'}}catch{}const query=stripAmount(input.value);return queryRelatedToItem(query,item)?{query,mealType:currentMealType(),source:'search'}:null}
  function libraryItem(id){try{return global.CutCoachLibrary?.exportData?.().items?.find(item=>String(item.id)===String(id))||null}catch{return null}}
  function catalogItem(id){for(const catalog of [global.CutCoachFoodCatalog,global.CutCoachEverydayCatalog]){try{const direct=catalog?.get?.(id);if(direct)return direct;const found=catalog?.items?.().find(item=>String(item.id)===String(id));if(found)return found}catch{}}return null}
  function resolveItem(id){return libraryItem(id)||catalogItem(id)}
  function wrapLibraryMethod(library,name,resolver){const original=library?.[name];if(typeof original!=='function'||original.__cutcoachLearning161)return false;function wrapped(...args){const item=resolver(...args),context=activeSearchContext(item),result=original.apply(library,args);if(result&&context)recordAdd(context.query,item,{mealType:context.mealType,token:result});return result}Object.defineProperty(wrapped,'__cutcoachLearning161',{value:true});library[name]=wrapped;return true}
  function installLibraryHook(){const library=global.CutCoachLibrary;if(!library)return false;wrapLibraryMethod(library,'addItemToDay',id=>libraryItem(id));wrapLibraryMethod(library,'addCatalogItemToDay',item=>item);const originalUndo=library.undoDayAdd;if(typeof originalUndo==='function'&&!originalUndo.__cutcoachLearning161){function wrappedUndo(token){const result=originalUndo.call(library,token);if(result)revertToken(token);return result}Object.defineProperty(wrappedUndo,'__cutcoachLearning161',{value:true});library.undoDayAdd=wrappedUndo}return true}
  let pendingDetail=null,pendingTimer=0;
  function clearPendingDetail(){clearTimeout(pendingTimer);pendingTimer=0;pendingDetail=null}
  function schedulePendingExpiry(delay=5000){clearTimeout(pendingTimer);pendingTimer=setTimeout(clearPendingDetail,delay)}
  function handleClick(event){const target=event.target;const open=target?.closest?.('#nutritionResults [data-nutrition-open]');if(open){const item=resolveItem(open.dataset.nutritionOpen),context=activeSearchContext(item);pendingDetail=context?{...context,item,awaiting:false}:null;if(pendingDetail)schedulePendingExpiry();return}if(target?.closest?.('#addLibraryMeal')){if(pendingDetail){pendingDetail.awaiting=true;schedulePendingExpiry(1800)}return}if(target?.closest?.('#libraryUseModal [data-library-close]')||target?.id==='libraryUseModal'){clearPendingDetail();return}if(target?.closest?.('#resetData'))setTimeout(()=>{let reset=false;try{reset=typeof state==='object'&&state?.onboarded===false&&Boolean(global.document?.querySelector?.('#onboardingModal.open,#onboardingModal[aria-hidden="false"]'))}catch{}if(reset)clear()},0)}
  function handleLibraryChange(){if(!pendingDetail?.awaiting)return;const current=pendingDetail;clearPendingDetail();recordAdd(current.query,current.item,{mealType:current.mealType})}
  function handleStorage(event){if(event.key!==STORAGE_KEY)return;db=parseRaw(event.newValue||'');notify()}
  function clear(){db=blank();let success=true;try{global.localStorage.removeItem(STORAGE_KEY);global.localStorage.removeItem(RECOVERY_KEY)}catch{success=false}clearPendingDetail();notify();return success}
  function snapshot(){return JSON.parse(JSON.stringify(db))}
  const api=Object.freeze({version:VERSION,build:BUILD,storageKey:STORAGE_KEY,record,recordAdd,revertToken,signal,clear,snapshot,normalize,itemKey,queryRelatedToItem,installLibraryHook});
  global.CutCoachSearchLearning161=api;global.CutCoachSearchLearning160=api;
  global.document?.addEventListener?.('click',handleClick,true);global.addEventListener?.('cutcoach:librarychange',handleLibraryChange);global.addEventListener?.('storage',handleStorage);installLibraryHook();
})(window);