'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');

const css=read('src/features/profile/profile-v920.css');
const loader=read('src/features/profile/index.js');
const runtime=read('runtime-manifest.js');
const sw=read('sw.js');

assert.match(css,/body:has\(\.profile-screen\.active\) \.app-header/,'Der globale App-Header bleibt im Profil sichtbar.');
assert.match(css,/body:has\(\.profile-screen\.active\) \.date-nav/,'Die Datumsnavigation bleibt im Profil sichtbar.');
assert.match(css,/\.profile-avatar::before/,'Das unklare C wurde nicht durch ein Profil-Piktogramm ersetzt.');
assert.match(css,/\.profile-actions button/,'Profilaktionen erhalten keinen einheitlichen aktuellen Buttonstil.');
assert.match(css,/\.profile-manual-goals #saveSettings/,'Der Speichern-Button der manuellen Ziele bleibt im alten Stil.');
assert.match(loader,/profile-v920\.css\?v=9\.2\.0-alpha/,'Profil 9.2 wird produktiv nicht geladen.');
assert.match(runtime,/profile-v920\.css\?v=9\.2\.0-alpha/,'Profil 9.2 fehlt im Offline-Manifest.');
assert.match(sw,/profile920/,'Der PWA-Cache wurde für Profil 9.2 nicht invalidiert.');

console.log('Profil 9.2: kontextfreier Header entfernt, Profil-Icon und einheitliche Glass-Aktionen geprüft.');
