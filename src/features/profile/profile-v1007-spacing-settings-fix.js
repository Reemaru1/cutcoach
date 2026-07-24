'use strict';

(function(root){
  const VERSION='10.0.7-alpha';
  const $=selector=>document.querySelector(selector);

  function openSettings(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const modal=$('#settingsCenterModal');
    if(!modal)return;
    if(typeof root.openModal==='function')root.openModal('settingsCenterModal');
    else{
      modal.classList.add('open');
      modal.setAttribute('aria-hidden','false');
      document.body.classList.add('modal-open');
    }
  }

  function bind(){
    const button=$('#openSettingsCenter');
    if(!button||button.dataset.profileSettingsBound===VERSION)return;
    button.dataset.profileSettingsBound=VERSION;
    button.removeAttribute('data-open');
    button.addEventListener('click',openSettings);
    button.addEventListener('touchend',event=>{
      if(event.cancelable)event.preventDefault();
      openSettings(event);
    },{passive:false});
  }

  function apply(){
    bind();
    const screen=$('.profile-coach-hub');
    if(screen)screen.style.removeProperty('min-height');
  }

  function boot(){
    apply();
    root.addEventListener('cutcoach:module-enter',event=>{
      if(event.detail?.moduleId==='profile')setTimeout(apply,0);
    });
    new MutationObserver(()=>apply()).observe(document.body,{childList:true,subtree:true});
  }

  root.CutCoachProfile1007=Object.freeze({version:VERSION,apply,openSettings});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
