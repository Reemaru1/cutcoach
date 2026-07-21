'use strict';
(function(global){
  const VERSION='2.0.6-alpha';
  const WATER_KEY='cutcoach_water_v1';
  const $=(selector,scope=document)=>scope?.querySelector?.(selector)||null;
  const $$=(selector,scope=document)=>[...(scope?.querySelectorAll?.(selector)||[])];
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const clamp=(value,min=0,max=100)=>Math.min(max,Math.max(min,Number(value)||0));
  let frame=0,observer=null;

  function dateKey(){try{return typeof selectedDate!=='undefined'?selectedDate:global.selectedDate}catch{return global.selectedDate}}
  function settings(){try{return typeof state==='object'&&state?.settings?state.settings:global.state?.settings||{}}catch{return global.state?.settings||{}}}
  function totalsFor(key=dateKey()){
    try{const value=typeof totals==='function'?totals(key):global.totals?.(key);return value&&typeof value==='object'?value:{}}
    catch{return{}}
  }
  function dayFor(key=dateKey()){
    try{const value=typeof day==='function'?day(key,false):global.day?.(key,false);return value&&typeof value==='object'?value:{meals:[]}}
    catch{return{meals:[]}}
  }
  function waterFor(key=dateKey()){
    try{const map=JSON.parse(localStorage.getItem(WATER_KEY)||'{}');return Math.max(0,Number(map?.[key])||0)}catch{return 0}
  }
  function snapshot(key=dateKey()){
    const total=totalsFor(key),goal=settings(),macro={};
    for(const name of ['protein','carbs','fat']){
      const value=Math.max(0,Number(total[name])||0),target=Math.max(0,Number(goal[name])||0);
      macro[name]=Object.freeze({value,target,remaining:Math.max(0,target-value),over:Math.max(0,value-target),ratio:target>0?value/target:0});
    }
    return Object.freeze({dateKey:key,total:Object.freeze({calories:Math.max(0,Number(total.calories)||0),protein:macro.protein.value,carbs:macro.carbs.value,fat:macro.fat.value}),goals:Object.freeze({calories:Math.max(0,Number(goal.calories)||0),protein:macro.protein.target,carbs:macro.carbs.target,fat:macro.fat.target,steps:Math.max(0,Number(goal.steps)||0)}),macro:Object.freeze(macro)});
  }

  function identity(item){const id=String(item?.id||'');const sourceId=String(item?.sourceId||'');return sourceId?`source:${item?.source||'user'}:${sourceId}`:`id:${id}`}
  function uniqueAllCount(){
    let catalog=[],personal=[];try{catalog=global.CutCoachFoodCatalog?.items?.()||[]}catch{}try{personal=global.CutCoachLibrary?.exportData?.().items||[]}catch{}
    const catalogIds=new Set(),catalogSources=new Set();let count=0;
    for(const item of catalog){const id=String(item?.id||''),source=identity(item);if(id&&catalogIds.has(id))continue;catalogIds.add(id);if(source)catalogSources.add(source);count++}
    for(const item of personal){const id=String(item?.id||''),source=identity(item);if(id&&catalogIds.has(id))continue;if(source&&catalogSources.has(source))continue;catalogIds.add(id);catalogSources.add(source);count++}
    return count;
  }

  function hideSourceNode(node){if(!node)return;node.classList.add('cc-bls-hidden-v206');node.setAttribute('aria-hidden','true')}
  function removeBlsPresentation(){
    const roots=[$('[data-screen="food"]'),$('#libraryScreen'),$('#nutritionDetailModal'),$('#libraryUseModal'),$('#recipeV7Modal')].filter(Boolean);
    for(const root of roots){
      for(const badge of $$('.nutrition-source',root))if(/^\s*BLS(?:\s*4\.0)?\s*$/i.test(badge.textContent||''))hideSourceNode(badge);
      for(const node of $$('small',root)){const before=node.textContent||'',after=before.replace(/\s*·\s*BLS\s*4\.0/gi,'').replace(/BLS\s*4\.0\s*·\s*/gi,'').trim();if(after!==before.trim())node.textContent=after}
      for(const node of $$('#recipeV7SearchResults button>span',root))if(/^\s*BLS\s*$/i.test(node.textContent||''))hideSourceNode(node);
    }
    const scope=$('#nutritionResultScope');if(scope&&/BLS/i.test(scope.textContent||''))scope.textContent='Bibliothek';
    const note=$('.nutrition-catalog-note');if(note&&!note.hidden){note.hidden=true;note.setAttribute('aria-hidden','true')}
    const detail=$('#nutritionDetailSource');if(detail){const text=detail.textContent||'',bls=/\bBLS(?:\s*4\.0)?\b/i.test(text);if(bls){detail.dataset.v206Bls='1';detail.hidden=true;if(text)detail.textContent=''}else if(text.trim()){delete detail.dataset.v206Bls;detail.hidden=false}else if(detail.dataset.v206Bls==='1')detail.hidden=true}
  }

  function decorateCloseButtons(){
    const selector=['.modal .sheet-head>button[aria-label="Schließen"]','.modal [data-close]','.modal [data-library-close]','.modal [data-recipe-v7-close]','.modal [data-detail-close]','#journalMacroClose','#journalSummaryClose'].join(',');
    for(const button of $$(selector)){button.classList.add('cc-close-v206');if(button.textContent)button.textContent='';button.setAttribute('aria-label','Schließen')}
  }

  function updateAllCount(){const node=$('[data-filter-count="all"]');if(node){const value=fmt(uniqueAllCount());if(node.textContent!==value)node.textContent=value}}
  function currentHour(){const now=new Date();return now.getHours()+now.getMinutes()/60}
  function isTodayKey(key){try{return typeof todayKey==='function'&&key===todayKey()}catch{return false}}
  function waterPace(key){if(!isTodayKey(key))return key&&typeof todayKey==='function'&&key<todayKey()?3000:0;return Math.round(clamp((currentHour()-7)/15,.08,1)*3000/250)*250}
  function recommendedMealType(){const hour=currentHour();return hour<10.5?'Frühstück':hour<15?'Mittagessen':hour<20.5?'Abendessen':'Snack'}

  function coachAction(view,data,water){
    const calorieRemaining=view.goals.calories-view.total.calories,proteinRemaining=view.macro.protein.remaining,steps=Number(data.steps)||0,stepGap=Math.max(0,view.goals.steps-steps),pace=waterPace(view.dateKey),missing=[];
    if(view.total.calories<=0)return{type:'meal',title:'Erste Mahlzeit eintragen',reason:'Ohne Mahlzeit fehlen Kalorien- und Makrodaten für eine belastbare Tagesbewertung.',label:'Mahlzeit eintragen',mealType:recommendedMealType()};
    if(view.total.calories>view.goals.calories+250)return{type:'summary',title:'Kalorienkurs beruhigen',reason:`Du liegst aktuell ${fmt(view.total.calories-view.goals.calories)} kcal über deinem Tagesziel.`,label:'Tageskurs prüfen'};
    if(water<Math.max(250,pace-250))return{type:'water',title:'Trinkplan aufholen',reason:`${fmt(Math.max(250,pace-water))} ml fehlen bis zum aktuellen Trinkplan.`,label:'Zum Wasser'};
    if(proteinRemaining>20&&calorieRemaining>120)return{type:'meal',title:'Eiweiß gezielt erhöhen',reason:`Aktuell ${fmt(view.total.protein)} von ${fmt(view.goals.protein)} g Eiweiß – noch ${fmt(proteinRemaining)} g bis zum Tagesziel.`,label:'Eiweiß einplanen',mealType:recommendedMealType()};
    if(isTodayKey(view.dateKey)&&currentHour()>=18&&calorieRemaining>450)return{type:'meal',title:'Restkalorien sinnvoll verteilen',reason:`${fmt(calorieRemaining)} kcal sind noch bis zum Tagesziel offen.`,label:'Mahlzeit planen',mealType:recommendedMealType()};
    if(view.goals.steps>0&&data.steps===null)return{type:'steps',title:'Schritte erfassen',reason:'Der Bewegungsbereich ist noch leer. Ein aktueller Wert macht die Tagesauswertung belastbarer.',label:'Schritte eintragen'};
    if(view.goals.steps>0&&stepGap>0&&(!isTodayKey(view.dateKey)||currentHour()>=15))return{type:'steps',title:'Bewegungslücke schließen',reason:`${fmt(stepGap)} Schritte fehlen noch bis zum Tagesziel.`,label:'Schritte ansehen'};
    if(data.weight===null)missing.push('Gewicht');if(data.gym===null)missing.push('Training');if(data.alcohol===null)missing.push('Alkohol');
    if(missing.length)return{type:'check',title:'Tagescheck vervollständigen',reason:`${missing.join(', ')} ${missing.length===1?'ist':'sind'} noch offen.`,label:'Zum Tagescheck'};
    return{type:'summary',title:'Kurs halten und abschließen',reason:'Die wichtigsten Bereiche sind erfasst. Prüfe den Tagesabschluss für die Gesamtbewertung.',label:'Tagesabschluss'};
  }

  function renderCoach(){
    const coach=$('.journal-coach-card.coach-v71');if(!coach)return;const view=snapshot(),data=dayFor(view.dateKey),water=waterFor(view.dateKey),action=coachAction(view,data,water);
    const nutrition=$('[data-coach-pillar="nutrition"]',coach);if(nutrition){const value=$('b',nutrition),detail=$('em',nutrition),gap=view.macro.protein.remaining;if(value)value.textContent=`${fmt(view.total.calories)} kcal · ${fmt(view.total.protein)} g Eiweiß`;if(detail)detail.textContent=gap>0?`${fmt(gap)} g Eiweiß offen`:'Eiweißziel erreicht';nutrition.style.setProperty('--coach-progress',`${clamp((Math.min(view.goals.calories>0?view.total.calories/view.goals.calories:0,1)*.45+Math.min(view.macro.protein.ratio,1)*.55)*100)}%`)}
    const title=$('#coachV71FocusTitle'),reason=$('#coachV71FocusReason'),button=$('#coachV71Action');if(title)title.textContent=action.title;if(reason)reason.textContent=action.reason;if(button){button.textContent=action.label;button.dataset.action=action.type;button.dataset.mealType=action.mealType||''}
  }

  function sync(){frame=0;removeBlsPresentation();decorateCloseButtons();updateAllCount();renderCoach()}
  function queue(){if(frame)return;const schedule=global.requestAnimationFrame||global.setTimeout;frame=schedule(sync,0)}
  function wrapRender(){const current=global.render;if(typeof current!=='function'||current.__cutcoachV206)return;const wrapped=function(){const result=current.apply(this,arguments);queue();setTimeout(queue,60);return result};wrapped.__cutcoachV206=true;global.render=wrapped}
  function start(){wrapRender();queue();[80,220,600].forEach(delay=>setTimeout(()=>{wrapRender();queue()},delay));if(!observer){observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length)){wrapRender();queue()}});observer.observe(document.body||document.documentElement,{childList:true,subtree:true})}
    document.addEventListener('cutcoach:data-changed',queue);global.addEventListener('cutcoach:librarychange',queue);global.addEventListener('cutcoach:catalog-updated',queue);global.addEventListener('pageshow',queue);document.addEventListener('visibilitychange',()=>{if(!document.hidden)queue()});document.addEventListener('click',event=>{if(event.target.closest?.('#saveMeal,#saveLibraryItem,#addLibraryMeal,#nutritionDetailAdd,[data-nutrition-add],[data-v192-add],[data-v192-all],[data-delete-meal],[data-fav-lib]'))setTimeout(queue,0)},true)}
  global.CutCoachNutritionMath206=Object.freeze({version:VERSION,snapshot,uniqueAllCount,refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
