'use strict';
(function(){
  const VERSION='1.0.2 Alpha';
  const KEY='cutcoach_nutrition_analysis_collapsed_v1';
  let scheduled=false;
  const $=selector=>document.querySelector(selector);
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
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
  function ensureAnalysisShell(){
    let root=$('#nutritionV7Analysis');
    if(root)return root;
    const compass=$('.nutrition-macro-compass');
    if(!compass)return null;
    compass.insertAdjacentHTML('afterend','<section id="nutritionV7Analysis" class="nutrition-v7-analysis"><div class="nutrition-v7-analysis-head"><div><small>Zusatzwerte</small><strong>Nährwertabdeckung</strong></div><span id="nutritionV7Coverage">0 %</span></div><div class="nutrition-v7-analysis-grid"><article><small>Ballaststoffe</small><b id="nutritionV7Fiber">–</b></article><article><small>Zucker</small><b id="nutritionV7Sugar">–</b></article><article><small>Gesättigt</small><b id="nutritionV7Sat">–</b></article><article><small>Salz</small><b id="nutritionV7Salt">–</b></article></div><p id="nutritionV7AnalysisText" hidden></p></section>');
    root=$('#nutritionV7Analysis');
    return root;
  }
  function refreshFallbackValues(){
    if(typeof totals!=='function'||typeof day!=='function')return;
    const meals=day(selectedDate,false).meals||[],total=totals(selectedDate),coverage=total.nutrientCoverage||{},count=Math.max(1,meals.length),keys=['fiber','sugar','saturatedFat','salt'];
    const average=meals.length?keys.map(key=>Math.min(1,(Number(coverage[key])||0)/count)).reduce((a,b)=>a+b,0)/keys.length:0;
    const set=(id,value)=>{const node=$(id);if(node)node.textContent=value};
    set('#nutritionV7Coverage',`${Math.round(average*100)} %`);
    set('#nutritionV7Fiber',meals.length&&coverage.fiber?`${fmt(total.fiber,1)} g`:'–');
    set('#nutritionV7Sugar',meals.length&&coverage.sugar?`${fmt(total.sugar,1)} g`:'–');
    set('#nutritionV7Sat',meals.length&&coverage.saturatedFat?`${fmt(total.saturatedFat,1)} g`:'–');
    set('#nutritionV7Salt',meals.length&&coverage.salt?`${fmt(total.salt,2)} g`:'–');
  }
  function enhanceAnalysis(){
    const root=ensureAnalysisShell(),head=root?.querySelector('.nutrition-v7-analysis-head');if(!root||!head)return;
    let button=root.querySelector('.nutrition-v7-analysis-toggle');
    if(!button){
      button=document.createElement('button');button.type='button';button.className='nutrition-v7-analysis-toggle';button.setAttribute('aria-label','Zusatzwerte ein- oder ausklappen');head.append(button);
      button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();toggle(root,button)});
      head.addEventListener('click',event=>{if(event.target.closest('button'))return;toggle(root,button)});
    }
    root.classList.toggle('is-collapsed',stored());syncButton(root,button);refreshFallbackValues();
  }
  function toggle(root,button){const collapsed=!root.classList.contains('is-collapsed');root.classList.toggle('is-collapsed',collapsed);persist(collapsed);syncButton(root,button)}
  function syncButton(root,button){const collapsed=root.classList.contains('is-collapsed');button.textContent=collapsed?'⌄':'⌃';button.setAttribute('aria-expanded',String(!collapsed));button.title=collapsed?'Zusatzwerte anzeigen':'Zusatzwerte ausblenden'}
  function sync(){if(!document.body.classList.contains('nutrition-mode'))return;removeRedundantText();normalizeMacroLabels();enhanceAnalysis();const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;sync()})}
  new MutationObserver(queue).observe(document.body||document.documentElement,{childList:true,subtree:true});
  document.addEventListener('click',queue,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queue,{once:true});else queue();
  window.CutCoachNutritionCleanup101=Object.freeze({version:VERSION,refresh:queue});
})();