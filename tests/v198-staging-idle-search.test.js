'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'staging/search-idle-v198.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'staging/loader.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const dom=new JSDOM('<!doctype html><body><input id="nutritionSearch"><div id="nutritionResults"></div><div class="cc-staging-badge">STAGING</div></body>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/staging/'});
  const w=dom.window;
  const script=w.document.createElement('script');script.textContent=source;w.document.head.append(script);w.document.dispatchEvent(new w.Event('DOMContentLoaded'));
  const input=w.document.querySelector('#nutritionSearch');let downstream=0,last='',mutations=0;
  w.addEventListener('input',event=>{if(event.target===input){downstream++;last=input.value}},true);
  assert.equal(w.CutCoachStagingSearchIdle198.idleMs,230);
  assert.equal(w.document.querySelector('.cc-staging-badge').textContent,'STAGING · SUCHE 230 MS');
  const observer=new w.MutationObserver(records=>mutations+=records.length);observer.observe(w.document.body,{attributes:true,childList:true,subtree:true});
  for(const value of ['s','sp','spa','spag','spagh','spaghe','spaghet','spaghett','spaghetti']){input.value=value;input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(55);assert.equal(downstream,0)}
  assert.equal(mutations,0,'Der Controller verändert während des Tippens das DOM.');observer.disconnect();
  await wait(260);assert.equal(downstream,1);assert.equal(last,'spaghetti');
  input.value='Pizza';input.dispatchEvent(new w.Event('input',{bubbles:true}));input.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(downstream,2);await wait(260);assert.equal(downstream,2);
  input.value='Spaghetti Bolognese, Pizza Margherita und eine Cola';input.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:input.value}));await wait(135);assert.equal(downstream,3);
  input.value='a';input.dispatchEvent(new w.Event('input',{bubbles:true}));await wait(260);assert.equal(downstream,3);
  assert.match(loader,/search-idle-v198\.js\?v=1\.9\.8-staging/);assert.doesNotMatch(runtime,/search-idle-v198/);
  dom.window.close();console.log('Staging-Suche wartet 230 ms ohne DOM-Arbeit und bleibt aus Produktion isoliert.');
})().then(()=>process.exit(0)).catch(error=>{console.error(error);process.exit(1)});
