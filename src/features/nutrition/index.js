'use strict';

(function(root){
  let searchActive=false;
  root.CutCoachModules?.register({
    id:'nutrition',tab:'food',screenSelector:'[data-screen="food"]',
    onEnter:()=>root.CutCoachInsights?.track('feature_view',{feature:'nutrition'})
  });
  root.addEventListener('cutcoach:nutrition-search-rendered',event=>{
    searchActive=Boolean(event.detail?.hasQuery);
    root.CutCoachInsights?.track('search_rendered',event.detail||{});
  });
  document.addEventListener('click',event=>{
    if(searchActive&&event.target.closest?.('[data-nutrition-add],[data-nutrition-open]'))root.CutCoachInsights?.track('search_selected');
  },true);
})(window);
