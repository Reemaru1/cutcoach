'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,name)=>{const script=window.document.createElement('script');script.textContent=read(name);window.document.head.append(script)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const deep=value=>JSON.parse(JSON.stringify(value));

(async()=>{
  const dom=new JSDOM(`<!doctype html><body class="nutrition-mode" data-nutrition-meal-type="Mittagessen">
    <section data-screen="food"><input id="nutritionSearch"><span data-filter-count="all">0</span><div id="nutritionResults"></div></section>
    <div id="nutritionDetailModal" aria-hidden="true"><div id="nutritionDetailSource"></div></div>
    <div id="libraryUseModal" class="open" aria-hidden="false"><div id="libraryUseSummary"><small></small></div><input id="libraryExactAmount"><input id="libraryFactor"><div id="libraryPortionPresets"><button data-portion-amount="1">1</button></div><div id="factorPreview"></div><button id="addLibraryMeal">Hinzufügen</button></div>
    <div id="libraryList">${Array.from({length:20},(_,index)=>`<button data-use-lib="ingredient"><span class="library-icon"></span><small>Zeile ${index}</small></button>`).join('')}<button data-edit-lib="ingredient">Bearbeiten</button></div>
    <div id="libraryItemModal"><button id="deleteLibraryItem">Löschen</button></div><button id="newLibraryItem">Neu</button>
    <div id="recipeV7Components"><input data-recipe-amount="0" value="1"></div><button id="recipeV7Save">Rezept speichern</button>
    <button id="normalAdd" data-nutrition-add="ingredient">+</button>
  </body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  const updated={id:'catalog:shake',name:'Proteinshake',kind:'food',amount:100,unit:'ml',calories:80,protein:15,carbs:3,fat:1,fiber:0,sugar:2,saturatedFat:.4,salt:.2,source:'bls',sourceId:'shake',sourceVersion:'4',modified:false};
  const zero={id:'off:water',name:'Wasser',kind:'food',amount:100,unit:'ml',calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:0,source:'off',sourceId:'water'};
  let items=[
    {...updated,calories:55,protein:8,favorite:true,uses:7,createdAt:'2026-01-01T00:00:00.000Z'},
    {id:'tiny',name:'Gewürz',kind:'food',amount:.1,unit:'g',calories:1,protein:0,carbs:0,fat:0,source:'user',sourceId:'',modified:false,components:[]},
    {id:'ingredient',name:'Haferflocken',kind:'food',amount:100,unit:'g',calories:370,protein:13,carbs:60,fat:7,source:'user',sourceId:'',modified:false,components:[]},
    {id:'recipe',name:'Porridge',kind:'recipe',amount:1,unit:'Portion',calories:400,protein:15,carbs:65,fat:8,source:'user',sourceId:'',modified:false,components:[{itemId:'ingredient',factor:1}]}
  ];
  let addedCalories=null;
  const legacy={
    exportData:()=>({version:3,items:deep(items)}),
    importData:raw=>{items=(raw?.items||[]).filter(item=>Number(item.calories)>0).map(item=>deep(item));return true},
    addCatalogItemToDay:raw=>{let item=items.find(entry=>entry.id===raw.id);if(!item){item=deep(raw);items.push(item)}addedCalories=Number(item.calories);return{mealId:'m1'}},
    addItemToDay:()=>({mealId:'m2'}),undoDayAdd:()=>true,
    openUse:id=>{const item=items.find(entry=>entry.id===id);if(!item)return false;w.document.querySelector('#libraryExactAmount').value=String(item.amount);w.document.querySelector('#libraryFactor').value='1';return true},
    openCatalogUse:()=>true,render:()=>{},raw:()=>items
  };
  w.CutCoachLibrary=legacy;w.CutCoachFoodCatalog={meta:{productVersion:'5'},items:()=>[updated,zero],get:id=>[updated,zero].find(item=>item.id===id)||null};w.mealCapacity=()=>5;let toast='';w.toast=message=>{toast=message};
  w.localStorage.setItem('cutcoach_library_v1',JSON.stringify({version:3,items:[...deep(items),zero]}));
  inject(w,'nutrition-stability-v201.js');await wait(80);
  const api=w.CutCoachNutritionStability201;assert.ok(api);assert.equal(api.version,'2.0.4-alpha');assert.equal(api.hardeningVersion,'2.0.5-alpha');

  const recovered=w.CutCoachLibrary.exportData().items.find(item=>item.id===zero.id);assert.ok(recovered,'Beim Start verworfener Nullkalorien-Eintrag wurde nicht wiederhergestellt.');assert.equal(recovered.calories,0);assert.equal(api.snapshot().zeroRecovered,1);

  const token=w.CutCoachLibrary.addCatalogItemToDay(updated);assert.ok(token);assert.equal(addedCalories,80,'Beim Hinzufügen wird weiterhin der veraltete gespeicherte Katalogwert verwendet.');const refreshed=w.CutCoachLibrary.exportData().items.find(item=>item.id===updated.id);assert.equal(refreshed.calories,80);assert.equal(refreshed.favorite,true);assert.equal(refreshed.uses,7);assert.equal(api.snapshot().catalogRefreshes,1);

  assert.equal(w.CutCoachLibrary.openUse('tiny'),true);await wait(10);const exact=w.document.querySelector('#libraryExactAmount'),factor=w.document.querySelector('#libraryFactor');exact.value='100000';exact.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(5);assert.equal(exact.value,'100000','Große exakte Portion wird weiterhin still auf das 100-fache der Basis zurückgesetzt.');assert.equal(Number(factor.value),1000000);assert.match(w.document.querySelector('#factorPreview').textContent,/1\.000\.000 kcal/);assert.equal(api.snapshot().portionFixes,1);

  w.document.querySelector('[data-edit-lib="ingredient"]').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));let deleted=0;w.document.querySelector('#deleteLibraryItem').addEventListener('click',()=>deleted++);w.document.querySelector('#deleteLibraryItem').dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(deleted,0,'Eine in Rezepten verwendete Zutat kann weiterhin gelöscht werden.');assert.match(toast,/Porridge/);assert.equal(api.snapshot().orphanBlocks,1);

  const recipeAmount=w.document.querySelector('[data-recipe-amount]'),recipeSave=w.document.querySelector('#recipeV7Save');recipeAmount.value='';recipeAmount.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(5);assert.equal(recipeAmount.getAttribute('aria-invalid'),'true');assert.equal(recipeSave.disabled,true,'Rezept kann mit leerer oder ungültiger Zutatenmenge gespeichert werden.');

  const add=w.document.querySelector('#normalAdd');let accepted=0;add.addEventListener('click',()=>accepted++);add.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));await wait(0);add.dispatchEvent(new w.MouseEvent('click',{bubbles:true,cancelable:true}));assert.equal(accepted,2,'Nach einer fehlgeschlagenen Hinzufügen-Aktion bleibt die Doppeltipp-Sperre unnötig aktiv.');

  const readsBefore=api.snapshot().personalReads;w.CutCoachLibrary.render();await wait(40);const readsAfter=api.snapshot().personalReads;assert.ok(readsAfter-readsBefore<=2,`Bibliothek wurde für eine Darstellung zu oft vollständig exportiert (${readsAfter-readsBefore}).`);

  dom.window.close();console.log('Ernährungs-A-bis-Z-Härtung 2.0.5: Nullkalorien-Recovery, Katalogrefresh, große Portionen, Rezeptabhängigkeiten, Eingabevalidierung und Bibliothekscache geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
