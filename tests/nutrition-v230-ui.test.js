'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/features/nutrition/nutrition-v230.js'),'utf8');
const dom=new JSDOM(`<!doctype html><body>
  <div class="modal" id="offResultModal"><div class="sheet"><div class="sheet-head"><h2 id="offResultTitle">Produkt aktualisiert</h2><button aria-label="Schließen">×</button></div>
    <div id="offResultCard" class="off-result-card"><img src="https://example.test/product.png"><div><b>Joghurt Knusperherzen</b><small>125 kcal · 4 g Eiweiß · 15,4 g KH</small><small>Werte wurden aktualisiert.</small></div></div>
    <div class="off-result-actions"><button id="offSaveOnly">In Bibliothek lassen</button><button id="offEatNow">Jetzt essen</button><button id="offEditNow">Bearbeiten</button></div><div class="off-result-source">Open Food Facts</div>
  </div></div>
  <div class="modal" id="libraryUseModal"><div class="sheet"><div class="sheet-head"><h2 id="libraryUseTitle">Joghurt Knusperherzen</h2><button aria-label="Schließen">×</button></div>
    <div id="libraryUseSummary"><b>Joghurt Knusperherzen</b><small>Basis: 100 g · Produktdaten</small></div>
    <section class="library-portion-editor"><strong>Deine Menge</strong><div class="exact-amount"><input><span>g</span></div><div class="library-portion-presets"></div></section>
    <label>Kategorie<select id="libraryMealType"><option>Snack</option></select></label><div id="factorPreview"><strong>125 kcal</strong><span>E 4 g</span><span>KH 15,4 g</span><span>F 4,9 g</span></div>
    <button id="addLibraryMeal">Für diesen Tag eintragen</button>
  </div></div>
</body>`,{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
const script=window.document.createElement('script');
script.textContent=source;
window.document.head.append(script);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

const wait=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));
(async()=>{
  await wait(40);
  const actions=window.document.querySelector('.off-result-actions');
  assert.equal(actions.firstElementChild.id,'offEatNow','Der direkte Eintrag ist nicht die primäre Produktaktion.');
  assert.equal(window.document.querySelector('#offEatNow b').textContent,'Jetzt eintragen');
  assert.equal(window.document.querySelector('#offSaveOnly b').textContent,'Fertig');
  assert.equal(window.document.querySelector('#offEditNow b').textContent,'Produkt bearbeiten');
  assert.ok(window.document.querySelector('#offResultCard .nutrition-v230-product-copy'),'Die alte Produktkarte wurde nicht modernisiert.');
  assert.equal(window.document.querySelector('#addLibraryMeal b').textContent,'Zum Tagebuch hinzufügen');
  assert.ok(window.document.querySelector('#libraryUseModal .nutrition-v230-portion-editor'),'Der Portionseditor verwendet nicht das neue Design.');

  const summary=window.document.querySelector('#libraryUseSummary');
  summary.innerHTML='<b>Neuer Produktname</b><small>Basis: 250 ml</small>';
  await wait(40);
  assert.equal(summary.querySelector('.nutrition-v230-product-copy strong').textContent,'Neuer Produktname','Dynamisch aktualisierte Produktdaten verlieren das neue Design.');

  dom.window.close();
  console.log('Ernährung 2.3: Produktbestätigung und Portionseintrag modern, dynamisch und handlungsorientiert geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
