'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const core=fs.readFileSync(path.join(root,'core.js'),'utf8');
const packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const human=packageJson.version.replace(/-alpha$/,' Alpha');

assert.ok(core.includes(`const APP_VERSION = '${human}'`),'Zentrale App-Version ist nicht aktuell.');
assert.ok(core.includes("meta:{ schemaVersion:SCHEMA_VERSION, appVersion:APP_VERSION"),'Neue Zustände müssen ihre App-Version speichern.');
assert.ok(core.includes('appVersion:APP_VERSION'),'Sanitisierte Zustände müssen die aktuelle App-Version übernehmen.');
assert.ok(core.includes("['bls','off','cutcoach','user','recipe','manual']"),'CutCoach-Standardgerichte müssen ihre Quelle beim Speichern behalten.');
assert.ok(core.includes('if(!saveState(true))throw new Error'),'Mutationen müssen bei fehlgeschlagenem Speichern zurückgerollt werden.');
assert.ok(core.includes('if(existed)state.days[key]=previous;else delete state.days[key]'),'Fehlgeschlagene Tagesmutationen müssen den vorherigen Stand wiederherstellen.');

console.log('Kerndaten-, Quellen- und Rollback-Regeln geprüft.');