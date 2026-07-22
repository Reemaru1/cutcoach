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
  <section class="nutrition-meal-card"><div class="nutrition-meal-summary"><span class="nutrition-meal-icon">☕</span><div class="nutrition-meal-copy"><small>Diese Mahlzeit</small><strong>0 kcal</strong></div><div class="nutrition-meal-actions"><button id="nutritionCopyPrevious">↶ Vortag</button></div></div><div class="nutrition-day-budget"><span id="nutritionDayBudgetLabel">612 kcal über Tagesziel</span></div><div class="nutrition-coach-row">Tipp</div><div class="nutrition-macro-compass"><article></article></div><section id="nutritionV7Analysis"><div class="nutrition-v7-analysis-head"><strong>Zusatzwerte</strong><button>⌄</button></div><div class="nutrition-v7-analysis-grid"><article>Ballaststoffe</article></div><p>Details</p></section></section>
  <section class="nutrition-browse-head"><div><small id="nutritionResultScope">Bibliothek & BLS 4.0</small><h2>Empfohlen</h2></div></section>
  <div class="nutrition-results"><article class="nutrition-result-row"><button class="nutrition-result-main"><span class="nutrition-result-icon">🥣</span><span class="nutrition-result-copy"><b><span>Skyr natur mit besonders langem Namen</span></b><small>100 g</small></span></button><span class="nutrition-result-energy"><b>62 kcal</b><i>Eiweiß-Fit</i></span><button class="nutrition-result-add">＋</button></article></div>
  <p class="nutrition-catalog-note">Nährwerte: BLS 4.0</p>
