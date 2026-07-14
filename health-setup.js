'use strict';
(function(){
  const VERSION='4.7.0';
  const SETUP_KEY='cutcoach_health_setup_v1';
  const LINK_KEY='cutcoach_health_shortcut_link_v1';
  const SYNC_KEY='cutcoach_health_sync_v1';
  const baseRender=window.render;

  function json(key,fallback={}){try{const v=JSON.parse(localStorage.getItem(key)||'null');return v&&typeof v==='object'&&!Array.isArray(v)?v:fallback}catch{return fallback}}
  function saveSetup(patch){const next={...json(SETUP_KEY),...patch};try{localStorage.setItem(SETUP_KEY,JSON.stringify(next))}catch{}return next}
  function shortcutLink(){try{return localStorage.getItem(LINK_KEY)||''}catch{return ''}}
  function saveLink(value){const link=String(value||'').trim();if(!/^https:\/\/(www\.)?icloud\.com\/shortcuts\/[A-Za-z0-9]+(?:\?.*)?$/.test(link))return false;try{localStorage.setItem(LINK_KEY,link);return true}catch{return false}}
  function syncMeta(){return json(SYNC_KEY)}
  function connected(){return Boolean(syncMeta().last)}
  function stamp(value){const d=new Date(value);if(!Number.isFinite(d.getTime()))return 'Noch nie synchronisiert';return d.toDateString()===new Date().toDateString()?`Heute um ${d.toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}`:d.toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}
  function close(id){closeModal(document.querySelector(`#${id}`))}
  function go(step){document.querySelectorAll('[data-health-step]').forEach(el=>el.hidden=Number(el.dataset.healthStep)!==step);document.querySelectorAll('.health-wizard-dot').forEach((el,i)=>el.classList.toggle('active',i<step));const back=document.querySelector('#healthWizardBack');if(back)back.hidden=step===1;saveSetup({wizardStep:step})}
  function openShortcut(){const link=shortcutLink();if(link){saveSetup({installStarted:true});location.href=link;return}openModal('healthOwnerModal')}

  function ensureCard(){
    const old=document.querySelector('#healthSyncPanel');if(!old||document.querySelector('#healthPremiumCard'))return;
    old.id='healthPremiumCard';old.className='health-premium-card';old.innerHTML='<div class="health-premium-head"><span class="health-premium-icon">♥</span><div><small>Apple Health</small><strong id="healthPremiumTitle">Schritte automatisch verbinden</strong></div><span class="health-status-dot" id="healthStatusDot"></span></div><p id="healthPremiumText">Einmal einrichten. Danach übernimmt CutCoach deinen aktuellen Schrittstand.</p><div class="health-premium-meta" id="healthPremiumMeta" hidden><span id="healthPremiumSteps">–</span><small id="healthPremiumTime"></small></div><button type="button" id="healthPremiumAction">Jetzt verbinden</button>';
    document.querySelector('#healthPremiumAction').onclick=()=>openModal('healthWizardModal');
  }

  function ensureWizard(){
    if(document.querySelector('#healthWizardModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="healthWizardModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="healthWizardTitle"><div class="sheet health-wizard-sheet"><div class="sheet-head"><div><h2 id="healthWizardTitle">Apple Health verbinden</h2><small>Geführte Einrichtung</small></div><button type="button" id="healthWizardClose" aria-label="Schließen">×</button></div><div class="health-wizard-progress"><i class="health-wizard-dot"></i><i class="health-wizard-dot"></i><i class="health-wizard-dot"></i><i class="health-wizard-dot"></i></div><section data-health-step="1"><div class="health-wizard-visual">♥ <b>→</b> 👣</div><h3>Deine Schritte automatisch in CutCoach</h3><p>Du musst nichts berechnen oder eintippen. Wir installieren einmal den fertigen Kurzbefehl.</p><button type="button" id="healthStartWizard">Los geht’s</button></section><section data-health-step="2" hidden><span class="health-step-label">Schritt 1 von 3</span><h3>Kurzbefehl installieren</h3><p>Tippe auf den großen Button. Danach öffnet Apple die fertige Installation.</p><button type="button" class="health-install-button" id="healthInstallNow"> Kurzbefehl installieren</button><button type="button" class="secondary" id="healthInstalledConfirm">Ich habe ihn hinzugefügt</button></section><section data-health-step="3" hidden><span class="health-step-label">Schritt 2 von 3</span><h3>Zugriff erlauben</h3><div class="health-permission-box"><strong>Wenn Apple nach Health fragt:</strong><p>Tippe auf <b>„Alle erlauben“</b> oder erlaube mindestens <b>Schritte lesen</b>.</p></div><button type="button" id="healthPermissionDone">Zugriff ist erlaubt</button></section><section data-health-step="4" hidden><span class="health-step-label">Schritt 3 von 3</span><h3>Einmal testen</h3><p>Öffne „Kurzbefehle“ und tippe einmal auf <b>CutCoach Sync</b>. Danach kehrst du automatisch oder manuell hierher zurück.</p><button type="button" id="healthOpenShortcuts">Kurzbefehle öffnen</button><button type="button" class="secondary" id="healthCheckConnection">Verbindung prüfen</button><div class="health-check-result" id="healthCheckResult" hidden></div></section><div class="health-wizard-footer"><button type="button" class="secondary" id="healthWizardBack" hidden>Zurück</button></div></div></div>`);
    const modal=document.querySelector('#healthWizardModal');document.querySelector('#healthWizardClose').onclick=()=>close('healthWizardModal');modal.onclick=e=>{if(e.target===modal)close('healthWizardModal')};
    document.querySelector('#healthStartWizard').onclick=()=>go(2);
    document.querySelector('#healthInstallNow').onclick=openShortcut;
    document.querySelector('#healthInstalledConfirm').onclick=()=>go(3);
    document.querySelector('#healthPermissionDone').onclick=()=>go(4);
    document.querySelector('#healthOpenShortcuts').onclick=()=>{saveSetup({awaitingTest:true});location.href='shortcuts://'};
    document.querySelector('#healthCheckConnection').onclick=()=>{const result=document.querySelector('#healthCheckResult');result.hidden=false;if(connected()){result.className='health-check-result success';result.innerHTML='<strong>✓ Verbunden</strong><span>Die Schritte wurden erfolgreich übertragen.</span>';saveSetup({completed:true,dismissed:true});setTimeout(()=>{close('healthWizardModal');window.render()},850)}else{result.className='health-check-result pending';result.innerHTML='<strong>Noch kein Sync erkannt</strong><span>Starte in Kurzbefehle einmal „CutCoach Sync“ und tippe danach erneut auf „Verbindung prüfen“.</span>'}};
    document.querySelector('#healthWizardBack').onclick=()=>go(Math.max(1,Number(json(SETUP_KEY).wizardStep||1)-1));
  }

  function ensureOwner(){
    if(document.querySelector('#healthOwnerModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="healthOwnerModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="healthOwnerTitle"><div class="sheet health-owner-sheet"><div class="sheet-head"><div><h2 id="healthOwnerTitle">Kurzbefehl-Link fehlt</h2><small>Einmalig für den App-Besitzer</small></div><button type="button" id="healthOwnerClose" aria-label="Schließen">×</button></div><div class="health-owner-alert"><strong>Der Installationsbutton ist vorbereitet.</strong><p>Damit deine Freunde nur noch einmal tippen müssen, hinterlegst du hier einmal den iCloud-Link zum fertigen Kurzbefehl.</p></div><ol><li>Erstelle „CutCoach Sync“ einmal auf deinem iPhone.</li><li>In Kurzbefehle: <b>… → Teilen → iCloud-Link kopieren</b>.</li><li>Link hier einfügen und speichern.</li></ol><label>iCloud-Link<input id="healthShortcutLinkInput" type="url" inputmode="url" placeholder="https://www.icloud.com/shortcuts/…"></label><button type="button" id="healthSaveShortcutLink">Installationslink speichern</button><button type="button" class="secondary" id="healthOpenAdvanced">Kurzbefehl gemeinsam erstellen</button></div></div>`);
    const modal=document.querySelector('#healthOwnerModal');document.querySelector('#healthOwnerClose').onclick=()=>close('healthOwnerModal');modal.onclick=e=>{if(e.target===modal)close('healthOwnerModal')};
    document.querySelector('#healthSaveShortcutLink').onclick=()=>{const input=document.querySelector('#healthShortcutLinkInput');if(!saveLink(input.value)){toast('Bitte einen gültigen iCloud-Kurzbefehl-Link einfügen.');return}close('healthOwnerModal');toast('Installationslink gespeichert.');openModal('healthWizardModal')};
    document.querySelector('#healthOpenAdvanced').onclick=()=>{close('healthOwnerModal');openModal('healthSyncModal')};
  }

  function renderCard(){ensureCard();const card=document.querySelector('#healthPremiumCard');if(!card)return;const meta=syncMeta(),entry=meta.days?.[selectedDate]||(selectedDate===todayKey()?meta.last:null),isConnected=Boolean(entry);card.dataset.state=isConnected?'connected':'disconnected';document.querySelector('#healthPremiumTitle').textContent=isConnected?'Apple Health verbunden':'Schritte automatisch verbinden';document.querySelector('#healthPremiumText').textContent=isConnected?'Dein Schrittstand wurde automatisch übernommen.':'Einmal einrichten. Danach übernimmt CutCoach deinen aktuellen Schrittstand.';document.querySelector('#healthPremiumAction').textContent=isConnected?'Verbindung ansehen':'Jetzt verbinden';const details=document.querySelector('#healthPremiumMeta');details.hidden=!isConnected;if(isConnected){document.querySelector('#healthPremiumSteps').textContent=`${fmt(entry.steps)} Schritte`;document.querySelector('#healthPremiumTime').textContent=stamp(entry.syncedAt)}}
  function post(){ensureWizard();ensureOwner();renderCard();const input=document.querySelector('#healthShortcutLinkInput');if(input&&document.activeElement!==input)input.value=shortcutLink();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`}
  function maybePrompt(){const setup=json(SETUP_KEY);if(!connected()&&!setup.prompted){saveSetup({prompted:true,wizardStep:1});setTimeout(()=>openModal('healthWizardModal'),500)}}

  window.render=function(){baseRender();post()};
  window.addEventListener('pageshow',()=>{post();if(json(SETUP_KEY).awaitingTest&&connected()){saveSetup({awaitingTest:false,completed:true,dismissed:true});toast('Apple Health erfolgreich verbunden.')}});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{window.render();maybePrompt()},{once:true});else{window.render();maybePrompt()}
})();