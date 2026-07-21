'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const dom=new JSDOM(`<!doctype html><body>
    <section data-screen="food">
      <span data-filter-count="all">99</span>
      <small id="nutritionResultScope">Bibliothek &amp; BLS 4.0</small>
      <div id="nutritionResults"><i class="nutrition-source">BLS</i></div>
      <p class="nutrition-catalog-note">Nährwerte: BLS 4.0</p>
    </section>
    <div id="libraryScreen"><button data-use-lib="food-a"><small>100 g · BLS 4.0</small></button></div>
    <div class="modal" id="nutritionDetailModal"><div class="sheet"><div class="sheet-head"><h2>Lebensmittel</h2><button id="journalMacroClose" aria-label="Schließen">×</button></div><div id="nutritionDetailSource">BLS 4.0 · Basis 100 g · 4/4 Zusatzwerte vorhanden</div></div></div>
    <section class="journal-coach-card coach-v71">
      <section class="coach-v71-focus"><strong id="coachV71FocusTitle">Eiweiß gezielt erhöhen</strong><p id="coachV71FocusReason">Noch 91 g Eiweiß</p><button id="coachV71Action"></button></section>
      <div class="coach-v71-pillars"><article data-coach-pillar="nutrition"><b>1.910 kcal · 109 g Eiweiß</b><em>91 g Eiweiß offen</em></article></div>
    </section>
  </body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  const catalog=[
    {id:'food-a',name:'Hähnchen',source:'bls',sourceId:'a'},
    {id:'food-b',name:'Reis',source:'bls',sourceId:'b'}
  ];
  let total={calories:2383,protein:160,carbs:190,fat:117};
  w.selectedDate='2026-07-21';
  w.todayKey=()=>w.selectedDate;
  w.state={settings:{calories:2300,protein:200,carbs:200,fat:65,steps:6000}};
  w.totals=key=>{assert.equal(key,w.selectedDate);return{...total}};
  w.day=()=>({meals:[{id:'m1'}],steps:4500,weight:96,gym:true,alcohol:false});
  w.CutCoachFoodCatalog={items:()=>catalog};
  w.CutCoachLibrary={exportData:()=>({items:[{...catalog[0],favorite:true,lastUsedAt:'2026-07-21T20:00:00.000Z'}]})};
  w.localStorage.setItem('cutcoach_water_v1',JSON.stringify({'2026-07-21':4000}));
  const script=w.document.createElement('script');script.textContent=read('nutrition-ui-consistency-v206.js');w.document.head.append(script);await wait(120);

  const api=w.CutCoachNutritionMath206;assert.ok(api);assert.equal(api.version,'2.0.6-alpha');
  const view=api.snapshot();assert.equal(view.total.protein,160);assert.equal(view.goals.protein,200);assert.equal(view.macro.protein.remaining,40);assert.equal(view.macro.protein.over,0);
  assert.equal(api.uniqueAllCount(),2,'Favorisieren oder zuletzt nutzen darf den Gesamtbestand nicht reduzieren.');
  assert.equal(w.document.querySelector('[data-filter-count="all"]').textContent,'2');
  assert.equal(w.document.querySelector('.nutrition-source'),null,'Sichtbares BLS-Badge wurde nicht entfernt.');
  assert.equal(w.document.querySelector('#nutritionResultScope').textContent,'Bibliothek');
  assert.equal(w.document.querySelector('.nutrition-catalog-note').hidden,true);
  assert.equal(w.document.querySelector('#nutritionDetailSource').hidden,true);
  assert.doesNotMatch(w.document.querySelector('#libraryScreen small').textContent,/BLS/i);
  const close=w.document.querySelector('#journalMacroClose');assert.ok(close.classList.contains('cc-close-v206'));assert.equal(close.textContent,'');
  assert.match(w.document.querySelector('[data-coach-pillar="nutrition"] b').textContent,/2\.383 kcal · 160 g Eiweiß/);
  assert.equal(w.document.querySelector('[data-coach-pillar="nutrition"] em').textContent,'40 g Eiweiß offen');
  assert.doesNotMatch(w.document.querySelector('.journal-coach-card').textContent,/91 g/,'Der Impuls zeigt weiterhin den veralteten Eiweißstand.');

  total={calories:1910,protein:160,carbs:150,fat:55};api.refresh();await wait(80);
  assert.equal(w.document.querySelector('#coachV71FocusTitle').textContent,'Eiweiß gezielt erhöhen');
  assert.match(w.document.querySelector('#coachV71FocusReason').textContent,/160 von 200 g Eiweiß/);
  assert.match(w.document.querySelector('#coachV71FocusReason').textContent,/40 g bis zum Tagesziel/);

  const css=read('nutrition-ui-consistency-v206.css'),runtime=read('runtime-manifest.js'),sw=read('sw.js'),pkg=JSON.parse(read('package.json'));
  assert.match(css,/\.cc-close-v206/);assert.match(css,/border-radius:50%/);assert.doesNotMatch(css,/linear-gradient/);
  assert.ok(runtime.includes('nutrition-ui-consistency-v206.css?v=2.0.6-alpha'));assert.ok(runtime.includes('nutrition-ui-consistency-v206.js?v=2.0.6-alpha'));
  assert.ok(sw.includes('nutrition206-math-ui'));assert.match(pkg.scripts.test,/v206-nutrition-math-ui\.test\.js/);
  dom.window.close();console.log('Ernährungswerte 2.0.6: BLS-UI entfernt, Gesamtzähler stabil, Makrolücken zentral berechnet und Modalsteuerung vereinheitlicht.');
})().catch(error=>{console.error(error);process.exitCode=1});
