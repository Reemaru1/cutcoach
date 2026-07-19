'use strict';
(function(){
  const VERSION='1.3.3-alpha';
  const returnFocus=new WeakMap();
  const focusableSelector='button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])';
  const openModals=()=>[...document.querySelectorAll('.modal.open')];
  const topModal=()=>openModals().at(-1)||null;
  const visibleFocusable=modal=>[...modal.querySelectorAll(focusableSelector)].filter(node=>!node.hidden&&node.getAttribute('aria-hidden')!=='true');

  function patchModals(){
    const originalOpen=window.openModal,originalClose=window.closeModal;
    if(typeof originalOpen!=='function'||typeof originalClose!=='function'||originalOpen.__stability133)return;
    const hardenedOpen=function(id){const modal=document.getElementById(id);if(modal&&!modal.classList.contains('open')){const active=document.activeElement;if(active instanceof HTMLElement&&active!==document.body)returnFocus.set(modal,active)}return originalOpen.apply(this,arguments)};
    const hardenedClose=function(modal){const target=modal instanceof Element?modal:null,wasTop=Boolean(target&&target===topModal()),opener=target?returnFocus.get(target):null,result=originalClose.apply(this,arguments);if(target)returnFocus.delete(target);if(wasTop)queueMicrotask(()=>{const remaining=topModal();if(opener instanceof HTMLElement&&opener.isConnected&&!opener.hidden){try{opener.focus({preventScroll:true});return}catch{}}const fallback=remaining&&visibleFocusable(remaining)[0];fallback?.focus?.({preventScroll:true})});return result};
    hardenedOpen.__stability133=true;hardenedClose.__stability133=true;window.openModal=hardenedOpen;window.closeModal=hardenedClose;
  }

  function trapTopModal(event){
    const modal=topModal();if(!modal)return;
    if(event.key==='Escape'&&modal.id!=='onboardingModal'){event.preventDefault();event.stopImmediatePropagation();window.closeModal?.(modal);return}
    if(event.key!=='Tab')return;
    const focusable=visibleFocusable(modal);if(!focusable.length){event.preventDefault();event.stopImmediatePropagation();modal.setAttribute('tabindex','-1');modal.focus();return}
    const first=focusable[0],last=focusable.at(-1),active=document.activeElement;
    if(!modal.contains(active)){event.preventDefault();event.stopImmediatePropagation();first.focus();return}
    if(event.shiftKey&&active===first){event.preventDefault();event.stopImmediatePropagation();last.focus();return}
    if(!event.shiftKey&&active===last){event.preventDefault();event.stopImmediatePropagation();first.focus();return}
    if(openModals().length>1)event.stopImmediatePropagation();
  }

  function preserveLibraryUrl(){
    if(location.hash!=='#library')return;
    try{const url=new URL(location.href);if(typeof selectedDate==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(selectedDate))url.searchParams.set('date',selectedDate);history.replaceState(null,'',`${url.pathname}${url.search}#library`)}catch{}
  }

  function protectExternalState(event){
    if(typeof STORAGE_KEY!=='string'||event.key!==STORAGE_KEY||event.newValue===null)return;
    let parsed=null,reason='';
    try{parsed=JSON.parse(event.newValue);if(typeof schemaVersionOf==='function'&&schemaVersionOf(parsed)>SCHEMA_VERSION)reason='neuere Version'}catch{reason='beschädigte Daten'}
    if(!reason)return;
    event.stopImmediatePropagation();
    try{localStorage.setItem(RECOVERY_KEY,event.newValue)}catch{}
    try{storageReadOnly=true}catch{}
    try{startupWarning=`Ein anderes Fenster hat ${reason} gespeichert. CutCoach wurde zum Schutz vor Überschreiben in den Nur-Lesen-Modus versetzt.`}catch{}
    try{toast(`Schutzmodus: ${reason} aus anderem Fenster wurden nicht überschrieben.`)}catch{}
    try{renderMeta?.()}catch{}
  }

  function start(){
    patchModals();
    document.addEventListener('keydown',trapTopModal,true);
    document.addEventListener('click',event=>{if(event.target.closest?.('nav [data-tab="library"]'))queueMicrotask(preserveLibraryUrl)},true);
    window.addEventListener('hashchange',preserveLibraryUrl);
    window.addEventListener('storage',protectExternalState,true);
    preserveLibraryUrl();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachStability133=Object.freeze({version:VERSION,preserveLibraryUrl,topModal});
})();