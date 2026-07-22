'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const dom=new JSDOM(`<!doctype html><html><body class="nutrition-mode"><section class="screen active" data-screen="food" data-nutrition-ready="1"><div class="nutrition-shell">
  <header class="nutrition-header"><button class="nutrition-back"></button><div class="nutrition-header-copy"><span id="nutritionTitle">Frühstück</span><p></p></div><button class="nutrition-done"></button></header>
  <section class="nutrition-search-card"><label class="nutrition-search-row"><span>⌕</span><input><button id="nutritionVoice">🎤</button></label></section>
  <section class="nutrition-shortcuts"><button id="nutritionBarcode"><span>▣</span><b>Barcode</b></button><button id="nutritionManual"><span>✎</span><b>Manuell</b></button><button id="nutritionNewFood"><span>＋</span><b>Lebensmittel</b></button><button id="nutritionRecipe"><span>🍽️</span><b>Rezept</b></button></section>
  <section class="nutrition-meal-card"><div class="nutrition-meal-summary"><span class="nutrition-meal-icon">☕</span><div class="nutrition-meal-copy"><small>Diese Mahlzeit</small><strong>0 kcal</strong></div><div class="nutrition-meal-actions"><button id="nutritionCopyPrevious">↶ Vortag</button></div></div><div class="nutrition-day-budget"><span id="nutritionDayBudgetLabel">612 kcal über Tagesziel</span></div><div class="nutrition-coach-row">Tipp</div><div class="nutrition-macro-compass"><article></article></div><section id="nutritionV7Analysis"></section></section>
  <section class="nutrition-browse-head"><div><small id="nutritionResultScope">Bibliothek & BLS 4.0</small><h2>Empfohlen</h2></div></section>
  <div class="nutrition-results"><article class="nutrition-result-row"><button class="nutrition-result-main"><span class="nutrition-result-icon">🥣</span><span class="nutrition-result-copy"><b><span>Skyr natur mit besonders langem Namen</span></b><small>100 g</small></span></button><span class="nutrition-result-energy"><b>62 kcal</b><i>Eiweiß-Fit</i></span><button class="nutrition-result-add">＋</button></article></div>
  <p class="nutrition-catalog-note">Nährwerte: BLS 4.0</p>
