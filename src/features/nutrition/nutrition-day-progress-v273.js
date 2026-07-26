'use strict';

(function(root){
  const VERSION='2.7.3-alpha';
  let frame=0;
  let observer=null;

  function sync(){
    frame=0;
    const screen=document.querySelector('[data-screen="food"]');
    if(!screen)return;

    const dayCard=screen.querySelector('.nutrition-v210-day-card');
    const budget=dayCard?.querySelector('.nutrition-day-budget');
    const status=dayCard?.querySelector('#nutritionV210DayStatus');
    const copy=budget?.querySelector(':scope > div');
    const meta=budget?.querySelector('#nutritionDayBudgetMeta')?.textContent?.trim()||'';
    const label=budget?.querySelector('#nutritionDayBudgetLabel')?.textContent?.trim()||'';
    const track=budget?.querySelector('.nutrition-budget-bar');
    const fill=budget?.querySelector('#nutritionDayBudgetBar');

    if(!dayCard||!budget||!track)return;

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
  }

  function queue(){
    if(frame)return;
    frame=(root.requestAnimationFrame||root.setTimeout)(sync);
  }

  function start(){
    queue();
    const screen=document.querySelector('[data-screen="food"]');
    if(!screen)return;
    observer?.disconnect();
    observer=new MutationObserver(queue);
    observer.observe(screen,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['style','class','hidden']});
    root.addEventListener('cutcoach:librarychange',queue);
  }

  root.CutCoachNutritionDayProgress273=Object.freeze({version:VERSION,refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
