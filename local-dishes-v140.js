'use strict';
(function(global){
  const VERSION='1.4.0';
  const base=global.CutCoachFoodCatalog;
  if(!base?.items||global.CutCoachLocalDishes140)return;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const MEALS=['Frühstück','Mittagessen','Abendessen','Snack'];
  // Standardportionen und durchschnittliche Richtwerte. Gerichte schwanken je nach Rezept und Zubereitung.
  // id, name, aliases, category, meals, amount g/ml, kcal, protein, carbs, fat, featured
  const ROWS=[
    ['menemen','Menemen',['Türkisches Rührei','Menemen mit Ei','Tomaten Paprika Eier'],'Türkisch',['Frühstück','Mittagessen'],350,430,23,20,28,1],
    ['menemen-sucuk','Menemen mit Sucuk',['Sucuklu Menemen','Menemen Sucuk'],'Türkisch',['Frühstück','Mittagessen'],400,650,32,22,47,2],
    ['sucuklu-yumurta','Sucuklu Yumurta',['Sucuk mit Ei','Türkische Eier mit Sucuk'],'Türkisch',['Frühstück'],280,610,35,5,50,3],
    ['sahanda-yumurta','Sahanda Yumurta',['Türkische Spiegeleier','Spiegelei türkisch'],'Türkisch',['Frühstück'],220,360,21,4,29,4],
    ['simit','Simit',['Türkischer Sesamring','Sesamkringel'],'Türkisch',['Frühstück','Snack'],120,410,13,62,13,4],
    ['simit-kaese','Simit mit Käse',['Simit Peynir','Sesamring mit Käse'],'Türkisch',['Frühstück','Snack'],190,610,26,65,28,5],
    ['goezleme-kaese','Gözleme mit Käse',['Peynirli Gözleme','Goezleme Käse'],'Türkisch',['Frühstück','Mittagessen'],280,620,24,69,28,5],
    ['goezleme-spinat','Gözleme mit Spinat und Käse',['Ispanaklı Gözleme','Spinat Gözleme'],'Türkisch',['Frühstück','Mittagessen'],300,590,22,67,25,6],
    ['goezleme-hack','Gözleme mit Hackfleisch',['Kıymalı Gözleme','Hackfleisch Gözleme'],'Türkisch',['Mittagessen','Abendessen'],300,690,31,64,34,7],
    ['boerek-kaese','Börek mit Käse',['Peynirli Börek','Käsebörek'],'Türkisch',['Frühstück','Snack'],220,610,22,56,33,6],
    ['boerek-spinat','Börek mit Spinat',['Ispanaklı Börek','Spinatbörek'],'Türkisch',['Frühstück','Snack'],220,520,16,57,25,7],
    ['boerek-hack','Börek mit Hackfleisch',['Kıymalı Börek','Hackfleischbörek'],'Türkisch',['Mittagessen','Snack'],240,680,27,58,38,8],
    ['mercimek-corbasi','Mercimek Çorbası',['Türkische Linsensuppe','Mercimek Suppe'],'Türkisch',['Mittagessen','Abendessen'],400,310,16,43,8,4],
    ['ezogelin-corbasi','Ezogelin Çorbası',['Ezogelin Suppe','Türkische Linsen Bulgursuppe'],'Türkisch',['Mittagessen','Abendessen'],400,330,14,49,8,5],
    ['yayla-corbasi','Yayla Çorbası',['Türkische Joghurtsuppe','Yayla Suppe'],'Türkisch',['Mittagessen','Abendessen'],400,360,14,43,14,6],
    ['tarhana-corbasi','Tarhana Çorbası',['Tarhana Suppe','Türkische Tarhanasuppe'],'Türkisch',['Mittagessen','Abendessen'],400,280,10,45,7,7],
    ['kuru-fasulye-pilav','Kuru Fasulye mit Reis',['Kuru Fasulye Pilav','Weiße Bohnen mit Reis türkisch'],'Türkisch',['Mittagessen','Abendessen'],500,690,27,105,18,1],
    ['nohut-pilav','Nohut mit Reis',['Nohut Pilav','Kichererbsen mit Reis türkisch'],'Türkisch',['Mittagessen','Abendessen'],500,720,24,117,17,2],
    ['tavuklu-pilav','Tavuklu Pilav',['Türkischer Reis mit Hähnchen','Hähnchen Pilav'],'Türkisch',['Mittagessen','Abendessen'],480,710,46,88,18,2],
    ['bulgur-pilavi','Bulgur Pilavı',['Bulgurpilav','Türkischer Bulgurreis'],'Türkisch',['Mittagessen','Abendessen'],300,390,11,72,7,3],
    ['pirinc-pilavi','Pirinç Pilavı',['Türkischer Reis','Pilav'],'Türkisch',['Mittagessen','Abendessen'],300,450,8,82,10,4],
    ['manti','Mantı mit Joghurt',['Türkische Manti','Manti Knoblauchjoghurt'],'Türkisch',['Mittagessen','Abendessen'],420,760,35,91,28,1],
    ['iskender-kebap','İskender Kebap',['Iskender Döner','Iskender Teller'],'Türkisch',['Mittagessen','Abendessen'],600,1040,55,92,49,2],
    ['adana-kebap-teller','Adana Kebap Teller',['Adana Kebab','Acılı Kebap Teller'],'Türkisch',['Mittagessen','Abendessen'],550,880,55,70,40,3],
    ['urfa-kebap-teller','Urfa Kebap Teller',['Urfa Kebab','Urfa Teller'],'Türkisch',['Mittagessen','Abendessen'],550,830,54,70,35,4],
    ['tavuk-sis-teller','Tavuk Şiş Teller',['Hähnchenspieß türkisch','Tavuk Sis'],'Türkisch',['Mittagessen','Abendessen'],520,720,61,70,20,5],
    ['koefte-teller','Köfte Teller',['Köfte mit Reis','Türkische Frikadellen Teller'],'Türkisch',['Mittagessen','Abendessen'],550,850,49,72,39,5],
    ['sac-kavurma','Saç Kavurma',['Sac Kavurma','Türkische Fleischpfanne'],'Türkisch',['Mittagessen','Abendessen'],450,760,53,27,47,6],
    ['tavuk-sote','Tavuk Sote',['Türkische Hähnchenpfanne','Hähnchen Sote'],'Türkisch',['Mittagessen','Abendessen'],450,590,55,31,27,6],
    ['et-sote','Et Sote',['Türkische Rindfleischpfanne','Rind Sote'],'Türkisch',['Mittagessen','Abendessen'],450,690,49,30,40,7],
    ['pide-kaese','Pide mit Käse',['Kaşarlı Pide','Kasarli Pide','Käsepide'],'Türkisch',['Mittagessen','Abendessen'],400,950,39,117,35,5],
    ['pide-hack','Pide mit Hackfleisch',['Kıymalı Pide','Hackfleischpide'],'Türkisch',['Mittagessen','Abendessen'],420,980,44,113,38,6],
    ['pide-sucuk','Pide mit Sucuk und Käse',['Sucuklu Pide','Sucuk Käse Pide'],'Türkisch',['Mittagessen','Abendessen'],430,1120,48,109,52,7],
    ['karniyarik','Karnıyarık',['Gefüllte Aubergine mit Hackfleisch','Karniyarik'],'Türkisch',['Mittagessen','Abendessen'],450,650,31,40,40,8],
    ['imam-bayildi','İmam Bayıldı',['Gefüllte Aubergine vegetarisch','Imam Bayildi'],'Türkisch',['Mittagessen','Abendessen'],420,480,9,42,31,9],
    ['sarma','Yaprak Sarma',['Gefüllte Weinblätter','Dolma Weinblätter'],'Türkisch',['Mittagessen','Snack'],250,390,8,58,14,8],
    ['biber-dolmasi','Biber Dolması',['Gefüllte Paprika türkisch','Paprika Dolma'],'Türkisch',['Mittagessen','Abendessen'],420,560,24,66,22,9],
    ['kisir','Kısır',['Türkischer Bulgursalat','Kisir Salat'],'Türkisch',['Mittagessen','Snack'],300,430,12,72,11,7],
    ['coban-salatasi','Çoban Salatası',['Türkischer Hirtensalat','Coban Salat'],'Türkisch',['Mittagessen','Abendessen'],300,220,5,19,14,8],
    ['cacik','Cacık',['Türkischer Gurkenjoghurt','Cacik Joghurt'],'Türkisch',['Mittagessen','Abendessen','Snack'],250,180,10,13,9,9],
    ['ayran','Ayran',['Türkisches Joghurtgetränk'],'Getränk',['Frühstück','Mittagessen','Abendessen','Snack'],250,95,6,8,4,10],
    ['kumpir','Kumpir Standard',['Türkische Ofenkartoffel','Kumpir mit Beilagen'],'Türkisch',['Mittagessen','Abendessen'],650,980,29,128,40,6],
    ['sutlac','Sütlaç',['Türkischer Milchreis','Sutlac'],'Dessert',['Snack'],250,330,9,57,7,7],
    ['baklava','Baklava',['Türkisches Baklava','Baklawa'],'Dessert',['Snack'],100,470,7,55,25,8],
    ['kuenefe','Künefe',['Kunefe','Kadayif mit Käse'],'Dessert',['Snack'],250,780,20,91,37,9],

    ['omelett-kaese','Omelett mit Käse',['Käseomelett','Cheese Omelette'],'Frühstück',['Frühstück'],280,520,35,6,39,5],
    ['omelett-gemuese','Gemüseomelett',['Omelett mit Gemüse','Vegetable Omelette'],'Frühstück',['Frühstück'],320,390,25,16,25,6],
    ['spiegelei-brot','Spiegeleier mit Brot',['Spiegelei Frühstück','Fried Eggs Bread'],'Frühstück',['Frühstück'],300,470,26,42,22,7],
    ['gekochte-eier-brot','Gekochte Eier mit Brot',['Frühstück Eier Brot','Boiled Eggs Bread'],'Frühstück',['Frühstück'],300,430,26,42,18,8],
    ['french-toast','French Toast',['Arme Ritter','Eierbrot süß'],'Frühstück',['Frühstück','Snack'],300,610,21,79,24,9],
    ['pancakes','Pancakes mit Sirup',['Pfannkuchen amerikanisch','American Pancakes'],'Frühstück',['Frühstück','Snack'],300,720,17,108,24,10],
    ['protein-pancakes','Protein-Pancakes',['Eiweiß Pancakes','Fitness Pfannkuchen'],'Frühstück',['Frühstück','Snack'],300,510,43,56,14,6],
    ['waffeln','Waffeln',['Belgische Waffeln','Waffel Portion'],'Frühstück',['Frühstück','Snack'],250,720,14,92,32,11],
    ['overnight-oats','Overnight Oats',['Overnight Haferflocken','Oats über Nacht'],'Frühstück',['Frühstück'],400,560,24,79,17,4],
    ['chia-pudding','Chia-Pudding',['Chia Pudding mit Milch','Chia Bowl'],'Frühstück',['Frühstück','Snack'],300,420,15,40,23,10],
    ['joghurt-granola','Joghurt mit Granola',['Granola Bowl','Joghurt Müsli Bowl'],'Frühstück',['Frühstück','Snack'],350,510,19,66,19,8],
    ['protein-shake','Proteinshake mit Milch',['Eiweißshake','Whey Shake Milch'],'Getränk',['Frühstück','Snack'],400,310,39,22,8,6],
    ['bananen-smoothie','Bananen-Smoothie',['Banana Smoothie','Bananenshake'],'Getränk',['Frühstück','Snack'],400,360,13,64,7,8],
    ['beeren-smoothie','Beeren-Smoothie',['Berry Smoothie','Früchtesmoothie Beeren'],'Getränk',['Frühstück','Snack'],400,290,9,55,4,9],

    ['spaghetti-carbonara','Spaghetti Carbonara',['Pasta Carbonara','Carbonara'],'Italienisch',['Mittagessen','Abendessen'],450,920,37,98,42,4],
    ['lasagne-bolognese','Lasagne Bolognese',['Lasagne Hackfleisch','Lasagna Bolognese'],'Italienisch',['Mittagessen','Abendessen'],500,820,42,72,39,5],
    ['penne-arrabbiata','Penne Arrabbiata',['Pasta Arrabiata','Nudeln scharf Tomate'],'Italienisch',['Mittagessen','Abendessen'],450,650,20,104,16,6],
    ['pasta-pesto','Pasta mit Pesto',['Pesto Nudeln','Spaghetti Pesto'],'Italienisch',['Mittagessen','Abendessen'],420,790,22,94,35,7],
    ['tortellini-sahne','Tortellini in Sahnesauce',['Tortellini Sahne','Tortellini Panna'],'Italienisch',['Mittagessen','Abendessen'],500,940,34,101,45,8],
    ['gnocchi-tomate','Gnocchi mit Tomatensauce',['Gnocchi Pomodoro','Gnocchi Tomate'],'Italienisch',['Mittagessen','Abendessen'],480,650,18,111,15,9],
    ['risotto-pilze','Pilzrisotto',['Risotto Funghi','Risotto mit Pilzen'],'Italienisch',['Mittagessen','Abendessen'],450,690,18,87,27,8],
    ['pizza-funghi','Pizza Funghi Standard',['Pilzpizza','Pizza Champignons'],'Italienisch',['Mittagessen','Abendessen'],500,1050,40,129,41,8],
    ['pizza-tonno','Pizza Tonno Standard',['Thunfischpizza','Pizza Thunfisch Zwiebeln'],'Italienisch',['Mittagessen','Abendessen'],520,1160,58,127,43,9],
    ['pizza-vegetaria','Pizza Vegetaria Standard',['Gemüsepizza','Vegetarische Pizza'],'Italienisch',['Mittagessen','Abendessen'],520,980,37,132,33,10],

    ['gebratener-reis-huhn','Gebratener Reis mit Hähnchen',['Chicken Fried Rice','Bratreis Huhn'],'Asiatisch',['Mittagessen','Abendessen'],500,760,39,96,24,4],
    ['gebratene-nudeln-huhn','Gebratene Nudeln mit Hähnchen',['Chicken Chow Mein','Bratnudeln Huhn'],'Asiatisch',['Mittagessen','Abendessen'],500,820,42,101,27,5],
    ['gebratene-nudeln-gemuese','Gebratene Nudeln mit Gemüse',['Vegetarische Bratnudeln','Chow Mein Gemüse'],'Asiatisch',['Mittagessen','Abendessen'],500,690,20,105,21,6],
    ['sweet-sour-chicken','Hähnchen süß-sauer mit Reis',['Sweet Sour Chicken','Huhn süß sauer'],'Asiatisch',['Mittagessen','Abendessen'],550,890,39,126,25,7],
    ['thai-curry-huhn','Thai-Curry mit Hähnchen und Reis',['Chicken Thai Curry','Rotes Curry Huhn'],'Asiatisch',['Mittagessen','Abendessen'],550,880,43,92,37,5],
    ['pad-thai','Pad Thai mit Hähnchen',['Phad Thai','Pad Thai Chicken'],'Asiatisch',['Mittagessen','Abendessen'],500,860,41,100,32,6],
    ['ramen-huhn','Ramen mit Hähnchen',['Chicken Ramen','Nudelsuppe japanisch Huhn'],'Asiatisch',['Mittagessen','Abendessen'],600,720,42,84,23,7],
    ['pho-bo','Phở Bò',['Pho Bo','Vietnamesische Rindfleischsuppe'],'Asiatisch',['Mittagessen','Abendessen'],650,620,42,77,16,8],
    ['sushi-mix','Sushi Mix Standard',['Sushi Box','Maki Nigiri Mix'],'Asiatisch',['Mittagessen','Abendessen'],350,560,25,89,12,6],
    ['poke-lachs','Poke Bowl mit Lachs',['Salmon Poke Bowl','Lachs Bowl'],'Bowl',['Mittagessen','Abendessen'],550,760,38,88,28,5],

    ['butter-chicken','Butter Chicken mit Reis',['Murgh Makhani','Indisches Butterhuhn'],'Indisch',['Mittagessen','Abendessen'],550,940,46,91,42,6],
    ['chicken-tikka-masala','Chicken Tikka Masala mit Reis',['Tikka Masala','Chicken Masala Reis'],'Indisch',['Mittagessen','Abendessen'],550,860,48,91,33,7],
    ['dal-reis','Dal mit Reis',['Linsencurry mit Reis','Dal Chawal'],'Indisch',['Mittagessen','Abendessen'],550,710,28,119,14,8],
    ['chana-masala','Chana Masala mit Reis',['Kichererbsencurry Reis','Chole Reis'],'Indisch',['Mittagessen','Abendessen'],550,750,25,125,17,9],

    ['burrito-huhn','Burrito mit Hähnchen',['Chicken Burrito','Wrap mexikanisch Huhn'],'Mexikanisch',['Mittagessen','Abendessen'],500,930,49,105,34,5],
    ['burrito-rind','Burrito mit Rind',['Beef Burrito','Rind Burrito'],'Mexikanisch',['Mittagessen','Abendessen'],500,1010,46,102,43,6],
    ['quesadilla-kaese','Käse-Quesadilla',['Cheese Quesadilla','Quesadilla Käse'],'Mexikanisch',['Mittagessen','Snack'],350,820,33,72,45,7],
    ['tacos-rind','Tacos mit Rind',['Beef Tacos','Rindfleisch Tacos'],'Mexikanisch',['Mittagessen','Abendessen'],400,760,41,65,37,8],
    ['nachos-kaese','Nachos mit Käse',['Cheese Nachos','Nachos überbacken'],'Mexikanisch',['Snack','Abendessen'],300,980,25,94,56,10],

    ['caesar-salad-chicken','Caesar Salad mit Hähnchen',['Chicken Caesar Salad','Caesar Salat Huhn'],'Salat',['Mittagessen','Abendessen'],450,610,45,28,35,5],
    ['griechischer-salat','Griechischer Salat',['Bauernsalat Feta','Greek Salad'],'Salat',['Mittagessen','Abendessen'],450,520,17,25,38,6],
    ['couscous-bowl','Couscous-Bowl mit Gemüse',['Couscous Salat Bowl','Gemüse Couscous'],'Bowl',['Mittagessen','Abendessen'],500,620,19,91,20,7],
    ['quinoa-bowl','Quinoa-Bowl mit Gemüse',['Quinoa Gemüse Bowl','Fitness Quinoa Bowl'],'Bowl',['Mittagessen','Abendessen'],500,650,24,82,25,8],
    ['huhn-kartoffel-gemuese','Hähnchen mit Kartoffeln und Gemüse',['Chicken Potato Meal','Hähnchen Gemüse Teller'],'Fitness',['Mittagessen','Abendessen'],550,690,60,72,18,4],
    ['lachs-reis-gemuese','Lachs mit Reis und Gemüse',['Salmon Rice Bowl','Lachs Reis Teller'],'Fitness',['Mittagessen','Abendessen'],550,820,48,79,32,5],
    ['thunfisch-reis-bowl','Thunfisch-Reis-Bowl',['Tuna Rice Bowl','Thunfisch Bowl'],'Fitness',['Mittagessen','Abendessen'],500,650,45,82,15,6],
    ['kartoffelsalat','Kartoffelsalat Standard',['Deutscher Kartoffelsalat','Kartoffelsalat mit Essig Öl'],'Kantine',['Mittagessen','Abendessen'],300,420,8,59,16,8],
    ['linseneintopf','Linseneintopf',['Linsensuppe deutsch','Eintopf mit Linsen'],'Kantine',['Mittagessen','Abendessen'],500,590,31,74,18,5],
    ['gulaschsuppe','Gulaschsuppe',['Rindergulaschsuppe','Gulasch Suppe'],'Kantine',['Mittagessen','Abendessen'],500,520,39,33,25,6],
    ['haehnchen-curry-reis','Hähnchencurry mit Reis',['Chicken Curry Reis','Huhn Curry Reis'],'Kantine',['Mittagessen','Abendessen'],550,810,47,96,27,4]
  ];

  const existing=base.items();
  const existingIds=new Set(existing.map(item=>String(item.id)));
  const existingNames=new Set(existing.map(item=>normalize(item.name)));
  const items=Object.freeze(ROWS.map(row=>{
    const [id,name,aliases,category,meals,amount,calories,protein,carbs,fat,featured=9]=row;
    const featuredMap=MEALS.map(meal=>meals.includes(meal)?featured:0);
    return Object.freeze({
      id:`ccmeal:${id}`,name,aliases:Object.freeze(aliases),kind:'food',barcode:'',amount,unit:category==='Getränk'?'ml':'g',
      calories,protein,carbs,fat,fiber:null,sugar:null,saturatedFat:null,salt:null,
      favorite:false,uses:0,lastUsedAt:null,createdAt:null,catalog:true,derived:true,estimated:true,
      source:'cutcoach',sourceId:id,sourceVersion:VERSION,sourceLabel:'CutCoach Standardgericht · durchschnittlicher Richtwert',
      category,mealTypes:Object.freeze(meals),featured:Object.freeze(featuredMap),components:Object.freeze([])
    });
  }).filter(item=>!existingIds.has(item.id)&&!existingNames.has(normalize(item.name))));
  const combined=Object.freeze([...items,...existing]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  const suggestions=Object.freeze(Object.fromEntries(MEALS.map((meal,index)=>[
    meal,Object.freeze([
      ...items.filter(item=>item.mealTypes.includes(meal)).sort((a,b)=>(a.featured[index]||99)-(b.featured[index]||99)||a.name.localeCompare(b.name,'de')).slice(0,24),
      ...(base.suggestions?.(meal)||[])
    ])
  ])));
  const meta=Object.freeze({version:VERSION,count:items.length,defined:ROWS.length,source:'CutCoach lokale Standardgerichte',basis:'Standardportion',note:'Durchschnittliche Richtwerte; Rezept und Portionsgröße können abweichen.'});
  global.CutCoachLocalDishes140=Object.freeze({meta,items:()=>items,get:id=>byId.get(String(id))||null});
  global.CutCoachFoodCatalog=Object.freeze({
    meta:Object.freeze({...base.meta,count:combined.length,localDishCount:items.length,localDishVersion:VERSION}),
    items:()=>combined,
    get:id=>byId.get(String(id))||base.get?.(id)||null,
    suggestions:meal=>suggestions[meal]||Object.freeze([])
  });
})(window);
