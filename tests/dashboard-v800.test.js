'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const dom=new JSDOM(`<!doctype html><html><head><link rel="stylesheet" href="src/features/journal/dashboard-v800.css?v=8.0.0-alpha"></head><body class="journal-mode cc-glass-nav-active"><div class="app"><main><section class="screen active" data-screen="today"><div id="today560">
  <section class="journal-topbar"><div class="journal-score-status"><i class="journal-status-icon">💎</i></div><div class="journal-streak-status"><i class="journal-status-icon">🔥</i></div></section>
  <section class="journal-heading"><small>Guten Abend</small><h1>Dein Tagesüberblick</h1></section>
  <section class="journal-energy-card"><div class="journal-energy-stats"><article><span class="stat-icon">🍴</span></article><article><span class="stat-icon">◎</span></article><article><span class="stat-icon">♨</span></article></div><div class="journal-macros"><article><div class="journal-macro-title"><span>💪</span></div></article><article><div class="journal-macro-title"><span>🌾</span></div></article><article><div class="journal-macro-title"><span>💧</span></div></article></div></section>
  <section class="journal-meals-card"><div class="journal-section-title"><div><span>🍴</span><h2>Deine Mahlzeiten</h2><small id="journalMealSummary">5 Einträge · 2.100 kcal</small></div></div><div id="journalMeals"><article class="journal-meal-row meal-v74-current"><button data-add-journal-meal="Abendessen"><span class="journal-meal-icon">🌙</span></button></article></div></section>
  <section class="journal-steps-card"><div class="journal-card-head"><div><span>👣</span></div></div><button id="journalStepToggle" aria-expanded="false"></button></section>
  <section class="journal-water-card"><div class="journal-card-head"><div><span>💧</span></div></div><button data-journal-water="250"></button></section>
  <section class="journal-check-card"><div class="journal-section-title"><div><span>✓</span><h2>Tagescheck</h2></div><small id="journalCheckStatus">Vollständig</small></div><div class="journal-check-grid"><article><small>Gewicht</small><strong id="journalWeight">96,0 kg</strong><button id="journalWeightButton">Ändern</button></article><article><small>Training</small><div><button data-journal-gym="true" aria-pressed="true">Ja</button><button data-journal-gym="false" aria-pressed="false">Nein</button></div></article><article><small>Alkohol</small><div><button data-journal-alcohol="true" aria-pressed="false">Ja</button><button data-journal-alcohol="false" aria-pressed="true">Nein</button></div></article></div></section>
  <section class="journal-coach-card coach-v71 coach-v74-collapsed"><header class="coach-v71-header"><span class="journal-coach-icon">✦</span><button id="coachV74Toggle">Mehr</button></header><section class="coach-v71-focus"></section><div class="coach-v71-pillars"><article data-coach-pillar="nutrition"><span>🍴</span></article><article data-coach-pillar="movement"><span>👣</span></article><article data-coach-pillar="recovery"><span>◌</span></article></div><footer class="coach-v71-footer"></footer></section>
</div></section></main></div><nav aria-label="Hauptnavigation"><button data-tab="today">Tagebuch</button><button data-tab="progress">Fortschritt</button><button data-tab="food"><span>+</span></button><button data-tab="settings">Einstellungen</button></nav></body></html>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});

const {window}=dom;window.matchMedia=()=>({matches:false});window.HTMLElement.prototype.scrollIntoView=()=>{};
const events=[];window.CutCoachInsights={track:(type,detail)=>events.push({type,detail})};window.CutCoachBodyProgress220={openWorkout:key=>events.push({type:'workout',detail:key})};
const navBefore=window.document.querySelector('nav[aria-label="Hauptnavigation"]').innerHTML;
window.eval(read('src/features/journal/dashboard-v800.js'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

setTimeout(()=>{
  const host=window.document.querySelector('#today560'),children=[...host.children];
  const position=selector=>children.indexOf(host.querySelector(selector));
  assert.ok(window.document.body.classList.contains('journal-v800'));
  assert.ok(position('.journal-energy-card')<position('.journal-coach-card'));
  assert.ok(position('.journal-coach-card')<position('.journal-quick-actions'));
  assert.ok(position('.journal-quick-actions')<position('.journal-meals-card'));
  assert.ok(position('.journal-meals-card')<position('.journal-balance-grid'));
  assert.ok(position('.journal-balance-grid')<position('.journal-check-card'));
  assert.equal(host.querySelectorAll('.journal-quick-actions button').length,4);
  assert.equal(host.querySelector('.journal-balance-grid').children.length,2);
  assert.equal(host.querySelector('#journalMealSummary').textContent,'5 Lebensmittel · 2.100 kcal');
  assert.equal(host.querySelector('#journalCheckStatus').textContent,'Basischeck 3/3');
  assert.equal(host.querySelector('#coachV74Toggle').textContent,'Analyse anzeigen');
  assert.ok(host.querySelector('.journal-meal-icon svg'),'Native Mahlzeiten-Emoji wurde nicht ersetzt.');
  assert.ok(host.querySelector('.journal-score-status svg'),'Tagesnote nutzt kein einheitliches SVG-Symbol.');
  assert.equal(window.document.querySelector('nav[aria-label="Hauptnavigation"]').innerHTML,navBefore,'Der globale grüne Plusbutton wurde verändert.');

  host.querySelector('[data-journal-training-details]').click();
  assert.equal(events.at(-1).type,'workout','Detailliertes Training öffnet nicht denselben Fortschritt-Dialog.');
  host.querySelector('[data-journal-feedback="helpful"]').click();
  assert.equal(events.at(-1).type,'journal_feedback');assert.equal(events.at(-1).detail.value,'helpful');
  assert.ok(host.querySelector('.journal-feedback-card').classList.contains('is-complete'));

  const css=read('src/features/journal/dashboard-v800.css'),shared=read('src/shared/design-system-v800.css'),progress=read('body-progress-v220.css'),index=read('index.html'),manifest=read('runtime-manifest.js');
  assert.match(css,/button:not\(\[data-tab="food"\]\)/,'Kompakte Navigation grenzt den grünen Plusbutton nicht aus.');
  assert.doesNotMatch(css,/button\[data-tab="food"\]\s*\{/,'Dashboard überschreibt den grünen Plusbutton.');
  assert.match(shared,/prefers-reduced-motion/,'Reduzierte Bewegung wird nicht berücksichtigt.');
  assert.match(progress,/grid-template-areas:"figure figure" "left right"/,'Fortschrittsdaten werden mobil weiterhin miniaturisiert.');
  assert.match(progress,/\.bp220-column p\{font-size:12px/,'Fortschrittstexte bleiben auf iPhones zu klein.');
  for(const asset of ['src/shared/design-system-v800.css?v=8.0.0-alpha','src/features/journal/dashboard-v800.css?v=8.0.0-alpha','src/features/journal/dashboard-v800.js?v=8.0.0-alpha']){assert.ok(index.includes(asset));assert.ok(manifest.includes(asset))}
  console.log('Dashboard 8.0: Hierarchie, SVG-Symbole, Schnellzugriffe, gemeinsamer Fortschrittsdialog, Feedback und mobile Lesbarkeit geprüft.');
},40);
