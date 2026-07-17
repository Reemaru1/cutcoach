'use strict';
(function(){
  const VERSION='7.3.1';
  function cleanup(){
    document.querySelector('#journalCoachText')?.remove();
    document.querySelector('#nutritionEverydayQuick')?.remove();
  }
  const observer=new MutationObserver(cleanup);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});else cleanup();
  window.CutCoachUiCleanupV731=Object.freeze({version:VERSION,refresh:cleanup});
})();
