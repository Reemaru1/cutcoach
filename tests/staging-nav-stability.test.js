'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const source=fs.readFileSync(path.resolve(__dirname,'..','staging-v2','staging-nav.js'),'utf8');
const dom=new JSDOM(`<!doctype html><body>
  <nav aria-label="Hauptnavigation">
    <button data-tab="today"></button>
    <button data-tab="progress"></button>
    <button data-tab="food"></button>
    <button data-tab="settings"></button>
  </nav>
</body>`,{runScripts:'dangerously',url:'https://example.test/staging-v2/'});

const NativeMutationObserver=dom.window.MutationObserver;
let observerRuns=0;
dom.window.MutationObserver=class extends NativeMutationObserver{
  constructor(callback){
    super(records=>{
      observerRuns+=1;
      assert.ok(observerRuns<10,'Staging-Navigation steckt in einer MutationObserver-Schleife.');
      callback(records);
    });
  }
};

dom.window.eval(source);
dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));

const settle=()=>new Promise(resolve=>dom.window.setTimeout(resolve,0));

(async()=>{
  await settle();
  await settle();

  const nav=dom.window.document.querySelector('nav');
  assert.equal(nav.querySelectorAll('.cc-nav-icon').length,4,'Staging-Dock wurde nicht vollständig aufgebaut.');
  const stableMarkup=nav.innerHTML;
  const runsAfterSetup=observerRuns;

  dom.window.document.body.appendChild(dom.window.document.createElement('div'));
  await settle();
  await settle();

  assert.equal(nav.innerHTML,stableMarkup,'Ein fremdes DOM-Update baut das Staging-Dock unnötig neu.');
  assert.ok(observerRuns<=runsAfterSetup+1,'Staging-Navigation reagiert mehrfach auf dieselbe DOM-Änderung.');
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));
  await settle();
  dom.window.close();
  console.log('Staging-Navigation bleibt nach DOM-Änderungen idempotent und beendet ihre Observer-Runde.');
})().catch(error=>{
  dom.window.close();
  console.error(error);
  process.exitCode=1;
});
