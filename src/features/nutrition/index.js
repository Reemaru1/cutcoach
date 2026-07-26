'use strict';

(function(root){
  const DAY_BALANCE_VERSION='2.7.7-alpha';
  let searchActive=false;
  let activeSearchRevision=0;
  let selectedSearchRevision=0;

  function ensureDayBalanceAssets(){
    const cssHref=`src/features/nutrition/nutrition-day-progress-v273.css?v=${DAY_BALANCE_VERSION}`;
    let style=[...document.querySelectorAll('link[rel="stylesheet"]')].find(node=>(node.getAttribute('href')||'').includes('nutrition-day-progress-v273.css'));
    if(!style){style=document.createElement('link');style.rel='stylesheet';document.head.append(style)}
    if(style.getAttribute('href')!==cssHref)style.setAttribute('href',cssHref);
    if(document.querySelector(`script[data-cutcoach-day-balance="${DAY_BALANCE_VERSION}"]`))return;
    const script=document.createElement('script');
    script.src=`src/features/nutrition/nutrition-day-progress-v273.js?v=${DAY_BALANCE_VERSION}`;
    script.defer=true;
    script.dataset.cutcoachDayBalance=DAY_BALANCE_VERSION;
    script.onload=()=>root.CutCoachNutritionDayProgress273?.refresh?.();
    document.head.append(script);
  }

  ensureDayBalanceAssets();
  root.CutCoachModules?.register({
    id:'nutrition',tab:'food',screenSelector:'[data-screen="food"]',
    onEnter:()=>{ensureDayBalanceAssets();root.CutCoachNutritionDayProgress273?.refresh?.();root.CutCoachInsights?.track('feature_view',{feature:'nutrition'})}
  });
  root.addEventListener('cutcoach:nutrition-search-rendered',event=>{
    searchActive=Boolean(event.detail?.hasQuery);
    activeSearchRevision=Math.max(0,Math.round(Number(event.detail?.searchRevision)||0));
    root.CutCoachInsights?.track('search_rendered',event.detail||{});
  });
  document.addEventListener('click',event=>{
    if(searchActive&&event.target.closest?.('[data-nutrition-add],[data-nutrition-open]')&&(!activeSearchRevision||activeSearchRevision!==selectedSearchRevision)){
      root.CutCoachInsights?.track('search_selected');selectedSearchRevision=activeSearchRevision;
    }
  },true);
})(window);
