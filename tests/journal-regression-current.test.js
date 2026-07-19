'use strict';

const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');

const project=path.resolve(__dirname,'..');
const packageJson=JSON.parse(fs.readFileSync(path.join(project,'package.json'),'utf8'));
const human=packageJson.version.replace(/-alpha$/,' Alpha');
const marker=packageJson.version.match(/^(\d+)\.(\d+)\.(\d+)/).slice(1).join('')+'a';
const filename=path.join(__dirname,'journal-regression.test.js');
let source=fs.readFileSync(filename,'utf8');

source=source.replace("require('/tmp/cutcoach-jsdom/node_modules/jsdom')","require('jsdom')");
source=source.replace("assert.equal(window.document.querySelector('#appVersion').textContent,'Version 6.8.0');",`assert.equal(window.document.querySelector('#appVersion').textContent,'Version ${human}');`);
source=source.replace("assert.match(manifest,/version:'6\\.8\\.0'/,'Offline-Cache hat falsche Version');",`assert.ok(manifest.includes("version:'${packageJson.version}'"),'Offline-Cache hat falsche Version');`);
source=source.replace("assert.ok(indexSource.includes('nutrition.css?v=6.8.0')&&manifest.includes('./nutrition.css?v=6.8.0'),'Neues Ernährungsdesign ist nicht cache-sicher versioniert');","assert.ok(indexSource.includes('nutrition.css?v=7.0.0')&&manifest.includes('./nutrition.css?v=7.0.0'),'Ernährungsdesign ist nicht cache-sicher versioniert');");
source=source.replace("assert.ok(indexSource.includes('library.css?v=6.8.0')&&manifest.includes('./library.css?v=6.8.0'),'Neuer Portionsdialog ist nicht cache-sicher versioniert');","assert.ok(indexSource.includes('library.css?v=7.0.0')&&manifest.includes('./library.css?v=7.0.0'),'Portionsdialog ist nicht cache-sicher versioniert');");
source=source.replace("assert.ok(updateSource.includes(\"location.replace('./?updated=680#today')\"),'Update-Seite leitet auf einen veralteten Cache-Marker weiter');",`assert.ok(updateSource.includes("location.replace('./?updated=${marker}#today')"),'Update-Seite leitet auf einen veralteten Cache-Marker weiter');`);
source=source.replace("assert.ok(indexSource.indexOf('food-catalog.js?v=6.8.0')<indexSource.indexOf('library.js?v=6.8.0'),'Katalog wird nach der Bibliothek geladen');","assert.ok(indexSource.indexOf('food-catalog.js?v=7.0.0')<indexSource.indexOf('library.js?v=7.0.0'),'Katalog wird nach der Bibliothek geladen');");
source=source.replace("console.log('journal regression: ok');",`console.log('journal regression ${human}: ok');`);

const compiled=new Module(filename,module);
compiled.filename=filename;
compiled.paths=Module._nodeModulePaths(path.dirname(filename));
compiled._compile(source,filename);
