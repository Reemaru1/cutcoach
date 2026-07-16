'use strict';

(function(){
  const KEY='cutcoach_library_v1';
  const RECOVERY_KEY='cutcoach_library_recovery_raw_v1';
  const MAX_ITEMS=1000;
  const FACTORS=[0.5,0.75,1,1.25,1.5,2];
  let db=load();
  let editingId=null;
  let activeItemId=null;
  let stream=null;
  let scanTimer=null;

  function blank(){return {version:1,items:[]};}
  function load(){
    let raw='';
    try{
      raw=localStorage.getItem(KEY)||'';if(!raw)return blank();
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Array.isArray(parsed.items))throw new Error('invalid-library-data');
      return sanitizeDb(parsed);
    }catch{try{if(raw&&!localStorage.getItem(RECOVERY_KEY))localStorage.setItem(RECOVERY_KEY,raw)}catch{}return blank();}
  }
  function save(){
    try{localStorage.setItem(KEY,JSON.stringify(db));return true;}catch{toast('Bibliothek konnte nicht gespeichert werden.');return false;}
  }
  function safeNumber(v,min=0,max=100000){const n=parseNumber(v);return n===null||n<min||n>max?0:Math.round(n*10)/10;}
  function sanitizeBarcode(v){return String(v??'').replace(/[^0-9A-Za-z._-]/g,'').slice(0,64);}
  function sanitizeItem(raw={}){
    const name=cleanText(raw.name,80);if(!name)return null;
    const item={
      id:safeId(raw.id||makeId()),name,kind:raw.kind==='dish'?'dish':'food',barcode:sanitizeBarcode(raw.barcode),
      amount:safeNumber(raw.amount||100,0.1,10000)||100,unit:['g','ml','Stück','Portion'].includes(raw.unit)?raw.unit:'g',
      calories:safeNumber(raw.calories,0,10000),protein:safeNumber(raw.protein,0,1000),carbs:safeNumber(raw.carbs,0,2000),fat:safeNumber(raw.fat,0,1000),
      favorite:Boolean(raw.favorite),uses:Math.max(0,Math.round(Number(raw.uses)||0)),lastUsedAt:validTimestamp(raw.lastUsedAt),createdAt:validTimestamp(raw.createdAt)||new Date().toISOString(),
      components:Array.isArray(raw.components)?raw.components.slice(0,50).map(c=>({itemId:safeId(c.itemId),factor:safeNumber(c.factor,0.01,100)||1})):[]
    };
    return item.calories>0?item:null;
  }
  function sanitizeDb(raw){
    const ids=new Set(),items=[];
    for(const candidate of (Array.isArray(raw?.items)?raw.items:[]).slice(0,MAX_ITEMS)){
      const item=sanitizeItem(candidate);if(!item)continue;while(ids.has(item.id))item.id=makeId();ids.add(item.id);items.push(item);
    }
    return {version:1,items};
  }
  function byId(id){return db.items.find(item=>item.id===id);}
  function nutrition(item,factor=1){return {calories:item.calories*factor,protein:item.protein*factor,carbs:item.carbs*factor,fat:item.fat*factor};}
  function normalized(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

  function mount(){injectUi();bind();renderLibrary();if(location.hash==='#library')switchLibraryTab();}
  function injectUi(){
    if($('#libraryScreen'))return;
    const settings=$('[data-screen="settings"]');
    settings.insertAdjacentHTML('beforebegin',`<section class="screen" data-screen="library" id="libraryScreen">
      <div class="library-hero"><div><span class="badge">⚡ Schnell eintragen</span><h2>Meine Bibliothek</h2><p>Lebensmittel, Gerichte und Barcodes bleiben lokal auf deinem iPhone.</p></div><button id="scanCode" type="button">▣ Scannen</button></div>
      <div class="library-search card"><input id="librarySearch" type="search" placeholder="Köfte, Reis, Whey …" autocomplete="off"><button id="newLibraryItem" type="button">＋ Neu</button></div>
      <div class="library-filters" role="group" aria-label="Bibliothek filtern"><button class="on" data-library-filter="all">Alle</button><button data-library-filter="favorite">★ Favoriten</button><button data-library-filter="recent">Zuletzt</button><button data-library-filter="frequent">Häufig</button></div>
      <div id="libraryStats" class="library-stats"></div><div id="libraryList"></div><div class="library-data-actions"><button id="exportLibrary" class="secondary" type="button">Bibliothek sichern</button><label class="secondary file">Bibliothek importieren<input id="importLibrary" type="file" accept=".json,application/json"></label></div>
    </section>`);
    const nav=$('nav');nav.insertAdjacentHTML('beforeend','<button data-tab="library" type="button" aria-current="false"><span>⭐</span>Bibliothek</button>');
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="libraryItemModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="libraryItemTitle"><div class="sheet">
      <div class="sheet-head"><h2 id="libraryItemTitle">Eintrag speichern</h2><button data-library-close type="button" aria-label="Schließen">×</button></div>
      <div class="segmented"><button data-kind="food" class="on" type="button">Lebensmittel</button><button data-kind="dish" type="button">Gericht</button></div>
      <label>Name<input id="libName" maxlength="80" placeholder="z. B. Köfte mit Reis"></label>
      <div class="two"><label>Bezugsmenge<input id="libAmount" type="number" inputmode="decimal" min="0.1" value="100"></label><label>Einheit<select id="libUnit"><option>g</option><option>ml</option><option>Stück</option><option>Portion</option></select></label></div>
      <div class="two"><label>Kalorien<input id="libCalories" type="number" inputmode="decimal" min="1"></label><label>Eiweiß (g)<input id="libProtein" type="number" inputmode="decimal" min="0" step="0.1"></label></div>
      <div class="two"><label>Kohlenhydrate (g)<input id="libCarbs" type="number" inputmode="decimal" min="0" step="0.1"></label><label>Fett (g)<input id="libFat" type="number" inputmode="decimal" min="0" step="0.1"></label></div>
      <label>Barcode / QR-Code (optional)<input id="libBarcode" maxlength="64" inputmode="numeric" placeholder="Code scannen oder eingeben"></label>
      <div id="recipeBuilder" hidden><div class="notice">Gericht aus vorhandenen Einträgen zusammensetzen. Die Nährwerte werden automatisch addiert.</div><div class="recipe-add"><select id="recipeItem"></select><input id="recipeFactor" type="number" value="1" min="0.01" step="0.25" aria-label="Portionsfaktor"><button id="addRecipeItem" type="button">＋</button></div><div id="recipeComponents"></div></div>
      <label class="favorite-check"><input id="libFavorite" type="checkbox"> Als Favorit markieren</label>
      <div class="button-row"><button id="saveLibraryItem" type="button">Speichern</button><button id="deleteLibraryItem" class="secondary danger-secondary" type="button">Löschen</button></div>
    </div></div>
    <div class="modal" id="libraryUseModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="libraryUseTitle"><div class="sheet">
      <div class="sheet-head"><h2 id="libraryUseTitle">Mahlzeit eintragen</h2><button data-library-close type="button" aria-label="Schließen">×</button></div><div id="libraryUseSummary" class="library-use-summary"></div>
      <label>Portion<select id="libraryFactor">${FACTORS.map(f=>`<option value="${f}" ${f===1?'selected':''}>${String(f).replace('.',',')}×</option>`).join('')}</select></label>
      <label>Kategorie<select id="libraryMealType">${MEAL_TYPES.map(x=>`<option>${x}</option>`).join('')}</select></label><div id="factorPreview" class="notice"></div>
      <button id="addLibraryMeal" type="button">Für diesen Tag eintragen</button>
    </div></div>
    <div class="modal" id="scannerModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="scannerTitle"><div class="sheet scanner-sheet">
      <div class="sheet-head"><h2 id="scannerTitle">Barcode / QR scannen</h2><button data-library-close type="button" aria-label="Schließen">×</button></div>
      <div class="scanner-frame"><video id="scannerVideo" playsinline muted></video><div class="scan-line"></div></div><div id="scannerStatus" class="notice">Kamera wird vorbereitet …</div>
      <div class="scanner-manual"><input id="manualCode" inputmode="numeric" placeholder="Code manuell eingeben"><button id="lookupManualCode" type="button">Suchen</button></div>
      <small class="hint">Die Kamera-Erkennung hängt vom Browser ab. Manuell eingegebene Codes funktionieren immer und werden lokal gespeichert.</small>
    </div></div>`);
    if(!document.querySelector('link[href*="library.css"]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./library.css?v=3.0.0';document.head.appendChild(link);}
  }

  let filter='all';
  function bind(){
    $('#newLibraryItem').onclick=()=>openEditor();$('#scanCode').onclick=startScanner;$('#librarySearch').oninput=renderLibrary;
    $('[data-tab="library"]').onclick=()=>switchLibraryTab();
    $('#exportLibrary').onclick=exportLibraryFile;$('#importLibrary').onchange=e=>{importLibraryFile(e.target.files?.[0]);e.target.value='';};
    $$('[data-library-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.libraryFilter;$$('[data-library-filter]').forEach(x=>x.classList.toggle('on',x===b));renderLibrary();});
    $$('[data-library-close]').forEach(b=>b.onclick=()=>{stopScanner();closeModal(b.closest('.modal'));});
    $$('[data-kind]').forEach(b=>b.onclick=()=>setKind(b.dataset.kind));
    $('#saveLibraryItem').onclick=saveEditor;$('#deleteLibraryItem').onclick=deleteEditor;$('#addLibraryMeal').onclick=addToDay;$('#libraryFactor').onchange=renderUsePreview;
    $('#addRecipeItem').onclick=addComponent;$('#lookupManualCode').onclick=()=>lookupCode($('#manualCode').value);
    $('#scannerModal').addEventListener('click',e=>{if(e.target.id==='scannerModal'){stopScanner();closeModal(e.target);}});
  }
  function switchLibraryTab(){
    $$('[data-tab]').forEach(b=>{const on=b.dataset.tab==='library';b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    $$('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen==='library'));history.replaceState(null,'','#library');window.scrollTo({top:0,behavior:'smooth'});renderLibrary();
  }
  async function exportLibraryFile(){try{await shareOrDownload(JSON.stringify({format:'cutcoach-library',version:1,exportedAt:new Date().toISOString(),data:db},null,2),`CutCoach-Bibliothek-${todayKey()}.json`,'CutCoach Bibliothek');toast('Bibliothek gesichert.');}catch(e){if(e?.name!=='AbortError')toast('Bibliothek konnte nicht exportiert werden.');}}
  function importLibraryFile(file){if(!file)return;if(file.size>3*1024*1024){toast('Datei ist zu groß.');return;}const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result),raw=parsed?.format==='cutcoach-library'?parsed.data:parsed;if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.items))throw new Error('invalid');const clean=sanitizeDb(raw);if(!confirm(`${clean.items.length} Einträge importieren? Die aktuelle Bibliothek wird ersetzt.`))return;const previous=db;db=clean;if(!save()){db=previous;return}renderLibrary();toast('Bibliothek importiert.');}catch{toast('Ungültige Bibliotheksdatei.');}};r.readAsText(file);}
  function renderLibrary(){
    const q=normalized($('#librarySearch')?.value);let items=[...db.items];
    if(q)items=items.filter(i=>normalized(`${i.name} ${i.barcode}`).includes(q));
    if(filter==='favorite')items=items.filter(i=>i.favorite);
    if(filter==='recent')items=items.filter(i=>i.lastUsedAt).sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)));
    else if(filter==='frequent')items.sort((a,b)=>b.uses-a.uses);
    else items.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||b.uses-a.uses||a.name.localeCompare(b.name,'de'));
    setText('#libraryStats',`${db.items.length} gespeichert · ${db.items.filter(i=>i.favorite).length} Favoriten`);
    const wrap=$('#libraryList');if(!items.length){wrap.innerHTML='<article class="card empty">Noch nichts gespeichert. Lege dein erstes Lebensmittel oder Gericht an.</article>';return;}
    wrap.innerHTML=items.map(i=>`<article class="card library-item"><button class="library-main" data-use-lib="${i.id}" type="button"><span class="library-icon">${i.kind==='dish'?'🍽️':'🥫'}</span><span><b>${escapeHtml(i.name)}</b><small>${fmt(i.calories)} kcal · E ${fmt(i.protein)} · KH ${fmt(i.carbs)} · F ${fmt(i.fat)} · ${fmt(i.amount, i.amount%1?1:0)} ${i.unit}</small></span></button><div class="library-side"><button data-fav-lib="${i.id}" class="star ${i.favorite?'on':''}" type="button" aria-label="Favorit">★</button><button data-edit-lib="${i.id}" class="secondary mini" type="button">Bearbeiten</button></div></article>`).join('');
    $$('[data-use-lib]').forEach(b=>b.onclick=()=>openUse(b.dataset.useLib));$$('[data-edit-lib]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editLib));$$('[data-fav-lib]').forEach(b=>b.onclick=()=>{const i=byId(b.dataset.favLib),previous=i.favorite;i.favorite=!i.favorite;if(!save()){i.favorite=previous;return}renderLibrary();});
  }
  function setKind(kind){$$('[data-kind]').forEach(b=>b.classList.toggle('on',b.dataset.kind===kind));$('#recipeBuilder').hidden=kind!=='dish';if(kind==='dish')fillRecipeOptions();}
  function currentKind(){return $('[data-kind].on')?.dataset.kind||'food';}
  function openEditor(id=null,barcode=''){
    editingId=id;const i=id?byId(id):null;setText('#libraryItemTitle',i?'Eintrag bearbeiten':'Eintrag speichern');
    $('#libName').value=i?.name||'';$('#libAmount').value=i?.amount||100;$('#libUnit').value=i?.unit||'g';$('#libCalories').value=i?.calories??'';$('#libProtein').value=i?.protein??'';$('#libCarbs').value=i?.carbs??'';$('#libFat').value=i?.fat??'';$('#libBarcode').value=i?.barcode||barcode;$('#libFavorite').checked=Boolean(i?.favorite);$('#deleteLibraryItem').hidden=!i;
    setKind(i?.kind||'food');$('#recipeBuilder').dataset.components=JSON.stringify(i?.components||[]);renderComponents();openModal('libraryItemModal');
  }
  function saveEditor(){
    const components=JSON.parse($('#recipeBuilder').dataset.components||'[]');const raw={id:editingId||makeId(),kind:currentKind(),name:$('#libName').value,amount:$('#libAmount').value,unit:$('#libUnit').value,calories:$('#libCalories').value,protein:$('#libProtein').value,carbs:$('#libCarbs').value,fat:$('#libFat').value,barcode:$('#libBarcode').value,favorite:$('#libFavorite').checked,components};
    const item=sanitizeItem(raw);if(!item){toast('Name und gültige Kalorien eintragen.');return;}
    if(item.barcode){const duplicate=db.items.find(x=>x.barcode===item.barcode&&x.id!==item.id);if(duplicate&&!confirm(`Dieser Code gehört bereits zu „${duplicate.name}“. Trotzdem speichern?`))return;}
    const idx=db.items.findIndex(x=>x.id===item.id);if(idx<0&&db.items.length>=MAX_ITEMS){toast(`Maximal ${MAX_ITEMS.toLocaleString('de-DE')} Bibliothekseinträge möglich.`);return;}
    const previous=deepClone(db);if(idx>=0){item.uses=db.items[idx].uses;item.lastUsedAt=db.items[idx].lastUsedAt;item.createdAt=db.items[idx].createdAt;db.items[idx]=item;}else db.items.push(item);
    if(!save()){db=previous;return}closeModal($('#libraryItemModal'));renderLibrary();toast('In Bibliothek gespeichert.');
  }
  function deleteEditor(){const i=byId(editingId);if(!i||!confirm(`„${i.name}“ aus der Bibliothek löschen?`))return;const previous=db.items;db.items=db.items.filter(x=>x.id!==editingId);if(!save()){db.items=previous;return}closeModal($('#libraryItemModal'));renderLibrary();toast('Eintrag gelöscht.');}
  function openUse(id){activeItemId=id;const i=byId(id);if(!i)return;setText('#libraryUseTitle',i.name);$('#libraryFactor').value='1';renderUsePreview();openModal('libraryUseModal');}
  function renderUsePreview(){const i=byId(activeItemId);if(!i)return;const f=Number($('#libraryFactor').value)||1,n=nutrition(i,f);$('#libraryUseSummary').innerHTML=`<b>${escapeHtml(i.name)}</b><small>Basis: ${fmt(i.amount,i.amount%1?1:0)} ${i.unit}</small>`;setText('#factorPreview',`${fmt(n.calories)} kcal · ${fmt(n.protein)} g Eiweiß · ${fmt(n.carbs)} g KH · ${fmt(n.fat)} g Fett`);}
  function addToDay(){
    const i=byId(activeItemId);if(!i)return;
    if(typeof mealCapacity==='function'&&mealCapacity()<1){toast(`Maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten pro Tag möglich.`);return;}
    const f=Number($('#libraryFactor').value)||1,n=nutrition(i,f),meal=sanitizeMeal({id:makeId(),name:i.name,type:$('#libraryMealType').value,...n});
    if(!meal){toast('Mahlzeit konnte nicht erstellt werden.');return;}
    const previousUses=i.uses,previousLastUsed=i.lastUsedAt;
    i.uses++;i.lastUsedAt=new Date().toISOString();
    if(!save()){i.uses=previousUses;i.lastUsedAt=previousLastUsed;return;}
    if(!commitDayMutation(data=>data.meals.push(meal))){i.uses=previousUses;i.lastUsedAt=previousLastUsed;save();toast('Mahlzeit konnte nicht eingetragen werden.');return;}
    closeModal($('#libraryUseModal'));render();renderLibrary();toast('Mahlzeit eingetragen.');
  }
  function fillRecipeOptions(){const select=$('#recipeItem');const options=db.items.filter(i=>i.id!==editingId);select.innerHTML=options.map(i=>`<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');$('#addRecipeItem').disabled=!options.length;}
  function addComponent(){const id=$('#recipeItem').value,f=safeNumber($('#recipeFactor').value,0.01,100)||1;if(!id)return;const list=JSON.parse($('#recipeBuilder').dataset.components||'[]');list.push({itemId:id,factor:f});$('#recipeBuilder').dataset.components=JSON.stringify(list);renderComponents();calculateRecipe();}
  function renderComponents(){const list=JSON.parse($('#recipeBuilder').dataset.components||'[]');$('#recipeComponents').innerHTML=list.map((c,idx)=>{const i=byId(c.itemId);return i?`<div class="recipe-row"><span>${escapeHtml(i.name)} · ${String(c.factor).replace('.',',')}×</span><button data-remove-component="${idx}" type="button">×</button></div>`:'';}).join('');$$('[data-remove-component]').forEach(b=>b.onclick=()=>{const l=JSON.parse($('#recipeBuilder').dataset.components||'[]');l.splice(Number(b.dataset.removeComponent),1);$('#recipeBuilder').dataset.components=JSON.stringify(l);renderComponents();calculateRecipe();});fillRecipeOptions();}
  function calculateRecipe(){const list=JSON.parse($('#recipeBuilder').dataset.components||'[]');const total=list.reduce((s,c)=>{const i=byId(c.itemId);if(!i)return s;const n=nutrition(i,c.factor);for(const k of ['calories','protein','carbs','fat'])s[k]+=n[k];return s;},{calories:0,protein:0,carbs:0,fat:0});for(const [id,k] of [['libCalories','calories'],['libProtein','protein'],['libCarbs','carbs'],['libFat','fat']])$(`#${id}`).value=Math.round(total[k]*10)/10;}

  async function startScanner(){openModal('scannerModal');setText('#scannerStatus','Kamera wird vorbereitet …');$('#manualCode').value='';
    if(!navigator.mediaDevices?.getUserMedia||typeof BarcodeDetector!=='function'){setText('#scannerStatus','Automatische Kamera-Erkennung wird von diesem Browser nicht unterstützt. Gib den Code unten manuell ein.');return;}
    try{const formats=(await BarcodeDetector.getSupportedFormats()).filter(f=>['qr_code','ean_13','ean_8','upc_a','upc_e','code_128'].includes(f));const detector=new BarcodeDetector({formats});stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});const video=$('#scannerVideo');video.srcObject=stream;await video.play();setText('#scannerStatus','Code mittig in den Rahmen halten.');
      const scan=async()=>{if(!stream)return;try{const codes=await detector.detect(video);if(codes[0]?.rawValue){lookupCode(codes[0].rawValue);return;}}catch{}scanTimer=setTimeout(scan,250);};scan();
    }catch{setText('#scannerStatus','Kamera konnte nicht geöffnet werden. Prüfe die Berechtigung oder gib den Code manuell ein.');}
  }
  function stopScanner(){clearTimeout(scanTimer);scanTimer=null;if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}const v=$('#scannerVideo');if(v)v.srcObject=null;}
  function lookupCode(raw){const code=sanitizeBarcode(raw);if(!code){toast('Bitte einen gültigen Code eingeben.');return;}const item=db.items.find(i=>i.barcode===code);stopScanner();closeModal($('#scannerModal'));if(item){openUse(item.id);toast('Gespeichertes Produkt erkannt.');}else{openEditor(null,code);toast('Code ist neu – Werte einmalig speichern.');}}

  function exportData(){return deepClone(db);}
  function importData(raw){const previous=db;db=sanitizeDb(raw);if(!save()){db=previous;return false}renderLibrary();return true;}
  window.CutCoachLibrary={mount,render:renderLibrary,exportData,importData,count:()=>db.items.length};
})();
