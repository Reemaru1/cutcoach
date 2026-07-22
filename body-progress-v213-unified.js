'use strict';
(function(){
  const VERSION='2.1.3-unified-premium';
  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const MODE_KEY='cutcoach_body_progress_mode_v1';
  let observer=null;
  let syncing=false;
  function mode(){return q('.bp211-shell')?.dataset.mode==='training'?'training':'body'}
  function setMode(next){
    const value=next==='training'?'training':'body';
    try{localStorage.setItem(MODE_KEY,value)}catch{}
    window.CutCoachBodyProgress211?.setMode?.(value);
    queueMicrotask(sync);
  }
  function ensureSwitch(){
    const shell=q('.bp211-shell'),heading=q('.bp211-heading',shell||document);if(!shell||!heading)return;
    let control=q('.bp213-mode-switch',shell);
    if(!control){
      control=document.createElement('div');control.className='bp213-mode-switch';control.setAttribute('role','tablist');control.setAttribute('aria-label','Fortschrittsansicht');
      control.innerHTML='<button type="button" role="tab" data-bp213-mode="body">Körper</button><button type="button" role="tab" data-bp213-mode="training">Training</button>';
      heading.insertAdjacentElement('afterend',control);
      control.addEventListener('click',event=>{const button=event.target.closest('[data-bp213-mode]');if(!button)return;event.preventDefault();setMode(button.dataset.bp213Mode)});
    }
    const current=mode();qa('[data-bp213-mode]',control).forEach(button=>{const active=button.dataset.bp213Mode===current;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1});
  }
  function normalizeNav(){
    const nav=q('nav[aria-label="Hauptnavigation"]');if(!nav)return;
    const training=q('[data-bp211-training-nav]',nav);if(training)training.hidden=true;
    nav.classList.remove('bp211-reference-nav','bp212-progress-nav');
    const today=q('[data-tab="today"]',nav),food=q('[data-tab="food"]',nav),progress=q('[data-tab="progress"]',nav),settings=q('[data-tab="settings"]',nav);
    if(today&&food&&progress&&settings)nav.append(today,food,progress,settings, ...(training?[training]:[]));
    qa('button',nav).forEach(button=>{button.classList.remove('bp212-active');if(button!==progress)button.classList.remove('active')});
    const active=Boolean(q('[data-screen="progress"]')?.classList.contains('active'));
    if(progress){progress.classList.toggle('bp213-progress-active',active);progress.classList.toggle('active',active);progress.setAttribute('aria-current',active?'page':'false')}
  }
  function improveFigure(){
    const figure=q('#bp211Figure');if(!figure)return;
    figure.loading='eager';figure.decoding='async';figure.classList.add('bp213-figure-asset');
    qa('[data-bp211-mini]').forEach(image=>{image.loading='lazy';image.decoding='async';image.classList.add('bp213-figure-asset')});
  }
  function sync(){
    if(syncing)return;syncing=true;
    try{ensureSwitch();normalizeNav();improveFigure()}finally{syncing=false}
  }
  function install(){
    sync();
    observer=new MutationObserver(()=>queueMicrotask(sync));
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-mode','src']});
    window.addEventListener('hashchange',()=>queueMicrotask(sync));
    window.addEventListener('pageshow',()=>queueMicrotask(sync));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else queueMicrotask(install);
  window.CutCoachBodyProgress213=Object.freeze({version:VERSION,sync,setMode});
})();
