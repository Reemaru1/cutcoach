'use strict';
(function(){
  const VERSION=typeof APP_VERSION==='string'?APP_VERSION:'2.3.0-alpha';
  const LIBRARY_KEY='cutcoach_library_v1';
  const RESULT_PAGE_SIZE=18;
  const NUTRITION_MEAL_TYPES=['Frühstück','Mittagessen','Abendessen','Snack'];
  const MEAL_ICONS={'Frühstück':'☕','Mittagessen':'🥗','Abendessen':'🍽️','Snack':'🍎'};
  const SEARCH_META=new WeakMap();
  let mealType='Frühstück';
  let activeFilter='all';
  let visibleLimit=RESULT_PAGE_SIZE;
  let recognition=null;
  let currentExpanded=false;
  let lastQuickAdd=null;
  let feedbackTimer=null;
  let resultsScheduled=false;

  function readLibrary(){
    try{const data=window.CutCoachLibrary?.exportData?.();if(Array.isArray(data?.items))return data.items;}catch{}
    try{const parsed=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'{}');return Array.isArray(parsed?.items)?parsed.items:[]}catch{return []}
  }
  function readCatalog(){try{const items=window.CutCoachFoodCatalog?.items?.();return Array.isArray(items)?items:[]}catch{return []}}
  function catalogItem(id){try{return window.CutCoachFoodCatalog?.get?.(id)||null}catch{return null}}
  function catalogSuggestions(){try{const items=window.CutCoachFoodCatalog?.suggestions?.(mealType);return Array.isArray(items)?items:[]}catch{return []}}
  function fmt(value,digits=0){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(Math.max(0,Number(value)||0))}
  function normalized(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
  function compactNormalized(value){return normalized(value).replace(/\s+/g,'')}
  function parseSearchIntent(value){
    const raw=String(value||''),match=raw.match(/(^|\s)(\d+(?:[.,]\d+)?)\s*(kg|kilogramm|g|gramm|ml|milliliter|l|liter|stück|stueck|portion(?:en)?)\b/i);let amount=null,unit=null,queryRaw=raw;
    if(match){amount=Number(match[2].replace(',','.'));const key=normalized(match[3]);unit=key==='kg'||key==='kilogramm'?'g':key==='l'||key==='liter'?'ml':key==='g'||key==='gramm'?'g':key==='ml'||key==='milliliter'?'ml':key==='stuck'||key==='stueck'?'Stück':'Portion';if(match[3].toLocaleLowerCase('de').startsWith('kg')||key==='kilogramm'||key==='l'||key==='liter')amount*=1000;queryRaw=`${raw.slice(0,match.index)} ${raw.slice(match.index+match[0].length)}`;}
    return{raw,query:normalized(queryRaw),displayQuery:queryRaw.replace(/\s+/g,' ').trim(),amount:Number.isFinite(amount)&&amount>0?Math.min(100000,amount):null,unit};
  }
  function portionForItem(item,intent=parseSearchIntent(document.querySelector('#nutritionSearch')?.value)){return item&&intent.amount&&intent.unit===item.unit?{amount:intent.amount,unit:intent.unit}:null}
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
  function mealRoutineMap(){
    const routines=new Map();
    for(let offset=1;offset<=28;offset++){
      const seen=new Set();
      for(const meal of mealsForType(shiftKey(selectedDate,-offset))){
        const key=normalized(meal.name);if(!key||seen.has(key))continue;seen.add(key);
        const entry=routines.get(key)||{days:0,score:0,lastOffset:offset};entry.days++;entry.score+=29-offset;entry.lastOffset=Math.min(entry.lastOffset,offset);routines.set(key,entry);
      }
    }
    return routines;
  }

  function activateScreen(name){
    const activeTab=name==='food'?'today':name;
    document.querySelectorAll('[data-tab]').forEach(button=>{const on=button.dataset.tab===activeTab;button.classList.toggle('active',on);button.setAttribute('aria-current',on?'page':'false')});
    document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen.dataset.screen===name));
  }
  function resetBrowse(){
    activeFilter='all';visibleLimit=RESULT_PAGE_SIZE;currentExpanded=false;lastQuickAdd=null;clearTimeout(feedbackTimer);feedbackTimer=null;
    const input=document.querySelector('#nutritionSearch');if(input)input.value='';
  }
  function switchMealType(value){
    const next=validMealType(value);if(next===mealType)return;
    mealType=next;currentExpanded=false;visibleLimit=RESULT_PAGE_SIZE;document.body.dataset.nutritionMealType=mealType;renderNutrition();
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
        <div class="nutrition-header-copy"><label class="nutrition-meal-switch"><span id="nutritionTitle">Frühstück</span><span aria-hidden="true">⌄</span><select id="nutritionMealSelect" aria-label="Mahlzeit auswählen">${NUTRITION_MEAL_TYPES.map(type=>`<option>${type}</option>`).join('')}</select></label><p id="nutritionDate"></p></div>
        <button id="nutritionDone" class="nutrition-done" type="button">Fertig</button>
      </header>
      <section class="nutrition-search-card" aria-label="Lebensmittel suchen">
        <label class="nutrition-search-row" for="nutritionSearch"><span aria-hidden="true">⌕</span><input id="nutritionSearch" type="search" autocomplete="off" autocapitalize="sentences" enterkeyhint="search"><button id="nutritionVoice" type="button" aria-label="Spracheingabe starten">🎤</button></label>
        <p id="nutritionVoiceStatus" aria-live="polite" hidden></p>
        <p id="nutritionSearchIntent" class="nutrition-search-intent" aria-live="polite" hidden></p>
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
        <div class="nutrition-day-budget"><div><span id="nutritionDayBudgetLabel">Tagesbudget</span><small id="nutritionDayBudgetMeta"></small></div><span class="nutrition-budget-bar" aria-hidden="true"><i id="nutritionDayBudgetBar"></i></span></div>
        <div class="nutrition-coach-row"><span aria-hidden="true">✦</span><p id="nutritionCoachText"></p></div>
        <div class="nutrition-macro-compass" aria-label="Verbleibende Makroziele">
          <article data-nutrition-macro="protein"><span>Eiweiß</span><b id="nutritionProteinGap">0 g</b><i aria-hidden="true"><em id="nutritionProteinBar"></em></i></article>
          <article data-nutrition-macro="carbs"><span>KH</span><b id="nutritionCarbsGap">0 g</b><i aria-hidden="true"><em id="nutritionCarbsBar"></em></i></article>
          <article data-nutrition-macro="fat"><span>Fett</span><b id="nutritionFatGap">0 g</b><i aria-hidden="true"><em id="nutritionFatBar"></em></i></article>
        </div>
        <div id="nutritionCurrentMeals" class="nutrition-current-list" hidden></div>
      </section>
      <section class="nutrition-tabs" role="tablist" aria-label="Lebensmittelauswahl">
        <button class="active" data-nutrition-filter="all" role="tab" aria-selected="true" type="button">Alle <span data-filter-count="all">0</span></button>
        <button data-nutrition-filter="favorite" role="tab" aria-selected="false" type="button">Favoriten <span data-filter-count="favorite">0</span></button>
        <button data-nutrition-filter="recent" role="tab" aria-selected="false" type="button">Zuletzt <span data-filter-count="recent">0</span></button>
        <button data-nutrition-filter="recipe" role="tab" aria-selected="false" type="button">Rezepte <span data-filter-count="recipe">0</span></button>
      </section>
      <section class="nutrition-browse-head"><div><small id="nutritionResultScope">Bibliothek &amp; BLS 4.0</small><h2 id="nutritionResultTitle">Schnelle Auswahl</h2></div><span id="nutritionResultCount">0 Treffer</span></section>
      <div id="nutritionResults" class="nutrition-results"></div>
      <button id="nutritionShowMore" class="nutrition-show-more" type="button" hidden></button>
      <p class="nutrition-catalog-note">Nährwerte: <a href="https://www.blsdb.de/" target="_blank" rel="noopener">BLS 4.0 · Max Rubner-Institut</a> · <a href="https://creativecommons.org/licenses/by/4.0/deed.de" target="_blank" rel="noopener">CC BY 4.0</a></p>
    </div>`;
    screen.querySelector('#nutritionBack').onclick=goBack;screen.querySelector('#nutritionDone').onclick=goBack;screen.querySelector('#nutritionMealSelect').onchange=event=>switchMealType(event.target.value);screen.querySelector('#nutritionManual').onclick=openManual;screen.querySelector('#nutritionNewFood').onclick=()=>openLibraryEditor('food');screen.querySelector('#nutritionRecipe').onclick=()=>openLibraryEditor('recipe');screen.querySelector('#nutritionBarcode').onclick=openScanner;screen.querySelector('#nutritionCopyPrevious').onclick=copyPreviousMealType;screen.querySelector('#nutritionUndoAdd').onclick=undoQuickAdd;
    screen.querySelector('#nutritionCurrentToggle').onclick=()=>{currentExpanded=!currentExpanded;renderCurrent()};
    const search=screen.querySelector('#nutritionSearch');search.addEventListener('input',()=>{visibleLimit=RESULT_PAGE_SIZE;if(normalized(search.value)&&activeFilter!=='all')activeFilter='all';if(!recognition)screen.querySelector('#nutritionVoiceStatus').hidden=true;renderFilters();scheduleResults()});search.addEventListener('search',()=>{visibleLimit=RESULT_PAGE_SIZE;scheduleResults()});
    screen.querySelector('#nutritionVoice').onclick=startVoice;
    screen.querySelectorAll('[data-nutrition-filter]').forEach(button=>button.onclick=()=>{activeFilter=button.dataset.nutritionFilter;visibleLimit=RESULT_PAGE_SIZE;renderFilters();renderResults()});
    screen.querySelector('#nutritionShowMore').onclick=()=>{visibleLimit+=RESULT_PAGE_SIZE;renderResults()};
    screen.querySelector('#nutritionResults').onclick=event=>{const add=event.target.closest('[data-nutrition-add]');if(add){quickAdd(add.dataset.nutritionAdd,add);return}const open=event.target.closest('[data-nutrition-open]');if(open)openLibraryItem(open.dataset.nutritionOpen)};
    screen.querySelector('#nutritionCurrentMeals').onclick=event=>{const edit=event.target.closest('[data-nutrition-edit]');if(edit){openMeal(edit.dataset.nutritionEdit);return}const copy=event.target.closest('[data-nutrition-copy]');if(copy){duplicateMeal(copy.dataset.nutritionCopy);return}const remove=event.target.closest('[data-nutrition-delete]');if(remove)deleteMeal(remove.dataset.nutritionDelete)};
    return screen;
  }

  function scheduleResults(){if(resultsScheduled)return;resultsScheduled=true;Promise.resolve().then(()=>{resultsScheduled=false;renderResults()})}
  function openManual(){
    if(typeof mealCapacity==='function'&&mealCapacity()<1){toast?.(`Maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten pro Tag möglich.`);return}
    if(typeof openMeal==='function')openMeal();else{if(typeof editingMealId!=='undefined')editingMealId=null;for(const id of ['mealName','mealCalories','mealProtein','mealCarbs','mealFat']){const input=document.querySelector(`#${id}`);if(input)input.value=''}openModal?.('mealModal')}
    const type=document.querySelector('#mealType');if(type)type.value=mealType;
  }
  function openScanner(){document.body.dataset.nutritionMealType=mealType;if(typeof window.CutCoachLibrary?.startScanner==='function'){window.CutCoachLibrary.startScanner();return}const button=document.querySelector('#scanCode');if(button){button.click();return}toast?.('Scanner wird noch geladen. Bitte kurz erneut versuchen.')}
  function openLibraryEditor(kind,name=''){if(typeof window.CutCoachLibrary?.createItem==='function'){window.CutCoachLibrary.createItem(kind,{name});return}const button=document.querySelector('#newLibraryItem');if(!button){toast?.('Bibliothek wird noch geladen. Bitte kurz erneut versuchen.');return}button.click();const input=document.querySelector('#libName');if(input&&name)input.value=name;if(kind==='recipe')setTimeout(()=>document.querySelector('[data-kind="recipe"]')?.click(),40)}
  function openLibraryItem(id){
    const catalog=catalogItem(id),personal=readLibrary().find(item=>String(item.id)===String(id)),item=personal||catalog,portion=portionForItem(item);
    if(window.CutCoachLibrary?.openUse?.(id,mealType,portion))return;
    if(catalog&&window.CutCoachLibrary?.openCatalogUse?.(catalog,mealType,portion))return;
    const button=document.querySelector(`[data-use-lib="${escapeSelector(id)}"]`);if(!button){toast?.('Eintrag konnte nicht geöffnet werden.');return}button.click();const select=document.querySelector('#libraryMealType');if(select)select.value=mealType;
  }
  function quickAdd(id,button){
    if(button.disabled)return;button.disabled=true;
    let result=null;try{const catalog=catalogItem(id),personal=readLibrary().find(item=>String(item.id)===String(id)),item=personal||catalog,portion=portionForItem(item),options={type:mealType,dateKey:selectedDate};if(portion&&item?.amount>0)options.factor=portion.amount/item.amount;result=catalog?window.CutCoachLibrary?.addCatalogItemToDay?.(catalog,options):window.CutCoachLibrary?.addItemToDay?.(id,options)}catch(error){console.error(error);toast?.('Eintrag konnte nicht hinzugefügt werden.')}
    if(!result){button.disabled=false;if(!window.CutCoachLibrary?.addItemToDay)openLibraryItem(id);return}
    lastQuickAdd=result;clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>{lastQuickAdd=null;renderFeedback()},6500);try{navigator.vibrate?.(18)}catch{}window.render?.();
  }
  function undoQuickAdd(){
    const token=lastQuickAdd;if(!token)return;
    if(!window.CutCoachLibrary?.undoDayAdd?.(token)){toast?.('Eintrag konnte nicht rückgängig gemacht werden.');return}
    clearTimeout(feedbackTimer);feedbackTimer=null;lastQuickAdd=null;window.render?.();toast?.('Eintrag wieder entfernt.');
  }
  function renderFeedback(){
    const host=document.querySelector('#nutritionFeedback'),text=document.querySelector('#nutritionFeedbackText');if(!host||!text)return;
    host.hidden=!lastQuickAdd;if(lastQuickAdd){const target=validMealType(lastQuickAdd.mealType),portion=lastQuickAdd.quantity&&lastQuickAdd.unit?`${fmt(lastQuickAdd.quantity,lastQuickAdd.quantity%1?1:0)} ${lastQuickAdd.unit} `:'';text.textContent=`${portion}${lastQuickAdd.name} zu ${target} hinzugefügt.`;host.title=`${portion}${lastQuickAdd.name} wurde zu ${target} hinzugefügt.`;}
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

  function featuredRank(item){const index=NUTRITION_MEAL_TYPES.indexOf(mealType);return Math.max(0,Number(item.featured?.[index])||0)}
  function availableCatalog(personal,candidates){
    const ids=new Set(personal.map(item=>String(item.id))),references=new Set(personal.filter(item=>item.source&&item.sourceId).map(item=>`${item.source}:${item.sourceId}`)),names=new Set(personal.map(item=>normalized(item.name)));
    return candidates.filter(item=>!ids.has(String(item.id))&&!references.has(`${item.source}:${item.sourceId}`)&&!names.has(normalized(item.name)));
  }
  function searchMeta(item){
    if(SEARCH_META.has(item))return SEARCH_META.get(item);
    const name=normalized(item.name),meta={name,compact:compactNormalized(item.name),words:name.split(/\s+/).filter(Boolean),barcode:normalized(item.barcode)};SEARCH_META.set(item,meta);return meta;
  }
  function editDistanceWithin(left,right,limit){
    if(left===right)return 0;if(Math.abs(left.length-right.length)>limit)return limit+1;
    let previous=Array.from({length:right.length+1},(_,index)=>index);
    for(let row=1;row<=left.length;row++){
      const current=[row];let best=current[0];
      for(let column=1;column<=right.length;column++){const value=Math.min(current[column-1]+1,previous[column]+1,previous[column-1]+Number(left[row-1]!==right[column-1]));current[column]=value;best=Math.min(best,value)}
      if(best>limit)return limit+1;previous=current;
    }
    return previous[right.length];
  }
  function fuzzyMatch(token,meta){
    if(token.length<4)return false;const limit=token.length>=8?2:1,candidates=[meta.compact,...meta.words].filter(word=>Math.abs(word.length-token.length)<=limit);
    return candidates.some(word=>editDistanceWithin(token,word,limit)<=limit);
  }
  function searchScore(item,query,routine={score:0}){
    const meta=searchMeta(item),compactQuery=compactNormalized(query),tokens=query.split(/\s+/).filter(Boolean);
    if(!tokens.every(token=>meta.name.includes(token)||meta.compact.includes(compactNormalized(token))||meta.barcode.includes(token)||fuzzyMatch(compactNormalized(token),meta)))return null;
    let score=0;if(meta.name===query||meta.compact===compactQuery)score+=1000;else if(meta.name.startsWith(query)||meta.compact.startsWith(compactQuery))score+=600;else if(meta.words.some(word=>word.startsWith(query)))score+=350;
    for(const token of tokens){if(meta.words.some(word=>word.startsWith(token)))score+=80;if(meta.barcode===token)score+=900;if(!meta.name.includes(token)&&!meta.compact.includes(compactNormalized(token))&&fuzzyMatch(compactNormalized(token),meta))score+=35}
    const rank=featuredRank(item);return score+Number(Boolean(item.favorite))*60+Math.min(100,Number(item.uses)||0)+Math.min(220,routine.score*3)+(rank?Math.max(20,180-rank*5):0)+Number(!item.catalog)*25;
  }
  function nutritionContext(){
    const daily=typeof totals==='function'?totals(selectedDate):{calories:0,protein:0,carbs:0,fat:0},settings=typeof state==='object'?state.settings:{calories:0,protein:0,carbs:0,fat:0};
    return{daily,settings,remaining:Math.max(0,settings.calories-daily.calories),rawRemaining:settings.calories-daily.calories,proteinGap:Math.max(0,settings.protein-daily.protein),carbsGap:Math.max(0,settings.carbs-daily.carbs),fatGap:Math.max(0,settings.fat-daily.fat)};
  }
  function itemNutrition(item,factor=1){return{calories:(Number(item.calories)||0)*factor,protein:(Number(item.protein)||0)*factor,carbs:(Number(item.carbs)||0)*factor,fat:(Number(item.fat)||0)*factor}}
  function itemFit(item,context,intent=null){
    const portion=portionForItem(item,intent||undefined),factor=portion&&item.amount>0?portion.amount/item.amount:1,n=itemNutrition(item,factor),density=n.calories>0?n.protein*4/n.calories:0;let score=50;
    if(context.rawRemaining>0){const ratio=n.calories/context.rawRemaining;score+=ratio<=.7?18:ratio<=1?8:ratio>1.25?-34:-10}else score-=n.calories>500?72:n.calories>250?42:10;
    if(context.proteinGap>20){const densityBonus=n.protein>=10?Math.min(18,density*34):n.protein>=5?Math.min(7,density*14):0;score+=Math.min(34,n.protein/context.proteinGap*48)+densityBonus;if(n.protein<5)score-=22}
    if(context.fatGap<8&&n.fat>context.fatGap+5)score-=Math.min(34,12+(n.fat-context.fatGap)*.8);if(context.carbsGap<15&&n.carbs>context.carbsGap+20)score-=Math.min(30,10+(n.carbs-context.carbsGap)*.25);
    score=Math.round(Math.min(99,Math.max(1,score)));
    const label=context.proteinGap>25&&n.protein>=15&&density>=.25?'Eiweiß-Fit':context.rawRemaining<=0&&n.calories<=180&&score>=55?'Leichte Wahl':context.rawRemaining>0&&n.calories<=context.rawRemaining&&score>=78?'Budget-Fit':null;
    return{score,label,n,portion};
  }
  function foodIcon(item){
    if(item.kind==='recipe')return'🍽️';const name=normalized(item.name);
    if(/kaffee|espresso|cappuccino|latte|tee\b/.test(name))return'☕';if(/(^|\s)(ei|eier|huhnerei)(\s|$)/.test(name))return'🥚';if(/hahn|huhn|pute|geflugel/.test(name))return'🍗';if(/lachs|thunfisch|fisch/.test(name))return'🐟';if(/milch|joghurt|skyr|quark|kase/.test(name))return'🥛';if(/brot|toast|brotchen/.test(name))return'🍞';if(/reis|nudel|teigware/.test(name))return'🍚';if(/banane|apfel|beere|obst/.test(name))return'🍎';if(/kartoffel/.test(name))return'🥔';if(/fleisch|rind|schwein|hack/.test(name))return'🥩';if(/gemuse|salat|tomate|gurke|broccoli|karotte/.test(name))return'🥗';return item.source==='off'?'🥫':'🥣';
  }
  function contextScore(item,routines,context,intent){const routine=routines.get(normalized(item.name))?.score||0,rank=featuredRank(item),fit=itemFit(item,context,intent),proteinSignal=context.proteinGap>20&&fit.n.protein<5?-180:0;return routine*7+Number(Boolean(item.favorite))*90+Math.min(80,Number(item.uses)||0)+(item.catalog?(rank?130-rank*4:0):130)+fit.score*12+proteinSignal}
  function filteredItems(){
    const intent=parseSearchIntent(document.querySelector('#nutritionSearch')?.value),query=intent.query,personal=readLibrary(),catalog=readCatalog(),routines=mealRoutineMap(),context=nutritionContext();let items=[...personal];
    if(activeFilter==='favorite')items=items.filter(item=>item.favorite);else if(activeFilter==='recent')items=items.filter(item=>item.lastUsedAt);else if(activeFilter==='recipe')items=items.filter(item=>item.kind==='recipe');
    if(query&&activeFilter==='all')items.push(...availableCatalog(personal,catalog));
    else if(!query&&activeFilter==='all')items.push(...availableCatalog(personal,catalogSuggestions()));
    if(query){items=items.map(item=>{const score=searchScore(item,query,routines.get(normalized(item.name)));return{item,score:score===null?null:score+itemFit(item,context,intent).score*.2}}).filter(entry=>entry.score!==null).sort((a,b)=>b.score-a.score||String(a.item.name).localeCompare(String(b.item.name),'de')).map(entry=>entry.item);}
    else if(activeFilter==='recent')items=[...items].sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)));
    else items=[...items].sort((a,b)=>contextScore(b,routines,context,intent)-contextScore(a,routines,context,intent)||String(a.name).localeCompare(String(b.name),'de'));
    return {items,query,intent,personal,routines,context,catalogTotal:catalog.length};
  }
  function renderFilters(personal=readLibrary(),catalogTotal=readCatalog().length){
    const imported=personal.filter(item=>item.source==='bls'&&item.sourceId).length,counts={all:Math.max(0,catalogTotal-imported)+personal.length,favorite:personal.filter(item=>item.favorite).length,recent:personal.filter(item=>item.lastUsedAt).length,recipe:personal.filter(item=>item.kind==='recipe').length};
    document.querySelectorAll('[data-nutrition-filter]').forEach(button=>{const on=button.dataset.nutritionFilter===activeFilter;button.classList.toggle('active',on);button.setAttribute('aria-selected',String(on));const count=button.querySelector('[data-filter-count]');if(count)count.textContent=fmt(counts[button.dataset.nutritionFilter])});
  }
  function renderResults(){
    const renderStartedAt=Date.now(),host=document.querySelector('#nutritionResults');if(!host)return;
    const {items,query,intent,personal,routines,context,catalogTotal}=filteredItems(),title=document.querySelector('#nutritionResultTitle'),scope=document.querySelector('#nutritionResultScope'),count=document.querySelector('#nutritionResultCount'),more=document.querySelector('#nutritionShowMore'),intentNode=document.querySelector('#nutritionSearchIntent');renderFilters(personal,catalogTotal);
    if(intentNode){intentNode.hidden=!intent.amount;intentNode.textContent=intent.amount?`Mengenmodus: ${fmt(intent.amount,intent.amount%1?1:0)} ${intent.unit} werden bei passenden Treffern direkt übernommen.`:''}
    const hasRoutine=personal.some(item=>(routines.get(normalized(item.name))?.days||0)>=2),needsProtein=context.proteinGap>20;scope.textContent=query?'Lebensmitteldatenbank':activeFilter==='all'?'Jetzt passend':'Deine Bibliothek';title.textContent=query?`Treffer für „${intent.displayQuery}“`:activeFilter==='favorite'?'Deine Favoriten':activeFilter==='recent'?'Zuletzt verwendet':activeFilter==='recipe'?'Deine Rezepte':context.rawRemaining<0&&needsProtein?'Eiweiß sinnvoll ergänzen':context.rawRemaining<0?'Für morgen vormerken':needsProtein?'Eiweißziel unterstützen':hasRoutine?`Passend für ${mealType}`:`Empfohlen für ${mealType}`;
    count.textContent=`${fmt(items.length)} Treffer`;
    window.dispatchEvent(new CustomEvent('cutcoach:nutrition-search-rendered',{detail:{hasQuery:Boolean(query),resultCount:items.length,queryLengthBucket:query.length<4?'short':query.length<10?'medium':'long',latencyMs:Date.now()-renderStartedAt}}));
    if(!items.length){
      host.classList.add('is-empty');host.innerHTML=`<article class="nutrition-empty"><span aria-hidden="true">${query?'⌕':'🥣'}</span><div><b>${query?'Nichts Passendes gefunden':'Hier gibt es noch keine Einträge'}</b><p>${query?'Scanne den Barcode oder lege das Lebensmittel einmalig selbst an.':'Speichere häufige Lebensmittel und Rezepte für den schnellen Zugriff.'}</p></div><button type="button" data-nutrition-empty-add>＋ Anlegen</button></article>`;host.querySelector('[data-nutrition-empty-add]').onclick=()=>openLibraryEditor(activeFilter==='recipe'?'recipe':'food',query?intent.displayQuery:'');more.hidden=true;return;
    }
    host.classList.remove('is-empty');const capacity=typeof mealCapacity==='function'?mealCapacity():1;
    host.innerHTML=items.slice(0,visibleLimit).map(item=>{const routine=routines.get(normalized(item.name)),source=item.source==='bls'?'<i class="nutrition-source" aria-label="Quelle Bundeslebensmittelschlüssel 4.0">BLS</i>':item.source==='off'?'<i class="nutrition-source product" aria-label="Quelle Open Food Facts">Produkt</i>':'',fit=itemFit(item,context,intent),portion=fit.portion,shown=portion||{amount:item.amount,unit:item.unit||'g'},energy=fit.n.calories,quickPortion=`${fmt(shown.amount,shown.amount%1?1:0)} ${shown.unit}`;return `<article class="nutrition-result-row"><button class="nutrition-result-main" type="button" data-nutrition-open="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}, Portion auswählen"><span class="nutrition-result-icon" aria-hidden="true">${foodIcon(item)}</span><span class="nutrition-result-copy"><b><span title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>${item.favorite?'<i class="nutrition-favorite" aria-label="Favorit">★</i>':''}${routine?.days>=2?`<i class="nutrition-routine" aria-label="Häufig zu ${escapeHtml(mealType)} gewählt">Routine</i>`:''}${source}</b><small>${quickPortion} · E ${fmt(fit.n.protein,1)} · KH ${fmt(fit.n.carbs,1)} · F ${fmt(fit.n.fat,1)}</small></span></button><span class="nutrition-result-energy"><b>${fmt(energy)} kcal</b>${fit.label?`<i>${fit.label}</i>`:''}</span><button class="nutrition-result-add" type="button" data-nutrition-add="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)}, ${quickPortion}, direkt zu ${escapeHtml(mealType)} hinzufügen" ${capacity<1?'disabled':''}>＋</button></article>`}).join('');
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
    const daily=typeof totals==='function'?totals(selectedDate):{calories:0},target=Math.max(0,Number(typeof state==='object'&&state.settings?.calories)||0),remaining=target-daily.calories,budget=document.querySelector('.nutrition-day-budget'),budgetLabel=document.querySelector('#nutritionDayBudgetLabel'),budgetMeta=document.querySelector('#nutritionDayBudgetMeta'),budgetBar=document.querySelector('#nutritionDayBudgetBar');
    document.querySelector('#nutritionMealIcon').textContent=MEAL_ICONS[mealType]||'🍽️';document.querySelector('#nutritionMealKcal').textContent=`${fmt(calories)} kcal`;document.querySelector('#nutritionMealCount').textContent=countLabel(meals.length);
    const dayContext=selectedDate===todayKey()?'heute':'an diesem Tag';budget?.classList.toggle('over',remaining<0);if(budgetLabel)budgetLabel.textContent=remaining>0?`Noch ${fmt(remaining)} kcal ${dayContext}`:remaining===0?'Tagesziel genau erreicht':`${fmt(-remaining)} kcal über Tagesziel`;if(budgetMeta)budgetMeta.textContent=`${fmt(daily.calories)} von ${fmt(target)} kcal`;if(budgetBar)budgetBar.style.width=`${target>0?Math.min(100,Math.max(0,daily.calories/target*100)):0}%`;
    const context=nutritionContext(),macroConfig=[['protein','nutritionProteinGap','nutritionProteinBar','Eiweiß'],['carbs','nutritionCarbsGap','nutritionCarbsBar','Kohlenhydrate'],['fat','nutritionFatGap','nutritionFatBar','Fett']];
    for(const [key,valueId,barId] of macroConfig){const goal=Math.max(0,Number(context.settings[key])||0),value=Math.max(0,Number(context.daily[key])||0),gap=goal-value,valueNode=document.querySelector(`#${valueId}`),barNode=document.querySelector(`#${barId}`),card=document.querySelector(`[data-nutrition-macro="${key}"]`);if(valueNode)valueNode.textContent=gap>0?`${fmt(gap)} g offen`:gap===0?'Ziel erreicht':`${fmt(-gap)} g drüber`;if(barNode)barNode.style.width=`${goal>0?Math.min(100,value/goal*100):0}%`;card?.classList.toggle('over',gap<0);}
    const coach=document.querySelector('#nutritionCoachText');if(coach){coach.textContent=context.daily.calories<=0?`Dein Tagesziel: ${fmt(context.settings.calories)} kcal und ${fmt(context.settings.protein)} g Eiweiß.`:context.rawRemaining<0?context.proteinGap>15?`${fmt(-context.rawRemaining)} kcal über Ziel, noch ${fmt(context.proteinGap)} g Eiweiß offen. Kleine eiweißreiche Portionen werden priorisiert.`:`Kalorienziel erreicht. Nutze die Treffer jetzt vor allem für saubere Korrekturen.`:context.proteinGap>25?`Noch ${fmt(context.proteinGap)} g Eiweiß bei ${fmt(context.rawRemaining)} kcal – passende Treffer werden höher sortiert.`:context.fatGap<=0?`Eiweiß fast im Ziel. Das Fettziel ist bereits erreicht.`:`Noch ${fmt(context.rawRemaining)} kcal – deine Makros sind auf Kurs.`;}
    copyPrevious.hidden=!previous.length;copyPrevious.disabled=!previous.length;copyPrevious.title=previous.length?`${previous.length} ${previous.length===1?'Eintrag':'Einträge'} vom Vortag übernehmen`:`Am Vortag ist für ${mealType} nichts eingetragen`;
    toggle.hidden=!meals.length;toggle.setAttribute('aria-expanded',String(currentExpanded));toggle.innerHTML=`${currentExpanded?'Schließen':'Ansehen'} <span aria-hidden="true">${currentExpanded?'⌃':'⌄'}</span>`;host.hidden=!meals.length||!currentExpanded;
    if(!meals.length||!currentExpanded){host.innerHTML='';return}
    host.innerHTML=`<div class="nutrition-current-total"><span>${countLabel(meals.length)}</span><b>${fmt(calories)} kcal · ${fmt(protein,1)} g Eiweiß</b></div>${meals.map(item=>{const portion=item.quantity&&item.unit?`${fmt(item.quantity,item.quantity%1?1:0)} ${item.unit} · `:'';return `<article class="nutrition-current-row"><button class="nutrition-current-main" type="button" data-nutrition-edit="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} bearbeiten"><span aria-hidden="true">✓</span><span><b>${escapeHtml(item.name)}</b><small>${portion}${fmt(item.calories)} kcal · E ${fmt(item.protein,1)} · KH ${fmt(item.carbs,1)} · F ${fmt(item.fat,1)}</small></span></button><div class="nutrition-current-actions"><button type="button" data-nutrition-copy="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} duplizieren" title="Duplizieren">⧉</button><button class="delete" type="button" data-nutrition-delete="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} löschen" title="Löschen">×</button></div></article>`}).join('')}`;
  }
  function renderNutrition(){
    const screen=ensureStructure();if(!screen)return;
    screen.querySelector('#nutritionTitle').textContent=mealType;screen.querySelector('#nutritionMealSelect').value=mealType;screen.querySelector('#nutritionDate').textContent=dateCaption();screen.querySelector('#nutritionSearch').placeholder=`Was hattest du ${mealPrompt()}?`;document.body.dataset.nutritionMealType=mealType;renderCurrent();renderResults();renderFeedback();const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  function cleanNavigation(){document.querySelector('nav [data-tab="library"]')?.remove();document.querySelectorAll('.journal-section-title button,.journal-section-title a').forEach(node=>{if(node.textContent.trim().toLocaleLowerCase('de').includes('alle anzeigen'))node.remove()});document.querySelectorAll('nav [data-tab]').forEach(button=>{if(button.dataset.nutritionWatch)return;button.dataset.nutritionWatch='1';button.addEventListener('click',()=>{if(button.dataset.tab!=='food')leaveNutrition()})});window.CutCoachGlassNavV131?.enhance?.()}
  document.addEventListener('click',event=>{const add=event.target.closest('[data-add-journal-meal]');if(add){event.preventDefault();event.stopImmediatePropagation();openFoodScreen(add.dataset.addJournalMeal);return}if(event.target.closest('#journalQuickAdd')){event.preventDefault();event.stopImmediatePropagation();const hour=new Date().getHours();openFoodScreen(hour<11?'Frühstück':hour<16?'Mittagessen':hour<21?'Abendessen':'Snack')}},true);
  window.addEventListener('cutcoach:librarychange',()=>{if(document.querySelector('[data-screen="food"]')?.classList.contains('active'))renderResults()});
  const baseRender=window.render;window.render=function(){baseRender();cleanNavigation();if(document.querySelector('[data-screen="food"]')?.classList.contains('active'))renderNutrition()};document.addEventListener('DOMContentLoaded',()=>{ensureStructure();cleanNavigation()},{once:true});
})();
