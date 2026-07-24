'use strict';

(function(root){
  const VERSION='10.1.4-alpha';
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];

  function enhanceStructure(){
    const modal=$('#settingsCenterModal');
    const sheet=$('.settings-center-sheet',modal||document);
    if(!modal||!sheet||sheet.dataset.settingsUpgrade===VERSION)return false;
    sheet.dataset.settingsUpgrade=VERSION;

    const intro=$('.settings-center-intro',sheet);
    if(intro)intro.textContent='Backup, Datenschutz, Diagnose und Feedback übersichtlich an einem Ort.';

    const groups=$$('.settings-group',sheet);
    const dataGroup=groups.find(group=>group.querySelector('#exportData'));
    const qualityGroup=groups.find(group=>group.querySelector('#qualityMetricsEnabled'));
    const feedbackGroup=groups.find(group=>group.querySelector('#customerFeedbackSave'));

    if(dataGroup){
      dataGroup.dataset.settingsKind='data';
      const summary=$('summary',dataGroup);
      if(summary)summary.innerHTML='<span>Daten & Sicherheit</span><small>Backup, Wiederherstellung und Datenkontrolle</small>';
    }

    if(qualityGroup){
      qualityGroup.dataset.settingsKind='quality';
      const summary=$('summary',qualityGroup);
      if(summary)summary.innerHTML='<span>Diagnose & Qualität</span><small>freiwillige lokale Funktionszähler</small>';
      const card=$('.quality-card',qualityGroup);
      const toggleText=$('.quality-toggle small',qualityGroup);
      if(toggleText)toggleText.textContent='Erfasst nur Funktionsereignisse – keine Suchtexte, Körper- oder Gesundheitswerte.';
      if(card&&!$('.settings-quality-explainer',card)){
        const note=document.createElement('p');
        note.className='settings-quality-explainer';
        note.innerHTML='<strong>Wofür ist das?</strong> Diese lokalen Zähler helfen beim Erkennen von Fehlern, zum Beispiel ob eine Suche Treffer liefert oder ein Ablauf abgeschlossen wird. Es wird nichts automatisch übertragen.';
        const summaryText=$('#qualityMetricsSummary',card);
        card.insertBefore(note,summaryText||card.firstChild);
      }
    }

    if(feedbackGroup){
      feedbackGroup.dataset.settingsKind='feedback';
      const summary=$('summary',feedbackGroup);
      if(summary)summary.innerHTML='<span>Feedback</span><small>lokal speichern und bewusst exportieren</small>';
      const textarea=$('#customerFeedbackText',feedbackGroup);
      if(textarea&&!$('.feedback-counter',feedbackGroup)){
        const counter=document.createElement('small');
        counter.className='feedback-counter';
        textarea.insertAdjacentElement('afterend',counter);
        const update=()=>counter.textContent=`${textarea.value.length} / ${textarea.maxLength||600}`;
        textarea.addEventListener('input',update);
        update();
      }
    }

    const privacy=$('.coach-privacy,.profile-privacy',document);
    if(privacy&&!$('.settings-privacy-card',sheet)){
      const clone=privacy.cloneNode(true);
      clone.classList.add('settings-privacy-card');
      $('.settings-center-footer',sheet)?.insertAdjacentElement('beforebegin',clone);
      privacy.remove();
    }

    groups.forEach(group=>{
      group.removeAttribute('open');
      const summary=$('summary',group);
      summary?.setAttribute('role','button');
      summary?.setAttribute('aria-expanded','false');
      group.addEventListener('toggle',()=>{
        summary?.setAttribute('aria-expanded',String(group.open));
        if(!group.open)return;
        groups.forEach(other=>{if(other!==group&&other.open)other.open=false;});
        requestAnimationFrame(()=>{
          const top=group.getBoundingClientRect().top;
          if(top<90)group.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
        });
      });
    });

    const close=$('.sheet-head [data-close]',sheet);
    if(close){
      close.setAttribute('title','Einstellungen schließen');
      close.setAttribute('aria-label','Einstellungen schließen');
    }
    return true;
  }

  function enhanceFeedbackValidation(){
    const score=$('#customerFeedbackScore');
    const save=$('#customerFeedbackSave');
    if(!score||!save||save.dataset.validationBound)return;
    save.dataset.validationBound='1';
    const update=()=>{
      const valid=Boolean(score.value);
      save.disabled=!valid;
      save.setAttribute('aria-disabled',String(!valid));
      save.title=valid?'Feedback lokal speichern':'Bitte zuerst eine Bewertung auswählen';
    };
    score.addEventListener('change',update);
    update();
  }

  function bindModalLifecycle(){
    document.addEventListener('click',event=>{
      if(event.target.closest('#openSettingsCenter'))setTimeout(()=>{enhanceStructure();enhanceFeedbackValidation();},0);
      if(event.target.closest('#customerFeedbackSave'))setTimeout(enhanceFeedbackValidation,0);
    });
    root.addEventListener('cutcoach:module-enter',event=>{
      if(event.detail?.moduleId==='profile'){enhanceStructure();enhanceFeedbackValidation();}
    });
  }

  function boot(){enhanceStructure();enhanceFeedbackValidation();bindModalLifecycle();}
  root.CutCoachSettingsCenter1014=Object.freeze({version:VERSION,enhance:enhanceStructure});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
