'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const canonical=fs.readFileSync(path.join(root,'nutrition-multisearch-canonical-128.js'),'utf8');
const hardening=fs.readFileSync(path.join(root,'nutrition-search-confidence-hardening-v151.js'),'utf8');
const compatibility=fs.readFileSync(path.join(root,'nutrition-multisearch-120.js'),'utf8');
const manifest=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const items=[
{id:'personal-skyr',name:'Skyr',kind:'food',amount:500,unit:'g',calories:315,protein:55,carbs:20,fat:1,source:'user',favorite:true,uses:12},
{id:'personal-cola',name:'Cola',kind:'food',amount:500,unit:'ml',calories:210,protein:0,carbs:52,fat:0,source:'off',favorite:true,uses:8},
{id:'pudding-a',name:'Protein Pudding',kind:'food',amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'user'},
{id:'pudding-b',name:'Protein Pudding',kind:'food',amount:200,unit:'g',calories:190,protein:18,carbs:18,fat:5,source:'user'}];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
 const added=[];
 const dom=new JSDOM('<body data-nutrition-meal-type="Snack"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div class="nutrition-results"></div></body>',{url:'https://example.test/',runScripts:'dangerously',pretendToBeVisual:true});
 const w=dom.window;
 w.CutCoachLibrary={exportData:()=>({items}),addCatalogItemToDay:(item,options)=>{added.push({item,options});return{id:'meal'}}};
 w.CutCoachFoodCatalog={items:()=>[],get:()=>null};w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};w.render=()=>{};w.toast=()=>{};
 for(const source of [canonical,hardening]){const s=w.document.createElement('script');s.textContent=source;w.document.head.append(s)}
 w.CutCoachSearchConfidenceHardening151.attach(w.CutCoachIntelligentSearch128);
 const c=w.document.createElement('script');c.textContent=compatibility;w.document.head.append(c);
 const api=w.CutCoachIntelligentSearch128;
 assert.equal(api.version,'1.5.2-alpha');
 assert.equal(api.rowsFor('1 Skyr')[0].item.id,'personal-skyr');
 assert.equal(api.rowsFor('250 g Skyr')[0].factor,.5);
 assert.equal(api.rowsFor('500 ml Cola')[0].item.id,'personal-cola');
 const input=w.document.querySelector('#nutritionSearch');input.value='Haferflaken';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(240);
 let host=w.document.querySelector('#nutritionMultiSearch');assert.ok(host.querySelector('article.review'));assert.equal(host.querySelector('[data-canonical-all]').disabled,true);
 input.value='Protein Pudding';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(240);host=w.document.querySelector('#nutritionMultiSearch');
 const choices=host.querySelectorAll('[data-confidence-choice]');assert.equal(choices.length,2);choices[0].dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(added.length,0);assert.equal(host._canonicalRows[0].status,'matched');
 host.querySelector('[data-canonical-add]').dispatchEvent(new w.MouseEvent('click',{bubbles:true}));assert.equal(added.length,1);
 assert.equal(w.CutCoachNutritionMultiSearch120.resolve('Skyr').match.id,'personal-skyr');
 assert.match(manifest,/nutrition-search-confidence-hardening-v151\.js\?v=1\.5\.2-alpha/);assert.match(manifest,/nutrition-multisearch-120\.js\?v=1\.5\.0-compat/);
 dom.window.close();console.log('Confidence-Hardening mit Resolver 1.5.2: ok');
})().catch(error=>{console.error(error);process.exitCode=1});