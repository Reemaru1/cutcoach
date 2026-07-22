'use strict';
(function(){
  const VERSION='1.5.0-alpha';
  const BUILD='1.5.0-confidence';
  const SAFE_CONFIDENCE=90;
  const REVIEW_CONFIDENCE=72;
  if(window.CutCoachIntelligentSearch128)return;

  const DEBOUNCE_MS=180;
  const INDEX_TTL=30000;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const compact=value=>normalize(value).replace(/\s+/g,'');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const fmt=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value)||0);
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));

  const numberWords={ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,halb:.5,halbe:.5,halben:.5,halber:.5,anderthalb:1.5};
  const quantityTokens=new Set(Object.keys(numberWords));
  const UNIT_INFO=Object.freeze({
    g:{unit:'g',scale:1,label:'g',kind:'dimension'},gramm:{unit:'g',scale:1,label:'g',kind:'dimension'},kg:{unit:'g',scale:1000,label:'kg',kind:'dimension'},kilo:{unit:'g',scale:1000,label:'kg',kind:'dimension'},kilogramm:{unit:'g',scale:1000,label:'kg',kind:'dimension'},
    ml:{unit:'ml',scale:1,label:'ml',kind:'dimension'},milliliter:{unit:'ml',scale:1,label:'ml',kind:'dimension'},l:{unit:'ml',scale:1000,label:'l',kind:'dimension'},liter:{unit:'ml',scale:1000,label:'l',kind:'dimension'},
    stuck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},stueck:{unit:'Stück',scale:1,label:'Stück',kind:'count'},portion:{unit:'Portion',scale:1,label:'Portion',kind:'count'},portionen:{unit:'Portion',scale:1,label:'Portionen',kind:'count'},
    dose:{unit:null,scale:1,label:'Dose',kind:'serving'},dosen:{unit:null,scale:1,label:'Dosen',kind:'serving'},glas:{unit:null,scale:1,label:'Glas',kind:'serving'},glaser:{unit:null,scale:1,label:'Gläser',kind:'serving'},flasche:{unit:null,scale:1,label:'Flasche',kind:'serving'},flaschen:{unit:null,scale:1,label:'Flaschen',kind:'serving'},scheibe:{unit:null,scale:1,label:'Scheibe',kind:'serving'},scheiben:{unit:null,scale:1,label:'Scheiben',kind:'serving'},
    essloffel:{unit:null,scale:1,label:'EL',kind:'serving'},el:{unit:null,scale:1,label:'EL',kind:'serving'},teeloffel:{unit:null,scale:1,label:'TL',kind:'serving'},tl:{unit:null,scale:1,label:'TL',kind:'serving'},handvoll:{unit:null,scale:1,label:'Handvoll',kind:'serving'}
  });

  const FIXED={
    cola:{id:'cutcoach-standard-cola',name:'Cola',aliases:['Coca-Cola'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,fiber:0,sugar:35,saturatedFat:0,salt:.03},
    colazero:{id:'cutcoach-standard-cola-zero',name:'Cola Zero',aliases:['Coca-Cola Zero','Cola ohne Zucker'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:1,protein:0,carbs:0,fat:0,fiber:0,sugar:0,saturatedFat:0,salt:.07},
    ayran:{id:'cutcoach-standard-ayran',name:'Ayran',aliases:['Ayran Natur','Joghurtgetränk türkisch'],category:'Getränke',source:'cutcoach',catalog:true,amount:250,unit:'ml',calories:90,protein:4.5,carbs:7,fat:5,fiber:0,sugar:7,saturatedFat:3.2,salt:1.1},
    spezi:{id:'cutcoach-standard-spezi',name:'Spezi',aliases:['Cola-Orange-Mix'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:142,protein:0,carbs:35,fat:0,fiber:0,sugar:34,saturatedFat:0,salt:.03},
    ei:{id:'cutcoach-standard-ei',name:'Ei',aliases:['Hühnerei','gekochtes Ei'],category:'Ei',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:86,protein:7.5,carbs:.4,fat:6,fiber:0,sugar:.4,saturatedFat:1.8,salt:.18},
    banane:{id:'cutcoach-standard-banane',name:'Banane',aliases:['mittelgroße Banane'],category:'Obst',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:105,protein:1.3,carbs:27,fat:.4,fiber:3.1,sugar:14.4,saturatedFat:.1,salt:0},
    apfel:{id:'cutcoach-standard-apfel',name:'Apfel',aliases:['Äpfel','mittelgroßer Apfel'],category:'Obst',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:78,protein:.4,carbs:18,fat:.3,fiber:3,sugar:15,saturatedFat:0,salt:0},
    skyr:{id:'cutcoach-standard-skyr',name:'Skyr Natur',aliases:['Skyr','Natur Skyr'],category:'Milchprodukt',source:'cutcoach',catalog:true,amount:250,unit:'g',calories:160,protein:27.5,carbs:10,fat:.5,fiber:0,sugar:10,saturatedFat:.3,salt:.25},
    milch:{id:'cutcoach-standard-milch',name:'Milch 3,5 %',aliases:['Milch','Vollmilch'],category:'Getränke',source:'cutcoach',catalog:true,amount:250,unit:'ml',calories:160,protein:8.3,carbs:12,fat:9,fiber:0,sugar:12,saturatedFat:5.8,salt:.25},
    haferflocken:{id:'cutcoach-standard-haferflocken',name:'Haferflocken',aliases:['Oats','Hafer'],category:'Getreide',source:'cutcoach',catalog:true,amount:50,unit:'g',calories:185,protein:6.5,carbs:29,fat:3.5,fiber:5,sugar:.5,saturatedFat:.7,salt:.01},
    sucuk:{id:'cutcoach-standard-sucuk',name:'Sucuk',aliases:['Sucuk Wurst','Türkische Knoblauchwurst'],category:'Wurst',source:'cutcoach',catalog:true,amount:50,unit:'g',calories:225,protein:10,carbs:1,fat:20,fiber:0,sugar:.5,saturatedFat:8,salt:1.15},
    toast:{id:'cutcoach-standard-toast',name:'Toastbrot',aliases:['Toast','Weizentoast','Toastscheibe'],category:'Brot',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:80,protein:2.8,carbs:14.5,fat:1.1,fiber:1,sugar:1.5,saturatedFat:.2,salt:.35},
    brot:{id:'cutcoach-standard-brot',name:'Brot',aliases:['Brotscheibe','Mischbrot'],category:'Brot',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:115,protein:3.8,carbs:21,fat:1.4,fiber:2.8,sugar:1.2,saturatedFat:.2,salt:.55},
    kaese:{id:'cutcoach-standard-kaese',name:'Käse',aliases:['Käsescheibe','Schnittkäse'],category:'Milchprodukt',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:110,protein:7.5,carbs:.2,fat:9,fiber:0,sugar:.2,saturatedFat:5.8,salt:.55},
    butter:{id:'cutcoach-standard-butter',name:'Butter',aliases:['Butterportion'],category:'Fett',source:'cutcoach',catalog:true,amount:10,unit:'g',calories:74,protein:.1,carbs:.1,fat:8.2,fiber:0,sugar:.1,saturatedFat:5.1,salt:.01},
    tomate:{id:'cutcoach-standard-tomate',name:'Tomate',aliases:['Tomaten'],category:'Gemüse',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:22,protein:1.1,carbs:3.8,fat:.2,fiber:1.5,sugar:2.6,saturatedFat:0,salt:.01},
    gurke:{id:'cutcoach-standard-gurke',name:'Gurke',aliases:['Salatgurke','Gurken'],category:'Gemüse',source:'cutcoach',catalog:true,amount:100,unit:'g',calories:12,protein:.6,carbs:1.8,fat:.2,fiber:.9,sugar:1.7,saturatedFat:0,salt:.01},
    paprika:{id:'cutcoach-standard-paprika',name:'Paprika',aliases:['Paprikaschote'],category:'Gemüse',source:'cutcoach',catalog:true,amount:1,unit:'Stück',calories:45,protein:1.5,carbs:7,fat:.5,fiber:3,sugar:5,saturatedFat:.1,salt:.01},
    zwiebel:{id:'cutcoach-standard-zwiebel',name:'Zwiebel',aliases:['Zwiebeln'],category:'Gemüse',source:'cutcoach',catalog:true,amount:100,unit:'g',calories:40,protein:1.1,carbs:9,fat:.1,fiber:1.7,sugar:4.2,saturatedFat:0,salt:.01},
    reis:{id:'cutcoach-standard-reis',name:'Reis gekocht',aliases:['Reis','gekochter Reis'],category:'Beilage',source:'cutcoach',catalog:true,amount:200,unit:'g',calories:260,protein:5.2,carbs:56,fat:.6,fiber:1.2,sugar:.2,saturatedFat:.2,salt:.01},
    nudeln:{id:'cutcoach-standard-nudeln',name:'Nudeln gekocht',aliases:['Nudeln','Pasta gekocht'],category:'Beilage',source:'cutcoach',catalog:true,amount:200,unit:'g',calories:300,protein:10,carbs:60,fat:2,fiber:3,sugar:1,saturatedFat:.4,salt:.02},
    joghurt:{id:'cutcoach-standard-joghurt',name:'Naturjoghurt',aliases:['Joghurt','Joghurt Natur'],category:'Milchprodukt',source:'cutcoach',catalog:true,amount:200,unit:'g',calories:122,protein:7,carbs:9.4,fat:6.6,fiber:0,sugar:9.4,saturatedFat:4.2,salt:.2},
    ajvar:{id:'cutcoach-standard-ajvar',name:'Ajvar',aliases:['Paprikapaste'],category:'Sauce',source:'cutcoach',catalog:true,amount:30,unit:'g',calories:30,protein:.5,carbs:4,fat:1.2,fiber:1,sugar:2.5,saturatedFat:.2,salt:.4},
    honig:{id:'cutcoach-standard-honig',name:'Honig',aliases:['Bienenhonig'],category:'Aufstrich',source:'cutcoach',catalog:true,amount:20,unit:'g',calories:61,protein:0,carbs:16.5,fat:0,fiber:0,sugar:16.5,saturatedFat:0,salt:0},
    marmelade:{id:'cutcoach-standard-marmelade',name:'Marmelade',aliases:['Konfitüre'],category:'Aufstrich',source:'cutcoach',catalog:true,amount:20,unit:'g',calories:50,protein:.1,carbs:12.5,fat:0,fiber:.2,sugar:11,saturatedFat:0,salt:.01},
    kaesebrot:{id:'cutcoach-standard-kaesebrot',name:'Käsebrot',aliases:['Brot mit Käse'],category:'Brotzeit',source:'cutcoach',catalog:true,amount:90,unit:'g',calories:255,protein:12,carbs:26,fat:11,fiber:3,sugar:2,saturatedFat:7,salt:1.15}
  };

  const CATALOG_IDS={doener:'ccde:doner-kalb',dueruem:'ccde:durum-kalb',butterbreze:'ccde:butterbrezel',kaesesemmel:'ccde:kaesesemmel'};
  const ALIASES=new Map([
    ['cola','cola'],['coca cola','cola'],['cocacola','cola'],['cola zero','colazero'],['coca cola zero','colazero'],['cocacola zero','colazero'],['cola ohne zucker','colazero'],
    ['ayran','ayran'],['ayran natur','ayran'],['joghurtgetrank turkisch','ayran'],['turkisches joghurtgetrank','ayran'],['spezi','spezi'],['cola orange','spezi'],['cola mix','spezi'],
    ['ei','ei'],['eier','ei'],['huhnerei','ei'],['huehnerei','ei'],['banane','banane'],['bananen','banane'],['apfel','apfel'],['aepfel','apfel'],['skyr','skyr'],['skyr natur','skyr'],['natur skyr','skyr'],['milch','milch'],['vollmilch','milch'],['haferflocken','haferflocken'],['hafer','haferflocken'],['oats','haferflocken'],
    ['sucuk','sucuk'],['sucuk wurst','sucuk'],['sucukwurst','sucuk'],['turkische knoblauchwurst','sucuk'],['knoblauchwurst','sucuk'],
    ['toast','toast'],['toastbrot','toast'],['weizentoast','toast'],['toastscheibe','toast'],['toastscheiben','toast'],['toasties','toast'],
    ['brot','brot'],['brotscheibe','brot'],['brotscheiben','brot'],['mischbrot','brot'],['kase','kaese'],['kaese','kaese'],['kasescheibe','kaese'],['kaesescheibe','kaese'],['schnittkase','kaese'],['schnittkaese','kaese'],['butter','butter'],['butterportion','butter'],
    ['tomate','tomate'],['tomaten','tomate'],['gurke','gurke'],['gurken','gurke'],['salatgurke','gurke'],['paprika','paprika'],['paprikaschote','paprika'],['zwiebel','zwiebel'],['zwiebeln','zwiebel'],
    ['reis','reis'],['gekochter reis','reis'],['reis gekocht','reis'],['nudeln','nudeln'],['pasta gekocht','nudeln'],['gekochte nudeln','nudeln'],['joghurt','joghurt'],['naturjoghurt','joghurt'],['joghurt natur','joghurt'],['ajvar','ajvar'],['paprikapaste','ajvar'],['honig','honig'],['bienenhonig','honig'],['marmelade','marmelade'],['konfiture','marmelade'],['konfituere','marmelade'],
    ['doner','doener'],['doener','doener'],['kebab','doener'],['kebap','doener'],['durum','dueruem'],['dueruem','dueruem'],['yufka','dueruem'],
    ['butterbreze','butterbreze'],['butterbrezel','butterbreze'],['butterbrezn','butterbreze'],['kasesemmel','kaesesemmel'],['kaesesemmel','kaesesemmel'],['kase semmel','kaesesemmel'],['kasebrotchen','kaesesemmel'],['kasebrot','kaesebrot'],['kaesebrot','kaesebrot'],['brot mit kase','kaesebrot']
  ]);
  const COMPOUNDS=new Map([
    ['sucuktoast',['sucuk','toast']],['toastsucuk',['toast','sucuk']],['kaesetoast',['toast','kaese']],['kasetoast',['toast','kaese']],['buttertoast',['toast','butter']],['honigtoast',['toast','honig']],['marmeladentoast',['toast','marmelade']],['apfeljoghurt',['apfel','joghurt']]
  ]);

  const aliasPhrases=[...ALIASES.keys()].sort((a,b)=>b.split(' ').length-a.split(' ').length);
  const locked=new WeakSet();
  const SUPPRESSION_SELECTOR='[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state';
  let exactIndex=null,searchEntries=[],indexBuiltAt=0,timer=0,renderToken=0;

  const quantityOf=token=>{const numeric=Number(String(token||'').replace(',','.'));return Number.isFinite(numeric)&&numeric>0?numeric:numberWords[normalize(token)]||1};
  const isQuantity=token=>/^\d+(?:[.,]\d+)?$/.test(token)||quantityTokens.has(normalize(token));
  function cleanNatural(value){let text=String(value||'').trim();for(let index=0;index<5;index++)text=text.replace(/^(?:ich\s+(?:hatte|habe|hab|esse|trinke|aß|ass)\s+|(?:hab|hatte)\s+|zum\s+(?:frühstück|mittagessen|abendessen)\s+(?:gab\s+es\s+)?|als\s+snack\s+|bitte\s+|noch\s+|dazu\s+|heute\s+|etwas\s+|ein\s+bisschen\s+|bisschen\s+)/i,'').trim();return text.replace(/\s+(?:zum\s+(?:frühstück|mittagessen|abendessen)|als\s+snack|heute|gegessen|getrunken|gehabt)$/i,'').trim()}
  const keyFor=query=>ALIASES.get(normalize(query))||null;
  function itemForKey(key){if(FIXED[key])return FIXED[key];const id=CATALOG_IDS[key];return id?(window.CutCoachEverydayCatalog?.get?.(id)||window.CutCoachFoodCatalog?.get?.(id)||null):null}
  function invalidateIndex(){exactIndex=null;searchEntries=[];indexBuiltAt=0}

  function sourcePriority(item){if(item?.source==='user')return 6;if(item?.source==='cutcoach')return 4;if(item?.source==='bls')return 2;if(item?.source==='off')return 1;return 0}
  function preferenceScore(item){return sourcePriority(item)+Number(Boolean(item?.favorite))*8+Math.min(8,Math.floor(Math.max(0,Number(item?.uses)||0)/2))}
  function confidenceLabel(value){const score=Math.round(clamp(value,0,100));if(score>=98)return`Exakt · ${score}%`;if(score>=90)return`Sehr sicher · ${score}%`;if(score>=80)return`Wahrscheinlich · ${score}%`;if(score>=REVIEW_CONFIDENCE)return`Bitte prüfen · ${score}%`;return`Unsicher · ${score}%`}
  function confidenceClass(value){if(value>=90)return'high';if(value>=80)return'medium';return'low'}

  function buildExactIndex(){
    if(exactIndex&&Date.now()-indexBuiltAt<INDEX_TTL)return exactIndex;
    const map=new Map(),entries=[],seen=new Set(),items=[...Object.values(FIXED)];
    try{items.push(...(window.CutCoachLibrary?.exportData?.().items||[]))}catch{}
    try{items.push(...(window.CutCoachFoodCatalog?.items?.()||[]))}catch{}
    try{items.push(...(window.CutCoachEverydayCatalog?.items?.()||[]))}catch{}
    for(const item of items){
      if(!item?.name)continue;
      const itemId=String(item.id||item.name),nameKey=normalize(item.name),names=[item.name,...(Array.isArray(item.aliases)?item.aliases:[item.aliases])].filter(Boolean).map(normalize);
      for(const name of new Set(names)){
        if(!name)continue;
        const signature=`${itemId}:${name}`;
        if(seen.has(signature))continue;
        seen.add(signature);
        const entry={item,name,compact:compact(name),isName:name===nameKey,preference:preferenceScore(item)};
        if(!map.has(name))map.set(name,[]);
        map.get(name).push(entry);
        entries.push(entry);
      }
    }
    exactIndex=map;searchEntries=entries;indexBuiltAt=Date.now();return map;
  }

  function rankExactCandidates(candidates){
    return [...candidates].sort((a,b)=>(Number(b.isName)-Number(a.isName))||b.preference-a.preference||String(a.item.name).localeCompare(String(b.item.name),'de'));
  }
  function strictCatalogMatchInfo(query){
    const candidates=buildExactIndex().get(normalize(query))||[];
    if(!candidates.length)return null;
    const ranked=rankExactCandidates(candidates),top=ranked[0],second=ranked[1];
    if(!second)return{item:top.item,matchType:top.isName?'exact-name':'exact-alias',confidence:top.isName?100:97,matchedName:top.name,alternatives:[]};
    const topRank=(top.isName?20:0)+top.preference,secondRank=(second.isName?20:0)+second.preference,margin=topRank-secondRank;
    if(margin>=4)return{item:top.item,matchType:'ranked-exact',confidence:top.isName?96:93,matchedName:top.name,alternatives:ranked.slice(1,4).map(entry=>entry.item.name)};
    return{item:null,matchType:'ambiguous',confidence:0,matchedName:'',alternatives:ranked.slice(0,4).map(entry=>entry.item.name)};
  }
  function exactMatchInfo(query){
    const key=keyFor(query);
    if(key){const item=itemForKey(key);if(item)return{item,matchType:normalize(item.name)===normalize(query)?'exact-name':'exact-alias',confidence:normalize(item.name)===normalize(query)?100:99,matchedName:normalize(query),alternatives:[]}}
    return strictCatalogMatchInfo(query);
  }
  function distanceWithin(left,right,limit){if(left===right)return 0;if(Math.abs(left.length-right.length)>limit)return limit+1;let previous=Array.from({length:right.length+1},(_,index)=>index);for(let row=1;row<=left.length;row++){const current=[row];let best=row;for(let column=1;column<=right.length;column++){const value=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+Number(left[row-1]!==right[column-1]));current[column]=value;best=Math.min(best,value)}if(best>limit)return limit+1;previous=current}return previous[right.length]}
  function safeFuzzyMatchInfo(query){
    buildExactIndex();const q=compact(query);if(q.length<4||q.length>36)return null;
    const limit=q.length>=9?2:1,candidates=new Map();
    for(const entry of searchEntries){
      if(entry.compact[0]!==q[0]||Math.abs(entry.compact.length-q.length)>limit)continue;
      const distance=distanceWithin(q,entry.compact,limit);if(distance>limit)continue;
      const id=String(entry.item.id||entry.item.name),existing=candidates.get(id);
      if(!existing||distance<existing.distance||(distance===existing.distance&&entry.preference>existing.preference))candidates.set(id,{...entry,distance});
    }
    const ranked=[...candidates.values()].sort((a,b)=>a.distance-b.distance||b.preference-a.preference||Number(b.isName)-Number(a.isName)||String(a.item.name).localeCompare(String(b.item.name),'de'));
    if(!ranked.length||ranked[0].distance===0)return null;
    const top=ranked[0],second=ranked[1];
    if(second&&second.distance===top.distance&&Math.abs(top.preference-second.preference)<4)return{item:null,matchType:'ambiguous',confidence:0,matchedName:'',alternatives:ranked.slice(0,4).map(entry=>entry.item.name)};
    let confidence=top.distance===1?(q.length>=9?93:90):78;
    confidence+=Math.min(3,Math.floor(top.preference/6));
    if(!top.isName)confidence-=1;
    if(second&&second.distance===top.distance)confidence-=3;
    confidence=clamp(confidence,REVIEW_CONFIDENCE,94);
    return{item:top.item,matchType:'fuzzy',confidence,matchedName:top.name,alternatives:ranked.slice(1,4).map(entry=>entry.item.name),distance:top.distance};
  }

  function amountPrefix(source){return String(source||'').match(/^(\d+(?:[.,]\d+)?|halb(?:e|en|er|es)?|anderthalb|ein(?:e|en|er|es)?|eins|zwei|drei|vier|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn)\s*(kg|kilogramm|kilo|g|gramm|ml|milliliter|l|liter|st(?:ü|ue)ck|portion(?:en)?|dose(?:n)?|glas|gl(?:ä|ae)ser|flasche(?:n)?|scheibe(?:n)?|essl(?:ö|oe)ffel|el|teel(?:ö|oe)ffel|tl|handvoll)?\b\s*/i)}
  function parsePart(raw){
    let source=cleanNatural(raw),quantity=1,quantitySpecified=false,unitInfo=null,modifier='';
    const amountMatch=amountPrefix(source);
    if(amountMatch){quantity=quantityOf(amountMatch[1]);quantitySpecified=true;unitInfo=UNIT_INFO[normalize(amountMatch[2])]||null;source=source.slice(amountMatch[0].length).trim()}
    source=source.replace(/^(?:der|die|das|von|vom|etwas|ein\s+bisschen|bisschen)\s+/i,'').trim();
    let directMatch=exactMatchInfo(source),directItem=directMatch?.item||null;
    if(!directItem){const modifierMatch=source.match(/\s+ohne\s+(.+)$/i);if(modifierMatch){modifier=modifierMatch[1].trim();source=source.slice(0,modifierMatch.index).trim();directMatch=exactMatchInfo(source);directItem=directMatch?.item||null}}
    return{raw:String(raw||'').trim(),query:normalize(source),quantity,quantitySpecified,unitInfo,modifier,smart:quantitySpecified||Boolean(modifier),directItem,directMatch:directMatch||null};
  }
  function portionFor(part,item){if(!part.quantitySpecified)return{factor:1,amountLabel:'',incompatible:false,approximate:false};const quantity=Math.max(.01,Number(part.quantity)||1),base=Math.max(.01,Number(item.amount)||1),itemUnit=String(item.unit||'g'),info=part.unitInfo;if(!info){if(quantity>10&&(itemUnit==='g'||itemUnit==='ml'))return{factor:quantity/base,amountLabel:`${fmt(quantity)} ${itemUnit}`,incompatible:false,approximate:false};return{factor:quantity,amountLabel:`${fmt(quantity)}×`,incompatible:false,approximate:false}}if(info.kind==='dimension'){const amount=quantity*info.scale;if(itemUnit!==info.unit)return{factor:1,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:true,approximate:false};return{factor:amount/base,amountLabel:`${fmt(amount)} ${info.unit}`,incompatible:false,approximate:false}}if(info.kind==='count'&&itemUnit===info.unit)return{factor:quantity/base,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:false,approximate:false};return{factor:quantity,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:false,approximate:true}}
  function resolvePart(part){
    let match=part.directMatch||exactMatchInfo(part.query);
    if(!match?.item&&match?.matchType!=='ambiguous')match=safeFuzzyMatchInfo(part.query);
    const item=match?.item||null,portion=item?portionFor(part,item):{factor:1,amountLabel:'',incompatible:false,approximate:false},confidence=item?clamp(match.confidence,0,100):0;
    let status='missing';
    if(match?.matchType==='ambiguous')status='ambiguous';
    else if(item&&portion.incompatible)status='incompatible';
    else if(item&&confidence>=SAFE_CONFIDENCE)status='matched';
    else if(item&&confidence>=REVIEW_CONFIDENCE)status='review';
    return{...part,item,status,matchType:match?.matchType||'none',confidence,confidenceLabel:item?confidenceLabel(confidence):'',corrected:item&&match?.matchType==='fuzzy'?item.name:'',alternatives:match?.alternatives||[],...portion};
  }

  const CONNECTOR_RE=/\s+(?:mit|auf|zu|dazu|neben|zusammen\s+mit)\s+|\s*\/\s*/i;
  function expandWith(raw){const whole=parsePart(raw),wholeRow=resolvePart(whole);if(wholeRow.item&&wholeRow.matchType!=='fuzzy')return[whole];if(!CONNECTOR_RE.test(String(raw||'')))return[whole];const parts=String(raw||'').split(CONNECTOR_RE).map(parsePart).filter(part=>part.query.length>=2);if(parts.length<2||parts.length>5)return[whole];const resolved=parts.map(resolvePart),recognized=resolved.filter(row=>row.item||row.status==='ambiguous').length;return recognized>=1?parts:[whole]}
  function parseCompound(value){const part=parsePart(value);if(part.directItem)return[];const keys=COMPOUNDS.get(compact(part.query));if(!keys)return[];return keys.map((key,index)=>{const item=itemForKey(key),match=item?{item,matchType:'compound',confidence:96,matchedName:key,alternatives:[]}:null;return{raw:index===0?part.raw:key,query:key,quantity:part.quantity,quantitySpecified:part.quantitySpecified,unitInfo:index===0?part.unitInfo:null,modifier:'',smart:true,directItem:item,directMatch:match}})}
  function parseSequential(value){const text=normalize(cleanNatural(value)),tokens=text.split(' ').filter(Boolean),rows=[];let index=0;while(index<tokens.length){let quantity=1,quantitySpecified=false,unitInfo=null;const start=index;if(isQuantity(tokens[index])){quantity=quantityOf(tokens[index]);quantitySpecified=true;index++}const unitCandidate=UNIT_INFO[tokens[index]];if(quantitySpecified&&unitCandidate){unitInfo=unitCandidate;index++}let matched=null;for(const phrase of aliasPhrases){const words=phrase.split(' ');if(tokens.slice(index,index+words.length).join(' ')===phrase){matched={phrase,key:ALIASES.get(phrase),length:words.length};break}}if(!matched)return[];const item=itemForKey(matched.key),match=item?{item,matchType:'exact-alias',confidence:99,matchedName:matched.phrase,alternatives:[]}:null;rows.push({raw:tokens.slice(start,index+matched.length).join(' '),query:matched.phrase,quantity,quantitySpecified,unitInfo,modifier:'',smart:quantitySpecified,directItem:item,directMatch:match});index+=matched.length}return rows.length>=2?rows:[]}
  function parse(value){const whole=parsePart(value),wholeRow=resolvePart(whole),cleaned=normalize(cleanNatural(value));if(wholeRow.item&&!whole.smart&&wholeRow.matchType!=='fuzzy'&&whole.query===cleaned)return[];const compound=parseCompound(value);if(compound.length>=2)return compound;const strong=String(value||'').split(/\s+(?:und|plus|sowie|mit\s+dazu|dazu|zusammen\s+mit|außerdem|ausserdem)\s+|\s*[,;+&]\s*/i).filter(Boolean);if(strong.length>=2){const expanded=strong.flatMap(expandWith).filter(part=>part.query.length>=2);if(expanded.length>=2)return expanded}const withParts=expandWith(value);if(withParts.length>=2)return withParts;const sequential=parseSequential(value);if(sequential.length>=2)return sequential;if(wholeRow.item&&(whole.smart||wholeRow.matchType==='fuzzy'))return[whole];if(whole.smart)return[whole];return[]}
  function rowsFor(value){return parse(value).map(resolvePart)}
  function likelyMulti(value){const raw=String(value||''),part=parsePart(raw);if(part.directItem&&!part.smart)return false;if(part.smart)return true;if(COMPOUNDS.has(compact(part.query)))return true;if(/\s+(?:und|plus|sowie|mit\s+dazu|dazu|zusammen\s+mit|außerdem|ausserdem)\s+|[,;+&]/i.test(raw))return true;if(CONNECTOR_RE.test(raw))return parse(raw).length>=2;const tokens=normalize(cleanNatural(raw)).split(' ').filter(Boolean);let recognized=0;for(let index=0;index<tokens.length;index++){if(isQuantity(tokens[index])||UNIT_INFO[tokens[index]])continue;for(const phrase of aliasPhrases){const words=phrase.split(' ');if(tokens.slice(index,index+words.length).join(' ')===phrase){recognized++;index+=words.length-1;break}}}return recognized>=2}

  function add(row){if(!row.item||row.incompatible||row.status!=='matched')return false;try{return Boolean(window.CutCoachLibrary?.addCatalogItemToDay?.(row.item,{type:document.body.dataset.nutritionMealType||'Frühstück',dateKey:typeof selectedDate==='string'?selectedDate:undefined,factor:row.factor}))}catch{return false}}
  function host(){let node=document.querySelector('#nutritionMultiSearch');if(node){node.classList.add('nutrition-multi-search','intelligent-search');return node}const card=document.querySelector('.nutrition-search-card');if(!card)return null;node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search intelligent-search';card.after(node);return node}
  function suppressNormalResults(active){document.body.classList.toggle('canonical-multisearch-active',active);if(active){for(const node of document.querySelectorAll(SUPPRESSION_SELECTOR)){if(node.dataset.cutcoachCanonicalSuppressed!=='1'){node.dataset.cutcoachCanonicalSuppressed='1';node.dataset.cutcoachCanonicalWasHidden=node.hidden?'1':'0'}node.hidden=true}return}for(const node of document.querySelectorAll('[data-cutcoach-canonical-suppressed="1"]')){node.hidden=node.dataset.cutcoachCanonicalWasHidden==='1';delete node.dataset.cutcoachCanonicalSuppressed;delete node.dataset.cutcoachCanonicalWasHidden}}
  function clearResult(){const node=document.querySelector('#nutritionMultiSearch');if(node?.dataset.canonical==='1'){node.hidden=true;node.replaceChildren();delete node.dataset.canonical;delete node.dataset.query;delete node._canonicalRows}suppressNormalResults(false)}
  function rowNotes(row){const notes=[];if(row.item)notes.push(`<span class="nutrition-confidence ${confidenceClass(row.confidence)}" title="Vertrauensbewertung der Suche">${escapeHtml(row.confidenceLabel)}</span>`);if(row.corrected)notes.push(`<em>Meintest du „${escapeHtml(row.corrected)}“?</em>`);if(row.amountLabel)notes.push(`<em>${escapeHtml(row.amountLabel)}${row.approximate?' · geschätzt':''}</em>`);if(row.modifier)notes.push(`<em>ohne ${escapeHtml(row.modifier)} · Nährwerte bleiben Richtwert</em>`);return notes.join('')}
  function alternativesText(row){return row.alternatives?.length?`Möglich: ${row.alternatives.slice(0,3).join(', ')}`:'Begriff einzeln prüfen'}
  function renderRow(row,index){
    if(row.status==='matched')return`<article class="matched confidence-${confidenceClass(row.confidence)}"><span>✓</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}</div><button type="button" data-canonical-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen">＋</button></article>`;
    if(row.status==='review')return`<article class="review confidence-${confidenceClass(row.confidence)}"><span>≈</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}<em>Vor dem Eintragen prüfen</em></div><button type="button" data-canonical-search="${index}" aria-label="${escapeHtml(row.item.name)} prüfen">Prüfen</button></article>`;
    if(row.status==='incompatible')return`<article class="missing"><span>!</span><div><small>${escapeHtml(row.raw)}</small><b>Einheit passt nicht zu ${escapeHtml(row.item.name)}</b><em>${escapeHtml(row.amountLabel)} kann nicht sicher umgerechnet werden</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='ambiguous')return`<article class="missing ambiguous"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Mehrere gleich starke Treffer</b><em>${escapeHtml(alternativesText(row))}</em></div><button type="button" data-canonical-search="${index}">Auswählen</button></article>`;
    return`<article class="missing"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Kein sicherer Treffer</b><em>Begriff einzeln prüfen</em></div><button type="button" data-canonical-search="${index}" aria-label="${escapeHtml(row.query)} einzeln suchen">Suchen</button></article>`;
  }
  function render(input,token=++renderToken){if(!input||token!==renderToken)return false;const query=normalize(input.value),rows=rowsFor(input.value),node=host();if(!node)return false;if(!rows.length){clearResult();return false}const complete=rows.every(row=>row.status==='matched'),single=rows.length===1,safeCount=rows.filter(row=>row.status==='matched').length,reviewCount=rows.filter(row=>row.status==='review').length;node.dataset.canonical='1';node.dataset.query=query;node.hidden=false;node._canonicalRows=rows;suppressNormalResults(true);const title=single?(complete?'1 sicherer Treffer':reviewCount?'1 Treffer zum Prüfen':'1 Begriff prüfen'):complete?`${rows.length} sichere Bestandteile`:`${safeCount} sicher${reviewCount?` · ${reviewCount} prüfen`:''}`;node.innerHTML=`<div class="nutrition-multi-head"><div><small>Intelligente Suche</small><b>${title}</b></div><button type="button" data-canonical-all ${complete?'':'disabled'}>${single&&complete?'Hinzufügen':complete?'Alle hinzufügen':'Auswahl prüfen'}</button></div><div class="nutrition-multi-list">${rows.map(renderRow).join('')}</div>`;return true}
  function schedule(input){clearTimeout(timer);const token=++renderToken;timer=setTimeout(()=>{if(input?.isConnected)render(input,token)},DEBOUNCE_MS)}
  function switchToSingle(row){const input=document.querySelector('#nutritionSearch');if(!input||!row)return;clearTimeout(timer);renderToken++;clearResult();const replacement=row.item?.name||row.query;input.value=replacement;try{input.focus({preventScroll:true})}catch{input.focus()}input.setSelectionRange?.(input.value.length,input.value.length);const inputEvent=typeof InputEvent==='function'?new InputEvent('input',{bubbles:true,inputType:'insertReplacementText',data:replacement}):new Event('input',{bubbles:true});input.dispatchEvent(inputEvent);input.dispatchEvent(new Event('change',{bubbles:true}))}
  function invalidateAndRefresh(){invalidateIndex();const input=document.querySelector('#nutritionSearch');if(!input)return;if(likelyMulti(input.value)){clearTimeout(timer);render(input)}else clearResult()}

  document.addEventListener('compositionstart',event=>{if(event.target?.id==='nutritionSearch')event.target.dataset.composing='1'},true);
  document.addEventListener('compositionend',event=>{if(event.target?.id!=='nutritionSearch')return;delete event.target.dataset.composing;if(likelyMulti(event.target.value))schedule(event.target);else{clearTimeout(timer);renderToken++;clearResult()}},true);
  document.addEventListener('input',event=>{if(event.target?.id!=='nutritionSearch'||event.target.dataset.composing==='1'||event.target.dataset.voicePreview==='1')return;if(!likelyMulti(event.target.value)){clearTimeout(timer);renderToken++;clearResult();return}event.preventDefault();event.stopImmediatePropagation();schedule(event.target)},true);
  document.addEventListener('keydown',event=>{if(event.target?.id!=='nutritionSearch')return;if(event.key==='Escape'){event.target.value='';clearTimeout(timer);renderToken++;clearResult();event.target.blur();return}if(event.key==='Enter'&&rowsFor(event.target.value).length){event.preventDefault();event.stopImmediatePropagation();clearTimeout(timer);render(event.target)}},true);
  document.addEventListener('click',event=>{const node=event.target.closest?.('#nutritionMultiSearch');if(!node?._canonicalRows||node.dataset.canonical!=='1')return;const input=document.querySelector('#nutritionSearch');if(!input||normalize(input.value)!==node.dataset.query){clearResult();return}const one=event.target.closest('[data-canonical-add]'),all=event.target.closest('[data-canonical-all]'),search=event.target.closest('[data-canonical-search]');if(search){event.preventDefault();event.stopImmediatePropagation();switchToSingle(node._canonicalRows[Number(search.dataset.canonicalSearch)]);return}if(!one&&!all)return;const rows=node._canonicalRows;if(all&&rows.some(row=>row.status!=='matched')){event.preventDefault();event.stopImmediatePropagation();return}const button=one||all;if(locked.has(button))return;event.preventDefault();event.stopImmediatePropagation();locked.add(button);button.disabled=true;button.setAttribute('aria-busy','true');let count=0;if(one){const row=rows[Number(one.dataset.canonicalAdd)];if(row&&add(row)){count=1;one.textContent='✓'}else one.disabled=false}else{for(const row of rows)if(add(row))count++;if(count===rows.length)all.textContent='Hinzugefügt';else if(count){all.textContent=`${count}/${rows.length} hinzugefügt`}else{all.textContent='Erneut versuchen';all.disabled=false}}button.removeAttribute('aria-busy');setTimeout(()=>locked.delete(button),700);if(count){window.render?.();if(all&&count<rows.length)toast?.(`${count} von ${rows.length} Lebensmittel hinzugefügt.`);else toast?.(count===1?'Lebensmittel hinzugefügt.':`${count} Lebensmittel hinzugefügt.`);if(all){input.value='';input.blur();clearResult()}}else if(all)toast?.('Lebensmittel konnten nicht hinzugefügt werden.')},true);
  document.addEventListener('click',event=>{if(event.target.closest?.('.nutrition-tabs button,#nutritionBack,#nutritionDone')){clearTimeout(timer);renderToken++;clearResult()}},true);

  const initial=()=>{const input=document.querySelector('#nutritionSearch');if(input&&likelyMulti(input.value))schedule(input)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initial,{once:true});else queueMicrotask(initial);
  window.addEventListener('cutcoach:catalog-updated',invalidateAndRefresh);
  window.addEventListener('cutcoach:librarychange',invalidateAndRefresh);
  document.addEventListener('cutcoach:library-changed',invalidateAndRefresh);

  window.CutCoachIntelligentSearch128=Object.freeze({
    version:VERSION,build:BUILD,runtimeMode:'single-engine',
    thresholds:Object.freeze({safe:SAFE_CONFIDENCE,review:REVIEW_CONFIDENCE}),
    parse,rowsFor,render,likelyMulti,invalidateIndex,
    score:value=>Object.freeze(rowsFor(value).map(row=>Object.freeze({query:row.query,name:row.item?.name||null,status:row.status,confidence:row.confidence,matchType:row.matchType,alternatives:Object.freeze([...(row.alternatives||[])])})))
  });
})();
