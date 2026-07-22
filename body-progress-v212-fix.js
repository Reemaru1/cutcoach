'use strict';
(function(){
  const VERSION='2.1.2-full-fix';
  const MODE_KEY='cutcoach_body_progress_mode_v1';
  let lastProgressActive=false;
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const icon=(path,label)=>`<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span><span class="cc-nav-label">${label}</span>`;
  const FOOD_PLUS=icon('<path d="M12 5v14M5 12h14"/>','Ernährung');
  const FOOD_APPLE=icon('<path d="M12 21c4.6 0 7-4.1 7-8.3C19 8.9 16.5 6 13.3 6c-.6 0-1 .1-1.3.3C11.7 6.1 11.3 6 10.7 6 7.5 6 5 8.9 5 12.7 5 16.9 7.4 21 12 21Z"/><path d="M12 6c0-2 1.2-3.3 3.4-3.8M9 4.3c1.6 0 2.7.6 3 2"/>','Ernährung');
  const TRAINING=icon('<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>','Training');
  function progressActive(){return Boolean(q('[data-screen="progress"]')?.classList.contains('active'))}
  function currentMode(){return q('.bp211-shell')?.dataset.mode==='training'?'training':'body'}
  function setAria(button,active){if(!button)return;button.classList.toggle('bp212-active',active);button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false')}
  function saveMode(next){try{localStorage.setItem(MODE_KEY,next)}catch{}window.CutCoachBodyProgress211?.setMode?.(next)}
  function scrollTopNow(){try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch{window.scrollTo(0,0)}}
  function ensureTraining(nav){
    let button=q('[data-bp211-training-nav]',nav);
    if(!button){button=document.createElement('button');button.type='button';button.dataset.bp211TrainingNav='1';button.setAttribute('aria-label','Trainingsfortschritt öffnen');button.innerHTML=TRAINING}
    if(button.dataset.bp212Bound!=='1'){button.dataset.bp212Bound='1';button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();saveMode('training');if(location.hash!=='#progress')history.replaceState(null,'','#progress');window.dispatchEvent(new Event('hashchange'));queueMicrotask(()=>{sync();scrollTopNow()})},true)}
    return button;
  }
  function restoreStandard(nav){
    const training=q('[data-bp211-training-nav]',nav);if(training)training.remove();
    nav.classList.remove('bp211-reference-nav','bp212-progress-nav');
    const food=q('[data-tab="food"]',nav);if(food){food.innerHTML=FOOD_PLUS;food.dataset.glassNavKey='food'}
    qa('button',nav).forEach(button=>button.classList.remove('bp212-active'));
    window.CutCoachGlassNavV131?.enhance?.();
  }
  function configureProgress(nav){
    const today=q('[data-tab="today"]',nav),food=q('[data-tab="food"]',nav),progress=q('[data-tab="progress"]',nav),settings=q('[data-tab="settings"]',nav),training=ensureTraining(nav);
    if(!today||!food||!progress||!settings)return;
    food.innerHTML=FOOD_APPLE;food.dataset.glassNavKey='food';
    const desired=[today,food,progress,training,settings],current=[...nav.children].filter(node=>node.matches?.('button'));
    if(desired.some((node,index)=>current[index]!==node))nav.append(...desired);
    nav.classList.add('bp211-reference-nav','bp212-progress-nav');
    const mode=currentMode();
    setAria(today,false);setAria(food,false);setAria(settings,false);setAria(progress,mode==='body');setAria(training,mode==='training');
    if(progress.dataset.bp212Bound!=='1'){progress.dataset.bp212Bound='1';progress.addEventListener('click',()=>{saveMode('body');queueMicrotask(()=>{sync();scrollTopNow()})},true)}
  }
  function sync(){
    const active=progressActive(),nav=q('nav[aria-label="Hauptnavigation"]');
    document.body.classList.toggle('body-progress-v211-active',active);
    if(nav){if(active)configureProgress(nav);else restoreStandard(nav)}
    if(active&&!lastProgressActive)queueMicrotask(scrollTopNow);
    lastProgressActive=active;
  }
  function install(){
    sync();
    const progress=q('[data-screen="progress"]');if(progress){new MutationObserver(sync).observe(progress,{attributes:true,attributeFilter:['class']})}
    const nav=q('nav[aria-label="Hauptnavigation"]');if(nav){new MutationObserver(()=>queueMicrotask(sync)).observe(nav,{childList:true,subtree:false})}
    window.addEventListener('hashchange',()=>queueMicrotask(sync));
    window.addEventListener('pageshow',()=>queueMicrotask(sync));
    window.addEventListener('resize',()=>queueMicrotask(sync),{passive:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else queueMicrotask(install);
  window.CutCoachBodyProgress212=Object.freeze({version:VERSION,sync});
})();