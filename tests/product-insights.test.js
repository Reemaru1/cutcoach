'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const dom=new JSDOM(`<!doctype html><html><body>
  <section class="screen active" data-screen="today"></section>
  <section class="screen" data-screen="food"><div id="nutritionResults"><button data-nutrition-add="food-1">Hinzufügen</button></div></section>
  <section class="screen" data-screen="progress"><button data-open="weightModal">Gewicht</button></section>
  <section class="screen" data-screen="settings">
    <label for="qualityMetricsEnabled">Messung</label><input id="qualityMetricsEnabled" type="checkbox">
    <p id="qualityMetricsSummary"></p><button id="qualityMetricsExport"></button><button id="qualityMetricsClear"></button>
    <label for="customerFeedbackCategory">Kategorie</label><select id="customerFeedbackCategory"><option value="clarity">Verständlichkeit</option></select>
    <label for="customerFeedbackScore">Bewertung</label><select id="customerFeedbackScore"><option value="5">5</option></select>
    <label for="customerFeedbackText">Text</label><textarea id="customerFeedbackText"></textarea>
    <button id="customerFeedbackSave">Speichern</button><p id="customerFeedbackStatus"></p><span id="appVersion">Version 2.2.1 Alpha</span>
  </section>
  <nav><button data-tab="today">Heute</button><button data-tab="food">Ernährung</button><button data-tab="progress">Fortschritt</button><button data-tab="settings">Einstellungen</button></nav>
</body></html>`,{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});

dom.window.confirm=()=>true;
for(const file of [
  'src/shared/module-registry.js','src/shared/product-insights.js','src/shared/ui.js',
  'src/features/journal/index.js','src/features/nutrition/index.js','src/features/progress/index.js'
])dom.window.eval(read(file));
dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

const settle=()=>new Promise(resolve=>dom.window.setTimeout(resolve,0));

(async()=>{
  await settle();
  const modules=JSON.parse(JSON.stringify(dom.window.CutCoachModules.list().map(item=>item.id).sort()));
  assert.deepEqual(modules,['journal','nutrition','progress','settings']);

  dom.window.CutCoachInsights.track('onboarding_shown');
  dom.window.CutCoachInsights.track('onboarding_completed');
  dom.window.dispatchEvent(new dom.window.CustomEvent('cutcoach:nutrition-search-rendered',{detail:{hasQuery:true,resultCount:8,queryLengthBucket:'medium',latencyMs:180,query:'dieser Suchtext ist privat'}}));
  dom.window.document.querySelector('[data-tab="food"]').click();
  await settle();
  dom.window.document.querySelector('[data-nutrition-add]').click();
  dom.window.document.querySelector('[data-tab="progress"]').click();
  await settle();
  dom.window.document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen.dataset.screen==='progress'));
  dom.window.document.querySelector('[data-open="weightModal"]').click();

  const snapshot=dom.window.CutCoachInsights.snapshot();
  assert.equal(snapshot.onboarding.shown,1);
  assert.equal(snapshot.onboarding.completed,1);
  assert.equal(snapshot.search.attempts,1);
  assert.equal(snapshot.search.withResults,1);
  assert.equal(snapshot.search.selections,1);
  assert.equal(snapshot.features.nutrition,1);
  assert.equal(snapshot.features.progress,1);
  assert.equal(snapshot.actions.progress_measurement_open,1);
  assert.doesNotMatch(dom.window.localStorage.getItem(dom.window.CutCoachInsights.storageKey),/dieser Suchtext ist privat/);

  dom.window.document.getElementById('customerFeedbackText').value='Die Erklärung darf kürzer sein.';
  dom.window.document.getElementById('customerFeedbackSave').click();
  assert.equal(dom.window.CutCoachFeedback.entries().length,1);
  assert.match(dom.window.document.getElementById('customerFeedbackStatus').textContent,/nur auf diesem Gerät gespeichert/);
  assert.doesNotMatch(dom.window.localStorage.getItem(dom.window.CutCoachInsights.storageKey),/Erklärung darf kürzer/,'Freitext darf nicht in aggregierte Metriken gelangen.');

  dom.window.CutCoachInsights.track('onboarding_shown');
  dom.window.CutCoachInsights.reset();
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));
  assert.equal(dom.window.CutCoachInsights.snapshot().onboarding.abandoned,0,'Gelöschte Messungen dürfen keine alte Onboarding-Sitzung wiederherstellen.');
  dom.window.close();
  console.log('Lokale Produktmetriken, Suchdatenschutz, Feature-Adapter und getrenntes Feedback geprüft.');
})().catch(error=>{
  dom.window.close();
  console.error(error);
  process.exitCode=1;
});
