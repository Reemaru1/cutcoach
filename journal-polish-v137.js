'use strict';
(function(){
  const VERSION='1.3.7 Alpha';
  const $=selector=>document.querySelector(selector);
  let frame=0,observer=null;

  function fixSteps(){
    const card=$('.journal-steps-card'),value=card?.querySelector('#journalSteps'),meta=card?.querySelector('#journalStepMeta');
    if(!card||!value||!meta)return;
    const text=(value.textContent||'').trim();
    const legacyEmpty=/^[-–—]\s*Schritte$/i.test(text);
    const empty=legacyEmpty||/Noch nicht eingetragen/i.test(text);
    if(legacyEmpty)value.textContent='Noch nicht eingetragen';
    if(empty){
      if(meta.textContent)meta.textContent='';
      if(!meta.hidden)meta.hidden=true;
      if(meta.getAttribute('aria-hidden')!=='true')meta.setAttribute('aria-hidden','true');
    }else{
      if(meta.hidden)meta.hidden=false;
      if(meta.hasAttribute('aria-hidden'))meta.removeAttribute('aria-hidden');
    }
  }

  function fixSummary(){
    if(!window.CutCoachJournalV72)return;
    const modal=$('#journalSummaryModal');if(!modal)return;
    const close=modal.querySelector('#journalSummaryClose');
    if(close){
      if(!close.hasAttribute('data-close'))close.setAttribute('data-close','');
      if(close.textContent!=='×')close.textContent='×';
    }
    modal.querySelector('#journalSummaryDone')?.remove();
  }

  function sync(){frame=0;fixSteps();fixSummary()}
  function queue(){if(frame)return;frame=requestAnimationFrame(sync)}

  function start(){
    queue();
    [100,300,700,1400].forEach(delay=>setTimeout(queue,delay));
    if(!observer){
      observer=new MutationObserver(records=>{
        if(records.some(record=>record.type==='characterData'||record.addedNodes.length||record.removedNodes.length))queue();
      });
      observer.observe(document.body||document.documentElement,{childList:true,subtree:true,characterData:true});
    }
    document.addEventListener('cutcoach:data-changed',queue);
    document.addEventListener('click',event=>{if(event.target.closest?.('#journalFinishDay,#journalStepToggle,#journalStepSave,#journalStepClear'))queue()},true);
    window.addEventListener('pageshow',queue);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachJournalPolish137=Object.freeze({version:VERSION,refresh:queue});
})();