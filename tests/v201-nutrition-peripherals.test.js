'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,name)=>{const script=window.document.createElement('script');script.textContent=read(name);window.document.head.append(script)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  {
    const dom=new JSDOM('<!doctype html><body class="nutrition-mode"><section data-screen="food"><div class="nutrition-macro-compass"></div></section><span id="appVersion">Version 1.2.2 Alpha</span></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
    const w=dom.window;inject(w,'nutrition-cleanup-101.js');await wait(80);
    assert.equal(w.CutCoachNutritionCleanup101.version,'1.0.4 Alpha');assert.equal(w.document.querySelector('#appVersion').textContent,'Version 1.2.2 Alpha','Cleanup überschreibt wieder die zentrale App-Version.');
    const first=w.CutCoachNutritionCleanup101.snapshot();assert.equal(first.scoped,true);await wait(100);const second=w.CutCoachNutritionCleanup101.snapshot();assert.equal(second.syncCount,first.syncCount,'Cleanup läuft nach der Darstellung in einer Mutationsschleife.');assert.equal(second.pending,false);
    assert.doesNotMatch(read('nutrition-cleanup-101.js'),/appVersion|Version \$\{VERSION\}/,'Cleanup enthält erneut eine konkurrierende Versionsanzeige.');dom.window.close();
  }
  {
    const dom=new JSDOM('<!doctype html><body class="canonical-multisearch-active"><button id="nutritionVoice"></button><input id="nutritionSearch" value="Cola"><div id="nutritionVoiceStatus"></div><section id="normal" hidden data-v192-suppressed="1" data-v192-was-hidden="0"></section><div id="nutritionMultiSearch" data-canonical="1" data-presentation-v192="1" data-query="alt"><b>Alt</b></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
    const w=dom.window;inject(w,'nutrition-voice-111.js');await wait(10);const api=w.CutCoachNutritionVoice111;assert.equal(api.version,'1.9.2-alpha');api.clearStaleResults();
    assert.equal(w.document.body.classList.contains('canonical-multisearch-active'),false);assert.equal(w.document.querySelector('#normal').hidden,false,'Normale Treffer bleiben nach Sprachabbruch ausgeblendet.');assert.equal(w.document.querySelector('#nutritionMultiSearch').children.length,0);assert.equal(w.document.querySelector('#nutritionMultiSearch').hasAttribute('data-presentation-v192'),false);dom.window.close();
  }
  {
    const dom=new JSDOM('<!doctype html><body><button id="lookupManualCode"></button><div id="scannerStatus"></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
    const w=dom.window;w.CutCoachLibrary={exportData:()=>({items:[]}),importData:()=>true};inject(w,'off-lookup.js');await wait(10);const api=w.CutCoachOffLookup;assert.equal(api.version,'1.8.1-alpha');
    assert.equal(api.basisUnit({serving_size:'330 ml'}),'ml');assert.equal(api.basisUnit({quantity:'500 g'}),'g');
    const zero=api.nutrition({serving_size:'330 ml',nutriments:{'energy-kcal_100g':0,'carbohydrates_100g':0,'fat_100g':0,'proteins_100g':0}});assert.equal(zero.available,true);assert.equal(zero.unit,'ml');assert.equal(zero.calories,0);
    const food=api.nutrition({quantity:'250 g',nutriments:{'energy-kcal_100g':120,'proteins_100g':5}});assert.equal(food.unit,'g');assert.equal(food.calories,120);dom.window.close();
  }
  {
    const dom=new JSDOM('<!doctype html><body><button id="scanCode"></button><div id="scannerModal"><div class="scanner-frame"></div><div id="scannerStatus"></div><input id="manualCode"><button id="lookupManualCode"></button></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
    const w=dom.window;let legacyStarts=0;w.CutCoachLibrary={startScanner:()=>{legacyStarts++}};w.openModal=()=>{};w.Html5QrcodeSupportedFormats={QR_CODE:1,EAN_13:2,EAN_8:3,UPC_A:4,UPC_E:5,CODE_128:6,CODE_39:7};
    class Scanner{static async getCameras(){return[{id:'back',label:'Back Camera'}]}async start(){return true}async stop(){return true}clear(){}}
    w.Html5Qrcode=Scanner;const button=w.document.querySelector('#scanCode');button.onclick=()=>{legacyStarts++};inject(w,'scanner-v2.js');await wait(20);
    assert.equal(w.CutCoachScannerV2.version,'1.8.1-alpha');assert.equal(w.CutCoachLibrary.startScanner,w.CutCoachScannerV2.start,'Bibliotheks-Shortcut umgeht weiterhin Scanner V2.');
    button.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));await wait(30);assert.equal(legacyStarts,0,'Legacy- und V2-Scanner starten weiterhin gleichzeitig.');assert.equal(w.CutCoachScannerV2.state().libraryBridged,true);dom.window.close();
  }
  console.log('Ernährungsperipherie 2.0.1: Cleanup-Ruhe, Sprache 1.9.2, Open Food Facts und Scanner stabil.');
})().catch(error=>{console.error(error);process.exitCode=1});
