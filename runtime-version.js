'use strict';
(function(){
  const VERSION='5.8.0';
  function applyVersion(){
    const node=document.querySelector('#appVersion');
    if(node)node.textContent=`Version ${VERSION}`;
    document.documentElement.dataset.cutcoachVersion=VERSION;
  }
  const base=window.render;
  if(typeof base==='function')window.render=function(){base();applyVersion()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyVersion,{once:true});else applyVersion();
})();
