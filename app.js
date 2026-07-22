'use strict';

(function(){
  let knownToday=todayKey();
  let lastUpdateCheck=0;
  let rolloverTimer=null;

  function refreshCurrentDay(forceRender=false){
    const currentToday=todayKey(),followToday=selectedDate===knownToday;
    $('#datePicker').max=currentToday;
    if(followToday&&currentToday!==knownToday)setSelectedDate(currentToday);
    const changed=currentToday!==knownToday;
    knownToday=currentToday;
    if(changed||forceRender)render();
    return changed;
  }
  function scheduleDayRollover(){
    clearTimeout(rolloverTimer);
    const now=new Date(),next=new Date(now);next.setHours(24,0,1,0);
    rolloverTimer=setTimeout(()=>{refreshCurrentDay(true);scheduleDayRollover()},Math.max(1000,next-now));
  }
  function showOnboarding(){openModal('onboardingModal');window.CutCoachInsights?.track('onboarding_shown')}

  function switchTab(name,updateHash=true){
    const target=$(`[data-screen="${name}"]`),button=$(`[data-tab="${name}"]`);
    if(!target||!button)return;
    $$('[data-tab]').forEach(item=>{item.classList.toggle('active',item===button);item.setAttribute('aria-current',item===button?'page':'false');});
    $$('.screen').forEach(screen=>screen.classList.toggle('active',screen===target));
    if(updateHash&&location.hash!==`#${name}`)history.replaceState(null,'',`#${name}`);
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function tabFromHash(){
    const name=location.hash.slice(1);
    return ['today','food','progress','settings'].includes(name)?name:'today';
  }
  function trapModalFocus(event){
    if(event.key!=='Tab')return;
    const modal=$('.modal.open');if(!modal)return;
    const focusable=$$('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])').filter(element=>modal.contains(element)&&!element.hidden&&element.offsetParent!==null);
    if(!focusable.length)return;
    const first=focusable[0],last=focusable.at(-1);
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  }
  function setupEvents(){
    $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.tab)));
    window.addEventListener('hashchange',()=>switchTab(tabFromHash(),false));
    $$('[data-open]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.open==='mealModal')openMeal();
      else{
        if(button.dataset.open==='weightModal'){
          const data=day(selectedDate,false);$('#weightInput').value=data.weight??'';$('#clearWeight').hidden=data.weight===null;
        }
        openModal(button.dataset.open);
      }
    }));
    $$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.closest('.modal'))));
    $$('.modal').forEach(modal=>modal.addEventListener('click',event=>{if(event.target===modal&&modal.id!=='onboardingModal')closeModal(modal);}));
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')closeModal($('.modal.open:not(#onboardingModal)'));
      trapModalFocus(event);
    });
    $('#mealModal').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input')&&!event.isComposing){event.preventDefault();saveMeal();}});
    $('#weightModal').addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.matches('input')&&!event.isComposing){event.preventDefault();$('#saveWeight').click();}});

    $('#saveMeal').addEventListener('click',saveMeal);
    $('#copyPreviousMeals').addEventListener('click',copyPreviousMeals);
    $('#saveWeight').addEventListener('click',()=>{
      const weight=nullable($('#weightInput').value,30,300);
      if(weight===null){toast('Bitte ein gültiges Gewicht eintragen.');return;}
      if(!commitDayMutation(data=>{data.weight=weight})){toast('Gewicht konnte nicht gespeichert werden.');return;}
      closeModal($('#weightModal'));render();toast('Gewicht gespeichert.');
    });
    $('#clearWeight').addEventListener('click',clearWeight);
    $('#saveSteps').addEventListener('click',()=>{
      const steps=nullable($('#stepsInput').value,0,100000,true);
      if(steps===null){toast('Bitte gültige Schritte eintragen.');return;}
      if(!commitDayMutation(data=>{data.steps=steps})){toast('Schritte konnten nicht gespeichert werden.');return;}
      render();toast('Schritte gespeichert.');
    });
    $('#clearSteps').addEventListener('click',clearSteps);
    $$('[data-gym]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.gym==='true',current=day(selectedDate,false).gym;if(!commitDayMutation(data=>{data.gym=current===value?null:value})){toast('Training konnte nicht gespeichert werden.');return;}render();}));
    $$('[data-alcohol]').forEach(button=>button.addEventListener('click',()=>{const value=button.dataset.alcohol==='true',current=day(selectedDate,false).alcohol;if(!commitDayMutation(data=>{data.alcohol=current===value?null:value})){toast('Alkohol-Angabe konnte nicht gespeichert werden.');return;}render();}));

    $('#saveSettings').addEventListener('click',saveSettings);
    $('#startApp').addEventListener('click',async()=>{
      const weight=nullable($('#startWeight').value,30,300);
      const goal=$('#startGoal').value===''?null:nullable($('#startGoal').value,30,300);
      if(weight===null){toast('Bitte dein Startgewicht eintragen.');return;}
      if($('#startGoal').value!==''&&goal===null){toast('Bitte ein gültiges Wunschgewicht eintragen.');return;}
      if(!commitStateMutation(current=>{const data=current.days[todayKey()]||sanitizeDay();data.weight=weight;current.days[todayKey()]=data;current.settings.goalWeight=goal;current.onboarded=true})){toast('CutCoach konnte nicht gestartet werden. Bitte Speicher prüfen.');return;}
      window.CutCoachInsights?.track('onboarding_completed');closeModal($('#onboardingModal'));render();await requestPersistentStorage();toast('CutCoach ist gestartet.');
    });
    $('#exportData').addEventListener('click',exportBackup);
    $('#importData').addEventListener('change',event=>{importBackup(event.target.files?.[0]);event.target.value='';});
    $('#restorePrevious').addEventListener('click',restorePreviousState);
    $('#exportRecovery').addEventListener('click',exportRecovery);
    $('#dismissDataWarning').addEventListener('click',()=>{startupWarning=null;renderMeta();});
    $('#resetData').addEventListener('click',()=>{
      if(!confirm('Wirklich alle CutCoach-Daten auf diesem Gerät löschen? Der aktuelle Stand wird vorher lokal gesichert.'))return;
      if(!storageReadOnly&&!savePreviousState('Vor Zurücksetzen')){toast('Sicherung fehlgeschlagen – Zurücksetzen wurde abgebrochen.');return;}
      if(!commitStateReplacement(DEFAULTS,{clearReadOnly:true})){toast('Daten konnten nicht zurückgesetzt werden.');return;}
      removeStorage(RECOVERY_KEY);window.CutCoachInsights?.reset();window.CutCoachFeedback?.clear();startupWarning=null;setSelectedDate(todayKey());render();showOnboarding();toast('Daten zurückgesetzt.');
    });

    $('#previousDay').addEventListener('click',()=>selectDate(shiftKey(selectedDate,-1)));
    $('#nextDay').addEventListener('click',()=>selectDate(shiftKey(selectedDate,1)));
    $('#todayButton').addEventListener('click',()=>selectDate(todayKey()));
    $('#datePicker').addEventListener('change',event=>selectDate(event.target.value));
    $('#installInfo').addEventListener('click',installApp);
    $('#reloadUpdate').addEventListener('click',activateUpdate);

    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;});
    window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallButton();toast('CutCoach wurde installiert.');});
    window.addEventListener('online',()=>{renderMeta();checkForUpdates(true);});
    window.addEventListener('offline',renderMeta);
    window.addEventListener('storage',event=>{
      if(event.key!==STORAGE_KEY)return;
      if(event.newValue===null){state=sanitizeState(DEFAULTS);lastSavedSnapshot='';setSelectedDate(todayKey());render();showOnboarding();toast('Daten wurden in einem anderen Fenster zurückgesetzt.');return;}
      try{
        const parsed=JSON.parse(event.newValue);
        if(schemaVersionOf(parsed)>SCHEMA_VERSION){toast('Ein anderes Fenster nutzt eine neuere CutCoach-Version.');return;}
        state=sanitizeState(parsed);lastSavedSnapshot=event.newValue;render();toast('Daten aus einem anderen Fenster übernommen.');
      }catch{toast('Änderung aus anderem Fenster konnte nicht übernommen werden.');}
    });
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){refreshCurrentDay(true);checkForUpdates();updateStorageStatus()}});
    window.addEventListener('focus',()=>refreshCurrentDay(false));
  }

  async function installApp(){
    if(deferredInstallPrompt){deferredInstallPrompt.prompt();await deferredInstallPrompt.userChoice;deferredInstallPrompt=null;return;}
    const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    if(installed)toast('CutCoach ist bereits installiert.');
    else alert('Auf dem iPhone in Safari: Teilen → Zum Home-Bildschirm → Hinzufügen. Danach CutCoach über das Symbol öffnen.');
  }
  function updateInstallButton(){
    const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    $('#installInfo')?.classList.toggle('hidden',Boolean(installed));
  }
  function showUpdateBanner(){if(!updateRequested)$('#updateBanner')?.classList.add('show');}
  function activateUpdate(){
    updateRequested=true;$('#reloadUpdate').disabled=true;setText('#reloadUpdate','Wird geladen …');
    const waiting=serviceWorkerRegistration?.waiting;
    if(waiting){waiting.postMessage({type:'SKIP_WAITING'});setTimeout(()=>location.reload(),4000);}
    else location.reload();
  }
  async function checkForUpdates(force=false){
    if(!serviceWorkerRegistration||!navigator.onLine)return;
    const now=Date.now();if(!force&&now-lastUpdateCheck<30*60*1000)return;
    lastUpdateCheck=now;try{await serviceWorkerRegistration.update();}catch{}
  }
  async function registerServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    try{
      const hadController=Boolean(navigator.serviceWorker.controller);
      serviceWorkerRegistration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      if(serviceWorkerRegistration.waiting&&hadController)showUpdateBanner();
      serviceWorkerRegistration.addEventListener('updatefound',()=>{
        const worker=serviceWorkerRegistration.installing;
        worker?.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdateBanner();});
      });
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(updateRequested){location.reload();return;}
        if(hadController)showUpdateBanner();
      });
      await checkForUpdates(true);
    }catch(error){console.warn('Offline-Modus konnte nicht aktiviert werden:',error);}
  }
  async function requestPersistentStorage(){
    try{if(navigator.storage?.persist)await navigator.storage.persist();}catch{}
    updateStorageStatus();
  }
  function formatBytes(bytes){
    if(!Number.isFinite(bytes))return 'unbekannt';
    if(bytes<1024)return `${bytes} B`;
    if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KB`;
    return `${(bytes/1024/1024).toFixed(1)} MB`;
  }
  async function updateStorageStatus(){
    const element=$('#storageStatus');if(!element)return;
    if(!storageAvailable){element.textContent='Lokaler Speicher nicht verfügbar';return;}
    try{
      const estimate=await navigator.storage?.estimate?.(),persisted=await navigator.storage?.persisted?.();
      const usage=estimate?.usage;
      element.textContent=usage===undefined?`Lokale Speicherung aktiv${persisted?' · geschützt':''}`:`Speicher: ${formatBytes(usage)}${persisted?' · dauerhaft geschützt':''}`;
    }catch{element.textContent='Lokale Speicherung aktiv';}
  }

  if(!storageReadOnly)saveState();
  $('#datePicker').max=todayKey();
  setupEvents();switchTab(tabFromHash(),false);updateInstallButton();render();completeAppBoot();registerServiceWorker();updateStorageStatus();scheduleDayRollover();
  if(state.onboarded)requestPersistentStorage();
  if(startupWarning)setTimeout(()=>toast(startupWarning),300);
  if(!state.onboarded)setTimeout(showOnboarding,120);
})();
