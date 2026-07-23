'use strict';

(function(root){
  const ASSETS=[
    {id:'profile-v920',type:'style',href:'./src/features/profile/profile-v920.css?v=9.2.0-alpha'},
    {id:'profile-v1000',type:'style',href:'./src/features/profile/profile-v1000.css?v=10.0.0-alpha'},
    {id:'profile-v1000-script',type:'script',href:'./src/features/profile/profile-v1000.js?v=10.0.0-alpha'}
  ];

  function ensureAsset(asset){
    let element=document.getElementById(asset.id);
    if(element)return element;
    if(asset.type==='style'){
      element=document.createElement('link');element.rel='stylesheet';element.href=asset.href;
    }else{
      element=document.createElement('script');element.src=asset.href;element.defer=true;
    }
    element.id=asset.id;document.head.append(element);return element;
  }
  function ensureAssets(){ASSETS.forEach(ensureAsset)}

  ensureAssets();
  root.CutCoachModules?.register({
    id:'profile',
    tab:'settings',
    screenSelector:'[data-screen="settings"]',
    onEnter:()=>{
      ensureAssets();
      root.CutCoachProfile900?.render?.();
      root.CutCoachProfile1000?.render?.();
      root.CutCoachInsights?.track('feature_view',{feature:'profile'});
    }
  });
})(window);
