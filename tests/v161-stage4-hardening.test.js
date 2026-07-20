'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const learningSource=fs.readFileSync(path.join(root,'nutrition-search-learning-v161.js'),'utf8');
const hardeningSource=fs.readFileSync(path.join(root,'nutrition-search-confidence-hardening-v151.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const compatibility=fs.readFileSync(path.join(root,'nutrition-multisearch-120.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};

(async()=>{
  const oldDate=new Date(Date.now()-220*86400000).toISOString(),futureDate=new Date(Date.now()+48*3600000).toISOString(),now=new Date().toISOString();
  const dom=new JSDOM(`<!doctype html><body data-nutrition-meal-type="Frühstück">
    <section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionResults"></div></section>
    <div id="libraryUseModal"><button data-library-close></button><button id="addLibraryMeal"></button></div>
    <button id="resetData"></button><div id="onboardingModal"></div>
  </body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.eval('var state={onboarded:true};');
  const personal={id:'personal-pudding',name:'Protein Pudding Vanille',aliases:['Vanille Proteinpudding'],amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'user'};
  const catalog={id:'catalog-pudding',name:'Protein Pudding Vanille',amount:200,unit:'g',calories:160,protein:19,carbs:14,fat:3,source:'bls'};
  const unrelated={id:'doner',name:'Döner Kebab',aliases:['Döner'],amount:450,unit:'g',calories:850,protein:40,carbs:80,fat:35,source:'cutcoach'};
  const libraryItems=[personal];let addCount=0,undoCount=0;
  w.CutCoachLibrary={
    exportData:()=>({items:libraryItems}),
    addItemToDay:()=>{addCount++;return{id:`meal-${addCount}`}},
    addCatalogItemToDay:()=>{addCount++;return{id:`meal-${addCount}`}},
    undoDayAdd:()=>{undoCount++;return true}
  };
  w.CutCoachFoodCatalog={items:()=>[catalog,unrelated],get:id=>[catalog,unrelated].find(item=>item.id===id)||null};
  w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
  w.localStorage.setItem('cutcoach_search_learning_v1',JSON.stringify({version:1,records:[
    {query:'alt',itemId:'old',mealType:'Snack',adds:3,choices:0,lastUsedAt:oldDate},
    {query:'zukunft',itemId:'future',mealType:'Snack',adds:3,choices:0,lastUsedAt:futureDate},
    {query:'leer',itemId:'zero',mealType:'Snack',adds:0,choices:0,lastUsedAt:now},
    {query:'falsch',itemId:'meal',mealType:'Brunch',adds:3,choices:0,lastUsedAt:now}
  ]}));
  inject(w,learningSource);
  const learning=w.CutCoachSearchLearning161;
  assert.equal(learning.version,'1.6.1-alpha');assert.equal(learning.build,'1.6.1-stage4-hardening');
  assert.equal(w.CutCoachSearchLearning160,learning,'Kompatibilitätsalias zeigt nicht auf die gehärtete Lernschicht.');
  assert.equal(learning.snapshot().records.length,0,'Abgelaufene, zukünftige oder leere Lerndaten werden nicht bereinigt.');
  assert.equal(learning.queryRelatedToItem('protein puding',personal),true,'Sicherer Tippfehler wird nicht als passender Suchkontext erkannt.');
  assert.equal(learning.queryRelatedToItem('Cola',unrelated),false,'Ein fremder Suchbegriff darf dem Lebensmittel zugeordnet werden.');
  assert.doesNotMatch(learningSource,/fetch\s*\(|XMLHttpRequest|WebSocket/,'Lokales Lernen enthält eine Netzwerkschnittstelle.');

  const input=w.document.querySelector('#nutritionSearch');
  input.value='Protein Pudding';
  const personalToken=w.CutCoachLibrary.addItemToDay(personal.id,{type:'Frühstück'});
  let records=learning.snapshot().records;assert.equal(records.length,1);assert.equal(records[0].itemId,personal.id);assert.equal(records[0].adds,1);
  assert.equal(w.CutCoachLibrary.undoDayAdd(personalToken),true);assert.equal(undoCount,1);assert.equal(learning.snapshot().records.length,0,'Rückgängig entfernt das zuvor gelernte Signal nicht.');

  input.value='Cola';
  w.CutCoachLibrary.addCatalogItemToDay(unrelated,{type:'Frühstück'});
  assert.equal(learning.snapshot().records.length,0,'Ein alter oder unpassender Suchtext vergiftet das Lernmodell.');

  input.value='Protein Pudding';
  w.CutCoachLibrary.addCatalogItemToDay(catalog,{type:'Frühstück'});
  records=learning.snapshot().records;assert.equal(records.length,1);assert.equal(records[0].itemId,catalog.id);

  const beforeFailure=learning.snapshot();
  const nativeSet=w.Storage.prototype.setItem;
  Object.defineProperty(w.Storage.prototype,'setItem',{configurable:true,writable:true,value(){throw new Error('quota')}});
  assert.equal(learning.record('Protein Pudding',personal,{kind:'add',mealType:'Frühstück'}),false);
  assert.deepEqual(learning.snapshot(),beforeFailure,'Fehlgeschlagenes Speichern verändert trotzdem den Sitzungsspeicher.');
  Object.defineProperty(w.Storage.prototype,'setItem',{configurable:true,writable:true,value:nativeSet});

  const external=JSON.stringify({version:1,records:[{query:'protein pudding',itemId:personal.id,mealType:'Abendessen',adds:3,choices:0,lastUsedAt:new Date().toISOString()}]});
  const storageEvent=new w.Event('storage');Object.defineProperties(storageEvent,{key:{value:'cutcoach_search_learning_v1'},newValue:{value:external}});w.dispatchEvent(storageEvent);
  assert.equal(learning.signal(personal,'library','protein pudding','Abendessen').adds,3,'Änderungen aus einem zweiten Tab werden nicht übernommen.');

  learning.clear();input.value='Protein Pudding';
  const resultButton=w.document.createElement('button');resultButton.dataset.nutritionOpen=personal.id;w.document.querySelector('#nutritionResults').append(resultButton);
  resultButton.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.document.querySelector('#addLibraryMeal').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));
  w.dispatchEvent(new w.CustomEvent('cutcoach:librarychange'));
  assert.equal(learning.snapshot().records[0]?.adds,1,'Erfolgreicher Eintrag über den Portionsdialog wird nicht gelernt.');

  w.document.querySelector('#resetData').addEventListener('click',()=>{w.state.onboarded=false;w.document.querySelector('#onboardingModal').classList.add('open')});
  w.document.querySelector('#resetData').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await wait(10);
  assert.equal(learning.snapshot().records.length,0,'Alle Daten löschen lässt Stufe-4-Lerndaten zurück.');
  assert.equal(w.localStorage.getItem('cutcoach_search_learning_v1'),null);
  dom.window.close();

  const rankDom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Snack"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionResults"></div></section></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
  const r=rankDom.window;
  const libraryCandidate={id:'library-vanille',name:'Protein Pudding Vanille',amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'user'};
  const catalogCandidate={id:'catalog-vanille',name:'Protein Pudding Vanille',amount:200,unit:'g',calories:160,protein:19,carbs:14,fat:3,source:'bls'};
  let rankLibrary=[libraryCandidate];r.CutCoachLibrary={exportData:()=>({items:rankLibrary}),addItemToDay:()=>({id:'m'}),addCatalogItemToDay:()=>({id:'m'}),undoDayAdd:()=>true};
  r.CutCoachFoodCatalog={items:()=>[catalogCandidate],get:id=>id===catalogCandidate.id?catalogCandidate:null};r.CutCoachEverydayCatalog={items:()=>[],get:()=>null};r.render=()=>{};r.toast=()=>{};
  inject(r,learningSource);
  const base={version:'base',build:'base',rowsFor(value){const query=String(value||'').trim().toLowerCase();return[{raw:String(value||''),query,quantity:1,quantitySpecified:false,unitInfo:null,modifier:'',item:null,status:'missing',confidence:0,matchType:'none',alternatives:[]}]},likelyMulti:()=>false,render:()=>true,invalidateIndex:()=>{},score:()=>[]};
  inject(r,hardeningSource);const search=r.CutCoachSearchConfidenceHardening151.attach(base),rankLearning=r.CutCoachSearchLearning161;
  let row=search.rowsFor('Protein Pudding')[0];assert.equal(row.status,'ambiguous','Knappes generisches Ranking ist ohne belastbares Lernen nicht mehrdeutig.');
  rankLearning.record('Protein Pudding',libraryCandidate,{kind:'choice',mealType:'Snack'});row=search.rowsFor('Protein Pudding')[0];assert.equal(row.status,'ambiguous','Ein einzelnes schwaches Signal entscheidet einen generischen Nahtreffer.');
  rankLearning.record('Protein Pudding',libraryCandidate,{kind:'choice',mealType:'Snack'});row=search.rowsFor('Protein Pudding')[0];assert.equal(row.status,'matched');assert.equal(row.item.id,libraryCandidate.id);assert.equal(row.matchType,'catalog-local-learning');

  const better={id:'better',name:'Protein Pudding Schoko',amount:200,unit:'g',calories:160,protein:20,carbs:12,fat:3,source:'bls'};
  const worseFavorite={id:'worse',name:'Pudding Protein Schoko',amount:200,unit:'g',calories:170,protein:18,carbs:15,fat:4,source:'bls',favorite:true};
  rankLibrary=[];r.CutCoachFoodCatalog.items=()=>[better,worseFavorite];search.invalidateIndex();row=search.rowsFor('Protein Pudding')[0];
  assert.notEqual(row.item?.id,worseFavorite.id,'Persönliches Signal überschreibt einen klar besseren Texttreffer.');

  const reused={...libraryCandidate,name:'Döner Kebab',aliases:['Döner']};rankLibrary=[reused];r.CutCoachFoodCatalog.items=()=>[];search.invalidateIndex();row=search.rowsFor('Protein Pudding')[0];assert.notEqual(row.item?.id,reused.id,'Lerndaten springen bei wiederverwendeter ID auf ein anderes Lebensmittel.');
  rankDom.window.close();

  const choiceDom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Snack"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionResults"></div></section></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
  const c=choiceDom.window,itemOne={id:'one',name:'Protein Pudding',amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'bls'},itemTwo={id:'two',name:'Protein Pudding',amount:200,unit:'g',calories:180,protein:18,carbs:16,fat:4,source:'bls'};
  c.CutCoachLibrary={exportData:()=>({items:[]}),addCatalogItemToDay:()=>({id:'meal'}),addItemToDay:()=>({id:'meal'}),undoDayAdd:()=>true};c.CutCoachFoodCatalog={items:()=>[itemOne,itemTwo],get:()=>null};c.CutCoachEverydayCatalog={items:()=>[],get:()=>null};c.render=()=>{};c.toast=()=>{};
  inject(c,learningSource);inject(c,hardeningSource);const choiceSearch=c.CutCoachSearchConfidenceHardening151.attach(base),choiceInput=c.document.querySelector('#nutritionSearch');choiceInput.value='Protein Pudding';choiceSearch.render(choiceInput);let host=c.document.querySelector('#nutritionMultiSearch');
  host.querySelector('[data-confidence-choice]').dispatchEvent(new c.MouseEvent('click',{bubbles:true}));await Promise.resolve();host=c.document.querySelector('#nutritionMultiSearch');assert.equal(host._canonicalRows[0].status,'matched','Eigene Auswahl springt durch den Lern-Refresh sofort zurück auf mehrdeutig.');
  choiceDom.window.close();

  assert.match(loader,/nutrition-search-learning-v161\.js\?v=1\.6\.1-alpha/);assert.match(loader,/nutrition-search-confidence-hardening-v151\.js\?v=1\.6\.1-alpha/);assert.match(loader,/nutrition-multisearch-120\.js\?v=1\.6\.1-compat/);
  assert.match(compatibility,/nutrition-search-learning-v161\.js\?v=1\.6\.1-alpha/);assert.match(manifest,/nutrition-search-learning-v161\.js\?v=1\.6\.1-alpha/);assert.doesNotMatch(manifest,/nutrition-search-learning-v160\.js/);assert.match(sw,/search160-learning/);assert.match(sw,/search161-hardening/);
  console.log('Stufe 4 Hardening 1.6.1: Undo, Speicher, Modal, Reset, Tabs und Ranking geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});