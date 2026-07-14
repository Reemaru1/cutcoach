'use strict';
(function(){
  const VERSION='4.2.0';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_TARGET=3000;
  const WATER_MAX=6000;
  const baseRender=window.render;
  let lastWaterAction=0;

  function readWater(){try{const value=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return {}}}
  function waterFor(key=selectedDate){return clamp(Number(readWater()[key]||0),0,WATER_MAX)}
  function waterPaceTarget(key=selectedDate){
    if(key!==todayKey())return key<todayKey()?WATER_TARGET:0;
    const now=new Date(),hours=now.getHours()+now.getMinutes()/60;
    return Math.round(clamp((hours-7)/15,.08,1)*WATER_TARGET/250)*250;
  }
  function hydrationState(key=selectedDate){
    const amount=waterFor(key),pace=waterPaceTarget(key),goalRatio=clamp(amount/WATER_TARGET,0,1);
    return {amount,pace,goalRatio,behind:Math.max(0,pace-amount),goalReached:amount>=WATER_TARGET,onPace:amount>=pace};
  }
  function setWater(value,key=selectedDate){
    const now=Date.now();if(now-lastWaterAction<180)return;lastWaterAction=now;
    const requested=Math.round(Number(value)||0),amount=Math.round(clamp(requested,0,WATER_MAX)),all=readWater();
    if(requested>WATER_MAX)toast('Maximal 6.000 ml pro Tag eintragbar.');
    if(amount)all[key]=amount;else delete all[key];
    try{localStorage.setItem(WATER_KEY,JSON.stringify(all));navigator.vibrate?.(12)}catch{toast('Wasser konnte nicht gespeichert werden.');}
    window.render();
  }
  function activityModel(key=selectedDate){
    const data=day(key,false),settings=state.settings;
    const stepDelta=data.steps===null||settings.steps===0?0:data.steps-settings.steps;
    const stepAdjustment=data.steps===null?0:Math.round(clamp(stepDelta*.035,-200,350));
    const gymAdjustment=data.gym===true?180:0;
    return {stepAdjustment,gymAdjustment,totalAdjustment:stepAdjustment+gymAdjustment,adjustedMaintenance:settings.maintenance+stepAdjustment+gymAdjustment};
  }
  function fatBand(settings){return {min:settings.fat*.8,max:settings.fat*1.2};}
  function scoreLabel(score){if(score===null)return 'Noch offen';if(score>=8.5)return 'Sehr stark';if(score>=7)return 'Solider Tag';if(score>=5.5)return 'Ausbaufähig';return 'Heute nachsteuern';}
  function relativeDayLabel(key){const today=todayKey(),yesterday=shiftKey(today,-1);if(key===today)return 'Heute';if(key===yesterday)return 'Gestern';return dateFromKey(key).toLocaleDateString('de-DE',{weekday:'long',day:'2-digit',month:'2-digit'});}

  window.completionStatus=function(){
    const t=totals(),data=day(selectedDate,false),hydration=hydrationState();
    const waterComplete=selectedDate===todayKey()?hydration.amount>=hydration.pace:hydration.goalReached;
    const items=[['Ernährung',t.calories>0],['Schritte',data.steps!==null||state.settings.steps===0],['Wasser',waterComplete],['Training',data.gym!==null],['Alkohol',data.alcohol!==null]];
    const done=items.filter(([,complete])=>complete).length;
    return {done,total:items.length,complete:done===items.length,missing:items.filter(([,complete])=>!complete).map(([name])=>name)};
  };
  window.dailyScore=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings;if(t.calories<=0)return null;
    const delta=t.calories-settings.calories,abs=Math.abs(delta),proteinRatio=t.protein/Math.max(1,settings.protein),band=fatBand(settings),hydration=hydrationState();
    const calorieScore=abs<=150?3:abs<=300?2.5:abs<=500?1.7:delta<0?.7:.35;
    const proteinScore=proteinRatio>=.9?2:proteinRatio>=.75?1.5:proteinRatio>=.55?.9:.3;
    const fatScore=t.fat>=band.min&&t.fat<=band.max?1:t.fat>=settings.fat*.6&&t.fat<=settings.fat*1.4?.6:.2;
    const stepScore=settings.steps===0?1.5:data.steps===null?0:clamp(data.steps/settings.steps,0,1)*1.5;
    const gymLast7=range(selectedDate,7).filter(item=>item.data.gym===true).length;
    const gymScore=data.gym===true?1.25:data.gym===false?(gymLast7>=settings.gymGoal?1.25:1):0;
    const alcoholScore=data.alcohol===false?.75:0;
    const hydrationReference=Math.max(250,selectedDate===todayKey()?hydration.pace:WATER_TARGET);
    const waterScore=clamp(hydration.amount/hydrationReference,0,1)*.5;
    const tracking=[data.steps!==null||settings.steps===0,data.gym!==null,data.alcohol!==null,hydration.amount>0].filter(Boolean).length/4*.25;
    return Math.round(clamp(calorieScore+proteinScore+fatScore+stepScore+gymScore+alcoholScore+waterScore+tracking,0,10)*10)/10;
  };
  function dayStatus(t,settings,effective){
    const proteinGap=Math.max(0,settings.protein-t.protein),band=fatBand(settings),hydration=hydrationState();
    if(t.calories===0)return {text:'📝 Tag starten',tone:'neutral'};
    if(effective>1000)return {text:'⚠️ Defizit zu groß',tone:'warn'};
    if(t.calories>settings.calories+300)return {text:'⚠️ Über Kalorienziel',tone:'warn'};
    if(proteinGap>30)return {text:'💪 Protein priorisieren',tone:'focus'};
    if(hydration.behind>=500)return {text:'💧 Trinkplan aufholen',tone:'focus'};
    if(t.fat>band.max)return {text:'🥑 Fett im Blick',tone:'focus'};
    return {text:'🔥 Kurs halten',tone:'good'};
  }
  function focusLine(t,settings,effective){
    const proteinGap=Math.max(0,settings.protein-t.protein),remaining=settings.calories-t.calories,band=fatBand(settings),hydration=hydrationState();
    if(effective>1000&&proteinGap>20)return '🎯 Proteinreich essen und Defizit nicht weiter vergrößern';
    if(effective>1000)return '🎯 Heute ausreichend essen – Defizit nicht weiter vergrößern';
    if(t.calories>settings.calories+300)return '🎯 Heute nur noch kalorienfreie Getränke';
    if(proteinGap>20&&remaining>150)return `🎯 Noch etwa ${fmt(proteinGap)} g Eiweiß einplanen`;
    if(hydration.behind>=500)return `🎯 Trinkplan: noch ${fmt(hydration.behind)} ml bis zum aktuellen Soll`;
    if(t.fat>band.max)return '🎯 Nächste Mahlzeit fettarm und eiweißreich';
    if(remaining>400)return `🎯 Noch rund ${fmt(remaining)} kcal sinnvoll verteilen`;
    return '🎯 Kurs halten';
  }
  window.feedback=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings,activity=activityModel(),effective=activity.adjustedMaintenance-t.calories,hydration=hydrationState();
    if(!t.calories)return hydration.amount?'🎯 Erste Mahlzeit eintragen\n💧 Trinkplan läuft':'🎯 Erste Mahlzeit eintragen\n💧 Mit dem ersten Glas starten';
    const lines=[focusLine(t,settings,effective)],activityParts=[];
    if(data.steps!==null&&data.steps>=settings.steps)activityParts.push('Schritte');if(data.gym===true)activityParts.push('Training');
    if(activityParts.length)lines.push(`✅ Aktiv: ${activityParts.join(' + ')}`);else if(data.steps===null||data.gym===null)lines.push('ℹ️ Aktivität noch unvollständig');else lines.push('ℹ️ Ruhetag dokumentiert');
    if(data.alcohol===true)lines.push('⚠️ Alkohol reduziert die Regeneration');
    else if(hydration.goalReached&&data.alcohol===false)lines.push('✅ Hydration erreicht · alkoholfrei');
    else if(hydration.onPace)lines.push(data.alcohol===false?'✅ Trinkplan im Soll · alkoholfrei':'✅ Trinkplan im Soll');
    else if(data.alcohol===false)lines.push('✅ Regeneration: alkoholfrei');
    return lines.slice(0,3).join('\n');
  };

  function ensureInfoModal(){if(document.querySelector('#coachInfoModal'))return;document.body.insertAdjacentHTML('beforeend','<div class="modal" id="coachInfoModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="coachInfoTitle"><div class="sheet coach-info-sheet"><div class="sheet-head"><h2 id="coachInfoTitle">Info</h2><button id="coachInfoClose" type="button" aria-label="Schließen">×</button></div><p id="coachInfoText"></p></div></div>');const modal=document.querySelector('#coachInfoModal'),close=()=>closeModal(modal);document.querySelector('#coachInfoClose').onclick=close;modal.onclick=event=>{if(event.target===modal)close();};}
  function showInfo(title,text){ensureInfoModal();setText('#coachInfoTitle',title);setText('#coachInfoText',text);openModal('coachInfoModal');}
  function addInfoButton(card,title,text){if(!card)return;const label=card.querySelector(':scope > label');if(!label)return;let button=label.querySelector('.coach-info-button');if(!button){button=document.createElement('button');button.type='button';button.className='coach-info-button';button.textContent='i';label.append(button);}button.setAttribute('aria-label',`${title} erklären`);button.onclick=event=>{event.preventDefault();event.stopPropagation();showInfo(title,text);};}
  function syncStepSaveState(){const input=document.querySelector('#stepsInput'),button=document.querySelector('#saveSteps');if(!input||!button)return;button.disabled=String(day(selectedDate,false).steps??'')===String(input.value??'');}
  function preventDoubleTapZoom(){if(document.documentElement.dataset.noDoubleTap)return;document.documentElement.dataset.noDoubleTap='1';let lastTouch=0;document.addEventListener('touchend',event=>{const now=Date.now();if(now-lastTouch<300&&!event.target.closest('input,textarea,select'))event.preventDefault();lastTouch=now;},{passive:false});document.addEventListener('gesturestart',event=>event.preventDefault(),{passive:false});}
  function normalizeWeightLabel(card,latest){const label=card?.querySelector(':scope > label');if(!label)return;label.replaceChildren();const title=document.createElement('span');title.className='card-title';title.textContent='⚖️ Gewicht';const meta=document.createElement('span');meta.className='card-meta';meta.textContent=latest?`zuletzt ${dateFromKey(latest[0]).toLocaleDateString('de-DE',{day:'2-digit',month:'2-digit'})}`:'optional';label.append(title,meta);addInfoButton(card,'Gewichtstrend','Tägliches Wiegen ist freiwillig. Mehrere Morgenmessungen pro Woche ergeben einen aussagekräftigeren Trend als ein einzelner Wert.');}
  function normalizeCarbsLabel(){const label=document.querySelector('.macros .card:nth-child(2)>label');if(!label)return;label.replaceChildren();const title=document.createElement('span');title.className='card-title';title.textContent='🍚 Kohlenhydrate';const meta=document.createElement('span');meta.className='card-meta';meta.textContent='Richtwert';label.append(title,meta);}
  function ensureWaterCard(){
    if(document.querySelector('#waterCard'))return;
    const steps=document.querySelector('.steps-card');if(!steps)return;
    steps.insertAdjacentHTML('afterend','<section class="card water-card" id="waterCard"><label><span class="card-title">💧 Wasser</span><span class="card-meta" id="waterTargetLabel">Ziel 3,0 l</span></label><div class="water-layout"><div class="water-orb" aria-hidden="true"><div class="water-fill" id="waterFill"></div><div class="water-value"><strong id="waterAmount">0</strong><small>ml</small></div></div><div class="water-controls"><div class="water-quick"><button type="button" data-water-add="250">+250 ml</button><button type="button" data-water-add="500">+500 ml</button></div><button type="button" class="water-undo" id="waterUndo">−250 ml</button><p id="waterHint" aria-live="polite">Starte mit dem ersten Glas.</p></div></div><div class="water-drops" id="waterDrops" aria-label="Wasserfortschritt"></div></section>');
    const card=document.querySelector('#waterCard');addInfoButton(card,'Wasser','Das Tagesziel liegt bei 3 Litern. Der aktuelle Trinkplan berücksichtigt bei heute auch die Tageszeit, damit morgens nicht schon das volle Tagesziel verlangt wird.');
    card.querySelectorAll('[data-water-add]').forEach(button=>button.onclick=()=>setWater(waterFor()+Number(button.dataset.waterAdd)));
    document.querySelector('#waterUndo').onclick=()=>setWater(waterFor()-250);
  }
  function renderWater(){
    const hydration=hydrationState(),fill=document.querySelector('#waterFill');
    setText('#waterAmount',fmt(hydration.amount));if(fill)fill.style.height=`${Math.max(hydration.amount?8:0,hydration.goalRatio*100)}%`;
    let hint='Starte mit dem ersten Glas.';
    if(hydration.goalReached)hint='Tagesziel erreicht – stark!';
    else if(hydration.amount>WATER_TARGET)hint=`${fmt(hydration.amount-WATER_TARGET)} ml über Tagesziel`;
    else if(hydration.onPace)hint=`Im Trinkplan · noch ${fmt(WATER_TARGET-hydration.amount)} ml bis Tagesziel`;
    else if(hydration.amount>0)hint=`Noch ${fmt(hydration.behind)} ml bis zum aktuellen Soll`;
    setText('#waterHint',hint);setText('#waterTargetLabel',selectedDate===todayKey()&&hydration.pace<WATER_TARGET?`Jetzt ${fmt(hydration.pace)} ml · Ziel 3,0 l`:'Ziel 3,0 l');
    const undo=document.querySelector('#waterUndo');if(undo)undo.disabled=hydration.amount===0;
    const drops=document.querySelector('#waterDrops');if(drops){drops.replaceChildren();for(let i=1;i<=6;i++){const dot=document.createElement('span');dot.className=i<=Math.ceil(hydration.goalRatio*6)?'filled':'';dot.textContent='💧';drops.append(dot);}}
    const card=document.querySelector('#waterCard');if(card){card.classList.toggle('goal-reached',hydration.goalReached);card.classList.toggle('on-pace',hydration.onPace&&!hydration.goalReached);card.classList.toggle('behind-pace',hydration.behind>=500);}
  }
  function ensureUi(){
    document.querySelectorAll('.coach-helper').forEach(node=>node.remove());
    const cards={fat:document.querySelector('.macros .card:nth-child(3)'),weight:document.querySelector('.macros .card:nth-child(4)'),steps:document.querySelector('.steps-card'),gym:document.querySelector('.checks .card:nth-child(1)'),alcohol:document.querySelector('.checks .card:nth-child(2)')};
    addInfoButton(cards.fat,'Fett','Fett ist ein Zielbereich, keine harte Obergrenze. Es unterstützt Sättigung, Hormone und die Aufnahme fettlöslicher Vitamine.');addInfoButton(cards.steps,'Schritte','CutCoach berücksichtigt nur die Abweichung von deinem Schrittziel. So wird Bewegung nicht doppelt in der Energiebilanz gezählt.');addInfoButton(cards.gym,'Training','Krafttraining unterstützt Muskelerhalt und Wochenziel. Der Energieaufschlag ist bewusst konservativ geschätzt.');addInfoButton(cards.alcohol,'Alkohol','Alkohol verändert dein Kalorienziel nicht automatisch, wirkt sich aber negativ auf Regeneration und Tagesnote aus.');
    if(cards.steps&&!document.querySelector('#activityImpact')){const impact=document.createElement('div');impact.id='activityImpact';impact.className='activity-impact';cards.steps.append(impact);}
    const stepsInput=document.querySelector('#stepsInput');if(stepsInput&&!stepsInput.dataset.coachBound){stepsInput.dataset.coachBound='1';stepsInput.addEventListener('input',syncStepSaveState);}
    ensureWaterCard();ensureInfoModal();preventDoubleTapZoom();
  }
  function renderEnhancements(){
    ensureUi();
    const settings=state.settings,data=day(selectedDate,false),t=totals(),activity=activityModel(),score=dailyScore(),status=completionStatus(),effective=activity.adjustedMaintenance-t.calories,band=fatBand(settings),version=document.querySelector('#appVersion');
    if(version)version.textContent=`Version ${VERSION}`;
    const pageLabel=relativeDayLabel(selectedDate),brandTitle=document.querySelector('.brand h1'),todayButton=document.querySelector('#todayButton');if(brandTitle)brandTitle.textContent=pageLabel;if(todayButton){todayButton.hidden=selectedDate===todayKey();todayButton.textContent='Zu heute';}
    const latest=weightEntries(selectedDate).at(-1),weightCard=document.querySelector('.macros .card:nth-child(4)');setText('#todayWeight',latest?fmt(latest[1].weight,1):'–');normalizeWeightLabel(weightCard,latest);normalizeCarbsLabel();
    const weightButton=weightCard?.querySelector('button.secondary');if(weightButton)weightButton.textContent=data.weight===null?'Heute messen':'Messung ändern';
    const proteinLabel=document.querySelector('.macros .card:nth-child(1)>label span');if(proteinLabel)proteinLabel.textContent=`Ziel ${fmt(settings.protein)} g`;
    const fatLabel=document.querySelector('.macros .card:nth-child(3)>label span');if(fatLabel)fatLabel.textContent=`${fmt(band.min)}–${fmt(band.max)} g`;
    const fatStatus=document.querySelector('#fatRemaining');if(fatStatus){if(t.fat<band.min)fatStatus.textContent=`${fmt(band.min-t.fat)} g fehlen`;else if(t.fat>band.max)fatStatus.textContent=`${fmt(t.fat-band.max)} g drüber`;else fatStatus.textContent='im Bereich';}
    const heroStatus=dayStatus(t,settings,effective),badge=document.querySelector('.badge');if(badge){badge.textContent=heroStatus.text;badge.dataset.tone=heroStatus.tone;}
    setText('#scoreCaption',score===null?'offen':status.complete?scoreLabel(score):'vorläufig');setText('#energyBalanceLabel',effective>=0?'Defizit inkl. Aktivität*':'Überschuss inkl. Aktivität*');setText('#deficit',t.calories?fmt(Math.abs(effective)):'–');
    const compact=[];if(data.steps!==null&&activity.stepAdjustment!==0)compact.push(`Schritte ${activity.stepAdjustment>0?'+':''}${fmt(activity.stepAdjustment)} kcal`);if(data.gym===true)compact.push(`Training +${fmt(activity.gymAdjustment)} kcal`);if(!compact.length)compact.push(data.steps===null?'Aktivität noch offen':'Aktivität neutral');setText('#activityImpact',compact.join(' · '));
    const stepBar=document.querySelector('#stepsBar');if(stepBar){stepBar.classList.remove('over');stepBar.classList.toggle('goal-reached',data.steps!==null&&data.steps>=settings.steps);}
    const completion=document.querySelector('#completionText');if(completion)completion.textContent=status.complete?'Tagescheck vollständig.':`${status.done}/${status.total} Angaben · offen: ${status.missing.join(', ')}`;
    const summary=document.querySelector('.summary');if(summary){summary.classList.toggle('large-deficit',t.calories>0&&effective>1000);summary.classList.toggle('surplus',t.calories>0&&effective<0);}
    renderWater();syncStepSaveState();
  }
  window.render=function(){baseRender();renderEnhancements();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();window.render();},{once:true});else{ensureUi();window.render();}
})();