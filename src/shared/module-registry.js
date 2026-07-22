'use strict';

(function(root){
  const modules=new Map();
  let started=false;
  let activeId=null;

  function validId(value){return /^[a-z][a-z0-9-]{1,31}$/.test(String(value||''))}
  function moduleForTab(tab){return [...modules.values()].find(item=>item.tab===tab)||null}
  function context(item,reason){return Object.freeze({id:item.id,reason,screen:document.querySelector(item.screenSelector),insights:root.CutCoachInsights||null})}
  function emit(name,detail={}){root.dispatchEvent(new CustomEvent(`cutcoach:${name}`,{detail}))}

  function initialize(item){
    if(item.initialized)return;
    item.initialized=true;
    item.init?.(context(item,'initialize'));
  }

  function activate(id,reason='navigation'){
    const next=modules.get(id);if(!next)return false;
    initialize(next);
    if(activeId===id)return true;
    const previous=modules.get(activeId);
    previous?.onLeave?.(context(previous,reason));
    activeId=id;
    next.onEnter?.(context(next,reason));
    emit('module-enter',{moduleId:id,reason});
    return true;
  }

  function register(definition){
    const id=String(definition?.id||''),tab=String(definition?.tab||''),screenSelector=String(definition?.screenSelector||'');
    if(!validId(id)||!tab||!screenSelector)throw new TypeError('CutCoach-Modul braucht id, tab und screenSelector.');
    if(modules.has(id))throw new Error(`CutCoach-Modul bereits registriert: ${id}`);
    const item={id,tab,screenSelector,init:definition.init,onEnter:definition.onEnter,onLeave:definition.onLeave,initialized:false};
    modules.set(id,item);
    if(started)initialize(item);
    return id;
  }

  function start(){
    if(started)return;
    started=true;
    modules.forEach(initialize);
    document.addEventListener('click',event=>{
      const tab=event.target.closest?.('[data-tab]')?.dataset.tab,module=moduleForTab(tab);
      if(module)queueMicrotask(()=>activate(module.id,'navigation'));
    },true);
    root.addEventListener('hashchange',()=>{
      const module=moduleForTab(location.hash.slice(1));if(module)activate(module.id,'hash');
    });
    const active=document.querySelector('.screen.active[data-screen]')?.dataset.screen,module=moduleForTab(active);
    if(module)activate(module.id,'startup');
  }

  root.CutCoachModules=Object.freeze({register,start,activate,list:()=>[...modules.values()].map(({id,tab,screenSelector,initialized})=>({id,tab,screenSelector,initialized})),active:()=>activeId});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
