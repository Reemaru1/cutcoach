'use strict';
(function(){
  const VERSION='1.0.1 Alpha';
  const KEY='cutcoach_nutrition_analysis_collapsed_v1';
  let scheduled=false;
  const $=selector=>document.querySelector(selector);
  function stored(){try{return localStorage.getItem(KEY)!=='0'}catch{return true}}
  function persist(value){try{localStorage.setItem(KEY,value?'1':'0')}catch{}}
  function removeRedundantText(){
    document.querySelectorAll('.nutrition-coach-row').forEach(node=>node.remove());
    const text=$('#nutritionV7AnalysisText');if(text){text.textContent='';text.hidden=true}
  }
  function normalizeMacroLabels(){
    document.querySelectorAll('.nutrition-macro-compass article').forEach(card=>{
      const label=card.querySelector('small');
      if(label&&label.textContent.trim()==='KH')label.textContent='Kohlenhydrate';
    });
  }
  function enhanceAnalysis(){
    const root=$('#nutritionV7Analysis'),head=root?.querySelector('.nutrition-v7-analysis-head');if(!root||!head)return;
    let button=root.querySelector('.nutrition-v7-analysis-toggle');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='nutrition-v7-analysis-toggle';button.setAttribute('aria-label','Zusatzwerte ein- oder ausklappen');head.append(button);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();const collapsed=!root.classList.contains('is-collapsed');root.classList.toggle('is-collapsed',collapsed);persist(collapsed);syncButton(root,button)});
    }
    root.classList.toggle('is-collapsed',stored());syncButton(root,button);
  }
  function syncButton(root,button){const collapsed=root.classList.contains('is-collapsed');button.textContent=collapsed?'⌄':'⌃';button.setAttribute('aria-expanded',String(!collapsed))}
  function sync(){if(!document.body.classList.contains('nutrition-mode'))return;removeRedundantText();normalizeMacroLabels();enhanceAnalysis();const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}
  new MutationObserver(queue).observe(document.body||document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',queue,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  window.CutCoachNutritionCleanup101=Object.freeze({version:VERSION,refresh:queue});
})();
