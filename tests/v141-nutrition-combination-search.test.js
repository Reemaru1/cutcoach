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

const dom=new JSDOM(`<!doctype html><body data-nutrition-meal-type="Frühstück"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>`,{
  url:'https://example.test/cutcoach/',
  runScripts:'dangerously',
  pretendToBeVisual:true
});
const {window}=dom;
window.CutCoachFoodCatalog={items:()=>items,get:id=>items.find(item=>item.id===id)||null};
window.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>true};
const script=window.document.createElement('script');
script.textContent=intelligent;
window.document.head.append(script);

const api=window.CutCoachIntelligentSearch128;
assert.equal(api.version,'1.4.1-alpha','Neue Kombinationssuche besitzt nicht die erwartete Version.');

const colaRows=api.rowsFor('Cola mit Menemen');
assert.equal(colaRows.length,2,'„Cola mit Menemen“ wird nicht in zwei Bestandteile zerlegt.');
assert.deepEqual(colaRows.map(row=>row.item.name),['Cola','Menemen'],'Cola und Menemen werden nicht getrennt vorgeschlagen.');
assert.ok(colaRows.every(row=>row.status==='matched'),'Cola-Menemen-Kombination enthält unsichere Treffer.');

const ayranRows=api.rowsFor('Ayran mit Menemen');
assert.equal(ayranRows.length,2,'„Ayran mit Menemen“ wird nicht in zwei Bestandteile zerlegt.');
assert.deepEqual(ayranRows.map(row=>row.item.name),['Ayran','Menemen'],'Ayran und Menemen werden nicht getrennt vorgeschlagen.');
assert.equal(ayranRows[0].item.unit,'ml','Ayran wird nicht als Getränk behandelt.');

assert.equal(api.likelyMulti('Cola mit Menemen'),true,'„mit“-Kombination wird nicht als Mehrfachsuche erkannt.');
assert.equal(api.likelyMulti('Ayran mit Menemen'),true,'Ayran-Menemen wird nicht als Mehrfachsuche erkannt.');
assert.equal(api.likelyMulti('Menemen mit Sucuk'),false,'Eigenständiges Gericht „Menemen mit Sucuk“ wird fälschlich zerlegt.');
assert.equal(api.rowsFor('Menemen mit Sucuk').length,0,'Eigenständiges Gericht wird als Kombination dargestellt.');
assert.equal(api.likelyMulti('Nudeln mit Tomatensauce'),false,'Eigenständiges Gericht „Nudeln mit Tomatensauce“ wird fälschlich zerlegt.');

const input=window.document.querySelector('#nutritionSearch');
input.value='Ayran mit Menemen';
assert.equal(api.render(input),true,'Kombinationsvorschlag wird nicht gerendert.');
const host=window.document.querySelector('#nutritionMultiSearch');
assert.match(host.textContent,/2 Bestandteile erkannt/,'Erkannte Bestandteile werden nicht verständlich bezeichnet.');
assert.match(host.textContent,/Ayran/,'Ayran fehlt im sichtbaren Vorschlag.');
assert.match(host.textContent,/Menemen/,'Menemen fehlt im sichtbaren Vorschlag.');
assert.ok(host.querySelector('[data-canonical-all]'),'Gemeinsames Hinzufügen fehlt.');

assert.ok(loader.includes('nutrition-multisearch-canonical-128.js?v=1.4.1-alpha'),'Versionsloader lädt nicht die neue Kombinationssuche.');
assert.ok(runtime.includes('nutrition-multisearch-canonical-128.js?v=1.4.1-alpha'),'Runtime-Manifest enthält nicht die neue Kombinationssuche.');
assert.ok(sw.includes('-nav136-journal137-nutrition138-dishes140`'),'Service Worker behält nicht die geprüfte Cachebasis.');
assert.ok(sw.includes('`${CACHE_BASE}-search141`'),'Service Worker verwendet nicht die neue Such-Cachegeneration.');

dom.window.close();
console.log('Intelligente Suche erkennt Cola/Ayran mit Menemen und schützt echte „mit“-Gerichte.');