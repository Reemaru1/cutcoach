'use strict';
(function(root){
  if(root.CutCoachCatalogSearchFallback261)return;
  const NativeWorker=root.Worker;
  if(typeof NativeWorker!=='function'){
    root.CutCoachCatalogSearchFallback261=Object.freeze({version:'2.6.1-alpha',active:false,reason:'worker-unavailable'});
    return;
  }
  function CatalogAwareWorker(url,options){
    const target=String(url||'');
    if(/(?:^|\/)nutrition-search-worker\.js(?:\?|$)/.test(target)){
      throw new DOMException('Der dynamische Produktkatalog wird direkt durchsucht.','NotSupportedError');
    }
    return new NativeWorker(url,options);
  }
  try{Object.setPrototypeOf(CatalogAwareWorker,NativeWorker)}catch{}
  CatalogAwareWorker.prototype=NativeWorker.prototype;
  root.Worker=CatalogAwareWorker;
  root.CutCoachCatalogSearchFallback261=Object.freeze({version:'2.6.1-alpha',active:true,reason:'dynamic-runtime-catalog'});
})(window);
