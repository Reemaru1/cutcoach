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
  const dom=new JSDOM('<!doctype html><body><input id="nutritionSearch"></body>',{runScripts:'dangerously',pretendToBeVisual:true,url:'https://example.test/cutcoach/'});
  const {window}=dom;
  const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
  const input=window.document.querySelector('#nutritionSearch');
  let downstream=0,lastValue='';
  window.addEventListener('input',event=>{if(event.target===input){downstream++;lastValue=input.value}},true);

  for(const value of ['h','ha','hae','haeh','haehn','haehnc','haehnch','haehnche','haehnchen']){
    input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));
  }
  assert.equal(downstream,0,'Teure Folgesuche läuft weiterhin bei jedem Tastendruck.');
  assert.equal(window.CutCoachSearchInputPerformance193.stats().pending,true,'Eingabepause wird nicht abgewartet.');
  await wait(150);
  assert.equal(downstream,1,'Eine Tippserie erzeugt nicht exakt einen Suchlauf.');
  assert.equal(lastValue,'haehnchen','Der letzte Suchstand wird nicht verarbeitet.');
  assert.equal(window.CutCoachSearchInputPerformance193.stats().releaseCount,1);

  input.value='döne';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  input.value='döner';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await wait(40);
  assert.equal(downstream,1,'Debounce wird während des Tippens zu früh ausgelöst.');
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(downstream,2,'Enter übergibt den aktuellen Suchtext nicht sofort.');
  assert.equal(lastValue,'döner');
  await wait(140);
  assert.equal(downstream,2,'Nach Enter läuft ein alter Timer ein zweites Mal nach.');

  input.dataset.v192Bypass='1';input.value='Brot';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(downstream,3,'Gezielte interne Suchereignisse werden fälschlich verzögert.');
  delete input.dataset.v192Bypass;

  input.value='Steak';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  window.CutCoachSearchInputPerformance193.cancel();
  await wait(140);
  assert.equal(downstream,3,'Abgebrochene Suche wird dennoch ausgeführt.');

  assert.equal(window.CutCoachSearchInputPerformance193.version,'1.9.3-alpha');
  assert.match(loader,/script\.src='\.\/nutrition-search-input-performance-v193\.js\?v=1\.9\.3-alpha'[\s\S]*script\.onload=loadPolish/,'Performance-Schicht startet den Such-Polisher nicht erst nach erfolgreichem Laden.');
  assert.match(loader,/script\.onerror=loadPolish/,'Such-Polisher besitzt keinen sicheren Fallback bei einem Ladefehler.');
  assert.ok(runtime.indexOf('nutrition-search-input-performance-v193.js?v=1.9.3-alpha')<runtime.indexOf('nutrition-polish-v138.js?v=1.3.9-alpha'),'Offline-Manifest ordnet die Performance-Schicht nicht vor dem Interaktions-Hotfix ein.');
  assert.ok(sw.includes('search193-input-performance'),'Service-Worker-Cachegeneration wurde nicht erhöht.');
  assert.ok(sw.includes('search194-interaction-unlock'),'Interaktions-Hotfix fehlt nach der Eingabe-Performance-Schicht.');

  dom.window.close();
  console.log('Suchfeld verarbeitet Tippserien nur einmal und bleibt mit Interaktions-Hotfix korrekt.');
})().catch(error=>{console.error(error);process.exitCode=1});
