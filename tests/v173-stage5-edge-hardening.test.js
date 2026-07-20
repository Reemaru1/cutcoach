'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};
const wait=()=>new Promise(resolve=>queueMicrotask(resolve));

(async()=>{
  const gans={id:'gans',name:'Gans Fleisch, ohne Haut, roh',amount:100,unit:'g',calories:160,protein:22,carbs:0,fat:8,source:'bls'};
  const menemen={id:'menemen',name:'Menemen',amount:350,unit:'g',calories:430,protein:23,carbs:20,fat:28,source:'cutcoach',sourceLabel:'CutCoach Standardgericht · durchschnittlicher Richtwert'};
  const egg={id:'ei',name:'Ei',aliases:['Eier'],amount:1,unit:'Stück',calories:86,protein:7.5,carbs:.4,fat:6,source:'cutcoach'};
  const numericFood={id:'five-grain',name:'5 Korn Brot',amount:1,unit:'Stück',calories:120,protein:4,carbs:22,fat:2,source:'bls'};
  const misleadingFood={id:'grain',name:'Korn Brot',amount:1,unit:'Stück',calories:110,protein:4,carbs:20,fat:2,source:'bls'};
  const gramItem={id:'gram-item',name:'Skyr Spezial',amount:500,unit:'Gramm',calories:315,protein:55,carbs:20,fat:1,source:'user'};
  const literItem={id:'liter-item',name:'Saft Spezial',amount:.5,unit:'Liter',calories:210,protein:0,carbs:50,fat:0,source:'user'};
  const catalogDrink={id:'catalog-drink',name:'Protein Drink',amount:330,unit:'ml',calories:180,protein:25,carbs:10,fat:3,source:'cutcoach'};
  const personalDrink={id:'personal-drink',name:'Protein Drink',amount:500,unit:'ml',calories:240,protein:35,carbs:12,fat:4,source:'off',favorite:true,uses:5};
  const catalog=[gans,menemen,egg,numericFood,misleadingFood,gramItem,literItem,catalogDrink];
  const library=[personalDrink];
  const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Abendessen"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.CutCoachLibrary={exportData:()=>({items:library}),addItemToDay:()=>({id:'meal'}),addCatalogItemToDay:()=>({id:'meal'}),undoDayAdd:()=>true};
  w.CutCoachFoodCatalog={items:()=>catalog,get:id=>catalog.find(item=>item.id===id)||null};
  w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
  w.render=()=>{};w.toast=()=>{};
  for(const name of ['nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
  let engine=w.CutCoachIntelligentSearch128;
  engine=w.CutCoachSearchExactWhole170.attach(engine);
  engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
  engine=w.CutCoachPortionHardening153.attach(engine);
  const api=w.CutCoachIntelligentSearch128;
  assert.equal(api.exactWholeVersion,'1.7.1-alpha');
  assert.equal(api.exactWholeBuild,'1.7.1-stage5-edge-hardening');

  let rows=api.rowsFor('Ich hatte ca. 100 g Gans Fleisch, ohne Haut, roh gegessen.');
  assert.equal(rows.length,1);assert.equal(rows[0].item.id,gans.id);assert.equal(rows[0].status,'matched');assert.equal(rows[0].factor,1);

  rows=api.rowsFor('5 Korn Brot');assert.equal(rows.length,1);assert.equal(rows[0].item.id,numericFood.id);assert.equal(rows[0].factor,1);assert.notEqual(rows[0].item.id,misleadingFood.id,'Die führende Zahl wurde als Menge statt als Namensbestandteil interpretiert.');
  rows=api.rowsFor('1 5 Korn Brot');assert.equal(rows.length,1);assert.equal(rows[0].item.id,numericFood.id);assert.equal(rows[0].factor,1);
  rows=api.rowsFor('2 Stück 5 Korn Brot');assert.equal(rows[0].item.id,numericFood.id);assert.equal(rows[0].factor,2);

  rows=api.rowsFor('250 g Skyr Spezial');assert.equal(rows[0].item.id,gramItem.id);assert.equal(rows[0].status,'matched');assert.equal(rows[0].factor,.5);
  rows=api.rowsFor('250 ml Saft Spezial');assert.equal(rows[0].item.id,literItem.id);assert.equal(rows[0].status,'matched');assert.equal(rows[0].factor,.5);
  rows=api.rowsFor('1/2 l Saft Spezial');assert.equal(rows[0].item.id,literItem.id);assert.equal(rows[0].factor,1);assert.equal(rows[0].amountLabel,'500 ml');
  rows=api.rowsFor('5 dl Saft Spezial');assert.equal(rows[0].item.id,literItem.id);assert.equal(rows[0].factor,1);assert.equal(rows[0].amountLabel,'500 ml');

  rows=api.rowsFor('0 g Menemen');assert.equal(rows.length,1);assert.equal(rows[0].status,'review');assert.equal(rows[0].invalidQuantity,true);assert.equal(rows[0].factor,0);assert.match(rows[0].amountLabel,/größer als 0/);
  rows=api.rowsFor('1 Ei und 0 g Menemen');assert.equal(rows.length,1);assert.equal(rows[0].invalidQuantity,true);assert.equal(rows[0].item.name,'Menemen');

  rows=api.rowsFor('500 ml Protein Drink');assert.equal(rows.length,1);assert.equal(rows[0].item.id,personalDrink.id);assert.equal(rows[0].origin,'library');assert.equal(rows[0].factor,1);assert.ok(rows[0].alternatives.some(value=>String(value).startsWith('Standard:')),'Alternative Quelle wird nicht verständlich beschriftet.');
  const stats=api.indexStats();assert.ok(stats.origins.library>=1);assert.ok(stats.origins.catalog>=catalog.length);

  const input=w.document.querySelector('#nutritionSearch');input.value='0 g Menemen';api.render(input);let host=w.document.querySelector('#nutritionMultiSearch');assert.ok(host);assert.equal(host.querySelectorAll('[data-canonical-add]').length,0);assert.match(host.textContent,/Menge muss größer als 0 sein/);

  let refreshes=0;const nativeRender=api.render;Object.defineProperty(w,'CutCoachIntelligentSearch128',{configurable:true,writable:true,value:Object.freeze({...api,render(field){refreshes++;return nativeRender(field)}})});
  input.value='100 g Gans Fleisch, ohne Haut, roh';inject(w,read('nutrition-multisearch-120.js'));await wait();assert.equal(w.CutCoachNutritionMultiSearch120.version,'1.7.1-compat');assert.ok(refreshes>=1,'Eine bereits gefüllte Suche wird nach dem Bootstrap nicht aktualisiert.');
  const resolved=w.CutCoachNutritionMultiSearch120.resolve('0 g Menemen');assert.equal(resolved.invalidQuantity,true);assert.equal(resolved.status,'review');

  const css=read('nutrition-search-confidence-v150.css');assert.match(css,/grid-template-columns:34px minmax\(0,1fr\) auto/);assert.match(css,/button\[data-canonical-search\]/);assert.match(css,/white-space:normal!important/);
  const compatibility=read('nutrition-multisearch-120.js');assert.doesNotMatch(compatibility,/addEventListener\s*\(|setTimeout|setInterval|requestAnimationFrame|requestIdleCallback|innerHTML|CutCoachLibrary/);assert.match(compatibility,/refreshCurrent\(\)/);assert.match(compatibility,/1\.7\.1-compat/);
  const loader=read('version-v7.js'),manifest=read('runtime-manifest.js'),sw=read('sw.js');
  assert.match(loader,/nutrition-search-exact-whole-v170\.js\?v=1\.7\.1-alpha/);assert.match(loader,/nutrition-search-confidence-v150\.css\?v=1\.7\.1-alpha/);assert.match(loader,/nutrition-multisearch-120\.js\?v=1\.7\.1-compat/);
  assert.match(manifest,/nutrition-search-exact-whole-v170\.js\?v=1\.7\.1-alpha/);assert.match(manifest,/nutrition-search-confidence-v150\.css\?v=1\.7\.1-alpha/);assert.match(manifest,/nutrition-multisearch-120\.js\?v=1\.7\.1-compat/);assert.match(sw,/search171-edge-hardening/);

  dom.window.close();
  console.log('Stufe 5 A-Z Hardening 1.7.1: natürliche Sprache, Zahlenamen, Einheiten, Nullmengen, persönliche Quellen, Bootstrap und iPhone-Layout geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});