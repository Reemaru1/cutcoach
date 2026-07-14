'use strict';
(function(){
  const VERSION='4.6.0';
  const SETUP_KEY='cutcoach_health_setup_v1';
  const SHORTCUT_LINK_KEY='cutcoach_health_shortcut_link_v1';
  const DEFAULT_SHORTCUT_LINK='';
  const baseRender=window.render;

  function readSetup(){try{const v=JSON.parse(localStorage.getItem(SETUP_KEY)||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:{}}catch{return {}}}
  function writeSetup(patch){const next={...readSetup(),...patch};try{localStorage.setItem(SETUP_KEY,JSON.stringify(next))}catch{}return next}
  function shortcutLink(){try{return localStorage.getItem(SHORTCUT_LINK_KEY)||DEFAULT_SHORTCUT_LINK}catch{return DEFAULT_SHORTCUT_LINK}}
  function setShortcutLink(value){const link=String(value||'').trim();if(!/^https:\/\/www\.icloud\.com\/shortcuts\/[A-Za-z0-9]+$/.test(link))return false;try{localStorage.setItem(SHORTCUT_LINK_KEY,link);return true}catch{return false}}
  function openInstaller(){const link=shortcutLink();if(link){location.href=link;return}openModal('healthOwnerModal')}
  function ensureUi(){
    if(!document.querySelector('#healthSimpleModal')){
      document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="healthSimpleModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="healthSimpleTitle"><div class="sheet health-simple-sheet"><div class="sheet-head"><div><h2 id="healthSimpleTitle">Schritte automatisch übernehmen</h2><small>Einmal einrichten, danach genügt ein Tipp.</small></div><button type="button" id="healthSimpleClose" aria-label="Schließen">×</button></div><div class="health-simple-hero"><div class="health-simple-icons"><span>♥</span><b>→</b><span>👣</span></div><h3>Apple Health mit CutCoach verbinden</h3><p>Du installierst einen fertigen Apple-Kurzbefehl. Danach übernimmt CutCoach immer den aktuellen Schrittstand – ohne Doppelzählung.</p></div><button type="button" class="health-simple-primary" id="healthInstallShortcut"> Kurzbefehl installieren</button><div class="health-simple-steps"><div><b>1</b><span>Auf „Kurzbefehl hinzufügen“ tippen</span></div><div><b>2</b><span>Health-Zugriff erlauben</span></div><div><b>3</b><span>Kurzbefehl einmal starten</span></div></div><button type="button" class="secondary" id="healthAlreadyInstalled">Bereits installiert</button><small class="health-simple-note">Apple verlangt die Bestätigung auf jedem iPhone einmalig. Danach ist die Nutzung für alle gleich.</small></div></div>`);
      const modal=document.querySelector('#healthSimpleModal'),close=()=>closeModal(modal);document.querySelector('#healthSimpleClose').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};document.querySelector('#healthInstallShortcut').onclick=()=>{writeSetup({started:true});openInstaller()};document.querySelector('#healthAlreadyInstalled').onclick=()=>{writeSetup({dismissed:true});close();toast('Starte jetzt den Kurzbefehl „CutCoach Sync“.')};
    }
    if(!document.querySelector('#healthOwnerModal')){
      document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="healthOwnerModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="healthOwnerTitle"><div class="sheet health-owner-sheet"><div class="sheet-head"><div><h2 id="healthOwnerTitle">Einmalige Vorbereitung</h2><small>Nur für den App-Besitzer</small></div><button type="button" id="healthOwnerClose" aria-label="Schließen">×</button></div><p>Der Ein-Klick-Button ist fertig. Es fehlt nur der iCloud-Link zu deinem fertigen Kurzbefehl.</p><div class="health-owner-flow"><span>1</span><p>Erstelle den Kurzbefehl einmal auf deinem iPhone.</p><span>2</span><p>Tippe in Kurzbefehle auf <b>Teilen → iCloud-Link kopieren</b>.</p><span>3</span><p>Füge den Link unten ein. Danach funktioniert „Kurzbefehl installieren“ für alle Freunde.</p></div><label>iCloud-Kurzbefehl-Link<input id="healthShortcutLinkInput" type="url" inputmode="url" placeholder="https://www.icloud.com/shortcuts/…"></label><button type="button" id="healthSaveShortcutLink">Link speichern</button><button type="button" class="secondary" id="healthOpenAdvanced">Kurzbefehl jetzt Schritt für Schritt erstellen</button></div></div>`);
      const modal=document.querySelector('#healthOwnerModal'),close=()=>closeModal(modal);document.querySelector('#healthOwnerClose').onclick=close;modal.onclick=e=>{if(e.target===modal)close()};document.querySelector('#healthSaveShortcutLink').onclick=()=>{const input=document.querySelector('#healthShortcutLinkInput');if(!setShortcutLink(input.value)){toast('Bitte einen gültigen iCloud-Kurzbefehl-Link einfügen.');return}close();toast('Installationslink gespeichert. Der Ein-Klick-Button ist aktiv.');window.render()};document.querySelector('#healthOpenAdvanced').onclick=()=>{close();openModal('healthSyncModal')};
    }
    const old=document.querySelector('#healthSyncOpen');if(old&&!old.dataset.simple460){old.dataset.simple460='1';old.textContent='Verbinden';old.onclick=()=>openModal('healthSimpleModal')}
    const panel=document.querySelector('#healthSyncPanel');if(panel&&!panel.querySelector('.health-simple-badge'))panel.insertAdjacentHTML('afterbegin','<span class="health-simple-badge">Einfach eingerichtet</span>');
    const linkInput=document.querySelector('#healthShortcutLinkInput');if(linkInput&&document.activeElement!==linkInput)linkInput.value=shortcutLink();
  }
  function maybePrompt(){const setup=readSetup();let synced=false;try{synced=Boolean(JSON.parse(localStorage.getItem('cutcoach_health_sync_v1')||'{}')?.last)}catch{}if(!synced&&!setup.dismissed&&!setup.prompted){writeSetup({prompted:true});setTimeout(()=>openModal('healthSimpleModal'),450)}}
  function post(){ensureUi();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  window.render=function(){baseRender();post()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{window.render();maybePrompt()},{once:true});else{window.render();maybePrompt()}
})();
