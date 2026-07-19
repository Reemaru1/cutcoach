'use strict';
(function(){
  const VERSION='1.4.6-compat';
  const engine=()=>window.CutCoachIntelligentSearch128||null;
  const input=()=>document.querySelector('#nutritionSearch');
  function parse(value){const current=engine();return current?.parse?.(value)||[]}
  function rowsFor(value){const current=engine();return current?.rowsFor?.(value)||[]}
  function refresh(){const current=engine(),field=input();if(!current||!field)return false;return Boolean(current.render?.(field))}
  function resolve(value){const query=typeof value==='string'?value:value?.query||'';let rows=rowsFor(query);if(!rows.length&&String(query).trim())rows=rowsFor(`1 ${query}`);const row=rows[0]||null;return Object.freeze({match:row?.item||null,alternatives:Object.freeze([]),ambiguous:false,confidence:row?.item?(row.matchType==='exact'?100:80):0,status:row?.status||'missing'})}
  window.CutCoachNutritionMultiSearch120=Object.freeze({version:VERSION,mode:'compatibility-facade',engineVersion:()=>engine()?.version||null,parse,rowsFor,refresh,resolve});
})();