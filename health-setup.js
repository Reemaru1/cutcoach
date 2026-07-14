'use strict';
(function(){
  const VERSION='5.1.0';
  const LINK_KEY='cutcoach_health_shortcut_link_v1';
  const META_KEY='cutcoach_health_sync_v1';
  const baseRender=window.render;

  function read(key){
    try{
      const value=JSON.parse(localStorage.getItem(key)||'{}');
      return value&&typeof value==='object'&&!Array.isArray(value)?value:{};
    }catch{return {};}
  }
  function shortcutLink(){
    try{return localStorage.getItem(LINK_KEY)||'';}catch{return '';}
  }
  function validLink(value){
    return /^https:\/\/(www\.)?icloud\.com\/shortcuts\/[A-Za-z0-9]+(?:\?.*)?$/.test(String(value||'').trim());
  }
  function saveLink(value){
    const link=String(value||'').trim();
    if(!validLink(link))return false;
    localStorage.setItem(LINK_KEY,link);
    return true;
  }
  function close(id){
    closeModal(document.querySelector('#'+id));
  }
  function api(){
    return window.CutCoachHealthSync;
  }
  function ensureCard(){
    const old=document.querySelector('#healthSyncPanel');
    if(!old||document.querySelector('#healthPremiumCard'))return;
    old.id='healthPremiumCard';
    old.className='health-premium-card';
    old.innerHTML='<div class="health-premium-head"><span class="health-premium-icon">♥</span><div><small>Apple Health</small><strong id="healthPremiumTitle">Health-Cloud vorbereiten</strong></div><span class="health-status-dot"></span></div><p id="healthPremiumText">Safari und Home-App werden über einen persönlichen Cloud-Code verbunden.</p><div class="health-premium-meta" id="healthPremiumMeta" hidden><span id="healthPremiumSteps"></span><small id="healthPremiumTime"></small></div><button type="button" id="healthPremiumAction">Einrichtung öffnen</button>';
    document.querySelector('#healthPremiumAction').onclick=()=>openModal('healthCloudModal');
  }
  function ensureCloudModal(){
    if(document.querySelector('#healthCloudModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="healthCloudModal" role="dialog" aria-modal="true" aria-labelledby="healthCloudTitle"><div class="sheet health-cloud-sheet"><div class="sheet-head"><div><h2 id="healthCloudTitle">Health-Cloud einrichten</h2><small>Safari und Home-App auf demselben Stand</small></div><button type="button" id="healthCloudClose" aria-label="Schließen">×</button></div>
      <div class="cloud-status-card" id="healthCloudStatus" data-state="pending"><span class="cloud-status-icon">↻</span><div><strong id="healthCloudStatusTitle">Cloud noch nicht geprüft</strong><small id="healthCloudStatusText">Zuerst muss die Supabase-Datenbank einmal vorbereitet werden.</small></div></div>
      <section class="cloud-step"><span class="cloud-step-number">1</span><div><h3>Cloud-Verbindung prüfen</h3><p>Nach dem einmaligen SQL-Schritt prüft CutCoach automatisch, ob Schreiben und Lesen funktionieren.</p><button type="button" id="healthCloudTest">Cloud jetzt testen</button><div class="health-check-result" id="healthCloudTestResult" hidden></div></div></section>
      <section class="cloud-step"><span class="cloud-step-number">2</span><div><h3>Deinen Kurzbefehl verbinden</h3><p>Öffne deinen funktionierenden <b>CutCoach Sync</b>. Im gelben Textblock steht bereits die blaue Variable <b>Summe</b>. Direkt dahinter muss nur noch dein persönlicher Zusatz stehen.</p><label>Persönlicher Zusatz für deinen Kurzbefehl<div class="cloud-copy-row"><code id="healthCloudSuffix"></code><button type="button" id="healthCopySuffix">Kopieren</button></div></label><details><summary>Komplette Vorlage anzeigen</summary><code class="cloud-template" id="healthCloudTemplate"></code></details><button type="button" class="secondary" id="healthOpenShortcutApp">Kurzbefehle öffnen</button></div></section>
      <section class="cloud-step"><span class="cloud-step-number">3</span><div><h3>Einmal starten und Home-App öffnen</h3><p>Starte <b>CutCoach Sync</b> einmal. Safari speichert die Schritte in der Cloud. Öffne danach deine Home-Bildschirm-App und tippe hier auf Laden.</p><button type="button" id="healthCloudPull">Schritte aus Cloud laden</button><div class="health-check-result" id="healthCloudPullResult" hidden></div></div></section>
      <section class="cloud-friends"><h3>Einrichtung für Freunde</h3><p>Sobald dein fertiger Kurzbefehl zuverlässig läuft, teile genau diesen als iCloud-Link. Der Link wird anschließend hier hinterlegt.</p><label>iCloud-Link zum fertigen „CutCoach Sync“<input id="healthShortcutLinkInput" type="url" inputmode="url" placeholder="https://www.icloud.com/shortcuts/…"></label><button type="button" id="healthSaveShortcutLink">Link für Freunde speichern</button><button type="button" class="secondary" id="healthRemoveShortcutLink">Gespeicherten Link entfernen</button></section>
    </div></div>`);
    const modal=document.querySelector('#healthCloudModal');
    document.querySelector('#healthCloudClose').onclick=()=>close('healthCloudModal');
    modal.onclick=event=>{if(event.target===modal)close('healthCloudModal');};
    document.querySelector('#healthCloudTest').onclick=async()=>{
      const result=document.querySelector('#healthCloudTestResult');
      result.hidden=false;
      result.className='health-check-result pending';
      result.innerHTML='<strong>Prüfung läuft …</strong><span>CutCoach schreibt und liest einen Testwert.</span>';
      try{
        const ok=await api().testCloud();
        result.className='health-check-result '+(ok?'success':'pending');
        result.innerHTML=ok?'<strong>✓ Cloud funktioniert</strong><span>Safari und Home-App können denselben Schrittstand verwenden.</span>':'<strong>Cloud-Test nicht vollständig</strong><span>Bitte den SQL-Block im Supabase SQL Editor ausführen.</span>';
      }catch(error){
        result.className='health-check-result pending';
        result.innerHTML='<strong>Supabase-SQL fehlt noch</strong><span>Führe den bereitgestellten SQL-Block einmal im SQL Editor aus und teste erneut.</span>';
      }
      window.render();
    };
    document.querySelector('#healthCopySuffix').onclick=async()=>{
      await api().copyText(api().shortcutSuffix());
      toast('Persönlicher Zusatz kopiert.');
    };
    document.querySelector('#healthOpenShortcutApp').onclick=()=>location.href='shortcuts://';
    document.querySelector('#healthCloudPull').onclick=async()=>{
      const result=document.querySelector('#healthCloudPullResult');
      result.hidden=false;
      result.className='health-check-result pending';
      result.innerHTML='<strong>Cloud wird geladen …</strong><span>Der aktuelle Schrittstand wird gesucht.</span>';
      const payload=await api().pull({silent:false,force:true});
      result.className='health-check-result '+(payload?'success':'pending');
      result.innerHTML=payload?`<strong>✓ ${fmt(payload.steps)} Schritte geladen</strong><span>Die Home-App verwendet jetzt den Cloud-Stand.</span>`:'<strong>Noch kein Cloud-Wert gefunden</strong><span>Starte zuerst den reparierten CutCoach-Sync-Kurzbefehl.</span>';
      window.render();
    };
    document.querySelector('#healthSaveShortcutLink').onclick=()=>{
      const input=document.querySelector('#healthShortcutLinkInput');
      if(!saveLink(input.value)){toast('Bitte einen gültigen iCloud-Kurzbefehl-Link einfügen.');return;}
      toast('Installationslink für Freunde gespeichert.');
      window.render();
    };
    document.querySelector('#healthRemoveShortcutLink').onclick=()=>{
      localStorage.removeItem(LINK_KEY);
      const input=document.querySelector('#healthShortcutLinkInput');
      if(input)input.value='';
      toast('Gespeicherter Kurzbefehl-Link entfernt.');
      window.render();
    };
  }
  function ensureFriendModal(){
    if(document.querySelector('#healthFriendModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="healthFriendModal" role="dialog" aria-modal="true"><div class="sheet health-friend-sheet"><div class="sheet-head"><div><h2>Apple Health verbinden</h2><small>Einmalige Einrichtung</small></div><button type="button" id="healthFriendClose">×</button></div><div class="friend-setup-hero">♥ <span>→</span> ☁️ <span>→</span> 👣</div><ol><li><b>Persönlichen Sync-Code kopieren</b></li><li><b>Kurzbefehl installieren</b> und den Code beim Einrichten einfügen</li><li><b>Kurzbefehl einmal starten</b> und Health erlauben</li></ol><button type="button" id="healthFriendCopyCode">1. Sync-Code kopieren</button><button type="button" id="healthFriendInstall">2. Kurzbefehl installieren</button><code id="healthFriendCode"></code></div></div>`);
    const modal=document.querySelector('#healthFriendModal');
    document.querySelector('#healthFriendClose').onclick=()=>close('healthFriendModal');
    modal.onclick=event=>{if(event.target===modal)close('healthFriendModal');};
    document.querySelector('#healthFriendCopyCode').onclick=async()=>{await api().copyText(api().ensureToken());toast('Persönlicher Sync-Code kopiert.');};
    document.querySelector('#healthFriendInstall').onclick=()=>{
      const link=shortcutLink();
      if(link)location.href=link;
      else toast('Der Installationslink wurde noch nicht hinterlegt.');
    };
  }
  function renderCloudUi(){
    ensureCard();
    ensureCloudModal();
    ensureFriendModal();
    const healthApi=api();
    if(!healthApi)return;
    const pair=healthApi.pairData(),meta=read(META_KEY);
    const entry=meta.days?.[selectedDate]||(selectedDate===todayKey()?meta.last:null);
    const cloudReady=Boolean(pair.cloudReady);
    const card=document.querySelector('#healthPremiumCard');
    if(!card)return;
    card.dataset.state=cloudReady?'connected':'disconnected';
    document.querySelector('#healthPremiumTitle').textContent=cloudReady?'Health-Cloud verbunden':'Health-Cloud vorbereiten';
    document.querySelector('#healthPremiumText').textContent=cloudReady?'Safari und Home-App greifen auf denselben Schrittstand zu.':'Ein persönlicher Cloud-Code verbindet beide App-Speicher.';
    document.querySelector('#healthPremiumAction').textContent=cloudReady?'Cloud-Details':'Einrichtung fortsetzen';
    const metaBox=document.querySelector('#healthPremiumMeta');
    metaBox.hidden=!entry;
    if(entry){
      document.querySelector('#healthPremiumSteps').textContent=fmt(entry.steps)+' Schritte';
      document.querySelector('#healthPremiumTime').textContent=new Date(entry.syncedAt).toLocaleString('de-DE',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    }
    const status=document.querySelector('#healthCloudStatus');
    if(status){
      status.dataset.state=cloudReady?'success':pair.lastError?'error':'pending';
      document.querySelector('#healthCloudStatusTitle').textContent=cloudReady?'Cloud-Verbindung aktiv':pair.lastError?'Cloud noch nicht eingerichtet':'Cloud noch nicht geprüft';
      document.querySelector('#healthCloudStatusText').textContent=cloudReady?'Der gemeinsame Schritt-Speicher ist erreichbar.':pair.lastError?'Der Supabase-SQL-Block muss einmal ausgeführt werden.':'Starte anschließend den Cloud-Test.';
    }
    const suffix=document.querySelector('#healthCloudSuffix');
    const template=document.querySelector('#healthCloudTemplate');
    const friendCode=document.querySelector('#healthFriendCode');
    if(suffix)suffix.textContent=healthApi.shortcutSuffix();
    if(template)template.textContent=healthApi.personalShortcutTemplate();
    if(friendCode)friendCode.textContent=healthApi.ensureToken();
    const input=document.querySelector('#healthShortcutLinkInput');
    if(input&&document.activeElement!==input)input.value=shortcutLink();
  }
  function post(){
    renderCloudUi();
    const version=document.querySelector('#appVersion');
    if(version)version.textContent='Version '+VERSION;
  }
  window.render=function(){baseRender();post();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>window.render(),{once:true});
  else window.render();
})();
