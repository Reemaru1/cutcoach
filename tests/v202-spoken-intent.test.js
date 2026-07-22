'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const inject=(window,name)=>{const script=window.document.createElement('script');script.textContent=read(name);window.document.head.append(script)};
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

(async()=>{
  {
    const dom=new JSDOM('<!doctype html><body></body>',{url:'https://example.test/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
    const w=dom.window;w.CutCoachFoodCatalog={meta:{count:0},items:()=>[]};w.CutCoachEverydayCatalog={items:()=>[]};w.CutCoachLibrary={exportData:()=>({items:[]})};
    const base={version:'base',rowsFor:value=>value==='Einzel'?['base-single']:[],parse:value=>value==='Einzel'?['base-parse']:[],likelyMulti:()=>false,invalidateIndex:()=>{}};
    inject(w,'nutrition-spoken-intent-v202.js');const api=w.CutCoachSpokenIntent202.attach(base);
    assert.equal(api.spokenIntentVersion,'2.0.2-alpha');assert.equal(api.spokenIntentBuild,'2.0.2-spoken-segmentation');
    const sentence='Breze einen Kaffee und eine Cola und dann noch ein Baklava';
    const rows=api.rowsFor(sentence);
    assert.deepEqual(Array.from(rows,row=>row.item?.name),['Breze','Kaffee schwarz','Cola','Baklava']);
    assert.deepEqual(Array.from(rows,row=>row.status),['matched','matched','matched','matched']);
    assert.ok(rows.every(row=>row.confidence===99&&row.spokenIntent));
    assert.equal(rows[0].quantitySpecified,false);assert.equal(rows[1].quantitySpecified,true);assert.equal(rows[2].quantitySpecified,true);assert.equal(rows[3].quantitySpecified,true);
    const afterwards=api.rowsFor('Breze, danach noch einen Kaffee, anschließend eine Cola und ein Baklava');
    assert.deepEqual(Array.from(afterwards,row=>row.item?.name),['Breze','Kaffee schwarz','Cola','Baklava']);
    const semmel=api.rowsFor('Semmel und Käse');
    assert.deepEqual(Array.from(semmel,row=>row.item?.name),['Semmel','Käse']);
    assert.equal(semmel[0].item.id,'cutcoach-spoken-semmel');assert.equal(semmel[1].item.id,'cutcoach-spoken-kaese');
    const quantities=api.rowsFor('zwei Brezen und einen Kaffee');assert.equal(quantities[0].factor,2);assert.equal(quantities[1].factor,1);
    assert.deepEqual(api.rowsFor('Einzel'),['base-single'],'Einzelne normale Suche wird nicht an die Basis weitergegeben.');
    assert.equal(api.spokenRows('Semmel'),null,'Ein einzelner Begriff aktiviert fälschlich die Mehrfachsuche.');
    dom.window.close();
  }
  {
    const dom=new JSDOM('<!doctype html><body><button id="nutritionVoice"></button><input id="nutritionSearch"><div id="nutritionVoiceStatus"></div></body>',{url:'https://reemaru1.github.io/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15'});
    const w=dom.window;Object.defineProperty(w.navigator,'onLine',{configurable:true,value:true});let permissionQueries=0;Object.defineProperty(w.navigator,'permissions',{configurable:true,value:{query:async()=>{permissionQueries++;return{state:'prompt'}}}});
    let starts=0;class Recognition{start(){starts++;this.onstart?.()}stop(){this.onend?.()}abort(){}}
    w.webkitSpeechRecognition=Recognition;w.localStorage.setItem('cutcoach_voice_permission_granted_v1','1');inject(w,'nutrition-voice-111.js');
    assert.equal(w.CutCoachNutritionVoice111.version,'1.9.2-alpha');assert.equal(w.CutCoachNutritionVoice111.start(),true);await wait(20);
    assert.equal(starts,1,'Der Mikrofonbutton startet die Browser-Spracherkennung nicht direkt.');assert.equal(permissionQueries,0,'CutCoach prüft weiterhin vorab die Safari-Berechtigung.');assert.equal(w.CutCoachNutritionVoice111.state(),'listening');assert.doesNotMatch(w.document.querySelector('#nutritionVoiceStatus').textContent,/Website-Einstellungen/);w.CutCoachNutritionVoice111.stop(false);
    dom.window.close();
  }
  {
    const dom=new JSDOM('<!doctype html><body><button id="nutritionVoice"></button><input id="nutritionSearch"><div id="nutritionVoiceStatus"></div></body>',{url:'https://reemaru1.github.io/cutcoach/',runScripts:'dangerously',pretendToBeVisual:true});
    const w=dom.window;Object.defineProperty(w.navigator,'onLine',{configurable:true,value:true});let starts=0;class Recognition{start(){starts++;this.onerror?.({error:'not-allowed'})}stop(){this.onend?.()}abort(){}}
    w.webkitSpeechRecognition=Recognition;inject(w,'nutrition-voice-111.js');w.CutCoachNutritionVoice111.start();await wait(20);assert.equal(starts,1);assert.match(w.document.querySelector('#nutritionVoiceStatus').textContent,/nicht erlaubt/,'Abgelehnte iOS-Freigabe wird nicht verständlich gemeldet.');dom.window.close();
  }
  const loader=read('version-v7.js'),runtime=read('runtime-manifest.js'),sw=read('sw.js');
  assert.match(loader,/nutrition-voice-111\.js\?v=1\.9\.2-alpha/);assert.match(loader,/nutrition-spoken-intent-v202\.js\?v=2\.0\.2-alpha/);assert.match(loader,/CutCoachSpokenIntent202\?\.attach/);
  assert.ok(runtime.indexOf('nutrition-search-exact-whole-v170.js?v=1.9.6-alpha')<runtime.indexOf('nutrition-spoken-intent-v202.js?v=2.0.2-alpha'));
  assert.ok(runtime.indexOf('nutrition-spoken-intent-v202.js?v=2.0.2-alpha')<runtime.indexOf('nutrition-search-confidence-hardening-v151.js?v=1.9.0-alpha'));
  assert.match(sw,/search202-spoken-intent/);assert.match(sw,/voice203-direct-permission/);assert.match(sw,/`\$\{VOICE_CACHE\}-energy143-nutrition220-nav137-dashboard820-searchmetrics110-faststart-search710-fluid`/);
  console.log('Sprachintention 2.0.2: Vierer-Satz, Semmel/Käse, Mengen und direkte iOS-Mikrofonabfrage geprüft.');
})().catch(error=>{console.error(error);process.exitCode=1});
