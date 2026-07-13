'use strict';
(function(){
  const VERSION='3.7.0';
  const baseRender=window.render;

  function activityModel(key=selectedDate){
    const data=day(key,false),settings=state.settings;
    const stepDelta=data.steps===null||settings.steps===0?0:data.steps-settings.steps;
    const stepAdjustment=data.steps===null?0:Math.round(clamp(stepDelta*0.035,-200,350));
    const gymAdjustment=data.gym===true?180:0;
    return {stepAdjustment,gymAdjustment,totalAdjustment:stepAdjustment+gymAdjustment,adjustedMaintenance:settings.maintenance+stepAdjustment+gymAdjustment};
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
    const calorieScore=abs<=150?3:abs<=300?2.5:abs<=500?1.7:delta<0?.8:.4;
    const proteinRatio=t.protein/Math.max(1,settings.protein);
    const proteinScore=proteinRatio>=.9?2:proteinRatio>=.75?1.5:proteinRatio>=.55?.9:.3;
    const fatRatio=t.fat/Math.max(1,settings.fat);
    const fatScore=fatRatio>=.8&&fatRatio<=1.2?1:fatRatio>=.6&&fatRatio<=1.4?.6:.2;
    const stepScore=settings.steps===0?1.5:data.steps===null?0:clamp(data.steps/settings.steps,0,1)*1.5;
    const previousGym=range(shiftKey(selectedDate,-1),6).filter(item=>item.data.gym===true).length;
    const gymScore=data.gym===true?1.25:data.gym===false?(previousGym>=settings.gymGoal?1.25:1):0;
    const alcoholScore=data.alcohol===false?.75:0;
    const tracking=[data.steps!==null||settings.steps===0,data.gym!==null,data.alcohol!==null].filter(Boolean).length/3*.5;
    return Math.round(clamp(calorieScore+proteinScore+fatScore+stepScore+gymScore+alcoholScore+tracking,0,10)*10)/10;
  };

  window.feedback=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings;
    if(!t.calories)return 'Ernährung eintragen\nAktivität ergänzen';
    const lines=[];
    if(t.protein<settings.protein*.9)lines.push(`⚠️ Eiweiß: ${fmt(Math.max(0,settings.protein-t.protein))} g fehlen`);
    else lines.push('✅ Eiweiß im guten Bereich');
    if(t.fat<settings.fat*.8)lines.push('⚠️ Fett unter Zielbereich');
    else if(t.fat>settings.fat*1.2)lines.push(`⚠️ Fett: ${fmt(t.fat-settings.fat*1.2)} g über Zielbereich`);
    else lines.push('✅ Fett im Zielbereich');
    const activity=[];
    if(data.steps!==null&&data.steps>=settings.steps)activity.push('Schritte');
    if(data.gym===true)activity.push('Training');
    if(activity.length)lines.push(`✅ Aktivität: ${activity.join(' + ')}`);
    else if(data.steps===null||data.gym===null)lines.push('ℹ️ Aktivität noch offen');
    if(data.alcohol===true)lines.push('⚠️ Alkohol belastet Regeneration');
    return lines.slice(0,4).join('\n');
  };

  function addInfoButton(card,title,text){
    if(!card||card.querySelector('.coach-info-button'))return;
    const button=document.createElement('button');
    button.type='button';button.className='coach-info-button';button.setAttribute('aria-label',`${title} erklären`);button.textContent='i';
    button.onclick=()=>alert(`${title}\n\n${text}`);
    card.append(button);
  }

  function ensureUi(){
    const brandTitle=document.querySelector('.brand h1');if(brandTitle)brandTitle.textContent='Heute';
    document.querySelectorAll('.coach-helper').forEach(node=>node.remove());
    const fatCard=document.querySelector('.macros .card:nth-child(3)');
    const weightCard=document.querySelector('.macros .card:nth-child(4)');
    const steps=document.querySelector('.steps-card');
    const gymCard=document.querySelector('.checks .card:nth-child(1)');
    const alcoholCard=document.querySelector('.checks .card:nth-child(2)');
    addInfoButton(fatCard,'Fett','Fett ist ein sinnvoller Zielbereich und keine harte Verbotsgrenze. Es unterstützt Sättigung, Hormone und Nährstoffaufnahme.');
    addInfoButton(weightCard,'Gewicht','Tägliches Wiegen ist freiwillig. Für einen brauchbaren Trend reichen mehrere Morgenmessungen pro Woche.');
    addInfoButton(steps,'Schritte','Schritte verändern die geschätzte Energiebilanz relativ zu deinem eingestellten Schrittziel.');
    addInfoButton(gymCard,'Training','Krafttraining fließt in Aktivitätsverbrauch, Wochenziel, Muskelerhalt und Tagesnote ein.');
    addInfoButton(alcoholCard,'Alkohol','Alkohol verändert nicht automatisch dein Kalorienziel, beeinflusst aber Regeneration und Tagesnote.');
    if(steps&&!document.querySelector('#activityImpact')){const impact=document.createElement('div');impact.id='activityImpact';impact.className='activity-impact';steps.append(impact);}
  }

  function renderEnhancements(){
    ensureUi();
    const settings=state.settings,data=day(selectedDate,false),t=totals(),activity=activityModel();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
    const latest=weightEntries(selectedDate).at(-1);setText('#todayWeight',latest?fmt(latest[1].weight,1):'–');
    const weightLabel=document.querySelector('.macros .card:nth-child(4)>label');if(weightLabel)weightLabel.innerHTML='<span>⚖️ Gewichtstrend</span><span>optional</span>';
    const weightButton=document.querySelector('.macros .card:nth-child(4) button');if(weightButton)weightButton.textContent=data.weight===null?'Heute messen':'Messung ändern';
    const proteinLabel=document.querySelector('.macros .card:nth-child(1)>label span');if(proteinLabel)proteinLabel.textContent=`Ziel ${fmt(settings.protein)} g`;
    const carbsLabel=document.querySelector('.macros .card:nth-child(2)>label span');if(carbsLabel)carbsLabel.textContent='Richtwert';
    const fatLabel=document.querySelector('.macros .card:nth-child(3)>label span');if(fatLabel)fatLabel.textContent=`${fmt(settings.fat*.8)}–${fmt(settings.fat*1.2)} g`;
    const fatStatus=document.querySelector('#fatRemaining');if(fatStatus){if(t.fat<settings.fat*.8)fatStatus.textContent=`${fmt(settings.fat*.8-t.fat)} g fehlen`;else if(t.fat>settings.fat*1.2)fatStatus.textContent=`${fmt(t.fat-settings.fat*1.2)} g drüber`;else fatStatus.textContent='im Bereich';}
    const effective=activity.adjustedMaintenance-t.calories;
    setText('#energyBalanceLabel',effective>=0?'Defizit inkl. Aktivität*':'Überschuss inkl. Aktivität*');setText('#deficit',t.calories?fmt(Math.abs(effective)):'–');
    const compact=[];
    if(data.steps!==null&&activity.stepAdjustment!==0)compact.push(`Schritte ${activity.stepAdjustment>0?'+':''}${fmt(activity.stepAdjustment)} kcal`);
    if(data.gym===true)compact.push(`Training +${fmt(activity.gymAdjustment)} kcal`);
    if(!compact.length)compact.push('Aktivität neutral');
    setText('#activityImpact',compact.join(' · '));
    const completion=document.querySelector('#completionText');if(completion)completion.textContent=completionStatus().complete?'Tagescheck vollständig.':`${completionStatus().done}/${completionStatus().total} Angaben erledigt.`;
  }

  window.render=function(){baseRender();renderEnhancements();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();window.render();},{once:true});else{ensureUi();window.render();}
})();