'use strict';

(function(root){
  const VERSION='2.7.6-alpha';
  let frame=0;
  let screenObserver=null;
  let bootstrapObserver=null;
  let boundScreen=null;

  function numberFrom(value){
    const normalized=String(value||'').replace(/\s/g,'').replace(/\./g,'').replace(',','.');
    const match=normalized.match(/-?\d+(?:\.\d+)?/);
    return match?Math.max(0,Number(match[0])||0):0;
  }

  function format(value){
    return new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(Math.max(0,Number(value)||0));
  }

  function readProgressValues(budget,labelNode,metaNode){
    const meta=metaNode?.textContent?.trim()||'';
    const canonical=meta.match(/([\d.]+(?:,\d+)?)\s+von\s+([\d.]+(?:,\d+)?)\s*kcal/i);
    if(canonical){
      budget.dataset.progressCurrent=String(numberFrom(canonical[1]));
      budget.dataset.progressTarget=String(numberFrom(canonical[2]));
    }
    const current=Math.max(0,Number(budget.dataset.progressCurrent)||0);
    const target=Math.max(0,Number(budget.dataset.progressTarget)||0);
    if(!target){
      const label=labelNode?.textContent?.trim()||'';
      const fallback=numberFrom(label);
      if(fallback)budget.dataset.progressTarget=String(fallback);
    }
    return{
      current:Math.max(0,Number(budget.dataset.progressCurrent)||0),
      target:Math.max(0,Number(budget.dataset.progressTarget)||0)
    };
  }

  function setText(node,value){
    if(node&&node.textContent!==value)node.textContent=value;
  }

  function sync(){
    frame=0;
    const screen=document.querySelector('[data-screen="food"]');
    if(!screen)return false;

    const dayCard=screen.querySelector('.nutrition-v210-day-card');
    const budget=dayCard?.querySelector('.nutrition-day-budget');
    const status=dayCard?.querySelector('#nutritionV210DayStatus');
    const copy=budget?.querySelector(':scope > div');
    const labelNode=budget?.querySelector('#nutritionDayBudgetLabel');
    const metaNode=budget?.querySelector('#nutritionDayBudgetMeta');
    const track=budget?.querySelector('.nutrition-budget-bar');
    const fill=budget?.querySelector('#nutritionDayBudgetBar');

    if(!dayCard||!budget||!track)return false;

    const values=readProgressValues(budget,labelNode,metaNode);
    const width=values.target>0?Math.max(0,Math.min(100,values.current/values.target*100)):Math.max(0,Math.min(100,Number.parseFloat(fill?.style?.width)||0));

    dayCard.classList.add('nutrition-day-progress-v273');
    budget.classList.add('nutrition-day-progress-only');
    budget.classList.toggle('over',values.target>0&&values.current>values.target);
    if(status){status.hidden=true;status.setAttribute('aria-hidden','true')}
    if(copy){copy.hidden=false;copy.removeAttribute('aria-hidden')}
    setText(labelNode,`${format(values.current)} kcal`);
    setText(metaNode,values.target>0?`Ziel ${format(values.target)} kcal`:'Kalorienziel');
    if(fill)fill.style.width=`${width}%`;

    track.setAttribute('role','progressbar');
    track.setAttribute('aria-valuemin','0');
    track.setAttribute('aria-valuemax',String(values.target||100));
    track.setAttribute('aria-valuenow',String(Math.round(values.current||width)));
    track.setAttribute('aria-label',values.target>0?`${format(values.current)} von ${format(values.target)} Kilokalorien`:'Fortschritt des Kalorientagesziels');
    track.title=values.target>0?`${format(values.current)} von ${format(values.target)} kcal`:'Kalorienfortschritt';
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
    if(typeof baseRender==='function'&&!baseRender.__dayProgress276){
      const wrapped=function(){const result=baseRender.apply(this,arguments);queueMicrotask(discover);return result};
      wrapped.__dayProgress276=true;
      root.render=wrapped;
    }
  }

  root.CutCoachNutritionDayProgress273=Object.freeze({version:VERSION,refresh:discover});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);