'use strict';
(function(global){
  const VERSION='1.7.0-alpha';
  const BUILD='1.7.0-exact-whole-protection';
  const INDEX_TTL=30000;
  if(global.CutCoachSearchExactWhole170)return;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const fmt=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value)||0);
  const NUMBER_WORDS=Object.freeze({ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,halb:.5,halbe:.5,halben:.5,halber:.5,anderthalb:1.5});
  const UNIT_INFO=Object.freeze({
    g:{unit:'g',scale:1,label:'g',kind:'dimension'},gramm:{unit:'g',scale:1,label:'g',kind:'dimension'},kg:{unit:'g',scale:1000,label:'kg',kind:'dimension'},kilo:{unit:'g',scale:1000,label:'kg',kind:'dimension'},kilogramm:{unit:'g',scale:1000,label:'kg',kind:'dimension'},
    ml:{unit:'ml',scale:1,label:'ml',kind:'dimension'},milliliter:{unit:'ml',scale:1,label:'ml',kind:'dimension'},l:{unit:'ml',scale:1000,label:'l',kind:'dimension'},liter:{unit:'ml',scale:1000,label:'l',kind:'dimension'},
    stuck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stueck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},portion:{unit:'Portion',scale:1,label:'Portion',kind:'count'},portionen:{unit:'Portion',scale:1,label:'Portionen',kind:'count'},
    dose:{unit:null,scale:1,label:'Dose',kind:'serving'},dosen:{unit:null,scale:1,label:'Dosen',kind:'serving'},glas:{unit:null,scale:1,label:'Glas',kind:'serving'},glaser:{unit:null,scale:1,label:'Gläser',kind:'serving'},flasche:{unit:null,scale:1,label:'Flasche',kind:'serving'},flaschen:{unit:null,scale:1,label:'Flaschen',kind:'serving'},scheibe:{unit:null,scale:1,label:'Scheibe',kind:'serving'},scheiben:{unit:null,scale:1,label:'Scheiben',kind:'serving'},
    essloffel:{unit:null,scale:1,label:'EL',kind:'serving'},el:{unit:null,scale:1,label:'EL',kind:'serving'},teeloffel:{unit:null,scale:1,label:'TL',kind:'serving'},tl:{unit:null,scale:1,label:'TL',kind:'serving'},handvoll:{unit:null,scale:1,label:'Handvoll',kind:'serving'}
  });
  const AMOUNT_RE=/^(\d+(?:[.,]\d+)?|halb(?:e|en|er|es)?|anderthalb|ein(?:e|en|er|es)?|eins|zwei|drei|vier|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn)\s*(kg|kilogramm|kilo|g|gramm|ml|milliliter|l|liter|st(?:ü|ue)ck|portion(?:en)?|dose(?:n)?|glas|gl(?:ä|ae)ser|flasche(?:n)?|scheibe(?:n)?|essl(?:ö|oe)ffel|el|teel(?:ö|oe)ffel|tl|handvoll)?\b\s*/i;

  let base=null,api=null,index=new Map(),builtAt=0,indexRecordCount=0;
  const sourceWeight=item=>item?.source==='user'?14:item?.source==='cutcoach'?8:item?.source==='bls'?4:item?.source==='off'?2:0;
  const preference=item=>sourceWeight(item)+Number(Boolean(item?.favorite))*8+Math.min(8,Math.floor(Math.max(0,Number(item?.uses)||0)/2));
  const labelFor=item=>item?.source==='user'?'Eigene':item?.source==='cutcoach'?'Standard':item?.source==='bls'?'BLS':item?.source==='off'?'Produkt':'Katalog';
  function invalidateIndex(){index=new Map();builtAt=0;indexRecordCount=0}
  function buildIndex(){
    if(index.size&&Date.now()-builtAt<INDEX_TTL)return index;
    const map=new Map(),seen=new Set();let recordCount=0;
    const push=items=>{for(const item of items||[]){if(!item?.name)continue;const id=String(item.id||item.name),canonical=normalize(item.name);for(const name of new Set([item.name,...(Array.isArray(item.aliases)?item.aliases:[item.aliases])].filter(Boolean).map(normalize))){if(!name)continue;const signature=`${id}:${name}`;if(seen.has(signature))continue;seen.add(signature);const records=map.get(name)||[];records.push({item,id,name,isName:name===canonical,preference:preference(item)});map.set(name,records);recordCount++}}};
    try{push(global.CutCoachLibrary?.exportData?.().items||[])}catch{}
    try{push(global.CutCoachFoodCatalog?.items?.()||[])}catch{}
    try{push(global.CutCoachEverydayCatalog?.items?.()||[])}catch{}
    index=map;indexRecordCount=recordCount;builtAt=Date.now();return index;
  }
  function amountOf(token){const numeric=Number(String(token||'').replace(',','.'));return Number.isFinite(numeric)&&numeric>0?numeric:NUMBER_WORDS[normalize(token)]||1}
  function parseAmount(value){
    const raw=String(value||'').trim(),match=raw.match(AMOUNT_RE);if(!match)return null;
    const source=raw.slice(match[0].length).trim();if(!source)return null;
    return{raw,source,query:normalize(source),quantity:amountOf(match[1]),quantitySpecified:true,unitInfo:UNIT_INFO[normalize(match[2])]||null,modifier:'',smart:true};
  }
  function exactCandidates(query){
    const q=normalize(query),dedup=new Map();if(!q)return[];
    for(const record of buildIndex().get(q)||[]){const previous=dedup.get(record.id);if(!previous||record.isName&&!previous.isName||record.preference>previous.preference)dedup.set(record.id,record)}
    return[...dedup.values()].sort((a,b)=>(Number(b.isName)-Number(a.isName))||b.preference-a.preference||String(a.item.name).localeCompare(String(b.item.name),'de'));
  }
  function portionFor(part,item){
    const quantity=Math.max(.01,Number(part.quantity)||1),baseAmount=Math.max(.01,Number(item.amount)||1),itemUnit=String(item.unit||'g'),info=part.unitInfo;
    if(!info){if(quantity>10&&(itemUnit==='g'||itemUnit==='ml'))return{factor:quantity/baseAmount,amountLabel:`${fmt(quantity)} ${itemUnit}`,incompatible:false,approximate:false};return{factor:quantity,amountLabel:`${fmt(quantity)}×`,incompatible:false,approximate:false}}
    if(info.kind==='dimension'){const amount=quantity*Number(info.scale||1);if(itemUnit!==info.unit)return{factor:1,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:true,approximate:false};return{factor:amount/baseAmount,amountLabel:`${fmt(amount)} ${info.unit}`,incompatible:false,approximate:false}}
    if(info.kind==='count'&&itemUnit===info.unit)return{factor:quantity/baseAmount,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:false,approximate:false};
    return{factor:quantity,amountLabel:`${fmt(quantity)} ${info.label||''}`.trim(),incompatible:false,approximate:true};
  }
  function protectedRows(value){
    const part=parseAmount(value);if(!part)return null;const candidates=exactCandidates(part.source);if(!candidates.length)return null;
    const choices=candidates.slice(0,6).map(record=>({item:record.item,label:labelFor(record.item),origin:record.item?.source==='user'?'library':'catalog',personalReason:''}));
    const top=candidates[0],second=candidates[1],topRank=(top.isName?24:0)+top.preference,secondRank=second?(second.isName?24:0)+second.preference:-100;
    if(second&&topRank-secondRank<4)return[{...part,directItem:null,directMatch:{item:null,matchType:'ambiguous-exact-whole',confidence:0,alternatives:choices.map(choice=>choice.item.name)},item:null,status:'ambiguous',matchType:'ambiguous-exact-whole',confidence:0,confidenceLabel:'',corrected:'',alternatives:choices.map(choice=>`${choice.label}: ${choice.item.name}`),choices,factor:1,amountLabel:'',incompatible:false,approximate:false}];
    const item=top.item,portion=portionFor(part,item),confidence=top.isName?100:97,status=portion.incompatible?'incompatible':'matched';
    return[{...part,directItem:item,directMatch:{item,matchType:top.isName?'exact-whole-name':'exact-whole-alias',confidence,alternatives:choices.slice(1).map(choice=>choice.item.name)},item,status,matchType:top.isName?'exact-whole-name':'exact-whole-alias',confidence,confidenceLabel:confidence===100?'Exakt · 100%':`Sehr sicher · ${confidence}%`,corrected:'',alternatives:choices.slice(1).map(choice=>`${choice.label}: ${choice.item.name}`),choices:choices.slice(1),...portion}];
  }
  function rowsFor(value){return protectedRows(value)||base?.rowsFor?.(value)||[]}
  function parse(value){return protectedRows(value)||base?.parse?.(value)||[]}
  function indexStats(){buildIndex();return Object.freeze({keys:index.size,records:indexRecordCount,builtAt})}
  function attach(engine){
    if(!engine)return null;if(api)return api;base=engine;
    api=Object.freeze({...engine,exactWholeVersion:VERSION,exactWholeBuild:BUILD,rowsFor,parse,likelyMulti:value=>Boolean(protectedRows(value))||Boolean(base.likelyMulti?.(value)),invalidateIndex,indexStats});
    global.CutCoachIntelligentSearch128=api;return api;
  }
  global.addEventListener?.('cutcoach:catalog-updated',invalidateIndex);
  global.addEventListener?.('cutcoach:librarychange',invalidateIndex);
  global.document?.addEventListener?.('cutcoach:library-changed',invalidateIndex);
  global.CutCoachSearchExactWhole170=Object.freeze({version:VERSION,build:BUILD,attach,protectedRows,invalidateIndex,indexStats});
})(window);
