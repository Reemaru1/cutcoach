'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const canonical=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const compatibility=fs.readFileSync(path.join(root,'nutrition-multisearch-120.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

assert.match(compatibility,/mode:'compatibility-facade'/,'Alte API ist nicht eindeutig als passive Fassade gekennzeichnet.');
assert.match(compatibility,/const VERSION='1\.4\.6-compat'/,'Kompatibilitätsversion fehlt.');
assert.doesNotMatch(compatibility,/addEventListener\s*\(/,'Kompatibilitätsfassade registriert weiterhin eigene Listener.');
assert.doesNotMatch(compatibility,/setTimeout|setInterval|requestAnimationFrame|requestIdleCallback/,'Kompatibilitätsfassade besitzt weiterhin eigene Zeitsteuerung.');
assert.doesNotMatch(compatibility,/MutationObserver/,'Kompatibilitätsfassade beobachtet weiterhin das DOM.');
assert.doesNotMatch(compatibility,/innerHTML|replaceChildren|createElement/,'Kompatibilitätsfassade rendert weiterhin eigenes DOM.');
assert.doesNotMatch(compatibility,/CutCoachLibrary/,'Kompatibilitätsfassade greift weiterhin selbst auf die Bibliothek zu.');

const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Snack"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{
  url:'https://example.test/cutcoach/',
  runScripts:'dangerously',
  pretendToBeVisual:true
});
const {window}=dom;
window.CutCoachFoodCatalog={items:()=>[],get:()=>null};
window.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>true};
window.render=()=>{};
window.toast=()=>{};

let listenerCount=0;
const nativeAdd=window.document.addEventListener.bind(window.document);
window.document.addEventListener=(...args)=>{listenerCount++;return nativeAdd(...args)};
const canonicalScript=window.document.createElement('script');
canonicalScript.textContent=canonical;
window.document.head.append(canonicalScript);
const canonicalListeners=listenerCount;
assert.ok(canonicalListeners>0,'Zentrale Engine wurde nicht initialisiert.');

const compatibilityScript=window.document.createElement('script');
compatibilityScript.textContent=compatibility;
window.document.head.append(compatibilityScript);
assert.equal(listenerCount,canonicalListeners,'Kompatibilitätsfassade registriert zusätzliche Dokument-Listener.');

const engine=window.CutCoachIntelligentSearch128;
const facade=window.CutCoachNutritionMultiSearch120;
assert.ok(engine,'Zentrale intelligente Suche fehlt.');
assert.ok(facade,'Kompatibilitäts-API fehlt.');
assert.equal(facade.mode,'compatibility-facade');
assert.equal(facade.engineVersion(),engine.version,'Fassade meldet nicht die aktive Engineversion.');

const direct=engine.rowsFor('Sucuk mit Toast');
const delegated=facade.rowsFor('Sucuk mit Toast');
assert.deepEqual(Array.from(delegated,row=>row.item?.name),Array.from(direct,row=>row.item?.name),'Fassade delegiert nicht an dieselbe Ergebnislogik.');
assert.deepEqual(Array.from(delegated,row=>row.item?.name),['Sucuk','Toastbrot']);
const resolved=facade.resolve('Sucuk');
assert.equal(resolved.match?.name,'Sucuk','Alte resolve-API erhält keinen Treffer aus der zentralen Engine.');
assert.equal(resolved.confidence,100,'Exakter delegierter Treffer besitzt keinen stabilen Vertrauenswert.');

const input=window.document.querySelector('#nutritionSearch');
input.value='Sucuk mit Toast';
assert.equal(facade.refresh(),true,'Alte refresh-API löst nicht den zentralen Renderer aus.');
assert.match(window.document.querySelector('#nutritionMultiSearch').textContent,/2 Bestandteile erkannt/);

const canonicalLoaderIndex=loader.indexOf('nutrition-multisearch-canonical-128.js?v=1.4.5-alpha');
const compatibilityLoaderIndex=loader.indexOf('nutrition-multisearch-120.js?v=1.4.6-compat');
assert.ok(canonicalLoaderIndex>=0,'Loader lädt die zentrale Engine nicht.');
assert.ok(compatibilityLoaderIndex>canonicalLoaderIndex,'Kompatibilitätsfassade wird nicht nach der zentralen Engine geladen.');
assert.match(loader,/loadCompatibility/,'Loader bezeichnet die alte Datei weiterhin als aktive Legacy-Engine.');
assert.doesNotMatch(loader,/loadLegacy/,'Loader enthält weiterhin einen Legacy-Engine-Pfad.');
assert.match(manifest,/nutrition-multisearch-120\.js\?v=1\.4\.6-compat/,'Offline-Manifest enthält nicht die passive Fassade.');
assert.match(sw,/search146/,'Neue Cachegeneration für die konsolidierte Suche fehlt.');

dom.window.close();
console.log('Such-Engine 1.4.5 läuft allein; 1.4.6-Kompatibilität bleibt passiv und delegiert.');