'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const glass=fs.readFileSync(path.join(root,'glass-nav-v131.js'),'utf8');
const glassCss=fs.readFileSync(path.join(root,'glass-nav-v131.css'),'utf8');
const bootCss=fs.readFileSync(path.join(root,'upgrade-360.css'),'utf8');
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
assert.ok(window.document.body.classList.contains('cc-glass-nav-active'),'Navigation wird nach erfolgreichem Aufbau nicht sichtbar geschaltet.');
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

assert.match(bootCss,/body:not\(\.cc-glass-nav-active\)>nav\[aria-label="Hauptnavigation"\][\s\S]*visibility:hidden!important/,'Alte Navigation wird beim Start weiterhin kurz sichtbar.');
assert.match(glassCss,/width:min\(392px,calc\(100% - 16px\)\)!important/,'Glasnavigation ist weiterhin unnötig breit.');
assert.match(glassCss,/height:52px!important[\s\S]*max-height:52px!important/,'Navigationsleiste wurde vertikal nicht eng begrenzt.');
assert.match(glassCss,/bottom:max\(2px,calc\(env\(safe-area-inset-bottom\) - 10px\)\)!important/,'Unterer Leerraum der Navigation wurde nicht reduziert.');
assert.match(glassCss,/padding:2px!important[\s\S]*align-content:center!important/,'Oberer und unterer Innenabstand bleibt zu groß.');
assert.match(glassCss,/left:50%!important[\s\S]*transform:translateX\(-50%\)!important/,'Glasnavigation wird nicht stabil im Viewport zentriert.');
assert.match(glassCss,/font-size:0!important/,'Vererbte globale Navigationsschrift wird nicht neutralisiert.');
assert.match(glassCss,/\.cc-nav-label\{[\s\S]*font-size:9px!important/,'Navigationslabels besitzen keine kompakte feste Größe.');
assert.match(glassCss,/button\[data-tab="food"\]\{[\s\S]*width:40px!important[\s\S]*height:40px!important/,'Zentraler Plusbutton bleibt zu groß.');
assert.match(glassCss,/body\.cc-glass-nav-active\{padding-bottom:calc\(62px \+ env\(safe-area-inset-bottom\)\)!important\}/,'Unter dem App-Inhalt wird weiterhin zu viel Platz reserviert.');
assert.match(glassCss,/-webkit-text-size-adjust:100%!important/,'iOS-Schriftvergrößerung ist für die Navigation nicht kontrolliert.');
assert.match(glassCss,/@media\(max-width:390px\)[\s\S]*height:50px!important[\s\S]*font-size:8\.75px!important/,'Kleine iPhones besitzen keine ultra-kompakte Skalierung.');

assert.ok(live.includes("nav.dataset.glassNavV131==='1'||nav.classList.contains('cc-glass-nav-v131')"),'Live-Journal überschreibt die Glasnavigation weiterhin.');
assert.ok(live.includes('window.CutCoachGlassNavV131?.enhance?.()'),'Live-Journal stellt die Glasnavigation nicht erneut sicher.');
assert.ok(smart.includes("journal-live-nav-v127.js?v=1.3.2-alpha"),'Smart-Journal lädt nicht die reparierte Live-Navigation.');
assert.ok(loader.includes("glass-nav-v131.js?v=1.3.2-alpha"),'Versionsloader lädt nicht die reparierte Glasnavigation.');
assert.ok(loader.includes("glass-nav-v131.css?v=1.3.5-alpha"),'Versionsloader lädt nicht die ultra-kompakte Glasnavigation.');
assert.match(loader,/link\.addEventListener\('load',load,[\s\S]*document\.head\.append\(link\)/,'Navigation wird nicht erst nach geladener CSS-Datei gestartet.');
assert.ok(runtime.includes("version:'1.2.6-alpha'"),'Bestehender Runtimevertrag wurde unerwartet verändert.');
assert.ok(runtime.includes("journal-live-nav-v127.js?v=1.3.2-alpha"),'Runtime-Manifest enthält nicht die reparierte Live-Navigation.');
assert.ok(runtime.includes("glass-nav-v131.js?v=1.3.2-alpha"),'Runtime-Manifest enthält nicht die reparierte Glasnavigation.');
assert.ok(runtime.includes("glass-nav-v131.css?v=1.3.5-alpha"),'Runtime-Manifest enthält nicht die ultra-kompakte Navigations-CSS.');
assert.ok(sw.includes("runtime-manifest.js?v=1.2.6-alpha"),'Service Worker lädt nicht das bestehende Runtime-Manifest.');
assert.ok(sw.includes("-nav135`"),'Service Worker verwendet nicht die neue Ultra-Compact-Cachegeneration.');

dom.window.close();
console.log('Flackerfreie ultra-kompakte Vierer-Glasnavigation geprüft.');