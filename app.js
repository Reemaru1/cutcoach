'use strict';

function loadDependency(src){
  return new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=src;
    script.onload=resolve;
    script.onerror=()=>reject(new Error(`Konnte ${src} nicht laden`));
    document.head.appendChild(script);
  });
}

(async()=>{
  await loadDependency('./core.js');
  await loadDependency('./render.js');
  await loadDependency('./actions.js');

  function setupEvents(){
    $$('[data-tab]').forEach(button=>button.addEventListener('click',()=>{
      $$('[data-tab]').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      $$('.screen').forEach(screen=>screen.classList.remove('active'));
      $(`[data-screen="${button.dataset.tab}"]`)?.classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
    }));

    $$('[data-open]').forEach(button=>button.addEventListener('click',()=>{
      if(button.dataset.open==='mealModal') openMeal();
      else{
        if(button.dataset.open==='weightModal') $('#weightInput').value=day().weight??'';
        openModal(button.dataset.open);
      }
    }));

    $$('[data-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.closest('.modal'))));
    $$('.modal').forEach(modal=>modal.addEventListener('click',event=>{
      if(event.target===modal&&modal.id!=='onboardingModal') closeModal(modal);
    }));
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape') closeModal($('.modal.open:not(#onboardingModal)'));
    });

    $('#saveMeal').addEventListener('click',saveMeal);
    $('#saveWeight').addEventListener('click',()=>{
      const weight=nullable($('#weightInput').value,30,300);
      if(weight===null){toast('Bitte ein gültiges Gewicht eintragen.');return;}
      day().weight=weight; closeModal($('#weightModal')); render(); toast('Gewicht gespeichert.');
    });
    $('#saveSteps').addEventListener('click',()=>{
      const steps=parseNumber($('#stepsInput').value);
      if(steps===null||steps<0||steps>100000){toast('Bitte gültige Schritte eintragen.');return;}
      day().steps=Math.round(steps); render(); toast('Schritte gespeichert.');
    });
    $$('[data-gym]').forEach(button=>button.addEventListener('click',()=>{day().gym=button.dataset.gym==='true';render();}));
    $$('[data-alcohol]').forEach(button=>button.addEventListener('click',()=>{day().alcohol=button.dataset.alcohol==='true';render();}));

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
    $('#importData').addEventListener('change',event=>{
      importBackup(event.target.files?.[0]); event.target.value='';
    });
    $('#resetData').addEventListener('click',()=>{
      if(!confirm('Wirklich alle CutCoach-Daten auf diesem Gerät löschen?'))return;
      localStorage.removeItem(STORAGE_KEY); state=sanitizeState(DEFAULTS); selectedDate=todayKey();
      render(); openModal('onboardingModal');
    });

    $('#previousDay').addEventListener('click',()=>selectDate(shiftKey(selectedDate,-1)));
    $('#nextDay').addEventListener('click',()=>selectDate(shiftKey(selectedDate,1)));
    $('#todayButton').addEventListener('click',()=>selectDate(todayKey()));
    $('#datePicker').addEventListener('change',event=>selectDate(event.target.value));

    $('#installInfo').addEventListener('click',async()=>{
      if(deferredInstallPrompt){
        deferredInstallPrompt.prompt(); await deferredInstallPrompt.userChoice; deferredInstallPrompt=null; return;
      }
      const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
      if(installed)toast('CutCoach ist bereits installiert.');
      else alert('Auf dem iPhone in Safari: Teilen → Zum Home-Bildschirm → Hinzufügen. Danach CutCoach über das Symbol öffnen.');
    });
    window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();deferredInstallPrompt=event;});
    window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;updateInstallButton();toast('CutCoach wurde installiert.');});
    window.addEventListener('online',renderMeta);
    window.addEventListener('offline',renderMeta);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState!=='visible')return;
      const priorMax=$('#datePicker').max,newToday=todayKey(); $('#datePicker').max=newToday;
      if(selectedDate===priorMax)selectedDate=newToday; render();
    });
  }

  function updateInstallButton(){
    const installed=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
    $('#installInfo')?.classList.toggle('hidden',Boolean(installed));
  }

  async function registerServiceWorker(){
    if(!('serviceWorker'in navigator))return;
    try{
      const registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      registration.update().catch(()=>{});
      let reloading=false;
      navigator.serviceWorker.addEventListener('controllerchange',()=>{
        if(reloading||sessionStorage.getItem('cutcoach-sw-reloaded')===APP_VERSION)return;
        reloading=true; sessionStorage.setItem('cutcoach-sw-reloaded',APP_VERSION); location.reload();
      });
    }catch(error){console.warn('Offline-Modus konnte nicht aktiviert werden:',error);}
  }

  $('#datePicker').max=todayKey();
  setupEvents(); updateInstallButton(); render(); registerServiceWorker();
  if(!state.onboarded)setTimeout(()=>openModal('onboardingModal'),120);
})().catch(error=>{
  console.error(error);
  document.body.innerHTML='<main style="padding:24px;color:white;font-family:-apple-system,sans-serif"><h1>CutCoach konnte nicht gestartet werden</h1><p>Bitte die App vollständig schließen und erneut öffnen. Bleibt der Fehler bestehen, öffne die Website einmal in Safari.</p></main>';
});
