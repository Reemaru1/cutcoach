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
const items=[
{id:'ccmeal:menemen-sucuk',name:'Menemen mit Sucuk',aliases:['Sucuklu Menemen'],amount:400,unit:'g',calories:650,protein:32,carbs:22,fat:47,source:'cutcoach',catalog:true},
{id:'ccde:nudeln-tomatensauce',name:'Nudeln mit Tomatensauce',aliases:['Pasta Pomodoro'],amount:480,unit:'g',calories:620,protein:20,carbs:100,fat:15,source:'cutcoach',catalog:true}
];
const byId=id=>items.find(item=>item.id===id)||null,added=[];
const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Snack"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.CutCoachFoodCatalog={items:()=>items,get:byId};window.CutCoachEverydayCatalog={items:()=>[],get:byId};window.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:(item,options)=>{added.push({item,options});return{id:'meal'}}};window.render=()=>{};window.toast=()=>{};
const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
const api=window.CutCoachIntelligentSearch128;assert.equal(api.version,'1.5.0-alpha');
const natural=api.rowsFor('Hab 2 Scheiben Toast mit 50 g Sucuk gegessen');assert.deepEqual(Array.from(natural,row=>row.item?.name),['Toastbrot','Sucuk']);assert.equal(natural[0].factor,2);assert.equal(natural[0].amountLabel,'2 Scheiben');assert.equal(natural[0].approximate,true);assert.equal(natural[1].factor,1);assert.equal(natural[1].amountLabel,'50 g');assert.ok(natural.every(row=>row.status==='matched'&&row.confidence>=90));
const compound=api.rowsFor('Sucuktoast');assert.deepEqual(Array.from(compound,row=>row.item?.name),['Sucuk','Toastbrot']);assert.ok(compound.every(row=>row.confidence>=90));
const onTop=api.rowsFor('Käse auf Toast');assert.deepEqual(Array.from(onTop,row=>row.item?.name),['Käse','Toastbrot']);
const slash=api.rowsFor('Naturjoghurt / Apfel');assert.deepEqual(Array.from(slash,row=>row.item?.name),['Naturjoghurt','Apfel']);
const breakfast=api.rowsFor('Milch und Haferflocken');assert.deepEqual(Array.from(breakfast,row=>row.item?.name),['Milch 3,5 %','Haferflocken']);
const partial=api.rowsFor('Toast mit unbekannt');assert.equal(partial.length,2);assert.equal(partial[0].item.name,'Toastbrot');assert.equal(partial[0].status,'matched');assert.equal(partial[1].status,'missing');
const input=window.document.querySelector('#nutritionSearch');input.value='Toast mit unbekannt';assert.equal(api.render(input),true);assert.match(window.document.querySelector('#nutritionMultiSearch').textContent,/1 sicher/);assert.ok(window.document.querySelector('[data-canonical-search]'));assert.equal(window.document.querySelector('[data-canonical-all]').disabled,true);assert.equal(window.document.querySelectorAll('[data-canonical-add]').length,1);
assert.equal(api.rowsFor('Menemen mit Sucuk').length,0);assert.equal(api.rowsFor('Nudeln mit Tomatensauce').length,0);
input.value='2 Scheiben Toast mit 50 g Sucuk';assert.equal(api.render(input),true);window.document.querySelector('[data-canonical-all]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));assert.equal(added.length,2);assert.equal(added[0].options.factor,2);assert.equal(added[1].options.factor,1);
assert.ok(loader.includes('nutrition-multisearch-canonical-128.js?v=1.5.0-alpha'));assert.ok(runtime.includes('nutrition-multisearch-canonical-128.js?v=1.5.0-alpha'));assert.ok(sw.includes('`${CACHE_BASE}-search152-catalog`'));
dom.window.close();console.log('Sprache, Einheiten, Komposita und Teiltreffer bleiben unter Vollkatalog-Resolver stabil.');