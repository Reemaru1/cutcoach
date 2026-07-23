'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'src/features/profile/profile-plan-status-v1003.js'),'utf8');
const style=fs.readFileSync(path.join(root,'src/features/profile/profile-plan-status-v1003.css'),'utf8');
const index=fs.readFileSync(path.join(root,'src/features/profile/index.js'),'utf8');

assert.match(script,/Planstatus/,'Der langfristige Planstatus fehlt.');
assert.doesNotMatch(script,/Protein im Blick|Noch .* Schritte bis zum Tagesziel|Was heute zählt/,'Tagesbezogene Hinweise sind noch im Profilstatus enthalten.');
assert.match(script,/Profilbasis/,'Profilvollständigkeit wird nicht angezeigt.');
assert.match(script,/Zielberechnung/,'Berechnungsquelle wird nicht angezeigt.');
assert.match(script,/Gewichtsdaten/,'Datenaktualität wird nicht angezeigt.');
assert.match(style,/coach-plan-status/,'Planstatus besitzt keine eigene Gestaltung.');
assert.match(index,/profile-plan-status-v1003\.js/,'Planstatus-Skript wird nicht vom Profilmodul geladen.');
assert.match(index,/profile-plan-status-v1003\.css/,'Planstatus-Styles werden nicht vom Profilmodul geladen.');

console.log('Profil 10.0.3: langfristiger Planstatus statt Tageshinweisen geprüft.');
