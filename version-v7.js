'use strict';
(function(){
  const RELEASE='7.0.0';
  window.CUTCOACH_RELEASE=RELEASE;
  function setVersion(){const node=document.querySelector('#appVersion');if(node)node.textContent=`Version ${RELEASE}`}
  async function exportBackupV7(event){
    const button=event.target.closest?.('#exportData');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const envelope=typeof backupEnvelope==='function'?backupEnvelope():{format:'cutcoach-backup',formatVersion:1,schemaVersion:typeof SCHEMA_VERSION==='number'?SCHEMA_VERSION:null,exportedAt:new Date().toISOString(),data:typeof state==='object'?JSON.parse(JSON.stringify(state)):null};
      envelope.appVersion=RELEASE;if(envelope.data?.meta)envelope.data.meta.appVersion=RELEASE;
      await shareOrDownload(JSON.stringify(envelope,null,2),`CutCoach-Backup-${typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}.json`);
      if(typeof commitStateMutation==='function')commitStateMutation(current=>{current.meta.lastBackupAt=envelope.exportedAt;current.meta.appVersion=RELEASE});
      window.render?.();toast?.('Backup erstellt.');
    }catch(error){if(error?.name!=='AbortError')toast?.('Backup konnte nicht exportiert werden.')}
  }
  document.addEventListener('click',exportBackupV7,true);
  const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){baseRender();setVersion()};
  const observer=new MutationObserver(setVersion);observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setVersion,{once:true});else setVersion();
})();
