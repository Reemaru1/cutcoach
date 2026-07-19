'use strict';
(function(){
  const VERSION='1.5.2-compat';
  const HARDENING='./nutrition-search-confidence-hardening-v151.js?v=1.5.2-alpha';
  const engine=()=>window.CutCoachIntelligentSearch128||null;
  const input=()=>document.querySelector('#nutritionSearch');
  let hostBootstrap=null;
  function refreshCurrent(){const current=engine(),field=input();if(!current||!field||!String(field.value||'').trim())return false;return Boolean(current.render?.(field))}
  function ensureFirstHardenedRender(){if(document.querySelector('#nutritionMultiSearch')){queueMicrotask(refreshCurrent);return}if(hostBootstrap)return;hostBootstrap=new MutationObserver(()=>{if(!document.querySelector('#nutritionMultiSearch'))return;hostBootstrap.disconnect();hostBootstrap=null;queueMicrotask(refreshCurrent)});hostBootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  function attachHardening(){window.CutCoachSearchConfidenceHardening151?.attach?.(window.CutCoachIntelligentSearch128);ensureFirstHardenedRender()}
  function ensureHardening(){if(window.CutCoachSearchConfidenceHardening151){attachHardening();return}let script=document.querySelector('script[data-confidence-hardening-v151]');if(script){const previous=script.onload;script.onload=event=>{previous?.call(script,event);attachHardening()};return}script=document.createElement('script');script.src=HARDENING;script.async=false;script.dataset.confidenceHardeningV151='1';script.onload=attachHardening;document.head.append(script)}
  function parse(value){return engine()?.parse?.(value)||[]}
  function rowsFor(value){return engine()?.rowsFor?.(value)||[]}
  function refresh(){return refreshCurrent()}
  function resolve(value){const query=typeof value==='string'?value:value?.query||'';let rows=rowsFor(query);if(!rows.length&&String(query).trim())rows=rowsFor(`1 ${query}`);const row=rows[0]||null;return Object.freeze({match:row?.item||null,alternatives:Object.freeze([...(row?.alternatives||[])]),ambiguous:row?.status==='ambiguous',confidence:Number(row?.confidence)||0,status:row?.status||'missing',matchType:row?.matchType||'none'})}
  window.CutCoachNutritionMultiSearch120=Object.freeze({version:VERSION,mode:'compatibility-facade',engineVersion:()=>engine()?.version||null,parse,rowsFor,refresh,resolve});
  ensureHardening();
})();