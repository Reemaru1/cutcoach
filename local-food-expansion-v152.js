'use strict';
(function(global){
  const VERSION='1.5.2';
  const base=global.CutCoachFoodCatalog;
  if(!base?.items||global.CutCoachLocalFoodExpansion152)return;
  const additions=Object.freeze([
    Object.freeze({
      id:'ccmeal:tantuni-durum',name:'Tantuni Dürüm',aliases:Object.freeze(['Tantuni','Mersin Tantuni','Tantuni Wrap','Tantuni mit Rindfleisch']),
      kind:'food',barcode:'',amount:350,unit:'g',calories:700,protein:38,carbs:72,fat:28,
      fiber:null,sugar:null,saturatedFat:null,salt:null,favorite:false,uses:0,lastUsedAt:null,createdAt:null,
      catalog:true,derived:true,estimated:true,source:'cutcoach',sourceId:'tantuni-durum',sourceVersion:VERSION,
      sourceLabel:'CutCoach Standardgericht · durchschnittlicher Richtwert',category:'Türkisch',
      mealTypes:Object.freeze(['Mittagessen','Abendessen']),featured:Object.freeze([0,7,5,0]),components:Object.freeze([])
    })
  ]);
  const existing=base.items(),ids=new Set(existing.map(item=>String(item.id)));
  const items=Object.freeze(additions.filter(item=>!ids.has(item.id))),combined=Object.freeze([...items,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const byName=new Map();
  for(const item of combined)for(const name of [item.name,...(item.aliases||[])])byName.set(normalize(name),item);
  global.CutCoachLocalFoodExpansion152=Object.freeze({version:VERSION,items:()=>items,get:id=>byId.get(String(id))||null,find:name=>byName.get(normalize(name))||null});
  global.CutCoachFoodCatalog=Object.freeze({...base,
    meta:Object.freeze({...base.meta,count:combined.length,localExpansionVersion:VERSION,localExpansionCount:items.length}),
    items:()=>combined,get:id=>byId.get(String(id))||base.get?.(id)||null,
    suggestions:meal=>Object.freeze([...items.filter(item=>item.mealTypes.includes(meal)),...(base.suggestions?.(meal)||[])])
  });
  global.dispatchEvent(new CustomEvent('cutcoach:catalog-updated',{detail:{source:'local-food-expansion',version:VERSION,count:items.length}}));
})(window);