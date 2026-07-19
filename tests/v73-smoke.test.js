'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const project=path.resolve(__dirname,'..');
const packageJson=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8'));
const human=packageJson.version.replace(/-alpha$/,' Alpha');
const filename=path.join(__dirname,'v72-smoke.test.js');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("'core.js','render.js','actions.js','app.js','food-catalog.js','library.js'","'core.js','render.js','actions.js','app.js','food-catalog.js','everyday-catalog-v73.js','library.js'");
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','journal-v72.js','version-v7.js'","'nutrition-v7.js','nutrition-v73.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 1.2.1 Alpha'",`'Version ${human}'`);
source=source.replaceAll("'1.2.1 Alpha','Zentrale Releasekonstante ist nicht 1.2.1 Alpha'",`'${human}','Zentrale Releasekonstante ist nicht ${human}'`);
source=source.replace("  console.log('CutCoach 7.2 smoke test: ok');",`  assert.ok(window.CutCoachEverydayCatalog,'Alltagskatalog fehlt');
  assert.equal(window.document.querySelector('#nutritionEverydayQuick'),null,'Alltags-Schnellbereich wurde nicht entfernt');
  const hiddenCoach=window.document.querySelector('#journalCoachText');
  assert.ok(hiddenCoach&&hiddenCoach.hidden,'Impuls-Infotext ist noch sichtbar');
  console.log('CutCoach ${human} journal smoke test: ok');`);
const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);
