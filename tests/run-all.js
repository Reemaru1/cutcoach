'use strict';

const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');

const testsDir=__dirname;
const testFiles=fs.readdirSync(testsDir)
  .filter(name=>name.endsWith('.test.js'))
  .sort((left,right)=>left.localeCompare(right,'en'));

if(!testFiles.length){
  console.error('Keine Testdateien gefunden.');
  process.exit(1);
}

console.log(`Führe ${testFiles.length} Tests aus …`);
for(const file of testFiles){
  console.log(`\n▶ ${file}`);
  const result=spawnSync(process.execPath,[path.join(testsDir,file)],{
    cwd:path.resolve(testsDir,'..'),
    stdio:'inherit'
  });
  if(result.error){
    console.error(`Test konnte nicht gestartet werden: ${file}`);
    console.error(result.error);
    process.exit(1);
  }
  if(result.status!==0){
    console.error(`Test fehlgeschlagen: ${file}`);
    process.exit(result.status||1);
  }
}

console.log(`\nAlle ${testFiles.length} Tests erfolgreich.`);
