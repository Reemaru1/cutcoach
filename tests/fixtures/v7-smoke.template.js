'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM,VirtualConsole}=require('jsdom');

const project=path.resolve(__dirname,'..');
const indexSource=fs.readFileSync(path.join(project,'index.html'),'utf8');
const html=indexSource.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
const errors=[];
const virtualConsole=new VirtualConsole();
virtualConsole.on('jsdomError',error=>errors.push(error));
virtualConsole.on('error',error=>errors.push(error));

const dom=new JSDOM(html,{
  url:'https://example.test/cutcoach/index.html#today',
  runScripts:'dangerously',
  pretendToBeVisual:true,
  virtualConsole
});
const {window}=dom;

window.scrollTo=()=>{};
window.HTMLElement.prototype.scrollIntoView=()=>{};
window.alert=()=>{};
window.confirm=()=>true;
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
window.CSS=window.CSS||{};
window.CSS.escape=window.CSS.escape||((value)=>String(value).replace(/[^a-zA-Z0-9_-]/g,'\\$&'));
Object.defineProperty(window.navigator,'onLine',{value:true,configurable:true});
Object.defineProperty(window.navigator,'storage',{value:{persist:async()=>true,persisted:async()=>true,estimate:async()=>({usage:2048})},configurable:true});
Object.defineProperty(window.navigator,'vibrate',{value:()=>true,configurable:true});

const today=new Date();
const todayKey=`${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
window.localStorage.setItem('cutcoach_v2',JSON.stringify({
  settings:{age:28,height:179,calories:2300,maintenance:3000,protein:190,fat:65,carbs:200,steps:6000,gymGoal:5,goalWeight:90},
  days:{},onboarded:true,meta:{schemaVersion:6,createdAt:new Date().toISOString(),lastBackupAt:null}
}));
window.localStorage.setItem('cutcoach_library_v1',JSON.stringify({version:3,items:[]}));

const scripts=[
  'core.js','render.js','actions.js','app.js','food-catalog.js','library.js','library-init.js',
  'scanner-v2.js','off-lookup.js','upgrade-340.js','nutrition.js','journal.js','water-animation.js',
  'nutrition-v7.js','ui-effects-v7.js','version-v7.js'
];
for(const name of scripts){
  const script=window.document.createElement('script');
  script.textContent=`${fs.readFileSync(path.join(project,name),'utf8')}\n//# sourceURL=${name}`;
  window.document.head.append(script);
}
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
const node=selector=>{
  const found=window.document.querySelector(selector);
  assert.ok(found,`Element fehlt: ${selector}`);
  return found;
};
const click=selector=>{
  const target=node(selector);
  target.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
  return target;
};
const input=(selector,value)=>{
  const target=node(selector);
  target.value=String(value);
  target.dispatchEvent(new window.Event('input',{bubbles:true}));
  return target;
};

