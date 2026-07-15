'use strict';
(function(){
  const VERSION='5.9.0';
  const LIBRARY_KEY='cutcoach_library_v1';
  let mealType='Frühstück';
  let activeFilter='all';

  function readLibrary(){
    try{const parsed=JSON.parse(localStorage.getItem(LIBRARY_KEY)||'{}');return Array.isArray(parsed?.items)?parsed.items:[]}catch{return []}
  }
  function fmt(value,digits=0){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:digits,minimumFractionDigits:digits}).format(Math.max(0,Number(value)||0))}
  function escapeHtml(value){return String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]))}
  function currentDay(){return typeof day==='function'?day(selectedDate,false):{meals:[]}}
  function openFoodScreen(type=mealType){
    mealType=type||'Frühstück';
    document.querySelectorAll('[data-tab]').forEach(button=>{const on=button.dataset.tab==='food';button.classList.toggle('active',on);button.setAttribute('aria-current',on?'page':'false')});
    document.querySelectorAll('.screen').forEach(screen=>screen.classList.toggle('active',screen.dataset.screen==='food'));
    document.body.classList.remove('journal-mode');
    document.body.classList.add('nutrition-mode');
    window.scrollTo({top:0,behavior:'auto'});
    renderNutrition();
  }
  function leaveNutrition(){document.body.classList.remove('nutrition-mode')}

  function ensureStructure(){
    const screen=document.querySelector('[data-screen="food"]');
    if(!screen||screen.dataset.nutritionReady)return screen;
    screen.dataset.nutritionReady='1';
    screen.innerHTML=`
      <div class="nutrition-shell">
        <header class="nutrition-header">
          <button id="nutritionBack" class="nutrition-back" type="button" aria-label="Zurück zum Tagebuch">‹</button>
          <div><small id="nutritionDate">Heute</small><h1 id="nutritionTitle">Frühstück</h1></div>
          <button id="nutritionManual" class="nutrition-manual" type="button">＋ Manuell</button>
        </header>

        <section class="nutrition-search-card">
          <div class="nutrition-search-row">
            <span aria-hidden="true">⌕</span>
            <input id="nutritionSearch" type="search" autocomplete="off" placeholder="Lebensmittel, Gericht oder Marke suchen …">
            <button id="nutritionVoice" type="button" aria-label="Spracheingabe">🎤</button>
          </div>
          <p id="nutritionVoiceStatus">Suche lokal in deiner Bibliothek. Barcode-Produkte werden zusätzlich online geprüft.</p>
        </section>

        <section class="nutrition-actions" aria-label="Schnellaktionen">
          <button id="nutritionBarcode" type="button"><span>▣</span><b>Barcode</b><small>Produkt scannen</small></button>
          <button id="nutritionRecipe" type="button"><span>🍽️</span><b>Eigenes Rezept</b><small>Gericht speichern</small></button>
          <button id="nutritionPhoto" type="button"><span>📷</span><b>Foto</b><small>Kommt später mit KI</small></button>
        </section>

        <section class="nutrition-tabs" role="tablist" aria-label="Lebensmittelauswahl">
          <button class="active" data-nutrition-filter="all" type="button">Alle</button>
          <button data-nutrition-filter="favorite" type="button">Favoriten</button>
          <button data-nutrition-filter="recent" type="button">Zuletzt</button>
          <button data-nutrition-filter="dish" type="button">Rezepte</button>
        </section>

        <section class="nutrition-overview-card">
          <div><small id="nutritionMealLabel">Frühstück</small><strong id="nutritionMealKcal">0 kcal</strong></div>
          <div><small>Einträge</small><strong id="nutritionMealCount">0</strong></div>
          <button id="nutritionCopyPrevious" type="button">Vortag übernehmen</button>
        </section>

        <section class="nutrition-section-head"><div><small>Bibliothek</small><h2 id="nutritionResultTitle">Schnelle Auswahl</h2></div><button id="nutritionNewFood" type="button">＋ Neu</button></section>
        <div id="nutritionResults" class="nutrition-results"></div>

        <section class="nutrition-current">
          <div class="nutrition-section-head"><div><small>Ausgewählter Tag</small><h2>Bereits eingetragen</h2></div></div>
          <div id="nutritionCurrentMeals"></div>
        </section>
      </div>`;

    screen.querySelector('#nutritionBack').onclick=()=>document.querySelector('[data-tab="today"]')?.click();
    screen.querySelector('#nutritionManual').onclick=()=>openManual();
    screen.querySelector('#nutritionNewFood').onclick=()=>openLibraryEditor('food');
    screen.querySelector('#nutritionRecipe').onclick=()=>openLibraryEditor('dish');
    screen.querySelector('#nutritionBarcode').onclick=()=>openScanner();
    screen.querySelector('#nutritionPhoto').onclick=()=>toast?.('Fotoerkennung wird vorbereitet. Aktuell kannst du Barcode, Suche, Sprache oder manuelle Eingabe nutzen.');
    screen.querySelector('#nutritionCopyPrevious').onclick=()=>document.querySelector('#copyPreviousMeals')?.click();
    screen.querySelector('#nutritionSearch').addEventListener('input',renderResults);
    screen.querySelector('#nutritionVoice').onclick=startVoice;
    screen.querySelectorAll('[data-nutrition-filter]').forEach(button=>button.onclick=()=>{activeFilter=button.dataset.nutritionFilter;screen.querySelectorAll('[data-nutrition-filter]').forEach(item=>item.classList.toggle('active',item===button));renderResults()});
    return screen;
  }

  function openManual(){
    const type=document.querySelector('#mealType');if(type)type.value=mealType;
    openModal?.('mealModal');
  }
  function openScanner(){
    const tab=document.querySelector('[data-tab="library"]');
    tab?.click();
    setTimeout(()=>document.querySelector('#scanCode')?.click(),80);
  }
  function openLibraryEditor(kind){
    document.querySelector('[data-tab="library"]')?.click();
    setTimeout(()=>{
      document.querySelector('#newLibraryItem')?.click();
      if(kind==='dish')setTimeout(()=>document.querySelector('[data-kind="dish"]')?.click(),30);
    },80);
  }
  function useLibraryItem(id){
    document.querySelector('[data-tab="library"]')?.click();
    setTimeout(()=>{
      const button=document.querySelector(`[data-use-lib="${CSS.escape(id)}"]`);
      button?.click();
      setTimeout(()=>{const select=document.querySelector('#libraryMealType');if(select)select.value=mealType},40);
    },80);
  }

  function startVoice(){
    const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    const status=document.querySelector('#nutritionVoiceStatus'),input=document.querySelector('#nutritionSearch');
    if(!SpeechRecognition){toast?.('Spracheingabe wird von diesem Browser nicht unterstützt. Nutze die iPhone-Diktierfunktion in der Tastatur.');input?.focus();return}
    const recognition=new SpeechRecognition();recognition.lang='de-DE';recognition.interimResults=false;recognition.maxAlternatives=1;
    status.textContent='Ich höre zu … Sage zum Beispiel „200 Gramm Skyr“.';
    recognition.onresult=event=>{input.value=event.results[0][0].transcript;status.textContent='Sprache erkannt. Prüfe die Treffer oder trage den Eintrag manuell ein.';renderResults()};
    recognition.onerror=()=>{status.textContent='Sprache konnte nicht erkannt werden. Versuche es erneut oder nutze die Tastatur.'};
    recognition.onend=()=>{if(status.textContent==='Ich höre zu … Sage zum Beispiel „200 Gramm Skyr“.')status.textContent='Keine Sprache erkannt.'};
    try{recognition.start()}catch{input?.focus()}
  }

  function renderResults(){
    const host=document.querySelector('#nutritionResults');if(!host)return;
    const query=String(document.querySelector('#nutritionSearch')?.value||'').trim().toLocaleLowerCase('de');
    let items=readLibrary();
    if(query)items=items.filter(item=>`${item.name||''} ${item.barcode||''}`.toLocaleLowerCase('de').includes(query));
    if(activeFilter==='favorite')items=items.filter(item=>item.favorite);
    if(activeFilter==='recent')items=items.filter(item=>item.lastUsedAt).sort((a,b)=>String(b.lastUsedAt).localeCompare(String(a.lastUsedAt)));
    else if(activeFilter==='dish')items=items.filter(item=>item.kind==='dish');
    else items.sort((a,b)=>Number(b.favorite)-Number(a.favorite)||(b.uses||0)-(a.uses||0)||String(a.name).localeCompare(String(b.name),'de'));
    document.querySelector('#nutritionResultTitle').textContent=query?`Treffer für „${query}“`:activeFilter==='favorite'?'Deine Favoriten':activeFilter==='recent'?'Zuletzt verwendet':activeFilter==='dish'?'Deine Rezepte':'Schnelle Auswahl';
    if(!items.length){host.innerHTML=`<article class="nutrition-empty"><span>${query?'⌕':'🥣'}</span><b>${query?'Noch kein passender Eintrag':'Deine Bibliothek ist noch leer'}</b><p>${query?'Lege das Lebensmittel neu an oder nutze Barcode beziehungsweise manuelle Eingabe.':'Speichere häufige Lebensmittel und eigene Rezepte, damit sie hier mit einem Tipp verfügbar sind.'}</p><button type="button" id="nutritionEmptyAdd">＋ Eintrag anlegen</button></article>`;host.querySelector('#nutritionEmptyAdd').onclick=()=>openLibraryEditor('food');return}
    host.innerHTML=items.slice(0,80).map(item=>`<article class="nutrition-result-card">
      <button class="nutrition-result-main" type="button" data-nutrition-use="${escapeHtml(item.id)}">
        <span class="nutrition-result-icon">${item.kind==='dish'?'🍽️':'🥫'}</span>
        <span><b>${escapeHtml(item.name)}</b><small>${fmt(item.calories)} kcal · ${fmt(item.protein,1)} g Eiweiß · ${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')}</small></span>
      </button>
      <button class="nutrition-result-add" type="button" data-nutrition-use="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.name)} hinzufügen">＋</button>
    </article>`).join('');
    host.querySelectorAll('[data-nutrition-use]').forEach(button=>button.onclick=()=>useLibraryItem(button.dataset.nutritionUse));
  }

  function renderCurrent(){
    const host=document.querySelector('#nutritionCurrentMeals');if(!host)return;
    const meals=(currentDay().meals||[]).filter(item=>item.type===mealType);
    const calories=meals.reduce((sum,item)=>sum+(Number(item.calories)||0),0);
    document.querySelector('#nutritionMealLabel').textContent=mealType;
    document.querySelector('#nutritionMealKcal').textContent=`${fmt(calories)} kcal`;
    document.querySelector('#nutritionMealCount').textContent=String(meals.length);
    if(!meals.length){host.innerHTML='<article class="nutrition-current-empty">Für diese Mahlzeit ist noch nichts eingetragen.</article>';return}
    host.innerHTML=meals.map(item=>`<article class="nutrition-current-row"><span>✓</span><div><b>${escapeHtml(item.name)}</b><small>${fmt(item.calories)} kcal · E ${fmt(item.protein,1)} · KH ${fmt(item.carbs,1)} · F ${fmt(item.fat,1)}</small></div></article>`).join('');
  }

  function renderNutrition(){
    const screen=ensureStructure();if(!screen)return;
    const date=dateFromKey(selectedDate),today=selectedDate===todayKey();
    screen.querySelector('#nutritionDate').textContent=today?'Heute':date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
    screen.querySelector('#nutritionTitle').textContent=mealType;
    renderResults();renderCurrent();
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }

  document.addEventListener('click',event=>{
    const add=event.target.closest('[data-add-journal-meal]');
    if(add){event.preventDefault();event.stopImmediatePropagation();openFoodScreen(add.dataset.addJournalMeal);return}
    if(event.target.closest('#journalQuickAdd')){event.preventDefault();event.stopImmediatePropagation();const hour=new Date().getHours();openFoodScreen(hour<11?'Frühstück':hour<16?'Mittagessen':hour<21?'Abendessen':'Snack');return}
  },true);

  const baseRender=window.render;
  window.render=function(){baseRender();if(document.querySelector('[data-screen="food"]')?.classList.contains('active'))renderNutrition()};
  document.addEventListener('DOMContentLoaded',()=>{
    ensureStructure();
    const foodTab=document.querySelector('nav [data-tab="food"]');if(foodTab)foodTab.hidden=true;
    document.querySelectorAll('nav [data-tab]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.tab!=='food')leaveNutrition()}));
  },{once:true});
})();