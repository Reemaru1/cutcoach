'use strict';
(function(root){
  const VERSION='2.6.0-alpha';
  const base=root.CutCoachFoodCatalog;
  if(!base?.items||root.CutCoachProductCatalog260)return;
  const MEALS=Object.freeze(['Frühstück','Mittagessen','Abendessen','Snack']);
  const norm=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const slug=v=>norm(v).replace(/\s+/g,'-');
  const existing=base.items();
  const keys=new Set();
  for(const item of existing)for(const value of [item?.name,...(Array.isArray(item?.aliases)?item.aliases:[])]){const key=norm(value);if(key)keys.add(key)}

  const retailers=[
    {store:'Lidl',brands:{dairy:'Milbona',cereal:'Crownfield',sweet:'Fin Carré',drink:'Freeway',snack:'Snack Day',ready:'Chef Select',bakery:'Grafschafter',bio:'Bio Organic'}},
    {store:'Aldi',brands:{dairy:'Milsani',cereal:'Knusperone',sweet:'Choceur',drink:'River',snack:'Sun Snacks',ready:'Cucina',bakery:'Goldähren',bio:'Gut Bio'}},
    {store:'REWE',brands:{dairy:'ja!',cereal:'ja!',sweet:'ja!',drink:'ja!',snack:'ja!',ready:'REWE Beste Wahl',bakery:'ja!',bio:'REWE Bio'}},
    {store:'EDEKA',brands:{dairy:'Gut & Günstig',cereal:'Gut & Günstig',sweet:'Gut & Günstig',drink:'Gut & Günstig',snack:'Gut & Günstig',ready:'EDEKA',bakery:'Gut & Günstig',bio:'EDEKA Bio'}},
    {store:'Norma',brands:{dairy:'Landfein',cereal:'Golden Breakfast',sweet:'Excelsior',drink:'Surf',snack:'Crusti Croc',ready:'Prima Menü',bakery:'Backstube',bio:'Bio Sonne'}},
    {store:'Penny',brands:{dairy:'Penny',cereal:'Penny',sweet:'Penny',drink:'Penny',snack:'Penny',ready:'Penny Ready',bakery:'Penny',bio:'Naturgut'}},
    {store:'Netto',brands:{dairy:'Gut Ponholz',cereal:'Netto',sweet:'Netto',drink:'Netto',snack:'Netto',ready:'Netto',bakery:'Netto',bio:'BioBio'}},
    {store:'Kaufland',brands:{dairy:'K-Classic',cereal:'K-Classic',sweet:'K-Classic',drink:'K-Classic',snack:'K-Classic',ready:'K-Classic',bakery:'K-Classic',bio:'K-Bio'}}
  ];

  // Richtwerte je 100 g bzw. 100 ml. Produkte bleiben als geschätzt markiert,
  // bis Barcode- oder Verpackungsdaten eine exakte Variante liefern.
  const templates=[
    ['dairy','H-Milch 1,5 % Fett',['Milch fettarm','fettarme Milch'],47,3.4,4.9,1.5,4.9,0.10,250,'ml','Milchprodukt'],
    ['dairy','H-Milch 3,5 % Fett',['Vollmilch','Milch 3,5'],64,3.3,4.8,3.5,4.8,0.10,250,'ml','Milchprodukt'],
    ['dairy','Naturjoghurt 1,5 % Fett',['Joghurt natur fettarm'],48,4.0,5.2,1.5,5.2,0.12,150,'g','Milchprodukt'],
    ['dairy','Naturjoghurt 3,5 % Fett',['Joghurt natur Vollfett'],65,3.8,4.7,3.5,4.7,0.12,150,'g','Milchprodukt'],
    ['dairy','Skyr Natur',['Skyr','Protein Skyr'],63,11.0,4.0,0.2,4.0,0.10,250,'g','Milchprodukt'],
    ['dairy','Magerquark',['Quark mager','Speisequark Magerstufe'],67,12.2,4.0,0.3,4.0,0.10,250,'g','Milchprodukt'],
    ['dairy','Körniger Frischkäse',['Hüttenkäse','Cottage Cheese'],98,12.5,3.0,4.0,3.0,0.75,200,'g','Milchprodukt'],
    ['cereal','Haferflocken zart',['zarte Haferflocken','Oats'],372,13.5,58.7,7.0,1.0,0.01,50,'g','Getreide'],
    ['cereal','Knuspermüsli Schoko',['Schokomüsli','Crunchy Schoko'],450,8.0,66.0,16.0,24.0,0.30,60,'g','Müsli'],
    ['cereal','Cornflakes',['Maisflakes','Frühstücksflakes'],375,7.0,84.0,1.0,8.0,1.10,40,'g','Müsli'],
    ['bakery','Vollkorntoast',['Toast Vollkorn','Vollkorn Toastbrot'],247,9.0,41.0,4.0,4.0,1.10,50,'g','Backware'],
    ['bakery','Weizentoast',['Toastbrot','Buttertoast'],265,8.5,49.0,3.5,4.5,1.15,50,'g','Backware'],
    ['bakery','Mehrkornbrötchen',['Körnerbrötchen','Mehrkorn Semmel'],255,9.5,43.0,4.5,3.0,1.20,75,'g','Backware'],
    ['sweet','Vollmilchschokolade',['Schokolade Vollmilch','Milchschokolade'],535,7.0,57.0,31.0,55.0,0.20,25,'g','Süßware'],
    ['sweet','Zartbitterschokolade 70 %',['Bitterschokolade','dunkle Schokolade'],560,7.5,35.0,42.0,29.0,0.03,20,'g','Süßware'],
    ['sweet','Haselnusscreme',['Nuss-Nougat-Creme','Schokoaufstrich'],545,6.0,57.0,32.0,56.0,0.15,20,'g','Süßware'],
    ['snack','Kartoffelchips Paprika',['Paprikachips','Chips Paprika'],535,6.0,52.0,34.0,3.0,1.40,30,'g','Snack'],
    ['snack','Erdnussflips',['Flips','Mais-Erdnuss-Snack'],500,13.0,54.0,25.0,3.0,1.70,30,'g','Snack'],
    ['snack','Studentenfutter',['Nuss-Frucht-Mix','Trail Mix'],485,13.0,38.0,30.0,28.0,0.05,40,'g','Nüsse'],
    ['drink','Cola',['Cola klassisch','Colagetränk'],42,0.0,10.6,0.0,10.6,0.01,330,'ml','Getränk'],
    ['drink','Cola Zero',['Cola ohne Zucker','Zero Cola'],1,0.0,0.1,0.0,0.0,0.02,330,'ml','Getränk'],
    ['drink','Orangenlimonade',['Orangenlimo','Orange Limonade'],45,0.0,11.0,0.0,11.0,0.01,330,'ml','Getränk'],
    ['drink','Apfelschorle',['Apfel Schorle'],25,0.0,6.0,0.0,5.8,0.01,500,'ml','Getränk'],
    ['bio','Bio Tofu Natur',['Tofu natur','Sojatofu'],135,14.0,1.5,8.0,0.5,0.05,200,'g','Fleischalternative'],
    ['bio','Bio Haferdrink',['Hafermilch','Hafer Drink'],46,1.0,6.7,1.5,4.0,0.10,250,'ml','Pflanzendrink'],
    ['ready','Pizza Margherita tiefgekühlt',['TK Pizza Margherita','Pizza Käse'],225,9.0,28.0,8.0,3.0,1.20,350,'g','Fertiggericht'],
    ['ready','Lasagne Bolognese gekühlt',['Fertiglasagne','Lasagne Rind'],145,7.0,14.0,6.5,3.0,1.00,400,'g','Fertiggericht'],
    ['ready','Chicken Nuggets',['Hähnchen Nuggets','Geflügel Nuggets'],245,14.0,18.0,13.0,1.0,1.30,150,'g','Fertiggericht']
  ];

  const direct=[
    ['Coca-Cola','Coca-Cola Original Taste',['Coke','Coca Cola klassisch'],42,0,10.6,0,10.6,0.01,330,'ml','Getränk'],
    ['Coca-Cola','Coca-Cola Zero Sugar',['Coke Zero','Coca Cola Zero'],0.3,0,0,0,0,0.02,330,'ml','Getränk'],
    ['Pepsi','Pepsi Cola',['Pepsi klassisch'],43,0,10.7,0,10.7,0.01,330,'ml','Getränk'],
    ['Pepsi','Pepsi Max',['Pepsi Zero','Pepsi ohne Zucker'],0.4,0,0,0,0,0.02,330,'ml','Getränk'],
    ['Red Bull','Red Bull Energy Drink',['Redbull','Energy Drink Red Bull'],45,0,11,0,11,0.10,250,'ml','Energy Drink'],
    ['Monster','Monster Energy Original',['Monster Energy'],46,0,11,0,11,0.20,500,'ml','Energy Drink'],
    ['Nutella','Nutella Nuss-Nougat-Creme',['Ferrero Nutella','Nussnougatcreme'],539,6.3,57.5,30.9,56.3,0.11,20,'g','Aufstrich'],
    ['Haribo','Goldbären',['Haribo Gummibärchen','Gummibären'],343,6.9,77.4,0.5,46.0,0.07,25,'g','Süßware'],
    ['Ritter Sport','Vollmilch',['Ritter Sport Vollmilch Schokolade'],548,7.0,55.0,33.0,54.0,0.18,25,'g','Süßware'],
    ['Milka','Alpenmilch',['Milka Vollmilch','Milka Schokolade'],530,6.5,58.0,30.0,57.0,0.30,25,'g','Süßware'],
    ['Müller','Müllermilch Schoko',['Müller Milch Schokolade'],75,3.3,11.0,2.0,10.5,0.15,400,'ml','Milchgetränk'],
    ['Zott','Sahnejoghurt Erdbeere',['Zott Joghurt Erdbeere'],135,3.0,15.0,7.0,14.0,0.12,150,'g','Milchprodukt'],
    ['Danone','Actimel Classic',['Actimel Natur','Actimel Original'],73,2.8,12.0,1.5,11.5,0.10,100,'g','Milchprodukt'],
    ['Dr. Oetker','Ristorante Pizza Salame',['Ristorante Salami','Dr Oetker Pizza Salami'],245,11.0,27.0,10.0,3.0,1.40,320,'g','Fertiggericht'],
    ['Wagner','Steinofen Pizza Speciale',['Wagner Pizza Speciale'],230,10.0,27.0,9.0,3.0,1.30,350,'g','Fertiggericht']
  ];

  const items=[];
  function add(name,aliases,brand,store,values,category,portion,unit,sourceId){
    const key=norm(name);if(!key||keys.has(key))return;keys.add(key);
    const clean=[];for(const alias of aliases||[]){const a=norm(alias);if(a&&!keys.has(a)){keys.add(a);clean.push(alias)}}
    const [calories,protein,carbs,fat,sugar,salt]=values;
    items.push(Object.freeze({id:`ccp260:${sourceId}`,name,aliases:Object.freeze(clean),brand,stores:store,kind:'food',barcode:'',amount:100,unit,calories,protein,carbs,fat,fiber:null,sugar,saturatedFat:null,salt,favorite:false,uses:0,lastUsedAt:null,createdAt:null,catalog:true,product:true,derived:false,estimated:true,verified:false,market:'DE',source:'curated-retailer-reference',sourceId,sourceVersion:VERSION,sourceLabel:`${brand}${store?` · ${store}`:''} · geschätzter Richtwert je 100 ${unit}`,sourceUrl:'',verifiedAt:null,category,defaultPortion:portion,mealTypes:MEALS,featured:Object.freeze([0,0,0,0]),components:Object.freeze([])}));
  }
  for(const retailer of retailers){
    for(const [group,label,aliases,cal,p,c,f,sugar,salt,portion,unit,category] of templates){
      const brand=retailer.brands[group];if(!brand)continue;
      const name=`${brand} ${label}`;
      add(name,[`${retailer.store} ${label}`,`${brand} ${aliases[0]||label}`,...aliases],brand,retailer.store,[cal,p,c,f,sugar,salt],category,portion,unit,`${slug(retailer.store)}-${slug(brand)}-${slug(label)}`);
    }
  }
  for(const [brand,label,aliases,cal,p,c,f,sugar,salt,portion,unit,category] of direct){
    add(`${brand} ${label}`,aliases,brand,'',[cal,p,c,f,sugar,salt],category,portion,unit,`brand-${slug(brand)}-${slug(label)}`);
  }
  const combined=Object.freeze([...items,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  root.CutCoachProductCatalog260=Object.freeze({version:VERSION,count:items.length,retailers:Object.freeze(retailers.map(r=>r.store)),items:()=>Object.freeze(items)});
  root.CutCoachFoodCatalog=Object.freeze({...base,meta:Object.freeze({...base.meta,count:combined.length,retailerReferenceCount:items.length,retailerReferenceVersion:VERSION}),items:()=>combined,get:id=>byId.get(String(id))||base.get?.(id)||null});
  try{root.dispatchEvent(new CustomEvent('cutcoach:catalog-updated',{detail:{source:'product-catalog-v260',count:items.length}}))}catch{}
})(window);