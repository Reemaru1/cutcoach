'use strict';
(function(){
  try{
    const key=new URLSearchParams(location.search).get('date');
    if(typeof validDateKey==='function'&&key&&validDateKey(key)){
      selectedDate=key>todayKey()?todayKey():key;
      const apply=()=>setTimeout(()=>window.render?.(),0);
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});
      else apply();
    }
  }catch(error){console.error('CutCoach date bootstrap failed',error)}
})();
