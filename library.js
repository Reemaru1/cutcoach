'use strict';

(function(){
  const KEY='cutcoach_library_v1';
  const RECOVERY_KEY='cutcoach_library_recovery_raw_v1';
  const DB_VERSION=3;
  const MAX_ITEMS=1000;
  let db=load();
  let editingId=null;
  let activeItemId=null;
  let activeTransientItem=null;
  let stream=null;
  let scanTimer=null;

  function notifyChange(){
    try{window.dispatchEvent(new CustomEvent('cutcoach:librarychange'));}catch{}
  }

  function blank(){return {version:DB_VERSION,items:[]};}
  function load(){
    let raw='';
    try{
      raw=localStorage.getItem(KEY)||'';if(!raw)return blank();
      const parsed=JSON.parse(raw);
      if(!parsed||typeof parsed!=='object'||Array.isArray(parsed)||!Array.isArray(parsed.items))throw new Error('invalid-library-data');
      const clean=sanitizeDb(parsed);
      if(parsed.version!==DB_VERSION||parsed.items.some(item=>item?.kind==='dish'))try{localStorage.setItem(KEY,JSON.stringify(clean))}catch{}
      return clean;
    }catch{try{if(raw&&!localStorage.getItem(RECOVERY_KEY))localStorage.setItem(RECOVERY_KEY,raw)}catch{}return blank();}
  }
  function save({notify=true}={}){
    try{
      localStorage.setItem(KEY,JSON.stringify(db));
      if(notify)Promise.resolve().then(notifyChange);
      return true;
    }catch{toast('Bibliothek konnte nicht gespeichert werden.');return false;}
  }
  function safeNumber(v,min=0,max=100000){const n=parseNumber(v);return n===null||n<min||n>max?0:Math.round(n*100)/100;}
  function optionalNumber(v,min=0,max=100000){const n=parseNumber(v);return n===null||n<min||n>max?null:Math.round(n*100)/100;}
  function sanitizeBarcode(v){return String(v??'').replace(/[^0-9A-Za-z._-]/g,'').slice(0,64);}
  function itemKind(value){return value==='recipe'||value==='dish'?'recipe':'food';}
  function sanitizeItem(raw={}){
    const name=cleanText(raw.name,80);if(!name)return null;
    const item={
      id:safeId(raw.id||makeId()),name,kind:itemKind(raw.kind),barcode:sanitizeBarcode(raw.barcode),
      amount:safeNumber(raw.amount||100,0.1,10000)||100,unit:['g','ml','Stück','Portion'].includes(raw.unit)?raw.unit:'g',
      calories:safeNumber(raw.calories,0,10000),protein:safeNumber(raw.protein,0,1000),carbs:safeNumber(raw.carbs,0,2000),fat:safeNumber(raw.fat,0,1000),
      fiber:optionalNumber(raw.fiber,0,1000),sugar:optionalNumber(raw.sugar,0,2000),saturatedFat:optionalNumber(raw.saturatedFat,0,1000),salt:optionalNumber(raw.salt,0,1000),
      source:['bls','off'].includes(raw.source)?raw.source:'user',sourceId:cleanText(raw.sourceId,64),sourceVersion:cleanText(raw.sourceVersion,24),modified:Boolean(raw.modified),
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
    return {version:DB_VERSION,items};
  }
  function byId(id){return db.items.find(item=>item.id===id);}
  function nutrition(item,factor=1){
    const scaled={calories:item.calories*factor,protein:item.protein*factor,carbs:item.carbs*factor,fat:item.fat*factor};
    for(const nutrient of ['fiber','sugar','saturatedFat','salt'])scaled[nutrient]=item[nutrient]===null||item[nutrient]===undefined?null:item[nutrient]*factor;
    return scaled;
  }
  function normalized(v){return String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();}

  function mount(){injectUi();bind();renderLibrary();if(location.hash==='#library')switchLibraryTab();}
  function injectUi(){
    if($('#libraryScreen'))return;
    const settings=$('[data-screen="settings"]');
    settings.insertAdjacentHTML('beforebegin',`<section class="screen" data-screen="library" id="libraryScreen">
      <div class="library-hero"><div><span class="badge">⚡ Schnell eintragen</span><h2>Meine Bibliothek</h2><p>Eigene Lebensmittel, Rezepte und gescannte Produkte bleiben lokal auf deinem iPhone.</p></div><button id="scanCode" type="button">▣ Scannen</button></div>
      <div class="library-search card"><input id="librarySearch" type="search" placeholder="Köfte, Reis, Whey …" autocomplete="off"><button id="newLibraryItem" type="button">＋ Neu</button></div>
      <div class="library-filters" role="group" aria-label="Bibliothek filtern"><button class="on" data-library-filter="all">Alle</button><button data-library-filter="favorite">★ Favoriten</button><button data-library-filter="recent">Zuletzt</button><button data-library-filter="frequent">Häufig</button></div>
      <div id="libraryStats" class="library-stats"></div><div id="libraryList"></div><div class="library-data-actions"><button id="exportLibrary" class="secondary" type="button">Bibliothek sichern</button><label class="secondary file">Bibliothek importieren<input id="importLibrary" type="file" accept=".json,application/json"></label></div>
    </section>`);
    const nav=$('nav');nav.insertAdjacentHTML('beforeend','<button data-tab="library" type="button" aria-current="false"><span>⭐</span>Bibliothek</button>');
    document.body.insertAdjacentHTML('beforeend',`<div class="modal" id="libraryItemModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="libraryItemTitle"><div class="sheet">
      <div class="sheet-head"><h2 id="libraryItemTitle">Eintrag speichern</h2><button data-library-close type="button" aria-label="Schließen">×</button></div>
      <div class="segmented"><button data-kind="food" class="on" type="button">Lebensmittel</button><button data-kind="recipe" type="button">Rezept</button></div>
      <label>Name<input id="libName" maxlength="80" placeholder="z. B. Köfte mit Reis"></label>
      <div class="two"><label>Bezugsmenge<input id="libAmount" type="number" inputmode="decimal" min="0.1" value="100"></label><label>Einheit<select id="libUnit"><option>g</option><option>ml</option><option>Stück</option><option>Portion</option></select></label></div>
      <div class="two"><label>Kalorien<input id="libCalories" type="number" inputmode="decimal" min="1"></label><label>Eiweiß (g)<input id="libProtein" type="number" inputmode="decimal" min="0" step="0.1"></label></div>
      <div class="two"><label>Kohlenhydrate (g)<input id="libCarbs" type="number" inputmode="decimal" min="0" step="0.1"></label><label>Fett (g)<input id="libFat" type="number" inputmode="decimal" min="0" step="0.1"></label></div>
      <details class="library-nutrients-more"><summary>Weitere Nährwerte (optional)</summary><div class="two"><label>Ballaststoffe (g)<input id="libFiber" type="number" inputmode="decimal" min="0" max="1000" step="0.1"></label><label>Zucker (g)<input id="libSugar" type="number" inputmode="decimal" min="0" max="2000" step="0.1"></label></div><div class="two"><label>Gesättigte Fettsäuren (g)<input id="libSaturatedFat" type="number" inputmode="decimal" min="0" max="1000" step="0.1"></label><label>Salz (g)<input id="libSalt" type="number" inputmode="decimal" min="0" max="1000" step="0.01"></label></div></details>
      <label>Barcode / QR-Code (optional)<input id="libBarcode" maxlength="64" inputmode="numeric" placeholder="Code scannen oder eingeben"></label>
      <div id="recipeBuilder" hidden><div class="notice">Rezept aus deinen Lebensmitteln zusammensetzen. Die Nährwerte werden automatisch addiert.</div><div class="recipe-add"><select id="recipeItem"></select><input id="recipeFactor" type="number" value="1" min="0.01" step="0.25" aria-label="Portionsfaktor"><button id="addRecipeItem" type="button">＋</button></div><div id="recipeComponents"></div></div>
      <label class="favorite-check"><input id="libFavorite" type="checkbox"> Als Favorit markieren</label>
      <div class="button-row"><button id="saveLibraryItem" type="button">Speichern</button><button id="deleteLibraryItem" class="secondary danger-secondary" type="button">Löschen</button></div>
    </div></div>
    <div class="modal" id="libraryUseModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="libraryUseTitle"><div class="sheet">
      <div class="sheet-head"><h2 id="libraryUseTitle">Mahlzeit eintragen</h2><button data-library-close type="button" aria-label="Schließen">×</button></div><div id="libraryUseSummary" class="library-use-summary"></div>
      <section class="library-portion-editor" aria-labelledby="libraryPortionTitle"><strong id="libraryPortionTitle">Deine Menge</strong><label class="library-exact-label"><span>Exakte Menge</span><div class="inline exact-amount"><input id="libraryExactAmount" type="number" inputmode="decimal" min="0.1" max="100000" step="0.1"><span id="libraryExactUnit">g</span></div></label><div id="libraryPortionPresets" class="library-portion-presets" role="group" aria-label="Schnelle Portionsgrößen"></div><input id="libraryFactor" type="hidden" value="1"></section>
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
    $('#saveLibraryItem').onclick=saveEditor;$('#deleteLibraryItem').onclick=deleteEditor;$('#addLibraryMeal').onclick=addToDay;$('#libraryExactAmount').oninput=syncExactAmount;$('#libraryPortionPresets').onclick=event=>{const button=event.target.closest('[data-portion-amount]');if(button)setPortionAmount(button.dataset.portionAmount)};
    $('#addRecipeItem').onclick=addComponent;$('#lookupManualCode').onclick=()=>lookupCode($('#manualCode').value);
    $('#scannerModal').addEventListener('click',e=>{if(e.target.id==='scannerModal'){stopScanner();closeModal(e.target);}});
  }
  function switchLibraryTab(){
    $$('[data-tab]').forEach(b=>{const on=b.dataset.tab==='library';b.classList.toggle('active',on);b.setAttribute('aria-current',on?'page':'false');});
    $$('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen==='library'));history.replaceState(null,'','#library');window.scrollTo({top:0,behavior:'smooth'});renderLibrary();
  }
  async function exportLibraryFile(){try{await shareOrDownload(JSON.stringify({format:'cutcoach-library',version:DB_VERSION,exportedAt:new Date().toISOString(),data:db},null,2),`CutCoach-Bibliothek-${todayKey()}.json`,'CutCoach Bibliothek');toast('Bibliothek gesichert.');}catch(e){if(e?.name!=='AbortError')toast('Bibliothek konnte nicht exportiert werden.');}}
  function importLibraryFile(file){if(!file)return;if(file.size>3*1024*1024){toast('Datei ist zu groß.');return;}const r=new FileReader();r.onload=()=>{try{const parsed=JSON.parse(r.result),raw=parsed?.format==='cutcoach-library'?parsed.data:parsed;if(!raw||typeof raw!=='object'||Array.isArray(raw)||!Array.isArray(raw.items))throw new Error('invalid');const clean=sanitizeDb(raw);if(!confirm(`${clean.items.length} Einträge importieren? Die aktuelle Bibliothek wird ersetzt.`))return;const previous=db;db=clean;if(!save()){db=previous;return}renderLibrary();toast('Bibliothek importiert.');}catch{toast('Ungültige Bibliotheksdatei.');}};r.readAsText(file);}
  function renderLibrary(){
    const q=normalized($('#librarySearch')?.value);let items=[...db.items];
    if(q)items=items.filter(i=>normalized(`${i.name} ${i.barcode}`).includes(q));
    if(filter==='favorite')items=items.filter(i=>i.favorite);
    if(filter==='recent')items=items.filter(i=>i.lastUsedAt).sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)));
    else if(filter==='frequent')items.sort((a,b)=>b.uses-a.uses);
    else items.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||b.uses-a.uses||a.name.localeCompare(b.name,'de'));
    setText('#libraryStats',`${db.items.length} gespeichert · ${db.items.filter(i=>i.favorite).length} Favoriten`);
    const wrap=$('#libraryList');if(!items.length){wrap.innerHTML='<article class="card empty">Noch nichts gespeichert. Lege dein erstes Lebensmittel oder Rezept an.</article>';return;}
    wrap.innerHTML=items.map(i=>`<article class="card library-item"><button class="library-main" data-use-lib="${i.id}" type="button"><span class="library-icon">${i.kind==='recipe'?'🍽️':'🥫'}</span><span><b>${escapeHtml(i.name)}</b><small>${fmt(i.calories)} kcal · E ${fmt(i.protein)} · KH ${fmt(i.carbs)} · F ${fmt(i.fat)} · ${fmt(i.amount, i.amount%1?1:0)} ${i.unit}${i.source==='bls'?' · BLS 4.0':''}</small></span></button><div class="library-side"><button data-fav-lib="${i.id}" class="star ${i.favorite?'on':''}" type="button" aria-label="Favorit">★</button><button data-edit-lib="${i.id}" class="secondary mini" type="button">Bearbeiten</button></div></article>`).join('');
    $$('[data-use-lib]').forEach(b=>b.onclick=()=>openUse(b.dataset.useLib));$$('[data-edit-lib]').forEach(b=>b.onclick=()=>openEditor(b.dataset.editLib));$$('[data-fav-lib]').forEach(b=>b.onclick=()=>{const i=byId(b.dataset.favLib),previous=i.favorite;i.favorite=!i.favorite;if(!save()){i.favorite=previous;return}renderLibrary();});
  }
  function setKind(kind){const clean=itemKind(kind);$$('[data-kind]').forEach(b=>b.classList.toggle('on',b.dataset.kind===clean));$('#recipeBuilder').hidden=clean!=='recipe';if(clean==='recipe')fillRecipeOptions();}
  function currentKind(){return $('[data-kind].on')?.dataset.kind||'food';}
  function openEditor(id=null,barcode=''){
    editingId=id;const i=id?byId(id):null;setText('#libraryItemTitle',i?'Eintrag bearbeiten':'Eintrag speichern');
    $('#libName').value=i?.name||'';$('#libAmount').value=i?.amount||100;$('#libUnit').value=i?.unit||'g';$('#libCalories').value=i?.calories??'';$('#libProtein').value=i?.protein??'';$('#libCarbs').value=i?.carbs??'';$('#libFat').value=i?.fat??'';$('#libBarcode').value=i?.barcode||barcode;$('#libFavorite').checked=Boolean(i?.favorite);$('#deleteLibraryItem').hidden=!i;
    $('#libFiber').value=i?.fiber??'';$('#libSugar').value=i?.sugar??'';$('#libSaturatedFat').value=i?.saturatedFat??'';$('#libSalt').value=i?.salt??'';
    setKind(i?.kind||'food');$('#recipeBuilder').dataset.components=JSON.stringify(i?.components||[]);renderComponents();openModal('libraryItemModal');
  }
  function createItem(kind='food',initial={}){openEditor(null,'');setKind(itemKind(kind));const name=cleanText(typeof initial==='string'?initial:initial?.name,80);if(name){$('#libName').value=name;setTimeout(()=>$('#libName')?.focus(),40)}}
  function saveEditor(){
    const existing=byId(editingId),components=JSON.parse($('#recipeBuilder').dataset.components||'[]');const raw={id:editingId||makeId(),kind:currentKind(),name:$('#libName').value,amount:$('#libAmount').value,unit:$('#libUnit').value,calories:$('#libCalories').value,protein:$('#libProtein').value,carbs:$('#libCarbs').value,fat:$('#libFat').value,fiber:$('#libFiber').value,sugar:$('#libSugar').value,saturatedFat:$('#libSaturatedFat').value,salt:$('#libSalt').value,barcode:$('#libBarcode').value,favorite:$('#libFavorite').checked,components,source:existing?.source,sourceId:existing?.sourceId,sourceVersion:existing?.sourceVersion,modified:Boolean(existing?.modified||existing?.source==='bls')};
    const item=sanitizeItem(raw);if(!item){toast('Name und gültige Kalorien eintragen.');return;}
    if(item.barcode){const duplicate=db.items.find(x=>x.barcode===item.barcode&&x.id!==item.id);if(duplicate&&!confirm(`Dieser Code gehört bereits zu „${duplicate.name}“. Trotzdem speichern?`))return;}
    const idx=db.items.findIndex(x=>x.id===item.id);if(idx<0&&db.items.length>=MAX_ITEMS){toast(`Maximal ${MAX_ITEMS.toLocaleString('de-DE')} Bibliothekseinträge möglich.`);return;}
    const previous=deepClone(db);if(idx>=0){item.uses=db.items[idx].uses;item.lastUsedAt=db.items[idx].lastUsedAt;item.createdAt=db.items[idx].createdAt;db.items[idx]=item;}else db.items.push(item);
    if(!save()){db=previous;return}closeModal($('#libraryItemModal'));renderLibrary();toast('In Bibliothek gespeichert.');
  }
  function deleteEditor(){const i=byId(editingId);if(!i||!confirm(`„${i.name}“ aus der Bibliothek löschen?`))return;const previous=db.items;db.items=db.items.filter(x=>x.id!==editingId);if(!save()){db.items=previous;return}closeModal($('#libraryItemModal'));renderLibrary();toast('Eintrag gelöscht.');}
  function preferredMealType(value){
    const requested=String(value||document.body.dataset.nutritionMealType||'');
    return MEAL_TYPES.includes(requested)?requested:'Frühstück';
  }
  function activeUseItem(){return byId(activeItemId)||(activeTransientItem?.id===activeItemId?activeTransientItem:null);}
  function roundPortion(value,unit){const amount=Math.max(.1,Number(value)||.1),step=unit==='Stück'||unit==='Portion'?.25:amount>=100?25:amount>=20?5:amount>=5?1:.1;return Math.round(amount/step)*step;}
  function portionAmounts(item){
    const multipliers=item.unit==='Stück'||item.unit==='Portion'?[.5,1,1.5,2]:item.amount===100?[.5,1,1.5,2,2.5]:[.5,1,1.5,2];
    return [...new Set(multipliers.map(factor=>roundPortion(item.amount*factor,item.unit)).filter(amount=>amount>0&&amount<=100000))];
  }
  function compatiblePortion(item,portion){return portion&&Number(portion.amount)>0&&String(portion.unit||item.unit)===item.unit?Math.min(100000,Number(portion.amount)):null;}
  function setPortionAmount(value){
    const item=activeUseItem(),amount=Math.min(100000,Math.max(.1,Number(String(value).replace(',','.'))||0));if(!item||!amount)return;
    $('#libraryExactAmount').value=String(Math.round(amount*10)/10);$('#libraryFactor').value=String(amount/item.amount);$('#addLibraryMeal').disabled=false;renderUsePreview();
  }
  function syncExactAmount(){const item=activeUseItem(),amount=parseNumber($('#libraryExactAmount').value),valid=Boolean(item&&amount!==null&&amount>0&&amount<=100000);$('#addLibraryMeal').disabled=!valid;if(!valid)return;$('#libraryFactor').value=String(amount/item.amount);renderUsePreview();}
  function renderPortionPresets(item){
    const current=Number($('#libraryExactAmount').value),host=$('#libraryPortionPresets');
    host.innerHTML=portionAmounts(item).map(amount=>`<button type="button" data-portion-amount="${amount}" class="${Math.abs(amount-current)<.01?'active':''}" aria-pressed="${Math.abs(amount-current)<.01}">${fmt(amount,amount%1?1:0)} ${escapeHtml(item.unit)}</button>`).join('');
  }
  function prepareUse(item,type,portion=null){
    if(!item)return false;activeItemId=item.id;
    const amount=compatiblePortion(item,portion)||item.amount;setText('#libraryUseTitle',item.name);$('#libraryExactUnit').textContent=item.unit;$('#libraryExactAmount').value=String(amount);$('#libraryFactor').value=String(amount/item.amount);$('#libraryMealType').value=preferredMealType(type);$('#addLibraryMeal').disabled=false;renderUsePreview();openModal('libraryUseModal');return true;
  }
  function openUse(id,type=null,portion=null){
    activeTransientItem=null;return prepareUse(byId(id),type,portion);
  }
  function openCatalogUse(raw,type=null,portion=null){
    const item=sanitizeItem({...raw,kind:'food',favorite:false,uses:0,lastUsedAt:null,components:[]});if(!item)return false;activeTransientItem=item;return prepareUse(item,type,portion);
  }
  function renderUsePreview(){
    const i=activeUseItem();if(!i)return;const f=Math.min(100,Math.max(.001,Number($('#libraryFactor').value)||1)),n=nutrition(i,f),amount=i.amount*f,source=i.source==='bls'?' · BLS 4.0':i.source==='off'?' · Produktdaten':'';
    $('#libraryUseSummary').innerHTML=`<b>${escapeHtml(i.name)}</b><small>Basis: ${fmt(i.amount,i.amount%1?1:0)} ${escapeHtml(i.unit)}${source}</small>`;
    const extras=[n.fiber===null?'':`${fmt(n.fiber,1)} g Ballaststoffe`,n.sugar===null?'':`${fmt(n.sugar,1)} g Zucker`,n.salt===null?'':`${fmt(n.salt,2)} g Salz`].filter(Boolean);
    $('#factorPreview').innerHTML=`<strong>${fmt(n.calories)} kcal</strong><span>E ${fmt(n.protein,1)} g</span><span>KH ${fmt(n.carbs,1)} g</span><span>F ${fmt(n.fat,1)} g</span>${extras.length?`<small>${extras.join(' · ')}</small>`:''}`;
    $('#libraryExactAmount').value=String(Math.round(amount*10)/10);$('#libraryExactUnit').textContent=i.unit;renderPortionPresets(i);
  }
  function addItemToDay(id,{factor=1,type=null,dateKey=selectedDate}={}){
    const i=byId(id);if(!i||!validDateKey(dateKey))return null;
    const cleanFactor=Math.min(100000/i.amount,Math.max(.00001,Number(factor)||1));
    if(typeof mealCapacity==='function'&&mealCapacity(dateKey)<1){toast(`Maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten pro Tag möglich.`);return null;}
    const n=nutrition(i,cleanFactor),meal=sanitizeMeal({id:makeId(),name:i.name,type:preferredMealType(type),...n,quantity:i.amount*cleanFactor,unit:i.unit,source:i.kind==='recipe'?'recipe':i.source,sourceItemId:i.id});
    if(!meal){toast('Mahlzeit konnte nicht erstellt werden.');return null;}
    const token={itemId:i.id,mealId:meal.id,name:i.name,mealType:meal.type,dateKey,quantity:meal.quantity,unit:meal.unit,previousUses:i.uses,previousLastUsed:i.lastUsedAt,addedLastUsedAt:new Date().toISOString()};
    i.uses++;i.lastUsedAt=token.addedLastUsedAt;
    if(!save({notify:false})){i.uses=token.previousUses;i.lastUsedAt=token.previousLastUsed;return null;}
    if(!commitDayMutation(data=>data.meals.push(meal),dateKey)){
      i.uses=token.previousUses;i.lastUsedAt=token.previousLastUsed;save({notify:false});toast('Mahlzeit konnte nicht eingetragen werden.');return null;
    }
    renderLibrary();notifyChange();return token;
  }
  function addCatalogItemToDay(raw,options={}){
    const candidate=sanitizeItem({...raw,kind:'food',favorite:false,uses:0,lastUsedAt:null,components:[]});if(!candidate)return null;
    let item=db.items.find(entry=>entry.id===candidate.id||(candidate.sourceId&&entry.source===candidate.source&&entry.sourceId===candidate.sourceId)),created=false;
    if(!item){if(db.items.length>=MAX_ITEMS){toast(`Maximal ${fmt(MAX_ITEMS)} Bibliothekseinträge möglich.`);return null}db.items.push(candidate);item=candidate;created=true;}
    const result=addItemToDay(item.id,options);
    if(!result&&created){db.items=db.items.filter(entry=>entry!==candidate);save({notify:false});renderLibrary();}
    return result;
  }
  function undoDayAdd(token){
    if(!token||!validDateKey(token.dateKey))return false;
    const data=day(token.dateKey,false);
    if(!data.meals.some(meal=>String(meal.id)===String(token.mealId)))return false;
    const i=byId(token.itemId),currentUses=i?.uses,currentLastUsed=i?.lastUsedAt;
    if(i){i.uses=Math.max(0,(Number(currentUses)||0)-1);if(currentLastUsed===token.addedLastUsedAt)i.lastUsedAt=validTimestamp(token.previousLastUsed);if(!save({notify:false})){i.uses=currentUses;i.lastUsedAt=currentLastUsed;return false;}}
    if(!commitDayMutation(entry=>{entry.meals=entry.meals.filter(meal=>String(meal.id)!==String(token.mealId));},token.dateKey)){
      if(i){i.uses=currentUses;i.lastUsedAt=currentLastUsed;save({notify:false});}
      return false;
    }
    renderLibrary();notifyChange();return true;
  }
  function addToDay(){
    const amount=parseNumber($('#libraryExactAmount').value);if(amount===null||amount<=0||amount>100000){toast('Bitte eine gültige Portionsmenge eintragen.');return;}
    const result=activeTransientItem?.id===activeItemId?addCatalogItemToDay(activeTransientItem,{factor:$('#libraryFactor').value,type:$('#libraryMealType').value}):addItemToDay(activeItemId,{factor:$('#libraryFactor').value,type:$('#libraryMealType').value});
    if(!result)return;
    activeTransientItem=null;closeModal($('#libraryUseModal'));render();toast('Mahlzeit eingetragen.');
  }
  function fillRecipeOptions(){const select=$('#recipeItem');const options=db.items.filter(i=>i.id!==editingId&&i.kind==='food');select.innerHTML=options.map(i=>`<option value="${i.id}">${escapeHtml(i.name)}</option>`).join('');$('#addRecipeItem').disabled=!options.length;}
  function addComponent(){const id=$('#recipeItem').value,f=safeNumber($('#recipeFactor').value,0.01,100)||1;if(!id)return;const list=JSON.parse($('#recipeBuilder').dataset.components||'[]');list.push({itemId:id,factor:f});$('#recipeBuilder').dataset.components=JSON.stringify(list);renderComponents();calculateRecipe();}
  function renderComponents(){const list=JSON.parse($('#recipeBuilder').dataset.components||'[]');$('#recipeComponents').innerHTML=list.map((c,idx)=>{const i=byId(c.itemId),amount=i?i.amount*c.factor:0;return i?`<div class="recipe-row"><span>${escapeHtml(i.name)}<small>${fmt(amount,amount%1?1:0)} ${escapeHtml(i.unit)}</small></span><button data-remove-component="${idx}" type="button" aria-label="${escapeHtml(i.name)} entfernen">×</button></div>`:'';}).join('');$$('[data-remove-component]').forEach(b=>b.onclick=()=>{const l=JSON.parse($('#recipeBuilder').dataset.components||'[]');l.splice(Number(b.dataset.removeComponent),1);$('#recipeBuilder').dataset.components=JSON.stringify(l);renderComponents();calculateRecipe();});fillRecipeOptions();}
  function calculateRecipe(){
    const list=JSON.parse($('#recipeBuilder').dataset.components||'[]'),items=list.map(component=>({component,item:byId(component.itemId)})).filter(entry=>entry.item),total={calories:0,protein:0,carbs:0,fat:0,fiber:null,sugar:null,saturatedFat:null,salt:null};
    for(const nutrient of ['calories','protein','carbs','fat'])total[nutrient]=items.reduce((sum,{component,item})=>sum+nutrition(item,component.factor)[nutrient],0);
    for(const nutrient of ['fiber','sugar','saturatedFat','salt']){const values=items.map(({component,item})=>nutrition(item,component.factor)[nutrient]);total[nutrient]=values.length&&values.every(value=>value!==null)?values.reduce((sum,value)=>sum+value,0):null;}
    for(const [id,key] of [['libCalories','calories'],['libProtein','protein'],['libCarbs','carbs'],['libFat','fat'],['libFiber','fiber'],['libSugar','sugar'],['libSaturatedFat','saturatedFat'],['libSalt','salt']])$(`#${id}`).value=total[key]===null?'':Math.round(total[key]*100)/100;
  }

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
  window.CutCoachLibrary={mount,render:renderLibrary,exportData,importData,count:()=>db.items.length,openUse,openCatalogUse,createItem,startScanner,addItemToDay,addCatalogItemToDay,undoDayAdd};
})();
