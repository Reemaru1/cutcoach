'use strict';
(function(){
  const VERSION='1.2.9-alpha';
  const DEBOUNCE_MS=180;
  const INDEX_TTL=30000;
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const numberWords={ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6,sieben:7,acht:8,neun:9,zehn:10};
  const quantityTokens=new Set(Object.keys(numberWords));
  const FIXED={
    cola:{id:'cutcoach-standard-cola',name:'Cola',aliases:['Coca-Cola'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,fiber:0,sugar:35,saturatedFat:0,salt:.03},
    spezi:{id:'cutcoach-standard-spezi',name:'Spezi',aliases:['Cola-Orange-Mix'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:142,protein:0,carbs:35,fat:0,fiber:0,sugar:34,saturatedFat:0,salt:.03},
    kaesebrot:{id:'cutcoach-standard-kaesebrot',name:'Käsebrot',aliases:['Brot mit Käse'],category:'Brotzeit',source:'cutcoach',catalog:true,amount:90,unit:'g',calories:255,protein:12,carbs:26,fat:11,fiber:3,sugar:2,saturatedFat:7,salt:1.15}
  };
  const CATALOG_IDS={doener:'ccde:doner-kalb',dueruem:'ccde:durum-kalb',butterbreze:'ccde:butterbrezel',kaesesemmel:'ccde:kaesesemmel'};
  const ALIASES=new Map([
    ['cola','cola'],['coca cola','cola'],['cocacola','cola'],['spezi','spezi'],['cola orange','spezi'],['cola mix','spezi'],
    ['doner','doener'],['doener','doener'],['kebab','doener'],['kebap','doener'],['durum','dueruem'],['dueruem','dueruem'],['yufka','dueruem'],
    ['butterbreze','butterbreze'],['butterbrezel','butterbreze'],['butterbrezn','butterbreze'],['kasesemmel','kaesesemmel'],['kaesesemmel','kaesesemmel'],['kase semmel','kaesesemmel'],['kasebrotchen','kaesesemmel'],
    ['kasebrot','kaesebrot'],['kaesebrot','kaesebrot'],['brot mit kase','kaesebrot']
  ]);
  const aliasPhrases=[...ALIASES.keys()].sort((a,b)=>b.split(' ').length-a.split(' ').length);
  const locked=new WeakSet();
  let exactIndex=null,indexBuiltAt=0,timer=0,renderToken=0;
  const quantityOf=token=>/^\d+$/.test(token)?Math.max(1,Number(token)):numberWords[token]||1;
  const isQuantity=token=>/^\d+$/.test(token)||quantityTokens.has(token);
  const cleanPrefix=value=>normalize(value).replace(/^(?:ich hatte|ich habe|ich esse|ich trinke|bitte|noch|dazu)\s+/,'');
  const keyFor=query=>ALIASES.get(normalize(query))||null;
  function itemForKey(key){if(FIXED[key])return FIXED[key];const id=CATALOG_IDS[key];return id?(window.CutCoachEverydayCatalog?.get?.(id)||window.CutCoachFoodCatalog?.get?.(id)||null):null}
  function buildExactIndex(){
    if(exactIndex&&Date.now()-indexBuiltAt<INDEX_TTL)return exactIndex;
    const map=new Map();let items=[];
    try{items=[...(window.CutCoachLibrary?.exportData?.().items||[]),...(window.CutCoachFoodCatalog?.items?.()||[])]}catch{}
    for(const item of items){
      const names=[item.name,...(Array.isArray(item.aliases)?item.aliases:[item.aliases])].filter(Boolean).map(normalize);
      for(const name of names){if(!name)continue;const existing=map.get(name);if(!existing)map.set(name,item);else if(String(existing.id)!==String(item.id))map.set(name,null)}
    }
    exactIndex=map;indexBuiltAt=Date.now();return map;
  }
  function strictCatalogMatch(query){const item=buildExactIndex().get(normalize(query));return item||null}
  function parseDelimited(value){return String(value||'').split(/\s+(?:und|plus|sowie)\s+|\s*[,;+&]\s*/i).map(raw=>{let text=cleanPrefix(raw),quantity=1;const match=text.match(/^(\d+|ein(?:e|en|er|es)?|zwei|drei|vier|fuenf|sechs|sieben|acht|neun|zehn)\s+/);if(match){quantity=quantityOf(match[1]);text=text.slice(match[0].length)}return{raw:String(raw||'').trim(),query:text.trim(),quantity}}).filter(row=>row.query.length>=2)}
  function parseSequential(value){const text=cleanPrefix(value);const tokens=text.split(' ').filter(Boolean),rows=[];let index=0;while(index<tokens.length){let quantity=1;const start=index;if(isQuantity(tokens[index])){quantity=quantityOf(tokens[index]);index++}let matched=null;for(const phrase of aliasPhrases){const words=phrase.split(' ');if(tokens.slice(index,index+words.length).join(' ')===phrase){matched={phrase,key:ALIASES.get(phrase),length:words.length};break}}if(!matched)return[];rows.push({raw:tokens.slice(start,index+matched.length).join(' '),query:matched.phrase,quantity,key:matched.key});index+=matched.length}return rows.length>=2?rows:[]}
  function parse(value){const delimited=parseDelimited(value);if(delimited.length>=2)return delimited.map(row=>({...row,key:keyFor(row.query)}));return parseSequential(value)}
  function rowsFor(value){const parts=parse(value);if(parts.length<2)return[];return parts.map(part=>{const key=part.key||keyFor(part.query),item=key?itemForKey(key):strictCatalogMatch(part.query);return{...part,key,item:item||null,status:item?'matched':'missing'}})}
  function likelyMulti(value){const text=cleanPrefix(value);if(!text)return false;if(/\s+(?:und|plus|sowie)\s+|[,;+&]/i.test(String(value||'')))return true;const tokens=text.split(' ').filter(Boolean);let recognized=0;for(let i=0;i<tokens.length;i++){if(isQuantity(tokens[i]))continue;for(const phrase of aliasPhrases){const words=phrase.split(' ');if(tokens.slice(i,i+words.length).join(' ')===phrase){recognized++;i+=words.length-1;break}}}return recognized>=2}
  function add(row){if(!row.item)return false;try{const options={type:document.body.dataset.nutritionMealType||'Frühstück',dateKey:typeof selectedDate==='string'?selectedDate:undefined};if(row.quantity>1)options.factor=row.quantity;return Boolean(window.CutCoachLibrary?.addCatalogItemToDay?.(row.item,options))}catch{return false}}
  function host(){let node=document.querySelector('#nutritionMultiSearch');if(node)return node;const card=document.querySelector('.nutrition-search-card');if(!card)return null;node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search intelligent-search';card.after(node);return node}
  function suppressNormalResults(active){document.body.classList.toggle('canonical-multisearch-active',active);for(const node of document.querySelectorAll('[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state'))node.hidden=active}
  function clearResult(){const node=document.querySelector('#nutritionMultiSearch');if(node?.dataset.canonical==='1'){node.hidden=true;node.replaceChildren();delete node.dataset.canonical;delete node._canonicalRows}suppressNormalResults(false)}
  function render(input,token=++renderToken){if(token!==renderToken)return false;const rows=rowsFor(input.value),node=host();if(!node)return false;if(!rows.length){clearResult();return false}const complete=rows.every(row=>row.item);node.dataset.canonical='1';node.hidden=false;node._canonicalRows=rows;suppressNormalResults(true);node.innerHTML=`<div class="nutrition-multi-head"><div><small>Intelligente Suche</small><b>${rows.length} Lebensmittel erkannt</b></div><button type="button" data-canonical-all ${complete?'':'disabled'}>${complete?'Alle hinzufügen':'Auswahl prüfen'}</button></div><div class="nutrition-multi-list">${rows.map((row,index)=>row.item?`<article class="matched"><span>✓</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${row.quantity>1?`<em>${row.quantity}× erkannt</em>`:''}</div><button type="button" data-canonical-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen">＋</button></article>`:`<article class="missing"><span>?</span><div><small>${escapeHtml(row.raw)}</small><b>Kein sicherer Treffer</b><em>Begriff einzeln suchen oder manuell anlegen</em></div><button type="button" disabled>＋</button></article>`).join('')}</div>`;return true}
  function schedule(input){clearTimeout(timer);const token=++renderToken;timer=setTimeout(()=>{if(input.isConnected)render(input,token)},DEBOUNCE_MS)}
  document.addEventListener('compositionstart',event=>{if(event.target?.id==='nutritionSearch')event.target.dataset.composing='1'},true);
  document.addEventListener('compositionend',event=>{if(event.target?.id!=='nutritionSearch')return;delete event.target.dataset.composing;if(likelyMulti(event.target.value))schedule(event.target)},true);
  document.addEventListener('input',event=>{if(event.target?.id!=='nutritionSearch'||event.target.dataset.composing==='1'||event.target.dataset.voicePreview==='1')return;if(!likelyMulti(event.target.value)){clearTimeout(timer);renderToken++;clearResult();return}event.preventDefault();event.stopImmediatePropagation();schedule(event.target)},true);
  document.addEventListener('click',event=>{const node=event.target.closest?.('#nutritionMultiSearch');if(!node?._canonicalRows||node.dataset.canonical!=='1')return;const one=event.target.closest('[data-canonical-add]'),all=event.target.closest('[data-canonical-all]');if(!one&&!all)return;if(locked.has(one||all))return;event.preventDefault();event.stopImmediatePropagation();const button=one||all;locked.add(button);button.disabled=true;button.setAttribute('aria-busy','true');let count=0;if(one){const row=node._canonicalRows[Number(one.dataset.canonicalAdd)];if(row&&add(row)){count=1;one.textContent='✓'}else one.disabled=false}else{if(node._canonicalRows.some(row=>!row.item)){all.disabled=true;return}for(const row of node._canonicalRows)if(add(row))count++;all.textContent=count?'Hinzugefügt':'Erneut versuchen'}button.removeAttribute('aria-busy');setTimeout(()=>locked.delete(button),700);if(count){window.render?.();toast?.(count===1?'Lebensmittel hinzugefügt.':`${count} Lebensmittel hinzugefügt.`)}},true);
  const initial=()=>{const input=document.querySelector('#nutritionSearch');if(input&&likelyMulti(input.value))schedule(input)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initial,{once:true});else queueMicrotask(initial);
  window.addEventListener('cutcoach:catalog-updated',()=>{exactIndex=null;indexBuiltAt=0});
  window.CutCoachIntelligentSearch128=Object.freeze({version:VERSION,parse,rowsFor,render,likelyMulti,invalidateIndex:()=>{exactIndex=null;indexBuiltAt=0}});
})();