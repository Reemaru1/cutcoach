'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const dish={id:'dish-lachs-reis',name:'Lachs mit Reis und Gemüse',amount:550,unit:'g',calories:820,protein:48,carbs:79,fat:32,source:'cutcoach'};
  const goose={id:'goose',name:'Gans Fleisch, ohne Haut, roh',amount:100,unit:'g',calories:160,protein:22,carbs:0,fat:8,source:'bls'};
  const cola={id:'cola',name:'Cola',amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,source:'cutcoach'};
  const egg={id:'egg',name:'Ei',aliases:['Eier'],amount:1,unit:'Stück',calories:86,protein:7.5,carbs:.4,fat:6,source:'cutcoach'};
  const banana={id:'banana',name:'Banane',amount:1,unit:'Stück',calories:105,protein:1.3,carbs:27,fat:.4,source:'cutcoach'};
  const skyr={id:'skyr-special',name:'Skyr Spezial',amount:500,unit:'g',calories:315,protein:55,carbs:20,fat:1,source:'user'};
  const catalog=[dish,goose,cola,egg,banana,skyr];
  const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Abendessen"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.CutCoachLibrary={exportData:()=>({items:[]}),addItemToDay:()=>({id:'meal'}),addCatalogItemToDay:()=>({id:'meal'}),undoDayAdd:()=>true};
  w.CutCoachFoodCatalog={items:()=>catalog,get:id=>catalog.find(item=>item.id===id)||null};
  w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};w.render=()=>{};w.toast=()=>{};
  for(const name of ['nutrition-portion-profiles-v153.js','nutrition-portion-hardening-v153.js','nutrition-search-learning-v161.js','nutrition-search-exact-whole-v170.js','nutrition-search-confidence-hardening-v151.js','nutrition-multisearch-canonical-128.js'])inject(w,read(name));
  let engine=w.CutCoachIntelligentSearch128;
  engine=w.CutCoachSearchExactWhole170.attach(engine);
  engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
  engine=w.CutCoachPortionHardening153.attach(engine);
  const api=w.CutCoachIntelligentSearch128;
  assert.equal(api.exactWholeVersion,'1.9.0-alpha');

  let rows=api.rowsFor('550 g Lachs mit Reis und Gemüse und 330 ml Cola');
  assert.equal(rows.length,2,'Ein vollständiges Gericht zerfällt innerhalb einer Mehrfachsuche.');
  assert.equal(rows[0].item.id,dish.id);assert.equal(rows[0].factor,1);assert.equal(rows[1].item.id,cola.id);assert.equal(rows[1].factor,1);
  rows=api.rowsFor('100 g Gans Fleisch, ohne Haut, roh und 1 Ei');
  assert.equal(rows.length,2,'Kommas in einem vollständigen Katalognamen werden als Trenner behandelt.');
  assert.equal(rows[0].item.id,goose.id);assert.equal(rows[1].item.id,egg.id);
  rows=api.rowsFor('Lachs mit Reis und Gemüse + Cola');
  assert.equal(rows.length,2,'Mengenlose vollständige Gerichte werden in Kombinationen nicht geschützt.');
  assert.equal(rows[0].item.id,dish.id);assert.equal(rows[1].item.id,cola.id);
  rows=api.rowsFor('250,5 g Skyr Spezial und 1 Banane');
  assert.equal(rows.length,2,'Dezimalmengen mit Komma werden als Mehrfachtrenner behandelt.');
  assert.equal(rows[0].item.id,skyr.id);assert.ok(Math.abs(rows[0].factor-.501)<.0001);assert.equal(rows[1].item.id,banana.id);

  inject(w,read('nutrition-multisearch-120.js'));
  const resolved=w.CutCoachNutritionMultiSearch120.resolve('1 Ei und 1 Banane');
  assert.equal(resolved.match,null,'Die Einzeltreffer-Fassade gibt bei einer Mehrfachsuche still den ersten Treffer zurück.');
  assert.equal(resolved.status,'multiple');assert.equal(resolved.multiple,true);assert.equal(resolved.alternatives.length,2);
  dom.window.close();

  let recognition=null,throwOnStop=false,clears=0,committed=0;
  class FakeRecognition{
    constructor(){recognition=this}
    start(){this.onstart?.()}
    stop(){if(throwOnStop)throw new Error('stop failed');this.onend?.()}
    abort(){this.onerror?.({error:'aborted'});this.onend?.()}
  }
  const voiceDom=new JSDOM('<!doctype html><body><button id="nutritionVoice"></button><input id="nutritionSearch" value="Alt"><div id="nutritionVoiceStatus"></div><section id="nutritionMultiSearch"></section></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
  const vw=voiceDom.window;vw.webkitSpeechRecognition=FakeRecognition;vw.CutCoachNutritionStage6={clear:()=>{clears++}};Object.defineProperty(vw.navigator,'onLine',{configurable:true,value:true});inject(vw,read('nutrition-voice-111.js'));
  const voice=vw.CutCoachNutritionVoice111,input=vw.document.querySelector('#nutritionSearch');input.addEventListener('input',()=>committed++);
  assert.equal(voice.version,'1.9.0-alpha');assert.equal(voice.start(),true);
  let result=[[{transcript:'Skyr'}]];result[0].isFinal=true;recognition.onresult({resultIndex:0,results:result});voice.stop(true);assert.equal(input.value,'Skyr');
  input.value='Banane';voice.stop(false);assert.equal(input.value,'Banane','Ein inaktiver Abbruch stellt einen alten Sprachwert wieder her.');
  assert.equal(voice.start(),true);result=[[{transcript:'Apfel'}]];result[0].isFinal=false;recognition.onresult({resultIndex:0,results:result});assert.ok(clears>=1,'Sprachvorschau lässt alte Suchergebnisse sichtbar.');recognition.onnomatch();recognition.onend();assert.equal(input.value,'Banane');assert.equal(input.dataset.voicePreview,undefined);assert.equal(committed,1,'Nicht erkannte Sprache wurde trotzdem als Suche bestätigt.');
  assert.equal(voice.start(),true);result=[[{transcript:'Cola'}]];result[0].isFinal=false;recognition.onresult({resultIndex:0,results:result});throwOnStop=true;voice.stop(true);throwOnStop=false;assert.equal(input.dataset.voicePreview,undefined,'Fehlgeschlagenes stop() hält die Suche im Vorschauzustand fest.');
  voiceDom.window.close();

  let learned=0;
  const portionDom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Frühstück"><div class="nutrition-search-card"><input id="nutritionSearch" value="2 Scheiben Proteinbrot"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
  const pw=portionDom.window;const breadA={id:'bread-a',name:'Proteinbrot A',amount:50,unit:'g',calories:120,protein:10,carbs:12,fat:3};const breadB={id:'bread-b',name:'Proteinbrot B',amount:50,unit:'g',calories:130,protein:11,carbs:13,fat:3};
  pw.CutCoachPortionProfiles153={version:'test',resolve:()=>({known:true,confidence:96,factor:2,amountLabel:'2 Scheiben',approximate:true,source:'profile',needsReview:false})};
  pw.CutCoachSearchLearning161={record:(query,item,options)=>{assert.equal(query,'proteinbrot');assert.equal(item.id,breadA.id);assert.equal(options.kind,'choice');learned++;return true}};
  const base={version:'base',rowsFor:()=>[{raw:'2 Scheiben Proteinbrot',query:'proteinbrot',quantity:2,quantitySpecified:true,unitInfo:{kind:'serving',label:'Scheibe'},status:'ambiguous',confidence:0,choices:[{item:breadA,label:'A'},{item:breadB,label:'B'}],alternatives:[]}],render:()=>false,likelyMulti:()=>true};
  inject(pw,read('nutrition-portion-hardening-v153.js'));const portionApi=pw.CutCoachPortionHardening153.attach(base);portionApi.render(pw.document.querySelector('#nutritionSearch'));pw.document.querySelector('[data-confidence-choice="0:0"]').click();assert.equal(learned,1,'Eine Haushaltsauswahl wird vom lokalen Lernen nicht erfasst.');
  portionDom.window.close();

  const confidence=read('nutrition-search-confidence-hardening-v151.js');assert.doesNotMatch(confidence,/queueMicrotask\(\(\)=>\{rendering=false\}\)/,'Alternative Ladereihenfolge kann eine Mutation-Render-Schleife erzeugen.');
  const loader=read('version-v7.js'),manifest=read('runtime-manifest.js'),sw=read('sw.js');
  assert.match(loader,/nutrition-search-exact-whole-v170\.js\?v=1\.9\.0-alpha/);assert.match(loader,/nutrition-voice-111\.js\?v=1\.9\.0-alpha/);assert.match(loader,/nutrition-multisearch-120\.js\?v=1\.9\.0-compat/);
  assert.match(manifest,/nutrition-search-exact-whole-v170\.js\?v=1\.9\.0-alpha/);assert.match(manifest,/nutrition-portion-hardening-v153\.js\?v=1\.9\.0-alpha/);assert.match(sw,/search190-integrity/);
  await wait(0);
  console.log('Intelligente Suche A-Z: Stufen 1-6, Mischgerichte, Mengen, Lernen, Voice, Kompatibilität und Ladefolgen geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
