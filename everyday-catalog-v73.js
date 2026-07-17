'use strict';
(function(global){
  const VERSION='7.3.0';
  const base=global.CutCoachFoodCatalog;
  if(!base?.items||global.CutCoachEverydayCatalog)return;

  const NUTRIENTS=['calories','protein','carbs','fat','fiber','sugar','saturatedFat','salt'];
  const MEALS=['Frühstück','Mittagessen','Abendessen','Snack'];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const compact=value=>normalize(value).replace(/\s+/g,'');
  const round=(value,digits=2)=>{const scale=10**digits;return Math.round((Number(value)||0)*scale)/scale};
  const baseItems=base.items().filter(item=>item?.source==='bls');
  const index=baseItems.map(item=>({item,name:normalize(item.name),compact:compact(item.name)}));

  const MATCH={
    pretzel:[
      {all:['laugen','brezel'],prefer:['gebacken']},{all:['brezel']},{all:['laugengeback']}
    ],
    roll:[
      {all:['weizen','brotchen'],exclude:['vollkorn','belegt']},{all:['brotchen'],exclude:['vollkorn','roggen','mehrkorn','belegt']},{all:['semmel'],exclude:['vollkorn','belegt']},{all:['weizen','kleingeback']}
    ],
    wholeRoll:[
      {all:['vollkorn','brotchen']},{all:['mehrkorn','brotchen']},{all:['roggen','brotchen']},{all:['vollkorn','kleingeback']}
    ],
    toast:[
      {all:['toastbrot']},{all:['toast','brot']},{all:['weizenbrot'],exclude:['vollkorn']}
    ],
    flatbread:[
      {all:['fladenbrot']},{all:['pita']},{all:['tortilla']},{all:['wrap']},{all:['weizenbrot'],exclude:['vollkorn']}
    ],
    butter:[{all:['butter'],exclude:['buttermilch','butterkeks','buttergemuse','butterpilz'],prefer:['sussrahm']}],
    gouda:[{all:['gouda'],prefer:['45']},{all:['schnittkase'],prefer:['45']}],
    mozzarella:[{all:['mozzarella']}],
    creamCheese:[{all:['frischkase'],exclude:['zubereitung']},{all:['doppelrahmfrischkase']}],
    ham:[{all:['kochschinken']},{all:['schinken'],exclude:['rohschinken','speck']}],
    turkey:[{all:['pute','brust'],prefer:['gegart']},{all:['truthahn','brust'],prefer:['gegart']},{all:['putenbrust']}],
    salami:[{all:['salami'],exclude:['pizza']}],
    liverCheese:[{all:['leberkase']},{all:['fleischkase']}],
    schnitzel:[{all:['schnitzel'],prefer:['schwein']},{all:['schwein','schnitzel']}],
    meatPatty:[{all:['frikadelle']},{all:['fleischpflanzerl']},{all:['bulette']},{all:['hackfleisch','gegart']}],
    mustard:[{all:['senf'],exclude:['samen']}],
    mayonnaise:[{all:['mayonnaise']},{all:['salatmayonnaise']}],
    ketchup:[{all:['ketchup']},{all:['tomatenketchup']}],
    lettuce:[{all:['kopfsalat']},{all:['eisbergsalat']},{all:['blattsalat']}],
    tomato:[{all:['tomate'],prefer:['roh'],exclude:['saft','mark','ketchup','sauce']}],
    cucumber:[{all:['salatgurke']},{all:['gurke'],prefer:['roh'],exclude:['essig','saure']}],
    onion:[{all:['zwiebel'],prefer:['roh'],exclude:['pulver','suppe']}],
    egg:[{all:['huhnerei'],prefer:['gekocht','gegart']},{all:['ei'],prefer:['gekocht'],exclude:['teigwaren']}],
    tuna:[{all:['thunfisch'],prefer:['konserve']},{all:['thunfisch']}],
    smokedSalmon:[{all:['lachs','gerauchert']},{all:['racherlachs']},{all:['lachs'],prefer:['gegart']}],
    chicken:[{all:['huhn','brust'],prefer:['gegart']},{all:['hahnchen','brust'],prefer:['gegart']},{all:['geflugel','brust'],prefer:['gegart']},{all:['huhn','fleisch'],prefer:['gegart']}],
    beef:[{all:['rind','fleisch'],prefer:['gegart','mager'],exclude:['roh']},{all:['rind','hackfleisch'],prefer:['gegart']}],
    mincedBeef:[{all:['rind','hackfleisch']},{all:['hackfleisch'],prefer:['rind']}],
    falafel:[{all:['falafel']},{all:['kichererbse'],prefer:['gegart']}],
    yogurt:[{all:['joghurt'],prefer:['3 5'],exclude:['frucht','trink']}],
    garlic:[{all:['knoblauch'],prefer:['roh']}],
    fries:[{all:['pommes','frites']},{all:['kartoffel'],prefer:['frittiert']}],
    rice:[{all:['reis'],prefer:['gegart','gekocht'],exclude:['roh','mehl','milch']}],
    sausage:[{all:['bratwurst']},{all:['bockwurst']},{all:['wurst'],prefer:['gebraten']}],
    whiteSausage:[{all:['weisswurst']},{all:['weiswurst']}],
    currySauce:[{all:['currysauce']},{all:['ketchup']}],
    burgerBun:[{all:['hamburger','brotchen']},{all:['weizen','brotchen'],exclude:['vollkorn']}],
    cheddar:[{all:['cheddar']},{all:['gouda']}],
    pasta:[{all:['teigwaren'],prefer:['gegart','gekocht'],exclude:['roh']},{all:['nudeln'],prefer:['gekocht']}],
    tomatoSauce:[{all:['tomatensauce']},{all:['tomate','sauce']},{all:['tomatenmark']}],
    potato:[{all:['kartoffel'],prefer:['gekocht','gegart'],exclude:['pommes','puffer','chips','roh']}],
    milk:[{all:['vollmilch']},{all:['milch'],prefer:['3 5'],exclude:['pulver','kondens','mutter']}],
    oats:[{all:['hafer','flocken']}],
    banana:[{all:['banane'],prefer:['roh']}],
    skyr:[{all:['skyr']},{all:['joghurt'],prefer:['mager']}],
    quark:[{all:['magerquark']},{all:['speisequark'],prefer:['mager']}],
    berries:[{all:['beeren'],prefer:['roh']},{all:['erdbeere'],prefer:['roh']},{all:['himbeere'],prefer:['roh']}],
    peanutButter:[{all:['erdnussbutter']},{all:['erdnuss','mus']}],
    apple:[{all:['apfel'],prefer:['roh'],exclude:['saft','mus','getrocknet']}],
    nuts:[{all:['mandel']},{all:['walnuss']},{all:['nuss'],exclude:['mus','ol']}],
    honey:[{all:['honig'],exclude:['met']}],
    cottageCheese:[{all:['hüttenkase']},{all:['korniger','frischkase']}],
    sauerkraut:[{all:['sauerkraut']}],
    dumpling:[{all:['kartoffelknodel']},{all:['semmelknodel']},{all:['knodel']}],
    porkRoast:[{all:['schwein','braten'],prefer:['gegart']},{all:['schweinebraten']}],
    spaetzle:[{all:['spatzle'],prefer:['gegart']},{all:['eierteigwaren'],prefer:['gegart']}],
    maultaschen:[{all:['maultasche']},{all:['maultaschen']}],
    fishFillet:[{all:['seelachs'],prefer:['gegart']},{all:['fischfilet'],prefer:['gegart']},{all:['kabeljau'],prefer:['gegart']}],
    tortilla:[{all:['tortilla']},{all:['wrap']},{all:['fladenbrot']},{all:['weizenbrot'],exclude:['vollkorn']}],
    beans:[{all:['kidneybohne'],prefer:['gegart']},{all:['bohne'],prefer:['gegart'],exclude:['grun']}],
    corn:[{all:['mais'],prefer:['gegart'],exclude:['mehl','starke','roh']}],
    avocado:[{all:['avocado'],prefer:['roh']}],
    oil:[{all:['rapsol']},{all:['olivenol']},{all:['pflanzenol']}]
  };

  function candidateScore(entry,query){
    const name=entry.name;
    if((query.all||[]).some(term=>!name.includes(normalize(term))))return -1;
    if((query.any||[]).length&&!(query.any||[]).some(term=>name.includes(normalize(term))))return -1;
    if((query.exclude||[]).some(term=>name.includes(normalize(term))))return -1;
    let score=0;
    for(const term of query.all||[])score+=name===normalize(term)?400:name.startsWith(normalize(term))?180:70;
    for(const term of query.prefer||[])if(name.includes(normalize(term)))score+=55;
    if(name.includes('roh')&&!String(query.prefer||'').includes('roh'))score-=20;
    if(name.includes('gegart')||name.includes('gekocht'))score+=8;
    score-=name.length*.02;
    return score;
  }
  const picked=new Map();
  function pick(key){
    if(picked.has(key))return picked.get(key);
    const queries=MATCH[key]||[];
    for(const query of queries){
      let best=null,bestScore=-1;
      for(const entry of index){
        const score=candidateScore(entry,query);
        if(score>bestScore){best=entry.item;bestScore=score}
      }
      if(best){picked.set(key,best);return best}
    }
    picked.set(key,null);return null;
  }

  const defs=[];
  const add=(id,name,aliases,category,meals,components,options={})=>defs.push({id,name,aliases,category,meals,components,...options});
  const c=(key,grams)=>({key,grams});

  // Bäckerei & belegte Semmeln
  add('butterbrezel','Butterbreze / Butterbrezel',['Brezn mit Butter','Butterbrezn','Laugenbrezel mit Butter'],'Bäckerei',['Frühstück','Snack'],[c('pretzel',85),c('butter',25)],{featured:1});
  add('kaesesemmel','Käsesemmel / Käsebrötchen',['Kaesebroetchen','belegtes Brötchen Käse','Käseweckle'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('butter',8),c('gouda',35),c('lettuce',7)],{featured:2});
  add('schinken-kaese-semmel','Schinken-Käse-Semmel',['Schinken Käse Brötchen','belegte Semmel Schinken Käse'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('butter',8),c('ham',30),c('gouda',30),c('lettuce',7)]);
  add('salami-semmel','Salamisemmel / Salamibrötchen',['Salami Brötchen','belegte Semmel Salami'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('butter',8),c('salami',30),c('lettuce',7),c('tomato',15)]);
  add('leberkaessemmel','Leberkässemmel',['Leberkäsebrötchen','Fleischkäsweck','LKW mit ABS'],'Bäckerei',['Mittagessen','Snack'],[c('roll',70),c('liverCheese',100),c('mustard',10)],{featured:3});
  add('schnitzelsemmel','Schnitzelsemmel',['Schnitzelbrötchen','Schnitzelweck'],'Bäckerei',['Mittagessen','Snack'],[c('roll',70),c('schnitzel',100),c('lettuce',10),c('tomato',15),c('mayonnaise',10)]);
  add('frikadellensemmel','Fleischpflanzerlsemmel / Frikadellenbrötchen',['Bulettenbrötchen','Fleischküchle im Brötchen'],'Bäckerei',['Mittagessen','Snack'],[c('roll',70),c('meatPatty',100),c('mustard',10),c('onion',10)]);
  add('buttersemmel','Buttersemmel / Butterbrötchen',['Semmel mit Butter','Butterweckle'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('butter',20)]);
  add('frischkaese-semmel','Frischkäsebrötchen',['Frischkäsesemmel','Brötchen mit Frischkäse'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('creamCheese',40),c('cucumber',15)]);
  add('lachs-semmel','Lachsbrötchen',['Lachssemmel','Räucherlachsbrötchen'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('creamCheese',20),c('smokedSalmon',50),c('cucumber',10)]);
  add('ei-semmel','Eierbrötchen',['Eisemmel','Brötchen mit Ei'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('egg',60),c('mayonnaise',10),c('lettuce',10)]);
  add('thunfisch-semmel','Thunfischbrötchen',['Thunfischsemmel','Tuna Sandwich'],'Bäckerei',['Mittagessen','Snack'],[c('roll',70),c('tuna',55),c('mayonnaise',12),c('lettuce',8),c('tomato',15)]);
  add('puten-semmel','Putenbrustbrötchen',['Putensemmel','Putenbrust Sandwich'],'Bäckerei',['Frühstück','Snack'],[c('roll',70),c('turkey',45),c('creamCheese',15),c('lettuce',8),c('tomato',15)]);
  add('caprese-semmel','Caprese-Brötchen',['Mozzarella Tomate Brötchen','Caprese Semmel'],'Bäckerei',['Mittagessen','Snack'],[c('roll',70),c('mozzarella',50),c('tomato',45),c('oil',5)]);
  add('vollkorn-kaese','Vollkornbrötchen mit Käse',['Vollkornsemmel Käse','Mehrkornbrötchen Käse'],'Bäckerei',['Frühstück','Snack'],[c('wholeRoll',75),c('creamCheese',15),c('gouda',30),c('cucumber',15)]);

  // Döner, Dürüm & türkischer Imbiss
  const donerSalad=[c('lettuce',50),c('tomato',45),c('cucumber',35),c('onion',25)];
  const yogurtSauce=[c('yogurt',45),c('garlic',3),c('oil',4)];
  add('doner-kalb','Döner Kebab Kalb/Rind',['Döner','Kebap','Döner im Fladenbrot','Döner normal'],'Imbiss',['Mittagessen','Abendessen'],[c('flatbread',150),c('beef',120),...donerSalad,...yogurtSauce],{featured:1});
  add('doner-huhn','Döner Kebab Hähnchen',['Hähnchendöner','Chicken Döner','Döner Geflügel'],'Imbiss',['Mittagessen','Abendessen'],[c('flatbread',150),c('chicken',120),...donerSalad,...yogurtSauce],{featured:2});
  add('doner-ohne-sauce','Döner ohne Sauce',['Döner trocken','Kebap ohne Soße'],'Imbiss',['Mittagessen','Abendessen'],[c('flatbread',150),c('beef',120),...donerSalad]);
  add('durum-kalb','Dürüm Döner Kalb/Rind',['Dürüm','Yufka Döner','Dürüm Kebab','Dueruem'],'Imbiss',['Mittagessen','Abendessen'],[c('tortilla',110),c('beef',130),...donerSalad,...yogurtSauce],{featured:3});
  add('durum-huhn','Dürüm Döner Hähnchen',['Hähnchen Dürüm','Chicken Dürüm','Yufka Hähnchen'],'Imbiss',['Mittagessen','Abendessen'],[c('tortilla',110),c('chicken',130),...donerSalad,...yogurtSauce]);
  add('durum-ohne-sauce','Dürüm ohne Sauce',['Yufka ohne Soße','Dürüm trocken'],'Imbiss',['Mittagessen','Abendessen'],[c('tortilla',110),c('beef',130),...donerSalad]);
  add('falafel-durum','Falafel-Dürüm',['Falafel Yufka','vegetarischer Dürüm'],'Imbiss',['Mittagessen','Abendessen'],[c('tortilla',110),c('falafel',120),...donerSalad,...yogurtSauce]);
  add('falafel-sandwich','Falafel im Fladenbrot',['Falafel Sandwich','Falafel Tasche'],'Imbiss',['Mittagessen','Abendessen'],[c('flatbread',140),c('falafel',120),...donerSalad,...yogurtSauce]);
  add('doner-box-pommes','Dönerbox mit Pommes',['Döner Box Pommes','Kebab Box mit Pommes'],'Imbiss',['Mittagessen','Abendessen'],[c('beef',140),c('fries',180),c('lettuce',30),c('tomato',30),...yogurtSauce]);
  add('doner-box-reis','Dönerbox mit Reis',['Döner Box Reis','Kebab Box Reis'],'Imbiss',['Mittagessen','Abendessen'],[c('beef',140),c('rice',180),c('lettuce',30),c('tomato',30),...yogurtSauce]);
  add('chicken-box-pommes','Hähnchen-Dönerbox mit Pommes',['Chicken Döner Box','Hähnchen Kebab Box'],'Imbiss',['Mittagessen','Abendessen'],[c('chicken',140),c('fries',180),c('lettuce',30),c('tomato',30),...yogurtSauce]);
  add('lahmacun-doner','Lahmacun mit Dönerfleisch',['Türkische Pizza mit Döner','Lahmacun Spezial'],'Imbiss',['Mittagessen','Abendessen'],[c('tortilla',120),c('mincedBeef',80),c('tomatoSauce',35),c('beef',100),...donerSalad,...yogurtSauce]);
  add('lahmacun-pur','Lahmacun klassisch',['Türkische Pizza','Lahmacun ohne Döner'],'Imbiss',['Mittagessen','Abendessen'],[c('tortilla',120),c('mincedBeef',85),c('tomatoSauce',40),c('onion',20),c('tomato',25)]);
  add('koefte-sandwich','Köfte im Fladenbrot',['Köfte Sandwich','Köfte Ekmek'],'Imbiss',['Mittagessen','Abendessen'],[c('flatbread',140),c('meatPatty',130),...donerSalad,...yogurtSauce]);
  add('sucuk-kaese-semmel','Sucuk-Käse-Brötchen',['Sucuk Toast','Sucuk Käse Semmel'],'Imbiss',['Frühstück','Snack'],[c('roll',70),c('sausage',45),c('gouda',35),c('tomato',20)]);

  // Fast Food & Take-away
  add('currywurst','Currywurst',['Curry Wurst','Bratwurst mit Currysauce'],'Fast Food',['Mittagessen','Abendessen'],[c('sausage',150),c('currySauce',80)]);
  add('currywurst-pommes','Currywurst mit Pommes',['Currywurst Pommes','Currywurst mit Fritten'],'Fast Food',['Mittagessen','Abendessen'],[c('sausage',150),c('currySauce',80),c('fries',200)],{featured:4});
  add('bratwurstsemmel','Bratwurstsemmel',['Bratwurstbrötchen','Wurst im Brötchen'],'Fast Food',['Mittagessen','Snack'],[c('roll',70),c('sausage',120),c('mustard',12)]);
  add('hamburger','Hamburger klassisch',['Burger','Hamburger normal'],'Fast Food',['Mittagessen','Abendessen'],[c('burgerBun',75),c('mincedBeef',100),c('lettuce',15),c('tomato',25),c('onion',10),c('ketchup',15)]);
  add('cheeseburger','Cheeseburger',['Käseburger','Burger mit Käse'],'Fast Food',['Mittagessen','Abendessen'],[c('burgerBun',75),c('mincedBeef',100),c('cheddar',25),c('lettuce',15),c('tomato',25),c('onion',10),c('ketchup',15)]);
  add('chickenburger','Chickenburger',['Hähnchenburger','Chicken Burger'],'Fast Food',['Mittagessen','Abendessen'],[c('burgerBun',75),c('chicken',110),c('lettuce',20),c('tomato',25),c('mayonnaise',18)]);
  add('pommes-klein','Pommes klein',['kleine Pommes','kleine Fritten'],'Fast Food',['Snack','Mittagessen'],[c('fries',120)]);
  add('pommes-normal','Pommes normal',['mittlere Pommes','Pommes Frites Portion'],'Fast Food',['Snack','Mittagessen'],[c('fries',180)]);
  add('pommes-gross','Pommes groß',['große Pommes','große Fritten'],'Fast Food',['Snack','Mittagessen'],[c('fries',250)]);
  add('pizza-margherita','Pizza Margherita Standard',['Margherita Pizza','Pizza Käse Tomate'],'Fast Food',['Mittagessen','Abendessen'],[c('flatbread',260),c('tomatoSauce',90),c('mozzarella',110),c('oil',8)]);
  add('pizza-salami','Pizza Salami Standard',['Salamipizza','Pizza mit Salami'],'Fast Food',['Mittagessen','Abendessen'],[c('flatbread',260),c('tomatoSauce',90),c('mozzarella',100),c('salami',70),c('oil',8)]);
  add('pizza-doner','Dönerpizza Standard',['Pizza Döner','Kebab Pizza'],'Fast Food',['Mittagessen','Abendessen'],[c('flatbread',260),c('tomatoSauce',90),c('mozzarella',90),c('beef',110),c('onion',25),c('yogurt',25)]);
  add('schnitzel-pommes','Schnitzel mit Pommes',['Schnitzel Pommes','Schweineschnitzel mit Fritten'],'Fast Food',['Mittagessen','Abendessen'],[c('schnitzel',180),c('fries',200),c('ketchup',20)]);
  add('fischbroetchen','Fischbrötchen',['Fischsemmel','Backfischbrötchen'],'Fast Food',['Mittagessen','Snack'],[c('roll',70),c('fishFillet',110),c('lettuce',10),c('onion',15),c('mayonnaise',15)]);
  add('chili-con-carne','Chili con Carne Standard',['Chili','Chili mit Hackfleisch'],'Fast Food',['Mittagessen','Abendessen'],[c('mincedBeef',110),c('beans',140),c('corn',50),c('tomatoSauce',120),c('onion',30),c('oil',5)]);

  // Deutsche Klassiker & Kantine
  add('kaesespaetzle','Käsespätzle Standard',['Kasspatzen','Käsknöpfle','Kaesespaetzle'],'Kantine',['Mittagessen','Abendessen'],[c('spaetzle',260),c('gouda',90),c('butter',15),c('onion',35)]);
  add('maultaschen-gebraten','Maultaschen gebraten',['gebratene Maultaschen','Maultaschen mit Ei'],'Kantine',['Mittagessen','Abendessen'],[c('maultaschen',300),c('egg',60),c('butter',10),c('onion',30)]);
  add('maultaschen-bruehe','Maultaschen in Brühe',['Maultaschensuppe','Maultaschen Suppe'],'Kantine',['Mittagessen','Abendessen'],[c('maultaschen',250),c('onion',20)]);
  add('leberkaese-ei','Leberkäse mit Spiegelei',['Leberkäs mit Ei','Fleischkäse Spiegelei'],'Kantine',['Mittagessen','Abendessen'],[c('liverCheese',180),c('egg',60),c('butter',5)]);
  add('weisswurst-fruehstueck','Weißwurstfrühstück',['Weisswurst mit Breze','Weißwürste Brezn Senf'],'Kantine',['Frühstück','Mittagessen'],[c('whiteSausage',200),c('pretzel',85),c('mustard',20)]);
  add('schweinebraten-knodel','Schweinebraten mit Knödel',['Schweinsbraten Knödel','Braten mit Knödel'],'Kantine',['Mittagessen','Abendessen'],[c('porkRoast',180),c('dumpling',180),c('sauerkraut',100)]);
  add('bratwurst-kartoffel','Bratwurst mit Kartoffeln',['Bratwurst Kartoffeln','Wurst mit Kartoffeln'],'Kantine',['Mittagessen','Abendessen'],[c('sausage',160),c('potato',250),c('mustard',15)]);
  add('frikadelle-kartoffel','Frikadelle mit Kartoffeln',['Fleischpflanzerl Kartoffeln','Bulette mit Kartoffeln'],'Kantine',['Mittagessen','Abendessen'],[c('meatPatty',160),c('potato',250),c('mustard',15)]);
  add('haehnchen-reis','Hähnchen mit Reis',['Chicken Reis','Hähnchen-Reis-Teller'],'Kantine',['Mittagessen','Abendessen'],[c('chicken',180),c('rice',220),c('tomato',80),c('cucumber',60),c('oil',8)]);
  add('fisch-kartoffel','Fischfilet mit Kartoffeln',['Fisch mit Kartoffeln','Seelachs Kartoffeln'],'Kantine',['Mittagessen','Abendessen'],[c('fishFillet',180),c('potato',250),c('lettuce',60),c('oil',8)]);
  add('nudeln-bolognese','Nudeln Bolognese Standard',['Spaghetti Bolognese','Pasta Bolognese'],'Kantine',['Mittagessen','Abendessen'],[c('pasta',250),c('mincedBeef',100),c('tomatoSauce',160),c('onion',30),c('oil',7)]);
  add('nudeln-tomatensauce','Nudeln mit Tomatensauce',['Pasta Pomodoro','Spaghetti Tomatensauce'],'Kantine',['Mittagessen','Abendessen'],[c('pasta',280),c('tomatoSauce',180),c('oil',7),c('gouda',20)]);

  // Frühstück, Fitness & Snacks
  add('porridge-banane','Porridge mit Banane',['Haferbrei Banane','Oatmeal Banane'],'Frühstück',['Frühstück'],[c('oats',70),c('milk',250),c('banana',120)]);
  add('muesli-milch','Müsli mit Milch Standard',['Muesli Milch','Haferflocken mit Milch'],'Frühstück',['Frühstück'],[c('oats',70),c('milk',250),c('apple',100),c('nuts',15)]);
  add('skyr-beeren','Skyr mit Beeren',['Skyr Bowl','Skyr Früchte'],'Frühstück',['Frühstück','Snack'],[c('skyr',250),c('berries',120),c('honey',10)]);
  add('quark-beeren','Magerquark mit Beeren',['Quark Bowl','Quark Früchte'],'Frühstück',['Frühstück','Snack'],[c('quark',250),c('berries',120),c('honey',10)]);
  add('ruehrei-toast','Rührei mit Toast',['Eier mit Toast','Scrambled Eggs Toast'],'Frühstück',['Frühstück'],[c('egg',180),c('butter',8),c('toast',70)]);
  add('kaesetoast','Käsetoast',['Toast mit Käse','Cheese Toast'],'Frühstück',['Frühstück','Snack'],[c('toast',70),c('butter',8),c('gouda',45)]);
  add('schinken-kaese-toast','Schinken-Käse-Toast',['Toast Hawaii ohne Ananas','Ham Cheese Toast'],'Frühstück',['Frühstück','Snack'],[c('toast',70),c('butter',8),c('ham',35),c('gouda',40)]);
  add('erdnussbutter-toast','Erdnussbuttertoast',['Peanut Butter Toast','Toast mit Erdnussbutter'],'Frühstück',['Frühstück','Snack'],[c('toast',70),c('peanutButter',35),c('banana',60)]);
  add('huettenkaese-brot','Hüttenkäse auf Brot',['Cottage Cheese Brot','körniger Frischkäse Brot'],'Frühstück',['Frühstück','Snack'],[c('wholeRoll',75),c('cottageCheese',120),c('cucumber',40)]);
  add('joghurt-obst','Joghurt mit Obst',['Joghurt Bowl','Joghurt Früchte'],'Frühstück',['Frühstück','Snack'],[c('yogurt',250),c('banana',80),c('apple',100),c('nuts',15)]);
  add('apfel-nuesse','Apfel mit Nüssen',['Apfel Nuss Snack','Obst mit Nüssen'],'Snack',['Snack'],[c('apple',180),c('nuts',30)]);
  add('banane-erdnussbutter','Banane mit Erdnussbutter',['Banane Peanut Butter','Bananen Snack'],'Snack',['Snack'],[c('banana',140),c('peanutButter',25)]);
  add('protein-semmel','Protein-Semmel mit Pute',['Fitness Brötchen','Puten Vollkornbrötchen'],'Bäckerei',['Frühstück','Snack'],[c('wholeRoll',75),c('cottageCheese',45),c('turkey',60),c('lettuce',10),c('tomato',20)]);
  add('avocado-ei-toast','Avocado-Ei-Toast',['Avocado Toast mit Ei','Egg Avocado Toast'],'Frühstück',['Frühstück','Snack'],[c('toast',70),c('avocado',80),c('egg',60),c('tomato',30)]);

  function calculate(def){
    const components=[];
    const total={calories:0,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:0};
    for(const component of def.components){
      const item=pick(component.key);
      if(!item)return null;
      const basis=Math.max(.0001,Number(item.amount)||100),factor=component.grams/basis;
      const snapshot={};
      for(const nutrient of NUTRIENTS){
        const value=item[nutrient];
        snapshot[nutrient]=value===null||value===undefined?null:Number(value)||0;
        if(snapshot[nutrient]===null)total[nutrient]=null;
        else if(total[nutrient]!==null)total[nutrient]+=snapshot[nutrient]*factor;
      }
      components.push(Object.freeze({
        itemId:item.id,name:item.name,amount:component.grams,basisAmount:basis,unit:item.unit||'g',
        source:'bls',sourceId:item.sourceId||String(item.id).replace(/^bls:/,''),nutrients:Object.freeze(snapshot)
      }));
    }
    const amount=round(def.components.reduce((sum,component)=>sum+component.grams,0),1);
    const featured=MEALS.map(meal=>def.meals.includes(meal)?Math.max(1,Number(def.featured)||9):0);
    return Object.freeze({
      id:`ccde:${def.id}`,name:def.name,aliases:Object.freeze(def.aliases||[]),kind:'food',barcode:'',
      amount,unit:'g',calories:round(total.calories),protein:round(total.protein),carbs:round(total.carbs),fat:round(total.fat),
      fiber:total.fiber===null?null:round(total.fiber),sugar:total.sugar===null?null:round(total.sugar),
      saturatedFat:total.saturatedFat===null?null:round(total.saturatedFat),salt:total.salt===null?null:round(total.salt),
      favorite:false,uses:0,lastUsedAt:null,createdAt:null,catalog:true,derived:true,
      source:'cutcoach',sourceId:def.id,sourceVersion:VERSION,sourceLabel:'CutCoach Standardgericht · berechnet aus BLS 4.0',
      category:def.category,mealTypes:Object.freeze(def.meals),featured:Object.freeze(featured),
      components:Object.freeze(components)
    });
  }

  const everyday=Object.freeze(defs.map(calculate).filter(Boolean));
  const missing=Object.freeze(defs.filter(def=>!everyday.some(item=>item.sourceId===def.id)).map(def=>def.id));
  const baseAll=base.items();
  const combined=Object.freeze([...everyday,...baseAll]);
  const byId=new Map(combined.map(item=>[String(item.id),item]));
  const suggestions=Object.freeze(Object.fromEntries(MEALS.map((meal,index)=>[
    meal,Object.freeze([
      ...everyday.filter(item=>item.mealTypes.includes(meal)).sort((a,b)=>(a.featured[index]||99)-(b.featured[index]||99)||a.name.localeCompare(b.name,'de')).slice(0,16),
      ...(base.suggestions?.(meal)||[])
    ])
  ])));

  const META=Object.freeze({
    version:VERSION,count:everyday.length,defined:defs.length,missing,
    source:'CutCoach Standardgerichte',basis:'Standardportion',
    derivation:'Nährwerte aus Komponenten des Bundeslebensmittelschlüssels 4.0',
    attribution:base.meta?.attribution||'Max Rubner-Institut: Bundeslebensmittelschlüssel (BLS), Version 4.0.'
  });
  global.CutCoachEverydayCatalog=Object.freeze({meta:META,items:()=>everyday,get:id=>byId.get(String(id))||null});
  global.CutCoachFoodCatalog=Object.freeze({
    meta:Object.freeze({...base.meta,count:combined.length,everydayCount:everyday.length,everydayVersion:VERSION}),
    items:()=>combined,
    get:id=>byId.get(String(id))||base.get?.(id)||null,
    suggestions:meal=>suggestions[meal]||Object.freeze([])
  });
})(window);
