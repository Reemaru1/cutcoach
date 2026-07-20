'use strict';
(function(global){
  const VERSION='2.0.0-alpha';
  const VERIFIED_AT='2026-07-20';
  const base=global.CutCoachFoodCatalog;
  if(!base?.items||global.CutCoachProductCatalog200)return;
  const MEALS=Object.freeze(['Frühstück','Mittagessen','Abendessen','Snack']);
  const SOURCES=Object.freeze({"coca_original":"https://www.coca-cola.com/de/de/brands/brand-coca-cola","coca_zero":"https://www.coca-cola.com/de/de/brands/coca-cola-zero-sugar","coca_light":"https://www.coca-cola.com/de/de/brands/coca-cola-light","fanta":"https://www.coca-cola.com/de/de/brands/fanta/fanta","sprite":"https://www.coca-cola.com/de/de/brands/brand-sprite/sprite","mezzo":"https://www.coca-cola.com/de/de/brands/brand-mezzo-mix","fuze":"https://www.coca-cola.com/de/de/brands/fuze-tea","powerade":"https://www.coca-cola.com/de/de/brands/powerade","redbull_original":"https://www.redbull.com/de-de/energydrink/products/red-bull-energy-drink-zutaten","redbull_zero":"https://www.redbull.com/de-de/energydrink/products/red-bull-zero-zutaten","redbull_sugarfree":"https://www.redbull.com/at-de/energydrink/products/red-bull-sugarfree-zutaten","redbull_summer":"https://www.redbull.com/de-de/energydrink/products/red-bull-summer-edition-sugarfree-zutaten","redbull_cherry":"https://www.redbull.com/de-de/energydrink/products/red-bull-cherry-edition-sugarfree-zutaten","redbull_sea_blue":"https://www.redbull.com/de-de/energydrink/products/red-bull-sea-blue-edition-zutaten"});
  const ROWS=Object.freeze([["coca-cola-original","Coca-Cola Original Taste",["Coca Cola","Coca-Cola","Coke","Coke Original","Cola Original"],"Coca-Cola",42,10.6,10.6,0,"coca_original",null],["coca-cola-zero","Coca-Cola Zero Sugar",["Coca Cola Zero","Coca-Cola Zero","Cola Zero","Coke Zero","Zero Cola"],"Coca-Cola",0.2,0,0,0.02,"coca_zero",null],["coca-cola-zero-koffeinfrei","Coca-Cola Zero Sugar koffeinfrei",["Coca Cola Zero koffeinfrei","Coke Zero koffeinfrei","Cola Zero ohne Koffein"],"Coca-Cola",0.2,0,0,0.02,"coca_zero",null],["coca-cola-zero-lemon","Coca-Cola Zero Sugar Lemon",["Coca Cola Zero Lemon","Coke Zero Lemon","Cola Zero Zitrone"],"Coca-Cola",1,0,0,0.02,"coca_zero",null],["coca-cola-zero-cherry","Coca-Cola Zero Sugar Cherry",["Coca Cola Zero Cherry","Coke Zero Cherry","Cola Zero Kirsche"],"Coca-Cola",0.3,0,0,0.02,"coca_zero",null],["coca-cola-zero-vanilla","Coca-Cola Zero Sugar Vanilla",["Coca Cola Zero Vanilla","Coke Zero Vanilla","Cola Zero Vanille"],"Coca-Cola",0.3,0,0,0.01,"coca_zero",null],["coca-cola-light","Coca-Cola light taste",["Coca Cola Light","Coca-Cola Light","Cola Light","Coke Light","Diet Coke"],"Coca-Cola",0.2,0,0,0.01,"coca_light",null],["coca-cola-light-koffeinfrei","Coca-Cola light taste koffeinfrei",["Coca Cola Light koffeinfrei","Cola Light ohne Koffein","Coke Light koffeinfrei"],"Coca-Cola",0.2,0,0,0.02,"coca_light",null],["coca-cola-vanilla","Coca-Cola Vanilla",["Coca Cola Vanilla","Coke Vanilla","Vanilla Coke","Cola Vanille"],"Coca-Cola",45,11.1,11.1,0,"coca_original",null],["coca-cola-lemon","Coca-Cola Lemon",["Coca Cola Lemon","Coke Lemon","Cola Zitrone"],"Coca-Cola",43,10.6,10.6,0,"coca_original",null],["fanta-orange","Fanta Orange",["Fanta","Fanta normal","Orangenlimonade Fanta"],"Fanta",32,7.7,7.6,0.01,"fanta",null],["fanta-orange-zero","Fanta Orange ohne Zucker",["Fanta Orange Zero","Fanta Zero","Fanta zuckerfrei"],"Fanta",3,0.4,0.3,0.02,"fanta",null],["fanta-mango-zero","Fanta Mango ohne Zucker",["Fanta Mango Zero","Fanta Mango zuckerfrei"],"Fanta",3,0.4,0.3,0.02,"fanta",null],["fanta-lemon-zero","Fanta Lemon ohne Zucker",["Fanta Lemon Zero","Fanta Zitrone Zero","Fanta Lemon zuckerfrei"],"Fanta",2,0,0,0.06,"fanta",null],["fanta-mandarine-zero","Fanta Mandarine ohne Zucker",["Fanta Mandarine Zero","Fanta Mandarin Zero"],"Fanta",3,0.6,0.5,0.02,"fanta",null],["fanta-exotic","Fanta Exotic",["Fanta Exotik","Fanta Tropical"],"Fanta",26,6.3,6,0,"fanta",null],["fanta-lemon-elderflower","Fanta Lemon & Elderflower",["Fanta Lemon Elderflower","Fanta Zitrone Holunder"],"Fanta",28,6.7,6.7,0.04,"fanta",null],["fanta-mango-dragonfruit","Fanta Mango Dragonfruit",["Fanta Mango Drachenfrucht","Fanta Dragonfruit"],"Fanta",26,6.1,6.1,0,"fanta",null],["sprite","Sprite",["Sprite Original","Sprite normal","Zitronenlimonade Sprite"],"Sprite",33,7.9,7.9,0.03,"sprite",null],["sprite-zero","Sprite Zero Sugar",["Sprite Zero","Sprite ohne Zucker","Sprite zuckerfrei"],"Sprite",1,0,0,0.03,"sprite",null],["sprite-zero-mint","Sprite Zero Sugar Mint Chill",["Sprite Zero Mint","Sprite Mint Chill"],"Sprite",1,0,0,0.04,"sprite",null],["mezzo-mix","Mezzo Mix Original",["Mezzo Mix","Mezzomix","Cola Mix Mezzo"],"Mezzo Mix",32,7.9,7.9,0,"mezzo",null],["mezzo-mix-zero","Mezzo Mix Zero",["Mezzo Mix ohne Zucker","Mezzomix Zero","Cola Mix Zero"],"Mezzo Mix",1,0.2,null,0.01,"mezzo",null],["fuze-tea-peach","Fuze Tea Pfirsich",["Fuzetea Pfirsich","Fuze Eistee Pfirsich"],"Fuze Tea",29,6.9,6.9,0.03,"fuze",null],["fuze-tea-lemon","Fuze Tea Zitrone",["Fuzetea Zitrone","Fuze Eistee Zitrone"],"Fuze Tea",30,7.2,7.2,0.03,"fuze",null],["fuze-tea-lemon-lemongrass","Fuze Tea Zitrone Zitronengras",["Fuzetea Zitrone Zitronengras","Fuze Tea Lemon Lemongrass"],"Fuze Tea",30,7.2,7.1,0.04,"fuze",null],["fuze-tea-peach-hibiscus","Fuze Tea Pfirsich Hibiskus",["Fuzetea Pfirsich Hibiskus"],"Fuze Tea",19,4.3,4.3,0.03,"fuze",null],["fuze-tea-mango-chamomile","Fuze Tea Mango Kamille",["Fuzetea Mango Kamille"],"Fuze Tea",19,4.3,4.3,0.03,"fuze",null],["fuze-tea-lime-mint","Fuze Tea Limette Minze",["Fuzetea Limette Minze","Fuze Tea Lime Mint"],"Fuze Tea",19,4.4,4.4,0.05,"fuze",null],["fuze-tea-watermelon-mint-zero","Fuze Tea Wassermelone Minze",["Fuzetea Wassermelone Minze","Fuze Tea Watermelon Mint Zero"],"Fuze Tea",2,0,0,0.05,"fuze",null],["fuze-tea-peach-elderflower-zero","Fuze Tea Pfirsich Holunderblüte",["Fuzetea Pfirsich Holunderblüte","Fuze Tea Peach Elderflower Zero"],"Fuze Tea",2,0.2,0.2,0.04,"fuze",null],["powerade-mountain-blast","Powerade Mountain Blast",["Powerade Blau","Powerade Blue"],"Powerade",18,4.1,4.1,0.13,"powerade",null],["powerade-wild-cherry","Powerade Wild Cherry",["Powerade Kirsche"],"Powerade",18,4.1,4.1,0.13,"powerade",null],["powerade-zero-mountain-blast","Powerade Zero Mountain Blast",["Powerade Zero","Powerade Mountain Blast Zero","Powerade Blau Zero"],"Powerade",1,0,0,0.13,"powerade",null],["powerade-active-water-peach-apple","Powerade Active Water Peach Apple",["Powerade Active Water Pfirsich Apfel"],"Powerade",1,0,0,0.06,"powerade",null],["powerade-active-water-lemon-lime","Powerade Active Water Lemon Lime",["Powerade Active Water Zitrone Limette"],"Powerade",1,0,0,0.06,"powerade",null],["powerade-active-water-mandarin-orange","Powerade Active Water Mandarin Orange",["Powerade Active Water Mandarine Orange"],"Powerade",1,0,0,0.06,"powerade",null],["red-bull","Red Bull Energy Drink",["Red Bull","Redbull","Red Bull Original","Redbull Original"],"Red Bull",46,11,11,0.1,"redbull_original",32],["red-bull-sugarfree","Red Bull Sugarfree",["Red Bull Sugar Free","Redbull Sugarfree","Red Bull ohne Zucker"],"Red Bull",3,0,0,0.1,"redbull_sugarfree",32],["red-bull-zero","Red Bull Zero",["Redbull Zero","Red Bull Zero Sugar","Red Bull zuckerfrei"],"Red Bull",2,2,0,0.2,"redbull_zero",32],["red-bull-summer-sugarfree","Red Bull Summer Edition Sugarfree",["Red Bull Summer Zero","Red Bull Summer Edition ohne Zucker"],"Red Bull",3,0,0,0.1,"redbull_summer",32],["red-bull-cherry-sugarfree","Red Bull Cherry Edition Sugarfree",["Red Bull Cherry Zero","Red Bull Kirsche ohne Zucker"],"Red Bull",3,0,0,0.1,"redbull_cherry",32],["red-bull-sea-blue","Red Bull Sea Blue Edition",["Red Bull Sea Blue","Red Bull Juneberry","Red Bull Heidelbeere"],"Red Bull",45,11,11,0.1,"redbull_sea_blue",32]]);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const list=value=>(Array.isArray(value)?value:[value]).filter(Boolean);
  const existing=base.items();
  const idOwners=new Map(),keyOwners=new Map();
  const register=(item,origin)=>{
    const id=String(item?.id||'');if(id&&!idOwners.has(id))idOwners.set(id,origin);
    for(const value of [item?.name,...list(item?.aliases)]){const key=normalize(value);if(key&&!keyOwners.has(key))keyOwners.set(key,{origin,id,name:item?.name||String(value)})}
  };
  existing.forEach(item=>register(item,'existing'));
  const accepted=[],skipped=[],prunedAliases=[];
  for(const row of ROWS){
    const [sourceId,name,rawAliases,brand,calories,carbs,sugar,salt,sourceKey,caffeine]=row;
    const id=`ccp:${sourceId}`,nameKey=normalize(name);
    if(idOwners.has(id)){skipped.push(Object.freeze({id,name,reason:'duplicate-id'}));continue}
    if(!nameKey||keyOwners.has(nameKey)){skipped.push(Object.freeze({id,name,reason:'duplicate-name-or-alias'}));continue}
    const aliases=[];
    for(const alias of list(rawAliases)){
      const key=normalize(alias);if(!key||key===nameKey)continue;
      if(keyOwners.has(key)||aliases.some(value=>normalize(value)===key)){prunedAliases.push(Object.freeze({id,name,alias,reason:'duplicate-alias'}));continue}
      aliases.push(alias);
    }
    const item=Object.freeze({
      id,name,aliases:Object.freeze(aliases),brand,kind:'food',barcode:'',amount:100,unit:'ml',
      calories,protein:0,carbs,fat:0,fiber:0,sugar:sugar===null?null:sugar,saturatedFat:0,salt,
      caffeine:caffeine===null?null:caffeine,favorite:false,uses:0,lastUsedAt:null,createdAt:null,
      catalog:true,product:true,derived:false,estimated:false,verified:true,market:'DE',
      source:'manufacturer',sourceId,sourceVersion:VERSION,sourceLabel:`${brand} · Herstellerangabe pro 100 ml`,
      sourceUrl:SOURCES[sourceKey]||'',verifiedAt:VERIFIED_AT,category:'Getränk',
      mealTypes:MEALS,featured:Object.freeze([0,0,0,0]),components:Object.freeze([])
    });
    accepted.push(item);register(item,'product');
  }
  const items=Object.freeze(accepted),combined=Object.freeze([...items,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  const meta=Object.freeze({
    version:VERSION,verifiedAt:VERIFIED_AT,defined:ROWS.length,count:items.length,
    skipped:Object.freeze(skipped),prunedAliases:Object.freeze(prunedAliases),
    source:'Offizielle Herstellerangaben',basis:'100 ml',market:'Deutschland',
    duplicatePolicy:'ID, Hauptname und jeder Alias werden normalisiert gegen den vollständigen bestehenden Katalog geprüft.',
    note:'Produktrezepturen können sich ändern; maßgeblich bleibt die aktuelle Verpackung.'
  });
  global.CutCoachProductCatalog200=Object.freeze({meta,items:()=>items,get:id=>byId.get(String(id))||null,sources:SOURCES});
  global.CutCoachFoodCatalog=Object.freeze({
    meta:Object.freeze({...base.meta,count:combined.length,productCount:items.length,productVersion:VERSION,productVerifiedAt:VERIFIED_AT}),
    items:()=>combined,get:id=>byId.get(String(id))||base.get?.(id)||null,
    suggestions:meal=>base.suggestions?.(meal)||Object.freeze([])
  });
  try{global.dispatchEvent(new CustomEvent('cutcoach:catalog-updated',{detail:{source:'product-catalog-v200',count:items.length}}))}catch{}
})(window);
