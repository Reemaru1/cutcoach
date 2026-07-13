'use strict';

(function(){
  const VERSION='3.2.0';
  const API_BASE='https://world.openfoodfacts.org/api/v2/product/';
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
  function number(value){const n=Number(value);return Number.isFinite(n)&&n>=0?Math.round(n*10)/10:0;}
  function setScannerStatus(text,state='info'){
    const node=$('#scannerStatus');if(!node)return;
    node.textContent=text;node.dataset.state=state;
  }
  function productName(product){
    const name=String(product.product_name_de||product.product_name||'').trim();
    const brand=String(product.brands||'').split(',')[0].trim();
    if(name&&brand&&!name.toLowerCase().includes(brand.toLowerCase()))return `${brand} – ${name}`.slice(0,80);
    return (name||brand||'Unbekanntes Produkt').slice(0,80);
  }
  function nutrition(product){
    const n=product.nutriments||{};
    let calories=number(n['energy-kcal_100g']);
    if(!calories&&number(n.energy_100g))calories=Math.round(number(n.energy_100g)/4.184*10)/10;
    return {
      calories,
      protein:number(n.proteins_100g),
      carbs:number(n.carbohydrates_100g),
      fat:number(n.fat_100g)
    };
  }

  async function fetchProduct(code){
    const url=`${API_BASE}${encodeURIComponent(code)}.json?fields=${encodeURIComponent(FIELDS)}`;
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),10000);
    try{
      const response=await fetch(url,{headers:{Accept:'application/json'},signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const data=await response.json();
      return data?.status===1&&data.product?data.product:null;
    }finally{clearTimeout(timeout);}
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
        const name=$('#libName');if(name&&!name.value)name.value=productName(product);
        if(values){
          const mapping=[['#libCalories',values.calories],['#libProtein',values.protein],['#libCarbs',values.carbs],['#libFat',values.fat]];
          mapping.forEach(([selector,value])=>{const input=$(selector);if(input&&value>0)input.value=value;});
        }
      }
      const barcode=$('#libBarcode');if(barcode)barcode.value=code;
    },80);
  }

  async function lookupWithOpenFoodFacts(){
    if(busy)return;
    const code=cleanCode($('#manualCode')?.value);
    if(!code){toast('Bitte einen gültigen Barcode eingeben.');return;}
    if(!navigator.onLine){toast('Offline: gespeicherte lokale Daten werden verwendet.');originalLookup?.();return;}
    busy=true;
    const button=$('#lookupManualCode');if(button){button.disabled=true;button.textContent='Suche …';}
    setScannerStatus('Produkt wird bei Open Food Facts gesucht …');
    try{
      const product=await fetchProduct(code);
      if(!product){
        setScannerStatus('Produkt nicht bei Open Food Facts gefunden. Werte bitte einmalig eintragen.','error');
        openManualWithPrefill(code);
        return;
      }
      const values=nutrition(product);
      if(!values.calories){
        setScannerStatus('Produkt gefunden, aber Kalorien fehlen. Bitte Werte prüfen und ergänzen.','error');
        openManualWithPrefill(code,product,values);
        return;
      }
      saveProduct(code,product,values);
      setScannerStatus(`Gefunden: ${productName(product)}`,'success');
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
