'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const cleanHtml=()=>read('staging/body-progress-v2.html').replace(/<link[^>]+>/g,'').replace(/<script[^>]*><\/script>/g,'');

async function boot(state){
  const dom=new JSDOM(cleanHtml(),{url:'https://example.test/cutcoach/staging/body-progress-v2.html',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  if(state!==undefined)w.localStorage.setItem('cutcoach_v2',JSON.stringify(state));
  let writes=0;
  const originalSet=w.localStorage.setItem.bind(w.localStorage);
  w.localStorage.setItem=(...args)=>{writes++;return originalSet(...args)};
  const script=w.document.createElement('script');
  script.textContent=read('staging/body-progress-v2.js');
  w.document.head.append(script);
  if(w.document.readyState==='loading')w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  await wait(35);
  return {dom,w,writes:()=>writes};
}

(async()=>{
  const state={settings:{calories:2300,maintenance:3000,protein:190,steps:6000,gymGoal:5,goalWeight:90},days:{
    '2026-07-20':{weight:97,steps:6500,gym:true,meals:[{calories:2250,protein:192}]},
    '2026-07-21':{weight:96.5,steps:6100,gym:false,meals:[{calories:2290,protein:184}]},
    '2026-07-22':{weight:96,steps:7200,gym:true,meals:[{calories:2180,protein:201}]}
  }};
  const first=await boot(state),w=first.w;
  assert.equal(first.writes(),0,'Die Vorschau darf keine CutCoach-Daten schreiben.');
  assert.equal(w.document.querySelectorAll('.bpv2-bottom-nav > button').length,4,'Die Vorschau-Navigation muss vier Bereiche besitzen.');
  assert.equal(w.document.querySelector('.bpv2-app').dataset.mode,'body');
  assert.equal(w.document.querySelector('#bpv2TrainingFigure').hidden,true);
  assert.equal(w.document.querySelector('#bpv2BodyFigure').style.display,'block');
  assert.equal(w.document.querySelector('#bpv2TrainingFigure').style.display,'none');
  assert.equal(w.document.querySelectorAll('.bpv2-figure-stage img:not([hidden])').length,1,'Es darf nur eine Körperfigur sichtbar sein.');
  w.document.querySelector('[data-mode="training"]').click();await wait(20);
  assert.equal(w.document.querySelector('.bpv2-app').dataset.mode,'training');
  assert.equal(w.document.querySelector('#bpv2BodyFigure').hidden,true);
  assert.equal(w.document.querySelector('#bpv2TrainingFigure').hidden,false);
  assert.equal(w.document.querySelector('#bpv2BodyFigure').style.display,'none');
  assert.equal(w.document.querySelector('#bpv2TrainingFigure').style.display,'block');
  assert.equal(w.document.querySelectorAll('.bpv2-figure-stage img:not([hidden])').length,1,'Auch im Trainingsmodus darf nur eine Figur sichtbar sein.');
  assert.match(w.document.querySelector('#insightTitle').textContent,/Trainingsrhythmus|Trainingseinheiten/);
  first.dom.window.close();

  const empty=await boot({settings:{goalWeight:null},days:{}});
  assert.equal(empty.w.document.querySelector('#bpv2DataSource').textContent,'Design-Demo','Eine leere Browser-Storage muss eine gefüllte Design-Demo anzeigen.');
  assert.notEqual(empty.w.document.querySelector('#rightCard2Value').textContent,'0,0 kg','Ein fehlendes Zielgewicht darf niemals als 0,0 kg erscheinen.');
  empty.dom.window.close();

  const css=read('staging/body-progress-v2.css');
  const fixCss=read('staging/body-progress-v2-mobile-fix.css');
  const html=read('staging/body-progress-v2.html');
  assert.match(css,/grid-template-columns:94px minmax\(0,1fr\) 94px/,'Das iPhone-Layout braucht eine kontrollierte dreispaltige Hero-Komposition.');
  assert.match(fixCss,/\[hidden\]\{display:none!important\}/,'Das Hidden-Attribut muss gegen globale Bildregeln abgesichert sein.');
  assert.match(fixCss,/@media \(display-mode:browser\)/,'Die Vorschau muss Browser-Chrome ohne überlagerte Fixed-Navigation berücksichtigen.');
  assert.match(html,/body-progress-v2-mobile-fix\.css\?v=2/);
  assert.equal((html.match(/<img id="bpv2(?:Body|Training)Figure"/g)||[]).length,2);
  assert.doesNotMatch(css,/overflow\s*:\s*hidden[^}]*body/,'Die Seite darf nicht global am Scrollen gehindert werden.');
  for(const asset of ['staging/body-male-v2.svg','staging/training-male-v2.svg']){
    const svg=read(asset);assert.match(svg,/viewBox="0 0 600 1100"/);assert.doesNotMatch(svg,/<rect[^>]+(?:fill="#0|fill="black)/i,'Die Körpergrafik darf keinen eingebrannten dunklen Hintergrund besitzen.');
  }
  assert.doesNotMatch(read('staging/body-progress-v2.js'),/localStorage\.setItem|commitState|saveState/,'Die Vorschau-Logik muss strikt read-only bleiben.');
  console.log('Body Progress V2 Staging: einzelne Figur, Demo-Fallback, Nullziel-Schutz, mobile Navigation und Read-only-Daten geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
