'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const profilesSource=fs.readFileSync(path.join(root,'nutrition-portion-profiles-v153.js'),'utf8');
const hardeningSource=fs.readFileSync(path.join(root,'nutrition-portion-hardening-v153.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Frühstück"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  let script=w.document.createElement('script');script.textContent=profilesSource;w.document.head.append(script);
  const profiles=w.CutCoachPortionProfiles153;
  assert.ok(profiles);
  assert.equal(profiles.canonicalMeasure('Esslöffeln'),'tablespoon');
  assert.equal(profiles.canonicalMeasure('Teelöffeln'),'teaspoon');
  assert.equal(profiles.canonicalMeasure('Gläsern'),'glass');

  const toast={id:'toast',name:'Toastbrot',aliases:['Toast'],category:'Brot',amount:1,unit:'Stück'};
  const milkRice={id:'milk-rice',name:'Milchreis',amount:100,unit:'g'};
  const butterCookie={id:'butter-cookie',name:'Butterkeks',amount:100,unit:'g'};
  const watermelon={id:'watermelon',name:'Wassermelone',amount:100,unit:'g'};
  const honeyMelon={id:'honey-melon',name:'Honigmelone',amount:100,unit:'g'};
  const milk={id:'milk',name:'Milch 3,5 %',aliases:['Milch'],amount:250,unit:'ml'};
  const cola={id:'cola',name:'Cola',amount:330,unit:'ml'};
  const butter={id:'butter',name:'Butter',amount:10,unit:'g'};
  const whey={id:'whey',name:'Whey Protein',aliases:['Whey'],amount:30,unit:'g',householdMeasures:{EL:{amount:.012,unit:'kg'}}};
  const customPiece={id:'piece',name:'Eigenes Stück',amount:1,unit:'stück',householdMeasures:{Stück:{amount:1,unit:'stück'}}};

  let resolved=profiles.resolve(toast,'Scheiben',2);assert.equal(resolved.known,true);assert.equal(resolved.factor,2);assert.match(resolved.amountLabel,/50 g/);
  for(const [item,measure] of [[milkRice,'Glas'],[butterCookie,'EL'],[watermelon,'Glas'],[honeyMelon,'EL']]){resolved=profiles.resolve(item,measure,1);assert.equal(resolved.known,false,`${item.name} wurde fälschlich einem Portionsprofil zugeordnet.`);assert.equal(resolved.source,'unknown')}
  resolved=profiles.resolve(whey,'EL',1);assert.equal(resolved.known,true);assert.ok(Math.abs(resolved.factor-.4)<.0001);assert.equal(resolved.convertedAmount,12);assert.equal(resolved.convertedUnit,'g');
  resolved=profiles.resolve(customPiece,'Stück',1);assert.equal(resolved.known,true);assert.equal(resolved.factor,1);assert.equal(resolved.convertedUnit,'Stück');
  resolved=profiles.resolve(milk,'Glas',1);assert.equal(resolved.known,true);assert.equal(resolved.needsReview,true);assert.equal(resolved.confidence,86);assert.equal(resolved.factor,1);
  resolved=profiles.resolve(cola,'Dose',1);assert.equal(resolved.known,true);assert.equal(resolved.needsReview,false);assert.equal(resolved.confidence,92);assert.equal(resolved.factor,1);
  resolved=profiles.resolve(cola,'Flasche',1);assert.equal(resolved.known,true);assert.equal(resolved.needsReview,true);assert.equal(resolved.confidence,78);assert.ok(Math.abs(resolved.factor-(500/330))<.0001);

  let rowCalls=0,baseRenderCalls=0;
  const householdRow=(item,label,confidence=100)=>({raw:`1 ${label} ${item.name}`,query:item.name.toLowerCase(),quantity:1,quantitySpecified:true,unitInfo:{kind:label==='Stück'?'count':'serving',label},modifier:'',item,status:'matched',matchType:'exact-name',confidence,confidenceLabel:`Exakt · ${confidence}%`,factor:1,amountLabel:`1 ${label}`,approximate:true,alternatives:[],choices:[]});
  const puddingA={id:'pudding-a',name:'Protein Pudding',amount:200,unit:'g'},puddingB={id:'pudding-b',name:'Protein Pudding',amount:200,unit:'g'};
  const base={
    version:'test-base',build:'test-base',
    rowsFor(value){rowCalls++;const key=String(value||'');if(key==='1 EL Butter')return[householdRow(butter,'EL')];if(key==='1 EL Whey')return[householdRow(whey,'EL',98)];if(key==='1 Glas Milch')return[householdRow(milk,'Glas')];if(key==='1 Dose Cola')return[householdRow(cola,'Dose')];if(key==='1 Flasche Cola')return[householdRow(cola,'Flasche')];if(key==='Protein Pudding')return[{raw:key,query:'protein pudding',quantity:1,quantitySpecified:false,unitInfo:null,item:null,status:'ambiguous',confidence:0,alternatives:[],choices:[{item:puddingA,label:'Eigene'},{item:puddingB,label:'Eigene'}]}];return[]},
    likelyMulti(){return false},
    render(){baseRenderCalls++;return true},
    score(){return[]}
  };
  script=w.document.createElement('script');script.textContent=hardeningSource;w.document.head.append(script);
  const api=w.CutCoachPortionHardening153.attach(base),input=w.document.querySelector('#nutritionSearch');
  assert.ok(api);
  assert.equal(api.looksLikeHouseholdInput('Menemen'),false);
  assert.equal(api.looksLikeHouseholdInput('1 EL Butter'),true);
  assert.equal(api.looksLikeHouseholdInput('2Stück Kartoffeln'),true);

  assert.equal(api.likelyMulti('Menemen'),false);assert.equal(rowCalls,0,'Normale Suche löst unnötig den Portionsresolver aus.');
  input.value='Menemen';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(rowCalls,0,'Normale Eingabe scannt unnötig den Katalog.');
  api.rowsFor('1 EL Butter');api.rowsFor('1 EL Butter');assert.equal(rowCalls,1,'Identische Portionsabfrage wird doppelt aufgelöst.');
  w.dispatchEvent(new w.CustomEvent('cutcoach:librarychange'));api.rowsFor('1 EL Butter');assert.equal(rowCalls,2,'Portionscache wird nach Bibliotheksänderung nicht invalidiert.');

  let row=api.rowsFor('1 Glas Milch')[0];assert.equal(row.status,'review');assert.equal(row.confidence,86);assert.equal(row.portionNeedsReview,true);
  row=api.rowsFor('1 Dose Cola')[0];assert.equal(row.status,'matched');assert.equal(row.confidence,92);
  row=api.rowsFor('1 Flasche Cola')[0];assert.equal(row.status,'review');assert.equal(row.confidence,78);

  input.value='1 EL Whey';assert.equal(api.render(input),true);let host=w.document.querySelector('#nutritionMultiSearch');assert.match(host.textContent,/Sehr sicher · 98%/);assert.doesNotMatch(host.textContent,/Exakt · 98%/);
  input.value='1 Glas Milch';assert.equal(api.render(input),true);host=w.document.querySelector('#nutritionMultiSearch');assert.match(host.textContent,/Portionsgröße vor dem Eintragen prüfen/);assert.doesNotMatch(host.textContent,/bitte prüfen/);

  host.dataset.portion153='1';input.value='Protein Pudding';input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(host.hasAttribute('data-portion153'),false,'Alter Portionsmarker bleibt bei normaler Suche aktiv.');
  host.dataset.portion153='1';host.dataset.canonical='1';host.dataset.query='protein pudding';host._canonicalRows=base.rowsFor('Protein Pudding');host.innerHTML='<button type="button" data-confidence-choice="0:0">Auswahl</button>';
  let propagated=0;const bubble=()=>{propagated++};w.document.addEventListener('click',bubble);host.querySelector('button').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));w.document.removeEventListener('click',bubble);assert.equal(propagated,1,'Veralteter Portionslistener blockiert eine normale Mehrdeutigkeitsauswahl.');

  api.invalidateRowCache();rowCalls=0;input.value='1 EL Butter';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(240);assert.equal(rowCalls,1,'Eingabe und Rendering lösen denselben Kataloglauf doppelt aus.');assert.equal(baseRenderCalls,0);

  dom.window.close();
  console.log('Portions-Bugfix 1.5.4: Fehlzuordnungen, Cache, UI-Marker und Einheiten geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});