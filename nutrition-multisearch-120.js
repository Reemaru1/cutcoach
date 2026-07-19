'use strict';
(function(){
  const VERSION='1.5.3-compat';
  const ASSETS=[
    {selector:'script[data-nutrition-portion-profiles-v153],script[data-portion-profiles-v153]',dataset:'nutritionPortionProfilesV153',src:'./nutrition-portion-profiles-v153.js?v=1.5.3-alpha',ready:()=>Boolean(window.CutCoachPortionProfiles153)},
    {selector:'script[data-nutrition-portion-hardening-v153],script[data-portion-hardening-v153]',dataset:'nutritionPortionHardeningV153',src:'./nutrition-portion-hardening-v153.js?v=1.5.3-alpha',ready:()=>Boolean(window.CutCoachPortionHardening153)},
    {selector:'script[data-nutrition-search-confidence-hardening-v151],script[data-confidence-hardening-v151]',dataset:'nutritionSearchConfidenceHardeningV151',src:'./nutrition-search-confidence-hardening-v151.js?v=1.5.2-alpha',ready:()=>Boolean(window.CutCoachSearchConfidenceHardening151)}
  ];
  const engine=()=>window.CutCoachIntelligentSearch128||null;
  const input=()=>document.querySelector('#nutritionSearch');
  let hostBootstrap=null;
  function refreshCurrent(){const current=engine(),field=input();if(!current||!field||!String(field.value||'').trim())return false;return Boolean(current.render?.(field))}
  function ensureFirstHardenedRender(){if(document.querySelector('#nutritionMultiSearch')){queueMicrotask(refreshCurrent);return}if(hostBootstrap)return;hostBootstrap=new MutationObserver(()=>{if(!document.querySelector('#nutritionMultiSearch'))return;hostBootstrap.disconnect();hostBootstrap=null;queueMicrotask(refreshCurrent)});hostBootstrap.observe(document.body||document.documentElement,{childList:true,subtree:true})}
  function attachLayers(){let current=engine();current=window.CutCoachSearchConfidenceHardening151?.attach?.(current)||current;current=window.CutCoachPortionHardening153?.attach?.(current)||current;ensureFirstHardenedRender()}
  function loadAsset(index){if(index>=ASSETS.length){attachLayers();return}const asset=ASSETS[index];if(asset.ready()){loadAsset(index+1);return}let script=document.querySelector(asset.selector);if(script){const previous=script.onload;script.onload=event=>{previous?.call(script,event);loadAsset(index+1)};return}script=document.createElement('script');script.src=asset.src;script.async=false;script.dataset[asset.dataset]='1';script.onload=()=>loadAsset(index+1);document.head.append(script)}
  function parse(value){return engine()?.parse?.(value)||[]}
  function rowsFor(value){return engine()?.rowsFor?.(value)||[]}
  function refresh(){return refreshCurrent()}
  function resolve(value){const query=typeof value==='string'?value:value?.query||'';let rows=rowsFor(query);if(!rows.length&&String(query).trim())rows=rowsFor(`1 ${query}`);const row=rows[0]||null;return Object.freeze({match:row?.item||null,alternatives:Object.freeze([...(row?.alternatives||[])]),ambiguous:row?.status==='ambiguous',confidence:Number(row?.confidence)||0,status:row?.status||'missing',matchType:row?.matchType||'none',amountLabel:row?.amountLabel||'',portionSource:row?.portionSource||null})}
  window.CutCoachNutritionMultiSearch120=Object.freeze({version:VERSION,mode:'compatibility-facade',engineVersion:()=>engine()?.version||null,parse,rowsFor,refresh,resolve});
  loadAsset(0);
})();