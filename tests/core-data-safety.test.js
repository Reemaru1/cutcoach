'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const core=fs.readFileSync(path.resolve(__dirname,'..','core.js'),'utf8');

assert.ok(core.includes("const APP_VERSION = '1.3.2 Alpha'"),'Zentrale App-Version ist nicht aktuell.');
assert.ok(core.includes("meta:{ schemaVersion:SCHEMA_VERSION, appVersion:APP_VERSION"),'Neue Zustände müssen ihre App-Version speichern.');
assert.ok(core.includes('appVersion:APP_VERSION'),'Sanitisierte Zustände müssen die aktuelle App-Version übernehmen.');
assert.ok(core.includes("['bls','off','cutcoach','user','recipe','manual']"),'CutCoach-Standardgerichte müssen ihre Quelle beim Speichern behalten.');
assert.ok(core.includes('if(!saveState(true))throw new Error'),'Mutationen müssen bei fehlgeschlagenem Speichern zurückgerollt werden.');
assert.ok(core.includes('if(existed)state.days[key]=previous;else delete state.days[key]'),'Fehlgeschlagene Tagesmutationen müssen den vorherigen Stand wiederherstellen.');

console.log('Kerndaten-, Quellen- und Rollback-Regeln geprüft.');
