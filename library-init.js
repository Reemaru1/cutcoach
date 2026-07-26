'use strict';
(function(root){
  const VERSION='7.0.1-product-bootstrap';
  function normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
  function bootstrapProducts(){
    const base=root.CutCoachFoodCatalog;
    if(!base?.items||root.CutCoachLibraryProductBootstrap)return;
    const existing=base.items();
    const occupied=new Set(existing.flatMap(item=>[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[])]).map(normalize).filter(Boolean));
    const definitions=[
      ['milch-schnitte-original','Milch-Schnitte Original','Ferrero',['Milchschnitte','Milch Schnitte','Kinder Milchschnitte','Kinder Milch-Schnitte','Ferrero Milchschnitte'],421,7.9,34,27.9,28],
      ['kinder-pingui','kinder Pinguí Schoko','Ferrero',['Kinder Pingui','Kinder Pinguin','Pingui Schoko'],450,7,37.8,29.7,30],
      ['kinder-bueno','kinder bueno','Ferrero',['Kinder Bueno','Bueno Riegel'],572,8.6,49.5,37.3,21.5],
      ['kinder-riegel','kinder Riegel','Ferrero',['Kinderriegel','Kinder Schokoriegel'],566,8.7,53.5,35,21],
      ['kinder-schokolade','kinder Schokolade','Ferrero',['Kinder Schoki','Kinder Schokoladenriegel'],566,8.7,53.5,35,12.5],
      ['kinder-country','kinder Country','Ferrero',['Kinder Country Riegel','Country Riegel'],561,8.6,54.9,33.8,23.5],
      ['zott-monte','Zott Monte Original','Zott',['Monte','Monte Dessert','Zott Monte'],181,2.6,15.7,11.8,100],
      ['zott-monte-snack','Zott Monte Snack Original','Zott',['Monte Snack','Monte Milchschnitte','Monte Milch-Schnitte','Monte Schnitte'],484,5.1,39.7,33.6,29]
    ];
    const added=[];
    for(const [id,name,brand,aliases,calories,protein,carbs,fat,portion] of definitions){
      if(occupied.has(normalize(name)))continue;
      occupied.add(normalize(name));
      const cleanAliases=aliases.filter(alias=>{const key=normalize(alias);if(!key||occupied.has(key))return false;occupied.add(key);return true});
      added.push(Object.freeze({id:`cc-bootstrap:${id}`,name,brand,aliases:Object.freeze(cleanAliases),stores:'',kind:'food',barcode:'',amount:100,unit:'g',calories,protein,carbs,fat,fiber:null,sugar:null,saturatedFat:null,salt:null,favorite:false,uses:0,lastUsedAt:null,createdAt:null,catalog:true,product:true,derived:false,estimated:false,verified:true,market:'DE',source:'manufacturer-reference',sourceId:id,sourceVersion:VERSION,sourceLabel:`${brand} · Herstellerangabe je 100 g`,verifiedAt:'2026-07-26',category:'Markenprodukt',defaultPortion:portion,mealTypes:Object.freeze(['Frühstück','Mittagessen','Abendessen','Snack']),featured:Object.freeze([0,0,0,8]),components:Object.freeze([])}));
    }
    const combined=Object.freeze([...added,...existing]);
    const byId=new Map(combined.map(item=>[String(item.id),item]));
    root.CutCoachFoodCatalog=Object.freeze({...base,meta:Object.freeze({...base.meta,count:combined.length,bootstrapProductCount:added.length,bootstrapProductVersion:VERSION}),items:()=>combined,get:id=>byId.get(String(id))||base.get?.(id)||null});
    root.CutCoachLibraryProductBootstrap=Object.freeze({version:VERSION,count:added.length});
  }
  bootstrapProducts();
  function openLibraryFromHash(){if(location.hash==='#library')document.querySelector('[data-tab="library"]')?.click()}
  function start(){if(root.CutCoachLibrary){root.CutCoachLibrary.mount();openLibraryFromHash()}root.addEventListener('hashchange',openLibraryFromHash)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
