'use strict';

const {spawnSync}=require('node:child_process');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const ignored=new Set(['.git','node_modules']);
const files=[];

function collect(directory){
  for(const entry of fs.readdirSync(directory,{withFileTypes:true})){
    if(ignored.has(entry.name))continue;
    const target=path.join(directory,entry.name);
    if(entry.isDirectory())collect(target);
    else if(entry.isFile()&&entry.name.endsWith('.js'))files.push(target);
  }
}

collect(root);
files.sort((left,right)=>left.localeCompare(right,'en'));

for(const file of files){
  const result=spawnSync(process.execPath,['--check',file],{stdio:'pipe',encoding:'utf8'});
  if(result.status===0)continue;
  process.stderr.write(result.stderr||result.stdout||`Syntaxfehler in ${path.relative(root,file)}\n`);
  process.exit(result.status||1);
}

console.log(`[CutCoach CI] Syntaxprüfung: ${files.length} JavaScript-Dateien bestanden.`);
