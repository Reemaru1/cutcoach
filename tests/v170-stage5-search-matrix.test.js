'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const matrix=JSON.parse(fs.readFileSync(path.join(__dirname,'stage5-search-matrix-v170.json'),'utf8'));
const sourceNames=[
  'nutrition-portion-profiles-v153.js',
  'nutrition-portion-hardening-v153.js',
  'nutrition-search-learning-v161.js',
  'nutrition-search-confidence-hardening-v151.js',
  'nutrition-multisearch-canonical-128.js'
];
const sources=sourceNames.map(name=>fs.readFileSync(path.join(root,name),'utf8'));
const inject=(window,source)=>{const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script)};

const catalog=[
  {id:'ccmeal:menemen',name:'Menemen',aliases:['Türkisches Rührei','Menemen mit Ei'],amount:350,unit:'g',calories:430,protein:23,carbs:20,fat:28,source:'cutcoach',catalog:true},
  {id:'ccmeal:menemen-sucuk',name:'Menemen mit Sucuk',aliases:['Sucuklu Menemen'],amount:400,unit:'g',calories:650,protein:32,carbs:22,fat:47,source:'cutcoach',catalog:true},
  {id:'ccmeal:simit',name:'Simit',aliases:['Türkischer Sesamring'],amount:120,unit:'g',calories:410,protein:13,carbs:62,fat:13,source:'cutcoach',catalog:true},
  {id:'ccde:doner-kalb',name:'Döner Kebab Kalb/Rind',aliases:['Döner','Kebab'],amount:550,unit:'g',calories:850,protein:45,carbs:82,fat:34,source:'cutcoach',catalog:true},
  {id:'ccmeal:goezleme-spinat',name:'Gözleme mit Spinat und Käse',aliases:['Spinat Gözleme'],amount:300,unit:'g',calories:590,protein:22,carbs:67,fat:25,source:'cutcoach',catalog:true},
  {id:'ccde:nudeln-tomatensauce',name:'Nudeln mit Tomatensauce',aliases:['Pasta Pomodoro'],amount:480,unit:'g',calories:620,protein:20,carbs:100,fat:15,source:'cutcoach',catalog:true},
  {id:'bls-steak-1',name:'Rindersteak, gegrillt',aliases:['Rindersteak','Steak'],amount:100,unit:'g',calories:210,protein:29,carbs:0,fat:10,source:'bls'},
  {id:'bls-steak-2',name:'Hüftsteak vom Rind',aliases:['Steak'],amount:100,unit:'g',calories:190,protein:28,carbs:0,fat:8,source:'bls'},
  {id:'bls-kartoffel',name:'Kartoffel gegart',aliases:['Kartoffel','Kartoffeln'],amount:100,unit:'g',calories:75,protein:2,carbs:15,fat:0.1,source:'bls'},
  {id:'bls-lachs',name:'Lachsfilet gegart',aliases:['Lachs'],amount:100,unit:'g',calories:205,protein:23,carbs:0,fat:12,source:'bls'},
  {id:'dish-milchreis',name:'Milchreis',aliases:[],amount:300,unit:'g',calories:360,protein:10,carbs:60,fat:8,source:'cutcoach'},
  {id:'food-butterkeks',name:'Butterkeks',aliases:['Butterkekse'],amount:10,unit:'g',calories:45,protein:0.7,carbs:7,fat:1.6,source:'bls'},
  {id:'food-watermelon',name:'Wassermelone',aliases:[],amount:100,unit:'g',calories:30,protein:0.6,carbs:6.3,fat:0.2,source:'bls'},
  {id:'food-honeydew',name:'Honigmelone',aliases:[],amount:100,unit:'g',calories:36,protein:0.5,carbs:8.1,fat:0.1,source:'bls'},
  {id:'pudding-one',name:'Protein Pudding',aliases:[],amount:200,unit:'g',calories:150,protein:20,carbs:12,fat:3,source:'bls'},
  {id:'pudding-two',name:'Protein Pudding',aliases:[],amount:200,unit:'g',calories:180,protein:18,carbs:16,fat:4,source:'bls'}
];
const library=[
  {id:'kombucha',name:'Kombucha',amount:100,unit:'ml',calories:20,protein:0,carbs:5,fat:0,source:'user'},
  {id:'whey',name:'Whey Protein',aliases:['Whey'],amount:30,unit:'g',calories:115,protein:24,carbs:2,fat:1,source:'user',householdMeasures:{EL:{amount:12,unit:'g'}}}
];

