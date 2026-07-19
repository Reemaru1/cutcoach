'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const glass=read('glass-nav-v131.js');
const live=read('journal-live-nav-v127.js');
const scanner=read('scanner-v2.js');
const off=read('off-lookup.js');
const water=read('water-animation.js');
const sw=read('sw.js');
const update=read('update.html');
const hardening=read('stability-hardening-v133.js');

assert.match(glass,/function markupIsCurrent/,'Glasnavigation hat keinen Idempotenzschutz.');
assert.match(glass,/if\(!markupIsCurrent\(button,key\)\)/,'Navigationsmarkup wird weiterhin bei jedem Beobachterlauf überschrieben.');
assert.doesNotMatch(glass,/for\(const key[^\n]+button\.innerHTML=ICONS\[key\]/,'Glasnavigation schreibt weiterhin ungebremst innerHTML.');
assert.match(glass,/#journalQuickAdd:not\(\[disabled\]\),\[data-add-journal-meal\]:not\(\[disabled\]\)/,'Ernährungseinstieg hat keinen funktionierenden Fallback.');

assert.match(live,/const refreshTimers=new Set\(\)/,'Journal-Refresh verwaltet seine Settle-Timer nicht zentral.');
assert.match(live,/function clearRefreshTimers/,'Alte Journal-Refresh-Timer werden nicht abgebrochen.');
assert.match(live,/clearRefreshTimers\(\);scheduleRefresh\(0\);scheduleRefresh\(100\);scheduleRefresh\(260\)/,'Journal-Refresh ist nicht sauber entprellt.');

assert.match(scanner,/let scanGeneration=0/,'Scanner besitzt keinen Generationsschutz.');
assert.match(scanner,/generation!==scanGeneration/,'Veraltete Kameraoperationen werden nicht verworfen.');
assert.match(scanner,/async function stopScanner\(invalidate=true\)/,'Scanner-Abbruch invalidiert laufende Starts nicht.');
assert.match(scanner,/const localScanner=newScanner\(\)/,'Foto- und Live-Scanner teilen weiterhin ungeschützt dieselbe Instanz.');

assert.match(off,/lookupToken/,'Produktsuche besitzt keinen Schutz gegen verspätete Antworten.');
assert.match(off,/function cancelLookup/,'Produktsuche kann beim Schließen nicht abgebrochen werden.');
assert.match(off,/importData\(db\)!==true/,'Fehlgeschlagenes Bibliotheksspeichern wird weiterhin als Erfolg behandelt.');
assert.match(off,/if\(token!==lookupToken\)return/,'Veraltete Produktsuchergebnisse werden nicht verworfen.');

assert.match(water,/lastDateKey/,'Wasseranimation unterscheidet keinen Datumswechsel.');
assert.match(water,/requestAnimationFrame\(decorate\)/,'Wasseranimation bündelt DOM-Änderungen nicht.');
assert.match(water,/rootObserver\.observe\(root/,'Wasseranimation beobachtet nicht nur den Tagebuchbereich.');
assert.doesNotMatch(water,/observe\(document\.body/,'Wasseranimation beobachtet weiterhin die gesamte App.');

assert.match(sw,/const UPDATE_PATH=/,'Service Worker erkennt die Update-Seite nicht separat.');
assert.match(sw,/fallbackKey=isUpdateNavigation\?'\.\/update\.html':'\.\/index\.html'/,'Update-Seite kann weiterhin den Offline-App-Shell-Eintrag überschreiben.');
assert.ok(update.indexOf('await preflight()')<update.indexOf('navigator.serviceWorker.register'),'Update startet nicht mit einer Netzprüfung.');
assert.doesNotMatch(update,/caches\.delete\(/,'Update-Seite löscht weiterhin selbst die letzte funktionierende Cacheversion.');
assert.doesNotMatch(update,/\.unregister\(\)/,'Update-Seite entfernt weiterhin den aktiven Worker vor erfolgreicher Installation.');
assert.match(update,/waiting\.postMessage\(\{type:'SKIP_WAITING'\}\)/,'Neue Worker-Version wird nicht kontrolliert aktiviert.');
assert.match(update,/Die bisherige funktionierende Version wurde nicht gelöscht/,'Update erklärt den sicheren Fehlerabbruch nicht.');

assert.match(hardening,/const returnFocus=new WeakMap\(\)/,'Gestapelte Modals speichern ihren Fokus nicht getrennt.');
assert.match(hardening,/const topModal=/,'Escape und Fokusfalle kennen das oberste Modal nicht.');
assert.match(hardening,/preserveLibraryUrl/,'Bibliothekswechsel schützt den ausgewählten Tag nicht.');
assert.match(hardening,/storageReadOnly=true/,'Fremddaten aus neuerer Version aktivieren keinen Überschreibschutz.');
assert.match(hardening,/window\.addEventListener\('storage',protectExternalState,true\)/,'Fremddaten werden nicht vor dem normalen Storage-Handler abgefangen.');

console.log('Zweiter Stabilitätsdurchgang: Race-, Cache-, Fokus- und Offline-Regressionen geprüft.');