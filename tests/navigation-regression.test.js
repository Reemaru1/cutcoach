'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const glass=fs.readFileSync(path.join(root,'glass-nav-v131.js'),'utf8');
const live=fs.readFileSync(path.join(root,'journal-live-nav-v127.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const smart=fs.readFileSync(path.join(root,'journal-smart-v740.js'),'utf8');

assert.ok(glass.includes('function ensureFoodButton(nav)'),'Glasnavigation muss einen entfernten Ernährungsbutton wiederherstellen.');
assert.ok(glass.includes("document.querySelector('#journalQuickAdd')"),'Ernährungsbutton muss den produktiven Quick-Add-Ablauf bevorzugen.');
assert.ok(glass.includes('event.stopImmediatePropagation()'),'Zusätzliche alte Tab-Handler dürfen den Ernährungseinstieg nicht überschreiben.');
assert.ok(glass.includes('`${url.pathname}${url.search}${url.hash}`'),'Glasnavigation muss Datum und weitere Query-Parameter erhalten.');
assert.ok(app.includes('`${url.pathname}${url.search}${url.hash}`'),'Normale Tabnavigation muss Datum und weitere Query-Parameter erhalten.');
assert.ok(live.includes("nav.dataset.glassNavV131==='1'||nav.classList.contains('cc-glass-nav-v131')"),'Live-Journal darf aktive Glasnavigation nicht zurücksetzen.');
assert.ok(live.includes('window.CutCoachGlassNavV131?.enhance?.()'),'Live-Journal muss die Glasnavigation bei Bedarf erneut absichern.');
assert.ok(smart.includes("journal-live-nav-v127.js?v=1.3.2-alpha"),'Smart-Journal muss die aktuelle Live-Navigation laden.');

console.log('Navigationsschutz und Datumsparameter geprüft.');
