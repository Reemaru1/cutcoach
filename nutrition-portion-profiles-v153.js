'use strict';
(function(global){
  const VERSION='1.5.3-alpha';
  if(global.CutCoachPortionProfiles153)return;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const fmt=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value)||0);
  const MEASURES=Object.freeze({
    scheibe:'slice',scheiben:'slice',slice:'slice',
    el:'tablespoon',essloffel:'tablespoon',essloeffel:'tablespoon',tablespoon:'tablespoon',
    tl:'teaspoon',teeloffel:'teaspoon',teeloeffel:'teaspoon',teaspoon:'teaspoon',
    handvoll:'handful',hand:'handful',
    glas:'glass',glaser:'glass',glaeser:'glass',
    dose:'can',dosen:'can',
    flasche:'bottle',flaschen:'bottle',
    stuck:'piece',stueck:'piece',stucke:'piece',stuecke:'piece',
    portion:'portion',portionen:'portion'
  });
  const DISPLAY=Object.freeze({slice:['Scheibe','Scheiben'],tablespoon:['EL','EL'],teaspoon:['TL','TL'],handful:['Handvoll','Handvoll'],glass:['Glas','Gläser'],can:['Dose','Dosen'],bottle:['Flasche','Flaschen'],piece:['Stück','Stück'],portion:['Portion','Portionen']});

  const profile=(id,terms,measures,confidence=94)=>Object.freeze({id,terms:Object.freeze(terms.map(normalize)),measures:Object.freeze(measures),confidence});
  const PROFILES=Object.freeze([
    profile('toast',['toast','toastbrot','weizentoast','vollkorntoast'],{slice:{amount:25,unit:'g'}}),
    profile('bread',['brot','mischbrot','vollkornbrot','roggenbrot','weizenbrot'],{slice:{amount:50,unit:'g'}}),
    profile('roll',['brotchen','broetchen','semmel','brötchen'],{piece:{amount:65,unit:'g'}}),
    profile('flatbread',['fladenbrot','pita','wrap','tortilla'],{piece:{amount:80,unit:'g'},slice:{amount:40,unit:'g'}},91),
    profile('cheese',['kase','kaese','gouda','emmentaler','schnittkase','schnittkaese'],{slice:{amount:30,unit:'g'}}),
    profile('cold-cuts',['salami','schinken','putenbrust','aufschnitt','sucuk','wurst'],{slice:{amount:20,unit:'g'}}),
    profile('butter',['butter','margarine'],{tablespoon:{amount:15,unit:'g'},teaspoon:{amount:5,unit:'g'}}),
    profile('oil',['olivenol','olivenoel','rapsol','rapsoel','sonnenblumenol','sonnenblumenoel','speiseol','speiseoel','öl','oel'],{tablespoon:{amount:10,unit:'g'},teaspoon:{amount:5,unit:'g'}},96),
    profile('spread',['honig','marmelade','konfiture','konfituere','ajvar','nusscreme','erdnussbutter','aufstrich'],{tablespoon:{amount:20,unit:'g'},teaspoon:{amount:7,unit:'g'}}),
    profile('sauce',['ketchup','mayonnaise','mayo','senf','sauce','dressing','paste'],{tablespoon:{amount:15,unit:'g'},teaspoon:{amount:5,unit:'g'}},91),
    profile('oats',['haferflocken','muesli','musli','cornflakes','cerealien','flocken'],{tablespoon:{amount:10,unit:'g'},handful:{amount:30,unit:'g'}}),
    profile('nuts',['nuss','nusse','nuesse','mandel','mandeln','cashew','walnuss','walnusse','walnuesse','pistazie','pistazien','kerne','samen'],{tablespoon:{amount:10,unit:'g'},handful:{amount:30,unit:'g'}}),
    profile('dairy-spoon',['joghurt','naturjoghurt','skyr','quark','frischkase','frischkaese'],{tablespoon:{amount:20,unit:'g'},teaspoon:{amount:7,unit:'g'}}),
    profile('cooked-starch',['reis gekocht','nudeln gekocht','pasta gekocht','bulgur gekocht','couscous gekocht'],{tablespoon:{amount:20,unit:'g'},portion:{amount:200,unit:'g'}},91),
    profile('drink',['wasser','milch','ayran','cola','spezi','limonade','saft','eistee','kaffee','tee'],{glass:{amount:250,unit:'ml'},can:{amount:330,unit:'ml'},bottle:{amount:500,unit:'ml'}}),
    profile('apple',['apfel','aepfel'],{piece:{amount:150,unit:'g'}}),
    profile('banana',['banane','bananen'],{piece:{amount:120,unit:'g'}}),
    profile('orange',['orange','orangen'],{piece:{amount:180,unit:'g'}}),
    profile('pear',['birne','birnen'],{piece:{amount:160,unit:'g'}}),
    profile('kiwi',['kiwi','kiwis'],{piece:{amount:75,unit:'g'}}),
    profile('egg',['ei','eier','huhnerei','huehnerei'],{piece:{amount:60,unit:'g'}}),
    profile('tomato',['tomate','tomaten'],{piece:{amount:120,unit:'g'}}),
    profile('cucumber',['gurke','gurken','salatgurke'],{piece:{amount:350,unit:'g'}}),
    profile('pepper',['paprika','paprikaschote'],{piece:{amount:180,unit:'g'}}),
    profile('onion',['zwiebel','zwiebeln'],{piece:{amount:100,unit:'g'}}),
    profile('potato',['kartoffel','kartoffeln'],{piece:{amount:150,unit:'g'}}),
    profile('carrot',['karotte','karotten','mohre','moehre','mohren','moehren'],{piece:{amount:80,unit:'g'}}),
    profile('berries',['erdbeere','erdbeeren','himbeere','himbeeren','blaubeere','blaubeeren','beeren'],{handful:{amount:75,unit:'g'}}),
    profile('snacks',['chips','cracker','popcorn','salzstangen'],{handful:{amount:30,unit:'g'}},90)
  ]);

  function canonicalMeasure(value){return MEASURES[normalize(value)]||null}
  function namesOf(item){return[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[item?.aliases]),item?.category].filter(Boolean).map(normalize)}
  function textOf(item){return namesOf(item).join(' ')}
  function directMeasures(item){
    const source=item?.householdMeasures||item?.portions||item?.portionProfiles;
    if(!source||typeof source!=='object')return null;
    const map={};
    if(Array.isArray(source)){
      for(const entry of source){const key=canonicalMeasure(entry?.measure||entry?.name||entry?.label);const amount=Number(entry?.amount),unit=String(entry?.unit||item?.unit||'');if(key&&amount>0&&['g','ml','Stück','Portion'].includes(unit))map[key]={amount,unit,confidence:100,source:'item'};}
    }else{
      for(const [rawKey,entry] of Object.entries(source)){const key=canonicalMeasure(rawKey);const amount=Number(typeof entry==='number'?entry:entry?.amount),unit=String(typeof entry==='number'?(item?.unit||''):entry?.unit||item?.unit||'');if(key&&amount>0&&['g','ml','Stück','Portion'].includes(unit))map[key]={amount,unit,confidence:100,source:'item'};}
    }
    return Object.keys(map).length?map:null;
  }
  function profileFor(item,measure){
    const text=textOf(item),matches=[];
    for(const candidate of PROFILES){const definition=candidate.measures[measure];if(!definition)continue;let score=0;for(const term of candidate.terms){if(!term)continue;if(namesOf(item).includes(term))score=Math.max(score,4);else if(text.split(' ').includes(term))score=Math.max(score,3);else if(term.length>=4&&text.includes(term))score=Math.max(score,2);}if(score)matches.push({candidate,definition,score});}
    matches.sort((a,b)=>b.score-a.score||b.candidate.confidence-a.candidate.confidence);
    if(!matches.length)return null;
    const best=matches[0],second=matches[1];if(second&&second.score===best.score&&second.candidate.confidence===best.candidate.confidence&&second.candidate.id!==best.candidate.id)return null;
    return{...best.definition,confidence:best.candidate.confidence,source:`profile:${best.candidate.id}`};
  }
  function standardPortion(item,measure){
    const amount=Number(item?.amount),unit=String(item?.unit||'');if(!(amount>0))return null;
    if(measure==='portion'&&(unit==='Portion'||item?.basisLabel==='Standardportion'||/standardportion/i.test(String(item?.sourceLabel||''))))return{amount,unit,confidence:100,source:'item-basis'};
    if(measure==='piece'&&unit==='Stück')return{amount,unit,confidence:100,source:'item-basis'};
    if(measure==='portion'&&unit==='Portion')return{amount,unit,confidence:100,source:'item-basis'};
    return null;
  }
  function conservativeFallback(item,measure){
    const unit=String(item?.unit||'');
    if(unit==='ml'){
      if(measure==='glass')return{amount:250,unit:'ml',confidence:82,source:'fallback-liquid'};
      if(measure==='can')return{amount:330,unit:'ml',confidence:80,source:'fallback-liquid'};
      if(measure==='bottle')return{amount:500,unit:'ml',confidence:78,source:'fallback-liquid'};
    }
    return null;
  }
  function measureLabel(measure,quantity){const labels=DISPLAY[measure]||[measure,measure];return Number(quantity)===1?labels[0]:labels[1]}
  function result(item,measure,quantity,definition){
    const count=Math.max(.01,Number(quantity)||1),base=Math.max(.01,Number(item?.amount)||1),itemUnit=String(item?.unit||'g'),converted=count*Number(definition.amount),convertedUnit=String(definition.unit||itemUnit);
    if(!['g','ml','Stück','Portion'].includes(convertedUnit)||convertedUnit!==itemUnit)return{known:false,needsReview:true,confidence:0,measure,amountLabel:`${fmt(count)} ${measureLabel(measure,count)} · Einheit prüfen`,source:'unit-mismatch'};
    const approximate=definition.confidence<100,operator=approximate?'≈':'=';
    return{known:true,needsReview:definition.confidence<90,confidence:definition.confidence,measure,source:definition.source,approximate,factor:converted/base,convertedAmount:converted,convertedUnit,amountLabel:`${fmt(count)} ${measureLabel(measure,count)} ${operator} ${fmt(converted)} ${convertedUnit}`};
  }
  function resolve(item,measureValue,quantity=1){
    const measure=canonicalMeasure(measureValue);if(!item||!measure)return{known:false,needsReview:true,confidence:0,measure:null,amountLabel:''};
    const direct=directMeasures(item)?.[measure]||standardPortion(item,measure)||profileFor(item,measure)||conservativeFallback(item,measure);
    if(!direct)return{known:false,needsReview:true,confidence:0,measure,source:'unknown',approximate:true,factor:1,amountLabel:`${fmt(quantity)} ${measureLabel(measure,quantity)} · Menge prüfen`};
    return result(item,measure,quantity,direct);
  }

  global.CutCoachPortionProfiles153=Object.freeze({version:VERSION,resolve,canonicalMeasure,profiles:Object.freeze(PROFILES.map(entry=>entry.id))});
})(window);