(async()=>{
  await wait(550);

  assert.equal(node('#appVersion').textContent,'Version 7.1.0','Sichtbare Releaseversion ist nicht zentral auf 7.1.0');
  assert.equal(window.CUTCOACH_RELEASE,'7.1.0','Zentrale Releasekonstante fehlt');
  assert.ok(node('#today560'),'Tagebuch wurde nicht aufgebaut');
  assert.ok(node('#journalFinishDay'),'Tagesabschluss fehlt');
  assert.equal(window.document.querySelectorAll('.water-v7-marks').length,0,'Unnötige Liter-Markierungen sind noch sichtbar');
  assert.equal(window.document.querySelectorAll('.water-v7-bubbles i').length,4,'Wasserbläschen fehlen');
  assert.equal(window.document.querySelectorAll('.macro-v7-gap').length,3,'Makro-Restwerte fehlen');

  const coach=node('.journal-coach-card.coach-v71');
  assert.equal(coach.dataset.coachVersion,'7.1','CutCoach Impuls wurde nicht auf 7.1 aktualisiert');
  assert.equal(window.document.querySelectorAll('.coach-v71-pillars article').length,3,'Die drei Coaching-Bereiche fehlen');
  assert.match(node('#journalCoachText').textContent,/Kernbereichen/,'Die Datenabdeckung des Coaches fehlt');
  assert.match(node('#coachV71FocusTitle').textContent,/Mahlzeit/,'Der leere Tag priorisiert nicht die erste Mahlzeit');
  assert.equal(node('#coachV71Action').dataset.action,'meal','Die primäre Coach-Aktion ist nicht ausführbar');
  assert.match(node('#coachV71Coverage').textContent,/0 von 6/,'Leerer Tag hat eine falsche Datenabdeckung');

  const effectsCss=fs.readFileSync(path.join(project,'ui-effects-v7.css'),'utf8');
  assert.doesNotMatch(effectsCss,/25%\s*·\s*50%\s*·\s*75%/,'Unnötige Schritt-Prozentmarken sind noch im CSS');
  assert.match(effectsCss,/\.journal-step-progress:after\{content:none!important;display:none!important\}/,'Schritt-Zusatzskala wird nicht zuverlässig ausgeblendet');
  assert.match(effectsCss,/\.water-v7-marks\{display:none!important\}/,'Liter-Markierungen werden nicht defensiv ausgeblendet');

  click('#coachV71Action');
  await wait(60);
  assert.equal(node('[data-screen="food"]').classList.contains('active'),true,'Coach-Aktion öffnet den Ernährungsbereich nicht');
  assert.equal(window.document.body.classList.contains('nutrition-mode'),true,'Ernährungsmodus wurde nicht aktiviert');
  assert.ok(node('#nutritionV7Analysis'),'Erweiterte Nährwertanalyse fehlt');

  input('#nutritionSearch','haferflocken');
  await wait(30);
  const oatsResult=node('[data-nutrition-open="bls:C133000"]');
  oatsResult.dispatchEvent(new window.MouseEvent('click',{bubbles:true,cancelable:true}));
  await wait(20);
  assert.equal(node('#nutritionDetailModal').classList.contains('open'),true,'Lebensmittel-Detailansicht öffnet nicht');
  assert.match(node('#nutritionDetailSource').textContent,/BLS 4\.0/,'BLS-Herkunft fehlt in der Detailansicht');
  assert.equal(node('#nutritionDetailAmount').value,'100','Detailansicht startet nicht mit der Basisportion');
  click('[data-detail-close]');

  click('#nutritionRecipe');
  await wait(30);
  assert.equal(node('#recipeV7Modal').classList.contains('open'),true,'Neues Rezeptstudio öffnet nicht');
  input('#recipeV7Name','Hafer-Testrezept');
  input('#recipeV7Servings',2);
  input('#recipeV7Search','haferflocken');
  await wait(20);
  click('[data-recipe-ingredient="bls:C133000"]');
  input('#recipeV7Amount',200);
  click('#recipeV7Add');
  assert.equal(window.document.querySelectorAll('.recipe-v7-row').length,1,'Rezeptzutat wurde nicht übernommen');
  assert.equal(node('#recipeV7TotalKcal').textContent,'696 kcal','Gesamtkalorien des Rezepts sind falsch');
  assert.equal(node('#recipeV7ServingKcal').textContent,'348 kcal','Kalorien pro Portion sind falsch');
  assert.equal(node('#recipeV7Save').disabled,false,'Gültiges Rezept bleibt nicht speicherbar');
  click('#recipeV7Save');
  await wait(40);

  const library=window.CutCoachLibrary.exportData();
  const recipe=library.items.find(item=>item.name==='Hafer-Testrezept');
  assert.ok(recipe,'Gespeichertes Rezept fehlt in der Bibliothek');
  assert.equal(recipe.kind,'recipe','Rezept wurde als falscher Typ gespeichert');
  assert.equal(recipe.amount,1,'Rezeptbasis ist nicht eine Portion');
  assert.equal(recipe.unit,'Portion','Rezepteinheit ist nicht Portion');
  assert.equal(recipe.calories,348,'Gespeicherte Portionskalorien sind falsch');
  assert.equal(recipe.protein,13.22,'Gespeichertes Portionseiweiß ist falsch');

  const metadata=window.CutCoachNutritionV7.recipeMeta()[recipe.id];
  assert.ok(metadata,'Stabile Rezeptmetadaten fehlen');
  assert.equal(metadata.servings,2,'Portionsanzahl wurde nicht gespeichert');
  assert.equal(metadata.components[0].amount,200,'Exakte Zutatenmenge wurde nicht gespeichert');
  assert.equal(metadata.components[0].nutrients.calories,348,'Nährwert-Snapshot der Zutat fehlt');

  window.CutCoachNutritionV7.openRecipeEditor(recipe.id);
  await wait(20);
  assert.equal(window.document.querySelectorAll('.recipe-v7-row').length,1,'Gespeichertes Rezept lässt sich nicht erneut bearbeiten');
  assert.equal(node('#recipeV7TotalKcal').textContent,'696 kcal','Rezept verliert beim erneuten Öffnen seine Berechnung');
  click('[data-recipe-v7-close]');

  window.CutCoachNutritionV7.openDetail(recipe.id);
  await wait(20);
  assert.equal(node('#nutritionDetailDuplicate').hidden,false,'Rezept kann in der Detailansicht nicht dupliziert werden');
  click('#nutritionDetailAdd');
  await wait(40);
  const savedState=JSON.parse(window.localStorage.getItem('cutcoach_v2'));
  const day=savedState.days[todayKey];
  assert.ok(day?.meals?.some(meal=>meal.name==='Hafer-Testrezept'&&meal.source==='recipe'),'Rezept wurde nicht als Tagesmahlzeit gespeichert');
  assert.equal(day.meals.find(meal=>meal.name==='Hafer-Testrezept').calories,348,'Eingetragene Rezeptportion hat falsche Kalorien');

  window.render();
  await wait(30);
  assert.equal(node('#appVersion').textContent,'Version 7.1.0','Rendern überschreibt die Releaseversion');
  assert.ok(node('#journalSummaryModal'),'Tagesabschluss-Dialog fehlt nach Rendern');
  assert.equal(window.document.querySelectorAll('#today560').length,1,'Rendern dupliziert das Tagebuch');
  assert.equal(window.document.querySelectorAll('#recipeV7Modal').length,1,'Rendern dupliziert das Rezeptstudio');
  assert.equal(window.document.querySelectorAll('.journal-coach-card.coach-v71').length,1,'Rendern dupliziert oder verliert den CutCoach Impuls');
  assert.equal(window.document.querySelectorAll('.coach-v71-pillars article').length,3,'Coaching-Bereiche werden beim Rendern beschädigt');
  assert.equal(window.document.querySelectorAll('.water-v7-marks').length,0,'Liter-Markierungen kehren beim Rendern zurück');
  assert.equal(errors.length,0,`Unerwartete Browserfehler: ${errors.map(error=>error.message||String(error)).join(' | ')}`);

  const manifest=fs.readFileSync(path.join(project,'runtime-manifest.js'),'utf8');
  const sw=fs.readFileSync(path.join(project,'sw.js'),'utf8');
  const update=fs.readFileSync(path.join(project,'update.html'),'utf8');
  assert.match(manifest,/version:'7\.1\.0'/,'Runtime-Manifest hat eine falsche Version');
  assert.match(sw,/runtime-manifest\.js\?v=7\.1\.0/,'Service Worker lädt ein veraltetes Manifest');
  assert.match(update,/sw\.js\?v=7\.1\.0-force/,'Erzwungener Installer lädt einen veralteten Service Worker');
  assert.match(update,/updated=710/,'Update-Weiterleitung hat einen veralteten Marker');
  assert.equal(indexSource.includes('nutrition-hardening.js'),false,'Alte Nutrition-Hardening-Schicht wird noch geladen');

  for(const asset of ['ui-effects-v7.js','ui-effects-v7.css']){
    assert.ok(indexSource.includes(`${asset}?v=7.1.1`),`Index lädt ${asset} nicht cache-sicher`);
    assert.ok(manifest.includes(`./${asset}?v=7.1.1`),`Offline-Manifest enthält ${asset} nicht in Version 7.1.1`);
    assert.ok(fs.existsSync(path.join(project,asset)),`Datei fehlt: ${asset}`);
  }
  assert.ok(indexSource.includes('version-v7.js?v=2.3.0-alpha'),'Index lädt die Releaseversion nicht cache-sicher');
  assert.ok(manifest.includes('./version-v7.js?v=2.3.0-alpha'),'Offline-Manifest enthält die aktuelle Releaseversion nicht');
  for(const asset of ['nutrition-v7.js','nutrition-v7.css']){
    assert.ok(indexSource.includes(`${asset}?v=7.0.0`),`Index lädt ${asset} nicht`);
    assert.ok(manifest.includes(`./${asset}?v=7.0.0`),`Offline-Manifest enthält ${asset} nicht`);
  }

  console.log('CutCoach 7.1 smoke test: ok');
  dom.window.close();
})().catch(error=>{
  console.error(error);
  dom.window.close();
  process.exitCode=1;
});
