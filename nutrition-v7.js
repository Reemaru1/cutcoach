'use strict';
(function(){
  const VERSION=typeof APP_VERSION==='string'?APP_VERSION:'7.0.0';
  const RECIPE_META_KEY='cutcoach_recipe_meta_v2';
  const PORTION_PROFILE_KEY='cutcoach_portion_profiles_v1';
  const ADD_LOCK_MS=900;
  const MAX_RESULTS=24;
  const NUTRIENTS=['calories','protein','carbs','fat','fiber','sugar','saturatedFat','salt'];
  const $=selector=>document.querySelector(selector);
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim();
  const number=value=>{const parsed=Number(String(value??'').trim().replace(',','.'));return Number.isFinite(parsed)?parsed:null};
  const round=(value,digits=2)=>{const scale=10**digits;return Math.round((Number(value)||0)*scale)/scale};
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const clone=value=>JSON.parse(JSON.stringify(value));
  const safeRead=(key,fallback={})=>{try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'&&!Array.isArray(value)?value:fallback}catch{return fallback}};
  const safeWrite=(key,value)=>{try{localStorage.setItem(key,JSON.stringify(value));return true}catch{toast?.('Zusatzdaten konnten nicht gespeichert werden. Bitte Backup erstellen.');return false}};
  const uniqueId=prefix=>`${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`;

  let recipeMeta=safeRead(RECIPE_META_KEY,{});
  let portionProfiles=safeRead(PORTION_PROFILE_KEY,{});
  let recipeEditingId=null;
  let recipeDraft=[];
  let selectedIngredient=null;
  let detailItem=null;
  let lastAdd={key:'',at:0};
  let originalCreateItem=null;
  let initialized=false;

  function library(){return window.CutCoachLibrary}
  function libraryData(){try{return library()?.exportData?.()||{version:3,items:[]}}catch{return{version:3,items:[]}}}
  function personalItem(id){return libraryData().items.find(item=>String(item.id)===String(id))||null}
  function catalogItem(id){try{return window.CutCoachFoodCatalog?.get?.(id)||null}catch{return null}}
  function resolveItem(id){return personalItem(id)||catalogItem(id)}
  function mealType(){return document.body.dataset.nutritionMealType||$('#nutritionMealSelect')?.value||'Frühstück'}
  function itemSource(item){return item?.source==='bls'?'BLS 4.0':item?.source==='off'?'Open Food Facts':item?.kind==='recipe'?'Eigenes Rezept':'Eigener Eintrag'}
  function nutrientSnapshot(item){const values={};for(const key of NUTRIENTS)values[key]=item?.[key]===null||item?.[key]===undefined?null:Number(item[key])||0;return values}
  function scaled(snapshot,factor){const result={};for(const key of NUTRIENTS)result[key]=snapshot[key]===null?null:(Number(snapshot[key])||0)*factor;return result}
  function addNutrition(target,source){for(const key of ['calories','protein','carbs','fat'])target[key]+=Number(source[key])||0;for(const key of ['fiber','sugar','saturatedFat','salt']){if(source[key]===null)target[key]=null;else if(target[key]!==null)target[key]+=Number(source[key])||0}}
  function totalNutrition(components=recipeDraft){const total={calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:0};for(const component of components){const factor=(Number(component.amount)||0)/Math.max(.0001,Number(component.basisAmount)||100);addNutrition(total,scaled(component.nutrients,factor))}return total}
  function recipeServings(){return Math.max(1,Math.min(1000,Math.round(number($('#recipeV7Servings')?.value)||1)))}
  function perServing(total=totalNutrition(),servings=recipeServings()){const result={};for(const key of NUTRIENTS)result[key]=total[key]===null?null:total[key]/servings;return result}

  function injectUi(){
    if($('#recipeV7Modal'))return;
    document.body.insertAdjacentHTML('beforeend',`
      <div class="modal" id="recipeV7Modal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="recipeV7Title"><div class="sheet recipe-v7-sheet">
        <div class="sheet-head"><h2 id="recipeV7Title">Rezept erstellen</h2><button data-recipe-v7-close type="button" aria-label="Schließen">×</button></div>
        <label>Rezeptname<input id="recipeV7Name" maxlength="80" autocomplete="off" placeholder="z. B. Hähnchen-Reis-Bowl"></label>
        <div class="recipe-v7-basics"><label>Portionen<input id="recipeV7Servings" type="number" inputmode="numeric" min="1" max="1000" step="1" value="2"></label><label>Gesamtausbeute (optional)<input id="recipeV7Yield" type="number" inputmode="decimal" min="0.1" max="100000" step="0.1" placeholder="z. B. 850"></label><label>Einheit<select id="recipeV7YieldUnit"><option>g</option><option>ml</option><option>Stück</option></select></label></div>
        <section class="recipe-v7-picker" aria-labelledby="recipeV7IngredientTitle"><strong id="recipeV7IngredientTitle">Zutat hinzufügen</strong><label class="recipe-v7-search"><span class="recipe-v7-search-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="10.7" cy="10.7" r="6.2"></circle><path d="m15.4 15.4 4.1 4.1"></path></svg></span><input id="recipeV7Search" type="search" autocomplete="off" placeholder="Lebensmittel suchen"></label><div id="recipeV7SearchResults" class="recipe-v7-search-results"></div><div id="recipeV7Selected" class="recipe-v7-selected" hidden><div><b id="recipeV7SelectedName"></b><small id="recipeV7SelectedBasis"></small></div><label>Menge<div><input id="recipeV7Amount" type="number" inputmode="decimal" min="0.1" max="100000" step="0.1"><span id="recipeV7Unit">g</span></div></label><button id="recipeV7Add" type="button">Zutat übernehmen</button></div></section>
        <section class="recipe-v7-list-section"><div class="recipe-v7-section-title"><strong>Zutaten</strong><span id="recipeV7Count">0</span></div><div id="recipeV7Components" class="recipe-v7-components"></div></section>
        <section class="recipe-v7-summary" aria-live="polite"><div><small>Gesamtes Rezept</small><strong id="recipeV7TotalKcal">0 kcal</strong><span id="recipeV7TotalMacros">E 0 · KH 0 · F 0</span></div><div><small>Pro Portion</small><strong id="recipeV7ServingKcal">0 kcal</strong><span id="recipeV7ServingMacros">E 0 · KH 0 · F 0</span></div></section>
        <label class="favorite-check"><input id="recipeV7Favorite" type="checkbox"> Als Favorit markieren</label>
        <div class="button-row"><button id="recipeV7Save" type="button">Rezept speichern</button><button id="recipeV7Delete" class="secondary danger-secondary" type="button">Rezept löschen</button></div>
      </div></div>
      <div class="modal" id="nutritionDetailModal" role="dialog" aria-modal="true" aria-hidden="true" aria-labelledby="nutritionDetailTitle"><div class="sheet nutrition-detail-sheet">
        <div class="sheet-head"><h2 id="nutritionDetailTitle">Lebensmittel</h2><button data-detail-close type="button" aria-label="Schließen">×</button></div>
        <div id="nutritionDetailSource" class="nutrition-detail-source"></div>
        <section id="nutritionDetailFacts" class="nutrition-detail-facts"></section>
        <section class="nutrition-detail-portion"><strong>Portion</strong><label><span>Exakte Menge</span><div><input id="nutritionDetailAmount" type="number" inputmode="decimal" min="0.1" max="100000" step="0.1"><b id="nutritionDetailUnit">g</b></div></label><div id="nutritionDetailPresets" class="library-portion-presets"></div><label>Kategorie<select id="nutritionDetailMealType">${['Frühstück','Mittagessen','Abendessen','Snack'].map(type=>`<option>${type}</option>`).join('')}</select></label></section>
        <div id="nutritionDetailPreview" class="nutrition-detail-preview"></div>
        <div class="nutrition-detail-actions"><button id="nutritionDetailAdd" type="button">Für diesen Tag eintragen</button><button id="nutritionDetailSaveOnly" class="secondary" type="button">Nur in Bibliothek speichern</button><button id="nutritionDetailFavorite" class="secondary" type="button">☆ Favorit</button><button id="nutritionDetailEdit" class="secondary" type="button">Bearbeiten</button><button id="nutritionDetailDuplicate" class="secondary" type="button" hidden>Rezept duplizieren</button></div>
      </div></div>`);
  }

  function openModalSafe(id){if(typeof openModal==='function')openModal(id);else{const modal=$(`#${id}`);modal?.classList.add('open');modal?.setAttribute('aria-hidden','false')}}
  function closeModalSafe(node){const modal=typeof node==='string'?$(`#${node}`):node;if(!modal)return;if(typeof closeModal==='function')closeModal(modal);else{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')}}

  function ingredientCandidates(query){
    const q=normalize(query),tokens=q.split(/\s+/).filter(Boolean),personal=libraryData().items.filter(item=>item.kind==='food');
    let catalog=[];try{catalog=window.CutCoachFoodCatalog?.items?.()||[]}catch{}
    const seen=new Set(personal.map(item=>`${item.source||'user'}:${item.sourceId||normalize(item.name)}`));
    const score=item=>{const name=normalize(item.name);if(tokens.length&&!tokens.every(token=>name.includes(token)))return -1;let value=0;if(name===q)value+=1000;else if(name.startsWith(q))value+=500;for(const token of tokens)if(name.split(' ').some(word=>word.startsWith(token)))value+=80;value+=Number(Boolean(item.favorite))*100+Math.min(80,Number(item.uses)||0);return value};
    const combined=[...personal,...catalog.filter(item=>!seen.has(`${item.source||'bls'}:${item.sourceId||normalize(item.name)}`))];
    return combined.map(item=>({item,score:score(item)})).filter(entry=>entry.score>=0).sort((a,b)=>b.score-a.score||String(a.item.name).localeCompare(String(b.item.name),'de')).slice(0,MAX_RESULTS).map(entry=>entry.item);
  }

  function renderIngredientResults(){
    const host=$('#recipeV7SearchResults');if(!host)return;const query=$('#recipeV7Search').value.trim();
    if(!query){host.innerHTML='<p class="recipe-v7-search-hint">Tippe mindestens einen Begriff ein. BLS-Lebensmittel können direkt als Zutat verwendet werden.</p>';return}
    const items=ingredientCandidates(query);host.innerHTML=items.length?items.map(item=>`<button type="button" data-recipe-ingredient="${escapeHtml(item.id)}"><span>${item.source==='bls'?'BLS':item.source==='off'?'Produkt':'Eigene'}</span><b>${escapeHtml(item.name)}</b><small>${fmt(item.calories)} kcal · ${fmt(item.protein,1)} g E · Basis ${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')}</small></button>`).join(''):'<p class="recipe-v7-search-hint">Kein Treffer. Lege das Lebensmittel zuerst über „Lebensmittel“ an.</p>';
  }

  function selectIngredient(id){
    const item=resolveItem(id);if(!item)return;selectedIngredient={itemId:String(item.id),name:item.name,basisAmount:Number(item.amount)||100,unit:item.unit||'g',nutrients:nutrientSnapshot(item),source:item.source||'user',sourceId:item.sourceId||''};
    $('#recipeV7Selected').hidden=false;$('#recipeV7SelectedName').textContent=item.name;$('#recipeV7SelectedBasis').textContent=`Basis ${fmt(selectedIngredient.basisAmount,selectedIngredient.basisAmount%1?1:0)} ${selectedIngredient.unit} · ${itemSource(item)}`;$('#recipeV7Amount').value=String(selectedIngredient.basisAmount);$('#recipeV7Unit').textContent=selectedIngredient.unit;$('#recipeV7Amount').focus();
  }

  function addSelectedIngredient(){
    if(!selectedIngredient)return;const amount=number($('#recipeV7Amount').value);if(amount===null||amount<=0||amount>100000){toast?.('Bitte eine gültige Zutatenmenge eintragen.');return}
    recipeDraft.push({...clone(selectedIngredient),amount:round(amount,2)});selectedIngredient=null;$('#recipeV7Selected').hidden=true;$('#recipeV7Search').value='';renderIngredientResults();renderRecipeDraft();$('#recipeV7Search').focus();
  }

  function renderRecipeDraft(){
    const host=$('#recipeV7Components'),count=$('#recipeV7Count');if(!host)return;count.textContent=`${recipeDraft.length} ${recipeDraft.length===1?'Zutat':'Zutaten'}`;
    host.innerHTML=recipeDraft.length?recipeDraft.map((component,index)=>`<article class="recipe-v7-row"><div><b>${escapeHtml(component.name)}</b><small>${itemSource(component)} · Basis ${fmt(component.basisAmount,component.basisAmount%1?1:0)} ${escapeHtml(component.unit)}</small></div><label><input type="number" inputmode="decimal" min="0.1" max="100000" step="0.1" value="${component.amount}" data-recipe-amount="${index}" aria-label="Menge für ${escapeHtml(component.name)}"><span>${escapeHtml(component.unit)}</span></label><button type="button" data-recipe-remove="${index}" aria-label="${escapeHtml(component.name)} entfernen">×</button></article>`).join(''):'<div class="recipe-v7-empty">Noch keine Zutaten hinzugefügt.</div>';
    renderRecipeSummary();
  }

  function renderRecipeSummary(){
    const total=totalNutrition(),servings=recipeServings(),per=perServing(total,servings);
    $('#recipeV7TotalKcal').textContent=`${fmt(total.calories)} kcal`;$('#recipeV7TotalMacros').textContent=`E ${fmt(total.protein,1)} · KH ${fmt(total.carbs,1)} · F ${fmt(total.fat,1)}`;
    $('#recipeV7ServingKcal').textContent=`${fmt(per.calories)} kcal`;$('#recipeV7ServingMacros').textContent=`E ${fmt(per.protein,1)} · KH ${fmt(per.carbs,1)} · F ${fmt(per.fat,1)}`;
    $('#recipeV7Save').disabled=!recipeDraft.length||!$('#recipeV7Name').value.trim()||per.calories<=0;
  }

  function legacyRecipeMeta(item){
    const components=[];for(const raw of item?.components||[]){const source=resolveItem(raw.itemId);if(!source)continue;components.push({itemId:String(source.id),name:source.name,basisAmount:Number(source.amount)||100,amount:round((Number(source.amount)||100)*(Number(raw.factor)||1),2),unit:source.unit||'g',nutrients:nutrientSnapshot(source),source:source.source||'user',sourceId:source.sourceId||''})}
    return{servings:1,yieldAmount:null,yieldUnit:'g',components,updatedAt:new Date().toISOString()};
  }

  function openRecipeEditor(id=null,{duplicate=false,name=''}={}){
    injectUi();const item=id?personalItem(id):null,meta=item?(recipeMeta[item.id]||legacyRecipeMeta(item)):null;recipeEditingId=duplicate?null:(item?.id||null);recipeDraft=clone(meta?.components||[]);selectedIngredient=null;
    $('#recipeV7Title').textContent=recipeEditingId?'Rezept bearbeiten':duplicate?'Rezept duplizieren':'Rezept erstellen';$('#recipeV7Name').value=name||`${item?.name||''}${duplicate?' (Kopie)':''}`;$('#recipeV7Servings').value=String(meta?.servings||1);$('#recipeV7Yield').value=meta?.yieldAmount??'';$('#recipeV7YieldUnit').value=meta?.yieldUnit||'g';$('#recipeV7Favorite').checked=Boolean(item?.favorite);$('#recipeV7Delete').hidden=!recipeEditingId;$('#recipeV7Search').value='';$('#recipeV7Selected').hidden=true;renderIngredientResults();renderRecipeDraft();openModalSafe('recipeV7Modal');setTimeout(()=>$('#recipeV7Name').focus(),40);
  }

  function saveRecipe(){
    const name=String($('#recipeV7Name').value||'').replace(/\s+/g,' ').trim().slice(0,80),servings=recipeServings(),total=totalNutrition(),per=perServing(total,servings);if(!name){toast?.('Bitte einen Rezeptnamen eintragen.');return}if(!recipeDraft.length||per.calories<=0){toast?.('Füge mindestens eine gültige Zutat hinzu.');return}
    const db=libraryData(),id=recipeEditingId||uniqueId('recipe'),existing=db.items.find(item=>String(item.id)===String(id));const createdAt=existing?.createdAt||new Date().toISOString();
    const item={id,name,kind:'recipe',barcode:'',amount:1,unit:'Portion',...Object.fromEntries(NUTRIENTS.map(key=>[key,per[key]===null?null:round(per[key],2)])),source:'user',sourceId:'',sourceVersion:VERSION,modified:Boolean(existing),favorite:$('#recipeV7Favorite').checked,uses:existing?.uses||0,lastUsedAt:existing?.lastUsedAt||null,createdAt,components:recipeDraft.map(component=>({itemId:component.itemId,factor:round(component.amount/Math.max(.0001,component.basisAmount),4)}))};
    const index=db.items.findIndex(entry=>String(entry.id)===String(id));if(index>=0)db.items[index]=item;else db.items.push(item);if(!library().importData(db)){toast?.('Rezept konnte nicht gespeichert werden.');return}
    recipeMeta[id]={version:2,servings,yieldAmount:number($('#recipeV7Yield').value),yieldUnit:$('#recipeV7YieldUnit').value,components:clone(recipeDraft),total:Object.fromEntries(NUTRIENTS.map(key=>[key,total[key]===null?null:round(total[key],2)])),updatedAt:new Date().toISOString()};safeWrite(RECIPE_META_KEY,recipeMeta);closeModalSafe('recipeV7Modal');toast?.('Rezept gespeichert.');window.render?.();
  }

  function deleteRecipe(){
    if(!recipeEditingId)return;const item=personalItem(recipeEditingId);if(!item||!confirm(`„${item.name}“ wirklich löschen?`))return;const db=libraryData();db.items=db.items.filter(entry=>String(entry.id)!==String(recipeEditingId));if(!library().importData(db))return;delete recipeMeta[recipeEditingId];safeWrite(RECIPE_META_KEY,recipeMeta);closeModalSafe('recipeV7Modal');toast?.('Rezept gelöscht.');window.render?.();
  }

  function profileFor(item){return portionProfiles[item?.barcode]||portionProfiles[item?.sourceId]||null}
  function smartPortions(item){
    const profile=profileFor(item),values=[];if(profile?.servingAmount>0&&profile.servingUnit===item.unit)values.push(profile.servingAmount);const amount=Number(item.amount)||100;if(item.unit==='Portion'||item.unit==='Stück')values.push(.5,1,1.5,2);else values.push(amount*.5,amount,amount*1.5,amount*2);return [...new Set(values.map(value=>round(value,item.unit==='g'||item.unit==='ml'?0:1)).filter(value=>value>0&&value<=100000))];
  }

  function ensurePersonal(item){
    const db=libraryData(),existing=db.items.find(entry=>String(entry.id)===String(item.id)||(item.sourceId&&entry.source===item.source&&entry.sourceId===item.sourceId));if(existing)return existing;if(db.items.length>=1000){toast?.('Bibliothek ist voll.');return null}const copy={...clone(item),id:String(item.id||uniqueId('food')),kind:item.kind==='recipe'?'recipe':'food',favorite:false,uses:0,lastUsedAt:null,createdAt:new Date().toISOString(),components:Array.isArray(item.components)?item.components:[]};db.items.push(copy);return library().importData(db)?personalItem(copy.id):null;
  }

  function renderDetail(){
    const item=detailItem;if(!item)return;const amount=Math.max(.1,number($('#nutritionDetailAmount').value)||Number(item.amount)||100),factor=amount/Math.max(.0001,Number(item.amount)||100),n=scaled(nutrientSnapshot(item),factor),personal=personalItem(item.id),source=itemSource(item),coverage=['fiber','sugar','saturatedFat','salt'].filter(key=>item[key]!==null&&item[key]!==undefined).length;
    $('#nutritionDetailTitle').textContent=item.name;$('#nutritionDetailSource').innerHTML=`<span>${escapeHtml(source)}</span><small>Basis ${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')} · ${coverage}/4 Zusatzwerte vorhanden</small>`;
    const fact=(label,key,digits=1)=>`<article><small>${label}</small><strong>${item[key]===null||item[key]===undefined?'–':`${fmt(n[key],digits)}${key==='calories'?' kcal':' g'}`}</strong></article>`;$('#nutritionDetailFacts').innerHTML=fact('Kalorien','calories',0)+fact('Eiweiß','protein')+fact('Kohlenhydrate','carbs')+fact('Fett','fat')+fact('Ballaststoffe','fiber')+fact('Zucker','sugar')+fact('Gesättigt','saturatedFat')+fact('Salz','salt',2);
    $('#nutritionDetailPreview').innerHTML=`<strong>${fmt(n.calories)} kcal</strong><span>E ${fmt(n.protein,1)} g</span><span>KH ${fmt(n.carbs,1)} g</span><span>F ${fmt(n.fat,1)} g</span>`;$('#nutritionDetailUnit').textContent=item.unit||'g';$('#nutritionDetailPresets').innerHTML=smartPortions(item).map(value=>`<button type="button" data-detail-amount="${value}" class="${Math.abs(value-amount)<.01?'active':''}">${fmt(value,value%1?1:0)} ${escapeHtml(item.unit||'g')}</button>`).join('');$('#nutritionDetailSaveOnly').hidden=Boolean(personal);$('#nutritionDetailFavorite').textContent=personal?.favorite?'★ Favorit':'☆ Favorit';$('#nutritionDetailDuplicate').hidden=item.kind!=='recipe';
  }

  function openDetail(id){
    injectUi();const item=resolveItem(id);if(!item){toast?.('Eintrag konnte nicht geöffnet werden.');return}detailItem=clone(item);$('#nutritionDetailAmount').value=String(item.amount||100);$('#nutritionDetailMealType').value=mealType();renderDetail();openModalSafe('nutritionDetailModal');
  }

  function detailAdd(){
    const item=detailItem,amount=number($('#nutritionDetailAmount').value);if(!item||amount===null||amount<=0||amount>100000){toast?.('Bitte eine gültige Portionsmenge eintragen.');return}const key=`${selectedDate}|${$('#nutritionDetailMealType').value}|${item.id}`,now=Date.now();if(lastAdd.key===key&&now-lastAdd.at<ADD_LOCK_MS){toast?.('Dieser Eintrag wurde bereits hinzugefügt.');return}lastAdd={key,at:now};const options={factor:amount/Math.max(.0001,Number(item.amount)||100),type:$('#nutritionDetailMealType').value,dateKey:selectedDate};const result=personalItem(item.id)?library().addItemToDay(item.id,options):library().addCatalogItemToDay(item,options);if(!result)return;closeModalSafe('nutritionDetailModal');try{navigator.vibrate?.(18)}catch{}window.render?.();toast?.(`${item.name} eingetragen.`);
  }

  function detailSaveOnly(){const saved=ensurePersonal(detailItem);if(!saved)return;detailItem=saved;renderDetail();toast?.('In der Bibliothek gespeichert.');window.render?.()}
  function detailFavorite(){let item=personalItem(detailItem.id)||ensurePersonal(detailItem);if(!item)return;const db=libraryData(),target=db.items.find(entry=>String(entry.id)===String(item.id));target.favorite=!target.favorite;if(!library().importData(db))return;detailItem=personalItem(item.id);renderDetail();toast?.(target.favorite?'Als Favorit gespeichert.':'Favorit entfernt.');window.render?.()}
  function detailEdit(){const item=personalItem(detailItem.id)||ensurePersonal(detailItem);if(!item)return;closeModalSafe('nutritionDetailModal');if(item.kind==='recipe'){openRecipeEditor(item.id);return}const button=document.querySelector(`[data-edit-lib="${globalThis.CSS?.escape?CSS.escape(item.id):item.id}"]`);if(button)button.click();else toast?.('Öffne den Eintrag über die Bibliothek zum Bearbeiten.')}
  function detailDuplicate(){if(detailItem?.kind!=='recipe')return;closeModalSafe('nutritionDetailModal');openRecipeEditor(detailItem.id,{duplicate:true})}

  function ensureAnalysis(){
    const compass=$('.nutrition-macro-compass');if(!compass||$('#nutritionV7Analysis'))return;compass.insertAdjacentHTML('afterend','<section id="nutritionV7Analysis" class="nutrition-v7-analysis"><div class="nutrition-v7-analysis-head"><div><small>Zusatzwerte</small><strong>Nährwertabdeckung</strong></div><span id="nutritionV7Coverage">0 %</span></div><div class="nutrition-v7-analysis-grid"><article><small>Ballaststoffe</small><b id="nutritionV7Fiber">–</b></article><article><small>Zucker</small><b id="nutritionV7Sugar">–</b></article><article><small>Gesättigt</small><b id="nutritionV7Sat">–</b></article><article><small>Salz</small><b id="nutritionV7Salt">–</b></article></div><p id="nutritionV7AnalysisText"></p></section>');
  }
  function renderAnalysis(){
    ensureAnalysis();let root=$('#nutritionV7Analysis');if(!root||typeof totals!=='function'||typeof day!=='function')return;
    let nodes={coverage:$('#nutritionV7Coverage'),fiber:$('#nutritionV7Fiber'),sugar:$('#nutritionV7Sugar'),sat:$('#nutritionV7Sat'),salt:$('#nutritionV7Salt'),text:$('#nutritionV7AnalysisText')};
    if(Object.values(nodes).some(node=>!node)){root.remove();ensureAnalysis();root=$('#nutritionV7Analysis');nodes={coverage:$('#nutritionV7Coverage'),fiber:$('#nutritionV7Fiber'),sugar:$('#nutritionV7Sugar'),sat:$('#nutritionV7Sat'),salt:$('#nutritionV7Salt'),text:$('#nutritionV7AnalysisText')}}
    if(!root||Object.values(nodes).some(node=>!node))return;
    const total=totals(selectedDate),meals=day(selectedDate,false).meals||[],count=Math.max(1,meals.length),coverage=total.nutrientCoverage||{},ratios=['fiber','sugar','saturatedFat','salt'].map(key=>Math.min(1,(Number(coverage[key])||0)/count)),average=meals.length?ratios.reduce((a,b)=>a+b,0)/ratios.length:0;
    nodes.coverage.textContent=`${Math.round(average*100)} %`;nodes.fiber.textContent=meals.length&&coverage.fiber?`${fmt(total.fiber,1)} g`:'–';nodes.sugar.textContent=meals.length&&coverage.sugar?`${fmt(total.sugar,1)} g`:'–';nodes.sat.textContent=meals.length&&coverage.saturatedFat?`${fmt(total.saturatedFat,1)} g`:'–';nodes.salt.textContent=meals.length&&coverage.salt?`${fmt(total.salt,2)} g`:'–';nodes.text.textContent=!meals.length?'Zusatzwerte erscheinen, sobald Mahlzeiten eingetragen sind.':average<.5?'Die Analyse ist noch unvollständig, weil mehrere Lebensmittel keine Zusatzwerte liefern.':average<.9?'Ein Teil der Zusatzwerte fehlt. Angezeigte Summen deshalb vorsichtig interpretieren.':'Die Zusatzwerte sind für fast alle heutigen Einträge vorhanden.';
  }

  async function exportEnhanced(event){
    event.preventDefault();event.stopImmediatePropagation();const payload={format:'cutcoach-library-v2',version:2,appVersion:window.CUTCOACH_RELEASE||'7.0.0',exportedAt:new Date().toISOString(),data:libraryData(),recipeMeta,portionProfiles};try{await shareOrDownload(JSON.stringify(payload,null,2),`CutCoach-Bibliothek-${typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}.json`,'CutCoach Bibliothek');toast?.('Bibliothek inklusive Rezeptdetails gesichert.')}catch(error){if(error?.name!=='AbortError')toast?.('Bibliothek konnte nicht exportiert werden.')}
  }
  function importEnhanced(event){
    const input=event.target;if(input.id!=='importLibrary')return;event.stopImmediatePropagation();const file=input.files?.[0];input.value='';if(!file)return;if(file.size>5*1024*1024){toast?.('Datei ist zu groß.');return}const reader=new FileReader();reader.onload=()=>{try{const parsed=JSON.parse(reader.result),data=parsed?.format==='cutcoach-library-v2'?parsed.data:parsed?.format==='cutcoach-library'?parsed.data:parsed;if(!data?.items)throw new Error('invalid');if(!confirm(`${data.items.length} Bibliothekseinträge importieren? Die aktuelle Bibliothek wird ersetzt.`))return;if(!library().importData(data))return;if(parsed?.format==='cutcoach-library-v2'){recipeMeta=parsed.recipeMeta&&typeof parsed.recipeMeta==='object'?parsed.recipeMeta:{};portionProfiles=parsed.portionProfiles&&typeof parsed.portionProfiles==='object'?parsed.portionProfiles:{};safeWrite(RECIPE_META_KEY,recipeMeta);safeWrite(PORTION_PROFILE_KEY,portionProfiles)}migrateRecipeMeta();toast?.('Bibliothek importiert.');window.render?.()}catch{toast?.('Ungültige Bibliotheksdatei.')}};reader.readAsText(file);
  }

  function migrateRecipeMeta(){
    let changed=false;for(const item of libraryData().items.filter(entry=>entry.kind==='recipe'))if(!recipeMeta[item.id]){recipeMeta[item.id]=legacyRecipeMeta(item);changed=true}for(const id of Object.keys(recipeMeta))if(!personalItem(id)){delete recipeMeta[id];changed=true}if(changed)safeWrite(RECIPE_META_KEY,recipeMeta);
  }

  function normalizeDecimalInputs(){document.querySelectorAll('input[inputmode="decimal"]').forEach(input=>{if(input.dataset.v7Decimal)return;input.dataset.v7Decimal='1';input.addEventListener('change',()=>{const raw=String(input.value||'').trim();if(raw.includes(',')&&Number.isFinite(Number(raw.replace(',','.'))))input.value=raw.replace(',','.')})})}

  function captureClick(event){
    const result=event.target.closest?.('[data-nutrition-open]');if(result&&document.body.classList.contains('nutrition-mode')){event.preventDefault();event.stopImmediatePropagation();openDetail(result.dataset.nutritionOpen);return}
    const recipeKind=event.target.closest?.('#libraryItemModal [data-kind="recipe"]');if(recipeKind){event.preventDefault();event.stopImmediatePropagation();closeModalSafe('libraryItemModal');openRecipeEditor();return}
    const edit=event.target.closest?.('[data-edit-lib]');if(edit){const item=personalItem(edit.dataset.editLib);if(item?.kind==='recipe'){event.preventDefault();event.stopImmediatePropagation();openRecipeEditor(item.id);return}}
    const exportButton=event.target.closest?.('#exportLibrary');if(exportButton){exportEnhanced(event);return}
  }

  function bindUi(){
    $('[data-recipe-v7-close]').onclick=()=>closeModalSafe('recipeV7Modal');$('[data-detail-close]').onclick=()=>closeModalSafe('nutritionDetailModal');$('#recipeV7Modal').addEventListener('click',event=>{if(event.target.id==='recipeV7Modal')closeModalSafe(event.target)});$('#nutritionDetailModal').addEventListener('click',event=>{if(event.target.id==='nutritionDetailModal')closeModalSafe(event.target)});
    $('#recipeV7Search').addEventListener('input',renderIngredientResults);$('#recipeV7SearchResults').addEventListener('click',event=>{const button=event.target.closest('[data-recipe-ingredient]');if(button)selectIngredient(button.dataset.recipeIngredient)});$('#recipeV7Add').onclick=addSelectedIngredient;$('#recipeV7Servings').oninput=renderRecipeSummary;$('#recipeV7Name').oninput=renderRecipeSummary;$('#recipeV7Save').onclick=saveRecipe;$('#recipeV7Delete').onclick=deleteRecipe;
    $('#recipeV7Components').addEventListener('input',event=>{const input=event.target.closest('[data-recipe-amount]');if(!input)return;const index=Number(input.dataset.recipeAmount),value=number(input.value);if(recipeDraft[index]&&value!==null&&value>0)recipeDraft[index].amount=round(value,2);renderRecipeSummary()});$('#recipeV7Components').addEventListener('click',event=>{const button=event.target.closest('[data-recipe-remove]');if(!button)return;recipeDraft.splice(Number(button.dataset.recipeRemove),1);renderRecipeDraft()});
    $('#nutritionDetailAmount').oninput=renderDetail;$('#nutritionDetailPresets').onclick=event=>{const button=event.target.closest('[data-detail-amount]');if(!button)return;$('#nutritionDetailAmount').value=button.dataset.detailAmount;renderDetail()};$('#nutritionDetailAdd').onclick=detailAdd;$('#nutritionDetailSaveOnly').onclick=detailSaveOnly;$('#nutritionDetailFavorite').onclick=detailFavorite;$('#nutritionDetailEdit').onclick=detailEdit;$('#nutritionDetailDuplicate').onclick=detailDuplicate;
    document.addEventListener('click',captureClick,true);document.addEventListener('change',importEnhanced,true);
  }

  function enhanceVersion(){const version=$('#appVersion'),release=window.CUTCOACH_RELEASE||'7.0.0',text=`Version ${release}`;if(version&&version.textContent!==text)version.textContent=text}
  function enhance(){normalizeDecimalInputs();renderAnalysis();enhanceVersion()}
  function start(){
    if(initialized)return;if(!library()||!$('#libraryScreen')){setTimeout(start,80);return}initialized=true;injectUi();bindUi();migrateRecipeMeta();originalCreateItem=library().createItem?.bind(library());if(originalCreateItem)library().createItem=(kind,initial={})=>kind==='recipe'?openRecipeEditor(null,{name:typeof initial==='string'?initial:initial?.name||''}):originalCreateItem(kind,initial);
    const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){baseRender();enhance()};window.addEventListener('cutcoach:librarychange',enhance);document.addEventListener('pageshow',enhance);enhance();
    window.CutCoachNutritionV7={openRecipeEditor,openDetail,migrateRecipeMeta,recipeMeta:()=>clone(recipeMeta),portionProfiles:()=>clone(portionProfiles)};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
