'use strict';
(function(){
  const VERSION='1.5.2-alpha';
  const BUILD='1.5.2-generic-catalog-resolver';
  const loadedBeforeEngine=!window.CutCoachIntelligentSearch128;
  const INDEX_TTL=30000;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const fmt=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value)||0);
  const SUPPRESSION_SELECTOR='[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state';
  const IRREGULAR=Object.freeze({eier:'ei',aepfel:'apfel',apfeln:'apfel',haehnchen:'hahnchen',steaks:'steak',tomaten:'tomate',gurken:'gurke',zwiebeln:'zwiebel',kartoffeln:'kartoffel',nudeln:'nudel'});
  const LOCAL_ITEMS=Object.freeze([
    Object.freeze({id:'ccmeal:tantuni-durum',name:'Tantuni Dürüm',aliases:Object.freeze(['Tantuni','Mersin Tantuni','Tantuni Wrap','Tantuni mit Rindfleisch']),kind:'food',amount:350,unit:'g',calories:700,protein:38,carbs:72,fat:28,source:'cutcoach',catalog:true,estimated:true,sourceLabel:'CutCoach Standardgericht · durchschnittlicher Richtwert',category:'Türkisch'})
  ]);
  let base=null,api=null,timer=0,renderToken=0,rendering=false,fallbackObserver=null,catalogRecords=[],catalogBuiltAt=0;

  function sourceLabel(item,origin){
    if(origin==='library'||item?.source==='user')return'Eigene';
    if(item?.source==='off')return'Produkt';
    if(item?.source==='bls')return'BLS';
    if(item?.source==='cutcoach')return'Standard';
    return'Katalog';
  }
  function originWeight(origin){return origin==='library'?16:origin==='base'?8:origin==='everyday'?6:origin==='catalog'?4:0}
  function staticPreference(item,origin){return originWeight(origin)+Number(item?.source==='user')*8}
  function fallbackSignal(item){
    const uses=Math.max(0,Number(item?.uses)||0),favorite=Boolean(item?.favorite),score=(favorite?6:0)+Math.min(7,Math.floor(Math.log2(uses+1)*2));
    return Object.freeze({score,decisive:favorite||uses>=3,reason:uses>=3?'Häufig genutzt':favorite?'Favorit':'',uses,adds:0,choices:0,contextHits:0});
  }
  function personalSignal(item,origin,query){
    try{return window.CutCoachSearchLearning160?.signal?.(item,origin,query,document.body?.dataset?.nutritionMealType)||fallbackSignal(item)}catch{return fallbackSignal(item)}
  }
  function displayLabel(record){return`${sourceLabel(record.item,record.origin)}${record.personal?.reason?` · ${record.personal.reason}`:''}`}
  function namesOf(item){return[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[item?.aliases])].filter(Boolean).map(normalize)}
  function variants(word){
    const value=normalize(word),set=new Set([value]);
    if(IRREGULAR[value])set.add(IRREGULAR[value]);
    if(value.length>=5){
      if(value.endsWith('en'))set.add(value.slice(0,-2));
      if(value.endsWith('er'))set.add(value.slice(0,-2));
      if(value.endsWith('e'))set.add(value.slice(0,-1));
      if(value.endsWith('n'))set.add(value.slice(0,-1));
      if(value.endsWith('s'))set.add(value.slice(0,-1));
    }
    return set;
  }
  const tokenMatches=(queryToken,candidateToken)=>{
    const q=[...variants(queryToken)],c=[...variants(candidateToken)];
    if(q.some(left=>c.includes(left)))return 3;
    if(q.some(left=>left.length>=4&&c.some(right=>right.startsWith(left)||right.endsWith(left)||left.startsWith(right)||left.endsWith(right))))return 2;
    return 0;
  };
  function collectSources(){
    const records=[],push=(items,origin)=>{
      for(const item of items||[]){
        if(!item?.name)continue;
        const id=String(item.id||`${item.name}:${item.amount}:${item.unit}`),preference=staticPreference(item,origin);
        for(const name of new Set(namesOf(item)))records.push({item,id,origin,name,tokens:name.split(' ').filter(Boolean),staticPreference:preference,isName:name===normalize(item.name)});
      }
    };
    push(LOCAL_ITEMS,'base');
    try{push(window.CutCoachLibrary?.exportData?.().items||[],'library')}catch{}
    try{push(window.CutCoachFoodCatalog?.items?.()||[],'catalog')}catch{}
    try{push(window.CutCoachEverydayCatalog?.items?.()||[],'everyday')}catch{}
    return records;
  }
  function catalogIndex(){if(catalogRecords.length&&Date.now()-catalogBuiltAt<INDEX_TTL)return catalogRecords;catalogRecords=collectSources();catalogBuiltAt=Date.now();return catalogRecords}
  function invalidateCatalog(){catalogRecords=[];catalogBuiltAt=0}
  function decorate(record,query){const personal=personalSignal(record.item,record.origin,query);return{...record,personal,preference:record.staticPreference+Math.min(18,Number(personal?.score)||0)}}
  function collectExact(query,fallbackItem){
    const q=normalize(query);if(!q)return null;
    const records=catalogIndex().filter(record=>record.name===q).map(record=>decorate(record,q));
    if(fallbackItem&&namesOf(fallbackItem).includes(q))records.push(decorate({item:fallbackItem,id:String(fallbackItem.id||fallbackItem.name),origin:'base',name:q,tokens:q.split(' '),isName:normalize(fallbackItem.name)===q,staticPreference:staticPreference(fallbackItem,'base')},q));
    const dedup=new Map();for(const record of records){const existing=dedup.get(record.id);if(!existing||record.preference>existing.preference)dedup.set(record.id,record)}
    const ranked=[...dedup.values()].sort((a,b)=>(Number(b.isName)-Number(a.isName))||b.preference-a.preference||String(a.item.name).localeCompare(String(b.item.name),'de'));
    if(!ranked.length)return null;
    const top=ranked[0],second=ranked[1],topRank=(top.isName?24:0)+top.preference,secondRank=second?(second.isName?24:0)+second.preference:-100,margin=topRank-secondRank;
    const baseTopRank=(top.isName?24:0)+top.staticPreference,baseSecondRank=second?(second.isName?24:0)+second.staticPreference:-100,baseMargin=baseTopRank-baseSecondRank;
    const choices=ranked.slice(0,4).map(record=>({item:record.item,origin:record.origin,label:displayLabel(record),personalReason:record.personal?.reason||''}));
    if(second&&(margin<4||(baseMargin<4&&!top.personal?.decisive)))return{ambiguous:true,choices,matchType:'ambiguous-ranked'};
    return{ambiguous:false,item:top.item,origin:top.origin,isName:top.isName,confidence:second?(top.isName?97:94):(top.isName?100:98),choices:choices.slice(1),matchType:top.personal?.reason?'ranked-local-learning':'ranked-personal',personalReason:top.personal?.reason||''};
  }
  function genericScore(record,query){
    const q=normalize(query),queryTokens=q.split(' ').filter(Boolean);if(!q||!queryTokens.length)return 0;if(record.name===q)return 100;
    let total=0;
    for(const queryToken of queryTokens){let best=0;for(const candidateToken of record.tokens)best=Math.max(best,tokenMatches(queryToken,candidateToken));if(!best)return 0;total+=best}
    let score=total===queryTokens.length*3?92:84;
    if(record.name.startsWith(`${q} `)||record.name.endsWith(` ${q}`))score+=3;
    if(record.name.includes(q))score+=2;
    if(record.isName)score+=1;
    if(record.tokens.length===queryTokens.length)score+=2;
    return Math.min(96,score);
  }
  function collectGeneric(query){
    const q=normalize(query);if(q.length<3)return null;
    const byId=new Map();
    for(const sourceRecord of catalogIndex()){
      const score=genericScore(sourceRecord,q);if(score<82)continue;
      const record=decorate(sourceRecord,q),weighted=score+Math.min(3,Math.floor(record.staticPreference/8))+Math.min(4,Number(record.personal?.score)||0),existing=byId.get(record.id);
      if(!existing||weighted>existing.weighted)byId.set(record.id,{...record,score,weighted});
    }
    const ranked=[...byId.values()].sort((a,b)=>b.weighted-a.weighted||a.tokens.length-b.tokens.length||String(a.item.name).localeCompare(String(b.item.name),'de'));
    if(!ranked.length)return null;
    const top=ranked[0],second=ranked[1],choices=ranked.slice(0,4).map(record=>({item:record.item,origin:record.origin,label:displayLabel(record),personalReason:record.personal?.reason||''}));
    const margin=second?top.weighted-second.weighted:20;
    if(second&&margin<4)return{ambiguous:true,choices,matchType:'catalog-ambiguous'};
    const confidence=top.score>=92&&margin>=6?92:Math.max(78,Math.min(89,top.score));
    return{ambiguous:false,item:top.item,origin:top.origin,isName:false,confidence,choices:choices.slice(1),matchType:confidence>=90?(top.personal?.reason?'catalog-local-learning':'catalog-token'):'catalog-review',personalReason:top.personal?.reason||''};
  }
  function portionFor(row,item){
    if(!row?.quantitySpecified)return{factor:1,amountLabel:row?.amountLabel||'',incompatible:false,approximate:Boolean(row?.approximate)};
    const quantity=Math.max(.01,Number(row.quantity)||1),baseAmount=Math.max(.01,Number(item.amount)||1),itemUnit=String(item.unit||'g'),info=row.unitInfo||null;
    if(!info){if(quantity>10&&(itemUnit==='g'||itemUnit==='ml'))return{factor:quantity/baseAmount,amountLabel:`${fmt(quantity)} ${itemUnit}`,incompatible:false,approximate:false};return{factor:quantity,amountLabel:`${fmt(quantity)}×`,incompatible:false,approximate:false}}
    if(info.kind==='dimension'){const amount=quantity*Number(info.scale||1);if(itemUnit!==info.unit)return{factor:1,amountLabel:`${fmt(quantity)} ${info.label||''}`.trim(),incompatible:true,approximate:false};return{factor:amount/baseAmount,amountLabel:`${fmt(amount)} ${info.unit}`,incompatible:false,approximate:false}}
    if(info.kind==='count'&&itemUnit===info.unit)return{factor:quantity/baseAmount,amountLabel:`${fmt(quantity)} ${info.label}`,incompatible:false,approximate:false};
    return{factor:quantity,amountLabel:`${fmt(quantity)} ${info.label||''}`.trim(),incompatible:false,approximate:true};
  }
  function hardenRow(row){
    if(!row)return row;
    let ranked=collectExact(row.query,row.item);if(!ranked&&(!row.item||row.status==='missing'))ranked=collectGeneric(row.query);if(!ranked)return row;
    if(ranked.ambiguous)return{...row,item:null,status:'ambiguous',confidence:0,confidenceLabel:'',matchType:ranked.matchType||'ambiguous-ranked',alternatives:ranked.choices.map(choice=>`${choice.label}: ${choice.item.name}`),choices:ranked.choices,personalReason:''};
    const portion=portionFor(row,ranked.item),status=portion.incompatible?'incompatible':ranked.confidence>=90?'matched':'review';
    const label=ranked.confidence>=98?`Exakt · ${ranked.confidence}%`:ranked.confidence>=90?`Sehr sicher · ${ranked.confidence}%`:`Bitte prüfen · ${ranked.confidence}%`;
    return{...row,item:ranked.item,status,confidence:ranked.confidence,confidenceLabel:label,matchType:ranked.matchType||(row.item===ranked.item?row.matchType:'ranked-personal'),personalReason:ranked.personalReason||'',alternatives:ranked.choices.map(choice=>`${choice.label}: ${choice.item.name}`),choices:ranked.choices,...portion};
  }
  const hardenRows=rows=>Array.from(rows||[],hardenRow);
  function rowsFor(value){return base?hardenRows(base.rowsFor?.(value)||[]):[]}
  function directInspection(value){
    if(!base)return{handle:false,rows:[]};
    const direct=rowsFor(value);if(direct.length)return{handle:true,rows:direct};
    const text=String(value||'').trim();if(!text)return{handle:false,rows:[]};
    const probe=hardenRows(base.rowsFor?.(`1 ${text}`)||[]);
    if(probe.length===1&&(probe[0].status==='ambiguous'||probe[0].status==='review'||String(probe[0].matchType||'').startsWith('catalog-')||normalize(text)==='tantuni'))return{handle:true,rows:probe};
    return{handle:Boolean(base.likelyMulti?.(value)),rows:[]};
  }
  function suppressNormalResults(active){document.body.classList.toggle('canonical-multisearch-active',active);if(active){for(const node of document.querySelectorAll(SUPPRESSION_SELECTOR)){if(node.dataset.cutcoachCanonicalSuppressed!=='1'){node.dataset.cutcoachCanonicalSuppressed='1';node.dataset.cutcoachCanonicalWasHidden=node.hidden?'1':'0'}node.hidden=true}return}for(const node of document.querySelectorAll('[data-cutcoach-canonical-suppressed="1"]')){node.hidden=node.dataset.cutcoachCanonicalWasHidden==='1';delete node.dataset.cutcoachCanonicalSuppressed;delete node.dataset.cutcoachCanonicalWasHidden}}
  function host(){let node=document.querySelector('#nutritionMultiSearch');if(node)return node;const card=document.querySelector('.nutrition-search-card');if(!card)return null;node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search intelligent-search';card.after(node);return node}
  function confidenceClass(value){return value>=90?'high':value>=80?'medium':'low'}
  function rowNotes(row){const notes=[];if(row.item)notes.push(`<span class="nutrition-confidence ${confidenceClass(row.confidence)}">${escapeHtml(row.confidenceLabel||`${Math.round(row.confidence)}%`)}</span>`);if(row.personalReason)notes.push(`<em>${escapeHtml(row.personalReason)}</em>`);if(row.corrected)notes.push(`<em>Meintest du „${escapeHtml(row.corrected)}“?</em>`);if(row.amountLabel)notes.push(`<em>${escapeHtml(row.amountLabel)}${row.approximate?' · geschätzt':''}</em>`);return notes.join('')}
  function choiceHtml(row,rowIndex){return`<div class="confidence-choice-list">${(row.choices||[]).map((choice,choiceIndex)=>`<button type="button" data-confidence-choice="${rowIndex}:${choiceIndex}"><b>${escapeHtml(choice.item.name)}</b><small>${escapeHtml(choice.label)} · ${fmt(choice.item.calories)} kcal / ${fmt(choice.item.amount)} ${escapeHtml(choice.item.unit||'g')}</small></button>`).join('')}</div>`}
  function renderRow(row,index){
    if(row.status==='matched')return`<article class="matched confidence-${confidenceClass(row.confidence)}"><span>✓</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}</div><button type="button" data-canonical-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen">＋</button></article>`;
    if(row.status==='review')return`<article class="review confidence-${confidenceClass(row.confidence)}"><span>≈</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}<em>Vor dem Eintragen prüfen</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='incompatible')return`<article class="missing"><span>!</span><div><small>${escapeHtml(row.raw)}</small><b>Einheit passt nicht zu ${escapeHtml(row.item?.name||row.query)}</b><em>${escapeHtml(row.amountLabel)} kann nicht sicher umgerechnet werden</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='ambiguous')return`<article class="missing ambiguous confidence-choices"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Bitte passenden Treffer auswählen</b>${choiceHtml(row,index)}</div></article>`;
    return`<article class="missing"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Kein sicherer Treffer</b><em>Begriff einzeln prüfen</em></div><button type="button" data-canonical-search="${index}">Suchen</button></article>`;
  }
  function renderRows(input,rows){const node=host();if(!node||!rows.length)return false;rendering=true;const complete=rows.every(row=>row.status==='matched'),single=rows.length===1,safeCount=rows.filter(row=>row.status==='matched').length,reviewCount=rows.filter(row=>row.status==='review').length,ambiguousCount=rows.filter(row=>row.status==='ambiguous').length;node.dataset.canonical='1';node.dataset.query=normalize(input.value);node.hidden=false;node._canonicalRows=rows;suppressNormalResults(true);const title=single?(complete?'1 sicherer Treffer':reviewCount?'1 Treffer zum Prüfen':ambiguousCount?'Treffer auswählen':'1 Begriff prüfen'):complete?`${rows.length} sichere Bestandteile`:`${safeCount} sicher${reviewCount?` · ${reviewCount} prüfen`:''}${ambiguousCount?` · ${ambiguousCount} auswählen`:''}`;node.innerHTML=`<div class="nutrition-multi-head"><div><small>Intelligente Suche</small><b>${title}</b></div><button type="button" data-canonical-all ${complete?'':'disabled'}>${single&&complete?'Hinzufügen':complete?'Alle hinzufügen':'Auswahl prüfen'}</button></div><div class="nutrition-multi-list">${rows.map(renderRow).join('')}</div>`;queueMicrotask(()=>{rendering=false});return true}
  function render(input){if(!base||!input)return false;const inspection=directInspection(input.value);if(!inspection.handle)return Boolean(base.render?.(input));if(inspection.rows.length){base.render?.(input);return renderRows(input,inspection.rows)}const rendered=base.render?.(input);if(!rendered)return false;return renderRows(input,rowsFor(input.value))}
  function schedule(input){clearTimeout(timer);const token=++renderToken;timer=setTimeout(()=>{if(token===renderToken&&input?.isConnected)render(input)},185)}
  function selectChoice(button){const node=button.closest('#nutritionMultiSearch'),input=document.querySelector('#nutritionSearch');if(!node?._canonicalRows||!input||normalize(input.value)!==node.dataset.query)return;const [rowIndex,choiceIndex]=String(button.dataset.confidenceChoice||'').split(':').map(Number),rows=[...node._canonicalRows],row=rows[rowIndex],choice=row?.choices?.[choiceIndex];if(!choice)return;try{window.CutCoachSearchLearning160?.record?.(row.query||input.value,choice.item,{kind:'choice',mealType:document.body?.dataset?.nutritionMealType})}catch{}const portion=portionFor(row,choice.item);rows[rowIndex]={...row,item:choice.item,status:portion.incompatible?'incompatible':'matched',confidence:100,confidenceLabel:'Ausgewählt · 100%',matchType:'user-choice',personalReason:'Deine Wahl',alternatives:[],choices:[],...portion};invalidateCatalog();renderRows(input,rows)}
  function installFallbackObserver(){if(loadedBeforeEngine||fallbackObserver)return;const attach=node=>{fallbackObserver?.disconnect();fallbackObserver=new MutationObserver(()=>{if(rendering)return;const input=document.querySelector('#nutritionSearch');if(!input||node.dataset.canonical!=='1')return;const rows=rowsFor(input.value);if(rows.length)renderRows(input,rows)});fallbackObserver.observe(node,{childList:true,subtree:true})};const existing=document.querySelector('#nutritionMultiSearch');if(existing){attach(existing);return}fallbackObserver=new MutationObserver(()=>{const node=document.querySelector('#nutritionMultiSearch');if(node)attach(node)});fallbackObserver.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  function attach(engine){if(!engine||api)return api;base=engine;api=Object.freeze({...engine,version:VERSION,build:BUILD,baseVersion:engine.version,learningVersion:window.CutCoachSearchLearning160?.version||null,rowsFor,render,likelyMulti:value=>directInspection(value).handle,invalidateIndex:()=>{invalidateCatalog();base.invalidateIndex?.()},score:value=>Object.freeze(rowsFor(value).map(row=>Object.freeze({query:row.query,name:row.item?.name||null,status:row.status,confidence:row.confidence,matchType:row.matchType,personalReason:row.personalReason||'',alternatives:Object.freeze([...(row.alternatives||[])])})))});window.CutCoachIntelligentSearch128=api;installFallbackObserver();return api}
  document.addEventListener('input',event=>{const input=event.target;if(input?.id!=='nutritionSearch'||input.dataset.composing==='1'||input.dataset.voicePreview==='1'||!api)return;const inspection=directInspection(input.value);if(!inspection.handle)return;event.preventDefault();event.stopImmediatePropagation();schedule(input)},true);
  document.addEventListener('keydown',event=>{const input=event.target;if(input?.id!=='nutritionSearch'||!api||event.key!=='Enter')return;const inspection=directInspection(input.value);if(!inspection.handle)return;event.preventDefault();event.stopImmediatePropagation();clearTimeout(timer);render(input)},true);
  document.addEventListener('click',event=>{const choice=event.target.closest?.('[data-confidence-choice]');if(!choice)return;event.preventDefault();event.stopImmediatePropagation();selectChoice(choice)},true);
  window.addEventListener('cutcoach:catalog-updated',invalidateCatalog);window.addEventListener('cutcoach:librarychange',invalidateCatalog);window.addEventListener('cutcoach:search-learningchange',invalidateCatalog);document.addEventListener('cutcoach:library-changed',invalidateCatalog);
  window.CutCoachSearchConfidenceHardening151=Object.freeze({version:VERSION,build:BUILD,attach,invalidateCatalog});
})();