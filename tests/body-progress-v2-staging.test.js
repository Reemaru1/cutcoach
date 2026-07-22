'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const html=read('staging/body-progress-v2.html').replace(/<link[^>]+>/g,'').replace(/<script[^>]*><\/script>/g,'');
  const dom=new JSDOM(html,{url:'https://example.test/cutcoach/staging/body-progress-v2.html',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  const state={settings:{calories:2300,maintenance:3000,protein:190,steps:6000,gymGoal:5,goalWeight:90},days:{
    '2026-07-20':{weight:97,steps:6500,gym:true,meals:[{calories:2250,protein:192}]},
    '2026-07-21':{weight:96.5,steps:6100,gym:false,meals:[{calories:2290,protein:184}]},
    '2026-07-22':{weight:96,steps:7200,gym:true,meals:[{calories:2180,protein:201}]}
  }};
  w.localStorage.setItem('cutcoach_v2',JSON.stringify(state));
  let writes=0;const originalSet=w.localStorage.setItem.bind(w.localStorage);w.localStorage.setItem=(...args)=>{writes++;return originalSet(...args)};
  const script=w.document.createElement('script');script.textContent=read('staging/body-progress-v2.js');w.document.head.append(script);
  if(w.document.readyState==='loading')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await wait(30);
  assert.equal(writes,0,'Die Vorschau darf keine CutCoach-Daten schreiben.');
  assert.equal(w.document.querySelectorAll('.bpv2-bottom-nav > button').length,4,'Die Vorschau-Navigation muss vier Bereiche besitzen.');
  assert.equal(w.document.querySelector('.bpv2-app').dataset.mode,'body');
  assert.equal(w.document.querySelector('#bpv2TrainingFigure').hidden,true);
  w.document.querySelector('[data-mode="training"]').click();await wait(20);
  assert.equal(w.document.querySelector('.bpv2-app').dataset.mode,'training');
  assert.equal(w.document.querySelector('#bpv2BodyFigure').hidden,true);
  assert.equal(w.document.querySelector('#bpv2TrainingFigure').hidden,false);
  assert.match(w.document.querySelector('#insightTitle').textContent,/Trainingsrhythmus|Trainingseinheiten/);
  const css=read('staging/body-progress-v2.css');
  assert.match(css,/grid-template-columns:94px minmax\(0,1fr\) 94px/,'Das iPhone-Layout braucht eine kontrollierte dreispaltige Hero-Komposition.');
  assert.doesNotMatch(css,/overflow\s*:\s*hidden[^}]*body/,'Die Seite darf nicht global am Scrollen gehindert werden.');
  for(const asset of ['staging/body-male-v2.svg','staging/training-male-v2.svg']){
    const svg=read(asset);assert.match(svg,/viewBox="0 0 600 1100"/);assert.doesNotMatch(svg,/<rect[^>]+(?:fill="#0|fill="black)/i,'Die Körpergrafik darf keinen eingebrannten dunklen Hintergrund besitzen.');
  }
  assert.doesNotMatch(read('staging/body-progress-v2.js'),/localStorage\.setItem|commitState|saveState/,'Die Vorschau-Logik muss strikt read-only bleiben.');
  dom.window.close();console.log('Body Progress V2 Staging: read-only Daten, interner Moduswechsel, responsive Komposition und transparente Vektorassets geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});