'use strict';

(function(root){
  const VERSION='8.0.1-alpha';
  const FEEDBACK_KEY='cutcoach_journal_feedback_v800';
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const ICONS=Object.freeze({
    score:'<svg viewBox="0 0 24 24"><path d="m12 3 7 6-7 12L5 9l7-6Z"/><path d="m5 9 7 3 7-3M12 12v9"/></svg>',
    streak:'<svg viewBox="0 0 24 24"><path d="M13.4 2.8c.5 3-1.3 4.5-2.6 6.1-1.2 1.5-1.5 3.1-.4 4.5.4-2 1.8-3.1 3.2-4.2 1.7 2 3 4.1 3 6.5 0 3-2 5.3-5 5.3s-5.4-2.2-5.4-5.4c0-3.6 2.4-6.2 7.2-12.8Z"/></svg>',
    meal:'<svg viewBox="0 0 24 24"><path d="M7 3v7M4 3v5a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 1.2 4 4.1 4 7h-4"/></svg>',
    target:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
    activity:'<svg viewBox="0 0 24 24"><path d="M8 20c-2-2.5-2-5.1-.3-7.6 1.2-1.8 1.7-3.4 1.3-5.2 3.4 2 4.3 4.4 3.5 7.2 1.6-1 2.6-2.4 3-4.3 3.1 3.2 3.2 7.4.5 9.9"/></svg>',
    protein:'<svg viewBox="0 0 24 24"><path d="M5 15v-3M8 17V9M16 17V9M19 15v-3M8 13h8M3 12h2M19 12h2"/></svg>',
    carbs:'<svg viewBox="0 0 24 24"><path d="M12 21V6M12 8C8 8 6 6 6 3c4 0 6 2 6 5ZM12 12c4 0 6-2 6-5-4 0-6 2-6 5ZM12 16c-4 0-6-2-6-5 4 0 6 2 6 5ZM12 20c4 0 6-2 6-5-4 0-6 2-6 5Z"/></svg>',
    fat:'<svg viewBox="0 0 24 24"><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/></svg>',
    breakfast:'<svg viewBox="0 0 24 24"><path d="M5 10h12v3a6 6 0 0 1-6 6 6 6 0 0 1-6-6v-3Z"/><path d="M17 11h1a3 3 0 0 1 0 6h-2M4 21h15M8 3c-1 2 1 3 0 5M12 3c-1 2 1 3 0 5"/></svg>',
    lunch:'<svg viewBox="0 0 24 24"><path d="M4 18h16M6 18a6 6 0 0 1 12 0M12 10V7M9 7h6"/><circle cx="12" cy="5" r="1"/></svg>',
    dinner:'<svg viewBox="0 0 24 24"><path d="M17 4a8 8 0 1 0 3 13 7 7 0 0 1-3-13Z"/></svg>',
    snack:'<svg viewBox="0 0 24 24"><path d="M12 8c-2-4-7-3-8 1-1 5 3 11 8 11s9-6 8-11c-1-4-6-5-8-1Z"/><path d="M12 8c0-3 2-5 5-5M12 5c-2 0-3-1-4-2"/></svg>',
    steps:'<svg viewBox="0 0 24 24"><path d="M8 12c-2.4 0-4 2-4 4.4C4 19 5.7 21 8 21s3.7-1.6 3.2-4.2C10.8 14.4 10 12 8 12ZM16 3c-2 0-2.8 2.4-3.2 4.8C12.3 10.4 13.7 12 16 12s4-2 4-4.4C20 5 18.4 3 16 3Z"/></svg>',
    water:'<svg viewBox="0 0 24 24"><path d="M12 2S5 10 5 15a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/><path d="M9 17c.8 1 1.8 1.5 3 1.5"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17l9-11"/></svg>',
    coach:'<svg viewBox="0 0 24 24"><path d="m12 3 1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5L12 3Z"/><path d="m19 16 .7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7L19 16Z"/></svg>',
    scale:'<svg viewBox="0 0 24 24"><path d="M5 20h14l1-14H4l1 14Z"/><path d="M9 10a3 3 0 0 1 6 0M12 10l2-2"/></svg>',
    training:'<svg viewBox="0 0 24 24"><path d="M5 9v6M8 7v10M16 7v10M19 9v6M8 12h8M3 12h2M19 12h2"/></svg>'
  });
  let rootObserver=null,headObserver=null,frame=0;

  function symbol(name,label=''){
    return `<span class="cc-symbol"${label?` role="img" aria-label="${label}"`:' aria-hidden="true"'}>${ICONS[name]||ICONS.target}</span>`;
  }
  function setIcon(node,name){
    if(!node||node.dataset.ccIcon===name)return;
    node.dataset.ccIcon=name;node.innerHTML=ICONS[name]||ICONS.target;node.classList.add('cc-symbol');node.setAttribute('aria-hidden','true');
  }
  function ensureStyleOrder(){
    const href='src/features/journal/dashboard-v800.css?v=8.0.1-alpha';
    let link=[...document.querySelectorAll('link[rel="stylesheet"]')].find(item=>(item.getAttribute('href')||'').includes('dashboard-v800.css'));
    if(!link){link=document.createElement('link');link.rel='stylesheet';link.href=href;link.dataset.dashboardV800='1';document.head.append(link);return}
    const styles=[...document.querySelectorAll('link[rel="stylesheet"]')];if(styles.at(-1)!==link)document.head.append(link);
  }
  function ensureStructure(host){
    if(!document.body.classList.contains('journal-v800'))document.body.classList.add('journal-v800');if(!host.classList.contains('journal-dashboard-v800'))host.classList.add('journal-dashboard-v800');
    const energy=$('.journal-energy-card',host),coach=$('.journal-coach-card',host),meals=$('.journal-meals-card',host);
    if(energy&&coach&&energy.nextElementSibling!==coach)energy.after(coach);
    let quick=$('.journal-quick-actions',host);
    if(!quick){
      quick=document.createElement('div');quick.className='journal-quick-actions';quick.setAttribute('role','group');quick.setAttribute('aria-label','Schnellzugriffe');
      quick.innerHTML=`<button type="button" data-journal-quick="meal">${symbol('meal')}<span>Mahlzeit</span></button><button type="button" data-journal-quick="water">${symbol('water')}<span>Wasser</span></button><button type="button" data-journal-quick="steps">${symbol('steps')}<span>Schritte</span></button><button type="button" data-journal-quick="check">${symbol('check')}<span>Tagescheck</span></button>`;
    }
    if(coach&&coach.nextElementSibling!==quick)coach.after(quick);
    if(quick&&meals&&quick.nextElementSibling!==meals)quick.after(meals);
    let balance=$('.journal-balance-grid',host);const steps=$('.journal-steps-card',host),water=$('.journal-water-card',host),check=$('.journal-check-card',host);
    if(!balance){balance=document.createElement('section');balance.className='journal-balance-grid';balance.setAttribute('aria-label','Bewegung und Regeneration')}
    if(meals&&meals.nextElementSibling!==balance)meals.after(balance);
    if(steps&&steps.parentElement!==balance)balance.append(steps);if(water&&water.parentElement!==balance)balance.append(water);
    if(balance&&check&&balance.nextElementSibling!==check)balance.after(check);
    if(check&&!$('.journal-check-intro',check))$('.journal-section-title',check)?.insertAdjacentHTML('afterend','<p class="journal-check-intro">Gewicht, Training und Alkohol bilden den Basischeck. Ernährung, Schritte und Wasser werden separat bewertet.</p>');
    const trainingArticle=$('[data-journal-gym]',check)?.closest('article');
    if(trainingArticle&&!$('.journal-training-details',trainingArticle))trainingArticle.insertAdjacentHTML('beforeend','<button type="button" class="journal-training-details" data-journal-training-details>Training protokollieren</button>');
    const activityCopy=$('.journal-energy-stats article:nth-child(3)>div',host);
    if(activityCopy&&!$('.journal-activity-note',activityCopy))activityCopy.insertAdjacentHTML('beforeend','<span class="journal-activity-note">Nicht verrechnet</span>');
    ensureFeedback(host,check);
  }
  function ensureFeedback(host,check){
    let card=$('.journal-feedback-card',host);if(card)return;
    card=document.createElement('section');card.className='journal-feedback-card';card.setAttribute('aria-live','polite');
    card.innerHTML='<div><strong>Hilft dir dieser Tagesüberblick?</strong><p>Ein Tipp genügt. Es werden keine Gesundheitswerte übertragen.</p></div><div class="journal-feedback-actions"><button type="button" data-journal-feedback="helpful">Ja</button><button type="button" data-journal-feedback="partial">Teilweise</button><button type="button" data-journal-feedback="unhelpful">Nein</button></div>';
    const saved=readFeedback();if(saved){card.classList.add('is-complete');card.firstElementChild.innerHTML='<strong>Danke für dein Feedback.</strong><p>Deine Bewertung bleibt als anonymer Zähler auf diesem Gerät.</p>'}
    check?.after(card);
  }
  function readFeedback(){try{return localStorage.getItem(FEEDBACK_KEY)||''}catch{return''}}
  function saveFeedback(value){const tracked=root.CutCoachInsights?.track('journal_feedback',{value})===true;if(tracked)try{localStorage.setItem(FEEDBACK_KEY,value)}catch{}return tracked}
  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
  function setClass(node,name,active){if(node&&node.classList.contains(name)!==active)node.classList.toggle(name,active)}
  function syncCopy(host){
    const summary=$('#journalMealSummary',host);if(summary)setText(summary,summary.textContent.replace(/Eintr(?:ag|äge)/,'Lebensmittel'));
    const weight=$('#journalWeight',host),check=$('#journalCheckStatus',host),gym=$('[data-journal-gym][aria-pressed="true"]',host),alcohol=$('[data-journal-alcohol][aria-pressed="true"]',host);
    if(check){const completed=[weight&&!/^\s*[–-]/.test(weight.textContent),Boolean(gym),Boolean(alcohol)].filter(Boolean).length;setText(check,`Basischeck ${completed}/3`);setClass(check,'complete',completed===3)}
    const trainingDetails=$('[data-journal-training-details]',host);if(trainingDetails){const trained=gym?.dataset.journalGym==='true';trainingDetails.hidden=!trained;trainingDetails.setAttribute('aria-hidden',String(!trained))}
    const activity=$('.journal-energy-stats article:nth-child(3)',host);if(activity){const value=$('#journalBurned',activity)?.textContent?.trim()||'';activity.setAttribute('aria-label',`Aktivität ${value}. Wird nicht vom festen Tagesziel abgezogen.`)}
    const weekday=$('#journalWeekday',host)?.textContent?.trim(),coachTitle=$('#journalCoachTitle',host),scoreText=$('#journalScoreLarge',host)?.textContent?.replace(',','.');
    if(weekday==='Heute'&&coachTitle&&/^(Dein nächster sinnvoller Schritt|Dein Tagesfokus)$/.test(coachTitle.textContent.trim())){const score=Number(scoreText);if(Number.isFinite(score))setText(coachTitle,score>=8?'Starker Tageskurs':score>=6?'Solider Kurs mit Potenzial':'Jetzt gezielt nachsteuern')}
    const toggle=$('#coachV74Toggle',host);if(toggle){const collapsed=$('.journal-coach-card',host)?.classList.contains('coach-v74-collapsed');setText(toggle,collapsed?'Analyse anzeigen':'Analyse ausblenden');toggle.setAttribute('aria-label',collapsed?'Coaching-Analyse anzeigen':'Coaching-Analyse ausblenden')}
  }
  function syncIcons(host){
    setIcon($('.journal-score-status .journal-status-icon',host),'score');setIcon($('.journal-streak-status .journal-status-icon',host),'streak');
    [['.journal-energy-stats article:nth-child(1) .stat-icon','meal'],['.journal-energy-stats article:nth-child(2) .stat-icon','target'],['.journal-energy-stats article:nth-child(3) .stat-icon','activity'],['.journal-macros article:nth-child(1) .journal-macro-title>span','protein'],['.journal-macros article:nth-child(2) .journal-macro-title>span','carbs'],['.journal-macros article:nth-child(3) .journal-macro-title>span','fat'],['.journal-meals-card .journal-section-title>div>span','meal'],['.journal-steps-card .journal-card-head>div>span','steps'],['.journal-water-card .journal-card-head>div>span','water'],['.journal-check-card .journal-section-title>div>span','check'],['.journal-coach-icon','coach'],['[data-coach-pillar="nutrition"]>span','meal'],['[data-coach-pillar="movement"]>span','steps'],['[data-coach-pillar="recovery"]>span','water']].forEach(([selector,name])=>setIcon($(selector,host),name));
    $('.journal-meal-row',host)?.parentElement?.querySelectorAll('.journal-meal-row').forEach(row=>{const type=$('[data-add-journal-meal]',row)?.dataset.addJournalMeal;setIcon($('.journal-meal-icon',row),type==='Frühstück'?'breakfast':type==='Mittagessen'?'lunch':type==='Abendessen'?'dinner':'snack')});
  }
  function scrollToNode(node){node?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})}
  function handleQuick(host,type){
    if(type==='meal'){const button=$('.meal-v74-current [data-add-journal-meal]',host)||$('[data-add-journal-meal]',host);button?.click();return}
    if(type==='water'){const card=$('.journal-water-card',host);scrollToNode(card);$('[data-journal-water="250"]',card)?.focus({preventScroll:true});return}
    if(type==='steps'){const card=$('.journal-steps-card',host),toggle=$('#journalStepToggle',card);scrollToNode(card);if(toggle?.getAttribute('aria-expanded')!=='true')toggle?.click();return}
    if(type==='check'){const card=$('.journal-check-card',host);scrollToNode(card);$('#journalWeightButton',card)?.focus({preventScroll:true})}
  }
  function bind(host){
    if(host.dataset.dashboardV800Bound)return;host.dataset.dashboardV800Bound='1';
    host.addEventListener('click',event=>{
      const quick=event.target.closest('[data-journal-quick]');if(quick){handleQuick(host,quick.dataset.journalQuick);return}
      const training=event.target.closest('[data-journal-training-details]');if(training){root.CutCoachBodyProgress220?.openWorkout?.(typeof selectedDate==='string'?selectedDate:undefined);return}
      const feedback=event.target.closest('[data-journal-feedback]');if(feedback){const value=feedback.dataset.journalFeedback,tracked=saveFeedback(value),card=feedback.closest('.journal-feedback-card');card.classList.add('is-complete');card.firstElementChild.innerHTML=tracked?'<strong>Danke für dein Feedback.</strong><p>Deine Bewertung bleibt als anonymer Zähler auf diesem Gerät.</p>':'<strong>Danke.</strong><p>Die lokale Qualitätsmessung ist deaktiviert; deine Auswahl wurde nicht gespeichert.</p>';return}
    });
  }
  function sync(){
    frame=0;ensureStyleOrder();const host=$('#today560');if(!host)return false;ensureStructure(host);syncIcons(host);syncCopy(host);bind(host);return true;
  }
  function queue(){if(!frame)frame=requestAnimationFrame(sync)}
  function observe(){
    if(!sync()){const bootstrap=new MutationObserver(()=>{if(sync()){bootstrap.disconnect();observe()}});bootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true});return}
    const host=$('#today560');rootObserver?.disconnect();rootObserver=new MutationObserver(queue);rootObserver.observe(host,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','aria-pressed']});
    headObserver?.disconnect();headObserver=new MutationObserver(queue);headObserver.observe(document.head,{childList:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observe,{once:true});else observe();
  root.CutCoachJournalDashboard800=Object.freeze({version:VERSION,refresh:sync,icons:ICONS});
})(window);
