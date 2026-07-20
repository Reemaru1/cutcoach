'use strict';
(function(){
  const VERSION='1.9.0-compat';
  if(window.CutCoachNutritionMultiSearch120?.version===VERSION)return;
  const ASSET_TIMEOUT_MS=4500;
  const ASSETS=[
    {selector:'script[data-nutrition-portion-profiles-v153],script[data-portion-profiles-v153]',dataset:'nutritionPortionProfilesV153',src:'./nutrition-portion-profiles-v153.js?v=1.5.3-alpha',ready:()=>Boolean(window.CutCoachPortionProfiles153)},
    {selector:'script[data-nutrition-portion-hardening-v153],script[data-portion-hardening-v153]',dataset:'nutritionPortionHardeningV153',src:'./nutrition-portion-hardening-v153.js?v=1.9.0-alpha',ready:()=>Boolean(window.CutCoachPortionHardening153)},
    {selector:'script[data-nutrition-search-learning-v161],script[data-search-learning-v161]',dataset:'nutritionSearchLearningV161',src:'./nutrition-search-learning-v161.js?v=1.6.1-alpha',ready:()=>Boolean(window.CutCoachSearchLearning161)},
    {selector:'script[data-nutrition-search-exact-whole-v170],script[data-search-exact-whole-v170]',dataset:'nutritionSearchExactWholeV170',src:'./nutrition-search-exact-whole-v170.js?v=1.9.0-alpha',ready:()=>Boolean(window.CutCoachSearchExactWhole170)},
    {selector:'script[data-nutrition-search-confidence-hardening-v151],script[data-confidence-hardening-v151]',dataset:'nutritionSearchConfidenceHardeningV151',src:'./nutrition-search-confidence-hardening-v151.js?v=1.9.0-alpha',ready:()=>Boolean(window.CutCoachSearchConfidenceHardening151)}
  ];
  const currentDocument=()=>window.document||null;
  const engine=()=>window.CutCoachIntelligentSearch128||null;
  const input=()=>currentDocument()?.querySelector?.('#nutritionSearch')||null;
  let bootstrapObserver=null;
  function refreshCurrent(){const current=engine(),field=input();if(!current||!field||!String(field.value||'').trim())return false;return Boolean(current.render?.(field))}
  function ensureFirstHardenedRender(){if(refreshCurrent()){bootstrapObserver?.disconnect();bootstrapObserver=null;return}if(bootstrapObserver)return;const page=currentDocument(),target=page?.body||page?.documentElement;if(!target)return;bootstrapObserver=new MutationObserver(()=>{if(!refreshCurrent())return;bootstrapObserver?.disconnect();bootstrapObserver=null});bootstrapObserver.observe(target,{childList:true,subtree:true})}
  function attachLayers(){let current=engine();current=window.CutCoachSearchExactWhole170?.attach?.(current)||current;current=window.CutCoachSearchConfidenceHardening151?.attach?.(current)||current;current=window.CutCoachPortionHardening153?.attach?.(current)||current;window.CutCoachSearchLearning161?.installLibraryHook?.();queueMicrotask(ensureFirstHardenedRender)}
  function loadAsset(index){
    if(index>=ASSETS.length){attachLayers();return}
    const asset=ASSETS[index];if(asset.ready()){loadAsset(index+1);return}
    const page=currentDocument();if(!page)return;
    let completed=false,timeout=0;
    const next=()=>{if(completed)return;completed=true;clearTimeout(timeout);loadAsset(index+1)};
    timeout=setTimeout(next,ASSET_TIMEOUT_MS);
    let script=page.querySelector?.(asset.selector);
    if(script){const previousLoad=script.onload,previousError=script.onerror;script.onload=event=>{previousLoad?.call(script,event);next()};script.onerror=event=>{previousError?.call(script,event);next()};queueMicrotask(()=>{if(asset.ready())next()});return}
    script=page.createElement('script');script.src=asset.src;script.async=false;script.dataset[asset.dataset]='1';script.onload=next;script.onerror=next;(page.head||page.documentElement)?.append(script);
  }
  function parse(value){return engine()?.parse?.(value)||[]}
  function rowsFor(value){return engine()?.rowsFor?.(value)||[]}
  function refresh(){return refreshCurrent()}
  function resolve(value){
    const query=typeof value==='string'?value:value?.query||'';let rows=rowsFor(query);
    if(!rows.length&&String(query).trim())rows=rowsFor(`1 ${query}`);
    if(rows.length>1){const alternatives=[...new Set(rows.map(row=>row.item?.name||row.query).filter(Boolean))];return Object.freeze({match:null,alternatives:Object.freeze(alternatives),ambiguous:false,multiple:true,confidence:0,status:'multiple',matchType:'multiple',amountLabel:'',portionSource:null,personalReason:'',invalidQuantity:rows.some(row=>Boolean(row.invalidQuantity))})}
    const row=rows[0]||null;
    return Object.freeze({match:row?.item||null,alternatives:Object.freeze([...(row?.alternatives||[])]),ambiguous:row?.status==='ambiguous',multiple:false,confidence:Number(row?.confidence)||0,status:row?.status||'missing',matchType:row?.matchType||'none',amountLabel:row?.amountLabel||'',portionSource:row?.portionSource||null,personalReason:row?.personalReason||'',invalidQuantity:Boolean(row?.invalidQuantity)});
  }
  window.CutCoachNutritionMultiSearch120=Object.freeze({version:VERSION,mode:'compatibility-facade',engineVersion:()=>engine()?.version||null,parse,rowsFor,refresh,resolve});
  loadAsset(0);
})();
