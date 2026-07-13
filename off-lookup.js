'use strict';

(function(){
  const VERSION='3.2.1';
  const API_V2='https://world.openfoodfacts.org/api/v2/product/';
  const API_V0='https://world.openfoodfacts.org/api/v0/product/';
  const FIELDS='code,product_name,product_name_de,brands,quantity,serving_size,nutriments';
  let originalLookup=null;
  let busy=false;

  function $(selector){return document.querySelector(selector);}
  function waitForLibrary(){
    const button=$('#lookupManualCode');
    if(!button||!window.CutCoachLibrary){setTimeout(waitForLibrary,120);return;}
    originalLookup=button.onclick;
    button.onclick=lookupWithOpenFoodFacts;
    const version=$('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }

  function cleanCode(value){return String(value||'').replace(/[^0-9A-Za-z._-]/g,'').slice(0,64);}
  function number(value){
    if(typeof value==='string')value=value.replace(',','.').trim();
    const n=Number(value);
    return Number.isFinite(n)&&n>=0?Math.round(n*10)/10:0;
  }
  function firstNumber(object,keys){
    for(const key of keys){const value=number(object?.[key]);if(value>0)return value;}
    return 0;
  }
  function setScannerStatus(text,state='info'){
    const node=$('#scannerStatus');if(!node)return;
    node.textContent=text;node.dataset.state=state;
  }
  function productName(product){
    const name=String(product.product_name_de||product.product_name||product.generic_name_de||product.generic_name||'').trim();
    const brand=String(product.brands||'').split(',')[0].trim();
    if(name&&brand&&!name.toLowerCase().includes(brand.toLowerCase()))return `${brand} – ${name}`.slice(0,80);
    return (name||brand||'Unbekanntes Produkt').slice(0,80);
  }
  function nutrition(product){
    const n=product?.nutriments||product?.nutritional_data||{};
    let calories=firstNumber(n,['energy-kcal_100g','energy-kcal','energy_kcal_100g','energy_kcal']);
    if(!calories){
      const kj=firstNumber(n,['energy_100g','energy','energy-kj_100g','energy-kj']);
      if(kj)calories=Math.round(kj/4.184*10)/10;
    }
    return {
      calories,
      protein:firstNumber(n,['proteins_100g','protein_100g','proteins','protein']),
      carbs:firstNumber(n,['carbohydrates_100g','carbohydrate_100g','carbohydrates','carbohydrate']),
      fat:firstNumber(n,['fat_100g','fats_100g','fat','fats'])
    };
  }
  function hasUsefulNutrition(values){return values.calories>0&&(values.protein>0||values.carbs>0||values.fat>0);}

  async function requestJson(url){
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      return await response.json();
    }finally{clearTimeout(timeout);}
  }
  async function fetchProduct(code){
    let firstProduct=null;
    try{
      const v2=await requestJson(`${API_V2}${encodeURIComponent(code)}.json?fields=${encodeURIComponent(FIELDS)}`);
      if(v2?.status===1&&v2.product){
        firstProduct=v2.product;
        if(hasUsefulNutrition(nutrition(firstProduct)))return firstProduct;
      }
    }catch(error){console.warn('Open Food Facts v2 failed',error);}
    try{
      const v0=await requestJson(`${API_V0}${encodeURIComponent(code)}.json`);
      if(v0?.status===1&&v0.product)return v0.product;
    }catch(error){console.warn('Open Food Facts v0 failed',error);}
    return firstProduct;
  }

  function saveProduct(code,product,values){
    const db=window.CutCoachLibrary.exportData();
    const existing=db.items.find(item=>item.barcode===code);
    const item={
      id:existing?.id||`off_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`,
      name:productName(product),kind:'food',barcode:code,amount:100,unit:'g',
      calories:values.calories,protein:values.protein,carbs:values.carbs,fat:values.fat,
      favorite:Boolean(existing?.favorite),uses:existing?.uses||0,lastUsedAt:existing?.lastUsedAt||null,
      createdAt:existing?.createdAt||new Date().toISOString(),components:[]
    };
    if(existing)Object.assign(existing,item);else db.items.push(item);
    window.CutCoachLibrary.importData(db);
  }

  function openManualWithPrefill(code,product=null,values=null){
    originalLookup?.();
    setTimeout(()=>{
      if(product){
        const name=$('#libName');if(name)name.value=productName(product);
        if(values){
          [['#libCalories',values.calories],['#libProtein',values.protein],['#libCarbs',values.carbs],['#libFat',values.fat]].forEach(([selector,value])=>{const input=$(selector);if(input&&Number.isFinite(value))input.value=value||'';});
        }
      }
      const barcode=$('#libBarcode');if(barcode)barcode.value=code;
    },120);
  }

  async function lookupWithOpenFoodFacts(){
    if(busy)return;
    const code=cleanCode($('#manualCode')?.value);
    if(!code){toast('Bitte einen gültigen Barcode eingeben.');return;}
    if(!navigator.onLine){toast('Offline: gespeicherte lokale Daten werden verwendet.');originalLookup?.();return;}
    busy=true;
    const button=$('#lookupManualCode');if(button){button.disabled=true;button.textContent='Suche …';}
    setScannerStatus('Produkt und Nährwerte werden bei Open Food Facts gesucht …');
    try{
      const product=await fetchProduct(code);
      if(!product){
        setScannerStatus('Produkt nicht bei Open Food Facts gefunden. Werte bitte einmalig eintragen.','error');
        openManualWithPrefill(code);
        return;
      }
      const values=nutrition(product);
      if(!values.calories){
        setScannerStatus('Produkt gefunden, aber keine verwertbaren Kalorien hinterlegt. Bitte Werte ergänzen.','error');
        openManualWithPrefill(code,product,values);
        return;
      }
      saveProduct(code,product,values);
      setScannerStatus(`Gefunden: ${productName(product)} · ${values.calories} kcal/100 g`,'success');
      toast('Produktdaten von Open Food Facts übernommen.');
      originalLookup?.();
    }catch(error){
      console.warn('Open Food Facts lookup failed',error);
      toast('Open Food Facts ist gerade nicht erreichbar. Lokale Daten werden verwendet.');
      originalLookup?.();
    }finally{
      busy=false;
      if(button){button.disabled=false;button.textContent='Suchen';}
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForLibrary,{once:true});else waitForLibrary();
})();