'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('/tmp/cutcoach-jsdom/node_modules/jsdom');

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
window.alert=()=>{};
window.confirm=()=>true;
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
window.CSS=window.CSS||{};
window.CSS.escape=window.CSS.escape||((value)=>String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
Object.defineProperty(window.navigator,'onLine',{value:true,configurable:true});
Object.defineProperty(window.navigator,'storage',{value:{persist:async()=>true,persisted:async()=>true,estimate:async()=>({usage:1024})},configurable:true});
Object.defineProperty(window.navigator,'vibrate',{value:()=>true,configurable:true});

const today=new Date();
const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
window.localStorage.setItem('cutcoach_v2',JSON.stringify({
  settings:{age:28,height:179,calories:2300,maintenance:3000,protein:190,fat:65,carbs:200,steps:6000,gymGoal:5,goalWeight:90},
  days:{},onboarded:true,meta:{schemaVersion:5,createdAt:new Date().toISOString(),lastBackupAt:null}
}));

const scripts=['core.js','render.js','actions.js','app.js','date-bootstrap.js','library.js','library-init.js','scanner-v2.js','off-lookup.js','upgrade-340.js','nutrition.js','journal.js'];
for(const name of scripts){
  const script=window.document.createElement('script');
  script.textContent=`${fs.readFileSync(path.join(project,name),'utf8')}\n//# sourceURL=${name}`;
  window.document.head.append(script);
}
const testBridge=window.document.createElement('script');
testBridge.textContent=`window.__journalTest={
  get state(){return state},
  get selectedDate(){return selectedDate},
  set selectedDate(value){selectedDate=value},
  day:(key,create)=>day(key,create),
  render:()=>render(),
  todayKey:()=>todayKey(),
  shiftKey:(key,days)=>shiftKey(key,days),
  score:()=>dailyScore(),
  duplicateMeal:id=>duplicateMeal(id),
  deleteMeal:id=>deleteMeal(id),
  get saveState(){return saveState},
  set saveState(value){saveState=value}
};`;
window.document.head.append(testBridge);
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const click=selector=>{
  const node=window.document.querySelector(selector);
  assert.ok(node,`Element fehlt: ${selector}`);
  node.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
  return node;
};
const input=(selector,value)=>{
  const node=window.document.querySelector(selector);
  assert.ok(node,`Eingabe fehlt: ${selector}`);
  node.value=String(value);
  node.dispatchEvent(new window.Event('input',{bubbles:true}));
  return node;
};

(async()=>{
  await wait(320);
  const test=window.__journalTest;
  const initialRoot=window.document.querySelector('#today560');
  assert.ok(initialRoot,'Tagebuch wurde nicht aufgebaut');
  assert.equal(window.document.querySelectorAll('#today560').length,1,'Tagebuch doppelt aufgebaut');
  assert.equal(window.document.querySelector('#journalQuickAdd'),null,'Doppeltes Schnell-Plus ist zurückgekehrt');
  assert.equal(window.document.querySelectorAll('.journal-meal-add').length,4,'Mahlzeiten-Plus fehlt');
  assert.deepEqual([...window.document.querySelectorAll('[data-journal-alcohol]')].map(node=>node.textContent.trim()),['Ja','Nein'],'Alkohol-Reihenfolge ist falsch');
  assert.equal(window.document.querySelector('#appVersion').textContent,'Version 6.3.0');
  assert.equal(test.score(),null,'Leerer Ernährungstag darf keine Tagesnote haben');

  const originalDate=test.selectedDate;
  click('#journalPrevDay');
  const previousDate=test.shiftKey(originalDate,-1);
  assert.equal(test.selectedDate,previousDate,'Vorheriger Tag wurde nicht gewählt');
  assert.equal(window.document.querySelector('#today560'),initialRoot,'Tagebuch wurde bei Datumswechsel neu aufgebaut');
  assert.match(window.location.search,new RegExp(`date=${previousDate}`));
  click('#journalNextDay');
  assert.equal(test.selectedDate,originalDate,'Nächster Tag wurde nicht gewählt');
  assert.equal(window.document.querySelector('#journalNextDay').disabled,true,'Zukunftsnavigation ist am heutigen Tag aktiv');

  click('#journalCalendarButton');
  const calendar=window.document.querySelector('#journalCalendarModal');
  assert.equal(calendar.hidden,false,'Kalender öffnet nicht');
  assert.equal(calendar.querySelectorAll('.journal-calendar-days button').length,42,'Kalender hat nicht sechs vollständige Wochen');
  assert.equal(calendar.querySelectorAll('.journal-calendar-days button:not([data-date])').length,0,'Kalendertag ohne Datum');
  calendar.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(calendar.hidden,true,'Kalender schließt nicht mit Escape');
  click('#journalDateButton');
  const calendarPrevious=calendar.querySelector(`[data-date="${previousDate}"]`);
  assert.ok(calendarPrevious,'Vortag fehlt im Kalender');
  calendarPrevious.click();
  assert.equal(test.selectedDate,previousDate,'Kalenderdatum wurde nicht übernommen');
  assert.equal(window.document.querySelector('#today560'),initialRoot,'Kalenderwahl baut das Tagebuch neu auf');

  click('#journalStepToggle');
  input('#journalStepInput',3000);
  assert.equal(window.document.querySelector('#journalStepSave').disabled,false,'Gültige Schritte bleiben deaktiviert');
  click('#journalStepSave');
  assert.equal(test.day(previousDate,false).steps,3000,'Schritte fehlen im Arbeitsspeicher');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_v2')).days[previousDate].steps,3000,'Schritte fehlen im lokalen Speicher');
  assert.equal(window.document.querySelector('#journalStepEditor').hidden,true,'Schritt-Editor bleibt nach Speichern offen');
  click('#journalStepToggle');click('#journalStepClear');
  assert.equal(test.day(previousDate,false).steps,null,'Schritte wurden nicht entfernt');
  assert.equal(errors.length,0,'Browserfehler vor Speicherausfall-Test');

  const originalSaveState=test.saveState;
  test.saveState=()=>false;
  click('#journalStepToggle');input('#journalStepInput',4321);click('#journalStepSave');
  assert.equal(test.day(previousDate,false).steps,null,'Fehlgeschlagenes Speichern wurde nicht zurückgerollt');
  test.saveState=originalSaveState;
  assert.ok(errors.some(error=>String(error?.message||error).includes('day-save-failed')),'Speicherausfall wurde nicht protokolliert');
  errors.length=0;

  click('[data-journal-water="500"]');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1'))[previousDate],500,'Wasser +500 ml wurde nicht gespeichert');
  assert.equal(window.document.querySelector('#journalWaterUndo').disabled,false,'Wasser-Rückgängig bleibt deaktiviert');
  click('#journalWaterUndo');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1')||'{}')[previousDate],undefined,'Wasseränderung wurde nicht rückgängig gemacht');

  const originalStorageSet=window.Storage.prototype.setItem;
  window.Storage.prototype.setItem=function(key,value){if(key==='cutcoach_water_v1')throw new Error('test-storage-failure');return originalStorageSet.call(this,key,value)};
  click('[data-journal-water="250"]');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1')||'{}')[previousDate],undefined,'Fehlgeschlagenes Wasser-Speichern änderte Daten');
  window.Storage.prototype.setItem=originalStorageSet;
  assert.ok(errors.some(error=>String(error?.message||error).includes('test-storage-failure')),'Wasserspeicher-Ausfall wurde nicht protokolliert');
  errors.length=0;

  click('[data-journal-gym="true"]');
  assert.equal(test.day(previousDate,false).gym,true,'Training Ja wurde nicht gespeichert');
  click('[data-journal-alcohol="false"]');
  assert.equal(test.day(previousDate,false).alcohol,false,'Alkohol Nein wurde nicht gespeichert');
  assert.equal(window.document.querySelector('[data-journal-alcohol="false"]').getAttribute('aria-pressed'),'true');

  const breakfastAdd=window.document.querySelector('.journal-meal-add[data-add-journal-meal="Frühstück"]');
  breakfastAdd.click();
  assert.equal(window.document.querySelector('[data-screen="food"]').classList.contains('active'),true,'Mahlzeiten-Plus öffnet Ernährung nicht');
  assert.equal(window.document.querySelector('#nutritionTitle').textContent,'Frühstück','Mahlzeitenkategorie wurde nicht übernommen');
  click('#nutritionManual');
  input('#mealName','Stabilitätstest');input('#mealCalories',1200);input('#mealProtein',100);input('#mealCarbs',100);input('#mealFat',35);
  click('#saveMeal');
  assert.equal(test.day(previousDate,false).meals.length,1,'Manuelle Mahlzeit wurde nicht gespeichert');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_v2')).days[previousDate].meals.length,1,'Mahlzeit fehlt im lokalen Speicher');
  const mealId=test.day(previousDate,false).meals[0].id;
  test.duplicateMeal(mealId);assert.equal(test.day(previousDate,false).meals.length,2,'Mahlzeit wurde nicht dupliziert');
  test.deleteMeal(mealId);assert.equal(test.day(previousDate,false).meals.length,1,'Mahlzeit wurde nicht gelöscht');
  click('#nutritionBack');
  assert.equal(window.document.querySelector('[data-screen="today"]').classList.contains('active'),true,'Zurück aus Ernährung funktioniert nicht');

  assert.ok(test.score()>=0&&test.score()<=10,'Tagesnote liegt außerhalb 0–10');
  assert.notEqual(window.document.querySelector('#journalScore').textContent,'Offen','Tagesnote bleibt trotz Mahlzeit offen');
  click('#journalWeightButton');input('#weightInput','97.2');click('#saveWeight');
  assert.equal(test.day(previousDate,false).weight,97.2,'Gewicht wurde nicht gespeichert');
  assert.equal(window.document.querySelector('#journalCheckStatus').textContent,'Vollständig','Tagescheck erkennt vollständige Angaben nicht');

  for(let index=0;index<10;index++)test.render();
  assert.equal(window.document.querySelectorAll('#today560').length,1,'Wiederholtes Rendern erzeugt Duplikate');
  assert.equal(errors.length,0,`Unerwartete Browserfehler: ${errors.map(error=>error.message).join(' | ')}`);

  const manifest=fs.readFileSync(path.join(project,'runtime-manifest.js'),'utf8');
  for(const match of manifest.matchAll(/'\.\/([^'?]+)(?:\?[^']*)?'/g)){
    const asset=match[1];
    if(asset==='')continue;
    assert.ok(fs.existsSync(path.join(project,asset)),`Manifest verweist auf fehlende Datei: ${asset}`);
  }
  for(const match of indexSource.matchAll(/(?:src|href)="([^"#]+)"/g)){
    const reference=match[1];
    if(/^https?:/.test(reference))continue;
    const asset=reference.replace(/^\.\//,'').split('?')[0];
    assert.ok(fs.existsSync(path.join(project,asset)),`Index verweist auf fehlende Datei: ${asset}`);
  }
  for(const name of scripts)assert.ok(indexSource.includes(`${name}?`),`Produktiver Erststart lädt ${name} nicht direkt`);
  console.log('journal regression: ok');
  dom.window.close();
})().catch(error=>{
  console.error(error);
  dom.window.close();
  process.exitCode=1;
});
