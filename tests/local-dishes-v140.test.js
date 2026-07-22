'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'local-dishes-v140.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const attribution=fs.readFileSync(path.join(root,'docs','open-food-facts-attribution.md'),'utf8');

const dom=new JSDOM('<!doctype html><body></body>',{runScripts:'dangerously',url:'https://example.test/cutcoach/'});
const {window}=dom;
const baseItems=[Object.freeze({id:'bls:tomato',name:'Tomate roh',kind:'food',source:'bls'}),Object.freeze({id:'ccde:existing',name:'Döner Kebab Kalb/Rind',kind:'food',source:'cutcoach'})];
window.CutCoachFoodCatalog=Object.freeze({
  meta:Object.freeze({count:baseItems.length,source:'Testbasis'}),
  items:()=>Object.freeze(baseItems),
  get:id=>baseItems.find(item=>item.id===id)||null,
  suggestions:()=>Object.freeze([])
});
const script=window.document.createElement('script');
script.textContent=source;
window.document.head.append(script);

const catalog=window.CutCoachFoodCatalog;
const local=window.CutCoachLocalDishes140;
assert.ok(local,'Lokale Gerichte-Erweiterung wurde nicht initialisiert.');
assert.ok(local.meta.count>=90,`Lokale Gerichtebasis ist mit ${local.meta.count} Einträgen zu klein.`);
assert.equal(catalog.meta.localDishVersion,'1.4.0','Lokale Gerichteversion fehlt im Gesamtkatalog.');
assert.equal(catalog.items().filter(item=>item.name==='Döner Kebab Kalb/Rind').length,1,'Bereits vorhandene Standardgerichte werden doppelt angelegt.');

const menemen=catalog.get('ccmeal:menemen');
assert.ok(menemen,'Menemen ist nicht direkt im lokalen Katalog vorhanden.');
assert.equal(menemen.name,'Menemen');
assert.ok(menemen.aliases.includes('Türkisches Rührei'),'Menemen besitzt keinen verständlichen deutschen Suchbegriff.');
assert.ok(menemen.calories>0&&menemen.protein>0,'Menemen besitzt keine verwertbaren Richtwerte.');
assert.equal(menemen.estimated,true,'Variable Gerichte werden nicht als Richtwert gekennzeichnet.');
assert.match(menemen.sourceLabel,/Richtwert/,'Richtwert-Hinweis fehlt am Gericht.');
assert.ok(catalog.suggestions('Frühstück').some(item=>item.id==='ccmeal:menemen'),'Menemen wird nicht als Frühstücksvorschlag angeboten.');

const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss');
const search=query=>catalog.items().filter(item=>normalize([item.name,...(item.aliases||[])].join(' ')).includes(normalize(query)));
assert.ok(search('menemen').some(item=>item.id==='ccmeal:menemen'),'Direkte Suche findet Menemen nicht.');
assert.ok(search('türkisches rührei').some(item=>item.id==='ccmeal:menemen'),'Alias-Suche findet Menemen nicht.');
for(const id of ['ccmeal:kuru-fasulye-pilav','ccmeal:manti','ccmeal:mercimek-corbasi','ccmeal:spaghetti-carbonara','ccmeal:butter-chicken'])assert.ok(catalog.get(id),`${id} fehlt in der lokalen Gerichtebasis.`);

assert.ok(loader.includes("local-dishes-v140.js?v=1.4.0-alpha"),'Versionsloader lädt die lokale Gerichtebasis nicht.');
assert.ok(runtime.includes("local-dishes-v140.js?v=1.4.0-alpha"),'Runtime-Manifest enthält die lokale Gerichtebasis nicht.');
assert.ok(!loader.includes('nutrition-product-search-v139'),'Versionsloader lädt weiterhin die unerwünschte Markenproduktsuche.');
assert.ok(!runtime.includes('nutrition-product-search-v139'),'Runtime-Manifest enthält weiterhin die unerwünschte Markenproduktsuche.');
assert.equal(fs.existsSync(path.join(root,'nutrition-product-search-v139.js')),false,'JavaScript der Markenproduktsuche wurde nicht entfernt.');
assert.equal(fs.existsSync(path.join(root,'nutrition-product-search-v139.css')),false,'CSS der Markenproduktsuche wurde nicht entfernt.');
assert.match(sw,/-nav136-journal137-nutrition138-dishes140-dashboard820`/,'Service Worker verwendet nicht die aktuelle Dashboard-Cachegeneration.');
assert.match(attribution,/Eine allgemeine Online-Markenproduktsuche ist nicht Bestandteil der App/,'Datenquellenhinweis beschreibt weiterhin eine entfernte Produktsuche.');

dom.window.close();
console.log('Menemen, lokale Standardgerichte, Suchaliase und Entfernung der Markenproduktsuche geprüft.');
