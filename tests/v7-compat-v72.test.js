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
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','version-v7.js'","'nutrition-v7.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 7.1.0'",`'Version ${human}'`);
source=source.replaceAll("'7.1.0','Zentrale Releasekonstante fehlt'",`'${human}','Zentrale Releasekonstante fehlt'`);
source=source.replace("assert.match(manifest,/version:'7\\.1\\.0'/,'Runtime-Manifest hat eine falsche Version');",`assert.match(manifest,/version:'${escapedTechnical}'/,'Runtime-Manifest hat eine falsche Version');`);
source=source.replace("assert.match(sw,/runtime-manifest\\.js\\?v=7\\.1\\.0/,'Service Worker lädt ein veraltetes Manifest');",`assert.match(sw,/runtime-manifest\\.js\\?v=${escapedTechnical}/,'Service Worker lädt ein veraltetes Manifest');`);
source=source.replace("assert.match(update,/sw\\.js\\?v=7\\.1\\.0-force/,'Erzwungener Installer lädt einen veralteten Service Worker');","assert.match(update,/const SERVICE_WORKER_URL='\\.\\/sw\\.js'/,'Update-Seite verwendet nicht den kanonischen Service Worker');");
source=source.replace("assert.match(update,/updated=710/,'Update-Weiterleitung hat einen veralteten Marker');",`assert.match(update,/updated=${marker}/,'Update-Weiterleitung hat einen veralteten Marker');`);
source=source.replace("for(const asset of ['ui-effects-v7.js','ui-effects-v7.css','version-v7.js']){","for(const asset of ['ui-effects-v7.js','ui-effects-v7.css']){");
source=source.replace("  console.log('CutCoach 7.1 smoke test: ok');",`  for(const asset of ['journal-v72.js','journal-v72.css']){
    assert.ok(manifest.includes(\`./\${asset}?v=7.2.0\`),\`Offline-Manifest enthält \${asset} nicht in Version 7.2.0\`);
    assert.ok(fs.existsSync(path.join(project,asset)),\`Datei fehlt: \${asset}\`);
  }
  assert.ok(manifest.includes('./version-v7.js?v=${technical}'),'Aktueller Versionsloader fehlt im Offline-Manifest');
  console.log('CutCoach ${human} mit V72-Journal-Kompatibilität: ok');`);

const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);
