'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const polish=fs.readFileSync(path.join(root,'journal-polish-v137.js'),'utf8');
const css=fs.readFileSync(path.join(root,'journal-polish-v137.css'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const dom=new JSDOM(`<!doctype html><body class="journal-mode cc-glass-nav-active">
  <div class="app"><main><section data-screen="today"><div id="today560">
    <section class="journal-macros"><article></article><article><div class="journal-macro-title"><span>🌾</span><div><b>Kohlenhydrate</b></div></div></article><article></article></section>
    <section class="journal-steps-card"><strong id="journalSteps">Noch nicht eingetragen</strong><small id="journalStepMeta">Ziel noch offen</small></section>
  </div></section></main></div>
  <div id="journalSummaryModal"><div class="journal-summary-sheet"><div class="sheet-head"><button id="journalSummaryClose" type="button">×</button></div><button id="journalSummaryDone" type="button">Abschluss ansehen</button></div></div>
</body>`,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});

const {window}=dom;
window.CutCoachJournalV72={};
const script=window.document.createElement('script');
script.textContent=polish;
window.document.head.append(script);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
window.CutCoachJournalPolish137.refresh();

setTimeout(()=>{
  const meta=window.document.querySelector('#journalStepMeta');
  assert.equal(meta.hidden,true,'Unnötiger Schritte-Untertext bleibt im leeren Zustand sichtbar.');
  assert.equal(meta.textContent,'','Der Text „Ziel noch offen“ wurde nicht entfernt.');
  assert.equal(window.document.querySelector('#journalSummaryDone'),null,'Der funktionslose Rücksprung-Button bleibt im Tagesabschluss bestehen.');
  const close=window.document.querySelector('#journalSummaryClose');
  assert.ok(close.hasAttribute('data-close'),'Close-Button wird nicht gegen globale Button-Stile abgeschirmt.');

  window.document.querySelector('#journalSteps').textContent='3.000 Schritte';
  meta.textContent='Noch 3.000 bis Ziel · 2,3 km';
  window.CutCoachJournalPolish137.refresh();

  setTimeout(()=>{
    assert.equal(meta.hidden,false,'Nützliche Schritte-Metadaten bleiben nach einer Eingabe verborgen.');
    assert.match(meta.textContent,/3\.000 bis Ziel/,'Nützliche Schritte-Metadaten wurden verändert.');

    assert.match(css,/body\.journal-mode\.cc-glass-nav-active\{padding-bottom:0!important\}/,'Gestapelter Body-Abstand erzeugt weiterhin den schwarzen Leerbereich.');
    assert.match(css,/body\.journal-mode \.app\{[^}]*padding-bottom:calc\(62px \+ env\(safe-area-inset-bottom\)\)!important/,'App reserviert weiterhin unnötig viel Platz unter dem Tagebuch.');
    assert.match(css,/body\.journal-mode main\{padding-bottom:0!important\}/,'Historischer Main-Abstand bleibt aktiv.');
    assert.match(css,/article:nth-child\(2\)[\s\S]*font-size:8\.25px!important/,'Kohlenhydrate-Label ist auf kleinen Displays nicht passend skaliert.');
    assert.match(css,/#journalSummaryClose\{[\s\S]*place-items:center!important[\s\S]*font-size:0!important/,'Close-Button ist nicht stabil zentriert.');
    assert.match(css,/#journalSummaryClose::before\{[\s\S]*content:"×"/,'Zentriertes Close-Symbol fehlt.');
    assert.match(css,/#journalSummaryDone\{display:none!important\}/,'Der überflüssige Abschluss-Button ist nicht bereits per CSS unterdrückt.');

    assert.ok(loader.includes("journal-polish-v137.css?v=1.3.7-alpha"),'Versionsloader lädt die Tagebuch-Polish-CSS nicht.');
    assert.ok(loader.includes("journal-polish-v137.js?v=1.3.7-alpha"),'Versionsloader lädt den Tagebuch-Polish nicht.');
    assert.ok(runtime.includes("journal-polish-v137.css?v=1.3.7-alpha"),'Runtime-Manifest enthält die neue CSS-Datei nicht.');
    assert.ok(runtime.includes("journal-polish-v137.js?v=1.3.7-alpha"),'Runtime-Manifest enthält die neue JavaScript-Datei nicht.');
    assert.ok(sw.includes('-nav136-journal137-nutrition138`'),'Service Worker verwendet nicht die aktuelle Tagebuch- und Ernährungs-Cachegeneration.');

    console.log('Tagebuch-Leerraum, Makrotitel, Schritte-Metadaten und Tagesabschluss geprüft.');
  },20);
},20);