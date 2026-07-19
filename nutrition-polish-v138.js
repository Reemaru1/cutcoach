'use strict';
(function(){
  const VERSION='1.3.8 Alpha';
  const $=(selector,scope=document)=>scope.querySelector(selector);
  const $$=(selector,scope=document)=>[...scope.querySelectorAll(selector)];
  const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  let root=null,observer=null,frame=0;

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

  function renameShortcuts(){
    const manual=$('#nutritionManual',root),create=$('#nutritionNewFood',root);
    const manualLabel=manual?.querySelector('b'),createLabel=create?.querySelector('b');
    if(manualLabel&&manualLabel.textContent!=='Schnelleingabe')manualLabel.textContent='Schnelleingabe';
    if(createLabel&&createLabel.textContent!=='Neu anlegen')createLabel.textContent='Neu anlegen';
    if(manual){manual.setAttribute('aria-label','Mahlzeit direkt mit eigenen Nährwerten eintragen');manual.title='Direkter Eintrag nur für diese Mahlzeit'}
    if(create){create.setAttribute('aria-label','Wiederverwendbares Lebensmittel anlegen');create.title='Eigenes Lebensmittel dauerhaft speichern'}
  }

  function rowName(row){return row.querySelector('.nutrition-result-copy b>span,.nutrition-result-copy b')?.textContent?.trim()||''}
  function recommendationScore(row,index,meal){
    let score=1000-index*12+mealAffinity(rowName(row),meal);
    if(row.querySelector('.nutrition-routine'))score+=520;
    if(row.querySelector('.nutrition-favorite'))score+=360;
    const fit=normalize(row.querySelector('.nutrition-result-energy i')?.textContent);
    if(fit.includes('eiweiss fit'))score+=90;
    else if(fit.includes('budget fit'))score+=55;
    if(row.classList.contains('v73-everyday-row'))score+=25;
    return score;
  }

  function reorderRecommendations(){
    const host=$('#nutritionResults',root),input=$('#nutritionSearch',root),active=$('[data-nutrition-filter].active',root);
    if(!host||input?.value.trim()||active?.dataset.nutritionFilter!=='all')return;
    const rows=$$(':scope > .nutrition-result-row',host);
    if(rows.length<2)return;
    const meal=currentMeal();
    const sorted=rows.map((row,index)=>({row,index,score:recommendationScore(row,index,meal)})).sort((left,right)=>right.score-left.score||left.index-right.index).map(entry=>entry.row);
    if(sorted.every((row,index)=>row===rows[index]))return;
    const fragment=document.createDocumentFragment();
    sorted.forEach(row=>fragment.append(row));
    host.append(fragment);
    host.dataset.mealRanked=meal;
  }

  function decorateRows(){
    $$('.nutrition-result-row',root).forEach(row=>{
      row.dataset.nutritionPolish='1';
      const source=row.querySelector('.nutrition-source');
      if(source)source.setAttribute('title',source.getAttribute('aria-label')||source.textContent.trim());
      const add=row.querySelector('.nutrition-result-add');
      if(add&&!add.title)add.title=add.getAttribute('aria-label')||'Hinzufügen';
    });
  }

  function sync(){
    frame=0;
    if(!root?.isConnected||!document.body.classList.contains('nutrition-mode'))return;
    root.dataset.nutritionPolishV138='1';
    renameShortcuts();decorateRows();reorderRecommendations();
  }
  function queue(){if(frame)return;frame=requestAnimationFrame(sync)}
  function start(found){
    root=found;
    observer?.disconnect();
    observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length||record.type==='characterData'))queue()});
    observer.observe(root,{childList:true,subtree:true,characterData:true});
    root.addEventListener('input',queue,{passive:true});
    root.addEventListener('change',queue,{passive:true});
    root.addEventListener('click',queue,true);
    queue();
  }
  function boot(){const found=document.querySelector('[data-screen="food"]');if(found){start(found);return}const bootstrap=new MutationObserver(()=>{const node=document.querySelector('[data-screen="food"]');if(!node)return;bootstrap.disconnect();start(node)});bootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.CutCoachNutritionPolish138=Object.freeze({version:VERSION,refresh:queue,mealAffinity});
})();