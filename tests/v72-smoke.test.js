'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

const project=path.resolve(__dirname,'..');
const indexSource=fs.readFileSync(path.join(project,'index.html'),'utf8');
const html=indexSource.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const errors=[];
const virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',error=>errors.push(error));
virtualConsole.on('error',error=>errors.push(error));

const dom=new JSDOM(html,{url:'https://example.test/cutcoach/index.html#today',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole});
const {window}=dom;
window.scrollTo=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.alert=()=>{};
window.confirm=()=>true;
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
window.CSS=window.CSS||{};
window.CSS.escape=window.CSS.escape||((value)=>String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
Object.defineProperty(window.navigator,'onLine',{value:true,configurable:true});
Object.defineProperty(window.navigator,'storage',{value:{persist:async()=>true,persisted:async()=>true,estimate:async()=>({usage:2048})},configurable:true});
Object.defineProperty(window.navigator,'vibrate',{value:()=>true,configurable:true});

const today=new Date();
const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
window.localStorage.setItem('cutcoach_v2',JSON.stringify({
  settings:{age:28,height:179,calories:2300,maintenance:3000,protein:190,fat:65,carbs:200,steps:6000,gymGoal:5,goalWeight:90},
  days:{[todayKey]:{meals:[{id:'meal-v72',name:'Testtag',type:'Frühstück',calories:1700,protein:155,carbs:165,fat:55,fiber:20,sugar:25,saturatedFat:12,salt:3,quantity:1,unit:'Portion',source:'manual',sourceItemId:''}],weight:96,steps:5200,gym:true,alcohol:false}},
  onboarded:true,meta:{schemaVersion:6,createdAt:new Date().toISOString(),lastBackupAt:null}
}));
window.localStorage.setItem('cutcoach_library_v1',JSON.stringify({version:3,items:[]}));
window.localStorage.setItem('cutcoach_water_v1',JSON.stringify({[todayKey]:2750}));

const scripts=['core.js','render.js','actions.js','app.js','food-catalog.js','library.js','library-init.js','scanner-v2.js','off-lookup.js','upgrade-340.js','nutrition.js','journal.js','water-animation.js','nutrition-v7.js','ui-effects-v7.js','journal-v72.js','version-v7.js'];
for(const name of scripts){const script=window.document.createElement('script');script.textContent=`${fs.readFileSync(path.join(project,name),'utf8')}\n//# sourceURL=${name}`;window.document.head.append(script)}
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const node=selector=>{const found=window.document.querySelector(selector);assert.ok(found,`Element fehlt: ${selector}`);return found};
const click=selector=>{const target=node(selector);target.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));return target};

(async()=>{
  await wait(650);
  assert.equal(node('#appVersion').textContent,'Version 2.3.0 Alpha','Sichtbare Releaseversion ist nicht 2.3.0 Alpha');
  assert.equal(window.CUTCOACH_RELEASE,'2.3.0 Alpha','Zentrale Releasekonstante ist nicht 2.3.0 Alpha');
  assert.ok(window.CutCoachJournalV72,'7.2-Journalmodul wurde nicht gestartet');
  assert.ok(node('#journalEnergyStatus'),'Kalorienstatus fehlt');
  assert.match(node('#journalEnergyStatusLabel').textContent,/Spielraum|Zielkorridor|Tagesziel/,'Kalorienstatus ist nicht verständlich');
  assert.equal(window.document.querySelectorAll('.journal-macros article[data-v72-macro]').length,3,'Makro-Detailaktionen fehlen');
  assert.ok(node('#journalCheckInsight'),'Tagescheck-Erklärung fehlt');
  assert.match(node('#journalCheckInsight').textContent,/Gewicht zählt nur als Tracking/,'Gewichtung des Tageschecks wird nicht erklärt');

  click('[data-v72-macro="protein"]');
  await wait(20);
  assert.equal(node('#journalMacroModal').classList.contains('open'),true,'Makro-Detailansicht öffnet nicht');
  assert.match(node('#journalMacroTitle').textContent,/Eiweiß/,'Falsche Makro-Detailansicht');
  assert.equal(window.document.querySelectorAll('[data-macro-search]').length,4,'Lebensmittelvorschläge fehlen');
  click('#journalMacroClose');

  const score=window.CutCoachJournalV72.score();
  assert.equal(typeof score,'number','Erweiterte Tagesnote wird nicht berechnet');
  assert.ok(score>=0&&score<=10,'Tagesnote liegt außerhalb 0 bis 10');
  assert.equal(window.CutCoachJournalV72.components().length,9,'Gewichtete Score-Komponenten sind unvollständig');

  click('#journalFinishDay');
  await wait(30);
  assert.equal(node('#journalSummaryModal').classList.contains('open'),true,'Tagesabschluss öffnet nicht');
  assert.ok(node('#journalSummaryVerdictTitle').textContent,'Tagesfazit fehlt');
  assert.ok(node('#journalSummaryNextTitle').textContent,'Nächster Fokus fehlt');
  assert.equal(window.document.querySelectorAll('#journalScoreDrivers>div').length,9,'Gewichtete Notenerklärung ist unvollständig');
  click('#journalSummaryClose');

  window.localStorage.setItem('cutcoach_water_v1',JSON.stringify({[todayKey]:3000}));
  window.render();
  await wait(20);
  assert.equal(window.sessionStorage.getItem(`cutcoach_water_goal_${todayKey}`),'1','Wasser-Zielanimation wird nicht einmalig markiert');
  assert.match(node('.water-v7-glasses').textContent,/Ziel erreicht/,'Glaszähler zeigt das erreichte Ziel nicht');
  window.render();
  assert.equal(window.document.querySelectorAll('#journalEnergyStatus').length,1,'Kalorienstatus wird beim Rendern dupliziert');
  assert.equal(window.document.querySelectorAll('#journalMacroModal').length,1,'Makro-Dialog wird beim Rendern dupliziert');
  assert.equal(window.document.querySelectorAll('#journalCheckInsight').length,1,'Tagescheck-Erklärung wird beim Rendern dupliziert');

  let saveClicks=0;node('#saveMeal').addEventListener('click',()=>saveClicks++);
  click('#saveMeal');click('#saveMeal');
  assert.equal(saveClicks,1,'Schnelle Doppelaktion wird nicht abgefangen');

  const css=fs.readFileSync(path.join(project,'journal-v72.css'),'utf8');
  assert.match(css,/\.journal-water-ring\.v7-water-goal\{animation:none!important\}/,'Dauerhafte Wasser-Zielanimation ist nicht deaktiviert');
  assert.match(css,/\.nutrition-results\.v7-loading:after\{display:none!important\}/,'Flackernder Such-Skeleton ist nicht deaktiviert');
  assert.equal(errors.length,0,`Unerwartete Browserfehler: ${errors.map(error=>error.message||String(error)).join(' | ')}`);
  console.log('CutCoach 7.2 smoke test: ok');
  dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1});
