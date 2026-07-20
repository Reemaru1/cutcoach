'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'nutrition-polish-v138.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

(async()=>{
  const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Mittagessen">
    <section data-screen="food"><div class="nutrition-shell">
      <button id="nutritionBack">Zurück</button>
      <section class="nutrition-search-card"><label class="nutrition-search-row"><span>⌕</span><input id="nutritionSearch"><button id="nutritionVoice">🎤</button></label></section>
      <nav><button id="journalNav">Tagebuch</button></nav>
      <div class="nutrition-tabs"><button class="active" data-nutrition-filter="all">Alle</button></div>
      <div id="nutritionResults" class="nutrition-results"></div>
    </div></section>
  </body>`,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});
  const w=dom.window;
  const toast={id:'toast',name:'Toastbrot',amount:1,unit:'Scheibe',calories:85,protein:3,carbs:15,fat:1};
  const raw={id:'strawberry-raw',name:'Erdbeere roh',amount:100,unit:'g',calories:38,protein:.8,carbs:6,fat:.4};
  const dried={id:'strawberry-dried',name:'Erdbeere getrocknet',amount:100,unit:'g',calories:323,protein:7,carbs:59,fat:4};
  w.CutCoachFoodCatalog={items:()=>[toast,raw,dried],get:id=>[toast,raw,dried].find(item=>item.id===id)||null};
  w.CutCoachLibrary={addCatalogItemToDay:()=>({id:'meal'})};
  w.toast=()=>{};w.render=()=>{};
  w.CutCoachIntelligentSearch128={
    rowsFor:value=>String(value).toLowerCase().includes('erdbeere')?[
      {raw:'Toastbrot',query:'toastbrot',item:toast,status:'matched',factor:1,choices:[],alternatives:[]},
      {raw:'Erdbeere',query:'erdbeere',item:null,status:'ambiguous',factor:1,choices:[{item:raw},{item:dried}],alternatives:[]}
    ]:[],
    likelyMulti:()=>true
  };

  const script=w.document.createElement('script');script.textContent=source;w.document.head.append(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const input=w.document.querySelector('#nutritionSearch');
  let backClicks=0,navClicks=0;
  w.document.querySelector('#nutritionBack').addEventListener('click',()=>backClicks++);
  w.document.querySelector('#journalNav').addEventListener('click',()=>navClicks++);

  input.value='Toastbrot mit Erdbeere';
  input.dispatchEvent(new w.Event('input',{bubbles:true}));
  await wait(180);
  const host=w.document.querySelector('#nutritionMultiSearch');
  assert.ok(host&&!host.hidden,'Mehrdeutige Screenshot-Suche wird nicht dargestellt.');
  assert.equal(host.querySelectorAll('[data-v192-choice]').length,2);
  assert.equal(w.CutCoachNutritionPolish138.presentationVersion,'1.9.4-alpha');
  assert.equal(w.CutCoachNutritionPolish138.interactionStats().renderWrites,1,'Erste Suchkarte wird mehrfach geschrieben.');

  let internalMutations=0;
  const mutationObserver=new w.MutationObserver(records=>{internalMutations+=records.length});
  mutationObserver.observe(host,{childList:true,subtree:true,characterData:true});
  await wait(260);
  assert.equal(w.CutCoachNutritionPolish138.interactionStats().renderWrites,1,'Aktive Suchkarte rendert sich fortlaufend selbst neu.');
  assert.equal(internalMutations,0,'Observer erzeugt nach dem ersten Render weitere Kartenmutationen.');

  input.focus();
  assert.equal(w.document.activeElement,input,'Suchfeld lässt sich nach der Trefferanzeige nicht mehr fokussieren.');
  w.document.querySelector('#nutritionBack').click();
  w.document.querySelector('#journalNav').click();
  assert.equal(backClicks,1,'Zurück-Button wird nach der Suche blockiert.');
  assert.equal(navClicks,1,'Navigation wird nach der Suche blockiert.');

  const outside=w.document.createElement('span');outside.textContent='Status';w.document.querySelector('.nutrition-shell').append(outside);
  await wait(100);
  assert.equal(w.CutCoachNutritionPolish138.interactionStats().renderWrites,1,'Fremde UI-Änderung rendert die Suchkarte erneut.');

  host.querySelector('[data-v192-choice="1:0"]').click();
  await wait(100);
  assert.equal(w.CutCoachNutritionPolish138.interactionStats().renderWrites,2,'Bewusste Auswahl aktualisiert die Karte nicht genau einmal.');
  const writes=w.CutCoachNutritionPolish138.interactionStats().renderWrites;
  await wait(220);
  assert.equal(w.CutCoachNutritionPolish138.interactionStats().renderWrites,writes,'Nach der Auswahl beginnt erneut eine Render-Endlosschleife.');

  assert.match(sw,/search194-interaction-unlock/,'Neue Cachegeneration für den Interaktions-Hotfix fehlt.');
  mutationObserver.disconnect();dom.window.close();
  console.log('Suchkarte bleibt nach mehrdeutiger Auswahl interaktiv und erzeugt keine Selbst-Render-Schleife.');
})().catch(error=>{console.error(error);process.exitCode=1});
