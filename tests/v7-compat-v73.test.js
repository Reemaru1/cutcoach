'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const project=path.resolve(__dirname,'..');
const packageJson=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8'));
const technical=packageJson.version;
const human=technical.replace(/-alpha$/,' Alpha');
const escapedTechnical=technical.replace(/\./g,'\\.');
const marker=technical.match(/^(\d+)\.(\d+)\.(\d+)/).slice(1).join('')+'a';
const filename=path.join(__dirname,'v7-smoke.test.js');
let source=fs.readFileSync(filename,'utf8');

source=source.replace("'core.js','render.js','actions.js','app.js','food-catalog.js','library.js'","'core.js','render.js','actions.js','app.js','food-catalog.js','everyday-catalog-v73.js','library.js'");
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','version-v7.js'","'nutrition-v7.js','nutrition-v73.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 7.1.0'",`'Version ${human}'`);
source=source.replaceAll("'7.1.0','Zentrale Releasekonstante fehlt'",`'${human}','Zentrale Releasekonstante fehlt'`);
source=source.replace("assert.match(manifest,/version:'7\\.1\\.0'/,'Runtime-Manifest hat eine falsche Version');",`assert.match(manifest,/version:'${escapedTechnical}'/,'Runtime-Manifest hat eine falsche Version');`);
source=source.replace("assert.match(sw,/runtime-manifest\\.js\\?v=7\\.1\\.0/,'Service Worker lädt ein veraltetes Manifest');",`assert.match(sw,/runtime-manifest\\.js\\?v=${escapedTechnical}/,'Service Worker lädt ein veraltetes Manifest');`);
source=source.replace("assert.match(update,/sw\\.js\\?v=7\\.1\\.0-force/,'Erzwungener Installer lädt einen veralteten Service Worker');","assert.match(update,/const SERVICE_WORKER_URL='\\.\\/sw\\.js'/,'Update-Seite verwendet nicht den kanonischen Service Worker');");
source=source.replace("assert.match(update,/updated=710/,'Update-Weiterleitung hat einen veralteten Marker');",`assert.match(update,/updated=${marker}/,'Update-Weiterleitung hat einen veralteten Marker');`);
source=source.replace("for(const asset of ['ui-effects-v7.js','ui-effects-v7.css','version-v7.js']){","for(const asset of ['ui-effects-v7.js','ui-effects-v7.css']){");
source=source.replace("  assert.match(node('#journalCoachText').textContent,/Kernbereichen/,'Die Datenabdeckung des Coaches fehlt');","  assert.ok(node('#journalCoachText').hidden,'Der Impuls-Infotext ist noch sichtbar');");
source=source.replace("  console.log('CutCoach 7.1 smoke test: ok');",`  assert.ok(window.CutCoachEverydayCatalog,'Alltagskatalog fehlt im vollständigen App-Start');
  assert.ok(window.CutCoachEverydayCatalog.meta.count>=55,'Zu wenige Alltagsgerichte im App-Start');
  for(const asset of ['journal-v72.js','journal-v72.css','everyday-catalog-v73.js','journal-smart-v740.js','journal-smart-v740.css','journal-live-nav-v127.js','journal-live-nav-v127.css','nutrition-cleanup-101.js','nutrition-cleanup-101.css','nutrition-v110.js','nutrition-v110.css','nutrition-voice-111.js','nutrition-voice-111.css','nutrition-multisearch-120.js','nutrition-multisearch-120.css','nutrition-multisearch-canonical-128.js','glass-nav-v131.js','glass-nav-v131.css']){
    assert.ok(manifest.includes(asset),\`Offline-Manifest enthält \${asset} nicht\`);
    assert.ok(fs.existsSync(path.join(project,asset)),\`Datei fehlt: \${asset}\`);
  }
  assert.ok(indexSource.includes('version-v7.js?v=${technical}'),'Indexreferenz für den aktuellen Versionsloader fehlt');
  assert.ok(manifest.includes('./version-v7.js?v=${technical}'),'Aktueller Versionsloader fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./journal-live-nav-v127.js?v=${technical}'),'Live-Journal-Modul fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./glass-nav-v131.js?v=${technical}'),'Glasnavigation fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./nutrition-v73.js?v=7.3.2'),'Bereinigtes Ernährungsmodul fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./nutrition-v110.js?v=1.1.2-alpha'),'Nutrition-Performance-Modul fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./nutrition-voice-111.js?v=1.1.2-alpha'),'Voice-Stabilisierung fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./nutrition-multisearch-120.js?v=1.2.3-alpha'),'Stabilisierte Mehrfachsuche fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./nutrition-multisearch-canonical-128.js?v=1.2.10-alpha'),'Nutrition-QA-Suchlogik fehlt im Offline-Manifest');
  assert.ok(manifest.includes('./ui-cleanup-v732.css?v=7.3.3'),'Journal-Cleanup fehlt im Offline-Manifest');
  console.log('CutCoach ${human} compatibility smoke test: ok');`);

const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);
