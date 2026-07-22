'use strict';
const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const requested=process.argv.slice(2);
const tests=(requested.length?requested:fs.readdirSync(__dirname)
  .filter(file=>file.endsWith('.test.js')))
  .sort((left,right)=>left.localeCompare(right,'en'));

if(!tests.length){
  console.error('[CutCoach CI] Keine Regressionstests gefunden.');
  process.exit(1);
}

for(const file of tests){
  const target=path.join(__dirname,file);
  process.stdout.write(`\n[CutCoach CI] ${file}\n`);
  const result=spawnSync(process.execPath,[target],{stdio:'inherit',timeout:30000,env:{...process.env,CUTCOACH_TEST_RUNNER:'1'}});
  if(result.error?.code==='ETIMEDOUT'){
    console.error(`[CutCoach CI] Zeitüberschreitung nach 30 Sekunden: ${file}`);
    process.exit(124);
  }
  if(result.error){console.error(`[CutCoach CI] Startfehler in ${file}:`,result.error);process.exit(1)}
  if(result.status!==0){console.error(`[CutCoach CI] Fehlgeschlagen: ${file} (Exit ${result.status})`);process.exit(result.status||1)}
}
console.log(`\n[CutCoach CI] ${tests.length} Regressionstests vollständig bestanden.`);
