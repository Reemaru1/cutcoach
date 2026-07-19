'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const menemenSucuk={id:'ccmeal:menemen-sucuk',name:'Menemen mit Sucuk',aliases:['Sucuklu Menemen'],amount:400,unit:'g',calories:650,protein:32,carbs:22,fat:47,source:'cutcoach',catalog:true};
const items=[menemenSucuk];
const added=[];
const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Snack"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.CutCoachFoodCatalog={items:()=>items,get:id=>items.find(item=>item.id===id)||null};
window.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:(item,options)=>{added.push({item,options});return{id:'meal'}}};
window.render=()=>{};
window.toast=()=>{};
const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
const api=window.CutCoachIntelligentSearch128;

assert.equal(api.version,'1.4.5-alpha');

const sucukToast=api.rowsFor('sucuk mit toast');
assert.equal(sucukToast.length,2,'„Sucuk mit Toast“ wird nicht in zwei Bestandteile zerlegt.');
assert.deepEqual(Array.from(sucukToast,row=>row.item.name),['Sucuk','Toastbrot']);
assert.ok(sucukToast.every(row=>row.status==='matched'));
assert.equal(sucukToast[0].item.source,'cutcoach');
assert.equal(sucukToast[1].item.unit,'Stück');
assert.equal(api.likelyMulti('sucuk mit toast'),true);

assert.deepEqual(Array.from(api.rowsFor('toast mit käse'),row=>row.item.name),['Toastbrot','Käse']);
assert.deepEqual(Array.from(api.rowsFor('brot mit butter'),row=>row.item.name),['Brot','Butter']);
assert.deepEqual(Array.from(api.rowsFor('tomate und gurke'),row=>row.item.name),['Tomate','Gurke']);
assert.deepEqual(Array.from(api.rowsFor('sucuk toast'),row=>row.item.name),['Sucuk','Toastbrot']);
assert.deepEqual(Array.from(api.rowsFor('2 toast mit sucuk'),row=>row.item.name),['Toastbrot','Sucuk']);
assert.equal(api.rowsFor('2 toast mit sucuk')[0].factor,2,'Zwei Toastscheiben werden nicht als zwei Stück übernommen.');

assert.equal(api.likelyMulti('Menemen mit Sucuk'),false,'Vollständiges Gericht wird fälschlich als Komponenten zerlegt.');
assert.equal(api.rowsFor('Menemen mit Sucuk').length,0,'Vollständiges Gericht liefert unerwünschte Komponentenansicht.');

const input=window.document.querySelector('#nutritionSearch');
input.value='sucuk mit toast';
assert.equal(api.render(input),true,'Komponentenansicht wird nicht gerendert.');
const host=window.document.querySelector('#nutritionMultiSearch');
assert.match(host.textContent,/2 Bestandteile erkannt/);
assert.match(host.textContent,/Sucuk/);
assert.match(host.textContent,/Toastbrot/);
host.querySelector('[data-canonical-all]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
assert.equal(added.length,2,'Sucuk und Toast werden nicht gemeinsam hinzugefügt.');
assert.equal(added[0].options.type,'Snack');

assert.ok(loader.includes('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha'));
assert.ok(runtime.includes('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha'));
assert.ok(sw.includes('`${CACHE_BASE}-search145`'));

dom.window.close();
console.log('Sucuk mit Toast und weitere häufige Komponenten bleiben unter 1.4.5 stabil.');