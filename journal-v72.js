'use strict';
(function(){
  const VERSION='7.2.0';
  const WATER_KEY='cutcoach_water_v1';
  const WATER_TARGET=3000;
  const $=selector=>document.querySelector(selector);
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number(value)||0));
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const reduceMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const previousWater=new Map();
  const locks=new Map();
  let initialized=false;

  const macroDefinitions={
    protein:{label:'Eiweiß',icon:'💪',purpose:'Muskelerhalt, Regeneration und Sättigung',range:'90–110 % des Tagesziels',suggestions:['Skyr','Magerquark','Hähnchenbrust','Thunfisch']},
    carbs:{label:'Kohlenhydrate',icon:'🌾',purpose:'Energie für Training, Schritte und Alltag',range:'80–115 % des Tagesziels',suggestions:['Haferflocken','Reis','Kartoffeln','Banane']},
    fat:{label:'Fett',icon:'💧',purpose:'Hormone, Zellfunktion und Sättigung',range:'80–120 % des Tagesziels',suggestions:['Eier','Lachs','Avocado','Olivenöl']}
  };

  function waterMap(){
    try{const value=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}catch{return{}}
  }
  function selectedWater(){try{return Math.max(0,Number(waterMap()[selectedDate])||0)}catch{return 0}}
  function currentHour(){const now=new Date();return now.getHours()+now.getMinutes()/60}
  function isToday(){return selectedDate===todayKey()}
  function isFinalDay(){return selectedDate<todayKey()||(isToday()&&currentHour()>=22)}
  function dayProgress(){
    if(!isToday())return 1;
    const hour=currentHour();
    if(hour<8)return .08;
    if(hour<11)return .18+(hour-8)*.06;
    if(hour<14)return .36+(hour-11)*.09;
    if(hour<18)return .63+(hour-14)*.065;
    if(hour<22)return .89+(hour-18)*.0275;
    return 1;
  }
  function waterPace(){
    if(selectedDate<todayKey())return WATER_TARGET;
    if(!isToday())return 0;
    return Math.round(clamp((currentHour()-7)/15,.08,1)*WATER_TARGET/250)*250;
  }
  function weekGymCount(){
    try{
      let count=0;
      for(let offset=0;offset<7;offset++){const key=shiftKey(selectedDate,-offset);if(day(key,false).gym===true)count++}
      return count;
    }catch{return 0}
  }

  function qualityFromRatio(ratio,{low=.82,high=1.18,softLow=.62,softHigh=1.35}={}){
    if(ratio>=low&&ratio<=high)return 1;
    if(ratio<low)return clamp((ratio-softLow)/(low-softLow),0,1)*.35+.55;
    return ratio<=softHigh?.72:.35;
  }
  function calorieQuality(value,target){
    if(target<=0)return 1;
    const delta=(value-target)/target,absolute=Math.abs(delta);
    if(absolute<=.08)return 1;
    if(absolute<=.15)return .86;
    if(absolute<=.25)return delta<0?.66:.58;
    return delta<0?.43:.28;
  }
  function scoreComponents(){
    if(typeof totals!=='function'||typeof day!=='function'||typeof state!=='object')return [];
    const total=totals(selectedDate),data=day(selectedDate,false),settings=state.settings,water=selectedWater(),progress=isFinalDay()?1:dayProgress();
    if(total.calories<=0)return [];
    const targetCalories=Math.max(180,settings.calories*progress),targetProtein=Math.max(20,settings.protein*progress),targetFat=Math.max(8,settings.fat*progress),targetCarbs=Math.max(20,settings.carbs*progress);
    const components=[];
    const add=(key,label,weight,value,detail)=>components.push({key,label,weight,value:clamp(value),detail});
    add('calories','Kalorien',28,calorieQuality(total.calories,targetCalories),`${fmt(total.calories)} / ${fmt(targetCalories)} kcal im ${isFinalDay()?'Tagesziel':'aktuellen Tageskurs'}`);
    add('protein','Eiweiß',20,Math.min(1,Math.max(0,total.protein/targetProtein)),`${fmt(total.protein)} / ${fmt(targetProtein)} g`);
    add('fat','Fett',7,qualityFromRatio(total.fat/targetFat,{low:.78,high:1.22,softLow:.45,softHigh:1.55}),`${fmt(total.fat)} / ${fmt(targetFat)} g`);
    add('carbs','Kohlenhydrate',5,qualityFromRatio(total.carbs/targetCarbs,{low:.65,high:1.3,softLow:.3,softHigh:1.7}),`${fmt(total.carbs)} / ${fmt(targetCarbs)} g`);
    if(Number(settings.steps)===0)add('steps','Schritte',13,1,'Kein Schrittziel gesetzt');
    else if(data.steps!==null)add('steps','Schritte',13,Math.min(1,(Number(data.steps)||0)/Math.max(500,settings.steps*progress)),`${fmt(data.steps)} / ${fmt(Math.max(500,settings.steps*progress))}`);
    else if(isFinalDay())add('steps','Schritte',13,.35,'Nicht eingetragen');
    if(data.gym!==null){const weekly=weekGymCount(),onTrack=weekly>=Number(settings.gymGoal||0);add('gym','Training',10,data.gym===true?1:onTrack?1:.78,data.gym===true?'Training absolviert':onTrack?'Regenerationstag – Wochenziel im Soll':'Regenerationstag – Wochenziel noch offen')}
    else if(isFinalDay())add('gym','Training',10,.5,'Nicht angegeben');
    if(data.alcohol!==null)add('alcohol','Regeneration',7,data.alcohol===false?1:.2,data.alcohol===false?'Alkoholfrei':'Alkohol eingetragen');
    else if(isFinalDay())add('alcohol','Regeneration',7,.5,'Nicht angegeben');
    add('water','Wasser',8,Math.min(1,water/Math.max(250,isFinalDay()?WATER_TARGET:waterPace())),`${fmt(water)} / ${fmt(Math.max(250,isFinalDay()?WATER_TARGET:waterPace()))} ml`);
    if(data.weight!==null)add('weight','Tracking',2,1,`${fmt(data.weight,1)} kg erfasst`);
    else if(isFinalDay())add('weight','Tracking',2,.6,'Gewicht nicht erfasst');
    return components;
  }
  function enhancedScore(){
    const components=scoreComponents();if(!components.length)return null;
    const weight=components.reduce((sum,item)=>sum+item.weight,0);let score=components.reduce((sum,item)=>sum+item.value*item.weight,0)/Math.max(1,weight)*10;
    const data=day(selectedDate,false),missing=[data.steps===null&&Number(state.settings.steps)>0,data.gym===null,data.alcohol===null].filter(Boolean).length;
    if(!isFinalDay()&&missing)score=Math.min(score,8.6);
    if(isFinalDay()&&missing)score=Math.min(score,7.8);
    if(data.weight===null)score=Math.min(score,9.3);
    if(data.alcohol===true)score=Math.min(score,7.5);
    return Math.round(clamp(score,0,10)*10)/10;
  }

  function setText(node,value){if(node&&node.textContent!==String(value))node.textContent=String(value)}
  function energyState(total,settings){
    const remaining=settings.calories-total.calories,goal=settings.calories;
    if(total.calories<=0)return{tone:'empty',label:'Noch keine Mahlzeit',text:'Sobald du etwas einträgst, bewertet CutCoach deinen Kalorienkurs.'};
    if(remaining>Math.max(500,goal*.25))return{tone:'low',label:'Deutlich unter Tagesziel',text:`Noch ${fmt(remaining)} kcal offen. Verteile sie planbar und eiweißreich.`};
    if(remaining>200)return{tone:'open',label:'Noch sinnvoller Spielraum',text:`${fmt(remaining)} kcal bleiben für den restlichen Tag.`};
    if(remaining>=-200)return{tone:'balanced',label:'Im Zielkorridor',text:remaining>=0?`Noch ${fmt(remaining)} kcal verfügbar.`:`${fmt(-remaining)} kcal über Ziel – im normalen Toleranzbereich.`};
    if(remaining>=-350)return{tone:'near-over',label:'Leicht über Tagesziel',text:`${fmt(-remaining)} kcal darüber. Kein Drama – den Tag ruhig abschließen.`};
    return{tone:'over',label:'Über Tagesziel',text:`${fmt(-remaining)} kcal darüber. Heute nicht weiter kompensieren, morgen normal fortsetzen.`};
  }

  function ensureEnergyStatus(){
    const card=$('.journal-energy-card'),grid=card?.querySelector('.journal-energy-grid');if(!card||!grid||$('#journalEnergyStatus'))return;
    grid.insertAdjacentHTML('afterend','<div id="journalEnergyStatus" class="journal-energy-status" role="status" aria-live="polite"><span id="journalEnergyStatusIcon">◎</span><div><strong id="journalEnergyStatusLabel">Tageskurs</strong><small id="journalEnergyStatusText"></small></div></div>');
  }
  function ensureMacroModal(){
    if($('#journalMacroModal'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="journalMacroModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="journalMacroTitle"><div class="sheet journal-macro-sheet"><div class="sheet-head"><h2 id="journalMacroTitle">Makro</h2><button id="journalMacroClose" type="button" aria-label="Schließen">×</button></div><div id="journalMacroHero" class="journal-macro-hero"></div><section class="journal-macro-explain"><strong id="journalMacroPurpose"></strong><p id="journalMacroStatus"></p><small id="journalMacroRange"></small></section><section class="journal-macro-suggestions"><strong>Passende Lebensmittel</strong><div id="journalMacroSuggestions"></div></section></div></div>`);
    $('#journalMacroClose').addEventListener('click',()=>closeModal?.($('#journalMacroModal')));
    $('#journalMacroModal').addEventListener('click',event=>{if(event.target.id==='journalMacroModal')closeModal?.(event.currentTarget)});
  }
  function ensureSummaryDepth(){
    const sheet=$('#journalSummaryModal .journal-summary-sheet');if(!sheet||$('#journalSummaryVerdict'))return;
    const done=$('#journalSummaryDone');done.insertAdjacentHTML('beforebegin','<section id="journalSummaryVerdict" class="journal-summary-verdict"><small>Tagesfazit</small><strong id="journalSummaryVerdictTitle"></strong><p id="journalSummaryVerdictText"></p></section><section id="journalSummaryNext" class="journal-summary-next"><small>Nächster Fokus</small><strong id="journalSummaryNextTitle"></strong><p id="journalSummaryNextText"></p></section>');
  }
  function ensureCheckInsight(){
    const card=$('.journal-check-card'),grid=card?.querySelector('.journal-check-grid');if(!card||!grid||$('#journalCheckInsight'))return;
    grid.insertAdjacentHTML('afterend','<div id="journalCheckInsight" class="journal-check-insight" role="status"><span>i</span><p></p></div>');
  }
  function ensureMacroButtons(){
    document.querySelectorAll('.journal-macros article').forEach((article,index)=>{
      const key=['protein','carbs','fat'][index];if(!key||article.dataset.v72Macro)return;
      article.dataset.v72Macro=key;article.tabIndex=0;article.setAttribute('role','button');article.setAttribute('aria-label',`${macroDefinitions[key].label} erklären`);
      article.addEventListener('click',()=>openMacro(key));
      article.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openMacro(key)}});
    });
  }
  function ensureUi(){ensureEnergyStatus();ensureMacroModal();ensureSummaryDepth();ensureCheckInsight();ensureMacroButtons()}

  function openMacro(key){
    const definition=macroDefinitions[key];if(!definition)return;
    const total=totals(selectedDate),goal=Number(state.settings[key])||0,value=Number(total[key])||0,gap=goal-value,ratio=goal>0?value/goal:0;
    setText($('#journalMacroTitle'),`${definition.icon} ${definition.label}`);
    $('#journalMacroHero').innerHTML=`<div><small>Heute</small><strong>${fmt(value)} g</strong></div><div><small>Ziel</small><strong>${fmt(goal)} g</strong></div><div><small>Status</small><strong>${goal<=0?'Kein Ziel':gap>0?`${fmt(gap)} g offen`:`${fmt(-gap)} g darüber`}</strong></div>`;
    setText($('#journalMacroPurpose'),definition.purpose);
    const status=goal<=0?'Für dieses Makro ist kein Tagesziel gesetzt.':ratio<.8?'Der Wert liegt noch deutlich unter deinem Zielbereich.':ratio<=1.2?'Du befindest dich in einem sinnvollen Zielbereich.':'Du liegst über dem üblichen Zielbereich. Einzelne Tage sind dabei unproblematisch.';
    setText($('#journalMacroStatus'),status);setText($('#journalMacroRange'),`Orientierung: ${definition.range}`);
    $('#journalMacroSuggestions').innerHTML=definition.suggestions.map(item=>`<button type="button" data-macro-search="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('');
    openModal?.('journalMacroModal');
  }
  function openMacroSearch(query){
    closeModal?.($('#journalMacroModal'));document.querySelector('[data-tab="food"]')?.click();
    setTimeout(()=>{const search=$('#nutritionSearch');if(!search)return;search.value=query;search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()},80);
  }

  function renderEnergy(total,settings){
    const status=energyState(total,settings),host=$('#journalEnergyStatus'),ring=$('#journalCalorieRing');if(!host)return;
    host.dataset.tone=status.tone;ring?.setAttribute('data-v72-energy',status.tone);
    setText($('#journalEnergyStatusIcon'),status.tone==='balanced'?'✓':status.tone==='over'?'!':status.tone==='low'?'↗':'◎');setText($('#journalEnergyStatusLabel'),status.label);setText($('#journalEnergyStatusText'),status.text);
  }
  function renderMacros(total,settings){
    for(const key of Object.keys(macroDefinitions)){
      const article=$(`[data-v72-macro="${key}"]`),value=Number(total[key])||0,goal=Number(settings[key])||0,ratio=goal>0?value/goal:0;if(!article)continue;
      article.dataset.zone=goal<=0?'unset':ratio<.8?'low':ratio<=1.2?'target':'high';
      const gap=article.querySelector('.macro-v7-gap');if(gap)setText(gap,goal<=0?'Kein Ziel gesetzt':value<goal?`${fmt(goal-value)} g offen`:ratio<=1.2?'Im Zielbereich':`${fmt(value-goal)} g darüber`);
    }
  }
  function celebrateWater(water){
    const card=$('.journal-water-card'),ring=$('#journalWaterRing'),date=selectedDate;if(!card||!ring)return;
    card.classList.toggle('v72-water-empty',water<=0);card.classList.toggle('v72-water-ready',water>0&&water<WATER_TARGET);card.classList.toggle('v72-water-complete',water>=WATER_TARGET);
    const glasses=$('.water-v7-glasses');if(glasses)setText(glasses,water>=WATER_TARGET?`≈ ${fmt(water/250)} Gläser · Ziel erreicht`:`≈ ${fmt(water/250)} Gläser`);
    const previous=previousWater.has(date)?previousWater.get(date):water,celebrationKey=`cutcoach_water_goal_${date}`;
    let celebrated=false;try{celebrated=sessionStorage.getItem(celebrationKey)==='1'}catch{}
    if(previous<WATER_TARGET&&water>=WATER_TARGET&&!celebrated){ring.classList.remove('v72-water-celebrate');void ring.offsetWidth;ring.classList.add('v72-water-celebrate');setTimeout(()=>ring.classList.remove('v72-water-celebrate'),1100);try{sessionStorage.setItem(celebrationKey,'1')}catch{}}
    previousWater.set(date,water);
    const undo=$('#journalWaterUndo');if(undo)undo.classList.toggle('v72-ready',!undo.disabled);
  }
  function renderCheck(data){
    const missing=[];if(data.weight===null)missing.push('Gewicht');if(data.gym===null)missing.push('Training');if(data.alcohol===null)missing.push('Alkohol');
    const host=$('#journalCheckInsight');if(!host)return;
    host.dataset.complete=String(!missing.length);setText(host.querySelector('span'),missing.length?'i':'✓');setText(host.querySelector('p'),missing.length?`Noch offen: ${missing.join(', ')}. Die Angaben beeinflussen Rückblick und Tagesnote nachvollziehbar.`:'Alle drei Angaben sind erfasst. Gewicht zählt nur als Tracking, Training und Alkohol fließen stärker in die Tagesnote ein.');
  }
  function weakestComponent(components){return [...components].sort((a,b)=>a.value-b.value||b.weight-a.weight)[0]||null}
  function strongestComponent(components){return [...components].sort((a,b)=>b.value-a.value||b.weight-a.weight)[0]||null}
  function renderSummary(total,data,settings,water,score){
    ensureSummaryDepth();const components=scoreComponents();if(!components.length)return;
    setText($('#journalScoreLarge'),score===null?'–':fmt(score,0));setText($('#journalScore'),score===null?'Offen':fmt(score,0));
    const drivers=$('#journalScoreDrivers');if(drivers)drivers.innerHTML=components.map(item=>`<div class="${item.value>=.85?'good':item.value<.55?'attention':''}"><span>${escapeHtml(item.label)} <small>${Math.round(item.weight)} %</small></span><b>${fmt(item.value*item.weight,1)} / ${fmt(item.weight)} Punkte</b><em>${escapeHtml(item.detail)}</em></div>`).join('');
    const weakest=weakestComponent(components),strongest=strongestComponent(components),verdict=score>=8.5?'Sehr starker, ausgewogener Tag':score>=7?'Solider Tag mit klarem Potenzial':score>=5.5?'Mehrere Grundlagen sind vorhanden':'Heute fehlen noch wichtige Grundlagen';
    setText($('#journalSummaryVerdictTitle'),verdict);setText($('#journalSummaryVerdictText'),strongest&&weakest?`Stärkster Bereich: ${strongest.label}. Größter Hebel: ${weakest.label}. Die Note bewertet Verhalten und Zielnähe – nicht deinen persönlichen Wert.`:'Die Tagesnote wird aufgebaut, sobald genügend Daten vorliegen.');
    setText($('#journalSummaryNextTitle'),weakest?`${weakest.label} als nächster Hebel`:'Daten ergänzen');setText($('#journalSummaryNextText'),weakest?.detail||'Ergänze Mahlzeiten und Tagesdaten, damit die Auswertung belastbar wird.');
    const hero=$('#journalSummaryHero>span');if(hero)setText(hero,score===null?'–':fmt(score,1));
  }

  function enhanceToast(){
    const toastNode=$('#toast');if(!toastNode||toastNode.dataset.v72)return;toastNode.dataset.v72='1';toastNode.setAttribute('aria-atomic','true');
    new MutationObserver(()=>{const text=toastNode.textContent||'';toastNode.dataset.tone=/fehl|konnte nicht|ungültig|limit/i.test(text)?'error':/entfernt|zurück|abgebrochen/i.test(text)?'neutral':'success'}).observe(toastNode,{childList:true,characterData:true,subtree:true});
  }
  function installHapticDedupe(){
    try{
      const original=navigator.vibrate?.bind(navigator);if(!original||navigator.vibrate.__cutcoachV72)return;let last=0;
      const wrapped=pattern=>{const now=performance.now();if(now-last<90)return true;last=now;return original(pattern)};wrapped.__cutcoachV72=true;Object.defineProperty(navigator,'vibrate',{value:wrapped,configurable:true});
    }catch{}
  }
  function installActionLocks(){
    window.addEventListener('click',event=>{
      const target=event.target.closest?.('#saveMeal,#nutritionDetailAdd,#recipeV7Save,[data-nutrition-add]');if(!target)return;
      const key=target.id||target.dataset.nutritionAdd||target.outerHTML.slice(0,80),now=Date.now(),last=locks.get(key)||0;
      if(now-last<850){event.preventDefault();event.stopImmediatePropagation();return}locks.set(key,now);
    },true);
  }
  function bindInteractions(){
    document.addEventListener('click',event=>{const button=event.target.closest?.('[data-macro-search]');if(button)openMacroSearch(button.dataset.macroSearch)});
    const finish=$('#journalFinishDay');if(finish&&!finish.dataset.v72){finish.dataset.v72='1';finish.addEventListener('click',()=>setTimeout(renderNow,0))}
  }
  function renderNow(){
    ensureUi();if(typeof totals!=='function'||typeof day!=='function'||typeof state!=='object')return;
    const total=totals(selectedDate),data=day(selectedDate,false),settings=state.settings,water=selectedWater(),score=enhancedScore();
    renderEnergy(total,settings);renderMacros(total,settings);celebrateWater(water);renderCheck(data);renderSummary(total,data,settings,water,score);
    const version=$('#appVersion');if(version)setText(version,`Version ${VERSION}`);
  }
  function start(){
    if(initialized)return;if(!$('#today560')){setTimeout(start,80);return}initialized=true;
    window.dailyScore=enhancedScore;window.CutCoachJournalV72={score:enhancedScore,components:scoreComponents,render:renderNow};
    ensureUi();enhanceToast();installHapticDedupe();installActionLocks();bindInteractions();
    const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){baseRender();renderNow()};
    new MutationObserver(()=>ensureUi()).observe(document.body,{childList:true,subtree:true});renderNow();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
