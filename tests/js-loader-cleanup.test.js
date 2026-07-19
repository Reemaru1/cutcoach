'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.resolve(__dirname,'..','version-v7.js'),'utf8');

const extensions=source.match(/function loadNutritionExtensions\(\)\{([^}]*)\}/);
assert.ok(extensions,'Zentraler Ernährungs-Extension-Loader fehlt.');
for(const loader of ['loadNutrition110()','loadNutritionVoice111()','loadNutritionMulti120()']){
  assert.ok(extensions[1].includes(loader),`Extension-Loader enthält ${loader} nicht.`);
}

const nutrition73=source.match(/function loadNutrition73\(\)\{(.+?)\}\n  function loadNutritionCleanup/s);
assert.ok(nutrition73,'Nutrition-73-Loader konnte nicht geprüft werden.');
assert.ok(nutrition73[1].includes('loadNutritionExtensions()'),'Bereits geladenes Nutrition 7.3 muss die Erweiterungen starten.');
assert.ok(nutrition73[1].includes("addScript('nutrition-v73','./nutrition-v73.js?v=7.3.2',loadNutritionExtensions)"),'Nutrition-Erweiterungen müssen nach Nutrition 7.3 geladen werden.');

const start=source.match(/const start=\(\)=>\{([^}]*)\}/);
assert.ok(start,'Startsequenz fehlt.');
assert.ok(start[1].includes('loadCatalog73()'),'Startsequenz muss den Katalog- und Nutrition-Pfad starten.');
for(const duplicate of ['loadNutrition110()','loadNutritionVoice111()','loadNutritionMulti120()','loadNutritionExtensions()']){
  assert.ok(!start[1].includes(duplicate),`Startsequenz enthält redundanten Direktaufruf: ${duplicate}`);
}

console.log('JavaScript-Loaderkette geprüft.');
