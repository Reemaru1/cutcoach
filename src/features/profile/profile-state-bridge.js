'use strict';

(function(root){
  if(Object.prototype.hasOwnProperty.call(root,'state'))return;
  try{
    Object.defineProperty(root,'state',{
      configurable:true,
      get(){return state},
      set(next){state=next}
    });
  }catch{}
})(window);
