'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {JSDOM}=require('jsdom');

const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'stability-hardening-v133.js'),'utf8');
const dom=new JSDOM(`<!doctype html><button id="opener">Öffnen</button><button data-tab="library">Bibliothek</button><div class="modal" id="first"><button id="firstButton">A</button></div><div class="modal" id="second"><button id="secondButton">B</button></div>`,{url:'https://example.test/cutcoach/?date=2026-07-18#today',runScripts:'dangerously',pretendToBeVisual:true});
const {window}=dom;
window.selectedDate='2026-07-18';
window.STORAGE_KEY='cutcoach_v2';
window.RECOVERY_KEY='cutcoach_recovery_raw';
window.SCHEMA_VERSION=6;
window.storageReadOnly=false;
window.startupWarning=null;
window.schemaVersionOf=value=>Number(value?.meta?.schemaVersion)||0;
window.toast=()=>{};
window.renderMeta=()=>{};
window.openModal=id=>{const modal=window.document.getElementById(id);modal.classList.add('open');modal.setAttribute('aria-hidden','false')};
window.closeModal=modal=>{modal.classList.remove('open');modal.setAttribute('aria-hidden','true')};
const script=window.document.createElement('script');script.textContent=source;window.document.head.append(script);
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));

const opener=window.document.getElementById('opener');
opener.focus();window.openModal('first');
window.document.getElementById('firstButton').focus();window.openModal('second');
assert.equal(window.CutCoachStability133.topModal()?.id,'second','Oberstes Modal wird falsch erkannt.');
window.document.dispatchEvent(new window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
assert.equal(window.document.getElementById('second').classList.contains('open'),false,'Escape schließt nicht das oberste Modal.');
assert.equal(window.document.getElementById('first').classList.contains('open'),true,'Escape schließt fälschlich das darunterliegende Modal.');

window.history.replaceState(null,'','/?date=2026-07-18#library');
window.CutCoachStability133.preserveLibraryUrl();
assert.equal(new URL(window.location.href).searchParams.get('date'),'2026-07-18','Bibliothekswechsel verliert das ausgewählte Datum.');

const future=JSON.stringify({meta:{schemaVersion:99}});
window.dispatchEvent(new window.StorageEvent('storage',{key:'cutcoach_v2',newValue:future}));
assert.equal(window.storageReadOnly,true,'Neuere Fremddaten aktivieren den Nur-Lesen-Schutz nicht.');
assert.equal(window.localStorage.getItem('cutcoach_recovery_raw'),future,'Neuere Fremddaten werden nicht als Rohdaten gesichert.');

dom.window.close();
console.log('Modal-, Fokus-, Bibliotheks- und Fremddatenhärtung geprüft.');