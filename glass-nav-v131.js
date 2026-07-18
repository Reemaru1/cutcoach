'use strict';
(function(){
  const ICONS={
    today:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M6 3.5h10a2 2 0 0 1 2 2v15H6a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z"/><path d="M8 3.5v17M10.5 9l1.5 1.5L15.5 7"/></svg></span><span class="cc-nav-label">Tagebuch</span>',
    progress:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 18V9M10 18V5M16 18v-7M22 18V3"/><path d="m3 8 5-3 5 4 7-6"/></svg></span><span class="cc-nav-label">Fortschritt</span>',
    food:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></span><span class="cc-nav-label">Ernährung</span>',
    settings:'<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V20.3h-3v-.08a1.7 1.7 0 0 0-1.03-1.56 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 5 15a1.7 1.7 0 0 0-1.56-1.03H3.3v-3h.14A1.7 1.7 0 0 0 5 9.94a1.7 1.7 0 0 0-.34-1.88L4.6 8l2.12-2.12.06.06A1.7 1.7 0 0 0 8.66 6.3 1.7 1.7 0 0 0 9.7 4.73V4.6h3v.13a1.7 1.7 0 0 0 1.03 1.57 1.7 1.7 0 0 0 1.88-.34l.06-.06L17.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.56 1.03h.14v3h-.14A1.7 1.7 0 0 0 19.4 15Z"/></svg></span><span class="cc-nav-label">Einstellungen</span>'
  };
  function enhance(){
    const nav=document.querySelector('body>nav[aria-label="Hauptnavigation"]');
    if(!nav||nav.dataset.glassNavV131==='1')return false;
    const required=['today','food','progress','settings'];
    const buttons=Object.fromEntries(required.map(key=>[key,nav.querySelector(`[data-tab="${key}"]`)]));
    if(required.some(key=>!buttons[key]))return false;
    nav.dataset.glassNavV131='1';
    nav.classList.add('cc-glass-nav-v131');
    document.body.classList.add('cc-glass-nav-active');
    for(const key of required){
      const button=buttons[key];
      button.innerHTML=ICONS[key];
      if(key==='food')button.setAttribute('aria-label','Ernährungsbereich öffnen');
      else button.setAttribute('aria-label',key==='today'?'Tagebuch öffnen':key==='progress'?'Fortschritt öffnen':'Einstellungen öffnen');
    }
    return true;
  }
  function start(){
    if(enhance())return;
    const observer=new MutationObserver(()=>{if(enhance())observer.disconnect()});
    observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
    setTimeout(()=>observer.disconnect(),5000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.CutCoachGlassNavV131=Object.freeze({enhance});
})();
