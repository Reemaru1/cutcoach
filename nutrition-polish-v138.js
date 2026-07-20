'use strict';
(function(){
  const VERSION='1.3.9 Alpha';
  const PRESENTATION_VERSION='1.9.4-alpha';
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const NUMBER_WORDS=Object.freeze({ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10,halb:.5,halbe:.5,halben:.5,halber:.5,anderthalb:1.5});
  const UNIT_LABELS=Object.freeze({g:'g',gramm:'g',kg:'kg',kilogramm:'kg',ml:'ml',milliliter:'ml',l:'l',liter:'l',stuck:'Stück',stueck:'Stück',portion:'Portion',portionen:'Portionen',el:'EL',essloffel:'EL',tl:'TL',teeloffel:'TL',scheibe:'Scheibe',scheiben:'Scheiben'});
  const FALLBACK_KEYS=Object.freeze({done:'doener',doner:'doener',doener:'doener',kebap:'doener',kebab:'doener',brot:'brot',brote:'brot',brotscheibe:'brot',brotscheiben:'brot',steak:'steak',steaks:'steak',rindersteak:'steak',beefsteak:'steak'});
  const STATIC_ITEMS=Object.freeze({
    brot:Object.freeze({id:'cutcoach-standard-brot-v192',name:'Brot',aliases:Object.freeze(['Brotscheibe','Brotscheiben','Mischbrot']),kind:'food',amount:1,unit:'Stück',calories:115,protein:3.8,carbs:21,fat:1.4,fiber:2.8,sugar:1.2,saturatedFat:.2,salt:.55,source:'cutcoach',catalog:true,estimated:true,sourceLabel:'CutCoach Standardwert · durchschnittlicher Richtwert',category:'Brot'}),
    steak:Object.freeze({id:'cutcoach-standard-steak-v192',name:'Rindersteak',aliases:Object.freeze(['Steak','Beefsteak','Rind Steak']),kind:'food',amount:1,unit:'Stück',calories:400,protein:52,carbs:0,fat:22,fiber:0,sugar:0,saturatedFat:8.5,salt:.35,source:'cutcoach',catalog:true,estimated:true,sourceLabel:'CutCoach Standardwert · ca. 200 g gegart',category:'Fleisch'})
  });

  let root=null,observer=null,frame=0,inputTimer=0,renderToken=0,syncing=false,renderWrites=0,locked=new WeakSet();

  const mealRules={
    'Frühstück':[
      [/(^|\s)(ei|eier|ruhrei|omelett|skyr|quark|joghurt|muesli|musli|hafer|porridge|cornflakes|brot|toast|brotchen|broetchen|breze|croissant|kase|kaese|marmelade|honig|banane|beere|obst|kaffee|tee)(\s|$)/,420],
      [/(proteinpudding|milchreis|griesbrei|griessbrei|fruhstuck|fruehstueck)/,360],
      [/(hahnchen|haehnchen|huhn|pute|rind|schwein|fisch|lachs|thunfisch|doner|doener|pizza|burger|schnitzel|gulasch|curry|nudel|reis|kartoffel)/,-380]
    ],
    'Mittagessen':[
      [/(hahnchen|haehnchen|huhn|pute|rind|schwein|fisch|lachs|thunfisch|reis|nudel|kartoffel|salat|bowl|doner|doener|pizza|burger|schnitzel|gulasch|curry|gemuse|gemuese)/,360],
      [/(skyr|quark|joghurt|muesli|musli|porridge|cornflakes|marmelade|croissant)/,-120]
    ],
    'Abendessen':[
      [/(hahnchen|haehnchen|huhn|pute|rind|schwein|fisch|lachs|thunfisch|reis|nudel|kartoffel|salat|bowl|suppe|brot|toast|omelett|ei|eier|gemuse|gemuese)/,310],
      [/(muesli|musli|porridge|cornflakes|marmelade|croissant)/,-110]
    ],
    'Snack':[
      [/(skyr|quark|joghurt|proteinpudding|proteinriegel|riegel|banane|apfel|beere|obst|nuss|mandel|pistazie|schokolade|pudding|reiswaffel)/,380],
      [/(hahnchen|haehnchen|rind|schwein|doner|doener|pizza|burger|schnitzel|gulasch|curry|nudel|reis|kartoffel)/,-300]
    ]
  };

  function currentMeal(){return document.body.dataset.nutritionMealType||$('#nutritionMealSelect',root)?.value||'Frühstück'}
  function mealAffinity(name,meal){const value=normalize(name);return (mealRules[meal]||[]).reduce((score,[pattern,weight])=>score+(pattern.test(value)?weight:0),0)}
  function engine(){return window.CutCoachIntelligentSearch128||null}
  function catalogItems(){try{return window.CutCoachFoodCatalog?.items?.()||[]}catch{return[]}}
  function aliasesOf(item){return[item?.name,...(Array.isArray(item?.aliases)?item.aliases:[item?.aliases])].filter(Boolean)}
  function exactCatalogItem(names){const wanted=new Set(names.map(normalize));return catalogItems().find(item=>aliasesOf(item).some(name=>wanted.has(normalize(name))))||null}
  function fallbackItem(key){
    if(key==='doener')return window.CutCoachEverydayCatalog?.get?.('ccde:doner-kalb')||window.CutCoachFoodCatalog?.get?.('ccde:doner-kalb')||exactCatalogItem(['Döner','Döner Kebab Kalb/Rind'])||null;
    if(key==='brot')return exactCatalogItem(['Brot'])||STATIC_ITEMS.brot;
    if(key==='steak')return exactCatalogItem(['Steak','Rindersteak'])||catalogItems().find(item=>{const text=normalize(`${item.name} ${(item.aliases||[]).join(' ')}`);return text.includes('rind')&&text.includes('steak')})||STATIC_ITEMS.steak;
    return null;
  }
  function quantityInfo(raw){
    const text=String(raw||'').trim(),match=text.match(/^(\d+(?:[.,]\d+)?|halb(?:e|en|er|es)?|anderthalb|ein(?:e|en|er|es)?|eins|zwei|drei|vier|f(?:ü|ue)nf|sechs|sieben|acht|neun|zehn)(?:\s*(kg|kilogramm|g|gramm|ml|milliliter|l|liter|st(?:ü|ue)ck|portion(?:en)?|el|essl(?:ö|oe)ffel|tl|teel(?:ö|oe)ffel|scheibe(?:n)?))?\b\s*/i);
    if(!match)return{source:text,quantity:1,specified:false,unit:''};
    const token=normalize(match[1]),numeric=Number(String(match[1]).replace(',','.')),quantity=Number.isFinite(numeric)?numeric:(NUMBER_WORDS[token]||1),unit=UNIT_LABELS[normalize(match[2])]||'';
    return{source:text.slice(match[0].length).replace(/^(?:der|die|das|von|vom)\s+/i,'').trim(),quantity:Math.max(.01,quantity),specified:true,unit};
  }
  function fallbackKeyFor(raw){const info=quantityInfo(raw),query=normalize(info.source).replace(/^(?:ein|eine|einen|einer)\s+/,'');return{...info,query,key:FALLBACK_KEYS[query]||null}}
  function fallbackRow(raw){
    const parsed=fallbackKeyFor(raw);if(!parsed.key)return null;const item=fallbackItem(parsed.key);if(!item)return null;
    const factor=parsed.specified?parsed.quantity:1,amountLabel=parsed.specified?`${fmt(parsed.quantity,parsed.quantity%1?1:0)}${parsed.unit?` ${parsed.unit}`:'×'}`:'';
    return{raw:String(raw||'').trim(),query:parsed.query,quantity:parsed.quantity,quantitySpecified:parsed.specified,unitInfo:null,modifier:'',smart:parsed.specified,item,status:'matched',matchType:'v192-common-exact',confidence:100,confidenceLabel:'',corrected:'',alternatives:[],choices:[],factor,amountLabel,incompatible:false,approximate:Boolean(parsed.unit&&!['Stück','Portion','Portionen'].includes(parsed.unit)),presentationResolved:true};
  }
  function patchRow(row){
    if(!row)return row;const raw=row.raw||row.query||'',fallback=fallbackRow(raw)||fallbackRow(row.query||'');
    if(!fallback)return row;
    if(row.status==='matched'&&row.item&&normalize(row.item.name)!=='doner kebab kalb rind'&&fallback.key!=='doener')return row;
    return{...row,...fallback,raw:row.raw||fallback.raw,quantity:row.quantitySpecified?row.quantity:fallback.quantity,quantitySpecified:row.quantitySpecified||fallback.quantitySpecified,factor:row.quantitySpecified&&Number.isFinite(Number(row.factor))?row.factor:fallback.factor,amountLabel:row.amountLabel||fallback.amountLabel};
  }
  function baseRows(value){try{return Array.from(engine()?.rowsFor?.(value)||[])}catch{return[]}}
  function splitParts(value){return String(value||'').split(/\s+(?:und|plus|sowie|mit\s+dazu|dazu|zusammen\s+mit|außerdem|ausserdem)\s+|\s*[,;+&]\s*/i).map(part=>part.trim()).filter(Boolean)}
  function resolveRows(value){
    const direct=baseRows(value).map(patchRow);if(direct.length)return direct;
    const parts=splitParts(value);if(parts.length>=2){const rows=[];for(const part of parts){const resolved=baseRows(part).map(patchRow);if(resolved.length)rows.push(...resolved);else{const fallback=fallbackRow(part);if(fallback)rows.push(fallback);else rows.push({raw:part,query:normalize(quantityInfo(part).source),item:null,status:'missing',confidence:0,alternatives:[],choices:[],factor:1,amountLabel:'',incompatible:false,approximate:false})}}return rows}
    const fallback=fallbackRow(value);return fallback?[fallback]:[];
  }
  function shouldHandle(value,rows=resolveRows(value)){
    const raw=String(value||'').trim();if(!raw)return false;const parsed=fallbackKeyFor(raw),hasJoin=splitParts(raw).length>=2;
    if(hasJoin||rows.length>=2)return true;
    if(rows.some(row=>row.status!=='matched'))return true;
    if(parsed.specified&&parsed.key)return true;
    if(parsed.query==='done')return true;
    try{return Boolean(engine()?.likelyMulti?.(raw)&&rows.length)}catch{return false}
  }

  function renameShortcuts(){
    const manual=$('#nutritionManual',root),create=$('#nutritionNewFood',root),voice=$('#nutritionVoice',root);
    const manualLabel=manual?.querySelector('b'),createLabel=create?.querySelector('b');
    if(manualLabel&&manualLabel.textContent!=='Schnelleingabe')manualLabel.textContent='Schnelleingabe';
    if(createLabel&&createLabel.textContent!=='Neu anlegen')createLabel.textContent='Neu anlegen';
    if(manual){manual.setAttribute('aria-label','Mahlzeit direkt mit eigenen Nährwerten eintragen');manual.title='Direkter Eintrag nur für diese Mahlzeit'}
    if(create){create.setAttribute('aria-label','Wiederverwendbares Lebensmittel anlegen');create.title='Eigenes Lebensmittel dauerhaft speichern'}
    if(voice){voice.textContent='🎙️';voice.setAttribute('aria-label','Spracheingabe starten');voice.title='Spracheingabe'}
  }
  function polishMealActions(){
    const previous=$('#nutritionCopyPrevious',root),toggle=$('#nutritionCurrentToggle',root);
    if(previous){previous.textContent='Vortag';previous.setAttribute('aria-label','Einträge vom Vortag übernehmen')}
    if(toggle&&!toggle.hidden){const expanded=toggle.getAttribute('aria-expanded')==='true';toggle.innerHTML=`${expanded?'Schließen':'Einträge'} <span aria-hidden="true">${expanded?'⌃':'⌄'}</span>`;toggle.setAttribute('aria-label',expanded?'Einträge schließen':'Einträge anzeigen')}
  }
  function rowName(row){return row.querySelector('.nutrition-result-copy b>span,.nutrition-result-copy b')?.textContent?.trim()||''}
  function recommendationScore(row,index,meal){let score=1000-index*12+mealAffinity(rowName(row),meal);if(row.querySelector('.nutrition-routine'))score+=900;if(row.querySelector('.nutrition-favorite'))score+=480;const fit=normalize(row.querySelector('.nutrition-result-energy i')?.textContent);if(fit.includes('eiweiss fit'))score+=90;else if(fit.includes('budget fit'))score+=55;if(row.classList.contains('v73-everyday-row'))score+=25;return score}
  function reorderRecommendations(){const host=$('#nutritionResults',root),input=$('#nutritionSearch',root),active=$('[data-nutrition-filter].active',root);if(!host||input?.value.trim()||active?.dataset.nutritionFilter!=='all')return;const rows=$$(':scope > .nutrition-result-row',host);if(rows.length<2)return;const meal=currentMeal(),sorted=rows.map((row,index)=>({row,index,score:recommendationScore(row,index,meal)})).sort((left,right)=>right.score-left.score||left.index-right.index).map(entry=>entry.row);if(sorted.every((row,index)=>row===rows[index]))return;const fragment=document.createDocumentFragment();sorted.forEach(row=>fragment.append(row));host.append(fragment);host.dataset.mealRanked=meal}
  function decorateRows(){$$('.nutrition-result-row',root).forEach(row=>{row.dataset.nutritionPolish='1';const source=row.querySelector('.nutrition-source');if(source)source.setAttribute('title',source.getAttribute('aria-label')||source.textContent.trim());const add=row.querySelector('.nutrition-result-add');if(add){add.textContent='+';add.title=add.getAttribute('aria-label')||'Hinzufügen'}})}

  function searchHost(){let node=$('#nutritionMultiSearch');if(node)return node;const card=$('.nutrition-search-card',root);if(!card)return null;node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search intelligent-search nutrition-presentation-v192';card.after(node);return node}
  function suppressNormalResults(active){document.body.classList.toggle('canonical-multisearch-active',active);const selector='[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state';if(active){for(const node of $$(selector)){if(node.dataset.v192Suppressed!=='1'){node.dataset.v192Suppressed='1';node.dataset.v192WasHidden=node.hidden?'1':'0'}node.hidden=true}}else for(const node of $$('[data-v192-suppressed="1"]')){node.hidden=node.dataset.v192WasHidden==='1';delete node.dataset.v192Suppressed;delete node.dataset.v192WasHidden}}
  function clearSearchPresentation(){clearTimeout(inputTimer);renderToken++;const node=$('#nutritionMultiSearch');if(node?.dataset.presentationV192==='1'){node.hidden=true;node.replaceChildren();delete node.dataset.presentationV192;delete node.dataset.query;delete node.dataset.renderSignature;delete node._v192Rows}suppressNormalResults(false)}
  function rowMeta(row){const notes=[];if(row.amountLabel)notes.push(row.amountLabel);if(row.modifier)notes.push(`ohne ${row.modifier}`);if(row.personalReason)notes.push(row.personalReason);return notes.join(' · ')}
  function choiceHtml(row,index){return`<div class="confidence-choice-list">${(row.choices||[]).map((choice,choiceIndex)=>`<button type="button" data-v192-choice="${index}:${choiceIndex}"><b>${escapeHtml(choice.item.name)}</b><small>${fmt(choice.item.calories)} kcal · ${fmt(choice.item.amount,Number(choice.item.amount)%1?1:0)} ${escapeHtml(choice.item.unit||'g')}</small></button>`).join('')}</div>`}
  function renderRow(row,index){
    const raw=row.raw&&normalize(row.raw)!==normalize(row.item?.name)?`<small>${escapeHtml(row.raw)}</small>`:'',meta=rowMeta(row),metaHtml=meta?`<em>${escapeHtml(meta)}</em>`:'';
    if(row.status==='matched'&&row.item)return`<article class="matched"><span class="nutrition-row-state" aria-hidden="true">✓</span><div>${raw}<b>${escapeHtml(row.item.name)}</b>${metaHtml}</div><button class="nutrition-row-action add" type="button" data-v192-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen"><span aria-hidden="true">+</span><strong>Hinzufügen</strong></button></article>`;
    if(row.status==='review'&&row.item)return`<article class="review"><span class="nutrition-row-state" aria-hidden="true">!</span><div>${raw}<b>${escapeHtml(row.item.name)}</b>${metaHtml}<em>Bitte kurz prüfen</em></div><button class="nutrition-row-action inspect" type="button" data-v192-search="${index}">Prüfen</button></article>`;
    if(row.status==='ambiguous')return`<article class="ambiguous confidence-choices"><span class="nutrition-row-state" aria-hidden="true">?</span><div>${raw}<b>Passenden Eintrag auswählen</b>${choiceHtml(row,index)}</div></article>`;
    if(row.status==='incompatible')return`<article class="missing"><span class="nutrition-row-state" aria-hidden="true">!</span><div>${raw}<b>Einheit passt nicht</b><em>${escapeHtml(row.amountLabel||'Menge bitte prüfen')}</em></div><button class="nutrition-row-action inspect" type="button" data-v192-search="${index}">Prüfen</button></article>`;
    return`<article class="missing"><span class="nutrition-row-state" aria-hidden="true">?</span><div>${raw}<b>Kein passender Treffer</b><em>Einzeln suchen oder neu anlegen</em></div><button class="nutrition-row-action inspect" type="button" data-v192-search="${index}">Suchen</button></article>`;
  }
  function presentationSignature(input,rows){return`${normalize(input?.value)}::${rows.map(row=>[row.status,row.item?.id||row.item?.name||'',row.raw||'',row.query||'',Number(row.factor)||1,row.amountLabel||'',(row.choices||[]).map(choice=>choice.item?.id||choice.item?.name||'').join(',')].join(':')).join('|')}`}
  function renderSearchPresentation(input,rows,token=++renderToken){
    if(!input||token!==renderToken||!rows.length)return false;const node=searchHost();if(!node)return false;const complete=rows.every(row=>row.status==='matched'),signature=presentationSignature(input,rows);node.dataset.presentationV192='1';node.dataset.canonical='1';node.dataset.query=normalize(input.value);node.hidden=false;node._v192Rows=rows;suppressNormalResults(true);
    if(node.dataset.renderSignature===signature)return true;
    node.dataset.renderSignature=signature;
    const bulk=complete&&rows.length>1?'<button class="nutrition-bulk-action" type="button" data-v192-all>Alle hinzufügen</button>':'';
    node.innerHTML=`<div class="nutrition-multi-head"><div><small>Erkannte Einträge</small></div>${bulk}</div><div class="nutrition-multi-list">${rows.map(renderRow).join('')}</div>`;renderWrites++;return true;
  }
  function scheduleSearch(input,rows){clearTimeout(inputTimer);const token=++renderToken;inputTimer=setTimeout(()=>{if(input?.isConnected&&token===renderToken)renderSearchPresentation(input,rows,token)},110)}
  function addRow(row){if(!row?.item||row.status!=='matched'||row.incompatible)return false;try{return Boolean(window.CutCoachLibrary?.addCatalogItemToDay?.(row.item,{type:currentMeal(),dateKey:typeof selectedDate==='string'?selectedDate:undefined,factor:Number(row.factor)||1}))}catch{return false}}
  function normalSearch(row){const input=$('#nutritionSearch',root);if(!input)return;clearSearchPresentation();input.dataset.v192Bypass='1';input.value=row?.item?.name||row?.query||row?.raw||'';input.dispatchEvent(new Event('input',{bubbles:true}));queueMicrotask(()=>delete input.dataset.v192Bypass);try{input.focus({preventScroll:true})}catch{input.focus()}}
  function chooseRow(button){const node=button.closest('#nutritionMultiSearch'),input=$('#nutritionSearch',root);if(!node?._v192Rows||!input)return;const [rowIndex,choiceIndex]=String(button.dataset.v192Choice||'').split(':').map(Number),rows=[...node._v192Rows],row=rows[rowIndex],choice=row?.choices?.[choiceIndex];if(!choice)return;rows[rowIndex]={...row,item:choice.item,status:'matched',confidence:100,confidenceLabel:'',matchType:'user-choice',alternatives:[],choices:[],factor:Number(row.factor)||1};renderSearchPresentation(input,rows)}
  function handlePresentationClick(event){
    const target=event.target.closest?.('[data-v192-add],[data-v192-all],[data-v192-search],[data-v192-choice]');if(!target)return;const node=target.closest('#nutritionMultiSearch');if(!node?._v192Rows||node.dataset.presentationV192!=='1')return;event.preventDefault();event.stopImmediatePropagation();
    if(target.dataset.v192Choice!==undefined){chooseRow(target);return}if(target.dataset.v192Search!==undefined){normalSearch(node._v192Rows[Number(target.dataset.v192Search)]);return}if(locked.has(target))return;locked.add(target);target.disabled=true;target.setAttribute('aria-busy','true');let count=0;
    if(target.dataset.v192Add!==undefined){const row=node._v192Rows[Number(target.dataset.v192Add)];if(addRow(row)){count=1;target.innerHTML='<strong>Hinzugefügt</strong>'}else target.disabled=false}else{for(const row of node._v192Rows)if(addRow(row))count++;target.textContent=count===node._v192Rows.length?'Hinzugefügt':count?`${count}/${node._v192Rows.length} hinzugefügt`:'Erneut versuchen';if(!count)target.disabled=false}
    target.removeAttribute('aria-busy');setTimeout(()=>locked.delete(target),700);if(count){window.render?.();toast?.(count===1?'Lebensmittel hinzugefügt.':`${count} Lebensmittel hinzugefügt.`);if(target.dataset.v192All!==undefined){const input=$('#nutritionSearch',root);if(input){input.value='';input.blur()}clearSearchPresentation()}}else toast?.('Lebensmittel konnten nicht hinzugefügt werden.');
  }
  function handleInput(event){const input=event.target;if(input?.id!=='nutritionSearch'||input.dataset.v192Bypass==='1'||input.dataset.composing==='1'||input.dataset.voicePreview==='1')return;const rows=resolveRows(input.value);if(!shouldHandle(input.value,rows)){clearSearchPresentation();return}event.stopImmediatePropagation();scheduleSearch(input,rows)}
  function handleKeydown(event){const input=event.target;if(input?.id!=='nutritionSearch')return;if(event.key==='Escape'){clearSearchPresentation();return}if(event.key!=='Enter')return;const rows=resolveRows(input.value);if(!shouldHandle(input.value,rows))return;event.preventDefault();event.stopImmediatePropagation();clearTimeout(inputTimer);renderSearchPresentation(input,rows)}

  function sync(){
    frame=0;if(syncing||!root?.isConnected||!document.body.classList.contains('nutrition-mode'))return;syncing=true;
    try{root.dataset.nutritionPolishV138='1';root.dataset.searchPresentation='1.9.4';renameShortcuts();polishMealActions();decorateRows();reorderRecommendations()}finally{syncing=false}
  }
  function queue(){if(frame)return;frame=requestAnimationFrame(sync)}
  function mutationNeedsSync(record){const target=record.target?.nodeType===1?record.target:record.target?.parentElement;if(target?.closest?.('#nutritionMultiSearch'))return false;return Boolean(record.addedNodes.length||record.removedNodes.length||record.type==='characterData')}
  function start(found){root=found;observer?.disconnect();observer=new MutationObserver(records=>{if(records.some(mutationNeedsSync))queue()});observer.observe(root,{childList:true,subtree:true,characterData:true});root.addEventListener('change',queue,{passive:true});root.addEventListener('click',queue,true);queue()}
  function boot(){const found=document.querySelector('[data-screen="food"]');if(found){start(found);return}const bootstrap=new MutationObserver(()=>{const node=document.querySelector('[data-screen="food"]');if(!node)return;bootstrap.disconnect();start(node)});bootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true})}

  window.addEventListener('input',handleInput,true);window.addEventListener('keydown',handleKeydown,true);window.addEventListener('click',handlePresentationClick,true);
  document.addEventListener('compositionend',event=>{if(event.target?.id==='nutritionSearch')queueMicrotask(()=>handleInput({target:event.target,stopImmediatePropagation(){}}))},true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CutCoachNutritionPolish138=Object.freeze({version:VERSION,presentationVersion:PRESENTATION_VERSION,refresh:queue,mealAffinity,resolveRows,shouldHandle,interactionStats:()=>Object.freeze({renderWrites,pendingFrame:Boolean(frame)})});
})();
