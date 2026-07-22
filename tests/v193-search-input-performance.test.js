'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'nutrition-search-input-performance-v193.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
(async()=>{
  const dom=new JSDOM('<!doctype html><body class="nutrition-mode"><section class="nutrition-shell"><div class="nutrition-search-card"><input id="nutritionSearch" type="search" enterkeyhint="search"></div><div id="nutritionMultiSearch"></div><div class="nutrition-results"></div></section></body>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});
  const {window}=dom,input=dom.window.document.querySelector('#nutritionSearch');
  const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
  let downstream=0,lastValue='',mutations=0;
  window.addEventListener('input',event=>{if(event.target===input){downstream++;lastValue=input.value}},true);
  const observer=new window.MutationObserver(records=>mutations+=records.length);observer.observe(window.document.body,{attributes:true,childList:true,subtree:true});
  input.focus();
  for(const value of ['h','ha','hae','haeh','haehn','haehnc','haehnch','haehnche','haehnchen']){input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));await wait(35);assert.equal(downstream,0,'Teure Folgesuche läuft während der Tippserie.');}
  assert.equal(mutations,0,'Der Suchcontroller verändert während des Tippens das DOM.');
  assert.equal(window.CutCoachSearchInputPerformance193.stats().pending,true,'Die 320-ms-Ruhephase wird nicht abgewartet.');observer.disconnect();
  await wait(350);assert.equal(downstream,1);assert.equal(lastValue,'haehnchen');assert.equal(window.document.activeElement,input,'Automatische Suche schließt die Tastatur unerwartet.');

  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true,cancelable:true}));
  assert.equal(downstream,1,'Die Tastaturlupe startet nach bereits fertiger Autosuche einen doppelten Suchlauf.');
  assert.notEqual(window.document.activeElement,input,'Die Tastaturlupe schließt die iPhone-Tastatur nicht.');
  await wait(260);assert.equal(downstream,1,'Nach der Tastaturlupe läuft ein alter Timer nach.');

  input.focus();input.value='döner';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',keyCode:13,bubbles:true,cancelable:true}));
  assert.equal(downstream,2,'Die Tastaturlupe löst eine noch wartende Suche nicht sofort aus.');assert.equal(lastValue,'döner');assert.notEqual(window.document.activeElement,input);
  input.dispatchEvent(new window.Event('search',{bubbles:true,cancelable:true}));
  assert.equal(downstream,2,'iOS keydown plus search erzeugt zwei Suchläufe.');await wait(260);assert.equal(downstream,2);

  input.focus();input.value='schwarztee';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  input.dispatchEvent(new window.Event('search',{bubbles:true,cancelable:true}));
  assert.equal(downstream,3,'Ein natives iOS-search-Ereignis löst die aktuelle Suche nicht aus.');assert.equal(lastValue,'schwarztee');assert.notEqual(window.document.activeElement,input,'Das native search-Ereignis lässt die Tastatur offen.');await wait(260);assert.equal(downstream,3);

  input.dataset.v192Bypass='1';input.value='Brot';input.dispatchEvent(new window.Event('input',{bubbles:true}));assert.equal(downstream,4);delete input.dataset.v192Bypass;
  input.value='Spaghetti Bolognese';const paste=typeof window.InputEvent==='function'?new window.InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:input.value}):new window.Event('input',{bubbles:true});input.dispatchEvent(paste);await wait(135);assert.equal(downstream,5);
  input.value='Steak';input.dispatchEvent(new window.Event('input',{bubbles:true}));window.CutCoachSearchInputPerformance193.cancel();await wait(260);assert.equal(downstream,5);

  const api=window.CutCoachSearchInputPerformance193,stats=api.stats();
  assert.equal(api.version,'2.0.0-alpha');assert.equal(api.idleMs,320);assert.equal(api.pasteMs,90);assert.deepEqual({...api.debounceRange},{min:320,max:320});assert.equal(api.shortQueryLength,2);
  assert.ok(stats.commitCount>=3,'Suchbestätigungen werden nicht erfasst.');assert.ok(stats.keyboardDismissCount>=3,'Die Tastatur wurde bei Suchbestätigungen nicht geschlossen.');assert.equal(stats.typing,false);assert.equal(stats.noticeCount,0);
  assert.match(loader,/nutrition-search-input-performance-v193\.js\?v=2\.0\.0-alpha/);assert.ok(runtime.indexOf('nutrition-search-input-performance-v193.js?v=2.0.0-alpha')<runtime.indexOf('nutrition-polish-v138.js?v=1.3.11-alpha'));
  assert.ok(sw.includes('search198-idle-live'));assert.ok(sw.includes('search199-ios-keyboard'));
  dom.window.close();console.log('320-ms-Autosuche und iOS-Tastaturlupe funktionieren ohne Doppelsuche; die Tastatur schließt zuverlässig.');
  setImmediate(()=>process.exit(0));
})().catch(error=>{console.error(error);setImmediate(()=>process.exit(1))});
