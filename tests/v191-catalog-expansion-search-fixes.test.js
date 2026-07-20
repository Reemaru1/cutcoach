'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');

const existing=[
  {id:'existing-sahnetorte',name:'Sahnetorte',aliases:['Cremetorte'],amount:100,unit:'g',calories:330,protein:4,carbs:40,fat:17,source:'bls'},
  {id:'existing-chicken-strips',name:'Hähnchenstreifen natur',aliases:['Hähnchenstreifen mit Reis'],amount:100,unit:'g',calories:160,protein:25,carbs:0,fat:6,source:'bls'},
  {id:'existing-koefte-teller',name:'Köfte Teller',aliases:['Köfte mit Reis'],amount:550,unit:'g',calories:850,protein:49,carbs:72,fat:39,source:'cutcoach'},
  {id:'existing-koefte-bread',name:'Köfte im Fladenbrot',aliases:['Köfte Sandwich'],amount:477,unit:'g',calories:892,protein:42,carbs:89,fat:39,source:'cutcoach'}
];

const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Mittagessen"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;
w.CutCoachFoodCatalog={meta:{count:existing.length},items:()=>existing,get:id=>existing.find(item=>String(item.id)===String(id))||null,suggestions:()=>[]};
w.CutCoachLibrary={exportData:()=>({items:[]}),addItemToDay:()=>({id:'meal'}),addCatalogItemToDay:()=>({id:'meal'}),undoDayAdd:()=>true};
w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
w.render=()=>{};w.toast=()=>{};

inject(w,read('catalog-expansion-v191.js'));
const expansion=w.CutCoachCatalogExpansion191;
assert.ok(expansion,'Katalogerweiterung wurde nicht installiert.');
assert.equal(expansion.meta.version,'1.9.1-alpha');
assert.equal(expansion.meta.defined,20,'Das Paket wurde wieder auf einzelne Begriffe reduziert.');
assert.equal(expansion.meta.count,20,'Eindeutige Datensätze wurden unerwartet verworfen.');
assert.ok(expansion.meta.prunedAliases.some(entry=>normalize(entry.alias)==='sahnetorte'),'Bestehende Sahnetorte wurde nicht als Alias-Dublette erkannt.');
assert.ok(expansion.meta.prunedAliases.some(entry=>normalize(entry.alias)==='hahnchenstreifen mit reis'),'Bestehender Hähnchen-Alias wurde nicht als Dublette erkannt.');

const seen=new Map();
for(const item of w.CutCoachFoodCatalog.items())for(const value of [item.name,...(item.aliases||[])]){
  const key=normalize(value);if(!key)continue;
  assert.equal(seen.has(key),false,`Doppelte Katalogbezeichnung: ${value} kollidiert mit ${seen.get(key)}`);
  seen.set(key,`${item.id}:${value}`);
}
assert.ok(w.CutCoachFoodCatalog.get('ccx:koefte-stueck'));
assert.ok(w.CutCoachFoodCatalog.get('ccx:haehnchengeschnetzeltes-reis'));
assert.ok(w.CutCoachFoodCatalog.get('ccx:sahnetortenstueck'));
assert.ok(w.CutCoachFoodCatalog.get('existing-koefte-teller'),'Bestehende Gerichte werden durch das Paket verdrängt.');

