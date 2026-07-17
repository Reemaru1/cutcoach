'use strict';
(function(){
  const VERSION='1.2.0-alpha';
  const $=selector=>document.querySelector(selector);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const numberWords={ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,fünf:5,sechs:6};
  let lastSignature='',renderToken=0;

  function allItems(){
    let personal=[];let catalog=[];
    try{personal=window.CutCoachLibrary?.exportData?.().items||[]}catch{}
    try{catalog=window.CutCoachFoodCatalog?.items?.()||[]}catch{}
    const seen=new Set();return [...personal,...catalog].filter(item=>{const key=String(item.id);if(seen.has(key))return false;seen.add(key);return item&&item.name});
  }
  function cleanPart(raw){
    let value=String(raw||'').trim().replace(/^(?:ich\s+(?:hatte|habe|esse|trinke)|bitte|noch|dazu)\s+/i,'');
    value=value.replace(/^(?:ein(?:e|en|er|es)?|der|die|das)\s+/i,'').trim();
    const quantityMatch=value.match(/^(\d+(?:[.,]\d+)?|ein(?:e|en|er|es)?|zwei|drei|vier|f(?:ü|ue)nf|sechs)\s*(?:(kg|g|gramm|ml|l|liter|stück|stueck|portion(?:en)?)\b)?\s*/i);
    let quantity=1,unit=null;
    if(quantityMatch){const token=normalize(quantityMatch[1]);quantity=Number(quantityMatch[1]?.replace(',','.'))||numberWords[token]||1;unit=quantityMatch[2]||null;value=value.slice(quantityMatch[0].length).trim()}
    value=value.replace(/^(?:von|vom)\s+/i,'').trim();
    return{raw:String(raw||'').trim(),query:value,quantity:Math.max(1,quantity),unit};
  }
  function parseSentence(value){
    const raw=String(value||'').trim();if(!raw)return[];
    const separators=/\s+(?:und|plus|sowie|mit dazu)\s+|\s*[,;+&]\s*/i;
    const parts=raw.split(separators).map(cleanPart).filter(part=>normalize(part.query).length>=2);
    return parts.length>1?parts.slice(0,6):[];
  }
  function aliases(item){return [item.name,...(Array.isArray(item.aliases)?item.aliases:[item.aliases])].filter(Boolean).map(normalize)}
  function score(item,query){
    const q=normalize(query);if(!q)return-1;const names=aliases(item),compact=q.replace(/\s/g,'');let best=-1;
    for(const name of names){const compactName=name.replace(/\s/g,'');let value=-1;if(name===q)value=1200;else if(compactName===compact)value=1150;else if(name.startsWith(q))value=900;else if(name.includes(q))value=720;else if(q.includes(name)&&name.length>=4)value=620;else{const tokens=q.split(' ');if(tokens.every(token=>name.includes(token)))value=540}best=Math.max(best,value)}
    if(best<0)return best;return best+Number(Boolean(item.favorite))*60+Math.min(80,Number(item.uses)||0)+Number(item.source==='cutcoach')*35;
  }
  function bestMatch(part,items){return items.map(item=>({item,score:score(item,part.query)})).filter(entry=>entry.score>=0).sort((a,b)=>b.score-a.score||String(a.item.name).localeCompare(String(b.item.name),'de'))[0]?.item||null}
  function ensureHost(){
    const card=$('.nutrition-search-card');if(!card)return null;let host=$('#nutritionMultiSearch');if(host)return host;
    host=document.createElement('section');host.id='nutritionMultiSearch';host.className='nutrition-multi-search';host.hidden=true;host.setAttribute('aria-live','polite');card.after(host);return host;
  }
  function addOne(match,part){
    if(!match)return false;const type=document.body.dataset.nutritionMealType||'Frühstück',options={type,dateKey:typeof selectedDate==='string'?selectedDate:undefined};
    if(part.quantity>1&&!part.unit)options.factor=part.quantity;
    try{const result=match.catalog||match.source==='bls'||match.source==='cutcoach'?window.CutCoachLibrary?.addCatalogItemToDay?.(match,options):window.CutCoachLibrary?.addItemToDay?.(match.id,options);return Boolean(result)}catch(error){console.error('CutCoach multi-search add failed',error);return false}
  }
  function render(){
    const input=$('#nutritionSearch'),host=ensureHost();if(!input||!host)return;
    const parts=parseSentence(input.value),signature=parts.map(part=>`${part.query}:${part.quantity}:${part.unit||''}`).join('|');
    if(!parts.length){host.hidden=true;host.innerHTML='';lastSignature='';return}
    if(signature===lastSignature&&host.innerHTML)return;lastSignature=signature;const token=++renderToken;const items=allItems();const rows=parts.map(part=>({part,match:bestMatch(part,items)}));if(token!==renderToken)return;
    host.hidden=false;host.innerHTML=`<div class="nutrition-multi-head"><div><small>Mehrfachsuche erkannt</small><b>${rows.length} Lebensmittel</b></div><button type="button" data-multi-add-all ${rows.some(row=>!row.match)?'disabled':''}>Alle hinzufügen</button></div><div class="nutrition-multi-list">${rows.map((row,index)=>`<article class="${row.match?'matched':'missing'}"><span>${row.match?'✓':'?'}</span><div><small>${escapeHtml(row.part.raw)}</small><b>${row.match?escapeHtml(row.match.name):'Kein eindeutiger Treffer'}</b>${row.part.quantity>1?`<em>${row.part.quantity}× erkannt</em>`:''}</div><button type="button" data-multi-add="${index}" ${row.match?'':'disabled'} aria-label="${row.match?escapeHtml(row.match.name)+' hinzufügen':'Kein Treffer'}">＋</button></article>`).join('')}</div>`;
    host._rows=rows;
  }
  function schedule(){queueMicrotask(render)}
  document.addEventListener('input',event=>{if(event.target?.id==='nutritionSearch')schedule()});
  document.addEventListener('click',event=>{
    const host=event.target.closest?.('#nutritionMultiSearch');if(!host)return;
    const rows=host._rows||[];const one=event.target.closest('[data-multi-add]');const all=event.target.closest('[data-multi-add-all]');if(!one&&!all)return;
    event.preventDefault();event.stopImmediatePropagation();
    let added=0;if(one){const row=rows[Number(one.dataset.multiAdd)];if(row?.match&&addOne(row.match,row.part)){added=1;one.disabled=true;one.textContent='✓'}}else{for(const row of rows)if(row.match&&addOne(row.match,row.part))added++;all.disabled=true;all.textContent='Hinzugefügt'}
    if(added){window.render?.();toast?.(added===1?'Lebensmittel hinzugefügt.':`${added} Lebensmittel hinzugefügt.`)}else toast?.('Lebensmittel konnten nicht hinzugefügt werden.');
  },true);
  const observer=new MutationObserver(schedule);observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
  window.CutCoachNutritionMultiSearch120=Object.freeze({version:VERSION,parse:parseSentence,refresh:render});
})();