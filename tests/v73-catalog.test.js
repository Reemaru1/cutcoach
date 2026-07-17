'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const project=path.resolve(__dirname,'..');
const dom=new JSDOM('<!doctype html><html><head></head><body></body></html>',{runScripts:'dangerously'});
const {window}=dom;
for(const name of ['food-catalog.js','everyday-catalog-v73.js']){
  const script=window.document.createElement('script');
  script.textContent=`${fs.readFileSync(path.join(project,name),'utf8')}\n//# sourceURL=${name}`;
  window.document.head.append(script);
}
const catalog=window.CutCoachFoodCatalog;
const everyday=window.CutCoachEverydayCatalog;
assert.ok(catalog,'Gesamtkatalog fehlt');
assert.ok(everyday,'Alltagskatalog fehlt');
assert.equal(everyday.meta.version,'7.3.0','Alltagskatalog hat falsche Version');
assert.ok(everyday.meta.count>=55,`Zu wenige Alltagsgerichte erzeugt: ${everyday.meta.count}; fehlend: ${everyday.meta.missing.join(', ')}`);
assert.ok(catalog.meta.everydayCount>=55,'Alltagsgerichte fehlen im Gesamtkatalog');

for(const id of ['ccde:butterbrezel','ccde:kaesesemmel','ccde:doner-kalb','ccde:durum-kalb','ccde:leberkaessemmel','ccde:currywurst-pommes']){
  const item=catalog.get(id);
  assert.ok(item,`Pflichtgericht fehlt: ${id}`);
  assert.equal(item.source,'cutcoach',`${id} hat falsche Quelle`);
  assert.ok(item.calories>0&&item.amount>0,`${id} hat ungültige Portionswerte`);
  assert.ok(item.components.length>=1,`${id} hat keine Komponenten`);
  assert.ok(item.components.every(component=>component.source==='bls'&&component.sourceId),`${id} ist nicht vollständig aus BLS-Komponenten berechnet`);
}
const butter=catalog.get('ccde:butterbrezel');
assert.ok(butter.aliases.some(alias=>/Brezn/i.test(alias)),'Bayerische Brezen-Aliase fehlen');
const durum=catalog.get('ccde:durum-kalb');
assert.ok(durum.aliases.some(alias=>/Yufka/i.test(alias)),'Yufka-Alias fehlt');
assert.ok(catalog.items().length>=7064+everyday.meta.count,'Gesamtkatalog verliert BLS-Einträge');
assert.ok(catalog.suggestions('Mittagessen').some(item=>item.id==='ccde:doner-kalb'),'Döner fehlt in den Mittagsempfehlungen');
console.log(`CutCoach 7.3 everyday catalog: ${everyday.meta.count} dishes, ok`);
dom.window.close();
