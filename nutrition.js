'use strict';
(function(){
  const VERSION=typeof APP_VERSION==='string'?APP_VERSION:'6.5.0';
  const LIBRARY_KEY='cutcoach_library_v1';
  const RESULT_PAGE_SIZE=30;
  const NUTRITION_MEAL_TYPES=['Frühstück','Mittagessen','Abendessen','Snack'];
  const MEAL_ICONS={'Frühstück':'☕','Mittagessen':'🥗','Abendessen':'🍽️','Snack':'🍎'};
  let mealType='Frühstück';
  let activeFilter='all';
  let visibleLimit=RESULT_PAGE_SIZE;
  let recognition=null;
  let currentExpanded=false;
  let lastQuickAdd=null;
  let feedbackTimer=null;

  function readLibrary(){
    try{const data=window.CutCoachLibrary?.exportData?.();if(Array.isArray(data?.items))return data.items;}catch{}
    try{const parsed=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'{}');return Array.isArray(parsed?.items)?parsed.items:[]}catch{return []}
  }
  function fmt(value,digits=0){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(Math.max(0,Number(value)||0))}
  function normalized(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').trim()}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function escapeSelector(value){return globalThis.CSS?.escape?CSS.escape(String(value)):String(value).replace(/[^A-Za-z0-9_-]/g,'\\$&')}
  function validMealType(value){return NUTRITION_MEAL_TYPES.includes(value)?value:'Frühstück'}
  function mealsForType(key=selectedDate){return (typeof day==='function'?day(key,false).meals:[]).filter(item=>item.type===mealType)}
  function dateCaption(){
    const date=dateFromKey(selectedDate),formatted=new Intl.DateTimeFormat('de-DE',{weekday:'short',day:'numeric',month:'long'}).format(date);
    return selectedDate===todayKey()?`Heute · ${formatted}`:formatted;
  }
  function countLabel(count){return `${fmt(count)} ${count===1?'Eintrag':'Einträge'}`}
  function mealPrompt(){return {'Frühstück':'zum Frühstück','Mittagessen':'zum Mittagessen','Abendessen':'zum Abendessen','Snack':'als Snack'}[mealType]||'zu dieser Mahlzeit'}

  function activateScreen(name){
    const activeTab=name==='food'?'today':name;
    document.querySelectorAll('[data-tab]').forEach(button=>{const on=button.dataset.tab===activeTab;button.classList.toggle('active',on);button.setAttribute('aria-current',on?'page':'false')});
    document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen.dataset.screen===name));
  }
  function resetBrowse(){
    activeFilter='all';visibleLimit=RESULT_PAGE_SIZE;currentExpanded=false;lastQuickAdd=null;clearTimeout(feedbackTimer);feedbackTimer=null;
    const input=document.querySelector('#nutritionSearch');if(input)input.value='';
  }
  function openFoodScreen(type=mealType){
    mealType=validMealType(type);document.body.dataset.nutritionMealType=mealType;activateScreen('food');document.body.classList.remove('journal-mode');document.body.classList.add('nutrition-mode');
    ensureStructure();resetBrowse();window.scrollTo({top:0,behavior:'auto'});renderNutrition();
  }
  function leaveNutrition(){document.body.classList.remove('nutrition-mode');delete document.body.dataset.nutritionMealType;stopVoice();clearTimeout(feedbackTimer);feedbackTimer=null;lastQuickAdd=null;}
  function goBack(){activateScreen('today');leaveNutrition();document.body.classList.add('journal-mode');syncSelectedDateUrl?.('#today');window.scrollTo({top:0,behavior:'auto'});window.render?.()}

  function ensureStructure(){
    const screen=document.querySelector('[data-screen="food"]');if(!screen||screen.dataset.nutritionReady)return screen;
    screen.dataset.nutritionReady='1';
    screen.innerHTML=`<div class="nutrition-shell">
      <header class="nutrition-header">
        <button id="nutritionBack" class="nutrition-back" type="button" aria-label="Zurück zum Tagebuch">‹</button>
        <div class="nutrition-header-copy"><h1 id="nutritionTitle">Frühstück</h1><p id="nutritionDate"></p></div>
        <button id="nutritionDone" class="nutrition-done" type="button">Fertig</button>
      </header>
      <section class="nutrition-search-card" aria-label="Lebensmittel suchen">
        <label class="nutrition-search-row" for="nutritionSearch"><span aria-hidden="true">⌕</span><input id="nutritionSearch" type="search" autocomplete="off" autocapitalize="sentences" enterkeyhint="search"><button id="nutritionVoice" type="button" aria-label="Spracheingabe starten">🎤</button></label>
        <p id="nutritionVoiceStatus" aria-live="polite" hidden></p>
      </section>
      <section class="nutrition-shortcuts" aria-label="Schnellaktionen">
        <button id="nutritionBarcode" type="button"><span aria-hidden="true">▣</span><b>Barcode</b></button>
        <button id="nutritionManual" type="button"><span aria-hidden="true">✎</span><b>Manuell</b></button>
        <button id="nutritionNewFood" type="button"><span aria-hidden="true">＋</span><b>Lebensmittel</b></button>
        <button id="nutritionRecipe" type="button"><span aria-hidden="true">🍽️</span><b>Rezept</b></button>
      </section>
      <aside id="nutritionFeedback" class="nutrition-feedback" aria-live="polite" hidden><span aria-hidden="true">✓</span><p id="nutritionFeedbackText"></p><button id="nutritionUndoAdd" type="button">Rückgängig</button></aside>
      <section class="nutrition-meal-card">
        <div class="nutrition-meal-summary">
          <span id="nutritionMealIcon" class="nutrition-meal-icon" aria-hidden="true">☕</span>
          <div class="nutrition-meal-copy"><small>Diese Mahlzeit</small><strong><span id="nutritionMealKcal">0 kcal</span><i aria-hidden="true">·</i><span id="nutritionMealCount">0 Einträge</span></strong></div>
          <div class="nutrition-meal-actions"><button id="nutritionCopyPrevious" type="button">↶ Vortag</button><button id="nutritionCurrentToggle" type="button" aria-expanded="false" hidden>Einträge <span aria-hidden="true">⌄</span></button></div>
        </div>
        <div id="nutritionCurrentMeals" class="nutrition-current-list" hidden></div>
      </section>
      <section class="nutrition-tabs" role="tablist" aria-label="Lebensmittelauswahl">
        <button class="active" data-nutrition-filter="all" role="tab" aria-selected="true" type="button">Alle <span data-filter-count="all">0</span></button>
        <button data-nutrition-filter="favorite" role="tab" aria-selected="false" type="button">Favoriten <span data-filter-count="favorite">0</span></button>
        <button data-nutrition-filter="recent" role="tab" aria-selected="false" type="button">Zuletzt <span data-filter-count="recent">0</span></button>
        <button data-nutrition-filter="dish" role="tab" aria-selected="false" type="button">Rezepte <span data-filter-count="dish">0</span></button>
      </section>
      <section class="nutrition-browse-head"><div><small>Deine Bibliothek</small><h2 id="nutritionResultTitle">Schnelle Auswahl</h2></div><span id="nutritionResultCount">0 Treffer</span></section>
      <div id="nutritionResults" class="nutrition-results"></div>
      <button id="nutritionShowMore" class="nutrition-show-more" type="button" hidden></button>
    </div>`;
    screen.querySelector('#nutritionBack').onclick=goBack;screen.querySelector('#nutritionDone').onclick=goBack;screen.querySelector('#nutritionManual').onclick=openManual;screen.querySelector('#nutritionNewFood').onclick=()=>openLibraryEditor('food');screen.querySelector('#nutritionRecipe').onclick=()=>openLibraryEditor('dish');screen.querySelector('#nutritionBarcode').onclick=openScanner;screen.querySelector('#nutritionCopyPrevious').onclick=copyPreviousMealType;screen.querySelector('#nutritionUndoAdd').onclick=undoQuickAdd;
    screen.querySelector('#nutritionCurrentToggle').onclick=()=>{currentExpanded=!currentExpanded;renderCurrent()};
    const search=screen.querySelector('#nutritionSearch');search.addEventListener('input',()=>{visibleLimit=RESULT_PAGE_SIZE;if(!recognition)screen.querySelector('#nutritionVoiceStatus').hidden=true;renderResults()});search.addEventListener('search',()=>{visibleLimit=RESULT_PAGE_SIZE;renderResults()});
    screen.querySelector('#nutritionVoice').onclick=startVoice;
    screen.querySelectorAll('[data-nutrition-filter]').forEach(button=>button.onclick=()=>{activeFilter=button.dataset.nutritionFilter;visibleLimit=RESULT_PAGE_SIZE;renderFilters();renderResults()});
    screen.querySelector('#nutritionShowMore').onclick=()=>{visibleLimit+=RESULT_PAGE_SIZE;renderResults()};
    screen.querySelector('#nutritionResults').onclick=event=>{const add=event.target.closest('[data-nutrition-add]');if(add){quickAdd(add.dataset.nutritionAdd,add);return}const open=event.target.closest('[data-nutrition-open]');if(open)openLibraryItem(open.dataset.nutritionOpen)};
    screen.querySelector('#nutritionCurrentMeals').onclick=event=>{const edit=event.target.closest('[data-nutrition-edit]');if(edit){openMeal(edit.dataset.nutritionEdit);return}const copy=event.target.closest('[data-nutrition-copy]');if(copy){duplicateMeal(copy.dataset.nutritionCopy);return}const remove=event.target.closest('[data-nutrition-delete]');if(remove)deleteMeal(remove.dataset.nutritionDelete)};
    return screen;
  }

  function openManual(){if(typeof mealCapacity==='function'&&mealCapacity()<1){toast?.(`Maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten pro Tag möglich.`);return}const type=document.querySelector('#mealType');if(type)type.value=mealType;openModal?.('mealModal')}
  function openScanner(){document.body.dataset.nutritionMealType=mealType;if(typeof window.CutCoachLibrary?.startScanner==='function'){window.CutCoachLibrary.startScanner();return}const button=document.querySelector('#scanCode');if(button){button.click();return}toast?.('Scanner wird noch geladen. Bitte kurz erneut versuchen.')}
  function openLibraryEditor(kind){if(typeof window.CutCoachLibrary?.createItem==='function'){window.CutCoachLibrary.createItem(kind);return}const button=document.querySelector('#newLibraryItem');if(!button){toast?.('Bibliothek wird noch geladen. Bitte kurz erneut versuchen.');return}button.click();if(kind==='dish')setTimeout(()=>document.querySelector('[data-kind="dish"]')?.click(),40)}
  function openLibraryItem(id){
    if(window.CutCoachLibrary?.openUse?.(id,mealType))return;
    const button=document.querySelector(`[data-use-lib="${escapeSelector(id)}"]`);if(!button){toast?.('Eintrag konnte nicht geöffnet werden.');return}button.click();const select=document.querySelector('#libraryMealType');if(select)select.value=mealType;
  }
  function quickAdd(id,button){
    if(button.disabled)return;button.disabled=true;
    const result=window.CutCoachLibrary?.addItemToDay?.(id,{type:mealType,dateKey:selectedDate});
    if(!result){button.disabled=false;if(!window.CutCoachLibrary?.addItemToDay)openLibraryItem(id);return}
    lastQuickAdd=result;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{lastQuickAdd=null;renderFeedback()},6500);navigator.vibrate?.(18);window.render?.();
  }
  function undoQuickAdd(){
    const token=lastQuickAdd;if(!token)return;
    if(!window.CutCoachLibrary?.undoDayAdd?.(token)){toast?.('Eintrag konnte nicht rückgängig gemacht werden.');return}
    clearTimeout(feedbackTimer);feedbackTimer=null;lastQuickAdd=null;window.render?.();toast?.('Eintrag wieder entfernt.');
  }
  function renderFeedback(){
    const host=document.querySelector('#nutritionFeedback'),text=document.querySelector('#nutritionFeedbackText');if(!host||!text)return;
    host.hidden=!lastQuickAdd;if(lastQuickAdd){text.textContent=`${lastQuickAdd.name} hinzugefügt.`;host.title=`${lastQuickAdd.name} wurde ${mealPrompt()} hinzugefügt.`;}
  }

  function stopVoice(){if(!recognition)return;try{recognition.abort()}catch{}recognition=null;document.querySelector('#nutritionVoice')?.classList.remove('listening')}
  function startVoice(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition,status=document.querySelector('#nutritionVoiceStatus'),input=document.querySelector('#nutritionSearch'),button=document.querySelector('#nutritionVoice');
    status.hidden=false;
    if(!SpeechRecognition){status.textContent='Nutze das Mikrofon der iPhone-Tastatur für die Spracheingabe.';input?.focus();toast?.('Nutze die Diktierfunktion unten auf der iPhone-Tastatur.');return}
    stopVoice();recognition=new SpeechRecognition();recognition.lang='de-DE';recognition.continuous=false;recognition.interimResults=true;recognition.maxAlternatives=3;button?.classList.add('listening');status.textContent='Ich höre zu …';
    recognition.onresult=event=>{let transcript='';for(let index=event.resultIndex;index<event.results.length;index++)transcript+=`${event.results[index][0].transcript} `;transcript=transcript.trim();if(transcript){input.value=transcript;input.dispatchEvent(new Event('input',{bubbles:true}));status.textContent=`Erkannt: „${transcript}“`;if(event.results[event.results.length-1].isFinal)setTimeout(()=>input.focus(),80)}};
    recognition.onerror=event=>{status.textContent=event.error==='not-allowed'?'Mikrofonzugriff wurde blockiert. Nutze die iPhone-Diktierfunktion.':event.error==='no-speech'?'Keine Sprache erkannt. Tippe erneut auf das Mikrofon.':'Spracheingabe konnte nicht gestartet werden.';button?.classList.remove('listening')};
    recognition.onend=()=>{button?.classList.remove('listening');recognition=null;if(!input.value.trim())status.textContent='Keine Sprache erkannt. Tippe erneut oder nutze die Tastatur.'};
    try{recognition.start()}catch{status.textContent='Spracheingabe ist gerade nicht verfügbar. Nutze die iPhone-Diktierfunktion.';input?.focus();button?.classList.remove('listening')}
  }

  function searchScore(item,query){
    const name=normalized(item.name),barcode=normalized(item.barcode),tokens=query.split(/\s+/).filter(Boolean);
    if(!tokens.every(token=>name.includes(token)||barcode.includes(token)))return null;
    let score=0;if(name===query)score+=1000;else if(name.startsWith(query))score+=600;else if(name.split(/\s+/).some(word=>word.startsWith(query)))score+=350;
    for(const token of tokens){if(name.split(/\s+/).some(word=>word.startsWith(token)))score+=80;if(barcode===token)score+=900}
    return score+Number(Boolean(item.favorite))*60+Math.min(100,Number(item.uses)||0);
  }
  function filteredItems(){
    const query=normalized(document.querySelector('#nutritionSearch')?.value),source=readLibrary();let items=source;
    if(activeFilter==='favorite')items=items.filter(item=>item.favorite);else if(activeFilter==='recent')items=items.filter(item=>item.lastUsedAt);else if(activeFilter==='dish')items=items.filter(item=>item.kind==='dish');
    if(query){items=items.map(item=>({item,score:searchScore(item,query)})).filter(entry=>entry.score!==null).sort((a,b)=>b.score-a.score||String(a.item.name).localeCompare(String(b.item.name),'de')).map(entry=>entry.item);}
    else if(activeFilter==='recent')items=[...items].sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)));
    else items=[...items].sort((a,b)=>Number(b.favorite)-Number(a.favorite)||(b.uses||0)-(a.uses||0)||String(a.name).localeCompare(String(b.name),'de'));
    return {items,query,source};
  }
  function renderFilters(source=readLibrary()){
    const counts={all:source.length,favorite:source.filter(item=>item.favorite).length,recent:source.filter(item=>item.lastUsedAt).length,dish:source.filter(item=>item.kind==='dish').length};
    document.querySelectorAll('[data-nutrition-filter]').forEach(button=>{const on=button.dataset.nutritionFilter===activeFilter;button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on));const count=button.querySelector('[data-filter-count]');if(count)count.textContent=fmt(counts[button.dataset.nutritionFilter])});
  }
  function renderResults(){
    const host=document.querySelector('#nutritionResults');if(!host)return;
    const {items,query,source}=filteredItems(),title=document.querySelector('#nutritionResultTitle'),count=document.querySelector('#nutritionResultCount'),more=document.querySelector('#nutritionShowMore');renderFilters(source);
    title.textContent=query?`Treffer für „${document.querySelector('#nutritionSearch').value.trim()}“`:activeFilter==='favorite'?'Deine Favoriten':activeFilter==='recent'?'Zuletzt verwendet':activeFilter==='dish'?'Deine Rezepte':'Schnelle Auswahl';
    count.textContent=`${fmt(items.length)} Treffer`;
    if(!items.length){
      host.classList.add('is-empty');host.innerHTML=`<article class="nutrition-empty"><span aria-hidden="true">${query?'⌕':'🥣'}</span><div><b>${query?'Nichts Passendes gefunden':activeFilter==='all'?'Deine Bibliothek ist noch leer':'Hier gibt es noch keine Einträge'}</b><p>${query?'Scanne den Barcode oder lege das Lebensmittel einmalig selbst an.':'Speichere häufige Lebensmittel und Rezepte für den schnellen Zugriff.'}</p></div><button type="button" data-nutrition-empty-add>＋ Anlegen</button></article>`;host.querySelector('[data-nutrition-empty-add]').onclick=()=>openLibraryEditor(activeFilter==='dish'?'dish':'food');more.hidden=true;return;
    }
    host.classList.remove('is-empty');const capacity=typeof mealCapacity==='function'?mealCapacity():1;
    host.innerHTML=items.slice(0,visibleLimit).map(item=>`<article class="nutrition-result-row"><button class="nutrition-result-main" type="button" data-nutrition-open="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}, Portion auswählen"><span class="nutrition-result-icon" aria-hidden="true">${item.kind==='dish'?'🍽️':'🥫'}</span><span class="nutrition-result-copy"><b>${escapeHtml(item.name)}${item.favorite?'<i aria-label="Favorit">★</i>':''}</b><small>${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')} · ${fmt(item.protein,1)} g Eiweiß</small></span></button><span class="nutrition-result-energy"><b>${fmt(item.calories)} kcal</b></span><button class="nutrition-result-add" type="button" data-nutrition-add="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} direkt zu ${escapeHtml(mealType)} hinzufügen" ${capacity<1?'disabled':''}>＋</button></article>`).join('');
    const remaining=Math.max(0,items.length-visibleLimit);more.hidden=remaining===0;more.textContent=remaining?`Weitere ${fmt(Math.min(RESULT_PAGE_SIZE,remaining))} anzeigen`:'';
  }

  function copyPreviousMealType(){
    const previousKey=shiftKey(selectedDate,-1),source=mealsForType(previousKey);if(!source.length){toast?.(`Am Vortag ist für ${mealType} nichts eingetragen.`);return}
    if(source.length>mealCapacity(selectedDate)){toast?.(`Nicht genügend Platz: Noch ${fmt(mealCapacity(selectedDate))} Einträge frei.`);return}
    const existing=mealsForType();if(existing.length&&!confirm(`${source.length} ${source.length===1?'Eintrag':'Einträge'} zusätzlich für ${mealType} übernehmen?`))return;
    if(!commitDayMutation(data=>{for(const meal of source)data.meals.push({...deepClone(meal),id:makeId()})})){toast?.('Mahlzeit vom Vortag konnte nicht übernommen werden.');return}
    currentExpanded=true;window.render?.();toast?.(`${source.length} ${source.length===1?'Eintrag':'Einträge'} vom Vortag übernommen.`);
  }
  function renderCurrent(){
    const host=document.querySelector('#nutritionCurrentMeals');if(!host)return;
    const meals=mealsForType(),calories=meals.reduce((sum,item)=>sum+(Number(item.calories)||0),0),protein=meals.reduce((sum,item)=>sum+(Number(item.protein)||0),0),toggle=document.querySelector('#nutritionCurrentToggle'),previous=mealsForType(shiftKey(selectedDate,-1)),copyPrevious=document.querySelector('#nutritionCopyPrevious');
    document.querySelector('#nutritionMealIcon').textContent=MEAL_ICONS[mealType]||'🍽️';document.querySelector('#nutritionMealKcal').textContent=`${fmt(calories)} kcal`;document.querySelector('#nutritionMealCount').textContent=countLabel(meals.length);
    copyPrevious.hidden=!previous.length;copyPrevious.disabled=!previous.length;copyPrevious.title=previous.length?`${previous.length} ${previous.length===1?'Eintrag':'Einträge'} vom Vortag übernehmen`:`Am Vortag ist für ${mealType} nichts eingetragen`;
    toggle.hidden=!meals.length;toggle.setAttribute('aria-expanded',String(currentExpanded));toggle.innerHTML=`${currentExpanded?'Schließen':'Ansehen'} <span aria-hidden="true">${currentExpanded?'⌃':'⌄'}</span>`;host.hidden=!meals.length||!currentExpanded;
    if(!meals.length||!currentExpanded){host.innerHTML='';return}
    host.innerHTML=`<div class="nutrition-current-total"><span>${countLabel(meals.length)}</span><b>${fmt(calories)} kcal · ${fmt(protein,1)} g Eiweiß</b></div>${meals.map(item=>`<article class="nutrition-current-row"><button class="nutrition-current-main" type="button" data-nutrition-edit="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} bearbeiten"><span aria-hidden="true">✓</span><span><b>${escapeHtml(item.name)}</b><small>${fmt(item.calories)} kcal · E ${fmt(item.protein,1)} · KH ${fmt(item.carbs,1)} · F ${fmt(item.fat,1)}</small></span></button><div class="nutrition-current-actions"><button type="button" data-nutrition-copy="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} duplizieren" title="Duplizieren">⧉</button><button class="delete" type="button" data-nutrition-delete="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} löschen" title="Löschen">×</button></div></article>`).join('')}`;
  }
  function renderNutrition(){
    const screen=ensureStructure();if(!screen)return;
    screen.querySelector('#nutritionTitle').textContent=mealType;screen.querySelector('#nutritionDate').textContent=dateCaption();screen.querySelector('#nutritionSearch').placeholder=`Was hattest du ${mealPrompt()}?`;document.body.dataset.nutritionMealType=mealType;renderCurrent();renderResults();renderFeedback();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  function cleanNavigation(){document.querySelector('nav [data-tab="food"]')?.remove();document.querySelector('nav [data-tab="library"]')?.remove();document.querySelectorAll('.journal-section-title button,.journal-section-title a').forEach(node=>{if(node.textContent.trim().toLocaleLowerCase('de').includes('alle anzeigen'))node.remove()});document.querySelectorAll('nav [data-tab]').forEach(button=>{if(button.dataset.nutritionWatch)return;button.dataset.nutritionWatch='1';button.addEventListener('click',()=>{if(button.dataset.tab!=='food')leaveNutrition()})})}
  document.addEventListener('click',event=>{const add=event.target.closest('[data-add-journal-meal]');if(add){event.preventDefault();event.stopImmediatePropagation();openFoodScreen(add.dataset.addJournalMeal);return}if(event.target.closest('#journalQuickAdd')){event.preventDefault();event.stopImmediatePropagation();const hour=new Date().getHours();openFoodScreen(hour<11?'Frühstück':hour<16?'Mittagessen':hour<21?'Abendessen':'Snack')}},true);
  window.addEventListener('cutcoach:librarychange',()=>{if(document.querySelector('[data-screen="food"]')?.classList.contains('active'))renderResults()});
  const baseRender=window.render;window.render=function(){baseRender();cleanNavigation();if(document.querySelector('[data-screen="food"]')?.classList.contains('active'))renderNutrition()};document.addEventListener('DOMContentLoaded',()=>{ensureStructure();cleanNavigation()},{once:true});
})();
