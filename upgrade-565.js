'use strict';
(function(){
 const VERSION='5.6.5';
 function enhance565(){
  const root=document.querySelector('#today560');if(!root)return;
  const calendar=root.querySelector('#journalCalendarButton');
  if(calendar){
   let input=calendar.querySelector('.journal-calendar-input');
   if(!input){
    input=document.createElement('input');
    input.type='date';
    input.className='journal-calendar-input';
    input.setAttribute('aria-label','Datum auswählen');
    calendar.append(input);
    input.addEventListener('change',()=>{if(input.value)selectDate(input.value)});
   }
   input.max=todayKey();
   input.value=selectedDate;
   calendar.onclick=null;
   calendar.title='Datum auswählen';
  }
  const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
 }
 const base=window.render;window.render=function(){base();enhance565()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance565,220),{once:true});else setTimeout(enhance565,220);
})();