'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,name)=>{const script=window.document.createElement('script');script.textContent=read(name);window.document.head.append(script)};
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');

const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;
for(const file of ['food-catalog.js','everyday-catalog-v73.js','local-dishes-v140.js','catalog-expansion-v191.js'])inject(w,file);
const before=w.CutCoachFoodCatalog.items();
assert.ok(before.length>=7232,'Der vollständige bestehende Katalog wurde nicht geladen.');
const existingKeys=new Map();
for(const item of before)for(const value of [item.name,...(item.aliases||[])]){
  const key=normalize(value);if(key&&!existingKeys.has(key))existingKeys.set(key,`${item.id}:${value}`);
}
inject(w,'product-catalog-v200.js');
const products=w.CutCoachProductCatalog200.items();
assert.equal(products.length,43,'Mindestens ein Produkt kollidiert mit dem echten Gesamtkatalog.');
assert.equal(w.CutCoachFoodCatalog.items().length,before.length+products.length,'Produktkatalog ersetzt oder verliert vorhandene Einträge.');
const productKeys=new Map();
for(const item of products){
  assert.equal(w.CutCoachFoodCatalog.get(item.id),item,`${item.id} ist im kombinierten Katalog nicht erreichbar.`);
  for(const value of [item.name,...item.aliases]){
    const key=normalize(value);assert.ok(key);
    assert.equal(existingKeys.has(key),false,`${value} kollidiert mit ${existingKeys.get(key)}.`);
    assert.equal(productKeys.has(key),false,`${value} kollidiert innerhalb der Produktwelle mit ${productKeys.get(key)}.`);
    productKeys.set(key,`${item.id}:${value}`);
  }
}
assert.equal(w.CutCoachProductCatalog200.meta.skipped.length,0,'Echte Hauptnamen wurden wegen Dubletten übersprungen.');
for(const query of ['Red Bull','Redbull','Cola Zero','Coke Zero']){
  const key=normalize(query),hits=products.filter(item=>[item.name,...item.aliases].some(value=>normalize(value)===key));
  assert.equal(hits.length,1,`${query} ist im echten Gesamtkatalog nicht eindeutig.`);
}
dom.window.close();
console.log(`Produktkatalog-Vollaudit: ${before.length} bestehende + ${products.length} neue Einträge, keine neuen Namens-/Alias-Dubletten.`);
