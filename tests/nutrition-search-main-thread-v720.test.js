'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

(async()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'..','nutrition-multisearch-120.js'),'utf8'),dom=new JSDOM('<body><input id="nutritionSearch"></body>',{runScripts:'dangerously',pretendToBeVisual:true}),{window}=dom;let renders=0;
  const engine={version:'test',render:()=>{renders++;return true},rowsFor:()=>[],parse:()=>[]};
  window.CutCoachIntelligentSearch128=engine;
  window.CutCoachSearchExactWhole170={attach:value=>value};window.CutCoachSearchConfidenceHardening151={attach:value=>value};window.CutCoachPortionHardening153={attach:value=>value};window.CutCoachSearchLearning161={installLibraryHook(){}};window.CutCoachPortionProfiles153={};window.CutCoachSearchInputPerformance193={version:'test'};
  const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);await new Promise(resolve=>setTimeout(resolve,10));
  const input=window.document.querySelector('#nutritionSearch');input.value='Pizza';window.document.body.append(window.document.createElement('div'));await new Promise(resolve=>setTimeout(resolve,10));
  assert.equal(renders,0,'Eine normale Suche aktiviert erneut den alten Vollkatalog-Renderer.');assert.equal(window.CutCoachNutritionMultiSearch120.refresh(),false);assert.equal(renders,0);
  input.value='Pizza und Salat';assert.equal(window.CutCoachNutritionMultiSearch120.refresh(),true);assert.equal(renders,1,'Die echte Mehrfachsuche wurde abgeschaltet.');
  dom.window.close();console.log('Normale Worker-Suche bleibt frei vom alten Vollkatalog-Observer; Mehrfachsuche bleibt aktiv.');
})().catch(error=>{console.error(error);process.exitCode=1});
