'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const script=fs.readFileSync(path.join(root,'src/features/profile/profile-v1000.js'),'utf8');
const css=fs.readFileSync(path.join(root,'src/features/profile/profile-v1000.css'),'utf8');

assert.match(script,/syncAutomaticPlan/);
assert.match(script,/profile\.planSource==='manual'/);
assert.match(script,/commitStateMutation/);
assert.doesNotMatch(script,/Automatische Ziele aktualisieren/);
assert.doesNotMatch(script,/Deine persönliche Steuerzentrale/);
assert.doesNotMatch(script,/class="coach-plan-status"|Planstatus/,'Die Profilstruktur darf keine Planstatus-Karte erzeugen.');
assert.match(script,/querySelector\('\.coach-plan-status'\)\?\.remove/,'Veraltete bereits geladene Planstatus-Karten werden nicht bereinigt.');
assert.match(script,/settings/);
assert.match(css,/margin:-38px auto 0/);
assert.match(css,/coach-plan-status,.coach-insights,.coach-target-actions\{display:none!important\}/);
console.log('Profil 10.0.5 automatische Zielpflege und kompakter Kopf geprüft.');
