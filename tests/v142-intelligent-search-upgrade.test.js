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
  {id:'ccmeal:menemen',name:'Menemen',aliases:['Türkisches Rührei','Menemen mit Ei'],amount:350,unit:'g',calories:430,protein:23,carbs:20,fat:28,source:'cutcoach',catalog:true},
  {id:'ccmeal:menemen-sucuk',name:'Menemen mit Sucuk',aliases:['Sucuklu Menemen'],amount:400,unit:'g',calories:650,protein:32,carbs:22,fat:47,source:'cutcoach',catalog:true},
  {id:'ccmeal:simit',name:'Simit',aliases:['Türkischer Sesamring'],amount:120,unit:'g',calories:410,protein:13,carbs:62,fat:13,source:'cutcoach',catalog:true},
  {id:'ccde:doner-kalb',name:'Döner Kebab Kalb/Rind',aliases:['Döner','Kebab'],amount:550,unit:'g',calories:850,protein:45,carbs:82,fat:34,source:'cutcoach',catalog:true},
  {id:'ccmeal:goezleme-spinat',name:'Gözleme mit Spinat und Käse',aliases:['Spinat Gözleme'],amount:300,unit:'g',calories:590,protein:22,carbs:67,fat:25,source:'cutcoach',catalog:true},
  {id:'ccde:nudeln-tomatensauce',name:'Nudeln mit Tomatensauce',aliases:['Pasta Pomodoro'],amount:480,unit:'g',calories:620,protein:20,carbs:100,fat:15,source:'cutcoach',catalog:true}
];
const byId=id=>items.find(item=>item.id===id)||null;
const added=[];
const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Frühstück"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.CutCoachFoodCatalog={items:()=>items,get:byId};
window.CutCoachEverydayCatalog={get:byId};
window.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:(item,options)=>{added.push({item,options});return{id:'meal'}}};
window.render=()=>{};
window.toast=()=>{};
const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
const api=window.CutCoachIntelligentSearch128;
assert.equal(api.version,'1.4.5-alpha');

const skyr=api.rowsFor('250 g Skyr mit Banane');
assert.deepEqual(Array.from(skyr,row=>row.item.name),['Skyr Natur','Banane']);
assert.equal(skyr[0].factor,1,'250 g Skyr muss exakt einer 250-g-Basis entsprechen.');
assert.equal(skyr[0].amountLabel,'250 g');
assert.equal(skyr[1].factor,1);

const cola=api.rowsFor('0,5 l Cola');
assert.equal(cola.length,1);
assert.equal(cola[0].item.name,'Cola');
assert.ok(Math.abs(cola[0].factor-(500/330))<0.0001,'0,5 l Cola wird nicht in 500 ml umgerechnet.');
assert.equal(cola[0].amountLabel,'500 ml');

const breakfast=api.rowsFor('Zum Frühstück gab es heute 2 Eier und 1 Simit');
assert.deepEqual(Array.from(breakfast,row=>row.item.name),['Ei','Simit']);
assert.equal(breakfast[0].factor,2,'Zwei Eier werden nicht als zwei Stück erkannt.');
assert.equal(breakfast[1].factor,1);

const typo=api.rowsFor('Menemem');
assert.equal(typo.length,1,'Sicherer Tippfehler wird nicht erkannt.');
assert.equal(typo[0].item.name,'Menemen');
assert.equal(typo[0].corrected,'Menemen');

const modifier=api.rowsFor('Döner ohne Soße');
assert.equal(modifier.length,1);
assert.equal(modifier[0].item.name,'Döner Kebab Kalb/Rind');
assert.equal(modifier[0].modifier,'Soße');
assert.equal(modifier[0].factor,1,'„ohne Soße“ darf die Basisportion nicht unkontrolliert verändern.');

assert.equal(api.likelyMulti('Cola ohne Zucker'),false,'Fester Begriff „Cola ohne Zucker“ wird fälschlich als Modifikation zerlegt.');
assert.equal(api.rowsFor('Cola ohne Zucker').length,0,'Cola Zero muss als normaler Einzelbegriff geschützt bleiben.');
assert.equal(api.rowsFor('Menemen mit Sucuk').length,0,'Eigenständiges Gericht mit „mit“ wird zerlegt.');
assert.equal(api.rowsFor('Gözleme mit Spinat und Käse').length,0,'Eigenständiges Gericht mit „mit“ und „und“ wird zerlegt.');
assert.equal(api.rowsFor('Nudeln mit Tomatensauce').length,0,'Eigenständiges Pastagericht wird zerlegt.');

const incompatible=api.rowsFor('500 ml Menemen');
assert.equal(incompatible.length,1);
assert.equal(incompatible[0].status,'incompatible','Unpassende Einheit wird nicht abgefangen.');

const input=window.document.querySelector('#nutritionSearch');
input.value='250 g Skyr mit Banane';
assert.equal(api.render(input),true);
assert.match(window.document.querySelector('#nutritionMultiSearch').textContent,/250 g/);
window.document.querySelector('[data-canonical-all]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
assert.equal(added.length,2,'Alle erkannten Bestandteile werden nicht gemeinsam hinzugefügt.');
assert.ok(Math.abs(added[0].options.factor-1)<0.0001);
assert.equal(added[1].options.factor,1);

assert.ok(loader.includes('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha'));
assert.ok(runtime.includes('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha'));
assert.ok(sw.includes('`${CACHE_BASE}-search146`'));

dom.window.close();
console.log('Mengen, natürliche Sätze, Tippfehler, Modifikatoren und Gerichte-Schutz unter konsolidierter Suche geprüft.');