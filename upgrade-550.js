'use strict';
(function(){
  const VERSION='5.5.0';
  const mealIcons={'Frühstück':'☕','Mittagessen':'🥗','Abendessen':'🌙','Snack':'🍎'};
  const fmtLocal=value=>new Intl.NumberFormat('de-DE',{maximumFractionDigits:0}).format(Math.max(0,Number(value)||0));
  const pct=(value,goal)=>goal>0?Math.min(100,Math.max(0,value/goal*100)):0;
  function greeting(){const h=new Date().getHours();return h<11?'Guten Morgen':h<17?'Hallo':'Guten Abend'}
  function coachText(t,data,s){
    if(!t.calories)return 'Starte entspannt in den Tag. Trage deine erste Mahlzeit ein und CutCoach begleitet dich Schritt für Schritt.';
    const notes=[];
    const proteinLeft=Math.max(0,s.protein-t.protein);
    const kcalLeft=s.calories-t.calories;
    if(proteinLeft>25)notes.push(`Noch ${fmtLocal(proteinLeft)} g Eiweiß bis zum Ziel`); else notes.push('Dein Eiweiß liegt gut im Plan');
    if(kcalLeft<0)notes.push(`${fmtLocal(Math.abs(kcalLeft))} kcal über deinem Tagesziel`); else if(kcalLeft<350)notes.push('Du bist fast am Kalorienziel'); else notes.push(`${fmtLocal(kcalLeft)} kcal flexibel verfügbar`);
    if(s.steps>0){if(data.steps===null)notes.push('Schritte später ergänzen');else if(data.steps>=s.steps)notes.push('Schrittziel erreicht');else notes.push(`${fmtLocal(s.steps-data.steps)} Schritte fehlen`)}
    return notes.join(' · ')+'.';
  }
  function ensure(){
    const screen=document.querySelector('[data-screen="today"]');
    if(!screen||document.querySelector('#today550'))return;
    const hero=screen.querySelector('.hero');
    if(!hero)return;
    const wrap=document.createElement('div');wrap.id='today550';wrap.className='today550';
    wrap.innerHTML=`
      <section class="today-welcome">
        <div><span id="todayGreeting">Hallo</span><h2 id="todayHeadline">Dein Tag auf einen Blick</h2><p id="todaySubline"></p></div>
        <button id="todayQuickMeal" type="button" aria-label="Mahlzeit hinzufügen">＋</button>
      </section>
      <section class="today-energy-card">
        <div class="energy-ring" id="energyRing"><div><small>Noch verfügbar</small><strong id="energyRemaining">0</strong><span>kcal</span></div></div>
        <div class="energy-side">
          <div><span>Gegessen</span><b id="energyEaten">0 kcal</b></div>
          <div><span>Tagesziel</span><b id="energyGoal">0 kcal</b></div>
          <div><span>Fortschritt</span><b id="energyPercent">0 %</b></div>
        </div>
      </section>
      <section class="today-macro-rings" aria-label="Makronährstoffe">
        ${[['protein','Eiweiß','💪'],['carbs','Kohlenhydrate','🍚'],['fat','Fett','🥑']].map(([key,label,icon])=>`<article><div class="mini-ring" id="${key}MiniRing"><span>${icon}</span></div><div><b>${label}</b><small id="${key}MiniText">0 / 0 g</small></div></article>`).join('')}
      </section>
      <section class="today-coach-card"><div class="coach-orb">✦</div><div><small>CutCoach Impuls</small><strong id="coachHeadline">Dein Tagesfokus</strong><p id="coachMessage"></p></div></section>
      <section class="today-meals-card">
        <div class="today-section-head"><div><small>Ernährung</small><h3>Deine Mahlzeiten</h3></div><button id="openFood550" type="button">Alle anzeigen</button></div>
        <div id="todayMeals550" class="today-meals-list"></div>
      </section>`;
    hero.before(wrap);
    hero.classList.add('legacy-today-hidden');
    screen.querySelector('.macros')?.classList.add('legacy-today-hidden');
    document.querySelector('#todayQuickMeal').onclick=()=>openMealQuick('Frühstück');
    document.querySelector('#openFood550').onclick=()=>document.querySelector('[data-tab="food"]')?.click();
  }
  function openMealQuick(type){
    document.querySelector('[data-tab="food"]')?.click();
    setTimeout(()=>{const select=document.querySelector('#mealType');if(select)select.value=type;openModal?.('mealModal')},40);
  }
  function renderMeals550(data){
    const host=document.querySelector('#todayMeals550');if(!host)return;
    host.innerHTML=MEAL_TYPES.map(type=>{
      const items=data.meals.filter(m=>m.type===type),cal=items.reduce((sum,m)=>sum+(Number(m.calories)||0),0);
      return `<button class="today-meal-row" type="button" data-meal550="${type}"><span class="meal550-icon">${mealIcons[type]||'🍽️'}</span><span><b>${type}</b><small>${items.length?`${items.length} Eintrag${items.length===1?'':'e'} · ${fmtLocal(cal)} kcal`:'Noch nichts eingetragen'}</small></span><strong>${items.length?'›':'＋'}</strong></button>`;
    }).join('');
    host.querySelectorAll('[data-meal550]').forEach(btn=>btn.onclick=()=>openMealQuick(btn.dataset.meal550));
  }
  function render550(){
    ensure();
    const s=state.settings,data=day(selectedDate,false),t=totals(),remaining=s.calories-t.calories,calPct=pct(t.calories,s.calories);
    const date=dateFromKey(selectedDate);
    const isToday=selectedDate===todayKey();
    document.querySelector('#todayGreeting').textContent=isToday?greeting():'Tagesrückblick';
    document.querySelector('#todayHeadline').textContent=isToday?'Dein persönlicher Tagesplan':'So lief dieser Tag';
    document.querySelector('#todaySubline').textContent=date.toLocaleDateString('de-DE',{weekday:'long',day:'numeric',month:'long'});
    document.querySelector('#energyRemaining').textContent=fmtLocal(Math.abs(remaining));
    document.querySelector('#energyRemaining').parentElement.classList.toggle('over',remaining<0);
    document.querySelector('#energyEaten').textContent=`${fmtLocal(t.calories)} kcal`;
    document.querySelector('#energyGoal').textContent=`${fmtLocal(s.calories)} kcal`;
    document.querySelector('#energyPercent').textContent=`${Math.round(calPct)} %`;
    document.querySelector('#energyRing').style.setProperty('--ring',`${calPct*3.6}deg`);
    [['protein',t.protein,s.protein],['carbs',t.carbs,s.carbs],['fat',t.fat,s.fat]].forEach(([key,val,goal])=>{
      const ring=document.querySelector(`#${key}MiniRing`);if(ring)ring.style.setProperty('--ring',`${pct(val,goal)*3.6}deg`);
      const text=document.querySelector(`#${key}MiniText`);if(text)text.textContent=`${fmtLocal(val)} / ${fmtLocal(goal)} g`;
    });
    const coach=document.querySelector('#coachMessage');if(coach)coach.textContent=coachText(t,data,s);
    const ch=document.querySelector('#coachHeadline');if(ch)ch.textContent=t.calories?'Das ist heute wichtig':'Bereit für deinen Tag';
    renderMeals550(data);
    const version=document.querySelector('#appVersion');if(version)version.textContent=`Version ${VERSION}`;
  }
  const baseRender=window.render;
  window.render=function(){baseRender();render550()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>{ensure();render550()},80),{once:true});else setTimeout(()=>{ensure();render550()},80);
})();