</div></section>
<div class="modal" id="mealModal"><div class="sheet"><span class="cc-sheet-handle"></span><div class="sheet-head cc-sheet-head"><span class="cc-sheet-title-icon"></span><h2>Mahlzeit hinzufügen</h2><button aria-label="Schließen">×</button></div><p class="cc-sheet-intro cc-meal-intro">Alte doppelte Einleitung</p><input id="mealName"><input id="mealCalories"><button id="saveMeal">Speichern</button></div></div>
<div class="modal" id="libraryItemModal"><div class="sheet"><div class="sheet-head"><h2 id="libraryItemTitle">Eintrag speichern</h2><button aria-label="Schließen">×</button></div><div class="segmented"><button class="on" data-kind="food">Lebensmittel</button><button data-kind="recipe">Rezept</button></div><input id="libName"><input id="libAmount"><input id="libCalories"><label class="favorite-check"><input type="checkbox"> Als Favorit markieren</label><div class="button-row"><button id="saveLibraryItem">Speichern</button></div></div></div>
<div class="modal" id="scannerModal"><div class="sheet scanner-sheet"><div class="sheet-head"><h2 id="scannerTitle">Barcode / QR scannen</h2><button aria-label="Schließen">×</button></div><div class="scanner-frame"></div><div id="scannerStatus"></div><div class="scanner-controls"><button id="scannerRetry">↻ Kamera neu starten</button><button id="scannerTorch">💡 Licht</button></div><label class="scanner-photo">📷 Barcode fotografieren<input type="file"></label><div class="scanner-manual"><input><button>Suchen</button></div></div></div>
<nav aria-label="Hauptnavigation"><button data-tab="today"></button><button data-tab="progress"></button><button data-tab="food"></button><button data-tab="settings"></button></nav>
</body></html>`,{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});

const {window}=dom;
window.CutCoachGlassNavV131={enhance(){}};
window.eval(read('src/features/nutrition/nutrition-v210.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

setTimeout(()=>{
  const document=window.document,day=document.querySelector('.nutrition-v210-day-card'),meal=document.querySelector('.nutrition-meal-card');
  assert.ok(day,'Tagesbilanz wurde nicht als eigener Bereich angelegt.');
  for(const selector of ['.nutrition-day-budget','.nutrition-coach-row','.nutrition-macro-compass','#nutritionV7Analysis'])assert.equal(day.querySelector(selector)?.parentElement,day,`${selector} blieb fälschlich in der Mahlzeitenkarte.`);
  assert.equal(meal.querySelector('.nutrition-meal-copy small').textContent,'Aktuelle Mahlzeit');
  assert.equal(document.querySelector('#nutritionManual b').textContent,'Schnelleingabe');
  assert.equal(document.querySelector('#nutritionNewFood b').textContent,'Lebensmittel');
  assert.equal(document.querySelector('#nutritionV210DayStatus').textContent,'Über Tagesziel');
  assert.ok(document.querySelector('#nutritionVoice svg'),'Mikrofon nutzt kein stabiles SVG.');
  assert.ok(document.querySelector('.nutrition-result-icon svg'),'Treffer nutzt weiterhin ein Emoji.');
  assert.equal(document.querySelector('#nutritionResultScope').textContent,'Lebensmitteldatenbank');
  assert.ok(document.querySelector('.nutrition-v210-sources .nutrition-catalog-note'),'Datenquellen wurden nicht progressiv offengelegt.');

  const analysis=document.querySelector('#nutritionV7Analysis'),analysisHead=analysis.querySelector('.nutrition-v7-analysis-head');
  assert.ok(analysis.classList.contains('is-collapsed'),'Zusatzwerte starten weiterhin unnötig aufgeklappt.');
  assert.equal(analysisHead.getAttribute('aria-expanded'),'false');
  analysisHead.click();
  assert.equal(analysisHead.getAttribute('aria-expanded'),'true');

  assert.equal(document.querySelector('#saveMeal').disabled,true);
  document.querySelector('#mealName').value='Skyr';
  document.querySelector('#mealCalories').value='120';
  document.querySelector('#mealCalories').dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(document.querySelector('#saveMeal').disabled,false);
  assert.equal(document.querySelector('#saveLibraryItem').textContent,'In Bibliothek speichern');
  assert.equal(document.querySelector('#libraryItemTitle').textContent,'Lebensmittel anlegen');
  assert.equal(document.querySelector('#libraryItemModal .segmented').hidden,true,'Der doppelte Rezeptweg bleibt im Lebensmittel-Dialog sichtbar.');
  assert.equal(document.querySelector('#libraryItemModal [data-kind="recipe"]').hidden,true);
  assert.equal(document.querySelectorAll('#mealModal :is(.nutrition-v210-handle,.cc-sheet-handle)').length,1,'Der Mahlzeitendialog enthält doppelte Griffe.');
  assert.equal(document.querySelectorAll('#mealModal :is(.nutrition-v210-title-icon,.cc-sheet-title-icon)').length,1,'Der Mahlzeitendialog enthält doppelte Titelicons.');
  assert.equal(document.querySelectorAll('#mealModal :is(.nutrition-v210-intro,.cc-meal-intro)').length,1,'Der Mahlzeitendialog enthält doppelte Einleitungen.');
  assert.ok(document.querySelector('#scannerRetry svg'),'Scanner-Steuerung nutzt weiterhin Textsymbole.');
  assert.ok(document.querySelector('#scannerModal .nutrition-v210-handle'),'Scanner folgt nicht der gemeinsamen Sheet-Sprache.');

  const nutritionSource=read('nutrition.js'),navSource=read('glass-nav-v131.js'),css=read('src/features/nutrition/nutrition-v210.css'),dashboard=read('src/features/journal/dashboard-v800.css'),index=read('index.html'),manifest=read('runtime-manifest.js'),sw=read('sw.js'),core=read('core.js'),app=read('app.js');
  assert.doesNotMatch(nutritionSource,/querySelector\('nav \[data-tab="food"\]'\)\?\.remove/,'Ernährung löscht weiterhin den globalen Plusbutton.');
  assert.match(navSource,/MutationObserver[\s\S]*queueRepair/,'Navigation repariert spätere DOM-Änderungen nicht dauerhaft.');
  assert.match(navSource,/\.cc-nav-icon > svg/,'Die Navigationsprüfung akzeptiert ersetzte Emoji-Icons weiterhin als intaktes SVG-Markup.');
  assert.match(css,/scanner-frame::before/,'Scanner besitzt keinen klaren Eckrahmen.');
  assert.match(css,/nutrition-v210-sheet \.button-row\{position:sticky/,'Formularaktionen sind auf kleinen iPhones nicht erreichbar.');
  assert.match(css,/\.nutrition-result-copy b>span:first-child[^{]*\{[^}]*-webkit-line-clamp:2/,'Lange Lebensmittelnamen bleiben einzeilig abgeschnitten.');
  assert.match(css,/\.nutrition-result-row\{[^}]*content-visibility:auto/,'Lange Ergebnislisten werden weiterhin vollständig vorgerendert.');
  assert.doesNotMatch(css,/nutrition-v7-analysis-head::after\{content:""/,'Die Zusatzwerte erzeugen weiterhin ein zweites Chevron-Symbol.');
  assert.match(css,/\.nutrition-v210-favorite input\{[^}]*width:1px!important[^}]*opacity:0!important/,'Der native schwarze Checkbox-Kreis bleibt sichtbar.');
  assert.match(css,/\.nutrition-v210-sheet \.recipe-v7-summary\{position:static!important/,'Die Rezeptbilanz kann den Zutatenbereich weiterhin überlagern.');
  assert.match(nutritionSource,/fit\.n\.protein<5\?-180/,'Die Eiweißempfehlungen priorisieren weiterhin kalorienarme Nullsignale vor echten Proteinquellen.');
  assert.match(dashboard,/padding-bottom:calc\(68px \+ env\(safe-area-inset-bottom\)\)/,'Der übergroße Leerraum unter dem Tagebuch bleibt bestehen.');
  for(const asset of ['src/features/nutrition/nutrition-v210.css?v=2.1.1-alpha','src/features/nutrition/nutrition-v210.js?v=2.1.1-alpha']){assert.ok(index.includes(asset));assert.ok(manifest.includes(asset));}
  assert.match(sw,/nutrition211-nav137-dashboard811-faststart/,'Der Offline-Cache wurde für die stabilisierte Oberfläche nicht invalidiert.');
  assert.match(sw,/navigationResponse\(event,request\)/);
  assert.match(sw,/if\(cached\)\{event\.waitUntil\(network\.then/,'Navigation und Assets nutzen den warmen Cache nicht sofort.');
  assert.ok(index.includes('id="appBootSplash"'),'Der Start zeigt weiterhin nur eine schwarze Fläche.');
  assert.match(core,/function completeAppBoot\(\)/);
  assert.match(app,/render\(\);completeAppBoot\(\);registerServiceWorker\(\)/,'Der sichtbare Startzustand wird nicht direkt nach dem ersten Rendern beendet.');
  console.log('Nutrition 2.1.1: Sheets, Rezeptwege, Empfehlungen, schneller PWA-Start und Safe-Area geprüft.');
},50);
