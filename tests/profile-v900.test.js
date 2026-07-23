'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/features/profile/profile-v900.js'),'utf8');
const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
const script=window.document.createElement('script');
script.textContent=source;
window.document.head.append(script);

const api=window.CutCoachProfile900;
assert.equal(api.version,'9.1.0-alpha');

const baseline=api.calculatePlan({
  age:30,height:180,weight:90,goalWeight:80,calculationSex:'male',
  goal:'lose',activityLevel:'active',trainingDays:4,pace:'balanced'
});
assert.equal(baseline.maintenance,3200,'PAL und Mifflin-St.-Jeor werden nicht korrekt verbunden.');
assert.equal(baseline.calories,2725,'Das ausgewogene Defizit wird nicht in einen ruhigen 25-kcal-Schritt gerundet.');
assert.equal(baseline.protein,130,'Eiweiß verwendet nicht das sichere Referenzgewicht.');
assert.equal(baseline.steps,9000,'Aktiver Alltag erhält kein passendes Schrittziel.');

const female=api.calculatePlan({...baseline,calculationSex:'female',goal:'maintain'});
const neutral=api.calculatePlan({...baseline,calculationSex:'neutral',goal:'maintain'});
const male=api.calculatePlan({...baseline,calculationSex:'male',goal:'maintain'});
assert.ok(female.maintenance<neutral.maintenance&&neutral.maintenance<male.maintenance,'Der neutrale Rechenwert liegt nicht zwischen den Referenzwerten.');

const gentle=api.calculatePlan({...baseline,goal:'lose',pace:'gentle'});
const focused=api.calculatePlan({...baseline,goal:'lose',pace:'focused'});
assert.ok(gentle.calories>baseline.calories&&baseline.calories>focused.calories,'Die drei Zieltempi sind nicht nachvollziehbar gestaffelt.');

const extreme=api.calculatePlan({age:100,height:120,weight:30,goal:'lose',activityLevel:'sedentary',pace:'focused'});
assert.ok(extreme.calories>=1200,'Das Tagesziel fällt unter die Sicherheitsuntergrenze.');
assert.ok(extreme.protein>=50&&extreme.carbs>=50&&extreme.fat>=40,'Makro-Untergrenzen werden nicht eingehalten.');

assert.match(source,/Ziele manuell anpassen/,'Manuelle Zielwerte werden nicht als eigener Profilbereich aufgebaut.');
assert.match(source,/Backups, Datenschutz, Produktqualität und Feedback/,'App-Einstellungen sind nicht klar von persönlichen Zielen getrennt.');
assert.match(source,/profileCompletion/,'Der kompakte Profilstatus fehlt.');

dom.window.close();
console.log('Profil 9.1: Berechnung, klare Informationshierarchie und getrennte App-Einstellungen geprüft.');
