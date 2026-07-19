'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

(async()=>{
  const root=path.resolve(__dirname,'..');
  const source=fs.readFileSync(path.join(root,'nutrition-product-search-v139.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'nutrition-product-search-v139.css'),'utf8');
  const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
  const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  const catalog=fs.readFileSync(path.join(root,'food-catalog.js'),'utf8');

  const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Frühstück">
    <section data-screen="food" class="active">
      <section class="nutrition-search-card"><label><input id="nutritionSearch" type="search"></label><p id="nutritionSearchIntent" hidden></p></section>
      <select id="nutritionMealSelect"><option>Frühstück</option></select>
      <section class="nutrition-browse-head"><div><small>Für dich</small><h2>Empfohlen</h2></div></section>
      <div id="nutritionResults"></div>
    </section>
  </body>`,{url:'https://example.test/cutcoach/?date=2026-07-19#food',runScripts:'dangerously',pretendToBeVisual:true});

  const {window}=dom;
  Object.defineProperty(window.navigator,'onLine',{configurable:true,value:true});
  window.selectedDate='2026-07-19';
  let database={version:3,items:[]},added=null,fetchCount=0;
  window.CutCoachLibrary={
    exportData:()=>JSON.parse(JSON.stringify(database)),
    importData:value=>{database=JSON.parse(JSON.stringify(value));return true},
    addItemToDay:(id,options)=>{added={id,options};return{name:'Milbona – Skyr Natur',mealType:options.type}}
  };
  window.render=()=>{};
  window.toast=()=>{};
  window.fetch=async url=>{
    fetchCount++;
    assert.match(String(url),/search\.openfoodfacts\.org\/search/,'Primäre Produktsuche verwendet nicht Search-a-licious.');
    return{ok:true,json:async()=>({hits:[
      {code:'4056489123456',product_name_de:'Skyr Natur',brands:'Milbona',quantity:'500 g',serving_size:'250 g',countries_tags:['en:germany'],completeness:0.88,nutriments:{'energy-kcal_100g':63,proteins_100g:11,carbohydrates_100g:4,fat_100g:.2,sugars_100g:4,salt_100g:.1}},
      {code:'123',product_name_de:'Ohne Nährwerte',brands:'Test',nutriments:{}},
      {code:'4056489123456',product_name_de:'Duplikat',brands:'Milbona',nutriments:{'energy-kcal_100g':63,proteins_100g:11,carbohydrates_100g:4,fat_100g:.2}}
    ]})};
  };

  const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
  window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await new Promise(resolve=>setTimeout(resolve,20));

  const input=window.document.querySelector('#nutritionSearch');input.value='skyr';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(fetchCount,0,'Produktsuche läuft verbotenerweise bei jedem Tastendruck.');
  assert.equal(window.document.querySelector('#nutritionProductSearchButton').hidden,false,'Expliziter Markenprodukte-Button bleibt trotz Suchbegriff verborgen.');

  const products=await window.CutCoachNutritionProducts139.search('skyr');
  assert.equal(fetchCount,1,'Explizite Produktsuche wurde nicht genau einmal ausgeführt.');
  assert.equal(products.length,1,'Ungültige oder doppelte Produkte wurden nicht herausgefiltert.');
  assert.equal(products[0].name,'Milbona – Skyr Natur','Marke und Produktname werden nicht verständlich kombiniert.');
  assert.equal(window.document.querySelectorAll('.nutrition-online-row').length,1,'Markenprodukt wird nicht in der Oberfläche dargestellt.');
  assert.match(window.document.querySelector('.nutrition-online-source').textContent,/Open Food Facts/,'Datenquelle wird nicht sichtbar angegeben.');

  window.document.querySelector('[data-off-add]').dispatchEvent(new window.MouseEvent('click',{bubbles:true}));
  assert.equal(database.items.length,1,'Ausgewähltes Produkt wurde nicht dauerhaft in der Bibliothek gespeichert.');
  assert.equal(database.items[0].source,'off','Gespeichertes Markenprodukt verliert seine Datenquelle.');
  assert.equal(database.items[0].barcode,'4056489123456','Barcode wird beim Speichern nicht erhalten.');
  assert.deepEqual(added.options,{type:'Frühstück',dateKey:'2026-07-19'},'Produkt wird nicht zur richtigen Mahlzeit und zum gewählten Tag hinzugefügt.');

  await window.CutCoachNutritionProducts139.search('skyr');
  assert.equal(fetchCount,1,'Identische Produktsuche ignoriert den lokalen Cache und belastet die API erneut.');

  assert.match(catalog,/"count":7064/,'Lokaler BLS-Katalog mit 7.064 verwertbaren Lebensmitteln fehlt.');
  assert.match(source,/NETWORK_COOLDOWN=6000/,'Online-Suche besitzt keinen Schutz gegen API-Spam.');
  assert.match(source,/if\(!navigator\.onLine\)/,'Offline-Fallback der Produktsuche fehlt.');
  assert.match(source,/CACHE_TTL=24\*60\*60\*1000/,'Produkttreffer werden nicht ausreichend lange lokal gepuffert.');
  assert.match(css,/\.nutrition-online-row\{[\s\S]*grid-template-columns:minmax\(0,1fr\) 56px 34px/,'Produktkarten besitzen keine kompakte Informationshierarchie.');
  assert.match(css,/\.nutrition-online-add\{[\s\S]*width:30px!important[\s\S]*height:30px!important/,'Produkt-Plusbutton ist nicht kompakt gestaltet.');
  assert.ok(loader.includes("nutrition-product-search-v139.css?v=1.3.9-alpha"),'Versionsloader lädt die Produktsuch-CSS nicht.');
  assert.ok(loader.includes("nutrition-product-search-v139.js?v=1.3.9-alpha"),'Versionsloader lädt die Produktsuche nicht.');
  assert.ok(runtime.includes("nutrition-product-search-v139.css?v=1.3.9-alpha"),'Runtime-Manifest enthält die Produktsuch-CSS nicht.');
  assert.ok(runtime.includes("nutrition-product-search-v139.js?v=1.3.9-alpha"),'Runtime-Manifest enthält die Produktsuche nicht.');
  assert.ok(sw.includes('-products139`'),'Service Worker verwendet nicht die neue Produktdatenbank-Cachegeneration.');

  dom.window.close();
  console.log('BLS-Basis, explizite Markenproduktsuche, API-Schutz, Cache und dauerhafte Produktübernahme geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});