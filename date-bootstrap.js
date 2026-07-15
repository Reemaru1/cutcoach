'use strict';
(function(){
  try{
    const key=new URLSearchParams(location.search).get('date');
    if(typeof validDateKey==='function'&&key&&validDateKey(key)){
      selectedDate=key>todayKey()?todayKey():key;
    }
  }catch(error){console.error('CutCoach date bootstrap failed',error)}
})();
