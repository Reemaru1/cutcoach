'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const filename=path.join(__dirname,'v7-smoke.test.js');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("'nutrition-v7.js','ui-effects-v7.js','version-v7.js'","'nutrition-v7.js','ui-effects-v7.js','journal-v72.js','version-v7.js'");
source=source.replaceAll("'Version 7.1.0'","'Version 7.2.0'");
source=source.replaceAll("'7.1.0','Zentrale Releasekonstante fehlt'","'7.2.0','Zentrale Releasekonstante fehlt'");
source=source.replace(/version:'7\\\.1\\\.0'/g,"version:'7\\.2\\.0'");
source=source.replace(/runtime-manifest\\\.js\\\?v=7\\\.1\\\.0/g,'runtime-manifest\\.js\\?v=7\\.2\\.0');
source=source.replace(/sw\\\.js\\\?v=7\\\.1\\\.0-force/g,'sw\\.js\\?v=7\\.2\\.0-force');
source=source.replaceAll('updated=710','updated=720');
source=source.replace("  console.log('CutCoach 7.1 smoke test: ok');","  for(const asset of ['journal-v72.js','journal-v72.css']){\n    assert.ok(manifest.includes(`./${asset}?v=7.2.0`),`Offline-Manifest enthält ${asset} nicht in Version 7.2.0`);\n    assert.ok(fs.existsSync(path.join(project,asset)),`Datei fehlt: ${asset}`);\n  }\n  console.log('CutCoach 7.2 compatibility smoke test: ok');");

const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);
