'use strict';
(function(){
  const PREFIX='cutcoach_staging_v2::';
  const proto=Storage.prototype;
  const getItem=proto.getItem;
  const setItem=proto.setItem;
  const removeItem=proto.removeItem;
  const clear=proto.clear;
  const key=proto.key;
  const scoped=value=>PREFIX+String(value);

  proto.getItem=function(name){return getItem.call(this,scoped(name));};
  proto.setItem=function(name,value){return setItem.call(this,scoped(name),String(value));};
  proto.removeItem=function(name){return removeItem.call(this,scoped(name));};
  proto.clear=function(){
    const matches=[];
    for(let index=0;index<this.length;index++){
      const current=key.call(this,index);
      if(current&&current.startsWith(PREFIX))matches.push(current);
    }
    matches.forEach(current=>removeItem.call(this,current));
  };
  proto.key=function(index){
    const matches=[];
    for(let cursor=0;cursor<this.length;cursor++){
      const current=key.call(this,cursor);
      if(current&&current.startsWith(PREFIX))matches.push(current.slice(PREFIX.length));
    }
    return matches[index]??null;
  };

  if('serviceWorker' in navigator){
    try{
      Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true});
    }catch{}
  }
  window.CUTCOACH_STAGING=true;
})();
