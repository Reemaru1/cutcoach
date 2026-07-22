'use strict';

(function(root){
  const STORAGE_KEY='cutcoach_product_insights_v1';
  const PREFERENCE_KEY='cutcoach_product_insights_enabled_v1';
  const ONBOARDING_SESSION_KEY='cutcoach_onboarding_started_v1';
  const FEATURES=new Set(['journal','nutrition','progress','settings']);
  const ACTIONS=new Set(['journal_meal_open','journal_quick_meal','journal_quick_water','journal_quick_steps','journal_quick_check','journal_training_open','progress_measurement_open','progress_training_open']);
  let lastSearchSignature='';
  let lastSearchAt=0;

  function empty(){return{version:1,createdAt:new Date().toISOString(),updatedAt:null,onboarding:{shown:0,completed:0,abandoned:0,duration:{underMinute:0,oneToThreeMinutes:0,overThreeMinutes:0}},features:{journal:0,nutrition:0,progress:0,settings:0},actions:{},feedback:{journal:{helpful:0,partial:0,unhelpful:0}},search:{attempts:0,withResults:0,zeroResults:0,selections:0,length:{short:0,medium:0,long:0},latency:{fast:0,normal:0,slow:0}},accessibility:{audits:0,lastAt:null,missingNames:0,missingLabels:0,missingAlt:0,duplicateIds:0,smallTargets:0}}}
  function storage(){try{return root.localStorage}catch{return null}}
  function enabled(){try{return storage()?.getItem(PREFERENCE_KEY)!=='false'}catch{return false}}
  function read(){
    try{
      const parsed=JSON.parse(storage()?.getItem(STORAGE_KEY)||'null');
      if(!parsed||parsed.version!==1)return empty();
      const base=empty();
      return{...base,...parsed,onboarding:{...base.onboarding,...parsed.onboarding,duration:{...base.onboarding.duration,...parsed.onboarding?.duration}},features:{...base.features,...parsed.features},actions:{...base.actions,...parsed.actions},feedback:{journal:{...base.feedback.journal,...parsed.feedback?.journal}},search:{...base.search,...parsed.search,length:{...base.search.length,...parsed.search?.length},latency:{...base.search.latency,...parsed.search?.latency}},accessibility:{...base.accessibility,...parsed.accessibility}};
    }catch{return empty()}
  }
  function write(data){
    if(!enabled())return false;
    try{data.updatedAt=new Date().toISOString();storage()?.setItem(STORAGE_KEY,JSON.stringify(data));root.dispatchEvent(new CustomEvent('cutcoach:insights-updated'));return true}catch{return false}
  }
  function onboardingDuration(data,startedAt){
    const duration=Math.max(0,Date.now()-startedAt),bucket=duration<60000?'underMinute':duration<180000?'oneToThreeMinutes':'overThreeMinutes';
    data.onboarding.duration[bucket]+=1;
  }
  function track(type,detail={}){
    if(!enabled())return false;
    const data=read();
    if(type==='onboarding_shown'){
      let active=false;try{active=Boolean(root.sessionStorage.getItem(ONBOARDING_SESSION_KEY))}catch{}
      if(active)return true;
      data.onboarding.shown+=1;try{root.sessionStorage.setItem(ONBOARDING_SESSION_KEY,String(Date.now()))}catch{}
    }else if(type==='onboarding_completed'){
      data.onboarding.completed+=1;let started=0;try{started=Number(root.sessionStorage.getItem(ONBOARDING_SESSION_KEY))||0;root.sessionStorage.removeItem(ONBOARDING_SESSION_KEY)}catch{}
      if(started)onboardingDuration(data,started);
    }else if(type==='feature_view'&&FEATURES.has(detail.feature)){
      data.features[detail.feature]+=1;
    }else if(type==='action'&&ACTIONS.has(detail.action)){
      data.actions[detail.action]=(data.actions[detail.action]||0)+1;
    }else if(type==='journal_feedback'&&['helpful','partial','unhelpful'].includes(detail.value)){
      data.feedback.journal[detail.value]+=1;
    }else if(type==='search_rendered'&&detail.hasQuery){
      const length=['short','medium','long'].includes(detail.queryLengthBucket)?detail.queryLengthBucket:'medium',results=Math.max(0,Number(detail.resultCount)||0),latency=Math.max(0,Number(detail.latencyMs)||0),signature=`${length}:${results===0?'0':results<10?'few':'many'}`,now=Date.now();
      if(signature===lastSearchSignature&&now-lastSearchAt<700)return true;
      lastSearchSignature=signature;lastSearchAt=now;data.search.attempts+=1;data.search.length[length]+=1;
      if(results>0)data.search.withResults+=1;else data.search.zeroResults+=1;
      data.search.latency[latency<=250?'fast':latency<=700?'normal':'slow']+=1;
    }else if(type==='search_selected'){
      data.search.selections+=1;
    }else if(type==='accessibility_audit'){
      data.accessibility.audits+=1;data.accessibility.lastAt=new Date().toISOString();
      for(const key of ['missingNames','missingLabels','missingAlt','duplicateIds','smallTargets'])data.accessibility[key]=Math.max(0,Math.round(Number(detail[key])||0));
    }else return false;
    return write(data);
  }
  function setEnabled(value){
    try{storage()?.setItem(PREFERENCE_KEY,value?'true':'false');if(!value){storage()?.removeItem(STORAGE_KEY);root.sessionStorage.removeItem(ONBOARDING_SESSION_KEY)}root.dispatchEvent(new CustomEvent('cutcoach:insights-updated'));return true}catch{return false}
  }
  function reset(){try{storage()?.removeItem(STORAGE_KEY);root.sessionStorage.removeItem(ONBOARDING_SESSION_KEY);root.dispatchEvent(new CustomEvent('cutcoach:insights-updated'));return true}catch{return false}}
  function snapshot(){return JSON.parse(JSON.stringify(read()))}
  function abandonOnboarding(){
    if(!enabled())return;
    let started=0;try{started=Number(root.sessionStorage.getItem(ONBOARDING_SESSION_KEY))||0;if(started)root.sessionStorage.removeItem(ONBOARDING_SESSION_KEY)}catch{}
    if(!started)return;const data=read();data.onboarding.abandoned+=1;onboardingDuration(data,started);write(data);
  }

  root.CutCoachInsights=Object.freeze({track,snapshot,reset,isEnabled:enabled,setEnabled,storageKey:STORAGE_KEY});
  root.addEventListener('pagehide',abandonOnboarding);
})(window);
