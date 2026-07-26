'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','product-catalog-v270.js'),'utf8');
const original=Object.freeze([{id:'base:test',name:'Banane',aliases:Object.freeze([]),calories:89,amount:100,unit:'g'}]);
const context={
  console,
  CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}},
  dispatchEvent(){},
  CutCoachFoodCatalog:Object.freeze({meta:Object.freeze({count:original.length}),items:()=>original,get:id=>original.find(item=>item.id===id)||null})
};
context.window=context;
vm.runInNewContext(source,context,{filename:'product-catalog-v270.js'});

const catalog=context.CutCoachFoodCatalog.items();
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const searchable=item=>[item.name,...(Array.isArray(item.aliases)?item.aliases:[])].map(normalize).join(' ');
const find=query=>catalog.filter(item=>searchable(item).includes(normalize(query)));

assert.equal(context.CutCoachProductCatalog270.count,8,'acht verifizierte Markenprodukte müssen ergänzt werden');
assert.equal(catalog.length,original.length+8,'bestehender Katalog muss erhalten bleiben');

const milkSlice=find('milchschnitte');
assert.equal(milkSlice.length,1,'die Schreibweise milchschnitte muss genau einen Treffer liefern');
assert.equal(milkSlice[0].name,'Milch-Schnitte Original');
assert.equal(milkSlice[0].defaultPortion,28);
assert.equal(milkSlice[0].calories,421);
assert.equal(milkSlice[0].verified,true);

assert.ok(find('milch schnitte').some(item=>item.id==='ccp270:milch-schnitte-original'),'Suche ohne Bindestrich muss funktionieren');
assert.ok(find('kinder milchschnitte').some(item=>item.id==='ccp270:milch-schnitte-original'),'Markenalias muss funktionieren');
assert.ok(find('kinder').length>=6,'allgemeine Kinder-Suche muss mehrere Produkte liefern');
assert.ok(find('monte milchschnitte').some(item=>item.id==='ccp270:zott-monte-snack-original'),'umgangssprachlicher Monte-Suchbegriff muss funktionieren');
assert.equal(context.CutCoachFoodCatalog.get('ccp270:milch-schnitte-original').name,'Milch-Schnitte Original','direkter Katalogzugriff muss funktionieren');

console.log('product-catalog-v270: Milch-Schnitte-, Kinder- und Monte-Suche bestanden');
