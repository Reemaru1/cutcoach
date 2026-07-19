'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'off-lookup.js'),'utf8');

assert.match(source,/let originalLookup=null,busy=false,resultItemId=null,lookupToken=0/,'Lookup-Generation fehlt.');
assert.match(source,/if\(window\.CutCoachLibrary\.importData\(db\)!==true\)throw new Error\('library-save-failed'\)/,'Bibliotheksfehler wird nicht nach außen gemeldet.');
assert.match(source,/document\.addEventListener\('visibilitychange',\(\)=>\{if\(document\.hidden\)cancelLookup\(\)\}\)/,'Hintergrundwechsel bricht Produktsuche nicht ab.');
assert.match(source,/if\(token!==lookupToken\)return/g,'Späte Produktsuchergebnisse werden nicht verworfen.');
assert.doesNotMatch(source,/if\(Number\.isFinite\(value\)\)return value/,'Ungültige Nährwertaliaswerte blockieren weiterhin spätere gültige Felder.');

console.log('Open-Food-Facts-Speicher- und Race-Schutz geprüft.');