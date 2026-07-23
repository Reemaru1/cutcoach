'use strict';

(function(root){
  root.CutCoachModules?.register({
    id:'profile',
    tab:'settings',
    screenSelector:'[data-screen="settings"]',
    onEnter:()=>{
      root.CutCoachProfile900?.render?.();
      root.CutCoachInsights?.track('feature_view',{feature:'profile'});
    }
  });
})(window);
