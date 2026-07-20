'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'nutrition-polish-v138.js'),'utf8');
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Frühstück">
<section data-screen="food"><div class="nutrition-shell">
  <section class="nutrition-search-card"><label class="nutrition-search-row"><span>⌕</span><input id="nutritionSearch"><button id="nutritionVoice">🎤</button></label></section>
  <div class="nutrition-shortcuts"><button id="nutritionManual"><b>Manuell</b></button><button id="nutritionNewFood"><b>Lebensmittel</b></button></div>
  <div class="nutrition-meal-actions"><button id="nutritionCopyPrevious">↶ Vortag</button><button id="nutritionCurrentToggle" aria-expanded="false">Ansehen <span>⌄</span></button></div>
  <div class="nutrition-tabs"><button class="active" data-nutrition-filter="all">Alle</button></div>
  <div id="nutritionResults" class="nutrition-results"><article class="nutrition-result-row"><button class="nutrition-result-main"><span class="nutrition-result-copy"><b><span>Test</span></b></span></button><span class="nutrition-result-energy"><b>1 kcal</b></span><button class="nutrition-result-add">＋</button></article></div>
</div></section></body>`,{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});
const w=dom.window;
const doener={id:'ccde:doner-kalb',name:'Döner Kebab Kalb/Rind',aliases:['Döner','Kebap'],amount:1,unit:'Portion',calories:820,protein:42,carbs:79,fat:36,source:'cutcoach'};
const bread={id:'bread',name:'Brot',aliases:['Brotscheibe'],amount:1,unit:'Stück',calories:115,protein:3.8,carbs:21,fat:1.4,source:'cutcoach'};
const butter={id:'butter',name:'Butter',amount:10,unit:'g',calories:74,protein:.1,carbs:.1,fat:8.2,source:'cutcoach'};
const cola={id:'cola',name:'Cola',amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,source:'cutcoach'};
w.CutCoachFoodCatalog={items:()=>[bread,butter,cola,doener],get:id=>[bread,butter,cola,doener].find(item=>item.id===id)||null};
w.CutCoachEverydayCatalog={get:id=>id===doener.id?doener:null};
const added=[];w.CutCoachLibrary={addCatalogItemToDay:(item,options)=>{added.push({item,options});return{id:`meal-${added.length}`,name:item.name}}};
w.toast=()=>{};w.render=()=>{};
w.CutCoachIntelligentSearch128={
  rowsFor:value=>{
    const text=String(value).toLocaleLowerCase('de');
    if(text.includes('2 brot')&&text.includes('steak'))return[
      {raw:'2 Brot',query:'brot',item:null,status:'missing',confidence:0,factor:1,alternatives:[],choices:[]},
      {raw:'ein steak',query:'steak',item:null,status:'missing',confidence:0,factor:1,alternatives:[],choices:[]}
    ];
    if(text.trim()==='döne')return[{raw:'Döne',query:'done',item:doener,status:'review',confidence:89,confidenceLabel:'Wahrscheinlich · 89%',corrected:doener.name,factor:1,alternatives:[],choices:[]}];
    if(text.includes('butter')&&text.includes('cola')&&text.includes('brot'))return[
      {raw:'2 EL Butter',query:'butter',item:butter,status:'matched',confidence:94,confidenceLabel:'Sehr sicher · 94%',factor:2,amountLabel:'2 EL · Standardwert',alternatives:[],choices:[]},
      {raw:'Cola',query:'cola',item:cola,status:'matched',confidence:100,confidenceLabel:'Exakt · 100%',factor:1,alternatives:[],choices:[]},
      {raw:'Brot',query:'brot',item:bread,status:'matched',confidence:100,confidenceLabel:'Exakt · 100%',factor:1,alternatives:[],choices:[]}
    ];
    return[];
  },
  likelyMulti:value=>/und|mit|döne|\d/.test(String(value).toLocaleLowerCase('de'))
};

const script=w.document.createElement('script');script.textContent=source;w.document.head.append(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
const input=w.document.querySelector('#nutritionSearch');
const type=async value=>{input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(180);return w.document.querySelector('#nutritionMultiSearch')};

(async()=>{
  let host=await type('Döne');
  assert.ok(host&&!host.hidden,'Döne öffnet keine korrigierte Trefferkarte.');
  assert.match(host.textContent,/Erkannte Einträge/);
  assert.match(host.textContent,/Döner Kebab Kalb\/Rind/);
  assert.doesNotMatch(host.textContent,/Wahrscheinlich|Sehr sicher|Exakt|\d+\s*%|Meintest du|Vor dem Eintragen prüfen/,'Technische Wahrscheinlichkeitsdarstellung ist noch sichtbar.');
  assert.equal(host.querySelectorAll('[data-v192-add]').length,1,'Döner besitzt keine eindeutige Hinzufügen-Aktion.');

  host=await type('2 Brot und ein steak');
  const names=[...host.querySelectorAll('.nutrition-multi-list article b')].map(node=>node.textContent.trim());
  assert.deepEqual(names,['Brot','Rindersteak'],'Brot und Steak werden nicht als zwei sichere Alltagseinträge aufgelöst.');
  assert.doesNotMatch(host.textContent,/sichere Bestandteile|sicherer Treffer|Treffer zum Prüfen/,'Unnötige Sicherheitszählung ist noch sichtbar.');
  assert.equal(host.querySelectorAll('[data-v192-add]').length,2);
  assert.ok([...host.querySelectorAll('[data-v192-add]')].every(button=>/Hinzufügen/.test(button.textContent)),'Fehlerhafte reine Pluskästen sind noch vorhanden.');
  host.querySelector('[data-v192-add="0"]').click();
  assert.equal(added.at(-1).item.name,'Brot','Einzelnes Hinzufügen verwendet nicht den erkannten Broteintrag.');
  assert.equal(added.at(-1).options.factor,2,'Menge 2 wird für Brot nicht übernommen.');

  host=await type('2 EL Butter mit Cola und Brot');
  assert.equal(host.querySelectorAll('.nutrition-multi-list article').length,3,'Butter, Cola und Brot werden nicht gemeinsam dargestellt.');
  assert.match(host.textContent,/2 EL · Standardwert/,'Mengenhinweis wurde zusammen mit den Prozenten fälschlich entfernt.');
  assert.doesNotMatch(host.textContent,/94%|100%|Sehr sicher|Exakt|3 sichere Bestandteile/);
  assert.ok(host.querySelector('[data-v192-all]'),'Saubere Alle-hinzufügen-Aktion fehlt.');
  const stable=host.innerHTML;await wait(140);assert.equal(host.innerHTML,stable,'DOM-Polisher löst durch eigene Änderungen eine Render-Schleife aus.');

  assert.equal(w.document.querySelector('#nutritionVoice').textContent,'🎙️');
  assert.equal(w.document.querySelector('#nutritionCopyPrevious').textContent,'Vortag');
  assert.match(w.document.querySelector('#nutritionCurrentToggle').textContent,/Einträge/);
  assert.equal(w.document.querySelector('.nutrition-result-add').textContent,'+');
  assert.equal(w.CutCoachNutritionPolish138.presentationVersion,'1.9.2-alpha');

  dom.window.close();
  console.log('Such-UI 1.9.2: Döne, Brot/Steak, Butter/Cola/Brot, kontrastreiche Karten und stabile DOM-Laufzeit bestanden.');
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1});
