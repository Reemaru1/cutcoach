'use strict';

const WORKER_VERSION='1.0.0';
const MAX_RESULTS=600;
let entries=[];
let indexVersion='';

function clock(){return typeof performance==='object'&&typeof performance.now==='function'?performance.now():Date.now()}
function normalized(value){
  return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/\u00df/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
}
function compact(value){return normalized(value).replace(/\s+/g,'')}
function makeEntry(row){
  const id=String(row?.[0]||''),name=normalized(row?.[1]),aliases=(Array.isArray(row?.[2])?row[2]:[]).map(normalized).filter(Boolean),barcode=normalized(row?.[3]),featured=Array.isArray(row?.[4])?row[4]:null;
  const compactName=name.replace(/\s+/g,''),compactAliases=aliases.map(value=>value.replace(/\s+/g,'')),words=[name,...aliases].flatMap(value=>value.split(/\s+/)).filter(Boolean);
  return{id,name,aliases,compact:compactName,compactAliases,searchable:[name,...aliases].join(' '),searchableCompact:[compactName,...compactAliases].join(' '),words,barcode,featured};
}
function searchPlan(value){
  const query=normalized(value);
  return{query,compact:compact(query),tokens:query.split(/\s+/).filter(Boolean).map(token=>({value:token,compact:token.replace(/\s+/g,'')}))};
}
function editDistanceWithin(left,right,limit){
  if(left===right)return 0;
  if(Math.abs(left.length-right.length)>limit)return limit+1;
  let previous=Array.from({length:right.length+1},(_,index)=>index);
  for(let row=1;row<=left.length;row++){
    const current=[row];let best=current[0];
    for(let column=1;column<=right.length;column++){
      const value=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+Number(left[row-1]!==right[column-1]));
      current[column]=value;best=Math.min(best,value);
    }
    if(best>limit)return limit+1;
    previous=current;
  }
  return previous[right.length];
}
function fuzzyMatch(token,entry){
  if(token.length<4)return false;
  const limit=token.length>=8?2:1,candidates=[entry.compact,...entry.words].filter(word=>Math.abs(word.length-token.length)<=limit);
  return candidates.some(candidate=>editDistanceWithin(token,candidate,limit)<=limit);
}
function entryScore(entry,plan,mealIndex,routineScore=0,allowFuzzy=false){
  let fuzzyHits=0;
  for(const token of plan.tokens){
    const direct=entry.searchable.includes(token.value)||entry.searchableCompact.includes(token.compact)||entry.barcode.includes(token.value);
    if(direct)continue;
    if(!allowFuzzy||!fuzzyMatch(token.compact,entry))return null;
    fuzzyHits++;
  }
  let score=0;
  if(entry.name===plan.query||entry.compact===plan.compact||entry.aliases.includes(plan.query)||entry.compactAliases.includes(plan.compact))score+=1000;
  else if(entry.name.startsWith(plan.query)||entry.compact.startsWith(plan.compact)||entry.aliases.some(value=>value.startsWith(plan.query))||entry.compactAliases.some(value=>value.startsWith(plan.compact)))score+=600;
  else if(entry.words.some(word=>word.startsWith(plan.query)))score+=350;
  for(const token of plan.tokens){
    if(entry.words.some(word=>word.startsWith(token.value)))score+=80;
    if(entry.barcode===token.value)score+=900;
  }
  score+=fuzzyHits*35;
  const rank=Math.max(0,Number(entry.featured?.[mealIndex])||0);
  return score+Math.min(220,Math.max(0,Number(routineScore)||0)*3)+(rank?Math.max(20,180-rank*5):0);
}
function performSearch(message){
  const startedAt=clock(),plan=searchPlan(message.query),mealIndex=Math.max(0,Math.min(3,Number(message.mealIndex)||0)),routines=new Map(Array.isArray(message.routines)?message.routines:[]),direct=[],misses=[];
  if(!plan.query)return{matches:[],total:0,directMatches:0,fuzzyMatches:0,fuzzyPass:false,durationMs:0};
  for(const entry of entries){
    const score=entryScore(entry,plan,mealIndex,routines.get(entry.name),false);
    if(score===null)misses.push(entry);else direct.push([entry.id,score]);
  }
  const fuzzyPass=direct.length<3&&plan.tokens.some(token=>token.compact.length>=4),fuzzy=[];
  if(fuzzyPass){
    for(const entry of misses){
      const score=entryScore(entry,plan,mealIndex,routines.get(entry.name),true);
      if(score!==null)fuzzy.push([entry.id,score]);
    }
  }
  const matches=direct.concat(fuzzy).sort((left,right)=>right[1]-left[1]||left[0].localeCompare(right[0])).slice(0,MAX_RESULTS);
  return{matches,total:direct.length+fuzzy.length,directMatches:direct.length,fuzzyMatches:fuzzy.length,fuzzyPass,durationMs:Math.max(0,Math.round((clock()-startedAt)*10)/10)};
}

self.onmessage=async event=>{
  const message=event?.data||{};
  if(message.type==='init'){
    const startedAt=clock();
    try{
      const response=await fetch(message.indexUrl,{cache:'force-cache'});
      if(!response.ok)throw new Error(`Index HTTP ${response.status}`);
      const payload=await response.json();
      if(!Array.isArray(payload.entries)||payload.count!==payload.entries.length)throw new Error('Ungueltiger Suchindex');
      entries=payload.entries.map(makeEntry).filter(entry=>entry.id&&entry.name);
      indexVersion=String(payload.version||'');
      self.postMessage({type:'ready',workerVersion:WORKER_VERSION,indexVersion,count:entries.length,initMs:Math.max(0,Math.round((clock()-startedAt)*10)/10)});
    }catch(error){
      entries=[];
      self.postMessage({type:'error',stage:'init',message:String(error?.message||error)});
    }
    return;
  }
  if(message.type==='search'){
    if(!entries.length){self.postMessage({type:'error',stage:'search',requestId:message.requestId,message:'Suchindex nicht bereit'});return}
    try{self.postMessage({type:'result',requestId:message.requestId,indexVersion,...performSearch(message)})}
    catch(error){self.postMessage({type:'error',stage:'search',requestId:message.requestId,message:String(error?.message||error)})}
  }
};
