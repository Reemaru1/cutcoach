'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const profile=fs.readFileSync(path.join(root,'src/features/profile/profile-v1000.js'),'utf8');
const status=fs.readFileSync(path.join(root,'src/features/profile/profile-plan-status-v1003.js'),'utf8');
const progress=fs.readFileSync(path.join(root,'src/features/progress/progress-goal-v230.js'),'utf8');
const progressIndex=fs.readFileSync(path.join(root,'src/features/progress/index.js'),'utf8');

assert.doesNotMatch(profile,/coachStartWeight|coachWeightProgress|coachWeightDot|coachManualToggle/,'Fortschritts- oder doppelte Feinabstimmungselemente sind noch im Profil.');
assert.match(profile,/coach-course-summary/,'Der kompakte Profilkurs fehlt.');
assert.match(profile,/value===null\|\|value===undefined\|\|value===''/,'Nullwerte werden im Profil nicht streng validiert.');
assert.match(status,/Noch kein gültiges Gewicht/,'Der Planstatus erkennt ungültige Gewichtsdaten nicht.');
assert.match(progress,/Gewichtsreise/,'Der Zielverlauf wurde nicht in Fortschritt übernommen.');
assert.match(progress,/parsed!==null&&parsed>0/,'Der Fortschritt akzeptiert weiterhin 0 kg als gültige Messung.');
assert.match(progressIndex,/progress-goal-v230\.js/,'Das neue Fortschrittsmodul wird nicht geladen.');

console.log('Profil 10.0.4: Grundlagen im Profil, Gewichtsreise im Fortschritt und 0-kg-Schutz geprüft.');
