'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

(async()=>{
  const spaghetti={id:'spaghetti-standard',name:'Nudeln Bolognese Standard',aliases:['Spaghetti Bolognese'],amount:450,unit:'g',calories:690,protein:31,carbs:82,fat:24,source:'cutcoach'};
  const pizzaBls={id:'pizza-bls',name:'Pizza Margherita (mit Tomatensauce, Mozzarella)',aliases:['Pizza Margherita'],amount:100,unit:'g',calories:238,protein:9,carbs:32,fat:8,source:'bls'};
  const pizzaPersonal={id:'pizza-personal',name:'Pizza Margherita Standard',aliases:['Pizza Margherita'],amount:468,unit:'g',calories:1098,protein:44,carbs:128,fat:45,source:'user',uses:2,lastUsedAt:'2026-07-20T17:00:00.000Z'};
  const catalog=[spaghetti,pizzaBls];
  const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Mittagessen">
    <section data-screen="food" class="active"><div class="nutrition-shell">
      <header><button id="nutritionBack">Zurück</button></header>
      <section class="nutrition-search-card"><label class="nutrition-search-row"><span>⌕</span><input id="nutritionSearch"><button id="nutritionVoice">🎤</button></label></section>
      <button id="nutritionManual"><b>Manuell</b></button><button id="nutritionNewFood"><b>Lebensmittel</b></button>
      <div class="nutrition-meal-actions"><button id="nutritionCopyPrevious">Vortag</button><button id="nutritionCurrentToggle" hidden></button></div>
      <div class="nutrition-tabs"><button class="active" data-nutrition-filter="all">Alle</button></div>
      <div id="nutritionResults" class="nutrition-results"></div>
    </div></section>
  </body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window,input=w.document.querySelector('#nutritionSearch');
  w.CutCoachLibrary={exportData:()=>({items:[pizzaPersonal]}),addCatalogItemToDay:()=>({id:'meal'})};
  w.CutCoachFoodCatalog={items:()=>catalog,get:id=>catalog.find(item=>item.id===id)||null};
  w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
  w.render=()=>{};w.toast=()=>{};

  for(const name of ['nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
  let engine=w.CutCoachIntelligentSearch128;
  engine=w.CutCoachSearchExactWhole170.attach(engine);
  engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
  engine=w.CutCoachPortionHardening153.attach(engine);
  const api=w.CutCoachIntelligentSearch128;
  const query='Spaghetti Bolognese, Pizza Margherita und eine Cola';

  let rows=api.rowsFor(query);
  assert.equal(rows.length,3,'Die Screenshot-Suche wird nicht in genau drei Einträge zerlegt.');
  assert.equal(rows[0].item?.id,spaghetti.id,'Spaghetti Bolognese wird nicht als vollständiger Eintrag geschützt.');
  assert.ok(rows[1].item||rows[1].status==='ambiguous','Pizza Margherita verliert ihre gültige Auswahl.');
  assert.equal(rows[2].item?.id,'cutcoach-standard-cola','„eine Cola“ wird nicht auf den internen Cola-Standard aufgelöst.');
  assert.equal(rows[2].status,'matched');
  assert.equal(rows[2].factor,1);
  assert.equal(rows[2].query,'cola');
  assert.equal(rows[2].raw,'eine Cola');

  for(const [value,name] of [['eine Cola','Cola'],['ein Ayran','Ayran'],['einen Apfel','Apfel'],['eine Banane','Banane']]){
    rows=api.rowsFor(value);
    assert.equal(rows.length,1,`${value} ergibt keinen einzelnen Treffer.`);
    assert.equal(rows[0].item?.name,name,`${value} wird nicht als Artikel plus Lebensmittel erkannt.`);
    assert.equal(rows[0].factor,1,`${value} übernimmt nicht die Menge eins.`);
  }

  inject(w,read('nutrition-search-input-performance-v193.js'));
  inject(w,read('nutrition-polish-v138.js'));
  w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  input.value=query;input.dispatchEvent(new w.Event('input',{bubbles:true}));
  await wait(700);
  const host=w.document.querySelector('#nutritionMultiSearch');
  assert.ok(host&&!host.hidden,'Die intelligente Screenshot-Suche wird nicht dargestellt.');
  assert.match(host.textContent,/Erkannte Einträge/,'Die finale Suchdarstellung übernimmt die Treffer nicht.');
  assert.doesNotMatch(host.textContent,/Intelligente Suche/,'Eine ältere Suchschicht überschreibt erneut die finale Darstellung.');
  assert.match(host.textContent,/Cola/,'Cola fehlt in der sichtbaren Trefferkarte.');
  assert.equal(host.querySelectorAll('.nutrition-multi-list article').length,3);
  const stable=host.innerHTML;
  await wait(350);
  assert.equal(host.innerHTML,stable,'Eine ältere Suchschicht überschreibt die Karte zeitversetzt.');

  dom.window.close();
  console.log('Suchintegrität 1.9.6: Artikelmengen, interne Standardtreffer und finale Dreifachkarte bestehen.');
})().catch(error=>{console.error(error);process.exitCode=1});