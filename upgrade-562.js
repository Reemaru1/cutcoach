'use strict';
(function(){
  const VERSION='5.6.2';
  function apply562(){
    const dateNode=document.querySelector('#journalDate');
    const calendar=document.querySelector('#journalCalendarButton');
    if(calendar){calendar.textContent='';calendar.setAttribute('aria-label','Kalender öffnen');}
    if(dateNode&&typeof selectedDate!=='undefined'&&typeof dateFromKey==='function'){
      const date=dateFromKey(selectedDate);
      dateNode.textContent=date.toLocaleDateString('de-DE',{day:'numeric',month:'long',year:'numeric'});
      dateNode.title=date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    }
    const version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
  }
  const previousRender=window.render;
  window.render=function(){previousRender();apply562();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply562,180),{once:true});else setTimeout(apply562,180);
})();
