'use strict';

(function(root){
  const VERSION='2.7.4-alpha';
  let frame=0;
  let screenObserver=null;
  let bootstrapObserver=null;
  let boundScreen=null;

  function sync(){
    frame=0;
    const screen=document.querySelector('[data-screen="food"]');
    if(!screen)return false;

    const dayCard=screen.querySelector('.nutrition-v210-day-card');
    const budget=dayCard?.querySelector('.nutrition-day-budget');
    const status=dayCard?.querySelector('#nutritionV210DayStatus');
    const copy=budget?.querySelector(':scope > div');
    const meta=budget?.querySelector('#nutritionDayBudgetMeta')?.textContent?.trim()||'';
    const label=budget?.querySelector('#nutritionDayBudgetLabel')?.textContent?.trim()||'';
    const track=budget?.querySelector('.nutrition-budget-bar');
    const fill=budget?.querySelector('#nutritionDayBudgetBar');

    if(!dayCard||!budget||!track)return false;

    dayCard.classList.add('nutrition-day-progress-v273');
    budget.classList.add('nutrition-day-progress-only');
    if(status){status.hidden=true;status.setAttribute('aria-hidden','true')}
    if(copy){copy.hidden=true;copy.setAttribute('aria-hidden','true')}

    const width=Math.max(0,Math.min(100,Number.parseFloat(fill?.style?.width)||0));
    track.setAttribute('role','progressbar');
    track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax','100');
    track.setAttribute('aria-valuenow',String(Math.round(width)));
    track.setAttribute('aria-label',meta||label||'Fortschritt des Kalorientagesziels');
    track.title=meta||label||'Kalorienfortschritt';
    return true;
  }

  function queue(){
    if(frame)return;
    frame=(root.requestAnimationFrame||root.setTimeout)(sync);
  }

  function bindScreen(screen){
    if(!screen||screen===boundScreen)return;
    boundScreen=screen;
    screenObserver?.disconnect();
    screenObserver=new MutationObserver(queue);
    screenObserver.observe(screen,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});
    queue();
  }

  function discover(){
    const screen=document.querySelector('[data-screen="food"]');
    if(!screen)return false;
    bindScreen(screen);
    sync();
    return true;
  }

  function start(){
    if(!discover()){
      bootstrapObserver?.disconnect();
      bootstrapObserver=new MutationObserver(()=>{
        if(!discover())return;
        bootstrapObserver?.disconnect();
        bootstrapObserver=null;
      });
      bootstrapObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});
    }
    root.addEventListener('cutcoach:librarychange',queue);
    root.addEventListener('cutcoach:nutrition-search-rendered',queue);
    document.addEventListener('click',event=>{
      if(event.target.closest?.('[data-tab="food"],[data-add-journal-meal],#journalQuickAdd'))setTimeout(discover,0);
    },true);
    const baseRender=root.render;
    if(typeof baseRender==='function'&&!baseRender.__dayProgress274){
      const wrapped=function(){const result=baseRender.apply(this,arguments);queueMicrotask(discover);return result};
      wrapped.__dayProgress274=true;
      root.render=wrapped;
    }
  }

  root.CutCoachNutritionDayProgress273=Object.freeze({version:VERSION,refresh:discover});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
