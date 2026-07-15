'use strict';
(function(){
 const VERSION='5.6.4';
 function openCalendar(){
  const picker=document.querySelector('#datePicker');
  if(!picker)return;
  picker.style.position='fixed';picker.style.left='50%';picker.style.top='18%';picker.style.width='1px';picker.style.height='1px';picker.style.opacity='0.01';picker.style.pointerEvents='auto';
  try{if(typeof picker.showPicker==='function'){picker.showPicker();return}}catch{}
  picker.focus({preventScroll:true});picker.click();
 }
 function enhance564(){
  const root=document.querySelector('#today560');if(!root)return;
  const top=root.querySelector('.journal-topbar');if(!top)return;
  let tools=top.querySelector('.journal-topbar-tools');
  if(!tools){
   tools=document.createElement('div');tools.className='journal-topbar-tools';
   const controls=top.querySelector('.journal-day-controls'),stats=top.querySelector('.journal-mini-stats'),calendar=top.querySelector('.journal-calendar-button');
   if(controls)tools.append(controls);if(stats)tools.append(stats);if(calendar)tools.append(calendar);top.append(tools);
  }
  const calendar=root.querySelector('#journalCalendarButton');
  if(calendar){calendar.textContent='';calendar.title='Datum auswählen';calendar.setAttribute('aria-label','Datum auswählen');calendar.onclick=openCalendar}
  const date=root.querySelector('#journalDateButton');if(date){date.title='Datum auswählen';date.onclick=openCalendar}
  const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
 }
 const base=window.render;window.render=function(){base();enhance564()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(enhance564,220),{once:true});else setTimeout(enhance564,220);
})();
