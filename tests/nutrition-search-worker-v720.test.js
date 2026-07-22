'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const {performance}=require('node:perf_hooks');

(async()=>{
  const root=path.resolve(__dirname,'..'),source=fs.readFileSync(path.join(root,'nutrition-search-worker.js'),'utf8'),index=JSON.parse(fs.readFileSync(path.join(root,'assets','nutrition-search-index-v1.json'),'utf8')),messages=[];
  const self={postMessage:message=>messages.push(message)};
  const context=vm.createContext({self,performance,fetch:async()=>({ok:true,status:200,json:async()=>index})});
  vm.runInContext(source,context,{filename:'nutrition-search-worker.js'});

  await self.onmessage({data:{type:'init',indexUrl:'./assets/nutrition-search-index-v1.json'}});
  const ready=messages.pop();assert.equal(ready.type,'ready');assert.equal(ready.workerVersion,'1.0.0');assert.equal(ready.indexVersion,'1.0.0');assert.equal(ready.count,7295);

  await self.onmessage({data:{type:'search',requestId:1,query:'Pizza',mealIndex:2,routines:[]}});
  const pizza=messages.pop();assert.equal(pizza.type,'result');assert.equal(pizza.requestId,1);assert.ok(pizza.total>=8,'Zu wenige direkte Pizza-Treffer.');assert.equal(pizza.fuzzyPass,false);assert.equal(new Set(pizza.matches.map(entry=>entry[0])).size,pizza.matches.length);assert.ok(pizza.matches.some(entry=>entry[0]==='bls:X912033'),'Pizza Margherita fehlt.');assert.equal(JSON.stringify(pizza).includes('Pizza'),false,'Der Worker darf den Suchtext nicht zuruecksenden.');

  await self.onmessage({data:{type:'search',requestId:2,query:'Haferfloken',mealIndex:0,routines:[]}});
  const typo=messages.pop();assert.equal(typo.type,'result');assert.equal(typo.fuzzyPass,true);assert.ok(typo.matches.some(entry=>entry[0]==='bls:C133000'),'Tippfehler-Fallback findet Haferflocken nicht.');
  console.log('Worker-Suche 7.2.0: Direkt-, Ranking- und Tippfehlerpfad funktionieren ohne Suchtext-Leak.');
})().catch(error=>{console.error(error);process.exitCode=1});
