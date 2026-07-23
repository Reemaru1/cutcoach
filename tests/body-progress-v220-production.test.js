'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const html=`<!doctype html><html><body><div class="app"><header class="app-header"></header><div class="date-nav"></div><main><section class="screen" data-screen="today"></section><section class="screen" data-screen="food"></section><section class="screen active" data-screen="progress"></section><section class="screen" data-screen="settings"></section></main></div><nav aria-label="Hauptnavigation"><button data-tab="today">Heute</button><button data-tab="food">Ernährung</button><button class="active" data-tab="progress">Fortschritt</button><button data-tab="settings">Einstellungen</button></nav><div id="toast"></div></body></html>`;
  const dom=new JSDOM(html,{url:'https://example.test/cutcoach/?date=2026-07-22#progress',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.scrollTo=()=>{};
  w.confirm=()=>true;
  const raw={settings:{age:28,height:179,calories:2300,maintenance:3000,protein:190,fat:65,carbs:200,steps:6000,gymGoal:4,goalWeight:90},days:{
    '2026-07-08':{weight:98,waist:104,meals:[{id:'m1',name:'Tag',type:'Snack',calories:2300,protein:190,carbs:200,fat:65}],steps:6000,gym:false,alcohol:false},
    '2026-07-15':{weight:97,waist:102,meals:[{id:'m2',name:'Tag',type:'Snack',calories:2250,protein:195,carbs:190,fat:63}],steps:6500,gym:true,alcohol:false},
    '2026-07-22':{weight:96,waist:100,bodyFat:21.5,meals:[{id:'m3',name:'Tag',type:'Snack',calories:2200,protein:200,carbs:185,fat:61}],steps:7200,gym:true,alcohol:false,workout:{duration:55,recovery:8,exercises:[{id:'e1',name:'Schulterdrücken',muscle:'shoulders',secondary:['arms'],sets:4,reps:10,weight:25,rpe:8},{id:'e2',name:'Seitheben',muscle:'shoulders',secondary:[],sets:3,reps:12,weight:10,rpe:8}]}}
  },onboarded:true,meta:{schemaVersion:6,createdAt:'2026-07-01T00:00:00.000Z',lastBackupAt:null}};
  w.localStorage.setItem('cutcoach_v2',JSON.stringify(raw));
  for(const file of ['core.js','glass-nav-v131.js','body-progress-v220.js']){const script=w.document.createElement('script');script.textContent=read(file);w.document.head.append(script)}
  if(w.document.readyState==='loading')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await wait(40);

  assert.equal(w.eval('state.meta.schemaVersion'),7,'Altdaten müssen auf das Körper-/Trainingsschema 7 migrieren.');
  assert.equal(w.eval("state.days['2026-07-22'].waist"),100);
  assert.equal(w.eval("state.days['2026-07-22'].workout.exercises.length"),2);
  assert.equal(w.document.querySelectorAll('.bp220-left article').length,3);
  assert.equal(w.document.querySelectorAll('.bp220-right article').length,2);
  assert.match(w.document.querySelector('#bp220Figure').src,/body-progress-body-v3\.png/);
  assert.equal(w.document.querySelector('.bp220-topbar'),null,'Die doppelte CutCoach-Kopfleiste muss vollständig entfernt sein.');
  assert.equal(w.document.querySelector('.bp220-quick-menu'),null,'Entfernte Header-Funktionen dürfen kein verstecktes Menü hinterlassen.');
  const nav=w.document.querySelector('nav[aria-label="Hauptnavigation"]'),navMarkup=nav.innerHTML;
  assert.equal(nav.querySelectorAll(':scope > button').length,4,'Die Hauptnavigation muss in jedem Bereich aus genau vier Einträgen bestehen.');
  assert.equal(nav.querySelectorAll('[data-bp220-training-nav]').length,0,'Training wird ausschließlich innerhalb des Fortschrittsbereichs umgeschaltet.');
  assert.equal(nav.querySelector('[data-tab="food"]').dataset.glassNavKey,'food','Der zentrale Plus-Button muss unverändert bleiben.');
  const body=w.CutCoachBodyProgress220.snapshot();
  assert.equal(Math.round(body.waistChange*10)/10,-3.8,'Taillenänderung muss aus echten Messungen berechnet werden.');
  assert.equal(Math.round(body.progress*100),25,'Zielkurs muss aus Start-, Ist- und Zielgewicht berechnet werden.');

  await w.CutCoachBodyProgress220.setMode('training');await wait(20);
  const training=w.CutCoachBodyProgress220.snapshot();
  assert.equal(training.volume,1360,'Trainingsvolumen muss aus Sätzen × Wiederholungen × Gewicht entstehen.');
  assert.equal(training.focusKey,'shoulders','Stärkste protokollierte Muskelgruppe muss datengetrieben sein.');
  assert.equal(training.recovery,8,'Regeneration darf nur aus eigener Bewertung stammen.');
  assert.match(w.document.querySelector('#bp220Figure').src,/body-progress-training-v3\.png/);
  assert.equal(w.document.querySelectorAll('.bp220-right article').length,3);
  assert.equal(nav.innerHTML,navMarkup,'Ein Moduswechsel darf die globale Navigation weder umsortieren noch verändern.');
  assert.equal(nav.querySelector('[data-tab="progress"]').classList.contains('active'),true,'Progress bleibt auch im Trainingsmodus der aktive Hauptbereich.');
  assert.doesNotMatch(w.document.querySelector('.bp220-shell').textContent,/92% Fokus-Treffer|18,6 t|7,8 \/10/,'Referenzwerte dürfen nicht hart codiert sein.');

  w.CutCoachBodyProgress220.openMeasurement('2026-07-22');
  assert.equal(w.document.querySelector('#bp220SaveMeasurement').disabled,true,'Unveränderte Messungen bleiben unnötig speicherbar.');
  w.document.querySelector('#bp220MeasurementWeight').value='500';w.document.querySelector('#bp220MeasurementWeight').dispatchEvent(new w.Event('input',{bubbles:true}));
  w.document.querySelector('#bp220SaveMeasurement').click();await wait(20);
  assert.equal(w.eval("state.days['2026-07-22'].weight"),96,'Ungültige Teilwerte dürfen keine vorhandene Messung löschen.');
  w.document.querySelector('#bp220MeasurementWeight').value='96';w.document.querySelector('#bp220MeasurementWeight').dispatchEvent(new w.Event('input',{bubbles:true}));
  w.document.querySelector('#bp220MeasurementWaist').value='99.5';w.document.querySelector('#bp220MeasurementWaist').dispatchEvent(new w.Event('input',{bubbles:true}));
  w.document.querySelector('#bp220SaveMeasurement').click();await wait(20);
  assert.equal(w.eval("state.days['2026-07-22'].waist"),99.5,'Messungsmodal muss transaktional in CutCoach speichern.');

  w.CutCoachBodyProgress220.openWorkout('2026-07-22');
  w.document.querySelector('#bp220ClearWorkout').click();await wait(20);
  assert.equal(w.eval("state.days['2026-07-22'].workout"),null,'Detailliertes Training muss gezielt entfernbar sein.');
  assert.equal(w.eval("state.days['2026-07-22'].gym"),true,'Das Entfernen von Trainingsdetails darf den allgemeinen Gym-Tag nicht löschen.');

  w.eval("commitDayMutation(data=>{data.gym=true;data.workout={duration:30,recovery:7,exercises:[{id:'bw-old',name:'Liegestütze',muscle:'chest',secondary:['arms'],sets:4,reps:12,weight:0,rpe:8}]}},'2026-07-14')");
  w.eval("commitDayMutation(data=>{data.gym=true;data.workout={duration:35,recovery:8,exercises:[{id:'bw-new',name:'Liegestütze',muscle:'chest',secondary:['arms'],sets:6,reps:12,weight:0,rpe:8}]}},'2026-07-21')");
  const bodyweightTraining=w.CutCoachBodyProgress220.snapshot();
  assert.equal(bodyweightTraining.comparisonKind,'sets','Reines Körpergewichtstraining muss über Arbeitssätze statt erfundene Kilogramm verglichen werden.');
  assert.equal(bodyweightTraining.volumeDelta,50,'Der Arbeitssatzvergleich muss die Veränderung zwischen den Zeiträumen korrekt berechnen.');

  const emptyRaw={...raw,settings:{...raw.settings,goalWeight:null},days:{'2026-07-22':{meals:[],weight:null,waist:null,bodyFat:null,steps:null,gym:null,alcohol:null,workout:null}}};
  const clean=w.eval(`sanitizeState(${JSON.stringify(emptyRaw)})`);
  assert.equal(clean.days['2026-07-22'].workout,null);
  assert.equal(w.eval(`isDayEmpty(sanitizeDay(${JSON.stringify(emptyRaw.days['2026-07-22'])}))`),true,'Leere erweiterte Tage müssen weiterhin bereinigt werden können.');
  assert.doesNotMatch(read('body-progress-v220.js'),/Fettverbrennung im Bauchbereich|92%|18,6\s*t|7,8\s*\/10|\[0,\.2,\.3,\.5\]/,'Die Produktion darf keine erfundenen Referenzmetriken oder Ersatzkurven enthalten.');
  assert.doesNotMatch(read('body-progress-v220.js'),/bp220-five-nav|data-bp220-training-nav|FOOD_PROGRESS_ICON|bp220-topbar/,'Body Progress darf Header und globale Navigation nicht mehr umbauen.');
  assert.doesNotMatch(read('body-progress-v220.css'),/bp220-five-nav|bp220-topbar|bp220-quick-menu/,'Entfernte Header- und Fünfer-Navigationstyles dürfen nicht zurückbleiben.');
  assert.match(read('body-progress-v220.css'),/\.bp220-modal \.two\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)!important\}/,'Die Datums- und Dauerfelder sind auf iPhones nicht gegen Überlauf abgesichert.');
  assert.match(read('body-progress-v220.css'),/#bp220SaveWorkout\{[^}]*background:linear-gradient\(145deg,rgba\(255,112,88,.12\)/,'Die Trainingsaktion nutzt nicht die neue ruhige Premium-Sprache.');
  for(const asset of ['assets/body-progress-body-v3.png','assets/body-progress-training-v3.png','assets/body-progress-neutral-v3.png']){
    const bytes=fs.readFileSync(path.join(root,asset));assert.equal(bytes.subarray(1,4).toString(),'PNG',`${asset} muss als lokales PNG-Asset vorliegen.`);
  }
  assert.match(read('index.html'),/body-progress-v220\.js\?v=2\.2\.3-production/);
  assert.match(read('runtime-manifest.js'),/assets\/body-progress-training-v3\.png\?v=2\.2\.0/);
  assert.match(read('sw.js'),/body221-production-audit/);
  dom.window.close();
  console.log('Body Progress 2.2.2: stabile Navigation, sichere Änderungszustände, validierte Eingaben, echte Trends, Muskelmapping und Offline-Assets geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
