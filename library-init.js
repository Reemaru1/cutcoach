'use strict';
(function(){
  const RELEASE='6.8.1';
  function openLibraryFromHash(){if(location.hash==='#library')document.querySelector('[data-tab="library"]')?.click();}
  function loadHardening(){
    if(document.querySelector('script[data-nutrition-hardening]'))return;
    const script=document.createElement('script');
    script.src=`./nutrition-hardening.js?v=${RELEASE}`;
    script.defer=true;
    script.dataset.nutritionHardening='1';
    script.onerror=()=>{try{toast('Ernährungsoptimierung konnte nicht geladen werden. Bitte App neu öffnen.');}catch{}};
    document.head.appendChild(script);
  }
  function start(){
    if(window.CutCoachLibrary){window.CutCoachLibrary.mount();openLibraryFromHash();}
    loadHardening();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${RELEASE}`;
    window.addEventListener('hashchange',openLibraryFromHash);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
