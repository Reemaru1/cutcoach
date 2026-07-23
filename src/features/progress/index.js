'use strict';

(function(root){
  const ASSETS=[
    {id:'progress-goal-v230-style',type:'style',href:'./src/features/progress/progress-goal-v230.css?v=2.3.0-alpha'},
    {id:'progress-goal-v230-script',type:'script',href:'./src/features/progress/progress-goal-v230.js?v=2.3.0-alpha'}
  ];
  function ensureAsset(asset){
    let element=document.getElementById(asset.id);
    if(element){
      if(element.getAttribute('href')&&element.getAttribute('href')!==asset.href)element.setAttribute('href',asset.href);
      if(element.getAttribute('src')&&element.getAttribute('src')!==asset.href)element.setAttribute('src',asset.href);
      return element;
    }
    if(asset.type==='style'){element=document.createElement('link');element.rel='stylesheet';element.href=asset.href;}
    else{element=document.createElement('script');element.src=asset.href;element.defer=true;}
    element.id=asset.id;document.head.append(element);return element;
  }
  function ensureAssets(){ASSETS.forEach(ensureAsset)}
  ensureAssets();
  root.CutCoachModules?.register({
    id:'progress',tab:'progress',screenSelector:'[data-screen="progress"]',
    onEnter:()=>{ensureAssets();root.CutCoachProgressGoal?.render?.();root.CutCoachInsights?.track('feature_view',{feature:'progress'});}
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-bp220-primary-action],[data-open="weightModal"]');if(!button||button.disabled)return;
    const progress=document.querySelector('[data-screen="progress"]');if(!progress?.classList.contains('active'))return;
    root.CutCoachInsights?.track('action',{action:button.dataset.bp220Action==='workout'?'progress_training_open':'progress_measurement_open'});
  },true);
})(window);
