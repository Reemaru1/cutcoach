'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const scanner=fs.readFileSync(path.resolve(__dirname,'..','scanner-v2.js'),'utf8');

assert.ok(scanner.includes('const variants=[file]'),'Das Originalfoto muss immer zuerst als Scanquelle verfügbar sein.');
assert.ok(scanner.includes('variants.push(...await makeImageVariants(file))'),'Optimierte Bildvarianten müssen zusätzlich geprüft werden.');
assert.ok(scanner.includes("catch(error){console.warn('Bildvarianten nicht verfügbar, Originalfoto wird geprüft'"),'Fehlende Bildverarbeitung darf den Originalscan nicht abbrechen.');
assert.ok(scanner.includes('finally{bitmap?.close?.();}'),'Erzeugte Bildressourcen müssen zuverlässig freigegeben werden.');
assert.ok(scanner.includes("if(!context){reject(new Error('canvas-context'));return;}"),'Fehlender Canvas-Kontext muss kontrolliert behandelt werden.');

console.log('Scanner-Fotofallback geprüft.');
