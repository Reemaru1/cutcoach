'use strict';
(function(){
  const VERSION='1.2.6-alpha';
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const numberWords={ein:1,eine:1,einen:1,einer:1,eins:1,zwei:2,drei:3,vier:4,fuenf:5,sechs:6};
  const FIXED={
    cola:{id:'cutcoach-standard-cola',name:'Cola',aliases:['Coca-Cola'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:139,protein:0,carbs:35,fat:0,fiber:0,sugar:35,saturatedFat:0,salt:.03},
    spezi:{id:'cutcoach-standard-spezi',name:'Spezi',aliases:['Cola-Orange-Mix'],category:'Getränke',source:'cutcoach',catalog:true,amount:330,unit:'ml',calories:142,protein:0,carbs:35,fat:0,fiber:0,sugar:34,saturatedFat:0,salt:.03}
  };
  const CATALOG_IDS={doener:'ccde:doner-kalb',dueruem:'ccde:durum-kalb',butterbreze:'ccde:butterbrezel',kaesesemmel:'ccde:kaesesemmel'};
  function clean(raw){
    let text=normalize(raw).replace(/^(?:ich hatte|ich habe|ich esse|ich trinke|bitte|noch|dazu)\s+/,'');
    let quantity=1;
    const match=text.match(/^(\d+|ein(?:e|en|er|es)?|zwei|drei|vier|fuenf|sechs)\s+/);
    if(match){quantity=Number(match[1])||numberWords[match[1]]||1;text=text.slice(match[0].length)}
    return{raw:String(raw||'').trim(),query:text.trim(),quantity:Math.max(1,quantity)};
  }
  function keyFor(query){
    const q=normalize(query);
    if(q==='cola'||q==='coca cola')return'cola';
    if(q==='spezi'||q==='cola orange'||q==='cola mix')return'spezi';
    if(q==='doner'||q==='doener'||q==='kebab'||q==='kebap')return'doener';
    if(q==='durum'||q==='dueruem'||q==='yufka')return'dueruem';
    if(q==='butterbreze'||q==='butterbrezel'||q==='butterbrezn')return'butterbreze';
    if(q==='kasesemmel'||q==='kaesesemmel'||q==='kase semmel'||q==='kasebrotchen')return'kaesesemmel';
    return null;
  }
  function parse(value){
    const parts=String(value||'').split(/\s+(?:und|plus|sowie)\s+|\s*[,;+&]\s*/i).map(clean).filter(row=>row.query.length>=2);
    return parts.map(row=>({...row,key:keyFor(row.query)}));
  }
  function itemFor(key){
    if(FIXED[key])return FIXED[key];
    const id=CATALOG_IDS[key];
    return id?(window.CutCoachEverydayCatalog?.get?.(id)||window.CutCoachFoodCatalog?.get?.(id)||null):null;
  }
  function recognizedRows(value){
    const parts=parse(value);
    if(parts.length<2||parts.some(row=>!row.key))return[];
    const rows=parts.map(row=>({...row,item:itemFor(row.key)}));
    return rows.every(row=>row.item)?rows:[];
  }
  function add(row){
    try{
      const options={type:document.body.dataset.nutritionMealType||'Frühstück',dateKey:typeof selectedDate==='string'?selectedDate:undefined};
      if(row.quantity>1)options.factor=row.quantity;
      return Boolean(window.CutCoachLibrary?.addCatalogItemToDay?.(row.item,options));
    }catch{return false}
  }
  function host(){
    let node=document.querySelector('#nutritionMultiSearch');
    if(node)return node;
    const card=document.querySelector('.nutrition-search-card');
    if(!card)return null;
    node=document.createElement('section');node.id='nutritionMultiSearch';node.className='nutrition-multi-search';card.after(node);return node;
  }
  function suppressNormalResults(active){
    document.body.classList.toggle('canonical-multisearch-active',active);
    for(const node of document.querySelectorAll('[data-nutrition-results],.nutrition-results,.nutrition-results-section,.nutrition-empty-state'))node.hidden=active;
  }
  function render(input){
    const rows=recognizedRows(input.value),node=host();
    if(!node)return false;
    if(!rows.length){if(node.dataset.canonical==='1'){node.hidden=true;node.replaceChildren();delete node.dataset.canonical}suppressNormalResults(false);return false}
    node.dataset.canonical='1';node.hidden=false;node._canonicalRows=rows;suppressNormalResults(true);
    node.innerHTML=`<div class="nutrition-multi-head"><div><small>Mehrfachsuche erkannt</small><b>${rows.length} Lebensmittel</b></div><button type="button" data-canonical-all>Alle hinzufügen</button></div><div class="nutrition-multi-list">${rows.map((row,index)=>`<article class="matched"><span>✓</span><div><small>${escapeHtml(row.raw)}</small><b>${escapeHtml(row.item.name)}</b>${row.quantity>1?`<em>${row.quantity}× erkannt</em>`:''}</div><button type="button" data-canonical-add="${index}" aria-label="${escapeHtml(row.item.name)} hinzufügen">＋</button></article>`).join('')}</div>`;
    return true;
  }
  let timer=0;
  document.addEventListener('input',event=>{
    if(event.target?.id!=='nutritionSearch')return;
    const rows=recognizedRows(event.target.value);
    if(!rows.length){clearTimeout(timer);render(event.target);return}
    event.preventDefault();event.stopImmediatePropagation();clearTimeout(timer);timer=setTimeout(()=>render(event.target),120);
  },true);
  document.addEventListener('click',event=>{
    const node=event.target.closest?.('#nutritionMultiSearch');if(!node?._canonicalRows||node.dataset.canonical!=='1')return;
    const one=event.target.closest('[data-canonical-add]'),all=event.target.closest('[data-canonical-all]');if(!one&&!all)return;
    event.preventDefault();event.stopImmediatePropagation();let count=0;
    if(one){const row=node._canonicalRows[Number(one.dataset.canonicalAdd)];if(row&&add(row)){count=1;one.disabled=true;one.textContent='✓'}}
    else{for(const row of node._canonicalRows)if(add(row))count++;all.disabled=true;all.textContent='Hinzugefügt'}
    if(count){window.render?.();toast?.(count===1?'Lebensmittel hinzugefügt.':`${count} Lebensmittel hinzugefügt.`)}
  },true);
  const initial=()=>{const input=document.querySelector('#nutritionSearch');if(input)render(input)};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initial,{once:true});else queueMicrotask(initial);
  window.CutCoachCanonicalMultiSearch126=Object.freeze({version:VERSION,parse,recognizedRows,render});
})();