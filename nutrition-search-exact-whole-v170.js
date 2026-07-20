'use strict';
(function(global){
  const VERSION='1.9.0-alpha';
  const BUILD='1.9.0-search-integrity';
  const INDEX_TTL=30000;
  if(global.CutCoachSearchExactWhole170)return;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const fmt=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value)||0);
  const NUMBER_WORDS=Object.freeze({ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,halb:.5,halbe:.5,halben:.5,halber:.5,anderthalb:1.5});
  const UNIT_INFO=Object.freeze({
    g:{unit:'g',scale:1,label:'g',kind:'dimension'},gr:{unit:'g',scale:1,label:'g',kind:'dimension'},gram:{unit:'g',scale:1,label:'g',kind:'dimension'},gramm:{unit:'g',scale:1,label:'g',kind:'dimension'},kg:{unit:'g',scale:1000,label:'kg',kind:'dimension'},kilo:{unit:'g',scale:1000,label:'kg',kind:'dimension'},kilogramm:{unit:'g',scale:1000,label:'kg',kind:'dimension'},
    ml:{unit:'ml',scale:1,label:'ml',kind:'dimension'},milliliter:{unit:'ml',scale:1,label:'ml',kind:'dimension'},cl:{unit:'ml',scale:10,label:'cl',kind:'dimension'},centiliter:{unit:'ml',scale:10,label:'cl',kind:'dimension'},dl:{unit:'ml',scale:100,label:'dl',kind:'dimension'},deziliter:{unit:'ml',scale:100,label:'dl',kind:'dimension'},l:{unit:'ml',scale:1000,label:'l',kind:'dimension'},liter:{unit:'ml',scale:1000,label:'l',kind:'dimension'},
    stuck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stueck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stucke:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stuecke:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stk:{unit:'Stück',scale:1,label:'Stück',kind:'count'},st:{unit:'Stück',scale:1,label:'Stück',kind:'count'},portion:{unit:'Portion',scale:1,label:'Portion',kind:'count'},portionen:{unit:'Portion',scale:1,label:'Portionen',kind:'count'},
    dose:{unit:null,scale:1,label:'Dose',kind:'serving'},dosen:{unit:null,scale:1,label:'Dosen',kind:'serving'},glas:{unit:null,scale:1,label:'Glas',kind:'serving'},glaser:{unit:null,scale:1,label:'Gläser',kind:'serving'},flasche:{unit:null,scale:1,label:'Flasche',kind:'serving'},flaschen:{unit:null,scale:1,label:'Flaschen',kind:'serving'},scheibe:{unit:null,scale:1,label:'Scheibe',kind:'serving'},scheiben:{unit:null,scale:1,label:'Scheiben',kind:'serving'},
    essloffel:{unit:null,scale:1,label:'EL',kind:'serving'},el:{unit:null,scale:1,label:'EL',kind:'serving'},teeloffel:{unit:null,scale:1,label:'TL',kind:'serving'},tl:{unit:null,scale:1,label:'TL',kind:'serving'},handvoll:{unit:null,scale:1,label:'Handvoll',kind:'serving'}
  });
  const ITEM_UNITS=Object.freeze({g:{unit:'g',scale:1},gr:{unit:'g',scale:1},gram:{unit:'g',scale:1},gramm:{unit:'g',scale:1},kg:{unit:'g',scale:1000},kilo:{unit:'g',scale:1000},kilogramm:{unit:'g',scale:1000},ml:{unit:'ml',scale:1},milliliter:{unit:'ml',scale:1},cl:{unit:'ml',scale:10},centiliter:{unit:'ml',scale:10},dl:{unit:'ml',scale:100},deziliter:{unit:'ml',scale:100},l:{unit:'ml',scale:1000},liter:{unit:'ml',scale:1000},stuck:{unit:'Stück',scale:1},stueck:{unit:'Stück',scale:1},stucke:{unit:'Stück',scale:1},stuecke:{unit:'Stück',scale:1},stk:{unit:'Stück',scale:1},st:{unit:'Stück',scale:1},portion:{unit:'Portion',scale:1},portionen:{unit:'Portion',scale:1}});
  const AMOUNT_RE=/^([+-]?(?:\d+(?:[.,]\d+)?|\d+\s*\/\s*\d+)|[½¼¾]|halb(?:e|en|er|es)?|anderthalb|ein(?:e|en|er|es)?|eins|zwei|drei|vier|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn)(?:\s*(kg|kilogramm|kilo|g|gr|gram|gramm|ml|milliliter|cl|centiliter|dl|deziliter|l|liter|st(?:ü|ue)ck(?:e)?|stk\.?|st\.?|portion(?:en)?|dose(?:n)?|glas|gl(?:ä|ae)ser|flasche(?:n)?|scheibe(?:n)?|essl(?:ö|oe)ffel|el|teel(?:ö|oe)ffel|tl|handvoll))?(?=\s|$)\s*/i;
  const SEGMENT_RE=/\s+(?:und|plus|sowie|mit\s+dazu|dazu|zusammen\s+mit|außerdem|ausserdem)\s+|\s*[;+&]\s*/i;
  const SEQUENCE_SEPARATOR_RE=/\s+(?:und|plus|sowie|mit\s+dazu|dazu|zusammen\s+mit|außerdem|ausserdem)\s+|\s*[,;+&]\s*/gi;

  let base=null,api=null,index=new Map(),builtAt=0,indexRecordCount=0,indexOrigins=Object.freeze({});
  const originWeight=origin=>origin==='library'?20:origin==='everyday'?3:origin==='catalog'?1:0;
  const sourceWeight=item=>item?.source==='user'?14:item?.source==='cutcoach'?8:item?.source==='bls'?4:item?.source==='off'?2:0;
  const preference=(item,origin)=>originWeight(origin)+sourceWeight(item)+Number(Boolean(item?.favorite))*8+Math.min(8,Math.floor(Math.max(0,Number(item?.uses)||0)/2));
  const labelFor=record=>record?.origin==='library'||record?.item?.source==='user'?'Eigene':record?.item?.source==='cutcoach'?'Standard':record?.item?.source==='bls'?'BLS':record?.item?.source==='off'?'Produkt':'Katalog';
  function cleanNatural(value){let text=String(value||'').trim();for(let index=0;index<5;index++){const cleaned=text.replace(/^(?:ich\s+(?:hatte|habe|hab|esse|trinke|aß|ass)\s+|(?:hab|hatte)\s+|zum\s+(?:frühstück|mittagessen|abendessen)\s+(?:gab\s+es\s+)?|als\s+snack\s+|bitte\s+|noch\s+|dazu\s+|heute\s+|etwas\s+|ein\s+bisschen\s+|bisschen\s+)/i,'').trim();if(cleaned===text)break;text=cleaned}text=text.replace(/^(?:ca\.?|circa|etwa|ungefähr|ungefaehr|rund)\s+/i,'').trim();return text.replace(/\s+(?:zum\s+(?:frühstück|mittagessen|abendessen)|als\s+snack|heute|gegessen|getrunken|gehabt)\s*[.!?]*$/i,'').trim()}
  function invalidateIndex(){index=new Map();builtAt=0;indexRecordCount=0;indexOrigins=Object.freeze({})}
  function buildIndex(){
    if(index.size&&Date.now()-builtAt<INDEX_TTL)return index;
    const map=new Map(),seen=new Set(),originCounts={};let recordCount=0;
    const push=(items,origin)=>{for(const item of items||[]){if(!item?.name)continue;const id=String(item.id||item.name),canonical=normalize(item.name);for(const name of new Set([item.name,...(Array.isArray(item.aliases)?item.aliases:[item.aliases])].filter(Boolean).map(normalize))){if(!name)continue;const signature=`${origin}:${id}:${name}`;if(seen.has(signature))continue;seen.add(signature);const records=map.get(name)||[];records.push({item,id,name,origin,isName:name===canonical,preference:preference(item,origin)});map.set(name,records);recordCount++;originCounts[origin]=(originCounts[origin]||0)+1}}};
    try{push(global.CutCoachLibrary?.exportData?.().items||[],'library')}catch{}
    try{push(global.CutCoachFoodCatalog?.items?.()||[],'catalog')}catch{}
    try{push(global.CutCoachEverydayCatalog?.items?.()||[],'everyday')}catch{}
    index=map;indexRecordCount=recordCount;indexOrigins=Object.freeze({...originCounts});builtAt=Date.now();return index;
  }
  function amountOf(token){const raw=String(token||'').trim(),fraction=raw.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);if(fraction){const denominator=Number(fraction[2]);return denominator?Number(fraction[1])/denominator:NaN}if(raw==='½')return.5;if(raw==='¼')return.25;if(raw==='¾')return.75;const numeric=Number(raw.replace(',','.'));if(Number.isFinite(numeric))return numeric;return NUMBER_WORDS[normalize(raw)]??NaN}
  const canonicalItemUnit=value=>ITEM_UNITS[normalize(value)]||null;
  function exactCandidates(query){const q=normalize(query),dedup=new Map();if(!q)return[];for(const record of buildIndex().get(q)||[]){const previous=dedup.get(record.id);if(!previous||record.isName&&!previous.isName||record.preference>previous.preference)dedup.set(record.id,record)}return[...dedup.values()].sort((a,b)=>(Number(b.isName)-Number(a.isName))||b.preference-a.preference||String(a.item.name).localeCompare(String(b.item.name),'de'))}
  function literalNameMatch(value){const raw=String(value||'').trim(),cleaned=cleanNatural(raw),prefix=cleaned.match(AMOUNT_RE);if(!cleaned||!prefix)return null;const candidates=exactCandidates(cleaned);if(!candidates.length)return null;return{part:{raw,source:cleaned,query:normalize(cleaned),quantity:1,quantitySpecified:false,unitInfo:null,modifier:'',smart:false,literalName:true},candidates}}
  function parseAmount(value){const raw=String(value||'').trim(),cleaned=cleanNatural(raw);if(!cleaned||exactCandidates(cleaned).length)return null;const match=cleaned.match(AMOUNT_RE);if(!match)return null;const source=cleaned.slice(match[0].length).trim();if(!source)return null;const quantity=amountOf(match[1]);return{raw,source,query:normalize(source),quantity,quantitySpecified:true,unitInfo:UNIT_INFO[normalize(match[2])]||null,modifier:'',smart:true,invalidQuantity:!Number.isFinite(quantity)||quantity<=0}}
  function invalidPart(value){const direct=parseAmount(value);if(direct?.invalidQuantity)return direct;for(const segment of cleanNatural(value).split(SEGMENT_RE)){const part=parseAmount(segment);if(part?.invalidQuantity)return{...part,raw:String(value||'').trim()}}return null}
  function invalidRow(part){const name=part.source||'Menge',item={id:'__cutcoach_invalid_quantity__',name,amount:1,unit:part.unitInfo?.unit||'g',calories:0,protein:0,carbs:0,fat:0,source:'cutcoach',catalog:false};return{...part,query:'',unitInfo:null,parsedUnitInfo:part.unitInfo,directItem:item,directMatch:{item,matchType:'invalid-quantity',confidence:0,alternatives:[]},item,status:'review',matchType:'invalid-quantity',confidence:0,confidenceLabel:'Menge prüfen',corrected:'',alternatives:[],choices:[],factor:0,amountLabel:'Menge muss größer als 0 sein',incompatible:false,approximate:false,invalidQuantity:true}}
  function portionFor(part,item){
    const quantity=Number(part.quantity),itemInfo=canonicalItemUnit(item.unit),baseRaw=Number(item.amount),baseAmount=Math.max(.01,(Number.isFinite(baseRaw)&&baseRaw>0?baseRaw:1)*(itemInfo?.scale||1)),itemUnit=itemInfo?.unit||String(item.unit||'g'),info=part.unitInfo;
    if(!info){if(quantity>10&&(itemUnit==='g'||itemUnit==='ml'))return{factor:quantity/baseAmount,amountLabel:`${fmt(quantity)} ${itemUnit}`,incompatible:false,approximate:false};return{factor:quantity,amountLabel:part.literalName||part.sequenceBare?'':`${fmt(quantity)}×`,incompatible:false,approximate:false}}
    if(info.kind==='dimension'){const amount=quantity*Number(info.scale||1);if(itemUnit!==info.unit)return{factor:1,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:true,approximate:false};return{factor:amount/baseAmount,amountLabel:`${fmt(amount)} ${info.unit}`,incompatible:false,approximate:false}}
    if(info.kind==='count'&&itemUnit===info.unit)return{factor:quantity/baseAmount,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:false,approximate:false};
    return{factor:quantity,amountLabel:`${fmt(quantity)} ${info.label||''}`.trim(),incompatible:false,approximate:true};
  }
  function rowsFromCandidates(part,candidates){
    const choices=candidates.slice(0,6).map(record=>({item:record.item,label:labelFor(record),origin:record.origin,personalReason:''}));
    const top=candidates[0],second=candidates[1],topRank=(top.isName?24:0)+top.preference,secondRank=second?(second.isName?24:0)+second.preference:-100;
    if(second&&topRank-secondRank<4)return[{...part,directItem:null,directMatch:{item:null,matchType:part.literalName?'ambiguous-literal-name':'ambiguous-exact-whole',confidence:0,alternatives:choices.map(choice=>choice.item.name)},item:null,status:'ambiguous',matchType:part.literalName?'ambiguous-literal-name':'ambiguous-exact-whole',confidence:0,confidenceLabel:'',corrected:'',alternatives:choices.map(choice=>`${choice.label}: ${choice.item.name}`),choices,factor:1,amountLabel:'',incompatible:false,approximate:false}];
    const item=top.item,portion=portionFor(part,item),confidence=top.isName?100:97,baseType=part.literalName?'exact-literal':part.sequenceBare?'exact-sequence':'exact-whole',matchType=top.isName?`${baseType}-name`:`${baseType}-alias`,status=portion.incompatible?'incompatible':'matched';
    return[{...part,directItem:item,directMatch:{item,matchType,confidence,alternatives:choices.slice(1).map(choice=>choice.item.name)},item,status,matchType,confidence,confidenceLabel:confidence===100?'Exakt · 100%':`Sehr sicher · ${confidence}%`,corrected:'',alternatives:choices.slice(1).map(choice=>`${choice.label}: ${choice.item.name}`),choices:choices.slice(1),origin:top.origin,...portion}];
  }
  function protectedSingleRows(value){
    const literal=literalNameMatch(value);if(literal)return rowsFromCandidates(literal.part,literal.candidates);
    const invalid=invalidPart(value);if(invalid)return[invalidRow(invalid)];
    const part=parseAmount(value);if(!part)return null;const candidates=exactCandidates(part.source);if(!candidates.length)return null;
    return rowsFromCandidates(part,candidates);
  }
  function bareSequenceRows(value){
    const raw=String(value||'').trim(),source=cleanNatural(raw),candidates=exactCandidates(source);if(candidates.length){const part={raw,source,query:normalize(source),quantity:1,quantitySpecified:false,unitInfo:null,modifier:'',smart:true,sequenceBare:true};return rowsFromCandidates(part,candidates)}
    const probe=base?.rowsFor?.(`1 ${source}`)||[];if(probe.length!==1)return null;const row=probe[0];return[{...row,raw,quantity:1,quantitySpecified:false,unitInfo:null,factor:1,amountLabel:'',approximate:false,sequenceBare:true}];
  }
  function sequenceSegmentRows(value){return protectedSingleRows(value)||bareSequenceRows(value)}
  function protectedSequenceRows(value){
    const raw=cleanNatural(value);if(!raw)return null;
    const masked=raw.replace(/(\d),(?=\d)/g,'$1\uE000'),separators=[];SEQUENCE_SEPARATOR_RE.lastIndex=0;
    let match;while((match=SEQUENCE_SEPARATOR_RE.exec(masked)))separators.push({start:match.index,end:SEQUENCE_SEPARATOR_RE.lastIndex});
    if(!separators.length)return null;
    const memo=new Map();
    function solve(start){
      while(start<raw.length&&/\s/.test(raw[start]))start++;
      if(start>=raw.length)return[];
      if(memo.has(start))return memo.get(start);
      const choices=separators.filter(separator=>separator.start>=start).map(separator=>({end:separator.start,next:separator.end}));choices.push({end:raw.length,next:raw.length});choices.sort((a,b)=>b.end-a.end);
      for(const choice of choices){const segment=raw.slice(start,choice.end).trim();if(!segment)continue;const rows=sequenceSegmentRows(segment);if(!rows||rows.length!==1)continue;if(choice.next>=raw.length){memo.set(start,rows);return rows}const tail=solve(choice.next);if(tail){const result=[...rows,...tail];memo.set(start,result);return result}}
      memo.set(start,null);return null;
    }
    const result=solve(0);return result&&result.length>=2?result:null;
  }
  function protectedRows(value){return protectedSingleRows(value)}
  function rowsFor(value){return protectedSingleRows(value)||protectedSequenceRows(value)||base?.rowsFor?.(value)||[]}
  function parse(value){return protectedSingleRows(value)||protectedSequenceRows(value)||base?.parse?.(value)||[]}
  function indexStats(){buildIndex();return Object.freeze({keys:index.size,records:indexRecordCount,builtAt,origins:indexOrigins})}
  function attach(engine){if(!engine)return null;if(api)return api;base=engine;api=Object.freeze({...engine,exactWholeVersion:VERSION,exactWholeBuild:BUILD,rowsFor,parse,likelyMulti:value=>Boolean(protectedSingleRows(value))||Boolean(protectedSequenceRows(value))||Boolean(base.likelyMulti?.(value)),invalidateIndex,indexStats});global.CutCoachIntelligentSearch128=api;return api}
  global.addEventListener?.('cutcoach:catalog-updated',invalidateIndex);
  global.addEventListener?.('cutcoach:librarychange',invalidateIndex);
  global.document?.addEventListener?.('cutcoach:library-changed',invalidateIndex);
  global.CutCoachSearchExactWhole170=Object.freeze({version:VERSION,build:BUILD,attach,protectedRows,protectedSequenceRows,invalidateIndex,indexStats,cleanNatural,parseAmount,literalNameMatch});
})(window);
