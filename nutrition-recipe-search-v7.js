'use strict';
(function(){
  const $=selector=>document.querySelector(selector);
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const compact=value=>normalized(value).replace(/\s+/g,'');
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  function distanceWithin(left,right,limit){
    if(left===right)return 0;if(Math.abs(left.length-right.length)>limit)return limit+1;
    let previous=Array.from({length:right.length+1},(_,index)=>index);
    for(let row=1;row<=left.length;row++){
      const current=[row];let best=current[0];
      for(let column=1;column<=right.length;column++){const value=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+Number(left[row-1]!==right[column-1]));current[column]=value;best=Math.min(best,value)}
      if(best>limit)return limit+1;previous=current;
    }
    return previous[right.length];
  }
  function score(item,query){
    const name=normalized(item.name),nameCompact=compact(item.name),queryCompact=compact(query),tokens=normalized(query).split(/\s+/).filter(Boolean);
    const compactHit=nameCompact.includes(queryCompact)||queryCompact.includes(nameCompact);
    const tokenHit=tokens.every(token=>name.includes(token)||nameCompact.includes(compact(token)));
    const fuzzy=queryCompact.length>=4&&distanceWithin(queryCompact,nameCompact,queryCompact.length>=9?2:1)<= (queryCompact.length>=9?2:1);
    if(!compactHit&&!tokenHit&&!fuzzy)return null;
    let value=0;if(nameCompact===queryCompact)value+=1200;else if(nameCompact.startsWith(queryCompact))value+=700;else if(compactHit)value+=400;if(tokenHit)value+=220;if(fuzzy)value+=60;value+=Number(Boolean(item.favorite))*80+Math.min(100,Number(item.uses)||0);return value;
  }
  function candidates(query){
    let personal=[];try{personal=window.CutCoachLibrary?.exportData?.().items?.filter(item=>item.kind==='food')||[]}catch{}
    let catalog=[];try{catalog=window.CutCoachFoodCatalog?.items?.()||[]}catch{}
    const seen=new Set(),items=[];
    for(const item of [...personal,...catalog]){const key=String(item.id);if(seen.has(key))continue;seen.add(key);const rank=score(item,query);if(rank!==null)items.push({item,rank})}
    return items.sort((a,b)=>b.rank-a.rank||String(a.item.name).localeCompare(String(b.item.name),'de')).slice(0,24).map(entry=>entry.item);
  }
  function enhance(input){
    const host=$('#recipeV7SearchResults'),query=String(input.value||'').trim();if(!host||!query||host.querySelector('[data-recipe-ingredient]'))return;
    const items=candidates(query);if(!items.length)return;
    host.innerHTML=items.map(item=>`<button type="button" data-recipe-ingredient="${escapeHtml(item.id)}"><span>${item.source==='bls'?'BLS':item.source==='off'?'Produkt':'Eigene'}</span><b>${escapeHtml(item.name)}</b><small>${fmt(item.calories)} kcal · ${fmt(item.protein,1)} g E · Basis ${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')}</small></button>`).join('');
  }
  document.addEventListener('input',event=>{if(event.target?.id!=='recipeV7Search')return;queueMicrotask(()=>enhance(event.target))});
})();
