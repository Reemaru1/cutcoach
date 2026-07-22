'use strict';

(function(root){
  root.CutCoachModules?.register({
    id:'journal',tab:'today',screenSelector:'[data-screen="today"]',
    onEnter:()=>root.CutCoachInsights?.track('feature_view',{feature:'journal'})
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-add-journal-meal]');
    if(button&&!button.disabled)root.CutCoachInsights?.track('action',{action:'journal_meal_open'});
    const quick=event.target.closest?.('[data-journal-quick]');
    if(quick)root.CutCoachInsights?.track('action',{action:`journal_quick_${quick.dataset.journalQuick}`});
    if(event.target.closest?.('[data-journal-training-details]'))root.CutCoachInsights?.track('action',{action:'journal_training_open'});
  },true);
})(window);
