'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const filename=path.join(__dirname,'v7-smoke.test.js');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("'core.js','render.js','actions.js','app.js','food-catalog.js','library.js'","'core.js','render.js','actions.js','app.js','food-catalog.js','everyday-catalog-v73.js','library.js'");
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','version-v7.js'","'nutrition-v7.js','nutrition-v73.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 7.1.0'","'Version 7.4.0'");
source=source.replaceAll("'7.1.0','Zentrale Releasekonstante fehlt'","'7.4.0','Zentrale Releasekonstante fehlt'");
source=source.replace(/version:'7\\\.1\\\.0'/g,"version:'7\\.4\\.0'");
source=source.replace(/runtime-manifest\\\.js\\\?v=7\\\.1\\\.0/g,'runtime-manifest\\.js\\?v=7\\.4\\.0');
source=source.replace(/sw\\\.js\\\?v=7\\\.1\\\.0-force/g,'sw\\.js\\?v=7\\.4\\.0-force');
source=source.replaceAll('updated=710','updated=740');
source=source.replace("'ui-effects-v7.js','ui-effects-v7.css','version-v7.js'","'ui-effects-v7.js','ui-effects-v7.css'");
source=source.replace("  assert.match(node('#journalCoachText').textContent,/Kernbereichen/,'Die Datenabdeckung des Coaches fehlt');","  assert.ok(node('#journalCoachText').hidden,'Der Impuls-Infotext ist noch sichtbar');");
source=source.replace("  console.log('CutCoach 7.1 smoke test: ok');","  assert.ok(window.CutCoachEverydayCatalog,'Alltagskatalog fehlt im vollständigen App-Start');\n  assert.ok(window.CutCoachEverydayCatalog.meta.count>=55,'Zu wenige Alltagsgerichte im App-Start');\n  for(const asset of ['journal-v72.js','journal-v72.css','everyday-catalog-v73.js','journal-smart-v740.js','journal-smart-v740.css']){\n    assert.ok(manifest.includes(asset),`Offline-Manifest enthält ${asset} nicht`);\n    assert.ok(fs.existsSync(path.join(project,asset)),`Datei fehlt: ${asset}`);\n  }\n  assert.ok(indexSource.includes('version-v7.js?v='),'Indexreferenz für den Versionsloader fehlt');\n  assert.ok(manifest.includes('./version-v7.js?v=7.4.0'),'Aktueller Versionsloader fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./nutrition-v73.js?v=7.3.1'),'Bereinigtes Ernährungsmodul fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./ui-cleanup-v732.css?v=7.3.3'),'Journal-Cleanup fehlt im Offline-Manifest');\n  console.log('CutCoach 7.4.0 compatibility smoke test: ok');");
const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);