'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const dom=new JSDOM(html);
const document=dom.window.document;

const ids=[...document.querySelectorAll('[id]')].map(node=>node.id);
const duplicates=ids.filter((id,index)=>ids.indexOf(id)!==index);
assert.deepEqual([...new Set(duplicates)],[],'index.html enthält doppelte IDs.');

for(const id of ['datePicker','previousDay','nextDay','todayButton','stepsInput','saveSteps','mealModal','weightModal','toast','appVersion','reloadUpdate']){
  assert.ok(document.getElementById(id),`Erforderliches App-Element fehlt: #${id}`);
}
for(const screen of ['today','food','progress','settings']){
  assert.ok(document.querySelector(`[data-screen="${screen}"]`),`Bildschirm fehlt: ${screen}`);
  assert.ok(document.querySelector(`[data-tab="${screen}"]`),`Navigationsziel fehlt: ${screen}`);
}

const localAssets=[
  ...[...document.querySelectorAll('script[src]')].map(node=>node.getAttribute('src')),
  ...[...document.querySelectorAll('link[rel="stylesheet"][href]')].map(node=>node.getAttribute('href'))
].filter(value=>value&&!/^https?:/i.test(value));
for(const asset of localAssets){
  const file=asset.split(/[?#]/)[0].replace(/^\.\//,'');
  assert.ok(fs.existsSync(path.join(root,file)),`In index.html referenzierte Datei fehlt: ${file}`);
}

const scripts=[...document.querySelectorAll('script[src]')].map(node=>node.getAttribute('src'));
const position=name=>scripts.findIndex(src=>src.startsWith(name));
assert.ok(position('core.js')>=0&&position('core.js')<position('app.js'),'core.js muss vor app.js geladen werden.');
assert.ok(position('library.js')<position('nutrition.js'),'Bibliothek muss vor dem Ernährungsmodul geladen werden.');
assert.ok(position('version-v7.js')>position('journal.js'),'Release-Loader muss nach den Basismodulen geladen werden.');
for(const script of document.querySelectorAll('script[src]:not([src^="http"])'))assert.ok(script.hasAttribute('defer'),`Lokales Script muss defer verwenden: ${script.src}`);

console.log(`${ids.length} DOM-IDs und ${localAssets.length} lokale App-Shell-Assets geprüft.`);
