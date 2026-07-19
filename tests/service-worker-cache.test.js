'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
const update=fs.readFileSync(path.join(root,'update.html'),'utf8');

const runtimeUrl=`./runtime-manifest.js?v=${packageJson.version}`;
assert.ok(sw.includes(`const RUNTIME_MANIFEST_URL='${runtimeUrl}'`),'Service Worker muss das Runtime-Manifest mit der Paketversion laden.');
assert.ok(sw.includes("const CACHE_NAME=`${CACHE_PREFIX}v${RUNTIME.version}`"),'Cache-Name muss ausschließlich von der Runtime-Version abhängen.');
assert.ok(!sw.includes('-nav131'),'Veralteter Navigationszusatz darf nicht mehr im Cache-Namen stehen.');
assert.ok(sw.includes('Object.freeze([...new Set(['),'App-Shell muss vor dem Vorladen dedupliziert und eingefroren werden.');

assert.ok(app.includes("navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'})"),'Normale App muss den kanonischen Service-Worker-Pfad registrieren.');
assert.ok(update.includes("const SERVICE_WORKER_URL='./sw.js'"),'Update-Seite muss denselben kanonischen Service-Worker-Pfad verwenden.');
assert.ok(update.includes('navigator.serviceWorker.register(SERVICE_WORKER_URL'), 'Update-Seite muss ihre zentrale Service-Worker-Konstante registrieren.');
assert.ok(!update.includes('sw.js?v='),'Update-Seite darf keinen abweichenden Service-Worker-Pfad mit Query-Version registrieren.');

for(const eventName of ['install','activate','message','fetch']){
  assert.ok(sw.includes(`self.addEventListener('${eventName}'`),`Fehlender Service-Worker-Handler: ${eventName}`);
}
assert.ok(sw.includes("fetch(request,{cache:'no-store'})"),'Netzwerkabrufe müssen den HTTP-Cache umgehen, damit Updates erkannt werden.');
assert.ok(sw.includes("key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME"),'Aktivierung muss nur ältere CutCoach-Caches löschen.');
assert.ok(sw.includes("event.data?.type==='SKIP_WAITING'"),'Expliziter Update-Button muss den wartenden Worker aktivieren können.');

console.log('Service-Worker- und Cache-Pfade geprüft.');
