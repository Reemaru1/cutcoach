'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  const dom=new JSDOM(`<!doctype html><html><head><link rel="stylesheet" data-glass-nav-v131="1" href="./glass-nav-v131.css?v=1.3.6-alpha"></head><body>
    <nav aria-label="Hauptnavigation">
      <button data-tab="today" class="active"></button>
      <button data-tab="progress"></button>
      <button data-tab="settings"></button>
    </nav>
  </body></html>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const {window}=dom,script=window.document.createElement('script');
  script.textContent=read('glass-nav-v131.js');window.document.head.append(script);
  if(window.document.readyState==='loading')window.document.dispatchEvent(new window.Event('DOMContentLoaded'));
  await wait(30);

  const api=window.CutCoachGlassNavV131;
  assert.ok(api,'Die produktive Navigationsruntime wurde nicht gestartet.');
  assert.equal(api.version,'1.3.3-alpha');
  assert.ok(window.document.querySelector('nav').classList.contains('cc-glass-nav-v131'));
  assert.ok(window.document.querySelector('[data-tab="food"]'),'Der zentrale Ernährungsbutton fehlt.');

  const legacy=window.document.querySelector('link[data-glass-nav-v131]');
  const consistency=window.document.querySelector('link[data-nutrition-ui-consistency-v206]');
  const liquid=window.document.querySelector('link[data-liquid-glass-ui-v207]');
  const consistencyScript=window.document.querySelector('script[data-nutrition-ui-consistency-v206]');
  assert.ok(consistency,'Die Berechnungs- und Modal-Schicht wird in Produktion nicht geladen.');
  assert.ok(liquid,'Die Liquid-Glass-Schicht wird in Produktion nicht geladen.');
  assert.ok(consistencyScript,'Die zentrale Ernährungsberechnung wird in Produktion nicht ausgeführt.');
  assert.match(consistency.href,/nutrition-ui-consistency-v206\.css\?v=2\.0\.8-loader$/);
  assert.match(liquid.href,/liquid-glass-ui-v207\.css\?v=2\.0\.8-loader$/);
  assert.match(consistencyScript.src,/nutrition-ui-consistency-v206\.js\?v=2\.0\.8-loader$/);
  assert.ok(legacy.compareDocumentPosition(liquid)&window.Node.DOCUMENT_POSITION_FOLLOWING,'Die Liquid-Glass-Regeln müssen nach dem alten Navigationsstil geladen werden.');

  const runtime=read('runtime-manifest.js'),sw=read('sw.js'),css=read('liquid-glass-ui-v207.css');
  assert.match(runtime,/version:'1\.2\.7-alpha'/);
  assert.match(runtime,/glass-nav-v131\.js\?v=1\.3\.3-alpha/);
  assert.match(runtime,/liquid-glass-ui-v207\.css\?v=2\.0\.8-loader/);
  assert.match(runtime,/nutrition-ui-consistency-v206\.js\?v=2\.0\.8-loader/);
  assert.match(sw,/runtime-manifest\.js\?v=1\.2\.8-loader/);
  assert.match(sw,/ui208-production-loader/);
  assert.match(css,/#journalMacroClose/);
  assert.match(css,/backdrop-filter:blur\(34px\)/);

  dom.window.close();
  console.log('Produktionsloader 2.0.8: Berechnungs-, Modal- und Liquid-Glass-Schichten werden tatsächlich nach dem Legacy-Stil geladen.');
})().catch(error=>{console.error(error);process.exitCode=1});