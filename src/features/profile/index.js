'use strict';

(function(root){
  const ASSETS=[
    {id:'profile-v920',type:'style',href:'./src/features/profile/profile-v920.css?v=9.2.0-alpha'},
    {id:'profile-v1000',type:'style',href:'./src/features/profile/profile-v1000.css?v=10.0.4-alpha'},
    {id:'profile-v1001-hotfix',type:'style',href:'./src/features/profile/profile-v1001-style-hotfix.css?v=10.0.2-alpha'},
    {id:'profile-plan-status-style',type:'style',href:'./src/features/profile/profile-plan-status-v1003.css?v=10.0.4-alpha'},
    {id:'profile-state-bridge',type:'script',href:'./src/features/profile/profile-state-bridge.js?v=10.0.0-alpha'},
    {id:'profile-v1000-script',type:'script',href:'./src/features/profile/profile-v1000.js?v=10.0.4-alpha'},
    {id:'profile-plan-status-script',type:'script',href:'./src/features/profile/profile-plan-status-v1003.js?v=10.0.4-alpha'}
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
    id:'profile',tab:'settings',screenSelector:'[data-screen="settings"]',
    onEnter:()=>{
      ensureAssets();
      root.CutCoachProfile900?.render?.();
      root.CutCoachProfile1000?.render?.();
      root.CutCoachProfilePlanStatus?.render?.();
      root.CutCoachInsights?.track('feature_view',{feature:'profile'});
    }
  });
})(window);
