'use strict';
(function(){
  const PREFIX='cutcoach_staging_v1::';
  const storage=window.localStorage;
  const original={
    getItem:storage.getItem.bind(storage),
    setItem:storage.setItem.bind(storage),
    removeItem:storage.removeItem.bind(storage),
    key:storage.key.bind(storage),
    clear:storage.clear.bind(storage)
  };
  const scoped=key=>PREFIX+String(key);
  storage.getItem=key=>original.getItem(scoped(key));
  storage.setItem=(key,value)=>original.setItem(scoped(key),String(value));
  storage.removeItem=key=>original.removeItem(scoped(key));
  storage.clear=()=>{
    const keys=[];
    for(let i=0;i<storage.length;i++){const key=original.key(i);if(key?.startsWith(PREFIX))keys.push(key)}
    keys.forEach(original.removeItem);
  };
  storage.key=index=>{
    const keys=[];
    for(let i=0;i<storage.length;i++){const key=original.key(i);if(key?.startsWith(PREFIX))keys.push(key.slice(PREFIX.length))}
    return keys[index]??null;
  };
  try{Object.defineProperty(storage,'length',{configurable:true,get(){let count=0;for(let i=0;i<Storage.prototype.length;i++)count++;return count}})}catch{}

  if('serviceWorker' in navigator){
    const originalRegister=navigator.serviceWorker.register.bind(navigator.serviceWorker);
    navigator.serviceWorker.register=function(_url,options={}){
      const stagingUrl=new URL('./sw.js',location.href).href;
      return originalRegister(stagingUrl,{...options,scope:'./'});
    };
  }
  window.CUTCOACH_STAGING=true;
})();
