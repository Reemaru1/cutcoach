'use strict';
(function(global){
  const VERSION='2.0.2-alpha';
  const BUILD='2.0.2-spoken-segmentation';
  const INDEX_TTL=30000;
  if(global.CutCoachSpokenIntent202)return;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9|]+/g,' ').trim().replace(/\s+/g,' ');
  const NUMBER_WORDS=Object.freeze({ein:1,eine:1,einen:1,einer:1,eines:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,halb:.5,halbe:.5,halben:.5,halber:.5,anderthalb:1.5});
  const UNITS=Object.freeze({g:{unit:'g',scale:1,label:'g',kind:'dimension'},gramm:{unit:'g',scale:1,label:'g',kind:'dimension'},kg:{unit:'g',scale:1000,label:'kg',kind:'dimension'},ml:{unit:'ml',scale:1,label:'ml',kind:'dimension'},l:{unit:'ml',scale:1000,label:'l',kind:'dimension'},liter:{unit:'ml',scale:1000,label:'l',kind:'dimension'},stuck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stueck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},portion:{unit:'Portion',scale:1,label:'Portion',kind:'count'},dose:{unit:null,scale:1,label:'Dose',kind:'serving'},glas:{unit:null,scale:1,label:'Glas',kind:'serving'},tasse:{unit:null,scale:1,label:'Tasse',kind:'serving'},scheibe:{unit:null,scale:1,label:'Scheibe',kind:'serving'}});
  const FILLERS=new Set(['noch','dann','danach','dazu','bitte','etwas','mal','auch','anschliessend','anschließend']);
  const FALLBACKS=Object.freeze([
    Object.freeze({id:'cutcoach-spoken-semmel',name:'Semmel',aliases:Object.freeze(['Brötchen','Broetchen','Weizensemmel','Kaisersemmel']),kind:'food',amount:1,unit:'Stück',calories:160,protein:5.2,carbs:31,fat:1.3,fiber:1.8,sugar:1.2,saturatedFat:.2,salt:.7,source:'cutcoach',sourceId:'spoken-semmel',sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · durchschnittliche Semmel',catalog:true,derived:true,estimated:true,category:'Brot'}),
    Object.freeze({id:'cutcoach-spoken-breze',name:'Breze',aliases:Object.freeze(['Brezel','Brezen','Brezn','Laugenbreze','Laugenbrezel']),kind:'food',amount:1,unit:'Stück',calories:230,protein:7.5,carbs:45,fat:2,fiber:2.5,sugar:2,saturatedFat:.4,salt:1.5,source:'cutcoach',sourceId:'spoken-breze',sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · durchschnittliche Breze',catalog:true,derived:true,estimated:true,category:'Brot'}),
    Object.freeze({id:'cutcoach-spoken-kaffee',name:'Kaffee schwarz',aliases:Object.freeze(['Kaffee','einen Kaffee','Filterkaffee','schwarzer Kaffee']),kind:'food',amount:200,unit:'ml',calories:2,protein:.2,carbs:.3,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:0,source:'cutcoach',sourceId:'spoken-kaffee',sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · schwarzer Kaffee',catalog:true,derived:true,estimated:true,category:'Getränk'}),
    Object.freeze({id:'cutcoach-spoken-baklava',name:'Baklava',aliases:Object.freeze(['Baklawa','Baklava Stück']),kind:'food',amount:1,unit:'Stück',calories:215,protein:3,carbs:27,fat:11,fiber:1,sugar:18,saturatedFat:3.5,salt:.1,source:'cutcoach',sourceId:'spoken-baklava',sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · durchschnittliches Baklava-Stück',catalog:true,derived:true,estimated:true,category:'Dessert'}),
    Object.freeze({id:'cutcoach-spoken-kaese',name:'Käse',aliases:Object.freeze(['Kaese','Käsescheibe','Kaesescheibe','Schnittkäse','Schnittkaese']),kind:'food',amount:1,unit:'Stück',calories:110,protein:7.5,carbs:.2,fat:9,fiber:0,sugar:.2,saturatedFat:5.8,salt:.55,source:'cutcoach',sourceId:'spoken-kaese',sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · eine Käsescheibe',catalog:true,derived:true,estimated:true,category:'Milchprodukt'}),
    Object.freeze({id:'cutcoach-spoken-cola',name:'Cola',aliases:Object.freeze(['eine Cola','Coca Cola','Coca-Cola']),kind:'food',amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,fiber:0,sugar:35,saturatedFat:0,salt:.03,source:'cutcoach',sourceId:'spoken-cola',sourceVersion:VERSION,sourceLabel:'CutCoach Standardwert · 330 ml Cola',catalog:true,derived:true,estimated:true,category:'Getränk'})
  ]);

  let base=null,api=null,index=new Map(),phrases=[],builtAt=0,indexRecords=0;
  const sourceWeight=item=>item?.source==='user'?30:item?.source==='cutcoach'?18:item?.source==='bls'?8:item?.source==='manufacturer'?6:item?.source==='off'?4:0;
  const genericPenalty=(item,key)=>{const name=normalize(item?.name),words=name.split(' ').filter(Boolean);if(name===key)return 0;if(words.length===1)return 3;if(words.length===2)return 8;return 16+words.length};
  function pushRecord(map,item,origin){if(!item?.name)return;const canonical=normalize(item.name);for(const value of [item.name,...(Array.isArray(item.aliases)?item.aliases:[item.aliases])].filter(Boolean)){const key=normalize(value);if(!key||key.includes('|')||key.split(' ').length>5)continue;const records=map.get(key)||[];records.push({item,origin,key,isName:key===canonical,score:(origin==='fallback'?100:0)+(key===canonical?40:0)+sourceWeight(item)-genericPenalty(item,key)});map.set(key,records);indexRecords++}}
  function buildIndex(){
    if(index.size&&Date.now()-builtAt<INDEX_TTL)return index;
    const map=new Map();indexRecords=0;
    for(const item of FALLBACKS)pushRecord(map,item,'fallback');
    try{for(const item of global.CutCoachLibrary?.exportData?.().items||[])pushRecord(map,item,'library')}catch{}
    try{for(const item of global.CutCoachFoodCatalog?.items?.()||[])pushRecord(map,item,'catalog')}catch{}
    try{for(const item of global.CutCoachEverydayCatalog?.items?.()||[])pushRecord(map,item,'everyday')}catch{}
    for(const records of map.values())records.sort((a,b)=>b.score-a.score||String(a.item.name).localeCompare(String(b.item.name),'de'));
    index=map;phrases=[...map.keys()].sort((a,b)=>b.split(' ').length-a.split(' ').length||b.length-a.length);builtAt=Date.now();return index;
  }
  function invalidateIndex(){index=new Map();phrases=[];builtAt=0;indexRecords=0;base?.invalidateIndex?.()}
  function amountOf(token){const numeric=Number(String(token||'').replace(',','.'));return Number.isFinite(numeric)&&numeric>0?numeric:NUMBER_WORDS[normalize(token)]||1}
  function isAmount(token){return /^\d+(?:[.,]\d+)?$/.test(String(token||''))||Object.prototype.hasOwnProperty.call(NUMBER_WORDS,normalize(token))}
  function cleanSpeech(value){return String(value||'').replace(/\b(?:und\s+)?(?:dann|danach)\s+noch\b/gi,' | ').replace(/\b(?:außerdem|ausserdem)\s+(?:noch\s+)?/gi,' | ').replace(/\b(?:und|plus|sowie)\b/gi,' | ').replace(/[,;+&]/g,' | ').replace(/^(?:ich\s+(?:hatte|habe|hab|esse|trinke)\s+|zum\s+(?:frühstück|mittagessen|abendessen)\s+(?:gab\s+es\s+)?)/i,'').replace(/\|+/g,'|').trim()}
  function rowFor(item,raw,phrase,quantity,quantitySpecified,unitInfo){
    const baseAmount=Math.max(.01,Number(item.amount)||1),itemUnit=String(item.unit||'g');let factor=quantitySpecified?quantity:1,amountLabel=quantitySpecified?`${quantity}×`:'',incompatible=false,approximate=false;
    if(unitInfo){if(unitInfo.kind==='dimension'){const amount=quantity*unitInfo.scale;if(itemUnit!==unitInfo.unit){incompatible=true;factor=1}else{factor=amount/baseAmount;amountLabel=`${amount} ${unitInfo.unit}`}}else if(unitInfo.kind==='count'&&itemUnit===unitInfo.unit){factor=quantity/baseAmount;amountLabel=`${quantity} ${unitInfo.label}`}else{factor=quantity;amountLabel=`${quantity} ${unitInfo.label}`;approximate=true}}
    const status=incompatible?'incompatible':'matched',confidence=99;
    return{raw:String(raw||phrase).trim(),source:phrase,query:normalize(phrase),quantity,quantitySpecified,unitInfo,modifier:'',smart:true,directItem:item,directMatch:{item,matchType:'spoken-intent',confidence,matchedName:phrase,alternatives:[]},item,status,matchType:'spoken-intent',confidence,confidenceLabel:'Sehr sicher · 99%',corrected:'',alternatives:[],choices:[],factor,amountLabel,incompatible,approximate,spokenIntent:true};
  }
  function bestItem(phrase){const records=buildIndex().get(normalize(phrase))||[];return records[0]?.item||null}
  function matchAt(tokens,indexAt){for(const phrase of phrases){const words=phrase.split(' ');if(tokens.slice(indexAt,indexAt+words.length).join(' ')===phrase)return{phrase,length:words.length,item:bestItem(phrase)}}return null}
  function segmentChunk(chunk){
    const tokens=normalize(chunk).split(' ').filter(Boolean),rows=[];let cursor=0;
    while(cursor<tokens.length){while(FILLERS.has(tokens[cursor]))cursor++;if(cursor>=tokens.length)break;
      const start=cursor;let quantity=1,quantitySpecified=false,unitInfo=null;
      if(isAmount(tokens[cursor])){quantity=amountOf(tokens[cursor]);quantitySpecified=true;cursor++}
      if(quantitySpecified&&UNITS[tokens[cursor]]){unitInfo=UNITS[tokens[cursor]];cursor++}
      const matched=matchAt(tokens,cursor);if(!matched?.item)return null;
      const raw=tokens.slice(start,cursor+matched.length).join(' ');rows.push(rowFor(matched.item,raw,matched.phrase,quantity,quantitySpecified,unitInfo));cursor+=matched.length;
    }
    return rows.length?rows:null;
  }
  function spokenRows(value){
    const raw=String(value||'').trim();if(!raw)return null;buildIndex();const cleaned=cleanSpeech(raw),chunks=cleaned.split('|').map(value=>value.trim()).filter(Boolean);if(!chunks.length)return null;
    const rows=[];for(const chunk of chunks){const segmented=segmentChunk(chunk);if(!segmented)return null;rows.push(...segmented)}
    return rows.length>=2?rows:null;
  }
  function rowsFor(value){return spokenRows(value)||base?.rowsFor?.(value)||[]}
  function parse(value){return spokenRows(value)||base?.parse?.(value)||[]}
  function attach(engine){if(!engine)return null;if(api)return api;base=engine;api=Object.freeze({...engine,spokenIntentVersion:VERSION,spokenIntentBuild:BUILD,rowsFor,parse,likelyMulti:value=>Boolean(spokenRows(value))||Boolean(base.likelyMulti?.(value)),invalidateIndex,spokenRows,indexStats:()=>Object.freeze({keys:buildIndex().size,records:indexRecords,builtAt})});global.CutCoachIntelligentSearch128=api;return api}
  global.addEventListener?.('cutcoach:catalog-updated',invalidateIndex);global.addEventListener?.('cutcoach:librarychange',invalidateIndex);global.document?.addEventListener?.('cutcoach:library-changed',invalidateIndex);
  global.CutCoachSpokenIntent202=Object.freeze({version:VERSION,build:BUILD,attach,spokenRows,invalidateIndex,fallbacks:FALLBACKS});
})(window);
