'use strict';
(function(){
  const PREFIX='cutcoach_staging_v2::';
  const storage=window.localStorage;
  const original={
    getItem:storage.getItem.bind(storage),
    setItem:storage.setItem.bind(storage),
    removeItem:storage.removeItem.bind(storage),
    key:storage.key.bind(storage),
    clear:storage.clear.bind(storage)
  };
  const scoped=key=>PREFIX+String(key);

  try{
    storage.getItem=key=>original.getItem(scoped(key));
    storage.setItem=(key,value)=>original.setItem(scoped(key),String(value));
    storage.removeItem=key=>original.removeItem(scoped(key));
    storage.clear=()=>{
      const keys=[];
      const length=Number(storage.length)||0;
      for(let i=0;i<length;i++){
        const key=original.key(i);
        if(key?.startsWith(PREFIX))keys.push(key);
      }
      keys.forEach(key=>original.removeItem(key));
    };
    storage.key=index=>{
      const keys=[];
      const length=Number(storage.length)||0;
      for(let i=0;i<length;i++){
        const key=original.key(i);
        if(key?.startsWith(PREFIX))keys.push(key.slice(PREFIX.length));
      }
      return keys[index]??null;
    };
  }catch(error){
    console.warn('Staging storage isolation unavailable',error);
  }

  if('serviceWorker' in navigator){
    navigator.serviceWorker.getRegistrations?.().then(registrations=>{
      for(const registration of registrations){
        if(registration.scope.includes('/staging/'))registration.unregister().catch(()=>{});
      }
    }).catch(()=>{});
    navigator.serviceWorker.register=()=>Promise.resolve({
      waiting:null,
      installing:null,
      active:null,
      addEventListener(){},
      update(){return Promise.resolve();}
    });
  }
  window.CUTCOACH_STAGING=true;
})();