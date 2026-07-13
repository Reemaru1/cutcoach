'use strict';
(function(){
  const VERSION='3.6.0';
  const baseRender=window.render;

  function activityModel(key=selectedDate){
    const data=day(key,false),settings=state.settings;
    const stepDelta=data.steps===null||settings.steps===0?0:data.steps-settings.steps;
    const stepAdjustment=data.steps===null?0:Math.round(clamp(stepDelta*0.035,-200,350));
    const gymAdjustment=data.gym===true?180:0;
    return {
      stepAdjustment,
      gymAdjustment,
      totalAdjustment:stepAdjustment+gymAdjustment,
      adjustedMaintenance:settings.maintenance+stepAdjustment+gymAdjustment
    };
  }

  window.completionStatus=function(){
    const t=totals(),data=day(selectedDate,false),items=[
      ['Ernährung',t.calories>0],
      ['Schritte',data.steps!==null||state.settings.steps===0],
      ['Training',data.gym!==null],
      ['Alkohol',data.alcohol!==null]
    ];
    const done=items.filter(([,complete])=>complete).length;
    return {done,total:items.length,complete:done===items.length,missing:items.filter(([,complete])=>!complete).map(([name])=>name)};
  };

  window.dailyScore=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings;
    if(t.calories<=0)return null;
    const delta=t.calories-settings.calories,abs=Math.abs(delta);
    const calorieScore=abs<=150?3:abs<=300?2.5:abs<=500?1.7:delta<0?0.8:0.4;
    const proteinRatio=t.protein/Math.max(1,settings.protein);
    const proteinScore=proteinRatio>=.9?2:proteinRatio>=.75?1.5:proteinRatio>=.55?.9:.3;
    const fatRatio=t.fat/Math.max(1,settings.fat);
    const fatScore=fatRatio>=.8&&fatRatio<=1.2?1:fatRatio>=.6&&fatRatio<=1.4?.6:.2;
    const stepScore=settings.steps===0?1.5:data.steps===null?0:clamp(data.steps/settings.steps,0,1)*1.5;
    const previousGym=range(shiftKey(selectedDate,-1),6).filter(item=>item.data.gym===true).length;
    const gymScore=data.gym===true?1.25:data.gym===false?(previousGym>=settings.gymGoal?1.25:1):0;
    const alcoholScore=data.alcohol===false?.75:data.alcohol===true?0:0;
    const tracking=[data.steps!==null||settings.steps===0,data.gym!==null,data.alcohol!==null].filter(Boolean).length/3*.5;
    return Math.round(clamp(calorieScore+proteinScore+fatScore+stepScore+gymScore+alcoholScore+tracking,0,10)*10)/10;
  };

  window.feedback=function(){
    const t=totals(),data=day(selectedDate,false),settings=state.settings,activity=activityModel();
    if(!t.calories)return 'Trage Ernährung und Aktivität ein. Gewicht ist optional und wird nur für den längerfristigen Trend benötigt.';
    const points=[];
    points.push(t.protein>=settings.protein*.9?'Eiweiß im guten Bereich':`${fmt(Math.max(0,settings.protein-t.protein))} g Eiweiß fehlen`);
    if(t.fat<settings.fat*.8)points.push('Fett deutlich unter dem sinnvollen Tagesbereich');
    else if(t.fat>settings.fat*1.2)points.push(`${fmt(t.fat-settings.fat)} g Fett über dem Tagesziel`);
    else points.push('Fett im Zielbereich');
    points.push(t.calories>settings.calories+300?'Kalorien klar über Ziel':t.calories<settings.calories-600?'Defizit sehr groß – nicht unnötig hungern':'Kalorienbereich passt');
    if(settings.steps>0)points.push(data.steps===null?'Schritte noch offen':data.steps>=settings.steps?`Schrittziel erreicht${activity.stepAdjustment>0?` · Aktivität +${fmt(activity.stepAdjustment)} kcal`:''}`:`${fmt(settings.steps-data.steps)} Schritte fehlen`);
    if(data.gym===true)points.push('Krafttraining unterstützt Muskelerhalt und verbessert die Tagesnote');
    else if(data.gym===false)points.push('Ruhetag ist okay – entscheidend ist das Wochenziel');
    else points.push('Training noch nicht bewertet');
    if(data.alcohol===true)points.push('Alkohol verschlechtert Regeneration und Tagesnote');
    else if(data.alcohol===false)points.push('Alkoholfreier Tag unterstützt Regeneration');
    return `${points.join(' · ')}.`;
  };

  function ensureUi(){
    const brandTitle=document.querySelector('.brand h1');
    if(brandTitle)brandTitle.textContent='Heute';
    const weightCard=document.querySelector('.macros .card:nth-child(4)');
    if(weightCard&&!weightCard.querySelector('.weight-helper')){
      const helper=document.createElement('small');helper.className='coach-helper weight-helper';helper.textContent='Optional: 3–7 Morgenmessungen pro Woche. Entscheidend ist der Trend, nicht ein einzelner Tag.';weightCard.append(helper);
    }
    const steps=document.querySelector('.steps-card');
    if(steps&&!document.querySelector('#activityImpact')){
      const impact=document.createElement('div');impact.id='activityImpact';impact.className='coach-helper activity-impact';steps.append(impact);
    }
    document.querySelectorAll('.checks .card').forEach((card,index)=>{
      if(card.querySelector('.coach-helper'))return;
      const helper=document.createElement('small');helper.className='coach-helper';helper.textContent=index===0?'Training fließt in Aktivitätsverbrauch, Wochenziel und Muskelerhalt ein.':'Alkohol verändert nicht automatisch dein Kalorienziel, senkt aber Regenerations- und Tagesbewertung.';card.append(helper);
    });
    const fatCard=document.querySelector('.macros .card:nth-child(3)');
    if(fatCard&&!fatCard.querySelector('.macro-helper')){
      const helper=document.createElement('small');helper.className='coach-helper macro-helper';helper.textContent='Tagesziel für Hormone, Sättigung und Nährstoffaufnahme – keine harte Verbotsgrenze.';fatCard.append(helper);
    }
  }

  function renderEnhancements(){
    ensureUi();
    const settings=state.settings,data=day(selectedDate,false),t=totals(),activity=activityModel();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;

    const latest=weightEntries(selectedDate).at(-1);
    setText('#todayWeight',latest?fmt(latest[1].weight,1):'–');
    const weightLabel=document.querySelector('.macros .card:nth-child(4)>label');
    if(weightLabel)weightLabel.innerHTML='<span>⚖️ Gewichtstrend</span><span>optional</span>';
    const weightButton=document.querySelector('.macros .card:nth-child(4) button');
    if(weightButton)weightButton.textContent=data.weight===null?'Heute messen':'Messung ändern';

    const proteinLabel=document.querySelector('.macros .card:nth-child(1)>label span');if(proteinLabel)proteinLabel.textContent=`Tagesziel ${fmt(settings.protein)} g`;
    const carbsLabel=document.querySelector('.macros .card:nth-child(2)>label span');if(carbsLabel)carbsLabel.textContent='flexibler Richtwert';
    const fatLabel=document.querySelector('.macros .card:nth-child(3)>label span');if(fatLabel)fatLabel.textContent=`Zielbereich ca. ${fmt(settings.fat*.8)}–${fmt(settings.fat*1.2)} g`;
    const fatStatus=document.querySelector('#fatRemaining');
    if(fatStatus){
      if(t.fat<settings.fat*.8)fatStatus.textContent=`${fmt(settings.fat*.8-t.fat)} g bis Zielbereich`;
      else if(t.fat>settings.fat*1.2)fatStatus.textContent=`${fmt(t.fat-settings.fat*1.2)} g über Zielbereich`;
      else fatStatus.textContent='im Zielbereich';
    }

    const effective=activity.adjustedMaintenance-t.calories;
    setText('#energyBalanceLabel',effective>=0?'Defizit inkl. Aktivität*':'Überschuss inkl. Aktivität*');
    setText('#deficit',t.calories?fmt(Math.abs(effective)):'–');
    const parts=[];
    if(data.steps===null)parts.push('Schritte noch nicht eingetragen');
    else parts.push(`Schritte ${activity.stepAdjustment>=0?'+':''}${fmt(activity.stepAdjustment)} kcal`);
    if(data.gym===true)parts.push(`Training +${fmt(activity.gymAdjustment)} kcal`);
    else if(data.gym===false)parts.push('Ruhetag');
    parts.push(`Kalorienziel bleibt ${fmt(settings.calories)} kcal`);
    setText('#activityImpact',parts.join(' · '));

    const completion=document.querySelector('#completionText');
    if(completion&&completion.textContent.includes('Tagescheck vollständig'))completion.textContent='Tagescheck vollständig. Gewicht bleibt freiwillig und dient nur dem Trend.';
  }

  window.render=function(){baseRender();renderEnhancements();};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureUi();window.render();},{once:true});else{ensureUi();window.render();}
})();