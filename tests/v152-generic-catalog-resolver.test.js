'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const canonical=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'nutrition-search-confidence-hardening-v151.js'),'utf8');
const compatibility=fs.readFileSync(path.join(root,'nutrition-multisearch-120.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const catalog=[
 {id:'bls-steak-1',name:'Rindersteak, gegrillt',aliases:[],amount:100,unit:'g',calories:210,protein:29,carbs:0,fat:10,source:'bls'},
 {id:'bls-steak-2',name:'Hüftsteak vom Rind',aliases:[],amount:100,unit:'g',calories:190,protein:28,carbs:0,fat:8,source:'bls'},
 {id:'bls-kartoffel',name:'Kartoffel gegart',aliases:[],amount:100,unit:'g',calories:75,protein:2,carbs:15,fat:.1,source:'bls'},
 {id:'bls-lachs',name:'Lachsfilet gegart',aliases:[],amount:100,unit:'g',calories:205,protein:23,carbs:0,fat:12,source:'bls'}
];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const dom=new JSDOM('<body data-nutrition-meal-type="Abendessen"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
 const w=dom.window;
 w.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>true};
 w.CutCoachFoodCatalog={items:()=>catalog,get:id=>catalog.find(item=>item.id===id)||null};
 w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};w.render=()=>{};w.toast=()=>{};
 for(const source of [canonical,hardening]){const script=w.document.createElement('script');script.textContent=source;w.document.head.append(script)}
 w.CutCoachSearchConfidenceHardening151.attach(w.CutCoachIntelligentSearch128);
 const compat=w.document.createElement('script');compat.textContent=compatibility;w.document.head.append(compat);
 const api=w.CutCoachIntelligentSearch128;
 assert.equal(api.version,'1.5.2-alpha');
 assert.equal(api.build,'1.5.2-generic-catalog-resolver');
 const dinner=api.rowsFor('250g Steak mit Eier');
 assert.equal(dinner.length,2,'Steak und Eier werden nicht getrennt verarbeitet.');
 assert.equal(dinner[0].status,'ambiguous','Mehrere passende Steakvarianten müssen auswählbar sein.');
 assert.ok(dinner[0].choices.some(choice=>/Steak/i.test(choice.item.name)),'Steak-Auswahl fehlt.');
 assert.equal(dinner[1].item.name,'Ei');
 const potatoes=api.rowsFor('200 g Kartoffeln und 100 g Lachs');
 assert.equal(potatoes.length,2);
 assert.equal(potatoes[0].item.id,'bls-kartoffel','Plural Kartoffeln wird nicht generisch aufgelöst.');
 assert.equal(potatoes[0].factor,2);
 assert.equal(potatoes[1].item.id,'bls-lachs','Zusammengesetzter Katalogname Lachsfilet wird nicht gefunden.');
 assert.equal(api.rowsFor('1 Tantuni')[0].item.name,'Tantuni Dürüm','Tantuni fehlt als lokales Standardgericht.');
 const input=w.document.querySelector('#nutritionSearch');input.value='tantuni';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(240);
 assert.match(w.document.querySelector('#nutritionMultiSearch').textContent,/Tantuni Dürüm/,'Tantuni wird beim normalen Tippen nicht vorgeschlagen.');
 input.value='250g Steak mit Eier';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(240);
 const host=w.document.querySelector('#nutritionMultiSearch');assert.ok(host.querySelectorAll('[data-confidence-choice]').length>=2,'Steakvarianten sind nicht konkret auswählbar.');
 assert.match(manifest,/nutrition-portion-profiles-v153\.js\?v=1\.5\.3-alpha/);
 assert.match(manifest,/nutrition-portion-hardening-v153\.js\?v=1\.5\.3-alpha/);
 assert.match(manifest,/nutrition-search-confidence-hardening-v151\.js\?v=1\.5\.2-alpha/);
 assert.match(sw,/search153-portions/);
 dom.window.close();console.log('Generischer Vollkatalog-Resolver 1.5.2 bleibt unter Portionscache 1.5.3 stabil.');
})().catch(error=>{console.error(error);process.exitCode=1});