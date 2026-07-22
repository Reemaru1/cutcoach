'use strict';

const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const ROOT=path.resolve(__dirname,'..');
const OUTPUT=path.join(ROOT,'assets','nutrition-search-index-v1.json');
const INDEX_VERSION='1.0.0';
const CATALOG_SOURCES=[
  'food-catalog.js',
  'everyday-catalog-v73.js',
  'local-dishes-v140.js',
  'catalog-expansion-v191.js',
  'product-catalog-v200.js'
];

function normalized(value){
  return String(value||'')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLocaleLowerCase('de')
    .replace(/\u00df/g,'ss')
    .replace(/[^a-z0-9]+/g,' ')
    .trim()
    .replace(/\s+/g,' ');
}

function loadCatalog(){
  const sandbox={};
  sandbox.window=sandbox;
  sandbox.self=sandbox;
  sandbox.globalThis=sandbox;
  vm.createContext(sandbox);
  for(const source of CATALOG_SOURCES){
    const filename=path.join(ROOT,source);
    vm.runInContext(fs.readFileSync(filename,'utf8'),sandbox,{filename});
  }
  const items=sandbox.CutCoachFoodCatalog?.items?.();
  if(!Array.isArray(items)||!items.length)throw new Error('Der Lebensmittelkatalog konnte nicht geladen werden.');
  return items;
}

function buildIndex(){
  const entries=loadCatalog().map(item=>[
    String(item.id),
    normalized(item.name),
    (Array.isArray(item.aliases)?item.aliases:[]).map(normalized).filter(Boolean),
    normalized(item.barcode),
    Array.isArray(item.featured)?item.featured.map(value=>Math.max(0,Number(value)||0)):null
  ]);
  const ids=new Set(entries.map(entry=>entry[0]));
  if(ids.size!==entries.length)throw new Error(`Der Suchindex enthaelt doppelte IDs (${entries.length-ids.size}).`);
  return `${JSON.stringify({version:INDEX_VERSION,count:entries.length,entries})}\n`;
}

function main(){
  const generated=buildIndex();
  if(process.argv.includes('--check')){
    const current=fs.existsSync(OUTPUT)?fs.readFileSync(OUTPUT,'utf8'):'';
    if(current!==generated){
      console.error('Der Ernaehrungs-Suchindex ist veraltet. Fuehre npm run build:search-index aus.');
      process.exitCode=1;
      return;
    }
    console.log(`Ernaehrungs-Suchindex aktuell (${JSON.parse(generated).count} Eintraege).`);
    return;
  }
  fs.mkdirSync(path.dirname(OUTPUT),{recursive:true});
  fs.writeFileSync(OUTPUT,generated,'utf8');
  console.log(`Ernaehrungs-Suchindex erstellt: ${path.relative(ROOT,OUTPUT)} (${JSON.parse(generated).count} Eintraege).`);
}

if(require.main===module)main();
module.exports={buildIndex,loadCatalog,normalized,INDEX_VERSION,CATALOG_SOURCES,OUTPUT};
