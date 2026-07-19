'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const polish=fs.readFileSync(path.join(root,'nutrition-polish-v138.js'),'utf8');
const css=fs.readFileSync(path.join(root,'nutrition-polish-v138.css'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Frühstück">
  <section data-screen="food">
    <div class="nutrition-shell">
      <button id="nutritionManual"><b>Manuell</b></button>
      <button id="nutritionNewFood"><b>Lebensmittel</b></button>
      <select id="nutritionMealSelect"><option selected>Frühstück</option></select>
      <input id="nutritionSearch" value="">
      <div class="nutrition-tabs"><button class="active" data-nutrition-filter="all">Alle</button></div>
      <div id="nutritionResults">
        <article class="nutrition-result-row"><button class="nutrition-result-main"><span class="nutrition-result-copy"><b><span>Hähnchenbrustfilet gebraten</span><i class="nutrition-source" aria-label="Quelle BLS">BLS</i></b><small>100 g · E 30,7 · KH 0 · F 2,4</small></span></button><span class="nutrition-result-energy"><b>145 kcal</b><i>Eiweiß-Fit</i></span><button class="nutrition-result-add" aria-label="Hähnchen hinzufügen">＋</button></article>
        <article class="nutrition-result-row"><button class="nutrition-result-main"><span class="nutrition-result-copy"><b><span>Skyr natur</span></b><small>250 g · E 27,5 · KH 10 · F 0,5</small></span></button><span class="nutrition-result-energy"><b>160 kcal</b><i>Eiweiß-Fit</i></span><button class="nutrition-result-add">＋</button></article>
        <article class="nutrition-result-row"><button class="nutrition-result-main"><span class="nutrition-result-copy"><b><span>Haferflocken mit Milch</span></b><small>300 g · E 18 · KH 54 · F 10</small></span></button><span class="nutrition-result-energy"><b>420 kcal</b></span><button class="nutrition-result-add">＋</button></article>
      </div>
    </div>
  </section>
</body>`,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});

const {window}=dom;
const script=window.document.createElement('script');
script.textContent=polish;
window.document.head.append(script);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
window.CutCoachNutritionPolish138.refresh();

setTimeout(()=>{
  assert.equal(window.document.querySelector('#nutritionManual b').textContent,'Schnelleingabe','Manuell bleibt als unklarer Aktionsname bestehen.');
  assert.equal(window.document.querySelector('#nutritionNewFood b').textContent,'Neu anlegen','Lebensmittel-Anlage bleibt unklar bezeichnet.');
  assert.match(window.document.querySelector('#nutritionManual').getAttribute('aria-label'),/direkt/i,'Schnelleingabe besitzt keine klare Beschreibung.');

  const names=[...window.document.querySelectorAll('#nutritionResults>.nutrition-result-row')].map(row=>row.querySelector('.nutrition-result-copy b>span').textContent.trim());
  assert.ok(names.indexOf('Skyr natur')<names.indexOf('Hähnchenbrustfilet gebraten'),'Frühstückstypisches Skyr wird weiterhin hinter Hähnchen einsortiert.');
  assert.ok(names.indexOf('Haferflocken mit Milch')<names.indexOf('Hähnchenbrustfilet gebraten'),'Frühstückstypische Haferflocken werden weiterhin hinter Hähnchen einsortiert.');
  assert.ok(window.CutCoachNutritionPolish138.mealAffinity('Skyr natur','Frühstück')>window.CutCoachNutritionPolish138.mealAffinity('Hähnchenbrustfilet gebraten','Frühstück'),'Mahlzeitenaffinität bevorzugt kein typisches Frühstück.');
  assert.ok(window.document.querySelector('.nutrition-source').title,'Quellenbadge besitzt keinen verständlichen Hinweis.');

  assert.match(css,/\.nutrition-header\{min-height:58px!important[\s\S]*padding:6px 8px!important/,'Ernährungsheader wurde nicht kompakter gestaltet.');
  assert.match(css,/\.nutrition-shortcuts button\{[\s\S]*min-height:54px!important/,'Schnellaktionen bleiben unnötig hoch.');
  assert.match(css,/\.nutrition-meal-summary\{[\s\S]*min-height:57px!important/,'Mahlzeitenübersicht bleibt unnötig hoch.');
  assert.match(css,/\.nutrition-result-row\{grid-template-columns:minmax\(0,1fr\) 58px 34px!important/,'Lebensmittelkarten besitzen keine aufgeräumte Informationshierarchie.');
  assert.match(css,/\.nutrition-result-add\{width:31px!important[\s\S]*height:31px!important/,'Plusbutton nimmt weiterhin zu viel Platz in der Lebensmittelkarte ein.');

  assert.ok(loader.includes("nutrition-polish-v138.css?v=1.3.8-alpha"),'Versionsloader lädt die neue Ernährungs-CSS nicht.');
  assert.ok(loader.includes("nutrition-polish-v138.js?v=1.3.8-alpha"),'Versionsloader lädt die neue Empfehlungslogik nicht.');
  assert.ok(runtime.includes("nutrition-polish-v138.css?v=1.3.8-alpha"),'Runtime-Manifest enthält die neue Ernährungs-CSS nicht.');
  assert.ok(runtime.includes("nutrition-polish-v138.js?v=1.3.8-alpha"),'Runtime-Manifest enthält die neue Empfehlungslogik nicht.');
  assert.ok(sw.includes('-nav136-journal137-nutrition138`'),'Service Worker verwendet nicht die neue Ernährungs-Cachegeneration.');

  console.log('Mahlzeitpassende Empfehlungen, kompakter Kopf, klare Aktionen und aufgeräumte Lebensmittelkarten geprüft.');
},40);
