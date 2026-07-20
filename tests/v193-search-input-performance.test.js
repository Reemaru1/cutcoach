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
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

(async()=>{
  const dom=new JSDOM('<!doctype html><body class="nutrition-mode"><section class="nutrition-shell"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionMultiSearch"></div><div class="nutrition-results"></div></section></body>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});
  const {window}=dom;
  const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
  const input=window.document.querySelector('#nutritionSearch');
  let downstream=0,lastValue='',mutations=0;
  window.addEventListener('input',event=>{if(event.target===input){downstream++;lastValue=input.value}},true);
  const observer=new window.MutationObserver(records=>mutations+=records.length);
  observer.observe(window.document.body,{attributes:true,childList:true,subtree:true});

  for(const value of ['h','ha','hae','haeh','haehn','haehnc','haehnch','haehnche','haehnchen']){
    input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));await wait(35);
    assert.equal(downstream,0,'Teure Folgesuche läuft weiterhin während der Tippserie.');
  }
  assert.equal(mutations,0,'Der Suchcontroller verändert während des Tippens das DOM.');
  assert.equal(window.CutCoachSearchInputPerformance193.stats().pending,true,'Die 230-ms-Ruhephase wird nicht abgewartet.');
  observer.disconnect();
  await wait(260);
  assert.equal(downstream,1,'Eine Tippserie erzeugt nach 230 ms nicht exakt einen Suchlauf.');
  assert.equal(lastValue,'haehnchen','Der letzte Suchstand wird nicht verarbeitet.');

  input.value='a';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await wait(260);
  assert.equal(downstream,1,'Ein einzelner Buchstabe startet eine unnötig breite Katalogsuche.');

  input.value='döner';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(downstream,2,'Enter übergibt den aktuellen Suchtext nicht sofort.');
  assert.equal(lastValue,'döner');
  await wait(260);
  assert.equal(downstream,2,'Nach Enter läuft ein alter Timer ein zweites Mal nach.');

  input.dataset.v192Bypass='1';input.value='Brot';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(downstream,3,'Gezielte interne Suchereignisse werden fälschlich verzögert.');
  delete input.dataset.v192Bypass;

  input.value='Spaghetti Bolognese';
  const pasteEvent=typeof window.InputEvent==='function'?new window.InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:'Spaghetti Bolognese'}):new window.Event('input',{bubbles:true});
  input.dispatchEvent(pasteEvent);await wait(135);
  assert.equal(downstream,4,'Eingefügter Text wird unnötig lange verzögert.');

  input.value='Steak';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  window.CutCoachSearchInputPerformance193.cancel();
  await wait(260);
  assert.equal(downstream,4,'Abgebrochene Suche wird dennoch ausgeführt.');

  const api=window.CutCoachSearchInputPerformance193,stats=api.stats();
  assert.equal(api.version,'1.9.8-alpha');
  assert.equal(api.idleMs,230);
  assert.equal(api.pasteMs,110);
  assert.deepEqual({...api.debounceRange},{min:230,max:230});
  assert.equal(api.shortQueryLength,2);
  assert.equal(stats.typing,false);
  assert.equal(stats.noticeCount,0);
  assert.match(loader,/nutrition-search-input-performance-v193\.js\?v=1\.9\.8-alpha/,'Versionsloader lädt nicht die 230-ms-Schicht.');
  assert.ok(runtime.indexOf('nutrition-search-input-performance-v193.js?v=1.9.8-alpha')<runtime.indexOf('nutrition-polish-v138.js?v=1.3.11-alpha'),'Offline-Manifest ordnet den Tippcontroller nicht vor der Suchdarstellung ein.');
  assert.ok(sw.includes('search197-typing-performance'),'Vorherige Tipp-Performancegeneration fehlt.');
  assert.ok(sw.includes('search198-idle-live'),'Service Worker enthält die 230-ms-Live-Generation nicht.');

  dom.window.close();
  console.log('Live-Suche wartet 230 ms ohne DOM-Arbeit und startet danach genau einmal.');
  setImmediate(()=>process.exit(0));
})().catch(error=>{console.error(error);setImmediate(()=>process.exit(1))});
