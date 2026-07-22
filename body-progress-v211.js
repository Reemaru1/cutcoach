'use strict';
(function(){
  const VERSION='2.1.1-reference';
  const PERIOD_KEY='cutcoach_body_progress_period_v1';
  const MODE_KEY='cutcoach_body_progress_mode_v1';
  const BODY_ASSET='./body-progress-body-v211.b64?v=2.1.1-reference';
  const TRAINING_ASSET='./body-progress-training-v211.b64?v=2.1.1-reference';
  const assetCache=new Map();
  let mode=readMode();
  let period=readPeriod();
  let renderProgressBase=null;
  let progressObserver=null;

  const q=(selector,root=document)=>root.querySelector(selector);
  const qa=(selector,root=document)=>[...root.querySelectorAll(selector)];
  const clamp=(value,min=0,max=1)=>Math.min(max,Math.max(min,Number(value)||0));
  const fmt=(value,digits=0)=>Number.isFinite(Number(value))?new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Number(value)):'–';
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function readMode(){try{return localStorage.getItem(MODE_KEY)==='training'?'training':'body'}catch{return'body'}}
  function readPeriod(){try{const value=Number(localStorage.getItem(PERIOD_KEY));return[7,14,30].includes(value)?value:7}catch{return 7}}
  function savePreference(key,value){try{localStorage.setItem(key,String(value))}catch{}}
  function api210(){return window.CutCoachBodyProgress210||null}
  function sparkline(values,tone='mint'){
    const nums=values.map(Number).filter(Number.isFinite);if(nums.length<2)return'<div class="bp211-spark-empty"></div>';
    const min=Math.min(...nums),max=Math.max(...nums),range=Math.max(.001,max-min),points=nums.map((value,index)=>`${(index/(nums.length-1)*100).toFixed(1)},${(35-(value-min)/range*28).toFixed(1)}`).join(' ');
    return`<svg class="bp211-spark bp211-spark-${tone}" viewBox="0 0 100 38" preserveAspectRatio="none" aria-hidden="true"><polyline points="${points}"/><circle cx="100" cy="${points.split(' ').at(-1).split(',')[1]}" r="2.5"/></svg>`;
  }
  function view(){
    const api=api210();
    if(!api)return null;
    try{api.setPeriod(period);api.setMode(mode);return api.snapshot()}catch(error){console.warn('Body Progress 2.1.1 konnte Daten nicht lesen:',error);return null}
  }
  async function assetData(url){
    if(assetCache.has(url))return assetCache.get(url);
    const promise=fetch(url,{cache:'force-cache'}).then(response=>{if(!response.ok)throw new Error(`Asset ${response.status}`);return response.text()}).then(text=>`data:image/webp;base64,${text.trim()}`).catch(()=>null);
    assetCache.set(url,promise);return promise;
  }
  function navIcon(path,label){return`<span class="cc-nav-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${path}</svg></span><span class="cc-nav-label">${label}</span>`}
  function ensureReferenceNav(){
    const nav=q('nav[aria-label="Hauptnavigation"]');if(!nav)return;
    const today=q('[data-tab="today"]',nav),food=q('[data-tab="food"]',nav),progress=q('[data-tab="progress"]',nav),settings=q('[data-tab="settings"]',nav);
    if(!today||!food||!progress||!settings)return;
    food.innerHTML=navIcon('<path d="M12 21c4.6 0 7-4.1 7-8.3C19 8.9 16.5 6 13.3 6c-.6 0-1 .1-1.3.3C11.7 6.1 11.3 6 10.7 6 7.5 6 5 8.9 5 12.7 5 16.9 7.4 21 12 21Z"/><path d="M12 6c0-2 1.2-3.3 3.4-3.8M9 4.3c1.6 0 2.7.6 3 2"/>','Ernährung');food.dataset.glassNavKey='food';
    let training=q('[data-bp211-training-nav]',nav);
    if(!training){training=document.createElement('button');training.type='button';training.dataset.bp211TrainingNav='1';training.innerHTML=navIcon('<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12"/>','Training');training.setAttribute('aria-label','Trainingsfortschritt öffnen');training.addEventListener('click',event=>{event.preventDefault();mode='training';savePreference(MODE_KEY,mode);api210()?.setMode?.(mode);if(location.hash!=='#progress')history.replaceState(null,'','#progress');window.dispatchEvent(new Event('hashchange'));render();window.scrollTo({top:0,behavior:'smooth'})})}
    if(!progress.dataset.bp211Bound){progress.dataset.bp211Bound='1';progress.addEventListener('click',()=>{mode='body';savePreference(MODE_KEY,mode);api210()?.setMode?.(mode);queueMicrotask(render)},true)}
    nav.append(today,food,progress,training,settings);
    nav.classList.add('bp211-reference-nav');
  }
  function topbar(){return`<header class="bp211-topbar"><button type="button" class="bp211-top-icon" aria-label="Menü"><span></span><span></span><span></span></button><div class="bp211-logo"><b>Cut</b><strong>Coach</strong></div><button type="button" class="bp211-bell" aria-label="Benachrichtigungen"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg><i></i></button></header>`}
  function template(){return`<div class="bp211-shell" data-mode="${mode}">${topbar()}<section class="bp211-heading"><div><h1>BODY<br><span>PROGRESS</span></h1><p id="bp211Subtitle"></p></div><label class="bp211-period"><span class="sr-only">Zeitraum</span><select id="bp211Period"><option value="7">Diese Woche</option><option value="14">14 Tage</option><option value="30">30 Tage</option></select></label></section><section class="bp211-hero"><aside class="bp211-column bp211-left" id="bp211Left"></aside><div class="bp211-figure"><div class="bp211-figure-glow"></div><img id="bp211Figure" alt="Anatomische CutCoach Körperdarstellung"><div class="bp211-scan"></div></div><aside class="bp211-column bp211-right" id="bp211Right"></aside></section><section class="bp211-insight" id="bp211Insight"></section><section class="bp211-history-section"><div class="bp211-history-head"><div><small>VERLAUF</small><h2>Gewicht</h2></div><button type="button" data-bp211-weight>+ Gewicht</button></div><div class="bp211-history" id="bp211History"></div></section><p class="bp211-method">Körper- und Trainingsdarstellungen visualisieren deine protokollierten Trends. Sie sind keine medizinische Körperfett- oder Regenerationsmessung.</p></div>`}
  function build(){
    const screen=q('[data-screen="progress"]');if(!screen)return null;
    if(screen.dataset.bodyProgressV211!=='1'){
      screen.dataset.bodyProgressV210='1';screen.dataset.bodyProgressV211='1';screen.innerHTML=template();bind(screen);
    }
    return screen;
  }
  function ring(value,label,meta){const percent=Math.round(clamp(value)*100);return`<div class="bp211-ring" style="--ring:${percent*3.6}deg"><div><b>${percent}%</b><span>${label}</span></div></div><small>${meta}</small>`}
  function bodyCards(v){
    const weights=v.weights||[],weightValues=weights.slice(-8).map(([,item])=>Number(item.weight)),current=v.currentWeight,trend=v.trend?.value;
    const trendText=trend==null?'–':`${trend>0?'+':''}${fmt(trend,1)} kg`;
    const progress=v.progress==null?0:v.progress;
    const left=`<article><span>KÖRPERSTATUS</span><i class="bp211-status-dot"></i><h3>${esc(v.status)}</h3><p>${esc(v.description)}</p>${sparkline(weightValues.length>1?weightValues.slice().reverse():[0,0.2,0.4,0.6],'mint')}</article><article><span>GEWICHTSTREND</span><h3>${current==null?'–':`${fmt(current,1)} kg`}</h3><em class="${trend!=null&&trend<=0?'positive':'warning'}">${trendText}</em><p>${esc(v.trend?.basis||'zu wenig Messungen')}</p>${sparkline(weightValues,'mint')}</article><article><span>KALORIENDEFIZIT</span><h3>${v.logged?.length?`${fmt(v.avgDeficit)} kcal`:'–'}</h3><p>Ø täglich · protokollierte Tage</p><div class="bp211-progress"><i style="width:${clamp(Math.abs(v.avgDeficit||0)/800)*100}%"></i></div></article>`;
    const right=`<article class="bp211-ring-card"><span>BAUCHBEREICH</span>${ring(progress,'Zielverlauf','seit Beginn')}<div class="bp211-mini-status"><i></i><b>${progress>0?'Bauch/Taille reagiert positiv':'Daten werden aufgebaut'}</b></div></article><article><span>ZIELKURS</span><div class="bp211-target-icon">◎</div><h3>${v.goalWeight==null?'–':`${fmt(v.goalWeight,1)} kg`}</h3><p>Zielgewicht</p><div class="bp211-progress"><i style="width:${Math.round(progress*100)}%"></i></div><em>${Math.round(progress*100)}% erreicht</em></article>`;
    return{left,right,subtitle:'Dein Körper verändert sich. Daten. Analyse. Ergebnisse.',insightTitle:progress>0?'Bauchbereich reagiert positiv':v.status,insightText:progress>0?'Dein dokumentierter Gesamttrend bewegt sich in Richtung einer schlankeren Körpermitte.':v.description,insightValue:`+${Math.round(((v.adherence?.calories||0)+(v.adherence?.protein||0))/2*100)}%`,insightMeta:'Routinequalität'};
  }
  function trainingCards(v){
    const gym=v.training?.gymDays||0,goal=Math.max(1,v.training?.gymGoal||v.config?.gymGoal||1),focus=clamp(gym/goal),protein=clamp(v.adherence?.protein||0),steps=clamp(v.adherence?.steps||0),stimulus=clamp(focus*.62+protein*.28+steps*.1),recovery=clamp(protein*.65+steps*.35),volumeDelta=Math.round((focus-.5)*28);
    const left=`<article class="bp211-focus-card"><span>TRAININGSFOKUS</span><div class="bp211-target-icon orange">◎</div><h3>${gym?'Schultern & Arme':'Training erfassen'}</h3><p>${gym?'Primärer visueller Fokus für den aktuellen Prototyp.':'Nach dem ersten Training wird der Fokus sichtbar.'}</p>${ring(focus,'Fokus-Treffer','Rhythmus')}</article><article><span>MUSKELREIZ</span><div class="bp211-wave">≋</div><h3 class="orange">${stimulus>.75?'Hoch':stimulus>.4?'Solide':'Aufbauen'}</h3><p>${stimulus>.65?'Der Trainingsrhythmus liegt im Zielbereich.':'Mehr vollständige Trainingsdaten verbessern die Bewertung.'}</p>${sparkline([.18,.24,.32,.42,.51,.62,stimulus],'orange')}</article><article><span>VOLUMEN</span><div class="bp211-dumbbell">↔</div><h3>${gym} <small>Einheiten</small></h3><em class="${volumeDelta>=0?'orange':'warning'}">${volumeDelta>=0?'+':''}${volumeDelta}%</em><p>Rhythmusvergleich</p>${sparkline([.15,.18,.25,.22,.35,.42,focus],'orange')}</article>`;
    const right=`<article class="bp211-muscle-card"><span>BELASTETE MUSKELN</span><div class="bp211-mini-body"><img data-bp211-mini alt="Muskelübersicht"></div><p><i class="primary"></i> Hauptsächlich belastet</p><p><i class="secondary"></i> Sekundär belastet</p></article><article><span>REGENERATION</span><div class="bp211-heart">♡ <b>${fmt(recovery*10,1)}<small>/10</small></b></div><h3 class="orange">${recovery>.75?'Sehr gut':recovery>.5?'Solide':'Aufbauen'}</h3><p>Schätzung aus Eiweiß- und Aktivitätsdaten.</p>${ring(recovery,'erholt','Regenerationsbasis')}</article><article><span>FORTSCHRITT</span><div class="bp211-target-icon orange">↗</div><h3 class="orange">+${Math.round(focus*15)}%</h3><p>Trainingsrhythmus im gewählten Zeitraum</p>${sparkline([.12,.18,.25,.32,.38,.47,focus],'orange')}</article>`;
    return{left,right,subtitle:'Trainingsreiz analysiert. Muskeln im Fokus & in Entwicklung.',insightTitle:gym?'Schulterbereich im Trainingsfokus':'Trainingsdaten aufbauen',insightText:gym?'Dein Trainingsrhythmus zeigt Wirkung. Das exakte Muskelmapping wird mit dem Gym-Modul noch präziser.':'Erfasse deine Trainingstage, damit CutCoach deinen Belastungsrhythmus bewerten kann.',insightValue:`+${Math.round(focus*18)}%`,insightMeta:'im Zeitraum'};
  }
  function history(v){
    const items=(v.weights||[]).slice(-6).reverse();if(!items.length)return'<div class="bp211-empty">Noch keine Gewichtseinträge.</div>';
    return items.map(([key,item],index)=>{const previous=items[index+1],delta=previous?Number(item.weight)-Number(previous[1].weight):null;return`<button type="button" data-bp211-weight-date="${esc(key)}"><span><b>${new Date(`${key}T12:00:00`).toLocaleDateString('de-DE')}</b><small>${delta==null?'Start':`${delta>0?'+':''}${fmt(delta,1)} kg`}</small></span><strong>${fmt(item.weight,1)} kg</strong></button>`}).join('')
  }
  function applyAsset(src,mini=false){if(!src)return;const figure=q('#bp211Figure');if(figure)figure.src=src;if(mini)qa('[data-bp211-mini]').forEach(image=>image.src=src)}
  async function render(){
    const screen=build();if(!screen)return;
    ensureReferenceNav();
    const v=view();if(!v)return;
    const cards=mode==='training'?trainingCards(v):bodyCards(v);
    const shell=q('.bp211-shell',screen);shell.dataset.mode=mode;
    q('#bp211Subtitle',screen).textContent=cards.subtitle;
    q('#bp211Period',screen).value=String(period);
    q('#bp211Left',screen).innerHTML=cards.left;
    q('#bp211Right',screen).innerHTML=cards.right;
    q('#bp211Insight',screen).innerHTML=`<div class="bp211-insight-icon">✦</div><div><span>KÖRPER INSIGHT</span><h3>${esc(cards.insightTitle)}</h3><p>${esc(cards.insightText)}</p></div><div class="bp211-insight-stat"><b>${esc(cards.insightValue)}</b><small>${esc(cards.insightMeta)}</small></div>`;
    q('#bp211History',screen).innerHTML=history(v);
    const active=screen.classList.contains('active');document.body.classList.toggle('body-progress-v211-active',active);
    const src=await assetData(mode==='training'?TRAINING_ASSET:BODY_ASSET);applyAsset(src,mode==='training');
  }
  function openWeight(key){if(key&&typeof window.selectDate==='function')window.selectDate(key);const input=q('#weightInput'),clear=q('#clearWeight'),data=typeof window.day==='function'?window.day(window.selectedDate,false):null;if(input)input.value=data?.weight??'';if(clear)clear.hidden=data?.weight==null;if(typeof window.openModal==='function')window.openModal('weightModal')}
  function bind(screen){
    screen.addEventListener('change',event=>{if(event.target.id==='bp211Period'){period=[7,14,30].includes(Number(event.target.value))?Number(event.target.value):7;savePreference(PERIOD_KEY,period);api210()?.setPeriod?.(period);render()}});
    screen.addEventListener('click',event=>{if(event.target.closest('[data-bp211-weight]'))openWeight();const row=event.target.closest('[data-bp211-weight-date]');if(row)openWeight(row.dataset.bp211WeightDate)});
  }
  function syncActive(){const active=q('[data-screen="progress"]')?.classList.contains('active');document.body.classList.toggle('body-progress-v211-active',Boolean(active));if(active)render()}
  function install(){
    build();ensureReferenceNav();
    if(typeof window.renderProgress==='function'&&!window.renderProgress.__bodyProgressV211){renderProgressBase=window.renderProgress;const wrapped=function(){renderProgressBase();queueMicrotask(render)};wrapped.__bodyProgressV211=true;window.renderProgress=wrapped}
    const progress=q('[data-screen="progress"]');if(progress&&!progressObserver){progressObserver=new MutationObserver(syncActive);progressObserver.observe(progress,{attributes:true,attributeFilter:['class']})}
    window.addEventListener('hashchange',syncActive);render();syncActive();
  }
  function start(){if(!api210()){setTimeout(start,50);return}install()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else queueMicrotask(start);
  window.CutCoachBodyProgress211=Object.freeze({version:VERSION,refresh:render,setMode(next){mode=next==='training'?'training':'body';savePreference(MODE_KEY,mode);api210()?.setMode?.(mode);return render()},setPeriod(next){if([7,14,30].includes(Number(next))){period=Number(next);savePreference(PERIOD_KEY,period);api210()?.setPeriod?.(period)}return render()}})
})();
