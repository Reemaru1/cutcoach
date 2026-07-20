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
  let downstream=0,lastValue='',pendingNotices=0;
  window.addEventListener('input',event=>{if(event.target===input){downstream++;lastValue=input.value}},true);
  window.addEventListener('cutcoach:search-input-pending',()=>pendingNotices++);

  assert.ok(window.document.querySelector('style[data-search-typing-performance-v197]'),'Die iPhone-Tippentlastung wird nicht installiert.');
  assert.match(window.document.querySelector('style[data-search-typing-performance-v197]').textContent,/cutcoach-search-typing/,'Der visuelle Tippmodus fehlt.');

  for(const value of ['h','ha','hae','haeh','haehn','haehnc','haehnch','haehnche','haehnchen']){
    input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));
  }
  assert.equal(downstream,0,'Teure Folgesuche läuft weiterhin bei jedem Tastendruck.');
  assert.equal(window.CutCoachSearchInputPerformance193.stats().pending,true,'Eingabepause wird nicht abgewartet.');
  assert.equal(window.document.body.classList.contains('cutcoach-search-typing'),true,'Der Tippmodus wird während der Eingabe nicht aktiviert.');
  await wait(1050);
  assert.equal(downstream,1,'Eine schnelle Tippserie erzeugt nicht exakt einen Suchlauf.');
  assert.equal(lastValue,'haehnchen','Der letzte Suchstand wird nicht verarbeitet.');
  assert.equal(window.document.body.classList.contains('cutcoach-search-typing'),false,'Der Tippmodus bleibt nach dem Suchlauf aktiv.');
  assert.ok(pendingNotices<9,'Pending-UI-Arbeit wird nicht pro Frame gebündelt.');

  for(const value of ['s','sk','sky','skyr']){
    input.value=value;input.dispatchEvent(new window.Event('input',{bubbles:true}));
    await wait(430);
    assert.equal(downstream,1,'Langsames iPhone-Tippen startet zwischen zwei Buchstaben eine Vollkatalogsuche.');
  }
  await wait(950);
  assert.equal(downstream,2,'Die langsame Tippserie wird nach der echten Eingabepause nicht genau einmal verarbeitet.');
  assert.equal(lastValue,'skyr');

  input.value='a';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  await wait(950);
  assert.equal(downstream,2,'Ein einzelner Buchstabe startet eine unnötig breite Katalogsuche.');
  assert.equal(window.document.body.classList.contains('cutcoach-search-typing'),false,'Kurze Suchtexte lassen den Tippmodus hängen.');

  input.value='döner';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  input.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
  assert.equal(downstream,3,'Enter übergibt den aktuellen Suchtext nicht sofort.');
  assert.equal(lastValue,'döner');
  await wait(950);
  assert.equal(downstream,3,'Nach Enter läuft ein alter Timer ein zweites Mal nach.');

  input.dataset.v192Bypass='1';input.value='Brot';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  assert.equal(downstream,4,'Gezielte interne Suchereignisse werden fälschlich verzögert.');
  delete input.dataset.v192Bypass;

  input.value='Spaghetti Bolognese';
  const pasteEvent=typeof window.InputEvent==='function'?new window.InputEvent('input',{bubbles:true,inputType:'insertFromPaste',data:'Spaghetti Bolognese'}):new window.Event('input',{bubbles:true});
  input.dispatchEvent(pasteEvent);await wait(180);
  assert.equal(downstream,5,'Eingefügter Text wird unnötig lange verzögert.');

  input.value='Steak';input.dispatchEvent(new window.Event('input',{bubbles:true}));
  window.CutCoachSearchInputPerformance193.cancel();
  await wait(950);
  assert.equal(downstream,5,'Abgebrochene Suche wird dennoch ausgeführt.');

  const stats=window.CutCoachSearchInputPerformance193.stats();
  assert.equal(window.CutCoachSearchInputPerformance193.version,'1.9.7-alpha');
  assert.deepEqual({...window.CutCoachSearchInputPerformance193.debounceRange},{min:560,max:900});
  assert.equal(window.CutCoachSearchInputPerformance193.shortQueryLength,2);
  assert.ok(stats.lastDelay>=90&&stats.lastDelay<=900);
  assert.ok(stats.typingBursts>=4,'Tippserien werden nicht als zusammenhängende Lastphasen erkannt.');
  assert.match(loader,/nutrition-search-input-performance-v193\.js\?v=1\.9\.7-alpha/,'Versionsloader lädt nicht die neue Tipp-Performance-Schicht.');
  assert.ok(runtime.indexOf('nutrition-search-input-performance-v193.js?v=1.9.7-alpha')<runtime.indexOf('nutrition-polish-v138.js?v=1.3.11-alpha'),'Offline-Manifest ordnet die Tippentlastung nicht vor der finalen Suchdarstellung ein.');
  assert.ok(sw.includes('search196-article-sequence'),'Service-Worker-Cachegeneration enthält den Artikel-/Sequenzschutz nicht.');
  assert.ok(sw.includes('search197-typing-performance'),'Service-Worker-Cachegeneration enthält die neue Tipp-Performance nicht.');

  dom.window.close();
  console.log('iPhone-Tippen bleibt bei schnellen und langsamen Tippserien frei; Suche startet erst nach echter Pause oder Enter.');
})().catch(error=>{console.error(error);process.exitCode=1});