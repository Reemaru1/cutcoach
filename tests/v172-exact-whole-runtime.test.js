'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};

const dish={id:'dish-lachs-reis',name:'Lachs mit Reis und Gemüse',aliases:['Lachs Reis Teller'],amount:550,unit:'g',calories:820,protein:48,carbs:79,fat:32,source:'cutcoach'};
const goose={id:'bls-goose',name:'Gans Fleisch, ohne Haut, roh',amount:100,unit:'g',calories:160,protein:22,carbs:0,fat:8,source:'bls'};
const menemen={id:'ccmeal:menemen',name:'Menemen',aliases:['Türkisches Rührei'],amount:350,unit:'g',calories:430,protein:23,carbs:20,fat:28,source:'cutcoach'};
const puddingOne={id:'pudding-1',name:'Protein Pudding',amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'bls'};
const puddingTwo={id:'pudding-2',name:'Protein Pudding',amount:200,unit:'g',calories:180,protein:18,carbs:16,fat:4,source:'bls'};
const catalog=[dish,goose,menemen,puddingOne,puddingTwo];

const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Abendessen"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionResults"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;
w.CutCoachLibrary={exportData:()=>({items:[]}),addItemToDay:()=>({id:'meal'}),addCatalogItemToDay:()=>({id:'meal'}),undoDayAdd:()=>true};
w.CutCoachFoodCatalog={items:()=>catalog,get:id=>catalog.find(item=>item.id===id)||null};
w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};w.render=()=>{};w.toast=()=>{};
for(const name of ['nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
let engine=w.CutCoachIntelligentSearch128;
engine=w.CutCoachSearchExactWhole170.attach(engine);
engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
engine=w.CutCoachPortionHardening153.attach(engine);
const api=w.CutCoachIntelligentSearch128;
assert.equal(api.exactWholeVersion,'1.7.0-alpha');

let rows=api.rowsFor('550 g Lachs mit Reis und Gemüse');
assert.equal(rows.length,1);assert.equal(rows[0].item.id,dish.id);assert.equal(rows[0].status,'matched');assert.equal(rows[0].factor,1);assert.notEqual(rows[0].matchType,'fuzzy','Vollständiger Gerichtname wurde nur über Tippfehlerlogik gefunden.');
rows=api.rowsFor('100 g Gans Fleisch, ohne Haut, roh');
assert.equal(rows.length,1);assert.equal(rows[0].item.id,goose.id);assert.equal(rows[0].status,'matched');
rows=api.rowsFor('100 g Protein Pudding');
assert.equal(rows.length,1);assert.equal(rows[0].status,'ambiguous');assert.deepEqual(new Set(rows[0].choices.map(choice=>choice.item.id)),new Set([puddingOne.id,puddingTwo.id]));
rows=api.rowsFor('500 ml Menemen');
assert.equal(rows.length,1);assert.equal(rows[0].item.id,menemen.id);assert.equal(rows[0].status,'incompatible');
rows=api.rowsFor('2 Portionen Menemen');
assert.equal(rows.length,1);assert.equal(rows[0].item.id,menemen.id);assert.ok(['matched','review'].includes(rows[0].status));assert.equal(rows[0].factor,2);
assert.equal(api.rowsFor('Lachs mit Reis und Gemüse').length,0,'Normale Einzelwort-/Gerichtesuche darf nicht durch die Mengenebene übernommen werden.');
rows=api.rowsFor('Toast mit Quantenbrot');
assert.equal(rows.length,2);assert.equal(rows[0].item.name,'Toastbrot');assert.equal(rows[1].status,'missing');

api.rowsFor('100 g Neue Schutzspeise');
const newItem={id:'new-protected',name:'Neue Schutzspeise mit Reis',amount:100,unit:'g',calories:200,protein:10,carbs:25,fat:5,source:'user'};
catalog.push(newItem);
assert.equal(api.rowsFor('100 g Neue Schutzspeise mit Reis').some(row=>row.item?.id===newItem.id),false,'Index wurde ohne Ereignis unerwartet neu aufgebaut.');
w.dispatchEvent(new w.CustomEvent('cutcoach:catalog-updated'));
rows=api.rowsFor('100 g Neue Schutzspeise mit Reis');assert.equal(rows.length,1);assert.equal(rows[0].item.id,newItem.id);

const loader=read('version-v7.js'),compatibility=read('nutrition-multisearch-120.js'),manifest=read('runtime-manifest.js'),sw=read('sw.js');
assert.match(loader,/nutrition-search-exact-whole-v170\.js\?v=1\.7\.0-alpha/);
assert.match(loader,/CutCoachSearchExactWhole170\?\.attach[\s\S]*CutCoachSearchConfidenceHardening151\?\.attach[\s\S]*CutCoachPortionHardening153\?\.attach/);
assert.match(compatibility,/const VERSION='1\.7\.0-compat'/);assert.match(compatibility,/nutrition-search-exact-whole-v170\.js\?v=1\.7\.0-alpha/);
assert.match(manifest,/nutrition-search-exact-whole-v170\.js\?v=1\.7\.0-alpha/);assert.match(manifest,/nutrition-multisearch-120\.js\?v=1\.7\.0-compat/);
assert.match(sw,/search170-exact-whole/);
inject(w,compatibility);assert.equal(w.CutCoachNutritionMultiSearch120.version,'1.7.0-compat');assert.equal(w.CutCoachNutritionMultiSearch120.resolve('550 g Lachs mit Reis und Gemüse').match.id,dish.id);

dom.window.close();console.log('Stufe 5 Exact-Whole 1.7.0: Vollnamen, Kollisionen, Einheiten, Index und produktive Ladefolge geprüft.');
