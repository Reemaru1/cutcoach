'use strict';
(function(){
  function openLibraryFromHash(){if(location.hash==='#library')document.querySelector('[data-tab="library"]')?.click()}
  function start(){
    if(window.CutCoachLibrary){window.CutCoachLibrary.mount();openLibraryFromHash()}
    window.addEventListener('hashchange',openLibraryFromHash);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
