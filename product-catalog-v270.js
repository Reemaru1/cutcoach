'use strict';
(function(root){
  const VERSION='2.7.0-alpha';
  const base=root.CutCoachFoodCatalog;
  if(!base?.items||root.CutCoachProductCatalog270)return;

  const MEALS=Object.freeze(['Frühstück','Mittagessen','Abendessen','Snack']);
  const norm=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const existing=base.items();
  const occupied=new Set();
  for(const item of existing){
    for(const value of [item?.name,...(Array.isArray(item?.aliases)?item.aliases:[])]){
      const key=norm(value);
      if(key)occupied.add(key);
    }
  }

  const definitions=[
    {
      id:'milch-schnitte-original',name:'Milch-Schnitte Original',brand:'Ferrero',
      aliases:['Milchschnitte','Milch Schnitte','Kinder Milchschnitte','Kinder Milch-Schnitte','Ferrero Milchschnitte','Ferrero Milch Schnitte'],
      calories:421,protein:7.9,carbs:34,fat:27.9,sugar:29.5,saturatedFat:16.6,salt:0.610,portion:28,
      category:'Kühlregal-Snack',sourceUrl:'https://www.kinder.com/de/de/milch-schnitte'
    },
    {
      id:'kinder-pingui-schoko',name:'kinder Pinguí Schoko',brand:'Ferrero',
      aliases:['Kinder Pingui','Kinder Pinguin','Pingui Schoko','Kinder Pingui Schoko'],
      calories:450,protein:7,carbs:37.8,fat:29.7,sugar:33.1,saturatedFat:20,salt:0.254,portion:30,
      category:'Kühlregal-Snack',sourceUrl:'https://www.kinder.com/de/de/kinder-pingui'
    },
    {
      id:'kinder-bueno',name:'kinder bueno',brand:'Ferrero',
      aliases:['Kinder Bueno','Bueno Riegel','Ferrero Kinder Bueno'],
      calories:572,protein:8.6,carbs:49.5,fat:37.3,sugar:41.2,saturatedFat:17.3,salt:0.272,portion:21.5,
      category:'Süßware',sourceUrl:'https://www.kinder.com/de/de/kinder-bueno'
    },
    {
      id:'kinder-riegel',name:'kinder Riegel',brand:'Ferrero',
      aliases:['Kinder Schokoriegel','Ferrero Kinder Riegel','Kinderriegel'],
      calories:566,protein:8.7,carbs:53.5,fat:35,sugar:53.3,saturatedFat:22.6,salt:0.313,portion:21,
      category:'Süßware',sourceUrl:'https://www.kinder.com/de/de/kinder-riegel'
    },
    {
      id:'kinder-schokolade',name:'kinder Schokolade',brand:'Ferrero',
      aliases:['Kinder Schoki','Kinder Schokoladenriegel','Ferrero Kinder Schokolade'],
      calories:566,protein:8.7,carbs:53.5,fat:35,sugar:53.3,saturatedFat:22.6,salt:0.313,portion:12.5,
      category:'Süßware',sourceUrl:'https://www.kinder.com/de/de/'
    },
    {
      id:'kinder-country',name:'kinder Country',brand:'Ferrero',
      aliases:['Kinder Country Riegel','Ferrero Kinder Country','Country Riegel'],
      calories:561,protein:8.6,carbs:54.9,fat:33.8,sugar:49.1,saturatedFat:21.9,salt:0.275,portion:23.5,
      category:'Süßware',sourceUrl:'https://www.kinder.com/de/de/kinder-country'
    },
    {
      id:'zott-monte-original',name:'Zott Monte Original',brand:'Zott',
      aliases:['Monte','Monte Dessert','Monte Schoko Haselnuss','Zott Monte'],
      calories:181,protein:2.6,carbs:15.7,fat:11.8,sugar:13.7,saturatedFat:7.8,salt:0.07,portion:100,
      category:'Milchdessert',sourceUrl:'https://www.monte.com/de/'
    },
    {
      id:'zott-monte-snack-original',name:'Zott Monte Snack Original',brand:'Zott',
      aliases:['Monte Snack','Monte Milchschnitte','Monte Milch-Schnitte','Monte Schnitte'],
      calories:484,protein:5.1,carbs:39.7,fat:33.6,sugar:29.2,saturatedFat:21.2,salt:0.54,portion:29,
      category:'Kühlregal-Snack',sourceUrl:'https://www.monte.com/de/'
    }
  ];

  const added=[];
  for(const product of definitions){
    const nameKey=norm(product.name);
    if(!nameKey||occupied.has(nameKey))continue;
    occupied.add(nameKey);
    const aliases=[];
    for(const alias of product.aliases){
      const key=norm(alias);
      if(!key||occupied.has(key))continue;
      occupied.add(key);
      aliases.push(alias);
    }
    added.push(Object.freeze({
      id:`ccp270:${product.id}`,name:product.name,aliases:Object.freeze(aliases),brand:product.brand,stores:'',kind:'food',barcode:'',
      amount:100,unit:'g',calories:product.calories,protein:product.protein,carbs:product.carbs,fat:product.fat,fiber:null,
      sugar:product.sugar,saturatedFat:product.saturatedFat,salt:product.salt,favorite:false,uses:0,lastUsedAt:null,createdAt:null,
      catalog:true,product:true,derived:false,estimated:false,verified:true,market:'DE',source:'manufacturer-reference',
      sourceId:product.id,sourceVersion:VERSION,sourceLabel:`${product.brand} · Herstellerangabe je 100 g`,sourceUrl:product.sourceUrl,
      verifiedAt:'2026-07-26',category:product.category,defaultPortion:product.portion,mealTypes:MEALS,
      featured:Object.freeze([0,0,0,8]),components:Object.freeze([])
    }));
  }

  const combined=Object.freeze([...added,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  root.CutCoachProductCatalog270=Object.freeze({version:VERSION,count:added.length,items:()=>Object.freeze(added)});
  root.CutCoachFoodCatalog=Object.freeze({
    ...base,
    meta:Object.freeze({...base.meta,count:combined.length,manufacturerProductCount:added.length,manufacturerProductVersion:VERSION}),
    items:()=>combined,
    get:id=>byId.get(String(id))||base.get?.(id)||null
  });
  try{root.dispatchEvent(new CustomEvent('cutcoach:catalog-updated',{detail:{source:'product-catalog-v270',count:added.length}}))}catch{}
})(window);
