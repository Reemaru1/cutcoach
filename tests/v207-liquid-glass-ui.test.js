'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const css=read('liquid-glass-ui-v207.css');
const runtime=read('runtime-manifest.js');
const sw=read('sw.js');
const pkg=JSON.parse(read('package.json'));

assert.match(css,/#journalMacroClose[\s\S]*#journalSummaryClose/,'Die konkreten Makro- und Abschluss-Schließen-Buttons werden nicht direkt adressiert.');
assert.match(css,/\.modal \.sheet-head > button\[aria-label="Schließen"\]/,'Dynamisch erzeugte Modal-Schließen-Buttons fehlen im Override.');
assert.match(css,/border-right:2px solid[\s\S]*border-bottom:2px solid/,'Der ruhige Abwärtspfeil für Bottom-Sheets fehlt.');
assert.match(css,/content:none!important;[\s\S]*display:none!important/,'Das alte X-Pseudoelement wird nicht zuverlässig deaktiviert.');
assert.match(css,/font-size:0!important/,'Der alte ×-Text wird nicht zuverlässig ausgeblendet.');
assert.match(css,/background-color:rgba\(13,20,33,\.64\)!important/,'Der alte Primärbutton-Verlauf wird nicht durch eine neutrale Glasfläche ersetzt.');

assert.match(css,/nav\[aria-label="Hauptnavigation"\]\.cc-glass-nav-v131[\s\S]*backdrop-filter:blur\(34px\) saturate\(185%\)/,'Die Navigation besitzt nicht den vorgesehenen starken Glas-Blur.');
assert.match(css,/background:[\s\S]*rgba\(16,21,33,\.46\)!important/,'Die Navigation ist nicht ausreichend transparent.');
assert.match(css,/border-radius:31px!important/,'Die äußere Liquid-Glass-Kapsel fehlt.');
assert.match(css,/button\.active:not\(\[data-tab="food"\]\)[\s\S]*rgba\(255,255,255,\.19\)/,'Die aktive Navigation besitzt keine schwebende Glasfläche.');
assert.match(css,/button\[data-tab="food"\][\s\S]*width:46px!important/,'Der zentrale Ernährungsbutton wurde unerwartet entfernt oder verkleinert.');
assert.match(css,/@media\(prefers-reduced-transparency:reduce\)/,'Eine solide Fallback-Fläche bei reduzierter Transparenz fehlt.');

const oldStyle=runtime.indexOf('nutrition-ui-consistency-v206.css?v=2.0.6-alpha');
const newStyle=runtime.indexOf('liquid-glass-ui-v207.css?v=2.0.7-alpha');
assert.ok(oldStyle>=0&&newStyle>oldStyle,'Das Liquid-Glass-Override muss nach allen älteren UI-Regeln geladen werden.');
assert.ok(sw.includes('ui207-liquid-glass'),'Die Offline-Cachegeneration wurde nicht angehoben.');
assert.match(pkg.scripts.test,/v207-liquid-glass-ui\.test\.js/,'Die neue Regression ist nicht in der vollständigen Testsuite enthalten.');

console.log('UI 2.0.7: direkte Sheet-Steuerung und transparente Liquid-Glass-Navigation sind korrekt verankert.');
