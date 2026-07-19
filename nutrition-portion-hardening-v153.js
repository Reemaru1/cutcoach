'use strict';
(function(global){
  const VERSION='1.5.3-alpha';
  const BUILD='1.5.3-food-specific-portions';
  if(global.CutCoachPortionHardening153)return;

  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const clamp=(value,min,max)=>Math.min(max,Math.max(min,Number(value)||0));
  const SUPPRESSION_SELECTOR='[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state';
  const HOUSEHOLD_HINT_RE=/(?:^|[^a-z])(?:scheibe(?:n)?|el|essloffel(?:n)?|essloeffel(?:n)?|tl|teeloffel(?:n)?|teeloeffel(?:n)?|handvoll|glas|glaser|glaeser|glasern|glaesern|dose(?:n)?|flasche(?:n)?|stuck(?:e)?|stueck(?:e)?|portion(?:en)?)(?![a-z])/;
  let base=null,api=null,timer=0,renderToken=0,composing=false,cachedValue=null,cachedRows=null;

  function confidenceLabel(value){const score=Math.round(clamp(value,0,100));if(score===100)return'Exakt · 100%';if(score>=90)return`Sehr sicher · ${score}%`;if(score>=72)return`Bitte prüfen · ${score}%`;return`Menge prüfen · ${score}%`}
  function confidenceClass(value){if(value>=90)return'high';if(value>=80)return'medium';return'low'}
  function looksLikeHouseholdInput(value){return HOUSEHOLD_HINT_RE.test(normalize(value))}
  function normalizeHouseholdSyntax(value){return String(value||'').replace(/\bessl(?:oe|ö)ffeln?\b/gi,'EL').replace(/\bteel(?:oe|ö)ffeln?\b/gi,'TL').replace(/\bgl(?:ae|ä)sern?\b/gi,'Gläser').replace(/\bst(?:ue|ü)cke(?:n)?\b/gi,'Stück')}
  function isHouseholdRow(row){return Boolean(row?.quantitySpecified&&row?.unitInfo&&['serving','count'].includes(row.unitInfo.kind))}
  function invalidateRowCache(){cachedValue=null;cachedRows=null}
  function cacheRows(value,rows){cachedValue=String(value||'');cachedRows=rows;return rows}
  function applyPortion(row){
    if(!row?.item||!isHouseholdRow(row))return row;
    const profiles=global.CutCoachPortionProfiles153,resolved=profiles?.resolve?.(row.item,row.unitInfo.label,row.quantity);
    if(!resolved)return row;
    const baseConfidence=clamp(row.confidence||100,0,100);
    if(!resolved.known){const confidence=Math.min(baseConfidence,65);return{...row,status:'review',confidence,confidenceLabel:confidenceLabel(confidence),factor:1,amountLabel:resolved.amountLabel,approximate:true,portionSource:resolved.source||'unknown',portionNeedsReview:true};}
    const confidence=Math.min(baseConfidence,clamp(resolved.confidence,0,100)),status=row.status==='ambiguous'?'ambiguous':resolved.needsReview||confidence<90?'review':'matched';
    return{...row,status,confidence,confidenceLabel:confidenceLabel(confidence),factor:resolved.factor,amountLabel:resolved.amountLabel,approximate:resolved.approximate,portionSource:resolved.source,portionNeedsReview:Boolean(resolved.needsReview),convertedAmount:resolved.convertedAmount,convertedUnit:resolved.convertedUnit};
  }
  const applyRows=rows=>Array.from(rows||[],applyPortion);
  function rowsFor(value){const key=String(value||'');if(cachedValue===key&&cachedRows)return cachedRows;const prepared=normalizeHouseholdSyntax(key),sourceRows=base?.rowsFor?.(prepared)||[];let rows=applyRows(sourceRows);if(prepared!==key&&rows.length===1)rows=[{...rows[0],raw:key.trim()}];return cacheRows(key,rows)}
  function hasHouseholdInput(value){return looksLikeHouseholdInput(value)&&rowsFor(value).some(isHouseholdRow)}

  function suppressNormalResults(active){document.body.classList.toggle('canonical-multisearch-active',active);if(active){for(const node of document.querySelectorAll(SUPPRESSION_SELECTOR)){if(node.dataset.cutcoachCanonicalSuppressed!=='1'){node.dataset.cutcoachCanonicalSuppressed='1';node.dataset.cutcoachCanonicalWasHidden=node.hidden?'1':'0'}node.hidden=true}return}for(const node of document.querySelectorAll('[data-cutcoach-canonical-suppressed="1"]')){node.hidden=node.dataset.cutcoachCanonicalWasHidden==='1';delete node.dataset.cutcoachCanonicalSuppressed;delete node.dataset.cutcoachCanonicalWasHidden}}
  function host(){let node=document.querySelector('#nutritionMultiSearch');if(node)return node;const card=document.querySelector('.nutrition-search-card');if(!card)return null;node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search intelligent-search';card.after(node);return node}
  function clearPortionMarker(){document.querySelector('#nutritionMultiSearch')?.removeAttribute('data-portion153')}
  function rowNotes(row){const notes=[];if(row.item)notes.push(`<span class="nutrition-confidence ${confidenceClass(row.confidence)}">${escapeHtml(row.confidenceLabel||`${Math.round(row.confidence)}%`)}</span>`);if(row.corrected)notes.push(`<em>Meintest du „${escapeHtml(row.corrected)}“?</em>`);if(row.amountLabel)notes.push(`<em>${escapeHtml(row.amountLabel)}${row.approximate&&!row.portionNeedsReview?' · Standardwert':''}</em>`);if(row.modifier)notes.push(`<em>ohne ${escapeHtml(row.modifier)} · Nährwerte bleiben Richtwert</em>`);return notes.join('')}
  function choiceHtml(row,rowIndex){return`<div class="confidence-choice-list">${(row.choices||[]).map((choice,choiceIndex)=>`<button type="button" data-confidence-choice="${rowIndex}:${choiceIndex}"><b>${escapeHtml(choice.item.name)}</b><small>${escapeHtml(choice.label||'Katalog')} · Basis ${escapeHtml(choice.item.amount)} ${escapeHtml(choice.item.unit||'g')}</small></button>`).join('')}</div>`}
  function renderRow(row,index){
    if(row.status==='matched')return`<article class="matched confidence-${confidenceClass(row.confidence)}"><span>✓</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${rowNotes(row)}</div><button type="button" data-canonical-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen">＋</button></article>`;
    if(row.status==='review')return`<article class="review confidence-${confidenceClass(row.confidence)}"><span>≈</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item?.name||row.query)}</b>${rowNotes(row)}<em>Portionsgröße vor dem Eintragen prüfen</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='incompatible')return`<article class="missing"><span>!</span><div><small>${escapeHtml(row.raw)}</small><b>Einheit passt nicht zu ${escapeHtml(row.item?.name||row.query)}</b><em>${escapeHtml(row.amountLabel)} kann nicht sicher umgerechnet werden</em></div><button type="button" data-canonical-search="${index}">Prüfen</button></article>`;
    if(row.status==='ambiguous')return`<article class="missing ambiguous confidence-choices"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Bitte passenden Treffer auswählen</b>${choiceHtml(row,index)}</div></article>`;
    return`<article class="missing"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Kein sicherer Treffer</b><em>Begriff einzeln prüfen</em></div><button type="button" data-canonical-search="${index}">Suchen</button></article>`;
  }
  function renderRows(input,rows){
    const node=host();if(!node||!rows.length)return false;
    const complete=rows.every(row=>row.status==='matched'),single=rows.length===1,safeCount=rows.filter(row=>row.status==='matched').length,reviewCount=rows.filter(row=>row.status==='review').length,ambiguousCount=rows.filter(row=>row.status==='ambiguous').length;
    node.dataset.canonical='1';node.dataset.query=normalize(input.value);node.dataset.portion153='1';node.hidden=false;node._canonicalRows=rows;cacheRows(input.value,rows);suppressNormalResults(true);
    const title=single?(complete?'1 sicherer Treffer':reviewCount?'1 Portionsgröße prüfen':ambiguousCount?'Treffer auswählen':'1 Begriff prüfen'):complete?`${rows.length} sichere Bestandteile`:`${safeCount} sicher${reviewCount?` · ${reviewCount} prüfen`:''}${ambiguousCount?` · ${ambiguousCount} auswählen`:''}`;
    node.innerHTML=`<div class="nutrition-multi-head"><div><small>Intelligente Suche</small><b>${title}</b></div><button type="button" data-canonical-all ${complete?'':'disabled'}>${single&&complete?'Hinzufügen':complete?'Alle hinzufügen':'Auswahl prüfen'}</button></div><div class="nutrition-multi-list">${rows.map(renderRow).join('')}</div>`;
    return true;
  }
  function render(input){if(!base||!input)return false;const rows=rowsFor(input.value);if(!rows.some(isHouseholdRow)){clearPortionMarker();return Boolean(base.render?.(input))}return renderRows(input,rows)}
  function schedule(input){clearTimeout(timer);const token=++renderToken;timer=setTimeout(()=>{if(token===renderToken&&input?.isConnected)render(input)},185)}
  function selectChoice(button){
    const node=button.closest('#nutritionMultiSearch'),input=document.querySelector('#nutritionSearch');if(!node?._canonicalRows||!input||normalize(input.value)!==node.dataset.query)return false;
    const [rowIndex,choiceIndex]=String(button.dataset.confidenceChoice||'').split(':').map(Number),rows=[...node._canonicalRows],row=rows[rowIndex],choice=row?.choices?.[choiceIndex];if(!row||!isHouseholdRow(row)||!choice)return false;
    rows[rowIndex]=applyPortion({...row,item:choice.item,status:'matched',confidence:100,confidenceLabel:'Ausgewählt · 100%',matchType:'user-choice',alternatives:[],choices:[]});renderRows(input,rows);return true;
  }
  function attach(engine){
    if(!engine||api)return api;base=engine;invalidateRowCache();
    api=Object.freeze({...engine,version:VERSION,build:BUILD,baseVersion:engine.version,portionVersion:global.CutCoachPortionProfiles153?.version||null,rowsFor,render,likelyMulti:value=>hasHouseholdInput(value)||Boolean(base.likelyMulti?.(value)),score:value=>Object.freeze(rowsFor(value).map(row=>Object.freeze({query:row.query,name:row.item?.name||null,status:row.status,confidence:row.confidence,matchType:row.matchType,amountLabel:row.amountLabel||'',portionSource:row.portionSource||null,alternatives:Object.freeze([...(row.alternatives||[])])})))});
    global.CutCoachIntelligentSearch128=api;const input=document.querySelector('#nutritionSearch');if(input&&hasHouseholdInput(input.value))queueMicrotask(()=>render(input));return api;
  }

  document.addEventListener('compositionstart',event=>{if(event.target?.id==='nutritionSearch')composing=true},true);
  document.addEventListener('compositionend',event=>{if(event.target?.id!=='nutritionSearch'||!api)return;composing=false;if(!looksLikeHouseholdInput(event.target.value)){clearPortionMarker();return}if(!hasHouseholdInput(event.target.value)){clearPortionMarker();return}event.preventDefault();event.stopImmediatePropagation();schedule(event.target)},true);
  document.addEventListener('input',event=>{const input=event.target;if(input?.id!=='nutritionSearch'||!api||composing||input.dataset.composing==='1'||input.dataset.voicePreview==='1')return;if(!looksLikeHouseholdInput(input.value)){clearPortionMarker();return}if(!hasHouseholdInput(input.value)){clearPortionMarker();return}event.preventDefault();event.stopImmediatePropagation();schedule(input)},true);
  document.addEventListener('keydown',event=>{const input=event.target;if(input?.id!=='nutritionSearch'||!api||event.key!=='Enter'||!looksLikeHouseholdInput(input.value))return;if(!hasHouseholdInput(input.value)){clearPortionMarker();return}event.preventDefault();event.stopImmediatePropagation();clearTimeout(timer);render(input)},true);
  document.addEventListener('click',event=>{const choice=event.target.closest?.('#nutritionMultiSearch[data-portion153="1"] [data-confidence-choice]');if(!choice)return;if(selectChoice(choice)){event.preventDefault();event.stopImmediatePropagation()}},true);
  window.addEventListener('cutcoach:catalog-updated',invalidateRowCache);
  window.addEventListener('cutcoach:librarychange',invalidateRowCache);
  document.addEventListener('cutcoach:library-changed',invalidateRowCache);

  global.CutCoachPortionHardening153=Object.freeze({version:VERSION,build:BUILD,attach,applyRows,looksLikeHouseholdInput,normalizeHouseholdSyntax,invalidateRowCache});
})(window);