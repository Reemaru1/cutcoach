'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const learningSource=fs.readFileSync(path.join(root,'nutrition-search-learning-v160.js'),'utf8');
const hardeningSource=fs.readFileSync(path.join(root,'nutrition-search-confidence-hardening-v151.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const compatibility=fs.readFileSync(path.join(root,'nutrition-multisearch-120.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Frühstück"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const w=dom.window;
const oldDate=new Date(Date.now()-220*24*60*60*1000).toISOString();
w.localStorage.setItem('cutcoach_search_learning_v1',JSON.stringify({version:1,records:[{query:'alt',itemId:'old',mealType:'Snack',adds:9,choices:9,lastUsedAt:oldDate}]}));
const itemA={id:'pudding-a',name:'Protein Pudding',amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'bls'};
const itemB={id:'pudding-b',name:'Protein Pudding',amount:200,unit:'g',calories:190,protein:18,carbs:18,fat:5,source:'bls'};
let added=0;
w.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>{added++;return{id:'meal'}}};
w.CutCoachFoodCatalog={items:()=>[itemA,itemB],get:id=>[itemA,itemB].find(item=>item.id===id)||null};
w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
w.render=()=>{};w.toast=()=>{};
let script=w.document.createElement('script');script.textContent=learningSource;w.document.head.append(script);
const learning=w.CutCoachSearchLearning160;
assert.equal(learning.version,'1.6.0-alpha');
assert.equal(learning.build,'1.6.0-local-learning');
assert.equal(learning.snapshot().records.length,0,'Veraltete Lerndaten werden nicht entfernt.');
assert.doesNotMatch(learningSource,/fetch\s*\(|XMLHttpRequest|WebSocket/,'Lokales Lernen enthält eine Netzwerkschnittstelle.');
assert.doesNotMatch(learningSource,/document\.addEventListener/,'Lernspeicher registriert unnötige globale Dokument-Listener.');

const favoriteSignal=learning.signal({...itemA,favorite:true},'catalog','protein pudding','Frühstück');
assert.equal(favoriteSignal.decisive,true);assert.equal(favoriteSignal.reason,'Favorit');
const frequentSignal=learning.signal({...itemA,uses:3},'catalog','protein pudding','Frühstück');
assert.equal(frequentSignal.decisive,true);assert.equal(frequentSignal.reason,'Häufig genutzt');

const base={
  version:'base',build:'base',
  rowsFor(value){const query=String(value||'').trim().toLowerCase();return[{raw:String(value||''),query,quantity:1,quantitySpecified:false,unitInfo:null,modifier:'',item:null,status:'missing',confidence:0,matchType:'none',alternatives:[]}]},
  likelyMulti:()=>false,render:()=>true,invalidateIndex:()=>{},score:()=>[]
};
script=w.document.createElement('script');script.textContent=hardeningSource;w.document.head.append(script);
const api=w.CutCoachSearchConfidenceHardening151.attach(base);
let row=api.rowsFor('Protein Pudding')[0];
assert.equal(row.status,'ambiguous','Gleich starke Treffer dürfen ohne Lerndaten nicht automatisch gewählt werden.');

learning.record('protein pudding',itemA,{kind:'choice',mealType:'Frühstück'});
row=api.rowsFor('Protein Pudding')[0];
assert.equal(row.status,'ambiguous','Eine einzelne Auswahl darf noch keinen automatischen Gewinner erzeugen.');
assert.equal(learning.signal(itemA,'catalog','protein pudding','Frühstück').score<=3,true,'Ein nicht bestätigtes Einzelsignal ist zu stark gewichtet.');

learning.record('protein pudding',itemA,{kind:'choice',mealType:'Frühstück'});
row=api.rowsFor('Protein Pudding')[0];
assert.equal(row.status,'matched');assert.equal(row.item.id,'pudding-a');assert.equal(row.matchType,'ranked-local-learning');assert.equal(row.personalReason,'Deine Wahl');
const breakfast=learning.signal(itemA,'catalog','protein pudding','Frühstück'),dinner=learning.signal(itemA,'catalog','protein pudding','Abendessen');
assert.equal(breakfast.contextHits,2);assert.equal(dinner.contextHits,0);assert.ok(breakfast.score>dinner.score,'Mahlzeitenkontext beeinflusst die lokale Priorisierung nicht.');

row=api.rowsFor('Steak')[0];
assert.equal(row.item,null,'Lerndaten überschreiben einen sprachlich unpassenden Suchbegriff.');assert.equal(row.status,'missing');

learning.clear();
const host=w.document.createElement('section');host.id='nutritionMultiSearch';host._canonicalRows=[{query:'protein pudding',item:itemA}];w.document.body.append(host);
w.document.querySelector('#nutritionSearch').value='Protein Pudding';
const token=w.CutCoachLibrary.addCatalogItemToDay(itemA,{type:'Snack'});
assert.ok(token);assert.equal(added,1);
const stored=learning.snapshot().records;
assert.equal(stored.length,1);assert.equal(stored[0].query,'protein pudding');assert.equal(stored[0].itemId,'pudding-a');assert.equal(stored[0].mealType,'Snack');assert.equal(stored[0].adds,1);
assert.equal(learning.signal(itemA,'catalog','protein pudding','Snack').decisive,false,'Ein einzelner erfolgreicher Eintrag wird zu früh als sichere Gewohnheit behandelt.');

const learningPos=loader.indexOf("nutrition-search-learning-v160.js?v=1.6.0-alpha"),confidencePos=loader.indexOf("nutrition-search-confidence-hardening-v151.js?v=1.5.2-alpha");
assert.ok(learningPos>=0&&confidencePos>=0&&learningPos<confidencePos,'Lernschicht wird nicht vor dem Confidence-Ranking geladen.');
assert.match(compatibility,/nutrition-search-learning-v160\.js\?v=1\.6\.0-alpha/);
assert.match(compatibility,/personalReason/);
assert.match(manifest,/nutrition-search-learning-v160\.js\?v=1\.6\.0-alpha/);
assert.match(sw,/search160-learning/);

dom.window.close();
console.log('Lokales Suchlernen 1.6.0: Priorisierung, Datenschutz, Kontext und Sicherheitsgrenzen geprüft.');