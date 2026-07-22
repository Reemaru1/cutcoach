'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
const packageJson=JSON.parse(read('package.json'));
const release=packageJson.version;
const releaseLabel=release.replace(/-alpha$/,' Alpha');
const index=read('index.html');
const manifest=read('runtime-manifest.js');
const serviceWorker=read('sw.js');
const update=read('update.html');
const loader=read('version-v7.js');
const core=read('core.js');

assert.equal(release,'2.3.0-alpha');
assert.ok(core.includes(`const APP_VERSION = '${release}'`),'Kernversion weicht von package.json ab.');
assert.ok(loader.includes(`const RELEASE='${releaseLabel}'`),'Sichtbare Version weicht von package.json ab.');
assert.ok(manifest.includes(`version:'${release}'`),'Runtime-Version weicht von package.json ab.');
assert.ok(serviceWorker.includes(`runtime-manifest.js?v=${release}`),'Service Worker lädt eine andere Runtime-Version.');
assert.ok(update.includes(`sw.js?v=${release}`),'Update-Seite lädt eine andere Service-Worker-Version.');
assert.ok(index.includes(`version-v7.js?v=${release}`),'Index lädt den Versionsloader nicht cache-sicher.');

assert.equal(packageJson.scripts.test,'node tests/run-suite.js');
const runner=read('tests/run-suite.js');
assert.match(runner,/readdirSync\(__dirname\)/,'Test-Runner erkennt Tests nicht automatisch.');
assert.match(runner,/endsWith\('\.test\.js'\)/,'Test-Runner filtert Regressionstests nicht zuverlässig.');

const manifestUrls=[...manifest.matchAll(/'\.\/([^']+)'/g)].map(match=>match[1]);
const manifestByPath=new Map();
for(const url of manifestUrls){
  const file=url.split('?')[0];
  assert.ok(exists(file),`Runtime-Manifest verweist auf fehlende Datei: ${file}`);
  const versions=manifestByPath.get(file)||[];
  versions.push(url);
  manifestByPath.set(file,versions);
}
for(const [file,urls] of manifestByPath){
  assert.equal(urls.length,1,`Runtime-Manifest enthält ${file} mehrfach: ${urls.join(', ')}`);
}

for(const match of index.matchAll(/(?:src|href)="([^"#]+)"/g)){
  const url=match[1];
  if(/^https?:/.test(url))continue;
  const file=url.replace(/^\.\//,'').split('?')[0];
  assert.ok(exists(file),`Index verweist auf fehlende Datei: ${file}`);
  if(!/\.(?:css|js)(?:\?|$)/.test(url))continue;
  assert.ok(manifestUrls.includes(url.replace(/^\.\//,'')),`Index-Asset ist nicht unter derselben URL offline verfügbar: ${url}`);
}

for(const url of ['glass-nav-v131.js?v=1.3.7-alpha','scrollbar-cleanup-v209.css?v=2.0.9-alpha']){
  assert.ok(loader.includes(url)||read('glass-nav-v131.js').includes(url),`Produktionsloader fordert ${url} nicht an.`);
  assert.ok(manifestUrls.includes(url),`Runtime-Manifest cached ${url} nicht.`);
}

const start=loader.match(/const start=\(\)=>\{([^}]+)\}/)?.[1]||'';
for(const duplicate of ['loadNutrition110()','loadNutritionVoice111()','loadNutritionMulti120()']){
  assert.ok(!start.includes(duplicate),`Startsequenz lädt ${duplicate} redundant.`);
}

const removed=[
  'backups','native_app','staging','nav-preview.html','nutrition-hardening.js',
  'nutrition-multisearch-canonical-125.js','nutrition-multisearch-canonical-126.js',
  'nutrition-multisearch-canonical-127.js','nutrition-search-learning-v160.js',
  'journal-live-nav-v127.css','body-progress-v210.js','body-progress-v211.js',
  'body-progress-v212-fix.js'
];
for(const target of removed)assert.ok(!exists(target),`Historische Altlast ist noch vorhanden: ${target}`);
assert.ok(exists('staging-v2/index.html')&&exists('staging-v2/staging-nav.css')&&exists('staging-v2/staging-nav.js'),'Isoliertes Staging ist unvollständig.');
const stagingNav=read('staging-v2/staging-nav.js');
assert.match(stagingNav,/if\(!button\.querySelector\('\.cc-nav-icon'\)\)button\.innerHTML=icon/,'Staging-Navigation kann eine MutationObserver-Schleife auslösen.');
assert.doesNotMatch(read('nutrition-multisearch-canonical-128.js'),/function exactMatch\(/,'Ungenutzte exactMatch-Hülle ist zurückgekehrt.');

console.log('Repository-Integrität: Versionen, Offline-Assets, Testentdeckung und Altlasten geprüft.');