for(const name of ['nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
let engine=w.CutCoachIntelligentSearch128;
engine=w.CutCoachSearchExactWhole170.attach(engine);
engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
engine=w.CutCoachPortionHardening153.attach(engine);
const api=w.CutCoachIntelligentSearch128;

let rows=api.rowsFor('Zwei Sahnetortestücke und ein Köfte');
assert.equal(rows.length,2,'Die Screenshot-Eingabe wird nicht in zwei vollständige Lebensmittel aufgelöst.');
assert.deepEqual(Array.from(rows,row=>row.item?.id),['ccx:sahnetortenstueck','ccx:koefte-stueck']);
assert.deepEqual(Array.from(rows,row=>row.status),['matched','matched']);
assert.equal(rows[0].factor,2,'Das Zahlwort Zwei wird beim Sahnetortenstück nicht übernommen.');
assert.equal(rows[1].factor,1,'Das Zahlwort ein wird beim Köfte nicht übernommen.');

const chickenDish=w.CutCoachFoodCatalog.get('ccx:haehnchengeschnetzeltes-reis');
assert.ok(chickenDish,'Hähnchengeschnetzeltes mit Reis fehlt im vollständigen Katalog.');
assert.ok([chickenDish.name,...chickenDish.aliases].some(value=>normalize(value)==='hahnchengeschnetzeltes mit reis'),'Die Screenshot-Schreibweise ist weder Hauptname noch Alias.');
assert.ok([chickenDish.name,...chickenDish.aliases].some(value=>normalize(value)==='hahnchen geschnetzeltes mit reis'),'Die getrennte ASCII-Schreibweise fehlt.');

const input=w.document.querySelector('#nutritionSearch');
input.value='hahnchengeschnetzeltes mit reis';
assert.equal(api.likelyMulti(input.value),false,'Das vollständige Einzelgericht wird weiterhin als Mehrfachsuche eingestuft.');
assert.equal(api.rowsFor(input.value).length,0,'Das vollständige Einzelgericht wird weiterhin in Bestandteile zerlegt.');
assert.equal(api.render(input),false,'Das vollständige Einzelgericht erzeugt fälschlich eine intelligente Mehrfachkarte.');
let host=w.document.querySelector('#nutritionMultiSearch');
assert.ok(!host||host.hidden,'Nach dem Einzelgericht bleibt eine intelligente Mehrfachkarte sichtbar.');

input.value='Hähnchen Geschnetzeltes mit Reis';
assert.equal(api.likelyMulti(input.value),false,'Die getrennte Schreibweise wird als Mehrfachsuche eingestuft.');
assert.equal(api.rowsFor(input.value).length,0,'Die getrennte Schreibweise wird in Hähnchen und Reis zerlegt.');
assert.equal(api.render(input),false,'Die getrennte Schreibweise erzeugt fälschlich eine Mehrfachkarte.');
host=w.document.querySelector('#nutritionMultiSearch');
assert.ok(!host||host.hidden,'Bei der getrennten Schreibweise bleibt eine Mehrfachkarte sichtbar.');

rows=api.rowsFor('3 Köfte');
assert.equal(rows.length,1);assert.equal(rows[0].item?.id,'ccx:koefte-stueck');assert.equal(rows[0].factor,3);
rows=api.rowsFor('Köfte Teller');
assert.equal(rows.length,0,'Der bestehende Köfte Teller wird fälschlich als intelligente Mehrfachsuche übernommen.');
assert.equal(api.likelyMulti('Köfte Teller'),false,'Der bestehende Köfte Teller wird nicht als vollständiges Einzelgericht geschützt.');
assert.equal(w.CutCoachFoodCatalog.get('existing-koefte-teller')?.name,'Köfte Teller','Der neutrale Köfte-Eintrag überschreibt den bestehenden Teller.');

const loader=read('version-v7.js'),manifest=read('runtime-manifest.js'),sw=read('sw.js'),packageJson=JSON.parse(read('package.json'));
assert.match(loader,/catalog-expansion-v191\.js\?v=1\.9\.1-alpha/,'Produktiver Loader enthält das Paket nicht.');
assert.match(manifest,/catalog-expansion-v191\.js\?v=1\.9\.1-alpha/,'Offline-Manifest enthält das Paket nicht.');
assert.match(sw,/catalog191-expansion/,'Eigene Cachegeneration für das Katalogpaket fehlt.');
assert.match(packageJson.scripts.test,/v191-catalog-expansion-search-fixes\.test\.js/,'Regression fehlt in der Gesamttestkette.');

dom.window.close();
console.log('Katalogpaket 1.9.1: Screenshot-Suchen, 20 Datensätze, Mengen, Vollnamenschutz und Dublettenprüfung bestanden.');
