'use strict';

(function(root){
  const VERSION='10.0.6-alpha';
  const $=selector=>document.querySelector(selector);
  const gear='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.12-1.28l2.02-1.56-2-3.46-2.48 1a7.2 7.2 0 0 0-2.22-1.28L13.85 3h-3.7L9.8 5.42A7.2 7.2 0 0 0 7.58 6.7l-2.48-1-2 3.46 2.02 1.56A7 7 0 0 0 5 12c0 .44.04.87.12 1.28L3.1 14.84l2 3.46 2.48-1a7.2 7.2 0 0 0 2.22 1.28l.35 2.42h3.7l.35-2.42a7.2 7.2 0 0 0 2.22-1.28l2.48 1 2-3.46-2.02-1.56c.08-.41.12-.84.12-1.28Z"/></svg>';
  const shield='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>';

  function apply(){
    const button=$('#openSettingsCenter');
    if(button&&button.dataset.profileFix!==VERSION){button.innerHTML=gear;button.dataset.profileFix=VERSION;}
    document.querySelectorAll('.coach-privacy').forEach(node=>node.remove());
    const sheet=$('#settingsCenterModal .settings-center-sheet');
    if(sheet&&!sheet.querySelector('.profile-settings-privacy-note')){
      const note=document.createElement('div');
      note.className='profile-settings-privacy-note';
      note.innerHTML=`${shield}<div><strong>Privat und lokal</strong><span>Profil- und Gesundheitsdaten bleiben ausschließlich auf diesem Gerät.</span></div>`;
      const footer=sheet.querySelector('.settings-center-footer');
      if(footer)sheet.insertBefore(note,footer);else sheet.append(note);
    }
  }
  function boot(){
    apply();
    root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='profile')setTimeout(apply,0)});
    document.addEventListener('click',event=>{if(event.target.closest('#openSettingsCenter'))setTimeout(apply,0)});
  }
  root.CutCoachProfile1006=Object.freeze({version:VERSION,apply});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