function createRuntime({libraryItems=library,catalogItems=catalog}={}){
  const dom=new JSDOM('<!doctype html><body data-nutrition-meal-type="Abendessen"><section data-screen="food" class="active"><div class="nutrition-search-card"><input id="nutritionSearch"></div><div id="nutritionResults"></div></section></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
  const w=dom.window;
  w.CutCoachLibrary={
    exportData:()=>({items:libraryItems}),
    addItemToDay:()=>({id:'meal'}),
    addCatalogItemToDay:()=>({id:'meal'}),
    undoDayAdd:()=>true
  };
  w.CutCoachFoodCatalog={items:()=>catalogItems,get:id=>catalogItems.find(item=>item.id===id)||null};
  w.CutCoachEverydayCatalog={items:()=>[],get:()=>null};
  w.render=()=>{};w.toast=()=>{};
  for(const source of sources)inject(w,source);
  let engine=w.CutCoachIntelligentSearch128;
  engine=w.CutCoachSearchConfidenceHardening151.attach(engine);
  engine=w.CutCoachPortionHardening153.attach(engine);
  return{dom,window:w,api:w.CutCoachIntelligentSearch128};
}

function approximately(actual,expected,message){
  assert.ok(Math.abs(Number(actual)-Number(expected))<0.0001,`${message}: erwartet ${expected}, erhalten ${actual}`);
}

function verifyCase(api,testCase){
  const rows=api.rowsFor(testCase.query);
  if(Number.isInteger(testCase.length))assert.equal(rows.length,testCase.length,`${testCase.id}: falsche Trefferzahl`);
  if(testCase.statuses){
    assert.equal(rows.length,testCase.statuses.length,`${testCase.id}: Statusmatrix hat andere Länge`);
    assert.deepEqual(Array.from(rows,row=>row.status),testCase.statuses,`${testCase.id}: falsche Klassifizierung`);
  }
  if(testCase.names){
    assert.equal(rows.length,testCase.names.length,`${testCase.id}: Namensmatrix hat andere Länge`);
    assert.deepEqual(Array.from(rows,row=>row.item?.name||null),testCase.names,`${testCase.id}: falsche Lebensmittel`);
  }
  if(testCase.namesAt){
    testCase.namesAt.forEach((expected,index)=>assert.equal(rows[index]?.item?.name||null,expected,`${testCase.id}: falsches Lebensmittel an Position ${index+1}`));
  }
  if(testCase.ids){
    assert.equal(rows.length,testCase.ids.length,`${testCase.id}: ID-Matrix hat andere Länge`);
    assert.deepEqual(Array.from(rows,row=>row.item?.id||null),testCase.ids,`${testCase.id}: falsche IDs`);
  }
  if(testCase.notIds){
    const actualIds=rows.map(row=>row.item?.id).filter(Boolean);
    for(const id of testCase.notIds)assert.ok(!actualIds.includes(id),`${testCase.id}: verbotene Fehlzuordnung auf ${id}`);
  }
  if(testCase.factors)testCase.factors.forEach((factor,index)=>approximately(rows[index]?.factor,factor,`${testCase.id}: Faktor ${index+1}`));
  if(testCase.labels)testCase.labels.forEach((label,index)=>assert.equal(rows[index]?.amountLabel,label,`${testCase.id}: Mengenlabel ${index+1}`));
  if(testCase.labelsRegex)testCase.labelsRegex.forEach((pattern,index)=>assert.match(String(rows[index]?.amountLabel||''),new RegExp(pattern,'i'),`${testCase.id}: Mengenlabel ${index+1}`));
  if(testCase.corrected)testCase.corrected.forEach((value,index)=>assert.equal(rows[index]?.corrected,value,`${testCase.id}: Korrektur ${index+1}`));
  if(testCase.modifiers)testCase.modifiers.forEach((value,index)=>assert.equal(rows[index]?.modifier,value,`${testCase.id}: Modifikator ${index+1}`));
  return rows;
}

(()=>{
  assert.equal(matrix.version,'1.7.0-alpha');
  assert.ok(matrix.cases.length>=45,'Stufe 5 muss eine breite Suchmatrix enthalten.');
  assert.deepEqual(new Set(matrix.cases.map(testCase=>testCase.id)).size,matrix.cases.length,'Matrix-IDs müssen eindeutig sein.');
  const classes=new Set(matrix.cases.map(testCase=>testCase.class));
  for(const expected of matrix.classes)assert.ok(classes.has(expected),`Matrixklasse ${expected} fehlt.`);

  const runtime=createRuntime();
  assert.equal(runtime.api.version,'1.5.3-alpha');
  assert.equal(runtime.api.learningVersion,'1.6.1-alpha');
  for(const testCase of matrix.cases){
    if(testCase.id==='personal-skyr-priority')continue;
    verifyCase(runtime.api,testCase);
  }
  runtime.dom.window.close();

  const personalSkyr={id:'personal-skyr',name:'Skyr Natur',aliases:['Skyr'],amount:500,unit:'g',calories:315,protein:55,carbs:20,fat:1,source:'user',favorite:true,uses:6};
  const personalRuntime=createRuntime({libraryItems:[personalSkyr]});
  verifyCase(personalRuntime.api,matrix.cases.find(testCase=>testCase.id==='personal-skyr-priority'));
  const quantity=personalRuntime.api.rowsFor('250 g Skyr')[0];
  assert.equal(quantity.item.id,'personal-skyr','Persönlicher Skyr wird bei Mengenangabe nicht priorisiert.');
  approximately(quantity.factor,0.5,'Persönlicher Skyr verwendet nicht seine eigene Bezugsmenge');
  personalRuntime.dom.window.close();

  const unknownCases=matrix.cases.filter(testCase=>testCase.class==='unknown');
  assert.ok(unknownCases.length>=4,'Liste unbekannter Begriffe ist zu klein.');
  console.log(`Stufe 5 Suchmatrix ${matrix.version}: ${matrix.cases.length} Fälle in ${classes.size} Klassen geprüft; ${unknownCases.length} unbekannte/partielle Begriffe abgesichert.`);
})()