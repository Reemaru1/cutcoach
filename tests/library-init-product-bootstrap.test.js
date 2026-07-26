'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const source=fs.readFileSync(path.join(__dirname,'..','library-init.js'),'utf8');
const baseItems=Object.freeze([{id:'base:banana',name:'Banane',aliases:Object.freeze([]),amount:100,unit:'g',calories:89}]);
const listeners={};
const context={
  console,
  location:{hash:''},
  document:{readyState:'loading',addEventListener(type,handler){listeners[type]=handler},querySelector(){return null}},
  addEventListener(){},
  CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}},
  dispatchEvent(){},
  CutCoachFoodCatalog:Object.freeze({meta:Object.freeze({count:1}),items:()=>baseItems,get:id=>baseItems.find(item=>item.id===id)||null}),
  CutCoachLibrary:{mount(){}}
};
context.window=context;
vm.runInNewContext(source,context,{filename:'library-init.js'});
const items=context.CutCoachFoodCatalog.items();
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
const find=query=>items.filter(item=>[item.name,...(item.aliases||[])].map(normalize).join(' ').replace(/\s+/g,'').includes(normalize(query).replace(/\s+/g,'')));
assert.ok(find('milchschnitte').some(item=>item.name==='Milch-Schnitte Original'),'Milchschnitte muss bereits vor DOMContentLoaded im Hauptkatalog liegen');
assert.ok(find('kinder').length>=5,'Kinder-Suche muss mehrere Produkte liefern');
assert.ok(find('monte milchschnitte').some(item=>item.name==='Zott Monte Snack Original'),'Monte Milchschnitte muss gefunden werden');
assert.ok(context.CutCoachFoodCatalog.get('cc-bootstrap:milch-schnitte-original'));
console.log('library-init: produktiver Katalog-Bootstrap bestanden');
