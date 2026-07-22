'use strict';

(function(root){
  root.CutCoachModules?.register({
    id:'journal',tab:'today',screenSelector:'[data-screen="today"]',
    onEnter:()=>root.CutCoachInsights?.track('feature_view',{feature:'journal'})
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-add-journal-meal]');
    if(button&&!button.disabled)root.CutCoachInsights?.track('action',{action:'journal_meal_open'});
  },true);
})(window);
