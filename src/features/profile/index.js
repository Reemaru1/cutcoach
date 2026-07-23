'use strict';

(function(root){
  const STYLE_ID='profile-v920';
  const STYLE_HREF='./src/features/profile/profile-v920.css?v=9.2.0-alpha';

  function ensureStyle(){
    let link=document.getElementById(STYLE_ID);
    if(link)return link;
    link=document.createElement('link');
    link.id=STYLE_ID;
    link.rel='stylesheet';
    link.href=STYLE_HREF;
    document.head.append(link);
    return link;
  }

  ensureStyle();
  root.CutCoachModules?.register({
    id:'profile',
    tab:'settings',
    screenSelector:'[data-screen="settings"]',
    onEnter:()=>{
      ensureStyle();
      root.CutCoachProfile900?.render?.();
      root.CutCoachInsights?.track('feature_view',{feature:'profile'});
    }
  });
})(window);
