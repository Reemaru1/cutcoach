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
  {id:'existing-water',name:'Mineralwasser',aliases:['Wasser'],amount:100,unit:'ml',calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:0,source:'bls'},
  {id:'existing-coke-alias',name:'Kolanuss Getränk',aliases:['Coke'],amount:100,unit:'ml',calories:20,protein:0,carbs:5,fat:0,fiber:0,sugar:5,saturatedFat:0,salt:0,source:'bls'}
];

const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Snack"><section data-screen="food" class="active"><input id="nutritionSearch"><div class="nutrition-results"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;
w.CutCoachFoodCatalog={meta:{count:existing.length},items:()=>existing,get:id=>existing.find(item=>String(item.id)===String(id))||null,suggestions:()=>[]};
w.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>({id:'meal'}),addItemToDay:()=>({id:'meal'})};
w.render=()=>{};w.toast=()=>{};

inject(w,read('product-catalog-v200.js'));
const catalog=w.CutCoachProductCatalog200;
assert.ok(catalog,'Produktkatalog wurde nicht installiert.');
assert.equal(catalog.meta.version,'2.0.0-alpha');
assert.equal(catalog.meta.defined,43,'Die kuratierte Produktwelle wurde verkleinert.');
assert.equal(catalog.meta.count,43,'Eindeutige Produkte wurden unerwartet verworfen.');
assert.equal(catalog.meta.verifiedAt,'2026-07-20');
assert.ok(catalog.meta.prunedAliases.some(entry=>normalize(entry.alias)==='coke'),'Bestehende Aliase werden nicht gegen den Gesamtkatalog geprüft.');

const products=catalog.items();
assert.ok(products.every(item=>item.amount===100&&item.unit==='ml'),'Herstellerwerte verwenden nicht einheitlich die 100-ml-Basis.');
assert.ok(products.every(item=>item.product&&item.verified&&!item.estimated&&item.source==='manufacturer'),'Produktmetadaten sind nicht eindeutig als verifiziert markiert.');
assert.ok(products.every(item=>/^https:\/\//.test(item.sourceUrl)),'Mindestens einem Produkt fehlt die Herstellerquelle.');
assert.ok(products.every(item=>!/(?:250|330|500)\s*ml/i.test(item.name)),'Packungsgrößen wurden als unnötige Produktdubletten angelegt.');

const seen=new Map();
for(const item of w.CutCoachFoodCatalog.items())for(const value of [item.name,...(item.aliases||[])]){
  const key=normalize(value);if(!key)continue;
  assert.equal(seen.has(key),false,`Doppelte Bezeichnung ${value} kollidiert mit ${seen.get(key)}`);
  seen.set(key,`${item.id}:${value}`);
}
const exact=query=>products.filter(item=>[item.name,...item.aliases].some(value=>normalize(value)===normalize(query)));
for(const [query,id] of [
  ['Red Bull','ccp:red-bull'],['Redbull','ccp:red-bull'],['Cola Zero','ccp:coca-cola-zero'],
  ['Coke Zero','ccp:coca-cola-zero'],['Fanta Zero','ccp:fanta-orange-zero'],
  ['Sprite Zero','ccp:sprite-zero'],['Fuze Tea Pfirsich','ccp:fuze-tea-peach'],
  ['Powerade Zero','ccp:powerade-zero-mountain-blast']
]){
  const hits=exact(query);assert.equal(hits.length,1,`${query} ist nicht eindeutig.`);assert.equal(hits[0].id,id);
}
const redBull=w.CutCoachFoodCatalog.get('ccp:red-bull');
assert.deepEqual({calories:redBull.calories,carbs:redBull.carbs,sugar:redBull.sugar,salt:redBull.salt,caffeine:redBull.caffeine},{calories:46,carbs:11,sugar:11,salt:.1,caffeine:32});
const colaZero=w.CutCoachFoodCatalog.get('ccp:coca-cola-zero');
assert.deepEqual({calories:colaZero.calories,carbs:colaZero.carbs,sugar:colaZero.sugar,salt:colaZero.salt},{calories:.2,carbs:0,sugar:0,salt:.02});

for(const name of ['nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
let engine=w.CutCoachIntelligentSearch128;
engine=w.CutCoachSearchExactWhole170.attach(engine);
engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
engine=w.CutCoachPortionHardening153.attach(engine);
const rows=w.CutCoachIntelligentSearch128.rowsFor('Red Bull und Cola Zero');
assert.equal(rows.length,2,'Zwei Markengetränke werden nicht getrennt erkannt.');
assert.deepEqual(Array.from(rows,row=>row.item?.id),['ccp:red-bull','ccp:coca-cola-zero']);
assert.deepEqual(Array.from(rows,row=>row.status),['matched','matched']);

const loader=read('version-v7.js'),runtime=read('runtime-manifest.js'),sw=read('sw.js'),packageJson=JSON.parse(read('package.json'));
assert.match(loader,/product-catalog-v200\.js\?v=2\.0\.0-alpha/,'Produktiver Loader enthält den Produktkatalog nicht.');
assert.ok(loader.indexOf('catalog-expansion-v191.js?v=1.9.1-alpha')<loader.indexOf('product-catalog-v200.js?v=2.0.0-alpha'),'Produktkatalog wird vor seinen Basiskatalogen geladen.');
assert.ok(runtime.indexOf('catalog-expansion-v191.js?v=1.9.1-alpha')<runtime.indexOf('product-catalog-v200.js?v=2.0.0-alpha'));
assert.ok(runtime.indexOf('product-catalog-v200.js?v=2.0.0-alpha')<runtime.indexOf('nutrition-v73.js?v=7.3.2'));
assert.match(sw,/catalog200-products/,'Eigene Cachegeneration für verifizierte Produkte fehlt.');
assert.match(packageJson.scripts.test,/v200-product-catalog\.test\.js/,'Produktkatalogtest fehlt in der Gesamtkette.');

dom.window.close();
console.log('Produktkatalog 2.0.0: 43 verifizierte Getränke, Herstellerwerte, Aliase, Dubletten- und Mehrfachsuche geprüft.');
