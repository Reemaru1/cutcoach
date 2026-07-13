'use strict';

(function(){
  const VERSION='3.3.0';
  const API_V2='https://world.openfoodfacts.org/api/v2/product/';
  const API_V0='https://world.openfoodfacts.org/api/v0/product/';
  const FIELDS='code,product_name,product_name_de,brands,quantity,serving_size,nutriments,image_front_small_url,image_url';
  let originalLookup=null;
  let busy=false;
  let resultItemId=null;

  function $(selector){return document.querySelector(selector);}
  function waitForLibrary(){
    const button=$('#lookupManualCode');
    if(!button||!window.CutCoachLibrary){setTimeout(waitForLibrary,120);return;}
    originalLookup=button.onclick;
    button.onclick=lookupWithOpenFoodFacts;
    ensureResultModal();
    const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }

  function cleanCode(value){return String(value||'').replace(/[^0-9A-Za-z._-]/g,'').slice(0,64);}
  function escapeHtml(value){return String(value||'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));}
  function number(value){
    if(typeof value==='string')value=value.replace(',','.').trim();
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?Math.round(n*10)/10:0;
  }
  function firstNumber(object,keys){for(const key of keys){const value=number(object?.[key]);if(value>0)return value;}return 0;}
  function setScannerStatus(text,state='info'){const node=$('#scannerStatus');if(node){node.textContent=text;node.dataset.state=state;}}
  function productName(product){
    const name=String(product.product_name_de||product.product_name||product.generic_name_de||product.generic_name||'').trim();
    const brand=String(product.brands||'').split(',')[0].trim();
    if(name&&brand&&!name.toLowerCase().includes(brand.toLowerCase()))return `${brand} – ${name}`.slice(0,80);
    return (name||brand||'Unbekanntes Produkt').slice(0,80);
  }
  function nutrition(product){
    const n=product?.nutriments||product?.nutritional_data||{};
    let calories=firstNumber(n,['energy-kcal_100g','energy-kcal','energy_kcal_100g','energy_kcal']);
    if(!calories){const kj=firstNumber(n,['energy_100g','energy','energy-kj_100g','energy-kj']);if(kj)calories=Math.round(kj/4.184*10)/10;}
    return {calories,protein:firstNumber(n,['proteins_100g','protein_100g','proteins','protein']),carbs:firstNumber(n,['carbohydrates_100g','carbohydrate_100g','carbohydrates','carbohydrate']),fat:firstNumber(n,['fat_100g','fats_100g','fat','fats'])};
  }
  function hasUsefulNutrition(values){return values.calories>0&&(values.protein>0||values.carbs>0||values.fat>0);}

  async function requestJson(url){
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    try{const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal,cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}
    finally{clearTimeout(timeout);}
  }
  async function fetchProduct(code){
    let firstProduct=null;
    try{const v2=await requestJson(`${API_V2}${encodeURIComponent(code)}.json?fields=${encodeURIComponent(FIELDS)}`);if(v2?.status===1&&v2.product){firstProduct=v2.product;if(hasUsefulNutrition(nutrition(firstProduct)))return firstProduct;}}catch(error){console.warn('Open Food Facts v2 failed',error);}
    try{const v0=await requestJson(`${API_V0}${encodeURIComponent(code)}.json`);if(v0?.status===1&&v0.product)return v0.product;}catch(error){console.warn('Open Food Facts v0 failed',error);}
    return firstProduct;
  }

  function saveProduct(code,product,values){
    const db=window.CutCoachLibrary.exportData();
    const existing=db.items.find(item=>item.barcode===code);
    const item={id:existing?.id||`off_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,name:productName(product),kind:'food',barcode:code,amount:100,unit:'g',calories:values.calories,protein:values.protein,carbs:values.carbs,fat:values.fat,favorite:Boolean(existing?.favorite),uses:existing?.uses||0,lastUsedAt:existing?.lastUsedAt||null,createdAt:existing?.createdAt||new Date().toISOString(),components:[]};
    if(existing)Object.assign(existing,item);else db.items.push(item);
    window.CutCoachLibrary.importData(db);
    return {item,isExisting:Boolean(existing)};
  }

  function openManualWithPrefill(code,product=null,values=null){
    originalLookup?.();
    setTimeout(()=>{if(product){const name=$('#libName');if(name)name.value=productName(product);if(values){[['#libCalories',values.calories],['#libProtein',values.protein],['#libCarbs',values.carbs],['#libFat',values.fat]].forEach(([selector,value])=>{const input=$(selector);if(input&&Number.isFinite(value))input.value=value||'';});}}const barcode=$('#libBarcode');if(barcode)barcode.value=code;},120);
  }

  function ensureResultModal(){
    if($('#offResultModal'))return;
    const style=document.createElement('style');style.textContent='.off-result-card{display:grid;grid-template-columns:76px 1fr;gap:14px;align-items:center;padding:14px;border-radius:18px;background:#182238}.off-result-card.no-image{grid-template-columns:1fr}.off-result-card img{width:76px;height:76px;border-radius:14px;object-fit:contain;background:#fff}.off-result-card b,.off-result-card small{display:block}.off-result-card small{color:var(--muted);margin-top:5px}.off-result-actions{display:grid;gap:9px;margin-top:14px}.off-result-actions .secondary{width:100%}.off-result-source{text-align:center;color:var(--muted);font-size:11px;margin-top:10px}';document.head.appendChild(style);
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="offResultModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="offResultTitle"><div class="sheet"><div class="sheet-head"><h2 id="offResultTitle">Produkt gespeichert</h2><button id="offResultClose" type="button" aria-label="Schließen">×</button></div><div id="offResultCard"></div><div class="off-result-actions"><button id="offSaveOnly" type="button">✓ Nur in Bibliothek speichern</button><button id="offEatNow" class="secondary" type="button">🍽️ Jetzt essen</button><button id="offEditNow" class="secondary" type="button">✏️ Bearbeiten</button></div><div class="off-result-source">Nährwerte: Open Food Facts · Basis 100 g</div></div></div>`);
    $('#offResultClose').onclick=closeResult;
    $('#offSaveOnly').onclick=closeResult;
    $('#offEatNow').onclick=()=>openLibraryAction('use');
    $('#offEditNow').onclick=()=>openLibraryAction('edit');
    $('#offResultModal').addEventListener('click',event=>{if(event.target.id==='offResultModal')closeResult();});
  }
  function closeResult(){closeModal($('#offResultModal'));resultItemId=null;}
  function openLibraryAction(action){
    const id=resultItemId;closeModal($('#offResultModal'));
    setTimeout(()=>{const button=document.querySelector(action==='edit'?`[data-edit-lib="${CSS.escape(id)}"]`:`[data-use-lib="${CSS.escape(id)}"]`);if(button)button.click();else toast('Produkt wurde gespeichert. Öffne es über die Bibliothek.');},80);
  }
  function showResult(item,product,values,isExisting){
    resultItemId=item.id;
    const image=String(product.image_front_small_url||product.image_url||'');
    const card=$('#offResultCard');card.className=`off-result-card${image?'':' no-image'}`;
    card.innerHTML=`${image?`<img src="${escapeHtml(image)}" alt="">`:''}<div><b>${escapeHtml(item.name)}</b><small>${values.calories} kcal · ${values.protein} g Eiweiß · ${values.carbs} g KH · ${values.fat} g Fett</small><small>${isExisting?'Vorhandener Eintrag wurde aktualisiert.':'Neu zur Bibliothek hinzugefügt.'}</small></div>`;
    $('#offResultTitle').textContent=isExisting?'Produkt aktualisiert':'Produkt gespeichert';
    closeModal($('#scannerModal'));openModal('offResultModal');
  }

  async function lookupWithOpenFoodFacts(){
    if(busy)return;
    const code=cleanCode($('#manualCode')?.value);
    if(!code){toast('Bitte einen gültigen Barcode eingeben.');return;}
    if(!navigator.onLine){toast('Offline: gespeicherte lokale Daten werden verwendet.');originalLookup?.();return;}
    busy=true;const button=$('#lookupManualCode');if(button){button.disabled=true;button.textContent='Suche …';}
    setScannerStatus('Produkt und Nährwerte werden bei Open Food Facts gesucht …');
    try{
      const product=await fetchProduct(code);
      if(!product){setScannerStatus('Produkt nicht bei Open Food Facts gefunden. Werte bitte einmalig eintragen.','error');openManualWithPrefill(code);return;}
      const values=nutrition(product);
      if(!values.calories){setScannerStatus('Produkt gefunden, aber keine verwertbaren Kalorien hinterlegt. Bitte Werte ergänzen.','error');openManualWithPrefill(code,product,values);return;}
      const saved=saveProduct(code,product,values);
      setScannerStatus(`Gefunden: ${saved.item.name} · ${values.calories} kcal/100 g`,'success');
      showResult(saved.item,product,values,saved.isExisting);
    }catch(error){console.warn('Open Food Facts lookup failed',error);toast('Open Food Facts ist gerade nicht erreichbar. Lokale Daten werden verwendet.');originalLookup?.();}
    finally{busy=false;if(button){button.disabled=false;button.textContent='Suchen';}}
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForLibrary,{once:true});else waitForLibrary();
})();