'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'src/features/profile/profile-plan-status-v1003.js'),'utf8');
const index=fs.readFileSync(path.join(root,'src/features/profile/index.js'),'utf8');
assert.match(script,/Planstatus/);
assert.doesNotMatch(script,/Protein im Blick|Was heute zählt|Noch .* Schritte bis zum Tagesziel/);
assert.match(script,/Profilbasis/);
assert.match(script,/Zielberechnung/);
assert.match(script,/Gewichtsdaten/);
assert.match(index,/profile-plan-status-v1003\.js/);
console.log('Profil 10.0.3 Bereichstrennung geprüft.');
