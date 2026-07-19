'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const packageJson=JSON.parse(read('package.json'));
const human=packageJson.version.replace(/-alpha$/,' Alpha');
const core=read('core.js');
const versionLoader=read('version-v7.js');
const index=read('index.html');
const sw=read('sw.js');
const update=read('update.html');
const context={self:{}};
vm.runInNewContext(read('runtime-manifest.js'),context,{filename:'runtime-manifest.js'});
const runtime=context.self.CUTCOACH_RUNTIME;

assert.equal(runtime.version,packageJson.version,'Runtime-Manifest und package.json müssen dieselbe Version verwenden.');
assert.ok(core.includes(`const APP_VERSION = '${human}'`),'core.js muss die sichtbare Release-Version verwenden.');
assert.ok(versionLoader.includes(`const RELEASE='${human}'`),'version-v7.js muss dieselbe sichtbare Release-Version verwenden.');
assert.ok(sw.includes(`./runtime-manifest.js?v=${packageJson.version}`),'Service Worker muss das aktuelle Runtime-Manifest importieren.');
assert.ok(update.includes(`CutCoach ${human}`),'Update-Seite muss die aktuelle sichtbare Version nennen.');
assert.ok(index.includes(`version-v7.js?v=${packageJson.version}`),'index.html muss den Release-Loader mit der Paketversion laden.');
assert.ok(index.includes(`stability-hardening-v133.js?v=${packageJson.version}`),'index.html muss die zweite Stabilitätsschicht direkt laden.');

for(const asset of ['./core.js?v=7.0.2','./app.js?v=7.0.1','./scanner-v2.js?v=7.0.2','./off-lookup.js?v=7.0.1','./water-animation.js?v=6.8.6',`./stability-hardening-v133.js?v=${packageJson.version}`]){
  assert.ok([...runtime.baseAssets,...runtime.scripts].includes(asset),`Runtime-Manifest enthält nicht ${asset}.`);
  assert.ok(index.includes(asset.slice(2)),`index.html enthält nicht ${asset}.`);
}

console.log(`Release-Konsistenz für ${human} geprüft.`);