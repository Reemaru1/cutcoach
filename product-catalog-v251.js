'use strict';
(function(root){
  const VERSION='2.5.1-alpha';
  const base=root.CutCoachFoodCatalog;
  if(!base?.items||root.CutCoachProductCatalog251)return;
  const MEALS=Object.freeze(['Frühstück','Mittagessen','Abendessen','Snack']);
  const rows=[
    ['milch-schnitte','Milch-Schnitte',['Milchschnitte','Kinder Milch-Schnitte','Kinder Milchschnitte','Ferrero Milchschnitte'],'Kinder',420,8.2,34,27.9,28,0.31,28],
    ['kinder-bueno','Kinder Bueno',['Bueno','Kinderbueno','Ferrero Kinder Bueno'],'Kinder',572,8.6,49.5,37.3,41.2,0.272,21.5],
    ['kinder-bueno-white','Kinder Bueno White',['Bueno White','Kinderbueno White'],'Kinder',571,8.8,49.3,37.1,41.2,0.3,19.5],
    ['kinder-riegel','Kinder Riegel',['Kinderriegel','Kinder Schokoriegel','Ferrero Kinder Riegel'],'Kinder',566,8.7,53.5,35,53.3,0.313,21],
    ['kinder-schokolade','Kinder Schokolade',['Kinderschokolade','Kinder Chocolate','Ferrero Kinder Schokolade'],'Kinder',566,8.7,53.5,35,53.3,0.313,12.5],
    ['kinder-country','Kinder Country',['Kinder Country Riegel','Country Kinder'],'Kinder',561,8.6,54.9,33.8,49.1,0.33,23.5],
    ['kinder-pingui','Kinder Pingui',['Kinder Pinguí','Pingui','Kinder Pingui Schoko'],'Kinder',443,7.9,36.3,29.1,33.3,0.28,30],
    ['kinder-maxi-king','Kinder Maxi King',['Maxi King','Kinder Maxiking'],'Kinder',488,8.5,39.9,34.4,34.1,0.24,35],
    ['kinder-happy-hippo','Kinder Happy Hippo Cacao',['Happy Hippo','Kinder Happy Hippo','Happy Hippo Kakao'],'Kinder',584,8.8,52.7,37.3,43.9,0.35,20.7],
    ['kinder-cards','Kinder Cards',['Kinder Cards Waffel','Kinder Cards T2'],'Kinder',510,10.2,58.4,26,43.5,0.42,25.6],
    ['monte-dessert','Monte Milchdessert Schoko-Haselnuss',['Monte','Zott Monte','Monte Dessert','Monte Schoko Haselnuss'],'Zott',194,3.1,15.5,13.3,13.8,0.14,100],
    ['monte-snack','Monte Snack',['Zott Monte Snack','Monte Milchschnitte','Monte Milch-Schnitte','Monte Schnitte'],'Zott',418,7.7,41.2,24.5,30.5,0.25,29]
  ];
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const existing=base.items();
  const keys=new Set();
  for(const item of existing)for(const value of [item?.name,...(Array.isArray(item?.aliases)?item.aliases:[])]){const key=norm(value);if(key)keys.add(key)}
  const items=[];
  for(const [slug,name,aliases,brand,calories,protein,carbs,fat,sugar,salt,portion] of rows){
    if(keys.has(norm(name)))continue;
    const cleanAliases=aliases.filter(alias=>{const key=norm(alias);if(!key||keys.has(key))return false;keys.add(key);return true});
    keys.add(norm(name));
    items.push(Object.freeze({id:`ccp:${slug}`,name,aliases:Object.freeze(cleanAliases),brand,kind:'food',barcode:'',amount:100,unit:'g',calories,protein,carbs,fat,fiber:null,sugar,saturatedFat:null,salt,favorite:false,uses:0,lastUsedAt:null,createdAt:null,catalog:true,product:true,derived:false,estimated:true,verified:false,market:'DE',source:'curated-product-fallback',sourceId:slug,sourceVersion:VERSION,sourceLabel:`${brand} · lokaler Produkt-Richtwert je 100 g`,sourceUrl:'',verifiedAt:'2026-07-25',category:'Süßware',defaultPortion:portion,mealTypes:MEALS,featured:Object.freeze([0,0,0,0]),components:Object.freeze([])}));
  }
  const combined=Object.freeze([...items,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  root.CutCoachProductCatalog251=Object.freeze({version:VERSION,count:items.length,items:()=>Object.freeze(items)});
  root.CutCoachFoodCatalog=Object.freeze({...base,meta:Object.freeze({...base.meta,count:combined.length,localProductFallbackCount:items.length,localProductFallbackVersion:VERSION}),items:()=>combined,get:id=>byId.get(String(id))||base.get?.(id)||null});
  try{root.dispatchEvent(new CustomEvent('cutcoach:catalog-updated',{detail:{source:'product-catalog-v251',count:items.length}}))}catch{}
})(window);
