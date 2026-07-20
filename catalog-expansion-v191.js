'use strict';
(function(global){
  const VERSION='1.9.1-alpha';
  const base=global.CutCoachFoodCatalog;
  if(!base?.items||global.CutCoachCatalogExpansion191)return;

  const MEALS=['Frühstück','Mittagessen','Abendessen','Snack'];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const list=value=>(Array.isArray(value)?value:[value]).filter(Boolean);
  const freezeList=value=>Object.freeze([...value]);

  // Standardportionen und durchschnittliche Richtwerte. Rezept, Größe und Zubereitung können abweichen.
  // id, name, aliases, category, meals, amount, unit, kcal, protein, carbs, fat, featured
  const ROWS=[
    ['koefte-stueck','Köfte',['Koefte','Köfte Stück','Köftestück','Köfte einzeln','Türkische Frikadelle','Izgara Köfte einzeln'],'Türkisch',['Mittagessen','Abendessen','Snack'],1,'Stück',110,8.5,2.5,7.3,2],
    ['koefte-bulgur','Köfte mit Bulgur',['Köfte Bulgur Teller','Izgara Köfte mit Bulgur','Köfte und Bulgur'],'Türkisch',['Mittagessen','Abendessen'],520,'g',780,45,85,30,4],
    ['koefte-kartoffeln','Köfte mit Kartoffeln',['Köfte Kartoffel Teller','Izgara Köfte mit Kartoffeln','Köfte und Kartoffeln'],'Türkisch',['Mittagessen','Abendessen'],520,'g',760,44,70,32,5],
    ['koefte-gemuese','Köfte mit Gemüse',['Köfte Gemüse Teller','Izgara Köfte mit Gemüse','Köfte und Gemüse'],'Türkisch',['Mittagessen','Abendessen'],450,'g',620,43,35,34,6],

    ['haehnchengeschnetzeltes-reis','Hähnchengeschnetzeltes mit Reis',['Hahnchengeschnetzeltes mit Reis','Hähnchen Geschnetzeltes mit Reis','Hahnchen Geschnetzeltes mit Reis','Hähnchenstreifen mit Reis','Geschnetzeltes Hähnchen Reis'],'Kantine',['Mittagessen','Abendessen'],550,'g',760,55,88,20,2],
    ['haehnchengeschnetzeltes-rahm','Hähnchengeschnetzeltes in Rahmsauce',['Hähnchenrahmgeschnetzeltes','Hahnchenrahmgeschnetzeltes','Hähnchen Geschnetzeltes Rahm','Geschnetzeltes vom Hähnchen'],'Kantine',['Mittagessen','Abendessen'],450,'g',690,51,28,41,4],
    ['haehnchengeschnetzeltes-nudeln','Hähnchengeschnetzeltes mit Nudeln',['Hahnchengeschnetzeltes mit Nudeln','Hähnchen Geschnetzeltes mit Nudeln','Hähnchenstreifen mit Nudeln'],'Kantine',['Mittagessen','Abendessen'],550,'g',820,53,100,23,5],
    ['haehnchengeschnetzeltes-spaetzle','Hähnchengeschnetzeltes mit Spätzle',['Hahnchengeschnetzeltes mit Spaetzle','Hähnchen Geschnetzeltes mit Spätzle','Hähnchengeschnetzeltes Spätzle'],'Kantine',['Mittagessen','Abendessen'],550,'g',860,52,95,31,6],
    ['putengeschnetzeltes-reis','Putengeschnetzeltes mit Reis',['Puten Geschnetzeltes mit Reis','Putenstreifen mit Reis','Geschnetzeltes Pute Reis'],'Kantine',['Mittagessen','Abendessen'],550,'g',730,56,88,17,5],
    ['putengeschnetzeltes-rahm','Putengeschnetzeltes in Rahmsauce',['Putenrahmgeschnetzeltes','Puten Geschnetzeltes Rahm','Geschnetzeltes von der Pute'],'Kantine',['Mittagessen','Abendessen'],450,'g',660,52,27,37,6],
    ['paprika-haehnchen-reis','Paprika-Hähnchen mit Reis',['Paprikahähnchen mit Reis','Paprika Hähnchen Reis','Hähnchen Paprika Reis'],'Kantine',['Mittagessen','Abendessen'],550,'g',740,54,90,18,7],
    ['pilzrahm-haehnchen-reis','Pilzrahm-Hähnchen mit Reis',['Hähnchen in Pilzrahmsauce mit Reis','Pilzrahm Hähnchen Reis','Champignon Hähnchen mit Reis'],'Kantine',['Mittagessen','Abendessen'],550,'g',810,53,87,28,8],

    ['sahnetortenstueck','Sahnetortenstück',['Sahnetorte','Sahnetortestück','Sahnetortestücke','Sahnetortenstücke','Stück Sahnetorte','Sahnetorten Stück','Sahnetorten Stücke'],'Dessert',['Snack'],1,'Stück',420,5.5,43,25,2],
    ['erdbeer-sahnetortenstueck','Erdbeer-Sahnetortenstück',['Erdbeersahnetorte','Erdbeersahnetortenstück','Erdbeer Sahne Torte Stück','Stück Erdbeersahnetorte'],'Dessert',['Snack'],1,'Stück',390,5,47,20,4],
    ['schwarzwaelder-kirschtortenstueck','Schwarzwälder Kirschtortenstück',['Schwarzwälder Kirschtorte','Schwarzwälder Tortenstück','Stück Schwarzwälder Kirschtorte'],'Dessert',['Snack'],1,'Stück',430,5.5,50,23,5],
    ['kaese-sahne-tortenstueck','Käse-Sahne-Tortenstück',['Käse Sahne Torte','Käsesahnetorte','Käse-Sahnetorte Stück','Stück Käse-Sahne-Torte'],'Dessert',['Snack'],1,'Stück',410,8,42,23,6],
    ['schoko-sahnetortenstueck','Schoko-Sahnetortenstück',['Schokoladen-Sahnetorte','Schokosahnetorte','Schoko Sahne Torte Stück','Stück Schokoladensahnetorte'],'Dessert',['Snack'],1,'Stück',450,6,48,27,7],
    ['mandarinen-sahnetortenstueck','Mandarinen-Sahnetortenstück',['Mandarinen Sahnetorte','Mandarinen-Sahne-Torte Stück','Stück Mandarinen-Sahnetorte'],'Dessert',['Snack'],1,'Stück',400,6,49,20,8],
    ['himbeer-sahnetortenstueck','Himbeer-Sahnetortenstück',['Himbeersahnetorte','Himbeer Sahne Torte Stück','Stück Himbeersahnetorte'],'Dessert',['Snack'],1,'Stück',395,5,48,20,9],
    ['nuss-sahnetortenstueck','Nuss-Sahnetortenstück',['Nusssahnetorte','Nuss Sahne Torte Stück','Stück Nuss-Sahnetorte'],'Dessert',['Snack'],1,'Stück',470,7,40,32,10]
  ];

  const existing=base.items();
  const idOwners=new Map();
  const keyOwners=new Map();
  const register=(item,origin)=>{
    const id=String(item?.id||'');if(id&&!idOwners.has(id))idOwners.set(id,origin);
    for(const value of [item?.name,...list(item?.aliases)]){const key=normalize(value);if(key&&!keyOwners.has(key))keyOwners.set(key,{origin,id,name:item?.name||String(value)});}
  };
  for(const item of existing)register(item,'existing');

  const accepted=[],skipped=[],prunedAliases=[];
  for(const row of ROWS){
    const [sourceId,name,rawAliases,category,meals,amount,unit,calories,protein,carbs,fat,featured=9]=row;
    const id=`ccx:${sourceId}`,nameKey=normalize(name);
    if(idOwners.has(id)){skipped.push(Object.freeze({id,name,reason:'duplicate-id'}));continue}
    if(!nameKey||keyOwners.has(nameKey)){skipped.push(Object.freeze({id,name,reason:'duplicate-name-or-alias'}));continue}
    const aliases=[];
    for(const alias of list(rawAliases)){
      const key=normalize(alias);if(!key||key===nameKey)continue;
      if(keyOwners.has(key)||aliases.some(value=>normalize(value)===key)){prunedAliases.push(Object.freeze({id,name,alias,reason:'duplicate-alias'}));continue}
      aliases.push(alias);
    }
    const featuredMap=MEALS.map(meal=>meals.includes(meal)?featured:0);
    const item=Object.freeze({
      id,name,aliases:freezeList(aliases),kind:'food',barcode:'',amount,unit,
      calories,protein,carbs,fat,fiber:null,sugar:null,saturatedFat:null,salt:null,
      favorite:false,uses:0,lastUsedAt:null,createdAt:null,catalog:true,derived:true,estimated:true,
      source:'cutcoach',sourceId,sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · durchschnittlicher Richtwert',
      category,mealTypes:freezeList(meals),featured:freezeList(featuredMap),components:freezeList([])
    });
    accepted.push(item);register(item,'expansion');
  }

  const items=Object.freeze(accepted);
  const combined=Object.freeze([...items,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  const suggestions=Object.freeze(Object.fromEntries(MEALS.map((meal,index)=>[
    meal,Object.freeze([
      ...items.filter(item=>item.mealTypes.includes(meal)).sort((a,b)=>(a.featured[index]||99)-(b.featured[index]||99)||a.name.localeCompare(b.name,'de')).slice(0,18),
      ...(base.suggestions?.(meal)||[])
    ])
  ])));
  const meta=Object.freeze({
    version:VERSION,defined:ROWS.length,count:items.length,skipped:freezeList(skipped),prunedAliases:freezeList(prunedAliases),
    duplicatePolicy:'ID, Hauptname und Aliase werden normalisiert gegen den vollständigen vorhandenen Katalog geprüft.',
    source:'CutCoach Katalogerweiterung',basis:'Standardportion',note:'Durchschnittliche Richtwerte; Rezept und Portionsgröße können abweichen.'
  });

  global.CutCoachCatalogExpansion191=Object.freeze({meta,items:()=>items,get:id=>byId.get(String(id))||null});
  global.CutCoachFoodCatalog=Object.freeze({
    meta:Object.freeze({...base.meta,count:combined.length,catalogExpansionCount:items.length,catalogExpansionVersion:VERSION}),
    items:()=>combined,
    get:id=>byId.get(String(id))||base.get?.(id)||null,
    suggestions:meal=>suggestions[meal]||Object.freeze([])
  });
  try{global.dispatchEvent(new CustomEvent('cutcoach:catalog-updated',{detail:{source:'catalog-expansion-v191',count:items.length}}))}catch{}
})(window);
