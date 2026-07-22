'use strict';

(function(root){
  root.CutCoachModules?.register({
    id:'progress',tab:'progress',screenSelector:'[data-screen="progress"]',
    onEnter:()=>root.CutCoachInsights?.track('feature_view',{feature:'progress'})
  });
  document.addEventListener('click',event=>{
    const button=event.target.closest?.('[data-bp220-primary-action],[data-open="weightModal"]');if(!button||button.disabled)return;
    const progress=document.querySelector('[data-screen="progress"]');if(!progress?.classList.contains('active'))return;
    root.CutCoachInsights?.track('action',{action:button.dataset.bp220Action==='workout'?'progress_training_open':'progress_measurement_open'});
  },true);
})(window);
