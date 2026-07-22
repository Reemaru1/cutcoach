'use strict';

(function(root){
  const VERSION='2.1.1-alpha';
  const $=(selector,scope=document)=>scope?.querySelector?.(selector)||null;
  const $$=(selector,scope=document)=>[...(scope?.querySelectorAll?.(selector)||[])];
  const ICONS=Object.freeze({
    day:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>',
    meal:'<svg viewBox="0 0 24 24"><path d="M7 3v7M4 3v5a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 1.2 4 4.1 4 7h-4"/></svg>',
    search:'<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>',
    voice:'<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/></svg>',
    barcode:'<svg viewBox="0 0 24 24"><path d="M4 5v14M7 5v14M11 5v14M14 5v14M19 5v14M17 5v14"/></svg>',
    edit:'<svg viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10-3.5-3.5-10 10L4 20Z"/><path d="m13.5 7 3.5 3.5"/></svg>',
    plus:'<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
    recipe:'<svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg>',
    food:'<svg viewBox="0 0 24 24"><path d="M7 3v7M4 3v5a3 3 0 0 0 6 0V3M7 10v11M16 3v18M16 3c3 1.2 4 4.1 4 7h-4"/></svg>',
    scan:'<svg viewBox="0 0 24 24"><path d="M4 8V4h4M16 4h4v4M20 16v4h-4M8 20H4v-4"/><path d="M7 12h10"/></svg>',
    camera:'<svg viewBox="0 0 24 24"><path d="M4 7h4l2-2h4l2 2h4v12H4V7Z"/><circle cx="12" cy="13" r="4"/></svg>',
    light:'<svg viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M8.5 14.5A6 6 0 1 1 15.5 14.5c-1 .8-1.5 1.7-1.5 2.5h-4c0-.8-.5-1.7-1.5-2.5Z"/></svg>',
    retry:'<svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M6.1 8.2A7 7 0 0 1 18.7 9M17.9 15.8A7 7 0 0 1 5.3 15"/></svg>',
    check:'<svg viewBox="0 0 24 24"><path d="m5 12 4 4 10-10"/></svg>',
    heart:'<svg viewBox="0 0 24 24"><path d="M20 8.5c0 5-8 10-8 10s-8-5-8-10A4.5 4.5 0 0 1 12 5.7a4.5 4.5 0 0 1 8 2.8Z"/></svg>'
  });
  let scheduled=false,observer=null,bound=false;

  function icon(name){return `<span class="nutrition-v210-icon" aria-hidden="true">${ICONS[name]||ICONS.food}</span>`}
  function setIcon(node,name){if(!node||node.dataset.nutritionV210Icon===name)return;node.dataset.nutritionV210Icon=name;node.innerHTML=ICONS[name]||ICONS.food;node.classList.add('nutrition-v210-icon');node.setAttribute('aria-hidden','true')}
  function setText(node,value){if(node&&node.textContent!==value)node.textContent=value}
  function numberFrom(node){const match=String(node?.textContent||'').replace(/\./g,'').replace(',','.').match(/-?\d+(?:\.\d+)?/);return match?Number(match[0]):0}

  function ensureDayCard(screen){
    const mealCard=$('.nutrition-meal-card',screen),summary=$('.nutrition-meal-summary',mealCard);if(!mealCard||!summary)return;
    let day=$('.nutrition-v210-day-card',screen);
    if(!day){
      day=document.createElement('section');day.className='nutrition-v210-day-card';day.setAttribute('aria-labelledby','nutritionV210DayTitle');day.innerHTML=`<div class="nutrition-v210-section-head">${icon('day')}<div><small>Dein Tageskurs</small><h2 id="nutritionV210DayTitle">Tagesbilanz</h2></div><span id="nutritionV210DayStatus"></span></div>`;mealCard.before(day);
    }
    for(const selector of ['.nutrition-day-budget','.nutrition-coach-row','.nutrition-macro-compass','#nutritionV7Analysis']){const node=$(selector,screen);if(node&&node.parentElement!==day)day.append(node)}
    mealCard.classList.add('nutrition-v210-meal-card');
    setText($('.nutrition-meal-copy small',summary),'Aktuelle Mahlzeit');
    const previous=$('#nutritionCopyPrevious',summary);if(previous){previous.childNodes[0].textContent='Von gestern ';previous.setAttribute('aria-label','Einträge von gestern übernehmen')}
    const budget=$('#nutritionDayBudgetLabel',day),status=$('#nutritionV210DayStatus',day);if(status&&budget){const isOver=/über/i.test(budget.textContent);setText(status,isOver?'Über Tagesziel':'Noch im Budget');status.classList.toggle('is-over',isOver);status.classList.toggle('is-good',!isOver)}
  }

  function enhanceAnalysis(screen){
    const analysis=$('#nutritionV7Analysis',screen),head=$('.nutrition-v7-analysis-head',analysis);if(!analysis||!head||analysis.dataset.nutritionV211Toggle==='1')return;
    analysis.dataset.nutritionV211Toggle='1';analysis.classList.add('is-collapsed');head.tabIndex=0;head.setAttribute('role','button');head.setAttribute('aria-expanded','false');head.setAttribute('aria-label','Zusatzwerte anzeigen');
    const toggle=()=>{const collapsed=analysis.classList.toggle('is-collapsed');head.setAttribute('aria-expanded',String(!collapsed));head.setAttribute('aria-label',collapsed?'Zusatzwerte anzeigen':'Zusatzwerte ausblenden')};
    head.addEventListener('click',toggle);head.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();toggle()}});
  }

  function polishMain(screen){
    screen.classList.add('nutrition-v210');document.body.classList.toggle('nutrition-v210-active',screen.classList.contains('active'));
    ensureDayCard(screen);
    const searchIcon=$('.nutrition-search-row>span',screen);setIcon(searchIcon,'search');setIcon($('#nutritionVoice',screen),'voice');
    const shortcutConfig=[['#nutritionBarcode','barcode','Barcode'],['#nutritionManual','edit','Schnelleingabe'],['#nutritionNewFood','plus','Lebensmittel'],['#nutritionRecipe','recipe','Rezept']];
    for(const [selector,name,label] of shortcutConfig){const button=$(selector,screen);if(!button)continue;setIcon($('span',button),name);setText($('b',button),label)}
    const scope=$('#nutritionResultScope',screen);if(scope&&/BLS|Bibliothek/i.test(scope.textContent))setText(scope,'Lebensmitteldatenbank');
    const note=$('.nutrition-catalog-note',screen);if(note&&!note.closest('details')){const details=document.createElement('details');details.className='nutrition-v210-sources';details.innerHTML='<summary>Datenquellen & Hinweise</summary>';note.before(details);details.append(note)}
    $$('.nutrition-result-row',screen).forEach(row=>{const target=$('.nutrition-result-icon',row);setIcon(target,'food');const add=$('.nutrition-result-add',row);if(add){add.textContent='+';add.setAttribute('title','Hinzufügen')}});
    $$('.nutrition-current-main>span:first-child',screen).forEach(node=>setIcon(node,'check'));
    enhanceAnalysis(screen);
  }

  function decorateModal(selector,kind,intro=''){
    const modal=$(selector),sheet=$('.sheet',modal),head=$('.sheet-head',sheet);if(!modal||!sheet||!head)return;
    modal.classList.add('nutrition-v210-modal');sheet.classList.add('nutrition-v210-sheet');
    const handles=$$('.nutrition-v210-handle,.cc-sheet-handle',sheet);let handle=handles[0];if(!handle){handle=document.createElement('span');handle.setAttribute('aria-hidden','true')}handle.classList.add('nutrition-v210-handle','cc-sheet-handle');handles.slice(1).forEach(node=>node.remove());sheet.prepend(handle);
    head.classList.add('nutrition-v210-sheet-head','cc-sheet-head');
    const icons=$$('.nutrition-v210-title-icon,.cc-sheet-title-icon',head);let titleIcon=icons[0];if(!titleIcon)titleIcon=document.createElement('span');titleIcon.classList.add('nutrition-v210-title-icon','cc-sheet-title-icon');titleIcon.innerHTML=ICONS[kind]||ICONS.food;titleIcon.setAttribute('aria-hidden','true');icons.slice(1).forEach(node=>node.remove());head.prepend(titleIcon);
    const close=$('button[aria-label="Schließen"],button[aria-label="Schliessen"]',head);if(close){close.classList.add('nutrition-v210-close','cc-sheet-close');head.append(close)}
    if(intro){const intros=$$('.nutrition-v210-intro,.cc-meal-intro',sheet);let note=intros[0];if(!note)note=document.createElement('p');note.classList.add('nutrition-v210-intro');if(selector==='#mealModal')note.classList.add('cc-sheet-intro','cc-meal-intro');setText(note,intro);intros.slice(1).forEach(node=>node.remove());head.after(note)}
  }

  function validPositive(selector){const value=Number(String($(selector)?.value||'').replace(',','.'));return Number.isFinite(value)&&value>0}
  function validateForms(){
    const mealSave=$('#saveMeal');if(mealSave)mealSave.disabled=!$('#mealName')?.value.trim()||!validPositive('#mealCalories');
    const librarySave=$('#saveLibraryItem');if(librarySave)librarySave.disabled=!$('#libName')?.value.trim()||!validPositive('#libAmount')||!validPositive('#libCalories');
    const recipeSave=$('#recipeV7Save');if(recipeSave&&$('#recipeV7Modal')?.classList.contains('open'))recipeSave.disabled=!$('#recipeV7Name')?.value.trim()||!$$('#recipeV7Components .recipe-v7-row').length;
  }

  function polishScanner(){
    decorateModal('#scannerModal','scan','Halte den Barcode ruhig, quer und gut beleuchtet in den Rahmen.');
    const title=$('#scannerTitle');setText(title,'Barcode scannen');
    const status=$('#scannerStatus');if(status)status.setAttribute('role','status');
    const retry=$('#scannerRetry');if(retry&&!$('.nutrition-v210-action-icon',retry)){retry.innerHTML=`<span class="nutrition-v210-action-icon">${ICONS.retry}</span><span>Kamera neu starten</span>`}
    const torch=$('#scannerTorch');if(torch&&!$('.nutrition-v210-action-icon',torch)){torch.innerHTML=`<span class="nutrition-v210-action-icon">${ICONS.light}</span><span>Licht</span>`}
    const photo=$('.scanner-photo');if(photo&&!$('.nutrition-v210-action-icon',photo)){const input=$('input',photo);photo.textContent='';photo.insertAdjacentHTML('afterbegin',`<span class="nutrition-v210-action-icon">${ICONS.camera}</span><span>Barcode fotografieren</span>`);if(input)photo.append(input)}
    const manual=$('.scanner-manual');if(manual&&!$('.nutrition-v210-manual-title',manual))manual.insertAdjacentHTML('afterbegin','<strong class="nutrition-v210-manual-title">Oder Code eingeben</strong>');
  }

  function polishForms(){
    decorateModal('#mealModal','meal','Trage die Nährwerte für die tatsächlich gegessene Menge ein. Pflichtfelder sind markiert.');
    decorateModal('#libraryItemModal','food','Speichere ein Lebensmittel einmalig und nutze es danach mit einem Tipp.');
    decorateModal('#libraryUseModal','meal','Passe nur die tatsächlich gegessene Menge an.');
    decorateModal('#recipeV7Modal','recipe','Baue dein Rezept aus Zutaten auf. Nährwerte und Portionen werden automatisch berechnet.');
    decorateModal('#nutritionDetailModal','food','Wähle deine Portion und prüfe die berechneten Nährwerte.');
    const kindSwitch=$('#libraryItemModal .segmented');if(kindSwitch){kindSwitch.hidden=true;kindSwitch.setAttribute('aria-hidden','true')}
    const recipeKind=$('#libraryItemModal [data-kind="recipe"]');if(recipeKind){recipeKind.hidden=true;recipeKind.tabIndex=-1}
    const itemTitle=$('#libraryItemTitle');if(itemTitle)setText(itemTitle,/bearbeiten/i.test(itemTitle.textContent)?'Lebensmittel bearbeiten':'Lebensmittel anlegen');
    const itemSave=$('#saveLibraryItem');if(itemSave)setText(itemSave,'In Bibliothek speichern');
    const recipeSearch=$('#recipeV7Search');if(recipeSearch)recipeSearch.placeholder='Lebensmittel suchen';
    const recipeHint=$('.recipe-v7-search-hint');if(recipeHint&&/BLS/i.test(recipeHint.textContent))setText(recipeHint,'Tippe einen Begriff ein und wähle anschließend die passende Zutat.');
    const favorite=$$('.favorite-check');favorite.forEach(label=>{label.classList.add('nutrition-v210-favorite');if(!$('.nutrition-v210-favorite-icon',label))label.insertAdjacentHTML('afterbegin',`<span class="nutrition-v210-favorite-icon">${ICONS.heart}</span>`) });
    validateForms();
  }

  function observe(){observer?.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  function sync(){scheduled=false;observer?.disconnect();try{const screen=$('[data-screen="food"]');if(screen?.dataset.nutritionReady==='1')polishMain(screen);polishForms();polishScanner();root.CutCoachGlassNavV131?.enhance?.()}finally{observe()}}
  function queue(){if(scheduled)return;scheduled=true;(root.requestAnimationFrame||setTimeout)(sync)}
  function bind(){
    if(bound)return;bound=true;
    document.addEventListener('input',event=>{if(event.target.matches?.('#mealModal input,#libraryItemModal input,#recipeV7Modal input'))validateForms()});
    document.addEventListener('click',event=>{if(event.target.closest?.('#nutritionManual,#nutritionNewFood,#nutritionRecipe,#nutritionBarcode,[data-nutrition-open]'))setTimeout(queue,0)},true);
    root.addEventListener('cutcoach:librarychange',queue);root.addEventListener('cutcoach:data-changed',queue);root.addEventListener('hashchange',queue);
  }
  function start(){bind();observer=new MutationObserver(records=>{if(records.some(record=>record.addedNodes.length||record.removedNodes.length))queue()});observe();queue()}

  root.CutCoachNutrition210=Object.freeze({version:VERSION,refresh:queue});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(window);
