'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');

const nav=read('glass-nav-v131.js');
const runtime=read('runtime-manifest.js');
const sw=read('sw.js');
const css=read('liquid-glass-ui-v207.css');

assert.match(nav,/const VERSION='1\.3\.3-alpha'/);
assert.match(nav,/function ensureProductionUi\(\)/);
assert.match(nav,/addStyle\('nutrition-ui-consistency-v206','\.\/nutrition-ui-consistency-v206\.css\?v=2\.0\.8-loader'\)/);
assert.match(nav,/addStyle\('liquid-glass-ui-v207','\.\/liquid-glass-ui-v207\.css\?v=2\.0\.8-loader'\)/);
assert.match(nav,/addScript\('nutrition-ui-consistency-v206','\.\/nutrition-ui-consistency-v206\.js\?v=2\.0\.8-loader'\)/);
assert.match(nav,/function enhance\(\)\{\s*ensureProductionUi\(\);/);
assert.match(nav,/function start\(\)\{ensureProductionUi\(\);if\(enhance\(\)\)return/);
assert.ok(nav.indexOf("addStyle('nutrition-ui-consistency-v206'")<nav.indexOf("addStyle('liquid-glass-ui-v207'"),'Die Liquid-Glass-Schicht muss nach der Modal-/Berechnungsschicht registriert werden.');

assert.match(runtime,/version:'1\.2\.7-alpha'/);
assert.match(runtime,/glass-nav-v131\.js\?v=1\.3\.3-alpha/);
assert.match(runtime,/liquid-glass-ui-v207\.css\?v=2\.0\.8-loader/);
assert.match(runtime,/nutrition-ui-consistency-v206\.js\?v=2\.0\.8-loader/);
assert.match(sw,/runtime-manifest\.js\?v=1\.2\.7-alpha/);
assert.match(sw,/PRODUCTION_UI_ASSETS/);
assert.match(sw,/glass-nav-v131\.js\?v=1\.3\.3-alpha/);
assert.match(sw,/nutrition-ui-consistency-v206\.css\?v=2\.0\.8-loader/);
assert.match(sw,/liquid-glass-ui-v207\.css\?v=2\.0\.8-loader/);
assert.match(sw,/ui208-production-loader/);
assert.match(sw,/const CACHE_NAME=`\$\{VOICE_CACHE\}-energy143`/);
assert.match(css,/#journalMacroClose/);
assert.match(css,/backdrop-filter:blur\(34px\)/);

console.log('Produktionsloader 2.0.8: Berechnungs-, Modal- und Liquid-Glass-Schichten werden im aktiven Produktionspfad nachgeladen und explizit gecacht.');