'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'src/features/profile/profile-v1000.js'),'utf8');
const index=fs.readFileSync(path.join(root,'src/features/profile/index.js'),'utf8');
const runtime=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');

assert.doesNotMatch(index,/profile-plan-status-v1003/,'Der nicht hilfreiche Planstatus darf nicht mehr geladen werden.');
assert.doesNotMatch(runtime,/profile-plan-status-v1003/,'Der Planstatus darf nicht mehr offline gecacht werden.');
assert.doesNotMatch(script,/Planstatus|Profilbasis vollständig|Gewichtsdaten/,'Der Profilbereich soll keine eigene Planstatus-Karte mehr erzeugen.');
assert.match(script,/syncAutomaticPlan/,'Automatische Ziele werden nicht selbstständig synchronisiert.');
console.log('Profil 10.0.5: Planstatus entfernt und automatische Zielberechnung aktiviert.');
