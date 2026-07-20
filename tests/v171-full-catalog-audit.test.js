'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const hash=value=>{let result=2166136261;for(const char of String(value)){result^=char.codePointAt(0);result=Math.imul(result,16777619)}return result>>>0};

const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Abendessen"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionResults"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;
w.CutCoachLibrary={exportData:()=>({items:[]}),addItemToDay:()=>({id:'meal'}),addCatalogItemToDay:()=>({id:'meal'}),undoDayAdd:()=>true};
w.render=()=>{};w.toast=()=>{};
for(const name of ['food-catalog.js','everyday-catalog-v73.js','local-dishes-v140.js','nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
let engine=w.CutCoachIntelligentSearch128;
engine=w.CutCoachSearchExactWhole170.attach(engine);
engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
engine=w.CutCoachPortionHardening153.attach(engine);
const api=w.CutCoachIntelligentSearch128;
assert.equal(api.exactWholeVersion,'1.7.0-alpha');

const foodItems=w.CutCoachFoodCatalog.items();
const everydayItems=w.CutCoachEverydayCatalog.items();
const localItems=w.CutCoachLocalDishes140.items();
assert.ok(foodItems.length>=7150,`Vollkatalog unerwartet klein: ${foodItems.length}`);
assert.ok(everydayItems.length>=40,`Alltagskatalog unerwartet klein: ${everydayItems.length}`);
assert.ok(localItems.length>=90,`Gerichtekatalog unerwartet klein: ${localItems.length}`);

function queryFor(item){
  const amount=Number(item.amount)>0?Number(item.amount):(item.unit==='ml'?250:100);
  const unit=String(item.unit||'g').toLocaleLowerCase('de').includes('ml')?'ml':'g';
  return`${amount} ${unit} ${item.name}`;
}
function rowTargets(row){
  const ids=[];
  if(row?.item?.id!==undefined)ids.push(String(row.item.id));
  for(const choice of row?.choices||[])if(choice?.item?.id!==undefined)ids.push(String(choice.item.id));
  for(const choice of row?.alternatives||[])if(choice?.item?.id!==undefined)ids.push(String(choice.item.id));
  return ids;
}
function containsTarget(rows,item){
  const target=String(item.id);
  return rows.some(row=>rowTargets(row).includes(target));
}
function inspectItem(item,group){
  const query=queryFor(item),rows=api.rowsFor(query);
  return containsTarget(rows,item)?null:{group,id:String(item.id),name:item.name,query,statuses:rows.map(row=>row.status),resolved:rows.map(row=>({name:row.item?.name||null,id:row.item?.id||null,choices:(row.choices||[]).map(choice=>choice.item?.id||null)}))};
}

const riskTerms=['milch','butter','honig','wasser','reis','apfel','brot','kase','ei','steak','lachs','kartoffel','hafer','cola','ayran','doner','joghurt','banane','tomate','gurke','nudel','sucuk'];
const sampledBls=foodItems.filter(item=>item.source==='bls'&&hash(item.id)%41===0).slice(0,220);
const risky=foodItems.filter(item=>{const name=normalize(item.name);return riskTerms.some(term=>name.includes(term)&&name!==term)}).filter((item,index)=>index%5===0).slice(0,260);
const auditItems=[];
const seen=new Set();
for(const [group,items] of [['bls-sample',sampledBls],['risk-compound',risky],['local-dish',localItems],['everyday',everydayItems]])for(const item of items){const key=String(item.id);if(seen.has(key))continue;seen.add(key);auditItems.push({group,item})}
const misses=auditItems.map(({group,item})=>inspectItem(item,group)).filter(Boolean);

const exactGroups=new Map();
for(const item of [...foodItems,...everydayItems]){const key=normalize(item.name);if(!key)continue;const group=exactGroups.get(key)||[];group.push(item);exactGroups.set(key,group)}
const unsafeDuplicateSelections=[];
for(const [name,items] of exactGroups){
  const unique=[...new Map(items.map(item=>[String(item.id),item])).values()];
  if(unique.length<2)continue;
  const sample=unique[0],rows=api.rowsFor(queryFor(sample));
  const first=rows[0];
  if(first?.status==='matched'&&!first?.choices?.length)unsafeDuplicateSelections.push({name,ids:unique.slice(0,6).map(item=>item.id),selected:first.item?.id||null});
}

const nonsense=['Quantenbrot','Xylophonauflauf','Neutrinojoghurt','Laserlasagne','Orbitalkäse','Plasmakartoffel','Photonensuppe','Galaxiequark','Roboterreis','Saturnsalat','Nanobanane','Turbotomate'];
const falseUnknownMatches=[];
for(const query of nonsense){const rows=api.rowsFor(query);const matched=rows.filter(row=>row.status==='matched'&&row.item);if(matched.length)falseUnknownMatches.push({query,matches:matched.map(row=>({id:row.item.id,name:row.item.name,confidence:row.confidence}))})}

const protectedDishFailures=[];
for(const item of [...localItems,...everydayItems].filter(item=>/\b(mit|und|auf|ohne)\b|\//i.test(item.name))){
  const rows=api.rowsFor(queryFor(item));
  if(!containsTarget(rows,item))protectedDishFailures.push({id:item.id,name:item.name,query:queryFor(item),rows:rows.map(row=>({status:row.status,id:row.item?.id||null,name:row.item?.name||null}))});
}

const report={catalog:{food:foodItems.length,everyday:everydayItems.length,local:localItems.length},audited:auditItems.length,misses:misses.slice(0,30),missCount:misses.length,unsafeDuplicateSelections:unsafeDuplicateSelections.slice(0,20),unsafeDuplicateCount:unsafeDuplicateSelections.length,falseUnknownMatches,protectedDishFailures:protectedDishFailures.slice(0,30),protectedDishFailureCount:protectedDishFailures.length};
if(misses.length||unsafeDuplicateSelections.length||falseUnknownMatches.length||protectedDishFailures.length){console.error('STUFE5_VOLKATALOG_AUDIT '+JSON.stringify(report,null,2))}
assert.equal(misses.length,0,`${misses.length} geprüfte Katalogeinträge wurden über ihren vollständigen Namen nicht wiedergefunden.`);
assert.equal(unsafeDuplicateSelections.length,0,`${unsafeDuplicateSelections.length} exakte Namenskollisionen wurden ohne Auswahl entschieden.`);
assert.equal(falseUnknownMatches.length,0,`${falseUnknownMatches.length} Fantasiebegriffe wurden fälschlich sicher erkannt.`);
assert.equal(protectedDishFailures.length,0,`${protectedDishFailures.length} vollständige Gerichte wurden zerlegt oder nicht als Gericht wiedergefunden.`);
console.log(`Stufe 5 Vollkatalog-Audit: ${auditItems.length} repräsentative Einträge, ${exactGroups.size} Namensgruppen und ${nonsense.length} Negativfälle geprüft.`);
dom.window.close();
