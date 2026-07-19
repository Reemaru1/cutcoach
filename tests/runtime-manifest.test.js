'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const packageJson=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const source=fs.readFileSync(path.join(root,'runtime-manifest.js'),'utf8');
const context={self:{}};
vm.runInNewContext(source,context,{filename:'runtime-manifest.js'});

const runtime=context.self.CUTCOACH_RUNTIME;
assert.ok(runtime,'Runtime-Manifest wurde nicht initialisiert.');
assert.equal(runtime.version,packageJson.version,'Runtime- und Paketversion müssen identisch sein.');

const groups=['baseAssets','styles','scripts'];
const allAssets=[];
for(const group of groups){
  assert.ok(Array.isArray(runtime[group]),`${group} muss eine Liste sein.`);
  assert.ok(Object.isFrozen(runtime[group]),`${group} muss unveränderlich sein.`);
  allAssets.push(...runtime[group]);
}

assert.ok(Object.isFrozen(runtime),'Runtime-Manifest muss unveränderlich sein.');
assert.equal(new Set(allAssets).size,allAssets.length,'Das Runtime-Manifest enthält identische doppelte URLs.');

const normalizedPaths=allAssets.map(asset=>asset.split('?')[0]);
assert.equal(new Set(normalizedPaths).size,normalizedPaths.length,'Das Runtime-Manifest enthält dieselbe Datei mehrfach mit unterschiedlichen Versionsparametern.');

for(const asset of allAssets){
  assert.match(asset,/^\.\//,`Ungültiger relativer Asset-Pfad: ${asset}`);
  const localPath=asset.split('?')[0].replace(/^\.\//,'');
  assert.ok(fs.existsSync(path.join(root,localPath)),`Manifest-Datei fehlt im Repository: ${localPath}`);
}

console.log(`Runtime-Manifest geprüft: ${allAssets.length} eindeutige Assets.`);
