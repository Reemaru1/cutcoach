'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const combined=fs.readFileSync(path.join(root,'upgrade-legacy.css'),'utf8');

for(const marker of ['upgrade-360.css','upgrade-420.css','upgrade-430.css']){
  assert.ok(combined.includes(`/* ${marker} */`),`Fehlender Abschnitt: ${marker}`);
}

const positions=['upgrade-360.css','upgrade-420.css','upgrade-430.css'].map(marker=>combined.indexOf(`/* ${marker} */`));
assert.ok(positions[0]<positions[1]&&positions[1]<positions[2],'Die ursprüngliche CSS-Ladereihenfolge wurde nicht beibehalten.');

const entry=fs.readFileSync(path.join(root,'upgrade-360.css'),'utf8');
assert.match(entry,/upgrade-legacy\.css\?v=1\.3\.1-alpha/,'Der Legacy-Einstieg lädt nicht die konsolidierte Datei.');
for(const shim of ['upgrade-420.css','upgrade-430.css']){
  const source=fs.readFileSync(path.join(root,shim),'utf8');
  assert.ok(!source.includes('{'),`${shim} enthält weiterhin aktive CSS-Regeln.`);
}

console.log('Legacy-CSS-Konsolidierung geprüft.');
