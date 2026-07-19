'use strict';
(function(){
  const VERSION='1.5.1-compat';
  const HARDENING='./nutrition-search-confidence-hardening-v151.js?v=1.5.1-alpha';
  const engine=()=>window.CutCoachIntelligentSearch128||null;
  const input=()=>document.querySelector('#nutritionSearch');
  function attachHardening(){window.CutCoachSearchConfidenceHardening151?.attach?.(window.CutCoachIntelligentSearch128)}
  function ensureHardening(){
    if(window.CutCoachSearchConfidenceHardening151){attachHardening();return}
    let script=document.querySelector('script[data-confidence-hardening-v151]');
    if(script){const previous=script.onload;script.onload=event=>{previous?.call(script,event);attachHardening()};return}
    script=document.createElement('script');script.src=HARDENING;script.async=false;script.dataset.confidenceHardeningV151='1';script.onload=attachHardening;document.head.append(script);
  }
  function parse(value){const current=engine();return current?.parse?.(value)||[]}
  function rowsFor(value){const current=engine();return current?.rowsFor?.(value)||[]}
  function refresh(){const current=engine(),field=input();if(!current||!field)return false;return Boolean(current.render?.(field))}
  function resolve(value){const query=typeof value==='string'?value:value?.query||'';let rows=rowsFor(query);if(!rows.length&&String(query).trim())rows=rowsFor(`1 ${query}`);const row=rows[0]||null;return Object.freeze({match:row?.item||null,alternatives:Object.freeze([...(row?.alternatives||[])]),ambiguous:row?.status==='ambiguous',confidence:Number(row?.confidence)||0,status:row?.status||'missing',matchType:row?.matchType||'none'})}
  window.CutCoachNutritionMultiSearch120=Object.freeze({version:VERSION,mode:'compatibility-facade',engineVersion:()=>engine()?.version||null,parse,rowsFor,refresh,resolve});
  ensureHardening();
})();