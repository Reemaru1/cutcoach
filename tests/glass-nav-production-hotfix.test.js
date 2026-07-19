'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const glass=fs.readFileSync(path.join(root,'glass-nav-v131.js'),'utf8');
const glassCss=fs.readFileSync(path.join(root,'glass-nav-v131.css'),'utf8');
const live=fs.readFileSync(path.join(root,'journal-live-nav-v127.js'),'utf8');
const smart=fs.readFileSync(path.join(root,'journal-smart-v740.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'version-v7.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');

const dom=new JSDOM(`<!doctype html><body><nav aria-label="Hauptnavigation"><button data-tab="today">Heute</button><button data-tab="progress">Fortschritt</button><button data-tab="settings">Einstellungen</button></nav></body>`,{
  url:'https://example.test/cutcoach/?date=2026-07-19#today',
  runScripts:'dangerously',
  pretendToBeVisual:true
});
const {window}=dom;
const script=window.document.createElement('script');
script.textContent=glass;
window.document.head.append(script);

assert.equal(window.CutCoachGlassNavV131.enhance(),true,'Glasnavigation lässt sich nicht auf dem produktiven DOM aktivieren.');
const nav=window.document.querySelector('nav[aria-label="Hauptnavigation"]');
assert.ok(nav.classList.contains('cc-glass-nav-v131'),'Glas-Klasse fehlt auf der Hauptnavigation.');
assert.equal(nav.querySelectorAll('[data-tab]').length,4,'Fehlender Ernährungsbutton wird nicht wiederhergestellt.');
const food=nav.querySelector('[data-tab="food"]');
assert.ok(food,'Ernährungsbutton fehlt weiterhin.');
assert.ok(food.querySelector('.cc-nav-icon'),'Zentraler Plus-Button besitzt kein Glas-Icon.');
assert.ok(nav.querySelector('[data-tab="today"] .cc-nav-label'),'Tagebuchbutton besitzt kein Glas-Markup.');
assert.equal(window.CutCoachGlassNavV131.enhance(),true,'Erneute Aktivierung muss idempotent möglich sein.');
assert.equal(nav.querySelectorAll('[data-tab="food"]').length,1,'Erneute Aktivierung erzeugt doppelte Ernährungsbuttons.');

food.click();
assert.equal(window.location.hash,'#food','Ernährungsbutton öffnet den Ernährungsbereich nicht.');
assert.ok(window.document.body.classList.contains('nutrition-mode'),'Ernährungsmodus wird beim Fallback nicht aktiviert.');
assert.equal(new URL(window.location.href).searchParams.get('date'),'2026-07-19','Ausgewähltes Datum geht beim Ernährungswechsel verloren.');

assert.match(glassCss,/width:min\(420px,calc\(100% - 24px\)\)!important/,'Glasnavigation übernimmt weiterhin die globale Vollbreite.');
assert.match(glassCss,/left:50%!important[\s\S]*transform:translateX\(-50%\)!important/,'Glasnavigation wird nicht stabil im Viewport zentriert.');
assert.match(glassCss,/font-size:0!important/,'Vererbte globale Navigationsschrift wird nicht neutralisiert.');
assert.match(glassCss,/\.cc-nav-label\{[\s\S]*font-size:10px!important/,'Navigationslabels besitzen keine feste kompakte Größe.');
assert.match(glassCss,/button\[data-tab="food"\]\{[\s\S]*width:48px!important[\s\S]*height:48px!important/,'Zentraler Plusbutton bleibt zu groß.');
assert.match(glassCss,/-webkit-text-size-adjust:100%!important/,'iOS-Schriftvergrößerung ist für die Navigation nicht kontrolliert.');
assert.match(glassCss,/@media\(max-width:390px\)[\s\S]*font-size:9\.5px!important/,'Kleine iPhones besitzen keine eigene kompakte Skalierung.');

assert.ok(live.includes("nav.dataset.glassNavV131==='1'||nav.classList.contains('cc-glass-nav-v131')"),'Live-Journal überschreibt die Glasnavigation weiterhin.');
assert.ok(live.includes('window.CutCoachGlassNavV131?.enhance?.()'),'Live-Journal stellt die Glasnavigation nicht erneut sicher.');
assert.ok(smart.includes("journal-live-nav-v127.js?v=1.3.2-alpha"),'Smart-Journal lädt nicht die reparierte Live-Navigation.');
assert.ok(loader.includes("glass-nav-v131.js?v=1.3.2-alpha"),'Versionsloader lädt nicht die reparierte Glasnavigation.');
assert.ok(loader.includes("glass-nav-v131.css?v=1.3.3-alpha"),'Versionsloader lädt nicht die kompakte Glasnavigation.');
assert.ok(runtime.includes("version:'1.2.6-alpha'"),'Bestehender Runtimevertrag wurde unerwartet verändert.');
assert.ok(runtime.includes("journal-live-nav-v127.js?v=1.3.2-alpha"),'Runtime-Manifest enthält nicht die reparierte Live-Navigation.');
assert.ok(runtime.includes("glass-nav-v131.js?v=1.3.2-alpha"),'Runtime-Manifest enthält nicht die reparierte Glasnavigation.');
assert.ok(runtime.includes("glass-nav-v131.css?v=1.3.3-alpha"),'Runtime-Manifest enthält nicht die kompakte Navigations-CSS.');
assert.ok(sw.includes("runtime-manifest.js?v=1.2.6-alpha"),'Service Worker lädt nicht das bestehende Runtime-Manifest.');
assert.ok(sw.includes("-nav133`"),'Service Worker verwendet nicht die neue Größen-Hotfix-Cachegeneration.');

dom.window.close();
console.log('Produktive kompakte Vierer-Glasnavigation und Cachegeneration geprüft.');