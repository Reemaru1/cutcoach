'use strict';

(function(root){
  const VERSION='2.3.0-alpha';
  const $=selector=>document.querySelector(selector);
  function number(value,fallback=null){
    if(value===null||value===undefined||value==='')return fallback;
    const parsed=Number(value);
    return Number.isFinite(parsed)?parsed:fallback;
  }
  function positive(value,fallback=null){const parsed=number(value);return parsed!==null&&parsed>0?parsed:fallback}
  function format(value,digits=1){return value===null?'–':value.toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits})}
  function weightEntries(current){
    return Object.entries(current?.days||{})
      .map(([date,entry])=>({date,weight:positive(entry?.weight)}))
      .filter(entry=>entry.weight!==null)
      .sort((a,b)=>a.date.localeCompare(b.date));
  }
  function journey(current){
    const profile=current?.profile||{},settings=current?.settings||{},entries=weightEntries(current);
    const start=positive(profile.baselineWeight,entries[0]?.weight??null);
    const latest=entries.at(-1)?.weight??start;
    const goal=positive(profile.goalWeight??settings.goalWeight);
    if(start===null||latest===null||goal===null)return {start,latest,goal,percent:null};
    const distance=Math.abs(goal-start);
    if(distance===0)return {start,latest,goal,percent:100};
    const moved=goal<start?start-latest:latest-start;
    return {start,latest,goal,percent:Math.max(0,Math.min(100,Math.round(moved/distance*100)))};
  }
  function ensureStructure(){
    const screen=$('[data-screen="progress"]');
    if(!screen)return null;
    let card=$('#progressGoalJourney');
    if(card)return card;
    card=document.createElement('section');
    card.id='progressGoalJourney';
    card.className='progress-goal-journey';
    card.innerHTML=`
      <div class="progress-goal-head">
        <div><small>Dein Zielverlauf</small><h3>Gewichtsreise</h3></div>
        <span id="progressGoalBadge">Plan</span>
      </div>
      <div class="progress-goal-values">
        <div><span>Start</span><strong id="progressGoalStart">–</strong></div>
        <div class="progress-goal-current"><span>Aktuell</span><strong id="progressGoalCurrent">–</strong></div>
        <div><span>Ziel</span><strong id="progressGoalTarget">–</strong></div>
      </div>
      <div class="progress-goal-track" aria-hidden="true"><i id="progressGoalFill"></i><b id="progressGoalDot"></b></div>
      <div class="progress-goal-footer">
        <strong id="progressGoalMessage">Gewichtsdaten werden vorbereitet.</strong>
        <span id="progressGoalChange">–</span>
      </div>`;
    screen.querySelector('.section-title')?.after(card);
    return card;
  }
  function render(){
    const card=ensureStructure(),current=root.state;
    if(!card||!current)return;
    const data=journey(current);
    $('#progressGoalStart').textContent=data.start===null?'Offen':`${format(data.start)} kg`;
    $('#progressGoalCurrent').textContent=data.latest===null?'Offen':`${format(data.latest)} kg`;
    $('#progressGoalTarget').textContent=data.goal===null?'Offen':`${format(data.goal)} kg`;
    const fill=$('#progressGoalFill'),dot=$('#progressGoalDot');
    const percent=data.percent??0;
    if(fill)fill.style.width=`${percent}%`;
    if(dot)dot.style.left=`${percent}%`;
    const badge=$('#progressGoalBadge');
    if(badge)badge.textContent=data.percent===null?'Profil ergänzen':`${percent}% erreicht`;
    if(data.start===null||data.latest===null){
      $('#progressGoalMessage').textContent='Trage ein gültiges Gewicht ein, um deinen Verlauf zu starten.';
      $('#progressGoalChange').textContent='Noch keine Messung';
      card.dataset.state='empty';
      return;
    }
    if(data.goal===null){
      $('#progressGoalMessage').textContent='Lege im Profil ein Wunschgewicht fest.';
      $('#progressGoalChange').textContent=`Aktuell ${format(data.latest)} kg`;
      card.dataset.state='empty';
      return;
    }
    const remaining=Math.abs(data.latest-data.goal),change=data.latest-data.start;
    if(remaining<=.05)$('#progressGoalMessage').textContent='Zielgewicht erreicht.';
    else $('#progressGoalMessage').textContent=`Noch ${format(remaining)} kg bis zu deinem Ziel.`;
    $('#progressGoalChange').textContent=Math.abs(change)<=.05?'Seit Start unverändert':`${change<0?'−':'+'}${format(Math.abs(change))} kg seit Start`;
    card.dataset.state='ready';
  }
  function boot(){
    ensureStructure();render();
    root.addEventListener('cutcoach:module-enter',event=>{if(event.detail?.moduleId==='progress')setTimeout(render,0)});
    document.addEventListener('click',event=>{if(event.target.closest('[data-open="weightModal"],#saveWeight,#saveWeightEntry,[data-save-weight]'))setTimeout(render,150)});
  }
  root.CutCoachProgressGoal=Object.freeze({version:VERSION,render,journey});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(window);
