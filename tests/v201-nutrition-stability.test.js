'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,name)=>{const script=window.document.createElement('script');script.textContent=read(name);window.document.head.append(script)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Mittagessen">
    <section data-screen="food"><input id="nutritionSearch"><span data-filter-count="all">0</span><div id="nutritionResults" class="nutrition-results is-empty"><article class="nutrition-empty">Leer</article></div></section>
    <div id="nutritionMultiSearch"><button type="button" data-v192-all>Alle hinzufügen</button></div>
    <div id="nutritionDetailModal" aria-hidden="true"><div id="nutritionDetailSource"></div></div>
    <div id="libraryUseModal" aria-hidden="true"><div id="libraryUseSummary"><small></small></div></div>
    <div id="libraryList"></div>
  </body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  const cola={id:'ccp:coca-cola-zero',name:'Coca-Cola Zero Sugar',aliases:['Cola Zero','Coke Zero'],brand:'Coca-Cola',kind:'food',amount:100,unit:'ml',calories:.2,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:.02,source:'manufacturer',sourceId:'coca-cola-zero',sourceVersion:'2.0.0-alpha',sourceLabel:'Coca-Cola · Herstellerangabe pro 100 ml',product:true,verified:true,category:'Getränk'};
  const water={id:'off:water-zero',name:'Wasser Zero',aliases:['Zero Wasser'],kind:'food',amount:100,unit:'ml',calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:0,source:'off',sourceId:'water-zero',sourceVersion:'2',sourceLabel:'Open Food Facts · Produktdaten',product:true};
  w.CutCoachFoodCatalog={meta:{count:2,productVersion:'2.0.0-alpha'},items:()=>[cola,water],get:id=>[cola,water].find(item=>item.id===id)||null};
  let legacyItems=[];
  const legacyLibrary={
    exportData:()=>({version:3,items:JSON.parse(JSON.stringify(legacyItems))}),
    importData:raw=>{legacyItems=(raw?.items||[]).filter(item=>Number(item.calories)>0).map(item=>({...JSON.parse(JSON.stringify(item)),source:['bls','off'].includes(item.source)?item.source:'user'}));return true},
    addCatalogItemToDay:raw=>{if(!(Number(raw?.calories)>0))return null;legacyItems.push({...raw,source:['bls','off'].includes(raw.source)?raw.source:'user'});return{id:'meal'}},
    openCatalogUse:raw=>Number(raw?.calories)>0,
    openUse:()=>true,
    render:()=>{}
  };
  w.CutCoachLibrary=legacyLibrary;w.mealCapacity=()=>1;let toast='';w.toast=message=>{toast=message};
  inject(w,'nutrition-stability-v201.js');await wait(35);
  const api=w.CutCoachNutritionStability201;assert.ok(api);assert.equal(api.version,'2.0.1-alpha');assert.equal(api.zeroSentinel,.01);
  assert.equal(api.aliasMatches('Coke Zero')[0]?.id,cola.id,'Alias-Suche findet Coke Zero nicht.');

  w.CutCoachLibrary.importData({version:3,items:[water]});
  assert.equal(legacyItems.length,1,'0-kcal-Produkt wird weiterhin vom Altschema verworfen.');
  assert.equal(legacyItems[0].calories,.01,'Technischer Persistenzwert fehlt.');
  const exported=w.CutCoachLibrary.exportData().items[0];
  assert.equal(exported.calories,0,'0 kcal werden nach außen nicht exakt rekonstruiert.');
  assert.equal(exported.source,'off','Produktquelle geht beim Speichern verloren.');
  assert.equal(exported.modified,false,'Technischer Nullkalorienwert wird fälschlich als lokale Änderung markiert.');

  w.CutCoachLibrary.importData({version:3,items:[{...cola,source:'manufacturer'}]});
  const restored=w.CutCoachLibrary.exportData().items[0];
  assert.equal(restored.source,'manufacturer');assert.equal(restored.brand,'Coca-Cola');assert.equal(restored.sourceLabel,cola.sourceLabel);

  const input=w.document.querySelector('#nutritionSearch');input.value='Coke Zero';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(60);
  const aliasRow=w.document.querySelector('.v201-alias-row [data-nutrition-open="ccp:coca-cola-zero"]');assert.ok(aliasRow,'Alias-Treffer wurde nicht in die normale Trefferliste ergänzt.');
  assert.match(aliasRow.closest('article').textContent,/Produkt/);assert.match(aliasRow.closest('article').textContent,/0 kcal/);
  const settled=api.snapshot().syncs;await wait(100);assert.equal(api.snapshot().syncs,settled,'Alias-Treffer lösen nach der Darstellung weitere Renderzyklen aus.');

  aliasRow.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));w.document.querySelector('#nutritionDetailModal').classList.add('open');await wait(60);
  const detailSettled=api.snapshot().syncs;await wait(100);assert.equal(api.snapshot().syncs,detailSettled,'Geöffnete Produktdetails laufen in einer Mutation-/Render-Schleife.');
  assert.match(w.document.querySelector('#nutritionDetailSource').textContent,/Herstellerangabe/);

  const multi=w.document.querySelector('#nutritionMultiSearch');multi._v192Rows=[{status:'matched',item:cola},{status:'matched',item:water}];let downstream=0;w.document.addEventListener('click',()=>{downstream++});
  multi.querySelector('[data-v192-all]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));
  assert.equal(downstream,0,'Teilweises Hinzufügen wurde nicht vor nachfolgenden Handlern blockiert.');assert.match(toast,/Nicht genügend Platz/);assert.equal(api.snapshot().bulkBlocks,1);

  const loader=read('version-v7.js'),runtime=read('runtime-manifest.js'),sw=read('sw.js'),packageJson=JSON.parse(read('package.json'));
  assert.match(loader,/nutrition-stability-v201\.js\?v=2\.0\.1-alpha/);assert.match(loader,/nutrition-voice-111\.js\?v=1\.9\.2-alpha/);assert.match(loader,/nutrition-cleanup-101\.js\?v=1\.0\.4-alpha/);assert.match(loader,/nutrition-spoken-intent-v202\.js\?v=2\.0\.2-alpha/);
  assert.ok(runtime.indexOf('nutrition-stability-v201.js?v=2.0.1-alpha')<runtime.indexOf('nutrition-polish-v138.js?v=1.3.11-alpha'));
  for(const asset of ['scanner-v2.js?v=1.8.1-alpha','off-lookup.js?v=1.8.1-alpha','nutrition-voice-111.js?v=1.9.2-alpha','nutrition-cleanup-101.js?v=1.0.4-alpha','nutrition-spoken-intent-v202.js?v=2.0.2-alpha'])assert.ok(runtime.includes(asset),`${asset} fehlt im Offline-Manifest.`);
  assert.match(sw,/nutrition201-stability/);assert.match(sw,/search202-spoken-intent/);assert.match(packageJson.scripts.test,/v201-nutrition-stability\.test\.js/);
  dom.window.close();console.log('Ernährungsstabilität 2.0.1: Aliase, Quellen, Nullkalorien, Sprachintention, atomische Mehrfachaktion und Render-Ruhe geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
