'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const js=read('body-progress-v211.js');
  const css=read('body-progress-v211.css');
  const nav=read('glass-nav-v131.js');
  const sw=read('sw.js');
  const bodyAsset=read('body-progress-body-v211.b64').trim();
  const trainingAsset=read('body-progress-training-v211.b64').trim();
  const pkg=JSON.parse(read('package.json'));

  assert.match(js,/const VERSION='2\.1\.1-reference'/);
  assert.match(js,/CutCoachBodyProgress210/,'Der Neubau muss die getestete v210-Datenlogik wiederverwenden.');
  assert.match(js,/body-progress-body-v211\.b64\?v=2\.1\.1-reference/);
  assert.match(js,/body-progress-training-v211\.b64\?v=2\.1\.1-reference/);
  assert.match(js,/<img id="bp211Figure"/);
  assert.match(js,/data-bp211-training-nav/);
  assert.doesNotMatch(js,/function bodySvg\(/,'Die alte SVG-Puppe darf nicht in den Referenzneubau zurückkehren.');
  assert.ok(bodyAsset.startsWith('UklGR'),'Body-Referenzasset muss ein WebP-Datenstrom sein.');
  assert.ok(trainingAsset.startsWith('UklGR'),'Training-Referenzasset muss ein WebP-Datenstrom sein.');
  assert.ok(bodyAsset.length>3000&&trainingAsset.length>3000,'Beide Referenzfiguren müssen vollständig eingebettet sein.');

  assert.match(css,/grid-template-columns:minmax\(84px,1fr\) minmax\(150px,1\.58fr\) minmax\(84px,1fr\)/);
  assert.match(css,/\.bp211-column/);
  assert.match(css,/\.bp211-figure img/);
  assert.match(css,/\.bp211-insight/);
  assert.match(css,/nav\.bp211-reference-nav\{grid-template-columns:repeat\(5,1fr\)/);
  assert.match(css,/body\.body-progress-v211-active \.app>\.app-header/);
  assert.match(css,/--orange:#ff684d/);

  assert.match(nav,/addStyle\('body-progress-v210'.*2\.1\.0-alpha/);
  assert.match(nav,/addStyle\('body-progress-v211','\.\/body-progress-v211\.css\?v=2\.1\.1-reference'\)/);
  assert.match(nav,/addScript\('body-progress-v211','\.\/body-progress-v211\.js\?v=2\.1\.1-reference'\)/);
  assert.ok(nav.indexOf("addStyle('body-progress-v210'")<nav.indexOf("addStyle('body-progress-v211'"),'v211 muss nach der bestehenden Daten-/Fallbackschicht geladen werden.');
  assert.ok(nav.indexOf("addScript('body-progress-v210'")<nav.indexOf("addScript('body-progress-v211'"),'v211 muss nach der v210-Datenengine gestartet werden.');
  assert.match(sw,/body211-reference-rebuild/);
  for(const asset of ['body-progress-v211.css','body-progress-v211.js','body-progress-body-v211.b64','body-progress-training-v211.b64'])assert.match(sw,new RegExp(asset.replaceAll('.','\\.')));
  assert.match(pkg.scripts.test,/v211-body-progress-reference\.test\.js/);

  const dom=new JSDOM(`<!doctype html><html><body><div class="app"><header class="app-header"></header><div class="date-nav"></div><section class="screen active" data-screen="progress"></section><nav aria-label="Hauptnavigation"><button data-tab="today"></button><button data-tab="food"></button><button class="active" data-tab="progress"></button><button data-tab="settings"></button></nav><div id="weightModal"><input id="weightInput"><button id="clearWeight"></button></div></div></body></html>`,{url:'https://example.test/cutcoach/#progress',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.selectedDate='2026-07-22';
  w.fetch=async()=>({ok:true,text:async()=>bodyAsset});
  const snapshot={period:7,mode:'body',weights:[['2026-07-16',{weight:97}],['2026-07-22',{weight:96}]],trend:{value:-.5,basis:'7 Tage',reliable:true},training:{gymDays:2,gymGoal:4},currentWeight:96,goalWeight:90,progress:.14,targetDate:'22. Okt. 2026',avgDeficit:548,logged:[1,2,3,4,5],adherence:{calories:.8,protein:.75,steps:.6,gym:.5},status:'Auf Kurs',description:'Dein Gesamttrend bewegt sich kontrolliert in Richtung Ziel.',config:{gymGoal:4}};
  w.CutCoachBodyProgress210={setPeriod(){},setMode(){},snapshot:()=>snapshot};
  w.renderProgress=()=>{};w.day=()=>({weight:96});w.openModal=id=>{w.openedModal=id};
  const script=w.document.createElement('script');script.textContent=js;w.document.head.append(script);if(w.document.readyState==='loading')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));await wait(80);
  assert.equal(w.CutCoachBodyProgress211.version,'2.1.1-reference');
  assert.equal(w.document.querySelector('[data-screen="progress"]').dataset.bodyProgressV211,'1');
  assert.ok(w.document.querySelector('#bp211Figure'));
  assert.equal(w.document.querySelectorAll('#bp211Left article').length,3);
  assert.equal(w.document.querySelectorAll('#bp211Right article').length,2);
  assert.equal(w.document.querySelectorAll('nav button').length,5);
  assert.match(w.document.querySelector('.bp211-heading h1').textContent,/BODY\s+PROGRESS/);
  w.CutCoachBodyProgress211.setMode('training');await wait(30);
  assert.equal(w.document.querySelector('.bp211-shell').dataset.mode,'training');
  assert.equal(w.document.querySelectorAll('#bp211Right article').length,3);
  assert.match(w.document.querySelector('#bp211Subtitle').textContent,/Trainingsreiz analysiert/);
  dom.window.close();
  console.log('Body Progress 2.1.1: Referenzfigur, 3-Spalten-Dashboard, Body-/Training-Modus, fünfteilige Navigation und Produktionscache geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
