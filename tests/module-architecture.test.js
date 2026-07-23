'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const index=read('index.html'),manifest=read('runtime-manifest.js'),nutrition=read('nutrition.js'),app=read('app.js'),architecture=read('docs/architecture.md');
const modules=[
  'src/shared/module-registry.js',
  'src/shared/product-insights.js',
  'src/shared/ui.js',
  'src/features/journal/index.js',
  'src/features/journal/dashboard-v800.js',
  'src/features/nutrition/index.js',
  'src/features/progress/index.js'
];

for(const file of modules){
  assert.ok(fs.existsSync(path.join(root,file)),`Modul fehlt: ${file}`);
  const version=file.endsWith('dashboard-v800.js')?'8.2.2-alpha':file.endsWith('product-insights.js')||file.endsWith('ui.js')||file.endsWith('features/nutrition/index.js')?'1.1.0-alpha':'1.0.0-alpha';
  const url=`${file}?v=${version}`;
  assert.ok(index.includes(`src="${url}"`),`Index lädt ${file} nicht.`);
  assert.ok(manifest.includes(`'./${url}'`),`Offline-Manifest enthält ${file} nicht.`);
}

for(const file of ['src/shared/design-system-v800.css','src/features/journal/dashboard-v800.css']){
  assert.ok(fs.existsSync(path.join(root,file)),`Designmodul fehlt: ${file}`);
  const version=file.endsWith('dashboard-v800.css')?'8.2.2-alpha':'8.0.1-alpha';
  assert.ok(index.includes(`${file}?v=${version}`),`Index lädt ${file} nicht.`);
  assert.ok(manifest.includes(`'./${file}?v=${version}'`),`Offline-Manifest enthält ${file} nicht.`);
}

assert.match(app,/track\('onboarding_shown'\)/,'Onboarding-Anzeige wird nicht gemessen.');
assert.match(app,/track\('onboarding_completed'\)/,'Onboarding-Abschluss wird nicht gemessen.');
const searchEvent=nutrition.match(/cutcoach:nutrition-search-rendered',[\s\S]*?detail:\{([^}]+)\}/)?.[1]||'';
assert.ok(searchEvent,'Ernährungssuche veröffentlicht kein anonymes Ergebnisereignis.');
assert.doesNotMatch(searchEvent,/(?:^|,)\s*(?:query|displayQuery)\s*:/,'Suchtext darf nicht im Qualitätsereignis stehen.');
assert.match(index,/Keine Suchtexte, Gewichte oder Gesundheitswerte/,'Datenschutzhinweis zur Qualitätsmessung fehlt.');
assert.match(architecture,/Schrittweise Modulstruktur/);
assert.match(architecture,/Kundenorientierte Qualitätsmessung/);

console.log('Modulstruktur, Offline-Ladepfad und datensparsame Messpunkte geprüft.');
