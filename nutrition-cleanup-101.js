'use strict';
(function(){
  const VERSION='1.0.5 Alpha';
  const KEY='cutcoach_nutrition_analysis_collapsed_v1';
  let scheduled=false,root=null,observer=null,bootstrapObserver=null,syncCount=0,rootRebinds=0;
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const setText=(selector,value)=>{const node=$(selector,root),next=String(value??'');if(node&&node.textContent!==next)node.textContent=next};
  function stored(){try{return localStorage.getItem(KEY)!=='0'}catch{return true}}
  function persist(value){try{localStorage.setItem(KEY,value?'1':'0')}catch{}}
  function removeRedundantText(){root?.querySelectorAll('.nutrition-coach-row').forEach(node=>node.remove());const text=$('#nutritionV7AnalysisText',root);if(text){if(text.textContent)text.textContent='';if(!text.hidden)text.hidden=true}}
  function normalizeMacroLabels(){root?.querySelectorAll('.nutrition-macro-compass article').forEach(card=>{const label=card.querySelector('small');if(label&&label.textContent.trim()==='KH')label.textContent='Kohlenhydrate'})}
  function ensureAnalysisShell(){
    let analysis=$('#nutritionV7Analysis',root);
    if(!analysis){const compass=$('.nutrition-macro-compass',root);if(!compass)return null;compass.insertAdjacentHTML('afterend','<section id="nutritionV7Analysis" class="nutrition-v7-analysis"><div class="nutrition-v7-analysis-head" role="button" tabindex="0"><div><small>Zusatzwerte</small><strong>Nährwertabdeckung</strong></div></div><div class="nutrition-v7-analysis-grid"><article><small>Ballaststoffe</small><b id="nutritionV7Fiber">–</b></article><article><small>Zucker</small><b id="nutritionV7Sugar">–</b></article><article><small>Gesättigt</small><b id="nutritionV7Sat">–</b></article><article><small>Salz</small><b id="nutritionV7Salt">–</b></article></div><p id="nutritionV7AnalysisText" hidden></p></section>');analysis=$('#nutritionV7Analysis',root)}
    analysis.querySelector('#nutritionV7Coverage')?.remove();return analysis;
  }
  function refreshFallbackValues(){if(typeof totals!=='function'||typeof day!=='function')return;const meals=day(selectedDate,false).meals||[],total=totals(selectedDate),coverage=total.nutrientCoverage||{};setText('#nutritionV7Fiber',meals.length&&coverage.fiber?`${fmt(total.fiber,1)} g`:'–');setText('#nutritionV7Sugar',meals.length&&coverage.sugar?`${fmt(total.sugar,1)} g`:'–');setText('#nutritionV7Sat',meals.length&&coverage.saturatedFat?`${fmt(total.saturatedFat,1)} g`:'–');setText('#nutritionV7Salt',meals.length&&coverage.salt?`${fmt(total.salt,2)} g`:'–')}
  function enhanceAnalysis(){const analysis=ensureAnalysisShell(),head=analysis?.querySelector('.nutrition-v7-analysis-head');if(!analysis||!head)return;head.setAttribute('role','button');head.setAttribute('tabindex','0');let button=analysis.querySelector('.nutrition-v7-analysis-toggle');if(!button){button=document.createElement('span');button.className='nutrition-v7-analysis-toggle';button.setAttribute('aria-hidden','true');head.append(button);head.addEventListener('click',()=>toggle(analysis,head));head.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle(analysis,head)}})}analysis.classList.toggle('is-collapsed',stored());syncState(analysis,head);refreshFallbackValues()}
  function toggle(analysis,head){const collapsed=!analysis.classList.contains('is-collapsed');analysis.classList.toggle('is-collapsed',collapsed);persist(collapsed);syncState(analysis,head)}
  function syncState(analysis,head){const collapsed=analysis.classList.contains('is-collapsed'),expanded=String(!collapsed),label=collapsed?'Zusatzwerte anzeigen':'Zusatzwerte ausblenden';if(head.getAttribute('aria-expanded')!==expanded)head.setAttribute('aria-expanded',expanded);if(head.getAttribute('aria-label')!==label)head.setAttribute('aria-label',label)}
  function sync(){scheduled=false;ensureRoot();if(!root?.isConnected||!document.body.classList.contains('nutrition-mode'))return;syncCount++;removeRedundantText();normalizeMacroLabels();enhanceAnalysis()}
  function queue(){if(scheduled)return;scheduled=true;requestAnimationFrame(sync)}
  function start(node){if(!node||node===root&&observer)return false;observer?.disconnect();root=node;observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length))queue()});observer.observe(root,{childList:true,subtree:true});root.addEventListener('click',queue,{passive:true});rootRebinds++;queue();return true}
  function ensureRoot(){const found=document.querySelector('[data-screen="food"]');if(found&&found!==root)start(found);else if(!found&&root&&!root.isConnected){observer?.disconnect();observer=null;root=null}return root}
  function boot(){ensureRoot();if(!bootstrapObserver){bootstrapObserver=new MutationObserver(()=>{ensureRoot();queue()});bootstrapObserver.observe(document.body||document.documentElement,{childList:true,subtree:true})}queue()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CutCoachNutritionCleanup101=Object.freeze({version:VERSION,refresh:queue,snapshot:()=>Object.freeze({syncCount,rootRebinds,scoped:Boolean(root),rootConnected:Boolean(root?.isConnected),pending:scheduled})});
})();
