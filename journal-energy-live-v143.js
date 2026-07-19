'use strict';
(function(){
  const VERSION='1.4.3-alpha';
  const GENERATED_SELECTOR='#journalEnergyStatus,#journalMacroModal,#journalSummaryModal,#journalCheckInsight';
  const ACTION_SELECTOR='#saveMeal,#nutritionDetailAdd,[data-nutrition-add],[data-canonical-add],[data-canonical-all],[data-multi-add],[data-multi-add-all],[data-delete-meal],[data-edit-meal],[data-nutrition-delete],#copyPreviousMeals,#nutritionCopyPrevious';
  let frame=0,observer=null,bootstrapObserver=null,retryTimer=0;

  function renderJournal(){
    frame=0;
    const renderer=window.CutCoachJournalV72?.render;
    if(typeof renderer!=='function'){
      clearTimeout(retryTimer);
      retryTimer=setTimeout(queue,80);
      return false;
    }
    try{renderer();return true}catch(error){console.error('CutCoach journal live refresh failed',error);return false}
  }
  function queue(){if(frame)return;frame=requestAnimationFrame(renderJournal)}
  function mutationSource(record){
    const node=record.target?.nodeType===Node.TEXT_NODE?record.target.parentElement:record.target;
    if(!node?.closest?.('#today560'))return false;
    if(node.closest(GENERATED_SELECTOR))return false;
    return record.type==='characterData'||record.addedNodes?.length>0||record.removedNodes?.length>0;
  }
  function observeJournal(){
    const root=document.querySelector('#today560');if(!root)return false;
    bootstrapObserver?.disconnect();bootstrapObserver=null;observer?.disconnect();
    observer=new MutationObserver(records=>{if(records.some(mutationSource))queue()});
    observer.observe(root,{childList:true,subtree:true,characterData:true});queue();return true;
  }
  function wrapRender(){
    const current=window.render;if(typeof current!=='function'||current.__journalEnergy143)return;
    const wrapped=function(){const value=current.apply(this,arguments);queueMicrotask(queue);return value};
    wrapped.__journalEnergy143=true;window.render=wrapped;
  }
  function bootstrap(){
    wrapRender();
    if(!observeJournal()){
      bootstrapObserver=new MutationObserver(()=>{wrapRender();observeJournal()});
      bootstrapObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});
    }
    document.addEventListener('cutcoach:data-changed',queue);
    window.addEventListener('cutcoach:librarychange',queue);
    window.addEventListener('pageshow',queue);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});
    document.addEventListener('click',event=>{
      if(!event.target.closest?.(ACTION_SELECTOR))return;
      queueMicrotask(queue);setTimeout(queue,80);setTimeout(queue,240);
    },true);
    queue();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootstrap,{once:true});else bootstrap();
  window.CutCoachJournalEnergyLive143=Object.freeze({version:VERSION,refresh:queue});
})();