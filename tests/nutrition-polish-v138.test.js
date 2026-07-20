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
      <section class="nutrition-search-card"><label class="nutrition-search-row"><span>⌕</span><input id="nutritionSearch" value=""><button id="nutritionVoice">🎤</button></label></section>
      <button id="nutritionManual"><b>Manuell</b></button>
      <button id="nutritionNewFood"><b>Lebensmittel</b></button>
      <select id="nutritionMealSelect"><option selected>Frühstück</option></select>
      <div class="nutrition-meal-actions"><button id="nutritionCopyPrevious">↶ Vortag</button><button id="nutritionCurrentToggle" aria-expanded="false">Ansehen <span>⌄</span></button></div>
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
window.toast=()=>{};
const script=window.document.createElement('script');script.textContent=polish;window.document.head.append(script);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
window.CutCoachNutritionPolish138.refresh();

setTimeout(()=>{
  assert.equal(window.document.querySelector('#nutritionManual b').textContent,'Schnelleingabe','Manuell bleibt als unklarer Aktionsname bestehen.');
  assert.equal(window.document.querySelector('#nutritionNewFood b').textContent,'Neu anlegen','Lebensmittel-Anlage bleibt unklar bezeichnet.');
  assert.match(window.document.querySelector('#nutritionManual').getAttribute('aria-label'),/direkt/i,'Schnelleingabe besitzt keine klare Beschreibung.');
  assert.equal(window.document.querySelector('#nutritionVoice').textContent,'🎙️','Mikrofon wurde nicht auf das größere, sauber zentrierbare Symbol umgestellt.');
  assert.equal(window.document.querySelector('#nutritionCopyPrevious').textContent,'Vortag','Vortag-Aktion enthält weiterhin ein störendes Textsymbol.');
  assert.match(window.document.querySelector('#nutritionCurrentToggle').textContent,/Einträge/,'Ansehen wurde nicht durch eine klare Eintragsaktion ersetzt.');
  assert.ok([...window.document.querySelectorAll('.nutrition-result-add')].every(button=>button.textContent==='+'),'Normale Plusaktionen verwenden weiterhin das fehlerhafte Vollbreitenzeichen.');

  const names=[...window.document.querySelectorAll('#nutritionResults>.nutrition-result-row')].map(row=>row.querySelector('.nutrition-result-copy b>span').textContent.trim());
  assert.ok(names.indexOf('Skyr natur')<names.indexOf('Hähnchenbrustfilet gebraten'),'Frühstückstypisches Skyr wird weiterhin hinter Hähnchen einsortiert.');
  assert.ok(names.indexOf('Haferflocken mit Milch')<names.indexOf('Hähnchenbrustfilet gebraten'),'Frühstückstypische Haferflocken werden weiterhin hinter Hähnchen einsortiert.');
  assert.ok(window.CutCoachNutritionPolish138.mealAffinity('Skyr natur','Frühstück')>window.CutCoachNutritionPolish138.mealAffinity('Hähnchenbrustfilet gebraten','Frühstück'),'Mahlzeitenaffinität bevorzugt kein typisches Frühstück.');
  assert.equal(window.CutCoachNutritionPolish138.presentationVersion,'1.9.5-alpha');
  assert.equal(window.CutCoachNutritionPolish138.interactionStats().renderWrites,0,'Darstellung schreibt ohne aktive Suche unnötig Karten-HTML.');
  assert.equal(window.CutCoachNutritionPolish138.interactionStats().intelligentEvaluations,0,'Ohne Suchtext wird die intelligente Suche unnötig berechnet.');
  assert.ok(window.document.querySelector('.nutrition-source').title,'Quellenbadge besitzt keinen verständlichen Hinweis.');

  assert.match(css,/\.nutrition-search-row\{grid-template-columns:26px minmax\(0,1fr\) 52px!important/,'Mikrofon erhält keinen größeren, sauber gefitteten Bereich.');
  assert.match(css,/\.nutrition-search-row button\{width:48px!important[\s\S]*height:48px!important/,'Mikrofonbutton bleibt zu klein.');
  assert.match(css,/\.nutrition-meal-actions\{display:grid!important[\s\S]*border-radius:13px!important/,'Vortag und Einträge bilden keine einheitliche Aktionsgruppe.');
  assert.match(css,/\.nutrition-result-add\{[\s\S]*width:36px!important[\s\S]*border-radius:12px!important/,'Normale Plusaktionen besitzen keinen sauberen abgerundeten Button.');
  assert.match(css,/#nutritionMultiSearch \.nutrition-confidence\{display:none!important\}/,'Wahrscheinlichkeitsbadges werden nicht sicher entfernt.');
  assert.match(css,/\.nutrition-row-action\{[\s\S]*min-width:98px!important/,'Intelligente Suche verwendet weiterhin fehlerhafte reine Pluskästen.');

  assert.ok(loader.includes('nutrition-polish-v138.js'),'Versionsloader lädt die Ernährungslogik nicht.');
  assert.ok(runtime.includes("nutrition-polish-v138.js?v=1.3.10-alpha"),'Runtime-Manifest enthält die stabile Ernährungslogik nicht.');
  assert.ok(runtime.includes("nutrition-search-input-performance-v193.js?v=1.9.5-alpha"),'Runtime-Manifest enthält die stabile Eingabesteuerung nicht.');
  assert.ok(sw.includes('search192-ui-overhaul'),'Service Worker verwendet nicht die Such-UI-Cachegeneration.');
  assert.ok(sw.includes('search194-interaction-unlock'),'Service Worker enthält den Interaktions-Hotfix nicht.');
  assert.ok(sw.includes('search195-stability'),'Service Worker enthält die Suchstabilitätsgeneration nicht.');

  dom.window.close();
  console.log('Mikrofon, Trefferaktionen und stabile Suchdarstellung ohne unnötige Mehrfachberechnung geprüft.');
},60);
