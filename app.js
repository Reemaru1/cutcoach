'use strict';

(function(){
  let knownToday=todayKey();

  function setupEvents(){
    $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
      $$('[data-tab]').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      $$('.screen').forEach(screen=>screen.classList.remove('active'));
      $(`[data-screen="${button.dataset.tab}"]`)?.classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
    }));
    $$('[data-open]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.open==='mealModal')openMeal();
      else{
        if(button.dataset.open==='weightModal'){
          const data=day(selectedDate,false); $('#weightInput').value=data.weight??'';
          $('#clearWeight').hidden=data.weight===null;
        }
        openModal(button.dataset.open);
      }
    }));
    $$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.closest('.modal'))));
    $$('.modal').forEach(modal=>modal.addEventListener('click',event=>{
      if(event.target===modal&&modal.id!=='onboardingModal')closeModal(modal);
    }));
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape')closeModal($('.modal.open:not(#onboardingModal)'));
    });
    $('#mealModal').addEventListener('keydown',event=>{
      if(event.key==='Enter'&&event.target.matches('input')&&!event.isComposing){event.preventDefault();saveMeal();}
    });
    $('#weightModal').addEventListener('keydown',event=>{
      if(event.key==='Enter'&&event.target.matches('input')&&!event.isComposing){event.preventDefault();$('#saveWeight').click();}
    });

    $('#saveMeal').addEventListener('click',saveMeal);
    $('#saveWeight').addEventListener('click',()=>{
      const weight=nullable($('#weightInput').value,30,300);
      if(weight===null){toast('Bitte ein gültiges Gewicht eintragen.');return;}
      day().weight=weight; closeModal($('#weightModal')); render(); toast('Gewicht gespeichert.');
    });
    $('#clearWeight').addEventListener('click',clearWeight);
    $('#saveSteps').addEventListener('click',()=>{
      const steps=nullable($('#stepsInput').value,0,100000,true);
      if(steps===null){toast('Bitte gültige Schritte eintragen.');return;}
      day().steps=steps; render(); toast('Schritte gespeichert.');
    });
    $('#clearSteps').addEventListener('click',clearSteps);
    $$('[data-gym]').forEach(button=>button.addEventListener('click',()=>{
      const value=button.dataset.gym==='true',data=day(); data.gym=data.gym===value?null:value; pruneDay(); render();
    }));
    $$('[data-alcohol]').forEach(button=>button.addEventListener('click',()=>{
      const value=button.dataset.alcohol==='true',data=day(); data.alcohol=data.alcohol===value?null:value; pruneDay(); render();
    }));

    $('#saveSettings').addEventListener('click',saveSettings);
    $('#startApp').addEventListener('click',async()=>{
      const weight=nullable($('#startWeight').value,30,300);
      const goal=$('#startGoal').value===''?null:nullable($('#startGoal').value,30,300);
      if(weight===null){toast('Bitte dein Startgewicht eintragen.');return;}
      if($('#startGoal').value!==''&&goal===null){toast('Bitte ein gültiges Wunschgewicht eintragen.');return;}
      day(todayKey()).weight=weight; state.settings.goalWeight=goal; state.onboarded=true;
      closeModal($('#onboardingModal')); render();
      try{await navigator.storage?.persist?.();}catch{}
      toast('CutCoach ist gestartet.');
    });
    $('#exportData').addEventListener('click',exportBackup);
    $('#importData').addEventListener('change',event=>{importBackup(event.target.files?.[0]);event.target.value='';});
    $('#resetData').addEventListener('click',()=>{
      if(!confirm('Wirklich alle CutCoach-Daten auf diesem Gerät löschen?'))return;
      localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(RECOVERY_KEY);
      state=sanitizeState(DEFAULTS); lastSavedSnapshot=''; selectedDate=todayKey(); render(); openModal('onboardingModal');
    });

    $('#previousDay').addEventListener('click',()=>selectDate(shiftKey(selectedDate,-1)));
    $('#nextDay').addEventListener('click',()=>selectDate(shiftKey(selectedDate,1)));
    $('#todayButton').addEventListener('click',()=>selectDate(todayKey()));
    $('#datePicker').addEventListener('change',event=>selectDate(event.target.value));
    $('#installInfo').addEventListener('click',installApp);
    $('#reloadUpdate').addEventListener('click',()=>location.reload());

    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;});
    window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallButton();toast('CutCoach wurde installiert.');});
    window.addEventListener('online',renderMeta); window.addEventListener('offline',renderMeta);
    window.addEventListener('storage',event=>{
      if(event.key!==STORAGE_KEY||!event.newValue)return;
      try{state=sanitizeState(JSON.parse(event.newValue));lastSavedSnapshot=event.newValue;render();toast('Daten aus einem anderen Fenster übernommen.');}catch{}
    });
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState!=='visible')return;
      const currentToday=todayKey(); $('#datePicker').max=currentToday;
      if(selectedDate===knownToday)selectedDate=currentToday;
      knownToday=currentToday; render();
    });
  }

  async function installApp(){
    if(deferredInstallPrompt){
      deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; return;
    }
    const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    if(installed)toast('CutCoach ist bereits installiert.');
    else alert('Auf dem iPhone in Safari: Teilen → Zum Home-Bildschirm → Hinzufügen. Danach CutCoach über das Symbol öffnen.');
  }
  function updateInstallButton(){
    const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    $('#installInfo')?.classList.toggle('hidden',Boolean(installed));
  }
  function showUpdateBanner(){ $('#updateBanner')?.classList.add('show'); }
  async function registerServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      registration.update().catch(()=>{});
      if(registration.waiting)showUpdateBanner();
      registration.addEventListener('updatefound',()=>{
        const worker=registration.installing;
        worker?.addEventListener('statechange',()=>{
          if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdateBanner();
        });
      });
      navigator.serviceWorker.addEventListener('controllerchange',showUpdateBanner);
    }catch(error){console.warn('Offline-Modus konnte nicht aktiviert werden:',error);}
  }

  $('#datePicker').max=todayKey();
  setupEvents(); updateInstallButton(); render(); registerServiceWorker();
  if(startupWarning)setTimeout(()=>toast(startupWarning),300);
  if(!state.onboarded)setTimeout(()=>openModal('onboardingModal'),120);
})();
