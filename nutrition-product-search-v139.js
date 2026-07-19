'use strict';
(function(){
  const VERSION='1.3.9 Alpha';
  const SEARCH_API='https://search.openfoodfacts.org/search';
  const LEGACY_API='https://world.openfoodfacts.org/cgi/search.pl';
  const CACHE_KEY='cutcoach_off_product_search_v1';
  const PROFILE_KEY='cutcoach_portion_profiles_v1';
  const CACHE_TTL=24*60*60*1000;
  const NETWORK_COOLDOWN=6000;
  const MAX_CACHE_QUERIES=12;
  const MAX_RESULTS=12;
  const FIELDS='code,product_name,product_name_de,generic_name,generic_name_de,brands,quantity,serving_size,nutriments,image_front_small_url,image_url,countries_tags,completeness';
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  let root=null,observer=null,currentQuery='',controller=null,lastNetworkAt=0,busy=false;

  function readJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key)||'null');return value&&typeof value==='object'?value:fallback}catch{return fallback}}
  function writeJson(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch{return false}}
  function readCache(){const value=readJson(CACHE_KEY,{version:1,queries:{}});return value?.version===1&&value.queries&&typeof value.queries==='object'?value:{version:1,queries:{}}}
  function cached(query){const entry=readCache().queries[normalize(query)];return entry&&Date.now()-Number(entry.savedAt)<CACHE_TTL&&Array.isArray(entry.products)?entry:null}
  function cacheProducts(query,products){const cache=readCache(),key=normalize(query);cache.queries[key]={savedAt:Date.now(),products};const ordered=Object.entries(cache.queries).sort((a,b)=>Number(b[1]?.savedAt)-Number(a[1]?.savedAt)).slice(0,MAX_CACHE_QUERIES);cache.queries=Object.fromEntries(ordered);writeJson(CACHE_KEY,cache)}
  function number(value){if(typeof value==='string')value=value.replace(',','.').trim();const parsed=Number(value);return Number.isFinite(parsed)&&parsed>=0?Math.round(parsed*100)/100:0}
  function optionalNumber(value){if(value===null||value===undefined||value==='')return null;const parsed=number(value);return Number.isFinite(parsed)?parsed:null}
  function firstNumber(object,keys){for(const key of keys){const value=number(object?.[key]);if(value>0)return value}return 0}
  function optionalFirstNumber(object,keys){for(const key of keys){const raw=object?.[key];if(raw===null||raw===undefined||raw==='')continue;return optionalNumber(raw)}return null}
  function textValue(value){if(typeof value==='string')return value.trim();if(Array.isArray(value))return value.map(textValue).find(Boolean)||'';if(value&&typeof value==='object')return textValue(value.de)||textValue(value.en)||textValue(value.default)||Object.values(value).map(textValue).find(Boolean)||'';return''}
  function safeImage(value){try{const url=new URL(String(value||''));return url.protocol==='https:'?url.href:''}catch{return''}}
  function parsePortion(text){const match=String(text||'').toLocaleLowerCase('de').match(/(\d+(?:[.,]\d+)?)\s*(kg|g|ml|cl|l|stück|stueck|portion)/);if(!match)return null;let amount=Number(match[1].replace(',','.')),unit=match[2];if(unit==='kg'){amount*=1000;unit='g'}else if(unit==='cl'){amount*=10;unit='ml'}else if(unit==='l'){amount*=1000;unit='ml'}else if(unit==='stück'||unit==='stueck')unit='Stück';else if(unit==='portion')unit='Portion';return amount>0?{amount:Math.round(amount*100)/100,unit}:null}
  function nutrientValues(product){const n=product?.nutriments||product?.nutritional_data||{};let calories=firstNumber(n,['energy-kcal_100g','energy_kcal_100g','energy-kcal','energy_kcal']);if(!calories){const kj=firstNumber(n,['energy_100g','energy-kj_100g','energy_kj_100g','energy-kj']);if(kj)calories=Math.round(kj/4.184*100)/100}return{calories,protein:firstNumber(n,['proteins_100g','protein_100g','proteins','protein']),carbs:firstNumber(n,['carbohydrates_100g','carbohydrate_100g','carbohydrates','carbohydrate']),fat:firstNumber(n,['fat_100g','fats_100g','fat','fats']),fiber:optionalFirstNumber(n,['fiber_100g','fibers_100g','fiber','fibers']),sugar:optionalFirstNumber(n,['sugars_100g','sugar_100g','sugars','sugar']),saturatedFat:optionalFirstNumber(n,['saturated-fat_100g','saturated_fat_100g','saturated-fat','saturated_fat']),salt:optionalFirstNumber(n,['salt_100g','salt'])}}
  function normalizeProduct(raw){
    const product=raw?._source||raw?.source||raw||{},code=String(product.code||product._id||'').replace(/\D/g,'').slice(0,32);
    const baseName=textValue(product.product_name_de)||textValue(product.product_name)||textValue(product.generic_name_de)||textValue(product.generic_name),brand=textValue(product.brands).split(',')[0].trim();
    const name=baseName&&brand&&!normalize(baseName).includes(normalize(brand))?`${brand} – ${baseName}`:baseName||brand;
    const nutrients=nutrientValues(product);if(!code||!name||nutrients.calories<=0||!(nutrients.protein>0||nutrients.carbs>0||nutrients.fat>0))return null;
    const countries=Array.isArray(product.countries_tags)?product.countries_tags.map(String):[];
    return{code,name:name.slice(0,100),brand:brand.slice(0,60),quantity:textValue(product.quantity).slice(0,40),servingSize:textValue(product.serving_size).slice(0,40),image:safeImage(product.image_front_small_url||product.image_url),countries,nutrients,completeness:number(product.completeness)};
  }
  function rankProduct(product,query){const q=normalize(query),name=normalize(product.name),brand=normalize(product.brand),tokens=q.split(' ').filter(Boolean);let score=0;if(name===q||brand===q)score+=900;if(name.startsWith(q)||brand.startsWith(q))score+=500;if(tokens.every(token=>name.includes(token)||brand.includes(token)))score+=300;score+=product.countries.some(tag=>/germany|deutschland/.test(normalize(tag)))?120:0;score+=Math.min(60,product.completeness*60);if(product.image)score+=8;return score}
  function parsePayload(payload,query){const rows=Array.isArray(payload?.hits)?payload.hits:Array.isArray(payload?.products)?payload.products:[];const seen=new Set(),products=[];for(const raw of rows){const product=normalizeProduct(raw);if(!product||seen.has(product.code))continue;seen.add(product.code);products.push(product)}return products.sort((a,b)=>rankProduct(b,query)-rankProduct(a,query)||a.name.localeCompare(b.name,'de')).slice(0,MAX_RESULTS)}
  function safeQuery(value){return String(value||'').replace(/[+\-&|!(){}\[\]^"~*?:\\/]/g,' ').replace(/\s+/g,' ').trim().slice(0,80)}
  async function requestJson(url,signal){const response=await fetch(url,{headers:{Accept:'application/json'},signal,cache:'no-store',mode:'cors'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()}
  async function fetchProducts(query,signal){
    const safe=safeQuery(query),primary=new URL(SEARCH_API);primary.searchParams.set('q',safe);primary.searchParams.set('langs','de,en');primary.searchParams.set('page_size','24');primary.searchParams.set('page','1');primary.searchParams.set('boost_phrase','true');primary.searchParams.set('fields',FIELDS);
    try{return parsePayload(await requestJson(primary.toString(),signal),query)}catch(primaryError){
      if(signal.aborted)throw primaryError;
      const legacy=new URL(LEGACY_API);legacy.searchParams.set('search_terms',safe);legacy.searchParams.set('search_simple','1');legacy.searchParams.set('action','process');legacy.searchParams.set('json','1');legacy.searchParams.set('page_size','24');legacy.searchParams.set('fields',FIELDS);
      return parsePayload(await requestJson(legacy.toString(),signal),query);
    }
  }
  function mealType(){return document.body.dataset.nutritionMealType||$('#nutritionMealSelect',root)?.value||'Frühstück'}
  function dateKey(){try{return typeof selectedDate==='string'?selectedDate:new Date().toISOString().slice(0,10)}catch{return new Date().toISOString().slice(0,10)}}
  function notify(text){try{if(typeof toast==='function')toast(text)}catch{}}
  function setStatus(text,state='info'){const node=$('#nutritionProductSearchStatus',root);if(node){node.textContent=text;node.dataset.state=state;node.hidden=!text}}
  function setBusy(value){busy=value;const button=$('#nutritionProductSearchButton',root);if(button){button.disabled=value;button.setAttribute('aria-busy',String(value));button.querySelector('b').textContent=value?'Produkte werden gesucht …':'Markenprodukte suchen'}}
  function updateButton(){const input=$('#nutritionSearch',root),button=$('#nutritionProductSearchButton',root);if(!input||!button)return;const valid=normalize(input.value).length>=2;button.hidden=!valid;button.disabled=busy||!valid}
  function ensureUi(){
    if(!root)return false;const input=$('#nutritionSearch',root),card=$('.nutrition-search-card',root),head=$('.nutrition-browse-head',root);if(!input||!card||!head)return false;
    if(!$('#nutritionProductSearchButton',root))card.insertAdjacentHTML('beforeend','<button id="nutritionProductSearchButton" class="nutrition-product-search-button" type="button" hidden><span aria-hidden="true">🏷️</span><span><b>Markenprodukte suchen</b><small>Open Food Facts · nur auf Anfrage</small></span></button><p id="nutritionProductSearchStatus" class="nutrition-product-search-status" aria-live="polite" hidden></p>');
    if(!$('#nutritionOnlineProducts',root))head.insertAdjacentHTML('afterend','<section id="nutritionOnlineProducts" class="nutrition-online-products" hidden aria-live="polite"></section>');
    updateButton();return true;
  }
  function productRow(product){const n=product.nutrients,pack=product.quantity||'100 g',brand=product.brand?`<span>${escapeHtml(product.brand)}</span>`:'',image=product.image?`<img src="${escapeHtml(product.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">`:'<span aria-hidden="true">🥫</span>';return `<article class="nutrition-online-row" data-off-code="${escapeHtml(product.code)}"><button class="nutrition-online-main" type="button" data-off-open="${escapeHtml(product.code)}" aria-label="${escapeHtml(product.name)}, Portion auswählen"><span class="nutrition-online-image">${image}</span><span class="nutrition-online-copy"><b>${escapeHtml(product.name)}</b><small>${escapeHtml(pack)} · E ${fmt(n.protein,1)} · KH ${fmt(n.carbs,1)} · F ${fmt(n.fat,1)}</small>${brand}</span></button><span class="nutrition-online-energy"><b>${fmt(n.calories)} kcal</b><small>pro 100 g</small></span><button class="nutrition-online-add" type="button" data-off-add="${escapeHtml(product.code)}" aria-label="${escapeHtml(product.name)} direkt zu ${escapeHtml(mealType())} hinzufügen">＋</button></article>`}
  function render(products,query,source='network'){
    const host=$('#nutritionOnlineProducts',root);if(!host)return;currentQuery=normalize(query);
    if(!products.length){host.hidden=false;host.innerHTML='<div class="nutrition-online-empty"><b>Keine passenden Markenprodukte gefunden</b><small>Die lokale BLS-Datenbank bleibt weiterhin verfügbar. Alternativ Barcode scannen oder Produkt neu anlegen.</small></div>';return}
    host.hidden=false;host.innerHTML=`<div class="nutrition-online-head"><div><small>PRODUKTDATENBANK</small><strong>Markenprodukte</strong></div><span>${fmt(products.length)} Treffer${source==='cache'?' · gespeichert':''}</span></div><div class="nutrition-online-list">${products.map(productRow).join('')}</div><p class="nutrition-online-source">Daten: <a href="https://world.openfoodfacts.org/" target="_blank" rel="noopener">Open Food Facts</a> · ODbL · Produktangaben können unvollständig sein.</p>`;
    host._products=new Map(products.map(product=>[product.code,product]));
  }
  function clearResults(){const host=$('#nutritionOnlineProducts',root);if(host){host.hidden=true;host.innerHTML='';host._products=null}setStatus('')}
  function savePortionProfile(product){const serving=parsePortion(product.servingSize),pack=parsePortion(product.quantity);if(!serving&&!pack)return;const profiles=readJson(PROFILE_KEY,{});profiles[product.code]={servingAmount:serving?.amount||null,servingUnit:serving?.unit||null,packageAmount:pack?.amount||null,packageUnit:pack?.unit||null,updatedAt:new Date().toISOString(),source:'off'};writeJson(PROFILE_KEY,profiles)}
  function saveProduct(product){
    const library=window.CutCoachLibrary;if(!library?.exportData||!library?.importData)throw new Error('Bibliothek nicht bereit');const db=library.exportData(),existing=db.items.find(item=>item.barcode===product.code||(item.source==='off'&&String(item.sourceId)===product.code)),n=product.nutrients;
    if(existing?.modified){savePortionProfile(product);return existing.id}
    const item={id:existing?.id||`off_${product.code}`,name:product.name,kind:'food',barcode:product.code,amount:100,unit:'g',calories:n.calories,protein:n.protein,carbs:n.carbs,fat:n.fat,fiber:n.fiber,sugar:n.sugar,saturatedFat:n.saturatedFat,salt:n.salt,source:'off',sourceId:product.code,sourceVersion:'search-v1',modified:false,favorite:Boolean(existing?.favorite),uses:Number(existing?.uses)||0,lastUsedAt:existing?.lastUsedAt||null,createdAt:existing?.createdAt||new Date().toISOString(),components:[]};
    if(existing)Object.assign(existing,item);else db.items.push(item);if(library.importData(db)===false)throw new Error('Produkt konnte nicht gespeichert werden');savePortionProfile(product);window.dispatchEvent(new CustomEvent('cutcoach:librarychange'));return item.id;
  }
  function selectedProduct(code){return $('#nutritionOnlineProducts',root)?._products?.get(String(code))||null}
  function openProduct(product){try{const id=saveProduct(product),library=window.CutCoachLibrary;if(library?.openUse?.(id,mealType()))return;const escaped=globalThis.CSS?.escape?CSS.escape(id):id;document.querySelector(`[data-use-lib="${escaped}"]`)?.click()}catch(error){console.error(error);notify('Produkt konnte nicht geöffnet werden.')}}
  function addProduct(product){try{const id=saveProduct(product),library=window.CutCoachLibrary,result=library?.addItemToDay?.(id,{type:mealType(),dateKey:dateKey()});if(!result)throw new Error('Eintrag fehlgeschlagen');window.render?.();notify(`${product.name} zu ${mealType()} hinzugefügt.`)}catch(error){console.error(error);notify('Produkt konnte nicht hinzugefügt werden.')}}
  async function searchProducts(query=$('#nutritionSearch',root)?.value){
    query=String(query||'').trim();if(normalize(query).length<2){setStatus('Bitte mindestens zwei Zeichen eingeben.','error');return[]}
    const saved=cached(query);if(saved){render(saved.products,query,'cache');setStatus(`${saved.products.length} gespeicherte Produkttreffer geladen.`,'success');return saved.products}
    if(!navigator.onLine){setStatus('Offline und noch keine gespeicherten Treffer für diese Suche vorhanden.','error');return[]}
    if(Date.now()-lastNetworkAt<NETWORK_COOLDOWN){setStatus('Bitte kurz warten, bevor du eine weitere Online-Suche startest.','error');return[]}
    controller?.abort();controller=new AbortController();lastNetworkAt=Date.now();setBusy(true);setStatus(`Markenprodukte zu „${query}“ werden gesucht …`);
    try{const products=await fetchProducts(query,controller.signal);cacheProducts(query,products);render(products,query);setStatus(products.length?`${products.length} Markenprodukte gefunden.`:'Keine Markenprodukte mit vollständigen Nährwerten gefunden.',products.length?'success':'info');return products}catch(error){if(error?.name==='AbortError')return[];console.warn('Open Food Facts text search failed',error);setStatus('Produktdatenbank ist gerade nicht erreichbar. Lokale BLS-Treffer funktionieren weiterhin.','error');return[]}finally{setBusy(false);updateButton()}
  }
  function onInput(event){if(event.target?.id!=='nutritionSearch')return;const next=normalize(event.target.value);if(currentQuery&&next!==currentQuery)clearResults();updateButton()}
  function onKeydown(event){if(event.target?.id==='nutritionSearch'&&event.key==='Enter'){event.preventDefault();searchProducts(event.target.value)}}
  function onClick(event){const search=event.target.closest?.('#nutritionProductSearchButton');if(search){searchProducts();return}const add=event.target.closest?.('[data-off-add]');if(add){const product=selectedProduct(add.dataset.offAdd);if(product)addProduct(product);return}const open=event.target.closest?.('[data-off-open]');if(open){const product=selectedProduct(open.dataset.offOpen);if(product)openProduct(product)}}
  function start(found){root=found;if(root.dataset.productSearch139)return;root.dataset.productSearch139='1';ensureUi();observer=new MutationObserver(()=>ensureUi());observer.observe(root,{childList:true,subtree:true});root.addEventListener('input',onInput,{passive:true});root.addEventListener('search',event=>{if(event.target?.id==='nutritionSearch')searchProducts(event.target.value)});root.addEventListener('keydown',onKeydown);root.addEventListener('click',onClick,true)}
  function boot(){const found=document.querySelector('[data-screen="food"]');if(found){start(found);return}const bootstrap=new MutationObserver(()=>{const node=document.querySelector('[data-screen="food"]');if(!node)return;bootstrap.disconnect();start(node)});bootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CutCoachNutritionProducts139=Object.freeze({version:VERSION,search:searchProducts,normalizeProduct,parsePayload});
})();