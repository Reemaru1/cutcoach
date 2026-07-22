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
window.localStorage.setItem('cutcoach_library_v1',JSON.stringify({version:1,items:[{id:'legacy-dish',name:'Legacy Gericht',kind:'dish',barcode:'',amount:100,unit:'g',calories:420,protein:25,carbs:45,fat:14,favorite:false,uses:0,lastUsedAt:null,createdAt:new Date().toISOString(),components:[]}]}));

const scripts=['core.js','render.js','actions.js','app.js','food-catalog.js','library.js','library-init.js','scanner-v2.js','off-lookup.js','upgrade-340.js','nutrition.js','journal.js'];
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
  journalScore:()=>window.dailyScore(),
  totals:key=>totals(key),
  duplicateMeal:id=>duplicateMeal(id),
  deleteMeal:id=>deleteMeal(id),
  mealCapacity:()=>mealCapacity(),
  replaceMeals:meals=>commitDayMutation(data=>{data.meals=deepClone(meals)}),
  replaceMealsForDate:(key,meals)=>commitDayMutation(data=>{data.meals=deepClone(meals)},key),
  fillMeals:count=>commitDayMutation(data=>{data.meals=Array.from({length:count},(_,index)=>({id:'limit-'+index,name:'Limit '+index,type:'Frühstück',calories:1,protein:0,carbs:0,fat:0}))}),
  saveSettings:()=>saveSettings(),
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
  assert.equal(window.document.querySelector('#appVersion').textContent,'Version 2.3.0-alpha');
  assert.equal(window.CutCoachFoodCatalog.meta.count,7064,'BLS-Katalog ist unvollständig');
  assert.equal(window.CutCoachFoodCatalog.meta.license,'CC BY 4.0','BLS-Lizenzhinweis fehlt');
  assert.equal(window.CutCoachLibrary.exportData().version,3,'Bibliothek wurde nicht auf das neue Datenmodell migriert');
  assert.equal(window.CutCoachLibrary.exportData().items[0].kind,'recipe','Altes Gericht wurde nicht verlustfrei als Rezept migriert');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_library_v1')).version,3,'Migrierte Bibliothek wurde nicht dauerhaft gespeichert');
  assert.equal(test.state.meta.schemaVersion,7,'Tagebuchdaten wurden nicht auf das Körper-/Trainingsschema migriert');
  assert.equal(test.score(),null,'Leerer Ernährungstag darf keine Tagesnote haben');

  const originalDate=test.selectedDate;
  const originalNavigationSet=window.Storage.prototype.setItem;let navigationStateWrites=0;
  window.Storage.prototype.setItem=function(key,value){if(key==='cutcoach_v2')navigationStateWrites++;return originalNavigationSet.call(this,key,value)};
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
  const calendarCellCount=calendar.querySelectorAll('.journal-calendar-days button').length;
  assert.ok([35,42].includes(calendarCellCount),'Kalender verwendet weder fünf noch sechs vollständige Wochen');
  assert.equal(calendar.querySelectorAll('.journal-calendar-days button:not([data-date])').length,0,'Kalendertag ohne Datum');
  calendar.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
  assert.equal(calendar.hidden,true,'Kalender schließt nicht mit Escape');
  click('#journalDateButton');
  const calendarSelected=calendar.querySelector(`[data-date="${originalDate}"]`);
  assert.ok(calendarSelected,'Ausgewählter Tag fehlt im Kalender');
  assert.equal(calendar.querySelectorAll('.journal-calendar-days button[tabindex="0"]').length,1,'Kalender hat keinen eindeutigen Tab-Stopp');
  assert.equal(calendar.querySelector(`[data-date="${originalDate}"]`).getAttribute('aria-current'),'date','Heutiger Tag ist nicht ausgezeichnet');
  calendarSelected.focus();
  calendarSelected.dispatchEvent(new window.KeyboardEvent('keydown',{key:'ArrowLeft',bubbles:true,cancelable:true}));
  const calendarPrevious=calendar.querySelector(`[data-date="${previousDate}"]`);
  assert.ok(calendarPrevious,'Vortag fehlt im Kalender');
  assert.equal(window.document.activeElement,calendarPrevious,'Pfeiltaste verschiebt den Kalenderfokus nicht');
  assert.equal(test.selectedDate,originalDate,'Kalenderfokus wählt Datum vorzeitig aus');
  calendarPrevious.click();
  assert.equal(test.selectedDate,previousDate,'Kalenderdatum wurde nicht übernommen');
  assert.equal(window.document.querySelector('#today560'),initialRoot,'Kalenderwahl baut das Tagebuch neu auf');
  window.Storage.prototype.setItem=originalNavigationSet;
  assert.equal(navigationStateWrites,0,'Reiner Datumswechsel schreibt unnötig den kompletten Zustand');

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

  const originalCalories=test.state.settings.calories;
  input('#setCalories',originalCalories+100);
  test.saveState=()=>false;test.saveSettings();
  assert.equal(test.state.settings.calories,originalCalories,'Fehlgeschlagene Einstellungen wurden nicht zurückgerollt');
  test.saveState=originalSaveState;
  assert.ok(errors.some(error=>String(error?.message||error).includes('state-save-failed')),'Einstellungsfehler wurde nicht protokolliert');
  errors.length=0;test.render();

  click('[data-journal-water="500"]');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1'))[previousDate],500,'Wasser +500 ml wurde nicht gespeichert');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_undo_v10')).current,500,'Wasser-Rückgängig wurde nicht dauerhaft gespeichert');
  window.sessionStorage.clear();test.render();
  assert.equal(window.document.querySelector('#journalWaterUndo').disabled,false,'Wasser-Rückgängig bleibt deaktiviert');
  assert.match(window.document.querySelector('#journalWaterUndo').textContent,/500/,'Rückgängig zeigt nicht die zuletzt hinzugefügte Wassermenge');
  click('#journalWaterUndo');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1')||'{}')[previousDate],undefined,'Wasseränderung wurde nicht rückgängig gemacht');
  click('[data-journal-water="250"]');window.localStorage.setItem('cutcoach_water_undo_v10',JSON.stringify({date:'2000-01-01',previous:0,current:999}));test.render();
  assert.equal(window.document.querySelector('#journalWaterUndo').disabled,false,'Wasserkorrektur ist ohne Verlauf nicht verfügbar');
  click('#journalWaterUndo');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1')||'{}')[previousDate],undefined,'Sichere −250-ml-Korrektur funktioniert ohne Verlauf nicht');

  const originalStorageSet=window.Storage.prototype.setItem;
  window.Storage.prototype.setItem=function(key,value){if(key==='cutcoach_water_v1')throw new Error('test-storage-failure');return originalStorageSet.call(this,key,value)};
  click('[data-journal-water="250"]');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1')||'{}')[previousDate],undefined,'Fehlgeschlagenes Wasser-Speichern änderte Daten');
  window.Storage.prototype.setItem=originalStorageSet;
  assert.ok(errors.some(error=>String(error?.message||error).includes('test-storage-failure')),'Wasserspeicher-Ausfall wurde nicht protokolliert');
  errors.length=0;

  const corruptWater='{"unvollstaendig"';
  window.localStorage.setItem('cutcoach_water_v1',corruptWater);test.render();
  assert.equal(window.localStorage.getItem('cutcoach_water_recovery_raw_v1'),corruptWater,'Beschädigte Wasserdaten wurden nicht gesichert');
  click('[data-journal-water="250"]');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_water_v1'))[previousDate],250,'Wasser konnte nach Datenrettung nicht neu gespeichert werden');

  click('[data-journal-gym="true"]');
  assert.equal(test.day(previousDate,false).gym,true,'Training Ja wurde nicht gespeichert');
  click('[data-journal-alcohol="false"]');
  assert.equal(test.day(previousDate,false).alcohol,false,'Alkohol Nein wurde nicht gespeichert');
  assert.equal(window.document.querySelector('[data-journal-alcohol="false"]').getAttribute('aria-pressed'),'true');

  const breakfastAdd=window.document.querySelector('.journal-meal-add[data-add-journal-meal="Frühstück"]');
  breakfastAdd.click();
  assert.equal(window.document.querySelector('[data-screen="food"]').classList.contains('active'),true,'Mahlzeiten-Plus öffnet Ernährung nicht');
  assert.equal(window.document.querySelector('#nutritionTitle').textContent,'Frühstück','Mahlzeitenkategorie wurde nicht übernommen');
  assert.equal(window.document.querySelector('#nutritionMealSelect').value,'Frühstück','Mahlzeitenwechsler startet in der falschen Kategorie');
  assert.match(window.document.querySelector('#nutritionDayBudgetLabel').textContent,/Noch 2\.300 kcal/,'Tagesbudget fehlt im Ernährungsbereich');
  input('#nutritionSearch','Pizza');await wait(400);
  const pizzaSearch=window.CutCoachNutritionSearch710?.performance?.();
  assert.equal(window.CutCoachNutritionSearch710?.version,'7.1.0','Optimierte Suchengine ist nicht aktiv');
  assert.ok(pizzaSearch?.candidateCount>=7064,'Pizza-Suche erfasst nicht den vollständigen Katalog');
  assert.ok(pizzaSearch?.directMatches>=3,'Pizza-Suche findet zu wenige direkte Treffer');
  assert.equal(pizzaSearch?.fuzzyPass,false,'Direkte Pizza-Treffer lösen unnötig die unscharfe Vollsuche aus');
  assert.match(window.document.querySelector('#nutritionResultTitle').textContent,/Pizza/,'Pizza-Ergebnisse werden nicht beschriftet');
  input('#nutritionSearch','');await wait(80);
  const mealSelect=window.document.querySelector('#nutritionMealSelect');mealSelect.value='Mittagessen';mealSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(window.document.querySelector('#nutritionTitle').textContent,'Mittagessen','Mahlzeit kann im Ernährungsbereich nicht gewechselt werden');
  assert.equal(window.document.body.dataset.nutritionMealType,'Mittagessen','Mahlzeitenwechsel aktualisiert den Eintragskontext nicht');
  mealSelect.value='Frühstück';mealSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
  assert.equal(window.document.querySelector('[data-tab="today"]').classList.contains('active'),true,'Ernährung verliert die Tagebuch-Orientierung');
  assert.equal(window.document.querySelector('#nutritionCopyPrevious').hidden,true,'Leere Vortagsaktion nimmt unnötig Platz ein');
  assert.match(window.document.querySelector('#nutritionCoachText').textContent,/2\.300 kcal.*190 g Eiweiß/,'Intelligenter Tageskontext fehlt');
  assert.equal(window.document.querySelector('#nutritionProteinGap').textContent,'190 g offen','Makro-Kompass startet mit falschem Eiweiß-Restwert');
  click('#nutritionRecipe');
  assert.equal(window.document.querySelector('#libraryItemModal').classList.contains('open'),true,'Rezept-Schnellaktion öffnet den Editor nicht');
  assert.equal(window.document.querySelector('[data-kind="recipe"]').classList.contains('on'),true,'Rezept-Schnellaktion startet im falschen Modus');
  click('#libraryItemModal [data-library-close]');
  click('#nutritionNewFood');
  assert.equal(window.document.querySelector('[data-kind="food"]').classList.contains('on'),true,'Lebensmittel-Schnellaktion startet im falschen Modus');
  click('#libraryItemModal [data-library-close]');
  click('#nutritionBarcode');
  assert.equal(window.document.querySelector('#scannerModal').classList.contains('open'),true,'Barcode-Schnellaktion öffnet den Scanner nicht');
  click('#scannerModal [data-library-close]');
  click('#nutritionManual');
  input('#mealName','Stabilitätstest');input('#mealQuantity',350);window.document.querySelector('#mealUnit').value='g';input('#mealCalories',1200);input('#mealProtein',100);input('#mealCarbs',100);input('#mealFat',35);input('#mealFiber',12.34);input('#mealSugar',8.75);input('#mealSaturatedFat',4.25);input('#mealSalt',1.15);
  click('#saveMeal');
  assert.equal(test.day(previousDate,false).meals.length,1,'Manuelle Mahlzeit wurde nicht gespeichert');
  assert.equal(JSON.parse(window.localStorage.getItem('cutcoach_v2')).days[previousDate].meals.length,1,'Mahlzeit fehlt im lokalen Speicher');
  const mealId=test.day(previousDate,false).meals[0].id;
  assert.equal(test.day(previousDate,false).meals[0].quantity,350,'Manuelle Portionsmenge wurde nicht gespeichert');
  assert.equal(test.day(previousDate,false).meals[0].fiber,12.34,'Ballaststoffe wurden nicht präzise gespeichert');
  assert.equal(test.totals(previousDate).fiber,12.34,'Erweiterte Nährwerte fehlen in der Tagesrechnung');
  assert.equal(test.totals(previousDate).nutrientCoverage.fiber,1,'Nährwertabdeckung wird falsch berechnet');
  assert.equal(window.document.querySelector('#nutritionCurrentToggle').hidden,false,'Eingetragene Mahlzeit kann nicht aufgeklappt werden');
  click('#nutritionCurrentToggle');
  assert.ok(window.document.querySelector(`[data-nutrition-edit="${mealId}"]`),'Bearbeiten fehlt im Ernährungsbereich');
  assert.ok(window.document.querySelector(`[data-nutrition-copy="${mealId}"]`),'Duplizieren fehlt im Ernährungsbereich');
  assert.ok(window.document.querySelector(`[data-nutrition-delete="${mealId}"]`),'Löschen fehlt im Ernährungsbereich');
  click(`[data-nutrition-edit="${mealId}"]`);assert.equal(window.document.querySelector('#mealModal').classList.contains('open'),true,'Mahlzeit lässt sich nicht bearbeiten');click('#mealModal [data-close]');
  click('#nutritionManual');assert.equal(window.document.querySelector('#mealModalTitle').textContent,'Mahlzeit hinzufügen','Manuelle Eingabe behält fälschlich den Bearbeitungsmodus');assert.equal(window.document.querySelector('#mealName').value,'','Manuelle Eingabe übernimmt Daten der zuvor bearbeiteten Mahlzeit');click('#mealModal [data-close]');
  assert.match(window.document.querySelector('#nutritionDayBudgetLabel').textContent,/Noch 1\.100 kcal/,'Tagesbudget reagiert nicht auf eingetragene Kalorien');
  click(`[data-nutrition-copy="${mealId}"]`);assert.equal(test.day(previousDate,false).meals.length,2,'Mahlzeit wurde nicht dupliziert');
  click(`[data-nutrition-delete="${mealId}"]`);assert.equal(test.day(previousDate,false).meals.length,1,'Mahlzeit wurde nicht gelöscht');

  const quickFood={id:'quick-food',name:'Schneller Skyr',kind:'food',barcode:'',amount:250,unit:'g',calories:160,protein:27,carbs:10,fat:1,favorite:true,uses:0,lastUsedAt:null,createdAt:new Date().toISOString(),components:[]};
  const streetFood={id:'street-food',name:'Fitness-Straße Bowl',kind:'food',barcode:'',amount:300,unit:'g',calories:420,protein:32,carbs:48,fat:9,favorite:false,uses:0,lastUsedAt:null,createdAt:new Date().toISOString(),components:[]};
  const routineFood={id:'routine-food',name:'Hafer Routine',kind:'food',barcode:'',amount:100,unit:'g',calories:370,protein:13,carbs:59,fat:7,favorite:false,uses:0,lastUsedAt:null,createdAt:new Date().toISOString(),components:[]};
  const routineDateOne=test.shiftKey(previousDate,-2),routineDateTwo=test.shiftKey(previousDate,-3);
  assert.equal(test.replaceMealsForDate(routineDateOne,[{id:'routine-1',name:'Hafer Routine',type:'Frühstück',calories:370,protein:13,carbs:59,fat:7}]),true,'Erster Routinetag konnte nicht vorbereitet werden');
  assert.equal(test.replaceMealsForDate(routineDateTwo,[{id:'routine-2',name:'Hafer Routine',type:'Frühstück',calories:370,protein:13,carbs:59,fat:7}]),true,'Zweiter Routinetag konnte nicht vorbereitet werden');
  assert.equal(window.CutCoachLibrary.importData({version:1,items:[quickFood,streetFood,routineFood]}),true,'Test-Lebensmittel konnten nicht vorbereitet werden');
  await wait(80);
  assert.ok(window.document.querySelector('[data-nutrition-add="quick-food"]'),'Direktes Hinzufügen fehlt');
  assert.equal(window.document.querySelector('[data-filter-count="favorite"]').textContent,'1','Filterzähler ist nicht aktuell');
  assert.equal(window.document.querySelector('.nutrition-result-row [data-nutrition-open]')?.dataset.nutritionOpen,'routine-food','Frühstücksroutine wird nicht priorisiert');
  assert.ok(window.document.querySelector('[data-nutrition-open="routine-food"] .nutrition-routine'),'Routinenhinweis fehlt');
  const libraryCountBeforeCatalog=window.CutCoachLibrary.count();
  input('#nutritionSearch','200 g haferflocken');await wait(80);
  assert.ok(window.document.querySelector('[data-nutrition-open="bls:C133000"]'),'Zusammengeschriebene Suche findet Haferflocken im BLS nicht');
  assert.ok(window.document.querySelector('[data-nutrition-open="bls:C133000"] .nutrition-source'),'BLS-Treffer ist nicht als offizielle Quelle gekennzeichnet');
  assert.match(window.document.querySelector('#nutritionSearchIntent').textContent,/200 g/,'Natürlich eingegebene Portionsmenge wird nicht erkannt');
  assert.match(window.document.querySelector('[data-nutrition-open="bls:C133000"] .nutrition-result-copy small').textContent,/200 g/,'Suchtreffer übernimmt die erkannte Portionsmenge nicht');
  assert.equal(window.document.querySelector('[data-nutrition-open="bls:C133000"]').closest('.nutrition-result-row').querySelector('.nutrition-result-energy b').textContent,'696 kcal','Treffer berechnet die erkannte Portion falsch');
  click('[data-nutrition-open="bls:C133000"]');
  assert.equal(window.document.querySelector('#libraryUseModal').classList.contains('open'),true,'BLS-Treffer öffnet keine Portionswahl');
  assert.match(window.document.querySelector('#libraryUseSummary').textContent,/BLS 4\.0/,'Portionswahl verliert die BLS-Quelle');
  assert.equal(window.document.querySelector('#libraryExactAmount').value,'200','Portionsdialog übernimmt die Textmenge nicht');
  assert.match(window.document.querySelector('#factorPreview').textContent,/696 kcal/,'Portionsvorschau berechnet die Textmenge falsch');
  assert.ok(window.document.querySelectorAll('#libraryPortionPresets button').length>=4,'Schnelle Portionsgrößen fehlen');
  assert.equal(window.CutCoachLibrary.count(),libraryCountBeforeCatalog,'Reines Öffnen schreibt einen Katalogtreffer in die persönliche Bibliothek');
  click('#libraryUseModal [data-library-close]');
  click('[data-nutrition-add="bls:C133000"]');
  const catalogMeal=test.day(previousDate,false).meals.find(meal=>meal.name==='Hafer Flocken');
  assert.ok(catalogMeal,'BLS-Schnell-Plus hat nichts eingetragen');
  assert.equal(catalogMeal.calories,696,'BLS-Portionskalorien wurden falsch berechnet');
  assert.equal(catalogMeal.protein,26.44,'BLS-Makros verlieren unnötig Genauigkeit');
  assert.equal(catalogMeal.fiber,21.96,'BLS-Zusatznährwerte fehlen in der Mahlzeit');
  assert.equal(catalogMeal.quantity,200,'BLS-Portionsmenge fehlt in der Mahlzeit');
  assert.equal(catalogMeal.source,'bls','BLS-Quelle fehlt im Mahlzeiteneintrag');
  const importedCatalogItem=window.CutCoachLibrary.exportData().items.find(item=>item.id==='bls:C133000');
  assert.equal(importedCatalogItem?.source,'bls','Genutzter BLS-Treffer verliert seine Quelle');
  assert.equal(importedCatalogItem?.fiber,10.98,'Erweiterte BLS-Nährwerte gehen beim Import verloren');
  click('#nutritionUndoAdd');
  assert.equal(test.day(previousDate,false).meals.some(meal=>meal.id===catalogMeal.id),false,'BLS-Eintragung wurde nicht rückgängig gemacht');
  input('#nutritionSearch','haferfloken');await wait(80);
  assert.ok(window.document.querySelector('[data-nutrition-open="bls:C133000"]'),'Tippfehler-tolerante Suche findet Haferflocken nicht');
  input('#nutritionSearch','hähnchenbrust');await wait(80);
  assert.ok(window.document.querySelector('[data-nutrition-open="bls:V4A6182"]'),'Zusammengeschriebene Suche findet Hähnchenbrust im BLS nicht');
  input('#nutritionSearch','');await wait(80);
  input('#nutritionSearch','kaffee');await wait(80);assert.equal(window.document.querySelector('.nutrition-result-icon').textContent,'☕','Kaffee erhält kein passendes Treffer-Icon');
  input('#nutritionSearch','');await wait(80);
  input('#nutritionSearch','fitness strasse');await wait(80);assert.ok(window.document.querySelector('[data-nutrition-open="street-food"]'),'Suche findet Umlaute und ß nicht fehlertolerant');
  click('[data-nutrition-filter="favorite"]');input('#nutritionSearch','fitness strasse bowl');await wait(80);assert.equal(window.document.querySelector('[data-nutrition-filter="all"]').classList.contains('active'),true,'Neue Suche bleibt unbemerkt in einem einschränkenden Filter');assert.ok(window.document.querySelector('[data-nutrition-open="street-food"]'),'Globale Suche blendet Nicht-Favoriten aus');
  input('#nutritionSearch','Mein neues Müsli');await wait(80);click('[data-nutrition-empty-add]');assert.equal(window.document.querySelector('#libName').value,'Mein neues Müsli','Nicht gefundener Suchbegriff wird beim Anlegen nicht übernommen');click('#libraryItemModal [data-library-close]');input('#nutritionSearch','');await wait(80);
  mealSelect.value='Mittagessen';mealSelect.dispatchEvent(new window.Event('change',{bubbles:true}));
  click('[data-nutrition-add="quick-food"]');
  const quickMeal=test.day(previousDate,false).meals.find(meal=>meal.name==='Schneller Skyr');
  assert.ok(quickMeal,'Schnell-Plus hat nichts eingetragen');
  assert.equal(quickMeal.type,'Mittagessen','Schnell-Plus verwendet nach dem Mahlzeitenwechsel die falsche Kategorie');
  assert.equal(window.document.querySelector('#libraryUseModal').classList.contains('open'),false,'Schnell-Plus öffnet unnötig den Portionsdialog');
  assert.equal(window.document.querySelector('#nutritionFeedback').hidden,false,'Rückgängig-Hinweis fehlt nach Schnell-Eintragung');
  assert.match(window.document.querySelector('#nutritionFeedbackText').textContent,/Mittagessen/,'Eintragsbestätigung nennt die falsche Mahlzeit');
  assert.equal(window.CutCoachLibrary.exportData().items[0].uses,1,'Nutzungszähler wurde nicht aktualisiert');
  click('#nutritionUndoAdd');
  assert.equal(test.day(previousDate,false).meals.some(meal=>meal.id===quickMeal.id),false,'Schnell-Eintragung wurde nicht rückgängig gemacht');
  assert.equal(window.CutCoachLibrary.exportData().items[0].uses,0,'Rückgängig stellt den Nutzungszähler nicht wieder her');
  mealSelect.value='Frühstück';mealSelect.dispatchEvent(new window.Event('change',{bubbles:true}));

  const mealsBeforeFailedQuickAdd=test.day(previousDate,false).meals.length;
  test.saveState=()=>false;click('[data-nutrition-add="quick-food"]');test.saveState=originalSaveState;
  assert.equal(test.day(previousDate,false).meals.length,mealsBeforeFailedQuickAdd,'Fehlgeschlagene Schnell-Eintragung blieb im Tagebuch');
  assert.equal(window.CutCoachLibrary.exportData().items[0].uses,0,'Fehlgeschlagene Schnell-Eintragung änderte den Nutzungszähler');
  assert.ok(errors.some(error=>String(error?.message||error).includes('day-save-failed')),'Speicherfehler der Schnell-Eintragung wurde nicht protokolliert');
  errors.length=0;

  const setItemBeforeLibraryFailure=window.Storage.prototype.setItem;
  window.Storage.prototype.setItem=function(key,value){if(key==='cutcoach_library_v1')throw new Error('library-write-failed');return setItemBeforeLibraryFailure.call(this,key,value)};
  click('[data-nutrition-add="quick-food"]');window.Storage.prototype.setItem=setItemBeforeLibraryFailure;
  assert.equal(test.day(previousDate,false).meals.length,mealsBeforeFailedQuickAdd,'Bibliotheksfehler erzeugte trotzdem eine Mahlzeit');
  assert.equal(window.CutCoachLibrary.exportData().items[0].uses,0,'Bibliotheksfehler änderte den Nutzungszähler');

  click('[data-nutrition-open="quick-food"]');
  assert.equal(window.document.querySelector('#libraryUseModal').classList.contains('open'),true,'Trefferzeile öffnet die Portionswahl nicht');
  assert.equal(window.document.querySelector('#libraryMealType').value,'Frühstück','Portionswahl übernimmt die Mahlzeitenkategorie nicht');
  assert.equal(window.document.querySelector('#libraryExactAmount').value,'250','Portionswahl startet nicht mit der gespeicherten Basisportion');
  input('#libraryExactAmount','');assert.equal(window.document.querySelector('#addLibraryMeal').disabled,true,'Ungültige leere Portion bleibt eintragbar');
  input('#libraryExactAmount',125);assert.equal(window.document.querySelector('#addLibraryMeal').disabled,false,'Gültige exakte Portion bleibt gesperrt');assert.match(window.document.querySelector('#factorPreview').textContent,/80 kcal/,'Exakte Portion wird falsch berechnet');
  click('#libraryUseModal [data-library-close]');

  const earlierDate=test.shiftKey(previousDate,-1);
  assert.equal(test.replaceMealsForDate(earlierDate,[
    {id:'earlier-breakfast',name:'Vortagsfrühstück',type:'Frühstück',calories:420,protein:30,carbs:45,fat:12},
    {id:'earlier-dinner',name:'Vortagsabendessen',type:'Abendessen',calories:800,protein:50,carbs:70,fat:25}
  ]),true,'Vortag konnte für den Kategorietest nicht vorbereitet werden');
  test.render();
  assert.equal(window.document.querySelector('#nutritionCopyPrevious').disabled,false,'Kategoriepassender Vortag wird nicht angeboten');
  const beforePreviousCopy=test.day(previousDate,false).meals.length;
  click('#nutritionCopyPrevious');
  const copiedMeals=test.day(previousDate,false).meals.slice(beforePreviousCopy);
  assert.equal(copiedMeals.length,1,'Vortagsübernahme kopiert die falsche Anzahl');
  assert.equal(copiedMeals[0].name,'Vortagsfrühstück','Vortagsübernahme kopiert eine andere Mahlzeitenkategorie');
  assert.equal(test.day(previousDate,false).meals.some(meal=>meal.name==='Vortagsabendessen'),false,'Vortagsübernahme mischt Mahlzeitenkategorien');

  const keptMeals=JSON.parse(JSON.stringify(test.day(previousDate,false).meals));
  click('#nutritionBack');
  assert.equal(window.document.querySelector('[data-screen="today"]').classList.contains('active'),true,'Zurück aus Ernährung funktioniert nicht');
  assert.match(window.location.search,new RegExp(`date=${previousDate}`),'Zurück aus Ernährung verliert das ausgewählte Datum');

  assert.equal(test.fillMeals(499),true,'Tageslimit konnte für Grenztest nicht vorbereitet werden');
  window.document.querySelector('.journal-meal-add[data-add-journal-meal="Frühstück"]').click();
  assert.equal(window.document.querySelector('[data-nutrition-add="quick-food"]').disabled,false,'Letzter freier Platz wird zu früh gesperrt');
  click('[data-nutrition-add="quick-food"]');
  assert.equal(test.day(previousDate,false).meals.length,500,'Schnell-Plus nutzt den letzten freien Platz nicht korrekt');
  assert.equal(window.document.querySelector('[data-nutrition-add="quick-food"]').disabled,true,'Schnell-Plus bleibt am Tageslimit aktiv');
  click('[data-nutrition-add="quick-food"]');
  assert.equal(test.day(previousDate,false).meals.length,500,'Deaktiviertes Schnell-Plus überschreitet das Tageslimit');
  click('#nutritionBack');
  assert.equal(test.mealCapacity(),0,'Tageslimit wird falsch berechnet');
  test.duplicateMeal('limit-0');assert.equal(test.day(previousDate,false).meals.length,500,'Tageslimit wurde beim Duplizieren überschritten');
  assert.match(window.document.querySelector('#toast').textContent,/Maximal 500 Mahlzeiten/,'Tageslimit wird nicht erklärt');
  assert.equal(test.replaceMeals(keptMeals),true,'Grenztest konnte nicht sauber zurückgesetzt werden');test.render();

  assert.ok(test.score()>=0&&test.score()<=10,'Tagesnote liegt außerhalb 0–10');
  assert.notEqual(window.document.querySelector('#journalScore').textContent,'Offen','Tagesnote bleibt trotz Mahlzeit offen');
  click('#journalWeightButton');input('#weightInput','97.2');click('#saveWeight');
  assert.equal(test.day(previousDate,false).weight,97.2,'Gewicht wurde nicht gespeichert');
  assert.equal(window.document.querySelector('#journalCheckStatus').textContent,'Basischeck 3/3','Tagescheck erkennt vollständige Basisangaben nicht');

  input('#setSteps',0);input('#setGymGoal',0);test.saveSettings();
  assert.equal(window.document.querySelector('#journalStepPct').textContent,'Kein Ziel','Deaktiviertes Schrittziel wird als 0 % dargestellt');
  const trainingScore=test.journalScore();click('[data-journal-gym="false"]');const restScore=test.journalScore();
  assert.equal(restScore,trainingScore,'Ruhetag wird trotz Gym-Ziel 0 abgewertet');

  for(let index=0;index<10;index++)test.render();
  assert.equal(window.document.querySelectorAll('#today560').length,1,'Wiederholtes Rendern erzeugt Duplikate');
  assert.equal(errors.length,0,`Unerwartete Browserfehler: ${errors.map(error=>error.message).join(' | ')}`);

  const manifest=fs.readFileSync(path.join(project,'runtime-manifest.js'),'utf8');
  assert.match(manifest,/version:'2\.3\.0-alpha'/,'Offline-Cache hat falsche Version');
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
  for(const name of scripts){assert.ok(indexSource.includes(`${name}?`),`Produktiver Erststart lädt ${name} nicht direkt`);assert.ok(manifest.includes(`./${name}?`),`Offline-Manifest enthält ${name} nicht`)}
  assert.ok(indexSource.includes('nutrition.css?v=7.0.0')&&manifest.includes('./nutrition.css?v=7.0.0'),'Ernährungsdesign ist nicht cache-sicher versioniert');
  assert.ok(indexSource.includes('library.css?v=7.0.0')&&manifest.includes('./library.css?v=7.0.0'),'Portionsdialog ist nicht cache-sicher versioniert');
  const updateSource=fs.readFileSync(path.join(project,'update.html'),'utf8');
  assert.ok(updateSource.includes("location.replace('./?updated=221a#today')"),'Update-Seite leitet auf einen veralteten Cache-Marker weiter');
  assert.ok(indexSource.indexOf('food-catalog.js?v=7.0.0')<indexSource.indexOf('library.js?v=7.0.0'),'Katalog wird nach der Bibliothek geladen');
  const nutritionCss=fs.readFileSync(path.join(project,'nutrition.css'),'utf8');
  assert.match(nutritionCss,/body\.nutrition-mode\{[^}]*min-height:100dvh/,'Ernährungsansicht füllt den dynamischen iOS-Viewport nicht');
  assert.match(nutritionCss,/body\.journal-mode nav,body\.nutrition-mode nav\{[^}]*inset:auto 0 0 0!important/,'Ernährungsnavigation ist nicht wie im Tagebuch unten verankert');
  assert.match(nutritionCss,/body\.journal-mode nav,body\.nutrition-mode nav\{[^}]*min-height:86px!important;max-height:86px!important/,'Navigationshöhe kann im Ernährungsmodus aufwachsen');
  assert.equal(indexSource.includes('date-bootstrap.js'),false,'Entfernter Datums-Bootstrap wird noch geladen');

  const startupDom=new JSDOM('<!doctype html><div id="toast"></div>',{url:`https://example.test/cutcoach/index.html?date=${previousDate}#today`,runScripts:'dangerously'});
  const startupScript=startupDom.window.document.createElement('script');startupScript.textContent=fs.readFileSync(path.join(project,'core.js'),'utf8');startupDom.window.document.head.append(startupScript);
  const startupBridge=startupDom.window.document.createElement('script');startupBridge.textContent='window.__selectedDate=selectedDate;';startupDom.window.document.head.append(startupBridge);
  assert.equal(startupDom.window.__selectedDate,previousDate,'Direktaufruf eines vergangenen Tages startet mit falschem Datum');
  const corruptLibrary='{"items":';startupDom.window.localStorage.setItem('cutcoach_library_v1',corruptLibrary);const libraryScript=startupDom.window.document.createElement('script');libraryScript.textContent=fs.readFileSync(path.join(project,'library.js'),'utf8');startupDom.window.document.head.append(libraryScript);
  assert.equal(startupDom.window.localStorage.getItem('cutcoach_library_recovery_raw_v1'),corruptLibrary,'Beschädigte Bibliothek wurde nicht gesichert');startupDom.window.close();
  console.log('journal regression: ok');
  dom.window.close();
})().catch(error=>{
  console.error(error);
  dom.window.close();
  process.exitCode=1;
});
