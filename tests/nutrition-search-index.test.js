'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const root=path.resolve(__dirname,'..');
const generator=path.join(root,'tools','build-nutrition-search-index.js');
const result=spawnSync(process.execPath,[generator,'--check'],{cwd:root,encoding:'utf8'});
assert.equal(result.status,0,result.stderr||result.stdout);

const payload=JSON.parse(fs.readFileSync(path.join(root,'assets','nutrition-search-index-v1.json'),'utf8'));
assert.equal(payload.version,'1.0.0');
assert.equal(payload.count,7295);
assert.equal(payload.entries.length,payload.count);
assert.equal(new Set(payload.entries.map(entry=>entry[0])).size,payload.count,'Der Suchindex enthaelt doppelte IDs.');
assert.ok(payload.entries.some(entry=>entry[0]==='bls:C133000'&&entry[1]==='hafer flocken'),'Der BLS-Haferflocken-Eintrag fehlt.');
assert.ok(payload.entries.some(entry=>entry[1].includes('pizza')),'Pizza-Eintraege fehlen im Suchindex.');
console.log('Versionierter Ernaehrungs-Suchindex ist vollstaendig und reproduzierbar.');
