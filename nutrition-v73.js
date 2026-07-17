'use strict';
(function(){
  const VERSION='7.3.1';
  const $=selector=>document.querySelector(selector);
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  let scheduled=false,enhancing=false;

  function everydayItems(){try{return window.CutCoachEverydayCatalog?.items?.()||[]}catch{return[]}}
  function everydayByName(name){const key=normalize(name);return everydayItems().find(item=>normalize(item.name)===key)||null}
  function icon(item){return item.category==='Bäckerei'?'🥨':item.category==='Imbiss'?'🥙':item.category==='Fast Food'?'🍔':item.category==='Kantine'?'🍽️':item.category==='Frühstück'?'🥣':'🍎'}

  function removeRedundantUi(){
    $('#nutritionEverydayQuick')?.remove();
    $('#journalCoachText')?.remove();
    const note=$('.nutrition-catalog-note');
    if(note&&!note.dataset.v73){note.dataset.v73='1';note.insertAdjacentHTML('beforeend',' · <span>CutCoach-Standardgerichte aus BLS-Zutaten</span>')}
  }

  function matchingItems(query){
    const q=normalize(query),tokens=q.split(/\s+/).filter(Boolean);if(!tokens.length)return[];
    return everydayItems().map(item=>{
      const aliases=(item.aliases||[]).map(normalize),name=normalize(item.name),search=`${name} ${aliases.join(' ')}`;
      if(!tokens.every(token=>search.includes(token)))return null;
      let score=name===q?1000:aliases.includes(q)?900:name.startsWith(q)?600:300;
      for(const token of tokens)if(name.split(' ').some(word=>word.startsWith(token)))score+=70;
      return{item,score};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.item.name.localeCompare(b.item.name,'de')).slice(0,12).map(entry=>entry.item);
  }

  function resultHtml(item){
    const amount=Number(item.amount)||100,unit=item.unit||'g',capacity=typeof mealCapacity==='function'?mealCapacity():1,meal=document.body.dataset.nutritionMealType||$('#nutritionMealSelect')?.value||'Mahlzeit';
    return `<article class="nutrition-result-row v73-everyday-row"><button class="nutrition-result-main" type="button" data-nutrition-open="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}, Portion auswählen"><span class="nutrition-result-icon" aria-hidden="true">${icon(item)}</span><span class="nutrition-result-copy"><b><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span><i class="nutrition-source standard" aria-label="CutCoach Standardgericht aus BLS-Zutaten">Standard</i></b><small>${fmt(amount,amount%1?1:0)} ${escapeHtml(unit)} · E ${fmt(item.protein,1)} · KH ${fmt(item.carbs,1)} · F ${fmt(item.fat,1)}</small></span></button><span class="nutrition-result-energy"><b>${fmt(item.calories)} kcal</b></span><button class="nutrition-result-add" type="button" data-nutrition-add="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}, direkt zu ${escapeHtml(meal)} hinzufügen" ${capacity<1?'disabled':''}>＋</button></article>`;
  }

  function enhanceResults(){
    const input=$('#nutritionSearch'),host=$('#nutritionResults');if(!input||!host)return;
    const query=input.value.trim();if(!query)return;
    const existing=new Set([...host.querySelectorAll('[data-nutrition-open]')].map(node=>node.dataset.nutritionOpen));
    const missing=matchingItems(query).filter(item=>!existing.has(item.id));
    if(!missing.length)return;
    host.querySelector('.nutrition-empty')?.remove();host.classList.remove('is-empty');host.insertAdjacentHTML('afterbegin',missing.map(resultHtml).join(''));
    const count=$('#nutritionResultCount'),current=Number((count?.textContent||'0').replace(/\D/g,''))||0;if(count)count.textContent=`${fmt(current+missing.length)} Treffer`;
  }

  function decorate(){
    const scope=$('#nutritionResultScope'),input=$('#nutritionSearch');if(scope&&input?.value.trim())scope.textContent='Bibliothek, BLS & Alltagsgerichte';
    document.querySelectorAll('.nutrition-result-row [data-nutrition-open^="ccde:"]').forEach(button=>{const title=button.querySelector('.nutrition-result-copy b');if(title&&!title.querySelector('.nutrition-source.standard'))title.insertAdjacentHTML('beforeend','<i class="nutrition-source standard" aria-label="CutCoach Standardgericht aus BLS-Zutaten">Standard</i>')});
    document.querySelectorAll('#recipeV7SearchResults [data-recipe-ingredient^="ccde:"]').forEach(button=>{const label=button.querySelector('span');if(label)label.textContent='Standard'});
    const detailTitle=$('#nutritionDetailTitle'),source=$('#nutritionDetailSource');if(detailTitle&&source&&$('#nutritionDetailModal')?.classList.contains('open')){const item=everydayByName(detailTitle.textContent);if(item){const coverage=['fiber','sugar','saturatedFat','salt'].filter(key=>item[key]!==null&&item[key]!==undefined).length;source.dataset.source='cutcoach';source.innerHTML=`<span>CutCoach Standardgericht · aus BLS 4.0 berechnet</span><small>Standardportion ${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')} · ${coverage}/4 Zusatzwerte vorhanden</small>`}}
  }

  function sync(){if(enhancing)return;enhancing=true;try{removeRedundantUi();enhanceResults();decorate()}finally{enhancing=false}}
  function queueSync(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sync()},0)}
  const observer=new MutationObserver(queueSync);observer.observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('click',queueSync,true);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',queueSync,{once:true});else queueSync();
  window.CutCoachNutritionV73=Object.freeze({version:VERSION,refresh:queueSync,matching:matchingItems});
})();
