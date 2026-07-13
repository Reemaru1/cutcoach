'use strict';
(function(){
  function start(){
    if(window.CutCoachLibrary){window.CutCoachLibrary.mount();setText('#appVersion','Version 3.0.0');}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
