'use strict';
(function(){
  const RELEASE='7.2.0';
  window.CUTCOACH_RELEASE=RELEASE;
  const escapeHtml=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const normalized=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('de').replace(/ß/g,'ss').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
  const compact=value=>normalized(value).replace(/\s+/g,'');
  const fmt=(value,digits=0)=>new Intl.NumberFormat('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.max(0,Number(value)||0));
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
  function recipeSearchScore(item,query){
    const name=normalized(item.name),nameCompact=compact(item.name),queryCompact=compact(query),tokens=normalized(query).split(/\s+/).filter(Boolean),limit=queryCompact.length>=9?2:1;
    const compactHit=nameCompact.includes(queryCompact)||queryCompact.includes(nameCompact),tokenHit=tokens.every(token=>name.includes(token)||nameCompact.includes(compact(token))),fuzzy=queryCompact.length>=4&&editDistanceWithin(queryCompact,nameCompact,limit)<=limit;
    if(!compactHit&&!tokenHit&&!fuzzy)return null;
    let score=0;if(nameCompact===queryCompact)score+=1200;else if(nameCompact.startsWith(queryCompact))score+=700;else if(compactHit)score+=400;if(tokenHit)score+=220;if(fuzzy)score+=60;return score+Number(Boolean(item.favorite))*80+Math.min(100,Number(item.uses)||0);
  }
  function enhanceRecipeSearch(input){
    const host=document.querySelector('#recipeV7SearchResults'),query=String(input.value||'').trim();if(!host||!query)return;
    let personal=[];try{personal=window.CutCoachLibrary?.exportData?.().items?.filter(item=>item.kind==='food')||[]}catch{}
    let catalog=[];try{catalog=window.CutCoachFoodCatalog?.items?.()||[]}catch{}
    const seen=new Set(),ranked=[];
    for(const item of [...personal,...catalog]){const key=String(item.id);if(seen.has(key))continue;seen.add(key);const score=recipeSearchScore(item,query);if(score!==null)ranked.push({item,score})}
    const items=ranked.sort((a,b)=>b.score-a.score||String(a.item.name).localeCompare(String(b.item.name),'de')).slice(0,24).map(entry=>entry.item);if(!items.length)return;
    host.innerHTML=items.map(item=>`<button type="button" data-recipe-ingredient="${escapeHtml(item.id)}"><span>${item.source==='bls'?'BLS':item.source==='off'?'Produkt':'Eigene'}</span><b>${escapeHtml(item.name)}</b><small>${fmt(item.calories)} kcal · ${fmt(item.protein,1)} g E · Basis ${fmt(item.amount,item.amount%1?1:0)} ${escapeHtml(item.unit||'g')}</small></button>`).join('');
  }
  function setVersion(){const node=document.querySelector('#appVersion'),text=`Version ${RELEASE}`;if(node&&node.textContent!==text)node.textContent=text}
  function loadJournal72(){
    if(!document.querySelector('link[data-journal-v72]')){const link=document.createElement('link');link.rel='stylesheet';link.href='./journal-v72.css?v=7.2.0';link.dataset.journalV72='1';document.head.append(link)}
    if(window.CutCoachJournalV72||document.querySelector('script[data-journal-v72]'))return;
    const script=document.createElement('script');script.src='./journal-v72.js?v=7.2.0';script.async=false;script.dataset.journalV72='1';script.onerror=()=>{try{toast?.('Tagebuch-Upgrade konnte nicht geladen werden. Bitte App neu öffnen.')}catch{}};document.head.append(script);
  }
  async function exportBackupV7(event){
    const button=event.target.closest?.('#exportData');if(!button)return;
    event.preventDefault();event.stopImmediatePropagation();
    try{
      const envelope=typeof backupEnvelope==='function'?backupEnvelope():{format:'cutcoach-backup',formatVersion:1,schemaVersion:typeof SCHEMA_VERSION==='number'?SCHEMA_VERSION:null,exportedAt:new Date().toISOString(),data:typeof state==='object'?JSON.parse(JSON.stringify(state)):null};
      envelope.appVersion=RELEASE;if(envelope.data?.meta)envelope.data.meta.appVersion=RELEASE;
      await shareOrDownload(JSON.stringify(envelope,null,2),`CutCoach-Backup-${typeof todayKey==='function'?todayKey():new Date().toISOString().slice(0,10)}.json`);
      if(typeof commitStateMutation==='function')commitStateMutation(current=>{current.meta.lastBackupAt=envelope.exportedAt;current.meta.appVersion=RELEASE});
      window.render?.();toast?.('Backup erstellt.');
    }catch(error){if(error?.name!=='AbortError')toast?.('Backup konnte nicht exportiert werden.')}
  }
  document.addEventListener('input',event=>{if(event.target?.id==='recipeV7Search')queueMicrotask(()=>enhanceRecipeSearch(event.target))});
  document.addEventListener('click',exportBackupV7,true);
  const baseRender=window.render;if(typeof baseRender==='function')window.render=function(){baseRender();setVersion()};
  const observer=new MutationObserver(setVersion);observer.observe(document.documentElement,{childList:true,subtree:true});
  const start=()=>{loadJournal72();setVersion()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();