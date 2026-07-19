'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const intelligent=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const menemen={id:'ccmeal:menemen',name:'Menemen',aliases:['Türkisches Rührei','Menemen mit Ei'],amount:350,unit:'g',calories:430,protein:23,carbs:20,fat:28,source:'cutcoach',catalog:true};
const menemenSucuk={id:'ccmeal:menemen-sucuk',name:'Menemen mit Sucuk',aliases:['Sucuklu Menemen'],amount:400,unit:'g',calories:650,protein:32,carbs:22,fat:47,source:'cutcoach',catalog:true};
const noodles={id:'ccde:nudeln-tomatensauce',name:'Nudeln mit Tomatensauce',aliases:['Pasta Pomodoro'],amount:480,unit:'g',calories:620,protein:20,carbs:100,fat:15,source:'cutcoach',catalog:true};
const items=[menemen,menemenSucuk,noodles];

const dom=new JSDOM(`<!doctype html><body data-nutrition-meal-type="Frühstück"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.CutCoachFoodCatalog={items:()=>items,get:id=>items.find(item=>item.id===id)||null};
window.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>true};
const script=window.document.createElement('script');script.textContent=intelligent;window.document.head.append(script);

const api=window.CutCoachIntelligentSearch128;
assert.equal(api.version,'1.4.5-alpha','Kombinationssuche besitzt nicht die erwartete Version.');
const colaRows=api.rowsFor('Cola mit Menemen');
assert.equal(colaRows.length,2);
assert.deepEqual(Array.from(colaRows,row=>row.item.name),['Cola','Menemen']);
assert.ok(colaRows.every(row=>row.status==='matched'));
const ayranRows=api.rowsFor('Ayran mit Menemen');
assert.equal(ayranRows.length,2);
assert.deepEqual(Array.from(ayranRows,row=>row.item.name),['Ayran','Menemen']);
assert.equal(ayranRows[0].item.unit,'ml');
assert.equal(api.likelyMulti('Cola mit Menemen'),true);
assert.equal(api.likelyMulti('Ayran mit Menemen'),true);
assert.equal(api.likelyMulti('Menemen mit Sucuk'),false);
assert.equal(api.rowsFor('Menemen mit Sucuk').length,0);
assert.equal(api.likelyMulti('Nudeln mit Tomatensauce'),false);

const input=window.document.querySelector('#nutritionSearch');input.value='Ayran mit Menemen';
assert.equal(api.render(input),true);
const host=window.document.querySelector('#nutritionMultiSearch');
assert.match(host.textContent,/2 Bestandteile erkannt/);
assert.match(host.textContent,/Ayran/);
assert.match(host.textContent,/Menemen/);
assert.ok(host.querySelector('[data-canonical-all]'));
assert.ok(loader.includes('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha'));
assert.ok(runtime.includes('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha'));
assert.ok(sw.includes('-nav136-journal137-nutrition138-dishes140`'));
assert.ok(sw.includes('`${CACHE_BASE}-search146`'));

dom.window.close();
console.log('Cola/Ayran mit Menemen bleiben unter konsolidierter Suche stabil.');