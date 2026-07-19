'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const alpha={id:'catalog-alpha',name:'Alpha',aliases:[],amount:100,unit:'g',calories:100,protein:1,carbs:1,fat:1,source:'cutcoach',catalog:true};
const beta={id:'catalog-beta',name:'Beta',aliases:[],amount:100,unit:'g',calories:100,protein:1,carbs:1,fat:1,source:'cutcoach',catalog:true};
const gamma={id:'library-gamma',name:'Gamma',aliases:[],amount:100,unit:'g',calories:100,protein:1,carbs:1,fat:1,source:'user',kind:'food'};
const delta={id:'library-delta',name:'Delta',aliases:[],amount:100,unit:'g',calories:100,protein:1,carbs:1,fat:1,source:'user',kind:'food'};

const dom=new JSDOM(`<!doctype html><body data-nutrition-meal-type="Snack">
  <div class="nutrition-search-card"><input id="nutritionSearch"></div>
  <section class="nutrition-results" id="visibleResults"></section>
  <section class="nutrition-empty-state" id="hiddenEmpty" hidden></section>
</body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
let libraryMode='throw';
let addResult=null;
window.CutCoachLibrary={
  exportData:()=>{if(libraryMode==='throw')throw new Error('library unavailable');return{items:libraryMode==='items'?[gamma,delta]:[]}},
  addCatalogItemToDay:()=>addResult
};
window.CutCoachFoodCatalog={items:()=>[alpha,beta],get:()=>null};
window.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
window.render=()=>{};
window.toast=()=>{};

let listenerCount=0;
const nativeAdd=window.document.addEventListener.bind(window.document);
window.document.addEventListener=(...args)=>{listenerCount++;return nativeAdd(...args)};
const first=window.document.createElement('script');first.textContent=source;window.document.head.append(first);
const listenersAfterFirst=listenerCount;
assert.ok(listenersAfterFirst>0,'Zentrale Engine registriert keine Listener.');
const second=window.document.createElement('script');second.textContent=source;window.document.head.append(second);
assert.equal(listenerCount,listenersAfterFirst,'Doppelte Skriptausführung registriert erneut Listener.');

const api=window.CutCoachIntelligentSearch128;
assert.ok(api,'Zentrale Such-Engine fehlt.');
assert.equal(api.version,'1.4.5-alpha');
assert.equal(api.build,'1.4.7-hardening');
assert.equal(api.runtimeMode,'single-engine');

const isolated=api.rowsFor('Alpha und Beta');
assert.deepEqual(Array.from(isolated,row=>row.item?.name),['Alpha','Beta'],'Ein Fehler der Bibliothek verwirft fälschlich den Lebensmittelkatalog.');

const input=window.document.querySelector('#nutritionSearch');
const visible=window.document.querySelector('#visibleResults');
const hidden=window.document.querySelector('#hiddenEmpty');
input.value='Sucuk mit Toast';
assert.equal(api.render(input),true);
assert.equal(visible.hidden,true);
assert.equal(hidden.hidden,true);
input.value='Sucuk';
input.dispatchEvent(new window.Event('input',{bubbles:true}));
assert.equal(visible.hidden,false,'Ursprünglich sichtbare Standardergebnisse werden nicht wiederhergestellt.');
assert.equal(hidden.hidden,true,'Ursprünglich versteckter Leerzustand wird fälschlich eingeblendet.');
assert.equal(window.document.body.classList.contains('canonical-multisearch-active'),false);

input.value='Sucuk mit Toast';
assert.equal(api.render(input),true);
input.dispatchEvent(new window.Event('compositionstart',{bubbles:true}));
input.value='Sucuk';
input.dispatchEvent(new window.Event('compositionend',{bubbles:true}));
assert.equal(window.document.querySelector('#nutritionMultiSearch').hidden,true,'Alter Mehrfachtreffer bleibt nach Ende der Texteingabekomposition sichtbar.');

libraryMode='items';
input.value='Gamma und Delta';
assert.ok(api.rowsFor(input.value).every(row=>!row.item),'Index wurde ohne Änderungsereignis unerwartet erneuert.');
window.dispatchEvent(new window.CustomEvent('cutcoach:librarychange'));
const refreshed=window.document.querySelector('#nutritionMultiSearch');
assert.equal(refreshed.hidden,false,'Bibliotheksänderung aktualisiert den sichtbaren intelligenten Treffer nicht.');
assert.match(refreshed.textContent,/Gamma/);
assert.match(refreshed.textContent,/Delta/);

addResult=null;
input.value='Sucuk mit Toast';
assert.equal(api.render(input),true);
const addAll=window.document.querySelector('[data-canonical-all]');
addAll.dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
assert.equal(addAll.disabled,false,'Fehlgeschlagenes Sammel-Hinzufügen sperrt den Button dauerhaft.');
assert.equal(addAll.getAttribute('aria-busy'),null,'Fehlgeschlagenes Sammel-Hinzufügen lässt aria-busy hängen.');
assert.match(addAll.textContent,/Erneut versuchen/);

assert.match(loader,/nutrition-multisearch-canonical-128\.js\?v=1\.4\.5-alpha&h=147/,'Loader verwendet nicht den gehärteten Such-Build.');
assert.match(loader,/existing\.addEventListener\('load',loadCompatibility/,'Paralleler Loaderpfad wartet nicht auf die zentrale Engine.');
assert.match(manifest,/nutrition-multisearch-canonical-128\.js\?v=1\.4\.5-alpha&h=147/,'Offline-Manifest enthält nicht den gehärteten Such-Build.');
assert.match(sw,/search146`\+'-hardening147'/,'Neue Such-Hardening-Cachegeneration fehlt.');

dom.window.close();
console.log('Such-Engine Hardening 1.4.7: Index, UI-Zustände, IME, Retry und Doppelstart geprüft.');