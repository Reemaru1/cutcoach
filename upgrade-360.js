'use strict';
(function(){
  const VERSION='3.9.0';
  const baseRender=window.render;

  function activityModel(key=selectedDate){
    const data=day(key,false),settings=state.settings;
    const stepDelta=data.steps===null||settings.steps===0?0:data.steps-settings.steps;
    const stepAdjustment=data.steps===null?0:Math.round(clamp(stepDelta*.035,-200,350));
    const gymAdjustment=data.gym===true?180:0;
    return {stepAdjustment,gymAdjustment,totalAdjustment:stepAdjustment+gymAdjustment,adjustedMaintenance:settings.maintenance+stepAdjustment+gymAdjustment};
  }

  function fatBand(settings){return {min:settings.fat*.8,max:settings.fat*1.2};}
  function scoreLabel(score){
    if(score===null)return 'Noch offen';
    if(score>=8.5)return 'Sehr stark';
    if(score>=7)return 'Solider Tag';
    if(score>=5.5)return 'Ausbaufähig';
    return 'Heute nachsteuern';
  }

  window.completionStatus=function(){
    const t=totals(),data=day(selectedDate,false),items=[['Ernährung',t.calories>0],['Schritte',data.steps!==null||state.settings.steps===0],['Training',data.gym!==null],['Alkohol',data.alcohol!==null]];
    const done=items.filter(([,complete])=>complete).length;
    return {done,total:items.length,complete:done===items.length,missing:items.filter(([,complete])=>!complete).map(([name])=>name)};
  };

  window.dailyScore=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings;
    if(t.calories<=0)return null;
    const delta=t.calories-settings.calories,abs=Math.abs(delta);
    const calorieScore=abs<=150?3:abs<=300?2.5:abs<=500?1.7:delta<0?.7:.35;
    const proteinRatio=t.protein/Math.max(1,settings.protein);
    const proteinScore=proteinRatio>=.9?2:proteinRatio>=.75?1.5:proteinRatio>=.55?.9:.3;
    const band=fatBand(settings);
    const fatScore=t.fat>=band.min&&t.fat<=band.max?1:t.fat>=settings.fat*.6&&t.fat<=settings.fat*1.4?.6:.2;
    const stepScore=settings.steps===0?1.5:data.steps===null?0:clamp(data.steps/settings.steps,0,1)*1.5;
    const gymLast7=range(selectedDate,7).filter(item=>item.data.gym===true).length;
    const gymScore=data.gym===true?1.25:data.gym===false?(gymLast7>=settings.gymGoal?1.25:1):0;
    const alcoholScore=data.alcohol===false?.75:0;
    const tracking=[data.steps!==null||settings.steps===0,data.gym!==null,data.alcohol!==null].filter(Boolean).length/3*.5;
    return Math.round(clamp(calorieScore+proteinScore+fatScore+stepScore+gymScore+alcoholScore+tracking,0,10)*10)/10;
  };

  function dayStatus(t,settings,effective){
    const proteinGap=Math.max(0,settings.protein-t.protein),band=fatBand(settings);
    if(t.calories===0)return {text:'📝 Tag starten',tone:'neutral'};
    if(effective>1000)return {text:'⚠️ Defizit zu groß',tone:'warn'};
    if(t.calories>settings.calories+300)return {text:'⚠️ Über Kalorienziel',tone:'warn'};
    if(proteinGap>30)return {text:'💪 Protein priorisieren',tone:'focus'};
    if(t.fat>band.max)return {text:'🥑 Fett im Blick',tone:'focus'};
    return {text:'🔥 Kurs halten',tone:'good'};
  }

  function focusLine(t,settings,effective){
    const proteinGap=Math.max(0,settings.protein-t.protein),remaining=settings.calories-t.calories,band=fatBand(settings);
    if(effective>1000&&proteinGap>20)return `🎯 Proteinreich essen und Defizit nicht weiter vergrößern`;
    if(effective>1000)return '🎯 Heute ausreichend essen – Defizit nicht weiter vergrößern';
    if(proteinGap>20&&remaining>150)return `🎯 Noch etwa ${fmt(proteinGap)} g Eiweiß einplanen`;
    if(t.calories>settings.calories+300)return '🎯 Heute nur noch kalorienfreie Getränke';
    if(t.fat>band.max)return '🎯 Nächste Mahlzeit fettarm und eiweißreich';
    if(remaining>400)return `🎯 Noch rund ${fmt(remaining)} kcal sinnvoll verteilen`;
    return '🎯 Kurs halten';
  }

  window.feedback=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings,activity=activityModel(),effective=activity.adjustedMaintenance-t.calories;
    if(!t.calories)return '🎯 Erste Mahlzeit eintragen\nℹ️ Aktivität später ergänzen';
    const lines=[focusLine(t,settings,effective)];
    const activityParts=[];
    if(data.steps!==null&&data.steps>=settings.steps)activityParts.push('Schritte');
    if(data.gym===true)activityParts.push('Training');
    if(activityParts.length)lines.push(`✅ Aktiv: ${activityParts.join(' + ')}`);
    else if(data.steps===null||data.gym===null)lines.push('ℹ️ Aktivität noch unvollständig');
    else lines.push('ℹ️ Ruhetag dokumentiert');
    if(data.alcohol===true)lines.push('⚠️ Regeneration durch Alkohol reduziert');
    else if(data.alcohol===false)lines.push('✅ Regeneration: alkoholfrei');
    return lines.slice(0,3).join('\n');
  };

  function ensureInfoModal(){
    if(document.querySelector('#coachInfoModal'))return;
    document.body.insertAdjacentHTML('beforeend','<div class="modal" id="coachInfoModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="coachInfoTitle"><div class="sheet coach-info-sheet"><div class="sheet-head"><h2 id="coachInfoTitle">Info</h2><button id="coachInfoClose" type="button" aria-label="Schließen">×</button></div><p id="coachInfoText"></p></div></div>');
    const modal=document.querySelector('#coachInfoModal'),close=()=>closeModal(modal);
    document.querySelector('#coachInfoClose').onclick=close;
    modal.onclick=event=>{if(event.target===modal)close();};
  }

  function showInfo(title,text){ensureInfoModal();setText('#coachInfoTitle',title);setText('#coachInfoText',text);openModal('coachInfoModal');}
  function addInfoButton(card,title,text){
    if(!card)return;
    const label=card.querySelector(':scope > label');
    if(!label||label.querySelector('.coach-info-button'))return;
    const button=document.createElement('button');
    button.type='button';button.className='coach-info-button';button.setAttribute('aria-label',`${title} erklären`);button.textContent='i';
    button.onclick=event=>{event.preventDefault();event.stopPropagation();showInfo(title,text);};
    label.append(button);
  }

  function ensureUi(){
    const brandTitle=document.querySelector('.brand h1');if(brandTitle)brandTitle.textContent='Heute';
    document.querySelectorAll('.coach-helper').forEach(node=>node.remove());
    const cards={fat:document.querySelector('.macros .card:nth-child(3)'),weight:document.querySelector('.macros .card:nth-child(4)'),steps:document.querySelector('.steps-card'),gym:document.querySelector('.checks .card:nth-child(1)'),alcohol:document.querySelector('.checks .card:nth-child(2)')};
    addInfoButton(cards.fat,'Fett','Fett ist ein Zielbereich, keine harte Obergrenze. Es unterstützt Sättigung, Hormone und die Aufnahme fettlöslicher Vitamine.');
    addInfoButton(cards.weight,'Gewichtstrend','Tägliches Wiegen ist freiwillig. Mehrere Morgenmessungen pro Woche ergeben einen aussagekräftigeren Trend als ein einzelner Wert.');
    addInfoButton(cards.steps,'Schritte','CutCoach berücksichtigt nur die Abweichung von deinem Schrittziel. So wird Bewegung nicht doppelt in der Energiebilanz gezählt.');
    addInfoButton(cards.gym,'Training','Krafttraining unterstützt Muskelerhalt und Wochenziel. Der Energieaufschlag ist bewusst konservativ geschätzt.');
    addInfoButton(cards.alcohol,'Alkohol','Alkohol verändert dein Kalorienziel nicht automatisch, wirkt sich aber negativ auf Regeneration und Tagesnote aus.');
    if(cards.steps&&!document.querySelector('#activityImpact')){const impact=document.createElement('div');impact.id='activityImpact';impact.className='activity-impact';cards.steps.append(impact);}
    ensureInfoModal();
  }

  function renderEnhancements(){
    ensureUi();
    const settings=state.settings,data=day(selectedDate,false),t=totals(),activity=activityModel(),score=dailyScore(),status=completionStatus();
    const effective=activity.adjustedMaintenance-t.calories,band=fatBand(settings),version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
    const latest=weightEntries(selectedDate).at(-1);setText('#todayWeight',latest?fmt(latest[1].weight,1):'–');
    const weightLabel=document.querySelector('.macros .card:nth-child(4)>label');
    if(weightLabel){const nodes=weightLabel.querySelectorAll('span');if(nodes[0])nodes[0].textContent='⚖️ Gewichtstrend';if(nodes[1])nodes[1].textContent=latest?`zuletzt ${dateFromKey(latest[0]).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}`:'optional';}
    const weightButton=document.querySelector('.macros .card:nth-child(4) button.secondary');if(weightButton)weightButton.textContent=data.weight===null?'Heute messen':'Messung ändern';
    const proteinLabel=document.querySelector('.macros .card:nth-child(1)>label span');if(proteinLabel)proteinLabel.textContent=`Ziel ${fmt(settings.protein)} g`;
    const carbsLabel=document.querySelector('.macros .card:nth-child(2)>label span');if(carbsLabel)carbsLabel.textContent='Richtwert';
    const fatLabel=document.querySelector('.macros .card:nth-child(3)>label span');if(fatLabel)fatLabel.textContent=`${fmt(band.min)}–${fmt(band.max)} g`;
    const fatStatus=document.querySelector('#fatRemaining');if(fatStatus){if(t.fat<band.min)fatStatus.textContent=`${fmt(band.min-t.fat)} g fehlen`;else if(t.fat>band.max)fatStatus.textContent=`${fmt(t.fat-band.max)} g drüber`;else fatStatus.textContent='im Bereich';}
    const heroStatus=dayStatus(t,settings,effective),badge=document.querySelector('.badge');
    if(badge){badge.textContent=heroStatus.text;badge.dataset.tone=heroStatus.tone;}
    setText('#scoreCaption',score===null?'offen':status.complete?scoreLabel(score):'vorläufig');
    setText('#energyBalanceLabel',effective>=0?'Defizit inkl. Aktivität*':'Überschuss inkl. Aktivität*');setText('#deficit',t.calories?fmt(Math.abs(effective)):'–');
    const compact=[];
    if(data.steps!==null&&activity.stepAdjustment!==0)compact.push(`Schritte ${activity.stepAdjustment>0?'+':''}${fmt(activity.stepAdjustment)} kcal`);
    if(data.gym===true)compact.push(`Training +${fmt(activity.gymAdjustment)} kcal`);
    if(!compact.length)compact.push(data.steps===null?'Aktivität noch offen':'Aktivität neutral');
    setText('#activityImpact',compact.join(' · '));
    const stepBar=document.querySelector('#stepsBar');if(stepBar){stepBar.classList.remove('over');stepBar.classList.toggle('goal-reached',data.steps!==null&&data.steps>=settings.steps);}
    const completion=document.querySelector('#completionText');if(completion)completion.textContent=status.complete?'Tagescheck vollständig.':`${status.done}/${status.total} Angaben · offen: ${status.missing.join(', ')}`;
    const summary=document.querySelector('.summary');if(summary){summary.classList.toggle('large-deficit',t.calories>0&&effective>1000);summary.classList.toggle('surplus',t.calories>0&&effective<0);}
    const saveSteps=document.querySelector('#saveSteps');if(saveSteps)saveSteps.disabled=String(data.steps??'')===String(document.querySelector('#stepsInput')?.value??'');
  }

  window.render=function(){baseRender();renderEnhancements();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();window.render();},{once:true});else{ensureUi();window.render();}
})();