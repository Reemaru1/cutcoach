'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const profiles=fs.readFileSync(path.join(root,'nutrition-portion-profiles-v153.js'),'utf8');
const portions=fs.readFileSync(path.join(root,'nutrition-portion-hardening-v153.js'),'utf8');
const confidence=fs.readFileSync(path.join(root,'nutrition-search-confidence-hardening-v151.js'),'utf8');
const canonical=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const compatibility=fs.readFileSync(path.join(root,'nutrition-multisearch-120.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const items=[
  {id:'toast',name:'Toastbrot',aliases:['Toast'],amount:1,unit:'Stück',calories:80,protein:2.8,carbs:14.5,fat:1.1,source:'cutcoach'},
  {id:'butter',name:'Butter',amount:10,unit:'g',calories:74,protein:.1,carbs:.1,fat:8.2,source:'cutcoach'},
  {id:'oats',name:'Haferflocken',amount:50,unit:'g',calories:185,protein:6.5,carbs:29,fat:3.5,source:'cutcoach'},
  {id:'cola',name:'Cola',amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,source:'cutcoach'},
  {id:'potato',name:'Kartoffel roh',aliases:['Kartoffeln'],amount:100,unit:'g',calories:70,protein:2,carbs:15,fat:.1,source:'bls'},
  {id:'kombucha',name:'Kombucha',amount:100,unit:'ml',calories:20,protein:0,carbs:5,fat:0,source:'user'},
  {id:'steak',name:'Rindersteak',aliases:['Steak'],amount:100,unit:'g',calories:220,protein:26,carbs:0,fat:12,source:'bls'},
  {id:'menemen',name:'Menemen',amount:350,unit:'g',calories:430,protein:23,carbs:20,fat:28,source:'cutcoach',sourceLabel:'CutCoach Standardgericht · durchschnittlicher Richtwert'},
  {id:'whey',name:'Whey Protein',aliases:['Whey'],amount:30,unit:'g',calories:115,protein:24,carbs:2,fat:1,source:'user',householdMeasures:{EL:{amount:12,unit:'g'}}}
];
const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Abendessen"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;const added=[];
w.CutCoachFoodCatalog={items:()=>items,get:id=>items.find(item=>item.id===id)||null};
w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
w.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:(item,options)=>{added.push({item,options});return{id:'meal'}}};w.render=()=>{};w.toast=()=>{};
for(const source of [profiles,portions,confidence,canonical]){const script=w.document.createElement('script');script.textContent=source;w.document.head.append(script)}
let engine=w.CutCoachIntelligentSearch128;engine=w.CutCoachSearchConfidenceHardening151.attach(engine);engine=w.CutCoachPortionHardening153.attach(engine);
const api=w.CutCoachIntelligentSearch128;
assert.equal(api.version,'1.5.3-alpha');assert.equal(api.build,'1.5.3-food-specific-portions');assert.equal(api.portionVersion,'1.5.3-alpha');
let row=api.rowsFor('2 Scheiben Toast')[0];assert.equal(row.item.name,'Toastbrot');assert.equal(row.status,'matched');assert.equal(row.factor,2);assert.match(row.amountLabel,/2 Scheiben ≈ 50 g/);
row=api.rowsFor('1 EL Butter')[0];assert.equal(row.status,'matched');assert.equal(row.factor,1.5);assert.match(row.amountLabel,/1 EL ≈ 15 g/);
row=api.rowsFor('1 Handvoll Haferflocken')[0];assert.equal(row.status,'matched');assert.ok(Math.abs(row.factor-.6)<.0001);assert.match(row.amountLabel,/30 g/);
row=api.rowsFor('1 Dose Cola')[0];assert.equal(row.status,'matched');assert.equal(row.factor,1);assert.match(row.amountLabel,/330 ml/);
row=api.rowsFor('2 Stück Kartoffeln')[0];assert.equal(row.status,'matched');assert.equal(row.factor,3);assert.match(row.amountLabel,/300 g/);
row=api.rowsFor('2 Portionen Menemen')[0];assert.equal(row.status,'matched');assert.equal(row.factor,2);assert.match(row.amountLabel,/700 g/);
row=api.rowsFor('1 EL Whey')[0];assert.equal(row.status,'matched');assert.ok(Math.abs(row.factor-.4)<.0001);assert.equal(row.confidence,100);
row=api.rowsFor('1 Glas Kombucha')[0];assert.equal(row.status,'review');assert.equal(row.factor,2.5);assert.equal(row.portionNeedsReview,true);assert.match(row.amountLabel,/250 ml/);
row=api.rowsFor('1 EL Steak')[0];assert.equal(row.status,'review');assert.equal(row.factor,1);assert.match(row.amountLabel,/Menge prüfen/);
row=api.rowsFor('250 g Steak')[0];assert.equal(row.status,'matched');assert.equal(row.factor,2.5);assert.equal(row.amountLabel,'250 g');
const input=w.document.querySelector('#nutritionSearch');input.value='1 EL Steak';assert.equal(api.render(input),true);const host=w.document.querySelector('#nutritionMultiSearch');assert.match(host.textContent,/Portionsgröße vor dem Eintragen prüfen/);assert.equal(host.querySelector('[data-canonical-all]').disabled,true);assert.equal(host.querySelectorAll('[data-canonical-add]').length,0);
const facadeScript=w.document.createElement('script');facadeScript.textContent=compatibility;w.document.head.append(facadeScript);assert.equal(w.CutCoachNutritionMultiSearch120.version,'1.5.3-compat');assert.match(w.CutCoachNutritionMultiSearch120.resolve('1 EL Butter').amountLabel,/15 g/);
const profilePos=loader.indexOf('nutrition-portion-profiles-v153.js?v=1.5.3-alpha'),portionPos=loader.indexOf('nutrition-portion-hardening-v153.js?v=1.5.3-alpha'),confidencePos=loader.indexOf('nutrition-search-confidence-hardening-v151.js?v=1.5.2-alpha'),canonicalPos=loader.indexOf('nutrition-multisearch-canonical-128.js?v=1.5.0-alpha');assert.ok(profilePos>=0&&profilePos<portionPos&&portionPos<confidencePos&&confidencePos<canonicalPos);
assert.match(manifest,/nutrition-portion-profiles-v153\.js\?v=1\.5\.3-alpha/);assert.match(manifest,/nutrition-portion-hardening-v153\.js\?v=1\.5\.3-alpha/);assert.match(manifest,/nutrition-multisearch-120\.js\?v=1\.5\.3-compat/);assert.match(sw,/search153-portions/);
dom.window.close();console.log('Lebensmittelbezogene Portionsprofile 1.5.3: ok');