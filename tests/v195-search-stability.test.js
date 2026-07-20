'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const performanceSource=fs.readFileSync(path.join(root,'nutrition-search-input-performance-v193.js'),'utf8');
const polishSource=fs.readFileSync(path.join(root,'nutrition-polish-v138.js'),'utf8');
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};

(async()=>{
  const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Frühstück">
    <section data-screen="food"><div class="nutrition-shell">
      <header><button id="nutritionBack">Zurück</button></header>
      <section class="nutrition-search-card"><label class="nutrition-search-row"><input id="nutritionSearch"><button id="nutritionVoice">🎤</button></label></section>
      <button id="nutritionManual"><b>Manuell</b></button><button id="nutritionNewFood"><b>Lebensmittel</b></button>
      <div class="nutrition-meal-actions"><button id="nutritionCopyPrevious">Vortag</button><button id="nutritionCurrentToggle" hidden></button></div>
      <div class="nutrition-tabs"><button class="active" data-nutrition-filter="all">Alle</button></div>
      <div id="nutritionResults" class="nutrition-results"></div>
    </div></section>
  </body>`,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});
  const {window}=dom,input=dom.window.document.querySelector('#nutritionSearch');
  const toast={id:'toast',name:'Toastbrot',amount:1,unit:'Stück',calories:80,protein:3,carbs:15,fat:1};
  const berry={id:'berry',name:'Erdbeere roh',amount:100,unit:'g',calories:38,protein:.8,carbs:6,fat:.4};
  let intelligentRuns=0,normalRuns=0;
  window.CutCoachFoodCatalog={items:()=>[toast,berry],get:id=>[toast,berry].find(item=>item.id===id)||null};
  window.CutCoachLibrary={addCatalogItemToDay:()=>({id:'meal'})};
  window.CutCoachIntelligentSearch128={
    rowsFor:value=>{intelligentRuns++;return /toastbrot\s+mit\s+erdbeere/i.test(String(value))?[
      {raw:'Toastbrot',query:'toastbrot',item:toast,status:'matched',factor:1,amountLabel:'',choices:[]},
      {raw:'Erdbeere',query:'erdbeere',item:berry,status:'matched',factor:1,amountLabel:'',choices:[]}
    ]:[]},
    likelyMulti:value=>/\smit\s/i.test(String(value))
  };
  window.toast=()=>{};window.render=()=>{};
  inject(window,performanceSource);inject(window,polishSource);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  input.addEventListener('input',()=>{normalRuns++});

  input.value='Erdbeere';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await wait(1000);
  assert.equal(normalRuns,1,'Ein einfacher Einzelbegriff erreicht die normale Suche nicht genau einmal.');
  assert.equal(intelligentRuns,0,'Ein einfacher Einzelbegriff startet weiterhin unnötig die intelligente Mehrfachsuche.');
  assert.equal(window.CutCoachNutritionPolish138.interactionStats().intelligentEvaluations,0);

  normalRuns=0;intelligentRuns=0;
  const slowValues=['T','To','Toa','Toas','Toast'];
  for(const value of slowValues){input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));await wait(430)}
  assert.equal(normalRuns,0,'Eine langsame iPhone-Tippserie startet vor dem Ende bereits Katalogsuchen.');
  await wait(1000);
  assert.equal(normalRuns,1,'Eine langsame Tippserie erzeugt nicht genau einen finalen Suchlauf.');
  assert.equal(intelligentRuns,0,'Eine einfache langsame Tippserie startet die intelligente Suche.');
  const inputStats=window.CutCoachSearchInputPerformance193.stats();
  assert.ok(inputStats.lastDelay>=560&&inputStats.lastDelay<=900,'Adaptive Tipp-Pause liegt außerhalb des neuen iPhone-Bereichs.');
  assert.equal(inputStats.pending,false);

  normalRuns=0;intelligentRuns=0;
  input.value='Toastbrot mit Erdbeere';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await wait(1000);
  assert.equal(intelligentRuns,1,'Eine echte Kombination wird mehrfach intelligent berechnet.');
  assert.equal(normalRuns,0,'Bei einer intelligent übernommenen Kombination läuft zusätzlich die normale Vollkatalogsuche.');
  const host=window.document.querySelector('#nutritionMultiSearch');
  assert.ok(host&&!host.hidden,'Die kombinierte Suche wird nicht dargestellt.');
  assert.equal(host.querySelectorAll('.nutrition-multi-list article').length,2);
  assert.equal(window.CutCoachNutritionPolish138.interactionStats().intelligentEvaluations,1);

  dom.window.close();
  console.log('Suchstabilität 1.9.7: langsames iPhone-Tippen, Einzelbegriffe und Kombinationen laufen nur über den nötigen Suchpfad.');
  setImmediate(()=>process.exit(0));
})().catch(error=>{console.error(error);setImmediate(()=>process.exit(1))});