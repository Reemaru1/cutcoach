'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const css=fs.readFileSync(path.join(root,'body-progress-v211.css'),'utf8');
assert.match(css,/grid-template-columns:repeat\(5,1fr\)/);
assert.match(css,/Tagebuch|body-progress-v211-active/);
console.log('Body Progress 2.1.1: Fünfteilige Referenznavigation ist im Progress-Modus verankert.');
