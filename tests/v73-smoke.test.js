'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const filename=path.join(__dirname,'v72-smoke.test.js');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("'core.js','render.js','actions.js','app.js','food-catalog.js','library.js'","'core.js','render.js','actions.js','app.js','food-catalog.js','everyday-catalog-v73.js','library.js'");
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','journal-v72.js','version-v7.js'","'nutrition-v7.js','nutrition-v73.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 7.2.0'","'Version 7.3.1'");
source=source.replaceAll("'7.2.0','Zentrale Releasekonstante ist nicht 7.2.0'","'7.3.1','Zentrale Releasekonstante ist nicht 7.3.1'");
source=source.replace("  console.log('CutCoach 7.2 smoke test: ok');","  assert.ok(window.CutCoachEverydayCatalog,'Alltagskatalog fehlt');\n  assert.equal(window.document.querySelector('#nutritionEverydayQuick'),null,'Alltags-Schnellbereich wurde nicht entfernt');\n  assert.equal(window.document.querySelector('#journalCoachText'),null,'Impuls-Infotext wurde nicht entfernt');\n  console.log('CutCoach 7.3.1 journal smoke test: ok');");
const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);
