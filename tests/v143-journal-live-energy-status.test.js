'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'journal-energy-live-v143.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

(async()=>{
  const dom=new JSDOM(`<!doctype html><body>
    <main id="today560">
      <section class="journal-energy-card">
        <div class="journal-energy-grid"><strong id="journalConsumed">0 kcal</strong></div>
        <div id="journalEnergyStatus"><strong id="journalEnergyStatusLabel">Noch keine Mahlzeit</strong></div>
      </section>
    </main>
  </body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const {window}=dom;
  let renders=0,baseRenders=0;
  window.CutCoachJournalV72={render:()=>{renders++}};
  window.render=()=>{baseRenders++};
  const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);

  await wait(40);
  assert.equal(window.CutCoachJournalEnergyLive143.version,'1.4.3-alpha');
  assert.ok(renders>=1,'Der Tageskurs wird beim Start nicht synchronisiert.');

  renders=0;
  window.render();
  await wait(40);
  assert.equal(baseRenders,1,'Der bestehende Hauptrender wird nicht beibehalten.');
  assert.ok(renders>=1,'Ein normaler App-Render aktualisiert den Tageskurs nicht.');

  renders=0;
  window.document.querySelector('#journalConsumed').textContent='711 kcal';
  await wait(40);
  assert.ok(renders>=1,'Geänderte Mahlzeiten-/Kalorienwerte lösen keinen Live-Refresh aus.');

  renders=0;
  window.dispatchEvent(new window.CustomEvent('cutcoach:librarychange'));
  await wait(40);
  assert.ok(renders>=1,'Eine erfolgreiche Bibliotheksänderung aktualisiert den Tageskurs nicht.');

  renders=0;
  window.document.querySelector('#journalEnergyStatusLabel').textContent='Noch sinnvoller Spielraum';
  await wait(40);
  assert.equal(renders,0,'Eigene Statusänderungen erzeugen eine Render-Schleife.');

  assert.ok(loader.includes("journal-energy-live-v143.js?v=1.4.3-alpha"),'Der Versionsloader lädt den Live-Fix nicht.');
  assert.ok(runtime.includes("journal-energy-live-v143.js?v=1.4.3-alpha"),'Das Offline-Manifest enthält den Live-Fix nicht.');
  assert.ok(sw.includes('`${IDLE_CACHE}-energy143`'),'Die Cachegeneration für Tageskurs und 230-ms-Suche ist nicht verkettet.');
  assert.ok(sw.includes('search170-exact-whole'),'Stufe-5-Vollnamen-Cachegeneration fehlt.');
  assert.ok(sw.includes('search171-edge-hardening'),'Stufe-5-Randfall-Cachegeneration fehlt.');
  assert.ok(sw.includes('stage6-production180'),'Stufe-6-Cachegeneration fehlt.');
  assert.ok(sw.includes('search190-integrity'),'A–Z-Suchintegritäts-Cachegeneration fehlt.');
  assert.ok(sw.includes('catalog191-expansion'),'Katalogerweiterungs-Cachegeneration fehlt.');
  assert.ok(sw.includes('search192-ui-overhaul'),'Such-UI-Cachegeneration fehlt.');
  assert.ok(sw.includes('search193-input-performance'),'Eingabe-Performance-Cachegeneration fehlt.');
  assert.ok(sw.includes('search194-interaction-unlock'),'Interaktions-Hotfix fehlt.');
  assert.ok(sw.includes('search195-stability'),'Suchstabilitätsgeneration fehlt.');
  assert.ok(sw.includes('search196-article-sequence'),'Artikel- und Sequenzgeneration fehlt.');
  assert.ok(sw.includes('search197-typing-performance'),'Tipp-Performance-Generation fehlt.');
  assert.ok(sw.includes('search198-idle-live'),'230-ms-Live-Generation fehlt vor dem Tageskurs-Cache.');

  dom.window.close();
  console.log('Tageskurs, Suchintegrität und 230-ms-Suche sind ohne Render-Schleifen korrekt verkettet.');
})().catch(error=>{console.error(error);process.exitCode=1});