</div></section>
<div class="modal" id="mealModal"><div class="sheet"><div class="sheet-head"><h2>Mahlzeit hinzufügen</h2><button aria-label="Schließen">×</button></div><input id="mealName"><input id="mealCalories"><button id="saveMeal">Speichern</button></div></div>
<div class="modal" id="libraryItemModal"><div class="sheet"><div class="sheet-head"><h2 id="libraryItemTitle">Eintrag speichern</h2><button aria-label="Schließen">×</button></div><div class="segmented"><button class="on">Lebensmittel</button><button>Rezept</button></div><input id="libName"><input id="libAmount"><input id="libCalories"><label class="favorite-check"><input type="checkbox"> Als Favorit markieren</label><div class="button-row"><button id="saveLibraryItem">Speichern</button></div></div></div>
<div class="modal" id="scannerModal"><div class="sheet scanner-sheet"><div class="sheet-head"><h2 id="scannerTitle">Barcode / QR scannen</h2><button aria-label="Schließen">×</button></div><div class="scanner-frame"></div><div id="scannerStatus"></div><div class="scanner-controls"><button id="scannerRetry">↻ Kamera neu starten</button><button id="scannerTorch">💡 Licht</button></div><label class="scanner-photo">📷 Barcode fotografieren<input type="file"></label><div class="scanner-manual"><input><button>Suchen</button></div></div></div>
<nav aria-label="Hauptnavigation"><button data-tab="today"></button><button data-tab="progress"></button><button data-tab="food"></button><button data-tab="settings"></button></nav>
</body></html>`,{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});

const {window}=dom;window.CutCoachGlassNavV131={enhance(){}};window.eval(read('src/features/nutrition/nutrition-v210.js'));window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

setTimeout(()=>{
  const document=window.document,day=document.querySelector('.nutrition-v210-day-card'),meal=document.querySelector('.nutrition-meal-card');
  assert.ok(day,'Tagesbilanz wurde nicht als eigener Bereich angelegt.');
  for(const selector of ['.nutrition-day-budget','.nutrition-coach-row','.nutrition-macro-compass','#nutritionV7Analysis'])assert.equal(day.querySelector(selector)?.parentElement,day,`${selector} blieb fälschlich in der Mahlzeitenkarte.`);
  assert.equal(meal.querySelector('.nutrition-meal-copy small').textContent,'Aktuelle Mahlzeit');
  assert.equal(document.querySelector('#nutritionManual b').textContent,'Schnelleingabe');
  assert.equal(document.querySelector('#nutritionNewFood b').textContent,'Neu anlegen');
  assert.ok(document.querySelector('#nutritionVoice svg'),'Mikrofon nutzt kein stabiles SVG.');
  assert.ok(document.querySelector('.nutrition-result-icon svg'),'Treffer nutzt weiterhin ein Emoji.');
  assert.equal(document.querySelector('#nutritionResultScope').textContent,'Lebensmitteldatenbank');
  assert.ok(document.querySelector('.nutrition-v210-sources .nutrition-catalog-note'),'Datenquellen wurden nicht progressiv offengelegt.');
  assert.equal(document.querySelector('#saveMeal').disabled,true);document.querySelector('#mealName').value='Skyr';document.querySelector('#mealCalories').value='120';document.querySelector('#mealCalories').dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(document.querySelector('#saveMeal').disabled,false);
  assert.equal(document.querySelector('#saveLibraryItem').textContent,'In Bibliothek speichern');
  assert.ok(document.querySelector('#scannerRetry svg'),'Scanner-Steuerung nutzt weiterhin Textsymbole.');
  assert.ok(document.querySelector('#scannerModal .nutrition-v210-handle'),'Scanner folgt nicht der gemeinsamen Sheet-Sprache.');

  const nutritionSource=read('nutrition.js'),navSource=read('glass-nav-v131.js'),css=read('src/features/nutrition/nutrition-v210.css'),dashboard=read('src/features/journal/dashboard-v800.css'),index=read('index.html'),manifest=read('runtime-manifest.js'),sw=read('sw.js');
  assert.doesNotMatch(nutritionSource,/querySelector\('nav \[data-tab="food"\]'\)\?\.remove/,'Ernährung löscht weiterhin den globalen Plusbutton.');
  assert.match(navSource,/MutationObserver[\s\S]*queueRepair/,'Navigation repariert spätere DOM-Änderungen nicht dauerhaft.');
  assert.match(navSource,/\.cc-nav-icon > svg/,'Die Navigationsprüfung akzeptiert ersetzte Emoji-Icons weiterhin als intaktes SVG-Markup.');
  assert.match(css,/scanner-frame::before/,'Scanner besitzt keinen klaren Eckrahmen.');
  assert.match(css,/nutrition-v210-sheet \.button-row\{position:sticky/,'Formularaktionen sind auf kleinen iPhones nicht erreichbar.');
  assert.match(css,/\.nutrition-result-copy b>span:first-child[^{]*\{[^}]*-webkit-line-clamp:2/,'Lange Lebensmittelnamen bleiben einzeilig abgeschnitten.');
  assert.match(dashboard,/padding-bottom:calc\(68px \+ env\(safe-area-inset-bottom\)\)/,'Der übergroße Leerraum unter dem Tagebuch bleibt bestehen.');
  for(const asset of ['src/features/nutrition/nutrition-v210.css?v=2.1.0-alpha','src/features/nutrition/nutrition-v210.js?v=2.1.0-alpha']){assert.ok(index.includes(asset));assert.ok(manifest.includes(asset))}
  assert.match(sw,/nutrition210-nav137-dashboard811/,'Der Offline-Cache wurde für die neue Oberfläche nicht invalidiert.');
  console.log('Nutrition 2.1: Zielintelligenz, klare Bereiche, stabile Navigation, Untermenüs, Scanner und Safe-Area geprüft.');
},50);
