'use strict';
(function(){
  const VERSION='1.5.1-alpha';
  const BUILD='1.5.1-confidence-hardening';
  const loadedBeforeEngine=!window.CutCoachIntelligentSearch128;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const fmt=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:1}).format(Number(value)||0);
  const SUPPRESSION_SELECTOR='[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state';
  let base=null,api=null,timer=0,renderToken=0,rendering=false,fallbackObserver=null;

  function sourceLabel(item,origin){
    if(origin==='library'||item?.source==='user')return'Eigene';
    if(item?.source==='off')return'Produkt';
    if(item?.source==='bls')return'BLS';
    if(item?.source==='cutcoach')return'Standard';
    return'Katalog';
  }
  function originWeight(origin){return origin==='library'?16:origin==='base'?8:origin==='everyday'?6:origin==='catalog'?4:0}
  function itemPreference(item,origin){return originWeight(origin)+Number(item?.source==='user')*8+Number(Boolean(item?.favorite))*8+Math.min(8,Math.floor(Math.max(0,Number(item?.uses)||0)/2))}
  function namesOf(item){return[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[item?.aliases])].filter(Boolean).map(normalize)}
  function collectExact(query,fallbackItem){
    const q=normalize(query);if(!q)return null;
    const records=[];
    const push=(items,origin)=>{for(const item of items||[]){if(!item?.name)continue;const names=namesOf(item);if(!names.includes(q))continue;records.push({item,origin,isName:normalize(item.name)===q,preference:itemPreference(item,origin)})}};
    try{push(window.CutCoachLibrary?.exportData?.().items||[],'library')}catch{}
    try{push(window.CutCoachFoodCatalog?.items?.()||[],'catalog')}catch{}
    try{push(window.CutCoachEverydayCatalog?.items?.()||[],'everyday')}catch{}
    if(fallbackItem)push([fallbackItem],'base');
    const dedup=new Map();
    for(const record of records){const id=String(record.item.id||`${record.item.name}:${record.item.amount}:${record.item.unit}`),existing=dedup.get(id);if(!existing||record.preference>existing.preference)dedup.set(id,record)}
    const ranked=[...dedup.values()].sort((a,b)=>(Number(b.isName)-Number(a.isName))||b.preference-a.preference||String(a.item.name).localeCompare(String(b.item.name),'de'));
    if(!ranked.length)return null;
    const top=ranked[0],second=ranked[1],topRank=(top.isName?24:0)+top.preference,secondRank=second?(second.isName?24:0)+second.preference:-100,margin=topRank-secondRank;
    const choices=ranked.slice(0,4).map(record=>({item:record.item,origin:record.origin,label:sourceLabel(record.item,record.origin)}));
    if(second&&margin<4)return{ambiguous:true,choices};
    return{ambiguous:false,item:top.item,origin:top.origin,isName:top.isName,confidence:second?(top.isName?97:94):(top.isName?100:98),choices:choices.slice(1)};
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
    const ranked=collectExact(row.query,row.item);
    if(!ranked)return row;
    if(ranked.ambiguous)return{...row,item:null,status:'ambiguous',confidence:0,confidenceLabel:'',matchType:'ambiguous-ranked',alternatives:ranked.choices.map(choice=>`${choice.label}: ${choice.item.name}`),choices:ranked.choices};
    const portion=portionFor(row,ranked.item),status=portion.incompatible?'incompatible':ranked.confidence>=90?'matched':'review';
    return{...row,item:ranked.item,status,confidence:ranked.confidence,confidenceLabel:ranked.confidence>=98?`Exakt · ${ranked.confidence}%`:`Sehr sicher · ${ranked.confidence}%`,matchType:row.item===ranked.item?row.matchType:'ranked-personal',alternatives:ranked.choices.map(choice=>`${choice.label}: ${choice.item.name}`),choices:ranked.choices,...portion};
  }
  const hardenRows=rows=>Array.from(rows||[],hardenRow);
  function rowsFor(value){return base?hardenRows(base.rowsFor?.(value)||[]):[]}
  function directInspection(value){
    if(!base)return{handle:false,rows:[]};
    const direct=rowsFor(value);
    if(direct.length)return{handle:true,rows:direct};
    const text=String(value||'').trim();if(!text)return{handle:false,rows:[]};
    const probe=hardenRows(base.rowsFor?.(`1 ${text}`)||[]);
    if(probe.length===1&&probe[0].status==='ambiguous')return{handle:true,rows:probe};
    return{handle:Boolean(base.likelyMulti?.(value)),rows:[]};
  }
  function suppressNormalResults(active){
    document.body.classList.toggle('canonical-multisearch-active',active);
    if(active){for(const node of document.querySelectorAll(SUPPRESSION_SELECTOR)){if(node.dataset.cutcoachCanonicalSuppressed!=='1'){node.dataset.cutcoachCanonicalSuppressed='1';node.dataset.cutcoachCanonicalWasHidden=node.hidden?'1':'0'}node.hidden=true}return}
    for(const node of document.querySelectorAll('[data-cutcoach-canonical-suppressed="1"]')){node.hidden=node.dataset.cutcoachCanonicalWasHidden==='1';delete node.dataset.cutcoachCanonicalSuppressed;delete node.dataset.cutcoachCanonicalWasHidden}
  }
  function host(){let node=document.querySelector('#nutritionMultiSearch');if(node)return node;const card=document.querySelector('.nutrition-search-card');if(!card)return null;node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search intelligent-search';card.after(node);return node}
  function confidenceClass(value){return value>=90?'high':value>=80?'medium':'low'}
  function rowNotes(row){const notes=[];if(row.item)notes.push(`<span class="nutrition-confidence ${confidenceClass(row.confidence)}">${escapeHtml(row.confidenceLabel||`${Math.round(row.confidence)}%`)}</span>`);if(row.corrected)notes.push(`<em>Meintest du „${escapeHtml(row.corrected)}“?</em>`);if(row.amountLabel)notes.push(`<em>${escapeHtml(row.amountLabel)}${row.approximate?' · geschätzt':''}</em>`);return notes.join('')}
  function choiceHtml(row,rowIndex){return`<div class="confidence-choice-list">${(row.choices||[]).map((choice,choiceIndex)=>`<button type="button" data-confidence-choice="${rowIndex}:${choiceIndex}"><b>${escapeHtml(choice.item.name)}</b><small>${escapeHtml(choice.label)} · ${fmt(choice.item.calories)} kcal / ${fmt(choice.item.amount)} ${escapeHtml(choice.item.unit||'g')}</small></button>`).join('')}</div>`}
  function renderRow(row,index){
    if(row.status==='matched')return`<article class="matched confidence-${confidenceClass(row.confidence)}"><span>✓</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}</div><button type="button" data-canonical-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen">＋</button></article>`;
    if(row.status==='review')return`<article class="review confidence-${confidenceClass(row.confidence)}"><span>≈</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}<em>Vor dem Eintragen prüfen</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='incompatible')return`<article class="missing"><span>!</span><div><small>${escapeHtml(row.raw)}</small><b>Einheit passt nicht zu ${escapeHtml(row.item?.name||row.query)}</b><em>${escapeHtml(row.amountLabel)} kann nicht sicher umgerechnet werden</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='ambiguous')return`<article class="missing ambiguous confidence-choices"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Bitte passenden Treffer auswählen</b>${choiceHtml(row,index)}</div></article>`;
    return`<article class="missing"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Kein sicherer Treffer</b><em>Begriff einzeln prüfen</em></div><button type="button" data-canonical-search="${index}">Suchen</button></article>`;
  }
  function renderRows(input,rows){
    const node=host();if(!node)return false;if(!rows.length)return false;
    rendering=true;
    const complete=rows.every(row=>row.status==='matched'),single=rows.length===1,safeCount=rows.filter(row=>row.status==='matched').length,reviewCount=rows.filter(row=>row.status==='review').length,ambiguousCount=rows.filter(row=>row.status==='ambiguous').length;
    node.dataset.canonical='1';node.dataset.query=normalize(input.value);node.hidden=false;node._canonicalRows=rows;suppressNormalResults(true);
    const title=single?(complete?'1 sicherer Treffer':reviewCount?'1 Treffer zum Prüfen':ambiguousCount?'Treffer auswählen':'1 Begriff prüfen'):complete?`${rows.length} sichere Bestandteile`:`${safeCount} sicher${reviewCount?` · ${reviewCount} prüfen`:''}${ambiguousCount?` · ${ambiguousCount} auswählen`:''}`;
    node.innerHTML=`<div class="nutrition-multi-head"><div><small>Intelligente Suche</small><b>${title}</b></div><button type="button" data-canonical-all ${complete?'':'disabled'}>${single&&complete?'Hinzufügen':complete?'Alle hinzufügen':'Auswahl prüfen'}</button></div><div class="nutrition-multi-list">${rows.map(renderRow).join('')}</div>`;
    queueMicrotask(()=>{rendering=false});return true;
  }
  function render(input){
    if(!base||!input)return false;const inspection=directInspection(input.value);
    if(!inspection.handle)return Boolean(base.render?.(input));
    if(inspection.rows.length){base.render?.(input);return renderRows(input,inspection.rows)}
    const rendered=base.render?.(input);if(!rendered)return false;return renderRows(input,rowsFor(input.value));
  }
  function schedule(input){clearTimeout(timer);const token=++renderToken;timer=setTimeout(()=>{if(token===renderToken&&input?.isConnected)render(input)},185)}
  function selectChoice(button){
    const node=button.closest('#nutritionMultiSearch'),input=document.querySelector('#nutritionSearch');if(!node?._canonicalRows||!input||normalize(input.value)!==node.dataset.query)return;
    const [rowIndex,choiceIndex]=String(button.dataset.confidenceChoice||'').split(':').map(Number),rows=[...node._canonicalRows],row=rows[rowIndex],choice=row?.choices?.[choiceIndex];if(!choice)return;
    const portion=portionFor(row,choice.item);rows[rowIndex]={...row,item:choice.item,status:portion.incompatible?'incompatible':'matched',confidence:100,confidenceLabel:'Ausgewählt · 100%',matchType:'user-choice',alternatives:[],choices:[],...portion};renderRows(input,rows);
  }
  function installFallbackObserver(){
    if(loadedBeforeEngine||fallbackObserver)return;
    const attach=node=>{fallbackObserver?.disconnect();fallbackObserver=new MutationObserver(()=>{if(rendering)return;const input=document.querySelector('#nutritionSearch');if(!input||node.dataset.canonical!=='1')return;const rows=rowsFor(input.value);if(rows.length)renderRows(input,rows)});fallbackObserver.observe(node,{childList:true,subtree:true})};
    const existing=document.querySelector('#nutritionMultiSearch');if(existing){attach(existing);return}
    fallbackObserver=new MutationObserver(()=>{const node=document.querySelector('#nutritionMultiSearch');if(node)attach(node)});fallbackObserver.observe(document.body||document.documentElement,{childList:true,subtree:true});
  }
  function attach(engine){
    if(!engine||api)return api;base=engine;
    api=Object.freeze({...engine,version:VERSION,build:BUILD,baseVersion:engine.version,rowsFor,render,likelyMulti:value=>directInspection(value).handle,score:value=>Object.freeze(rowsFor(value).map(row=>Object.freeze({query:row.query,name:row.item?.name||null,status:row.status,confidence:row.confidence,matchType:row.matchType,alternatives:Object.freeze([...(row.alternatives||[])])})))});
    window.CutCoachIntelligentSearch128=api;installFallbackObserver();return api;
  }
  document.addEventListener('input',event=>{const input=event.target;if(input?.id!=='nutritionSearch'||input.dataset.composing==='1'||input.dataset.voicePreview==='1'||!api)return;const inspection=directInspection(input.value);if(!inspection.handle)return;event.preventDefault();event.stopImmediatePropagation();schedule(input)},true);
  document.addEventListener('keydown',event=>{const input=event.target;if(input?.id!=='nutritionSearch'||!api||event.key!=='Enter')return;const inspection=directInspection(input.value);if(!inspection.handle)return;event.preventDefault();event.stopImmediatePropagation();clearTimeout(timer);render(input)},true);
  document.addEventListener('click',event=>{const choice=event.target.closest?.('[data-confidence-choice]');if(!choice)return;event.preventDefault();event.stopImmediatePropagation();selectChoice(choice)},true);
  window.CutCoachSearchConfidenceHardening151=Object.freeze({version:VERSION,build:BUILD,attach});
})();