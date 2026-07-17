'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const filename=path.join(__dirname,'v7-smoke.test.js');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("'core.js','render.js','actions.js','app.js','food-catalog.js','library.js'","'core.js','render.js','actions.js','app.js','food-catalog.js','everyday-catalog-v73.js','library.js'");
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','version-v7.js'","'nutrition-v7.js','nutrition-v73.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 7.1.0'","'Version 1.2.2 Alpha'");
source=source.replaceAll("'7.1.0','Zentrale Releasekonstante fehlt'","'1.2.2 Alpha','Zentrale Releasekonstante fehlt'");
source=source.replace("/version:'7\\.1\\.0'/","/version:'1\\.2\\.2-alpha'/");
source=source.replace("/runtime-manifest\\.js\\?v=7\\.1\\.0/","/runtime-manifest\\.js\\?v=1\\.2\\.2-alpha/");
source=source.replace("/sw\\.js\\?v=7\\.1\\.0-force/","/sw\\.js\\?v=1\\.2\\.2-alpha-force/");
source=source.replace("/updated=710/","/updated=122a/");
source=source.replace("'ui-effects-v7.js','ui-effects-v7.css','version-v7.js'","'ui-effects-v7.js','ui-effects-v7.css'");
source=source.replace("  assert.match(node('#journalCoachText').textContent,/Kernbereichen/,'Die Datenabdeckung des Coaches fehlt');","  assert.ok(node('#journalCoachText').hidden,'Der Impuls-Infotext ist noch sichtbar');");
source=source.replace("  console.log('CutCoach 7.1 smoke test: ok');","  assert.ok(window.CutCoachEverydayCatalog,'Alltagskatalog fehlt im vollständigen App-Start');\n  assert.ok(window.CutCoachEverydayCatalog.meta.count>=55,'Zu wenige Alltagsgerichte im App-Start');\n  for(const asset of ['journal-v72.js','journal-v72.css','everyday-catalog-v73.js','journal-smart-v740.js','journal-smart-v740.css','nutrition-cleanup-101.js','nutrition-cleanup-101.css','nutrition-v110.js','nutrition-v110.css','nutrition-voice-111.js','nutrition-voice-111.css','nutrition-multisearch-120.js','nutrition-multisearch-120.css','nutrition-multisearch-canonical-126.js']){\n    assert.ok(manifest.includes(asset),`Offline-Manifest enthält ${asset} nicht`);\n    assert.ok(fs.existsSync(path.join(project,asset)),`Datei fehlt: ${asset}`);\n  }\n  assert.ok(indexSource.includes('version-v7.js?v='),'Indexreferenz für den Versionsloader fehlt');\n  assert.ok(manifest.includes('./version-v7.js?v=1.2.2-alpha'),'Aktueller Versionsloader fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./nutrition-v73.js?v=7.3.1'),'Bereinigtes Ernährungsmodul fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./nutrition-v110.js?v=1.1.0-alpha'),'Nutrition-Performance-Modul fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./nutrition-voice-111.js?v=1.1.1-alpha'),'Voice-Stabilisierung fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./nutrition-multisearch-120.js?v=1.2.3-alpha'),'Stabilisierte Mehrfachsuche fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./nutrition-multisearch-canonical-126.js?v=1.2.6-alpha'),'Deterministischer Satzparser fehlt im Offline-Manifest');\n  assert.ok(manifest.includes('./ui-cleanup-v732.css?v=7.3.3'),'Journal-Cleanup fehlt im Offline-Manifest');\n  console.log('CutCoach 1.2.2 Alpha compatibility smoke test: ok');");
const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);