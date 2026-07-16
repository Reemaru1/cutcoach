'use strict';

const APP_VERSION = '6.5.0';
const STORAGE_KEY = 'cutcoach_v2';
const RECOVERY_KEY = 'cutcoach_recovery_raw';
const PREVIOUS_STATE_KEY = 'cutcoach_previous_state';
const SCHEMA_VERSION = 5;
const MAX_DAYS = 5000;
const MAX_MEALS_PER_DAY = 500;
const MEAL_TYPES = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'];
const DEFAULTS = {
  settings: { age:28, height:179, calories:2300, maintenance:3000, protein:190, fat:65, carbs:200, steps:6000, gymGoal:5, goalWeight:null },
  days: {}, onboarded:false,
  meta:{ schemaVersion:SCHEMA_VERSION, createdAt:null, lastBackupAt:null }
};

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
let startupWarning = null;
let storageAvailable = true;
let storageReadOnly = false;
let saveErrorShown = false;
let state = loadState();
let lastSavedSnapshot = readStorage(STORAGE_KEY) || '';
let selectedDate = initialSelectedDate();
let editingMealId = null;
let toastTimer = null;
let deferredInstallPrompt = null;
let lastFocusedElement = null;
let serviceWorkerRegistration = null;
let updateRequested = false;

function deepClone(value){ return JSON.parse(JSON.stringify(value)); }
function parseNumber(value){
  if(value === '' || value === null || value === undefined) return null;
  const parsed = Number(String(value).trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}
function clamp(value,min,max){ return Math.max(min,Math.min(max,value)); }
function bounded(value,fallback,min,max,integer=false){
  const parsed=parseNumber(value);
  if(parsed===null || parsed<min || parsed>max) return fallback;
  return integer ? Math.round(parsed) : Math.round(parsed*10)/10;
}
function nullable(value,min,max,integer=false){
  if(value==='' || value===null || value===undefined) return null;
  const parsed=parseNumber(value);
  if(parsed===null || parsed<min || parsed>max) return null;
  return integer ? Math.round(parsed) : Math.round(parsed*10)/10;
}
function makeId(){
  if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
}
function cleanText(value,maxLength=80){
  return String(value??'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,maxLength);
}
function safeId(value){
  const candidate=String(value??'').trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(candidate)?candidate:makeId();
}
function schemaVersionOf(raw){
  const parsed=parseNumber(raw?.meta?.schemaVersion ?? raw?.schemaVersion);
  return parsed===null?0:Math.max(0,Math.round(parsed));
}
function validTimestamp(value){
  if(typeof value!=='string')return null;
  const timestamp=Date.parse(value);
  return Number.isFinite(timestamp)?new Date(timestamp).toISOString():null;
}
function readStorage(key){
  if(!storageAvailable)return null;
  try{return localStorage.getItem(key);}catch(error){storageAvailable=false;console.error(error);return null;}
}
function writeStorage(key,value){
  if(!storageAvailable||storageReadOnly)return false;
  try{localStorage.setItem(key,value);return true;}catch(error){console.error(error);return false;}
}
function removeStorage(key){
  if(!storageAvailable)return false;
  try{localStorage.removeItem(key);return true;}catch(error){storageAvailable=false;console.error(error);return false;}
}
function sanitizeSettings(settings={}){
  return {
    age:bounded(settings.age,28,14,100,true), height:bounded(settings.height,179,120,230,true),
    calories:bounded(settings.calories,2300,1200,6000,true), maintenance:bounded(settings.maintenance,3000,1500,7000,true),
    protein:bounded(settings.protein,190,50,350,true), fat:bounded(settings.fat,65,30,200,true),
    carbs:bounded(settings.carbs,200,0,800,true), steps:bounded(settings.steps,6000,0,50000,true),
    gymGoal:bounded(settings.gymGoal,5,0,7,true), goalWeight:nullable(settings.goalWeight,30,300)
  };
}
function sanitizeMeal(meal={},fallbackId=makeId()){
  const name=cleanText(meal.name,80);
  const calories=bounded(meal.calories,0,0,10000);
  if(!name || calories<=0) return null;
  return {
    id:safeId(meal.id??fallbackId), name,
    type:MEAL_TYPES.includes(meal.type)?meal.type:'Snack', calories,
    protein:bounded(meal.protein,0,0,500), carbs:bounded(meal.carbs,0,0,1000), fat:bounded(meal.fat,0,0,500)
  };
}
function sanitizeDay(raw={},legacyZeroSteps=false){
  const ids=new Set();
  const meals=[];
  if(Array.isArray(raw.meals)){
    for(const item of raw.meals.slice(0,MAX_MEALS_PER_DAY)){
      const meal=sanitizeMeal(item);
      if(!meal)continue;
      while(ids.has(meal.id)) meal.id=makeId();
      ids.add(meal.id); meals.push(meal);
    }
  }
  const rawSteps=legacyZeroSteps && Number(raw.steps)===0 ? null : raw.steps;
  return {
    meals,
    weight:nullable(raw.weight,30,300),
    steps:nullable(rawSteps,0,100000,true),
    gym:typeof raw.gym==='boolean'?raw.gym:null,
    alcohol:typeof raw.alcohol==='boolean'?raw.alcohol:null
  };
}
function keyFromDate(date){ return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`; }
function todayKey(){ return keyFromDate(new Date()); }
function dateFromKey(key){
  const [year,month,date]=String(key).split('-').map(Number);
  return new Date(year,month-1,date,12);
}
function validDateKey(key){ return /^\d{4}-\d{2}-\d{2}$/.test(String(key)) && keyFromDate(dateFromKey(key))===key; }
function shiftKey(key,days){ const date=dateFromKey(key); date.setDate(date.getDate()+days); return keyFromDate(date); }
function initialSelectedDate(){
  const today=todayKey();
  try{
    const key=new URLSearchParams(location.search).get('date');
    return key&&validDateKey(key)&&key<=today?key:today;
  }catch{return today;}
}
function syncSelectedDateUrl(hash=null){
  try{
    const url=new URL(location.href);
    url.searchParams.set('date',selectedDate);
    url.searchParams.delete('journal_steps');
    if(hash!==null)url.hash=hash;
    history.replaceState(null,'',`${url.pathname}${url.search}${url.hash}`);
  }catch{}
}
function setSelectedDate(key,{hash=null,updateUrl=true}={}){
  if(!validDateKey(key))return false;
  selectedDate=key>todayKey()?todayKey():key;
  if(updateUrl)syncSelectedDateUrl(hash);
  return true;
}
function sanitizeState(raw={},options={}){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))raw={};
  const sourceSchema=schemaVersionOf(raw);
  if(options.rejectFuture&&sourceSchema>SCHEMA_VERSION)throw new Error('future-schema');
  const result=deepClone(DEFAULTS);
  result.settings=sanitizeSettings(raw.settings);
  result.onboarded=Boolean(raw.onboarded);
  result.meta={
    schemaVersion:SCHEMA_VERSION,
    createdAt:validTimestamp(raw.meta?.createdAt)||new Date().toISOString(),
    lastBackupAt:validTimestamp(raw.meta?.lastBackupAt)
  };
  if(raw.days && typeof raw.days==='object' && !Array.isArray(raw.days)){
    const entries=Object.entries(raw.days).filter(([key])=>validDateKey(key)).sort(([a],[b])=>a.localeCompare(b)).slice(-MAX_DAYS);
    for(const [key,value] of entries) result.days[key]=sanitizeDay(value,sourceSchema<4);
  }
  return result;
}
function loadState(){
  const raw=readStorage(STORAGE_KEY);
  if(!storageAvailable){startupWarning='Lokaler Speicher ist nicht verfügbar. Änderungen können nach dem Schließen verloren gehen.';return sanitizeState(DEFAULTS);}
  if(!raw)return sanitizeState(DEFAULTS);
  try{
    const parsed=JSON.parse(raw);
    if(schemaVersionOf(parsed)>SCHEMA_VERSION){
      writeStorage(RECOVERY_KEY,raw);
      storageReadOnly=true;
      startupWarning='Diese Daten stammen aus einer neueren CutCoach-Version. Sie wurden nicht überschrieben und können als Rohdaten exportiert werden.';
      return sanitizeState(DEFAULTS);
    }
    return sanitizeState(parsed);
  }catch(error){
    console.error(error);
    writeStorage(RECOVERY_KEY,raw);
    startupWarning='Beschädigte Altdaten wurden separat gesichert. Du kannst die Rohdaten unter Einstellungen exportieren.';
    return sanitizeState(DEFAULTS);
  }
}
function saveState(force=false){
  if(storageReadOnly)return false;
  try{
    const snapshot=JSON.stringify(state);
    if(!force && snapshot===lastSavedSnapshot)return true;
    if(!writeStorage(STORAGE_KEY,snapshot))throw new Error('storage-write-failed');
    lastSavedSnapshot=snapshot; saveErrorShown=false; return true;
  }catch(error){
    console.error(error);
    if(!saveErrorShown){toast('Speichern fehlgeschlagen – bitte sofort ein Backup erstellen.');saveErrorShown=true;}
    return false;
  }
}
function commitStateMutation(change){
  if(typeof change!=='function')return false;
  const previous=deepClone(state),previousSnapshot=lastSavedSnapshot;
  try{
    change(state);
    if(!saveState(true))throw new Error('state-save-failed');
    return true;
  }catch(error){
    state=previous;lastSavedSnapshot=previousSnapshot;
    console.error(error);
    return false;
  }
}
function commitStateReplacement(next,{clearReadOnly=false}={}){
  const previous=deepClone(state),previousSnapshot=lastSavedSnapshot,previousReadOnly=storageReadOnly,previousSaveError=saveErrorShown;
  try{
    const clean=sanitizeState(next,{rejectFuture:true});
    state=clean;
    if(clearReadOnly)storageReadOnly=false;
    lastSavedSnapshot='';
    if(!saveState(true))throw new Error('state-replace-failed');
    return true;
  }catch(error){
    state=previous;lastSavedSnapshot=previousSnapshot;storageReadOnly=previousReadOnly;saveErrorShown=previousSaveError;
    console.error(error);
    return false;
  }
}
function commitDayMutation(change,key=selectedDate){
  if(typeof change!=='function'||!validDateKey(key))return false;
  const existed=Object.prototype.hasOwnProperty.call(state.days,key);
  const previous=existed?deepClone(state.days[key]):null;
  try{
    change(day(key,true));
    if(state.days[key]?.meals.length>MAX_MEALS_PER_DAY)throw new Error('meal-limit-reached');
    pruneDay(key);
    if(!saveState(true))throw new Error('day-save-failed');
    return true;
  }catch(error){
    if(existed)state.days[key]=previous;else delete state.days[key];
    console.error(error);
    return false;
  }
}
function day(key=selectedDate,create=true){
  if(!validDateKey(key))return sanitizeDay();
  if(!state.days[key]&&create)state.days[key]=sanitizeDay();
  return state.days[key]||sanitizeDay();
}
function isDayEmpty(data){ return !data.meals.length && data.weight===null && data.steps===null && data.gym===null && data.alcohol===null; }
function pruneDay(key=selectedDate){ if(state.days[key]&&isDayEmpty(state.days[key]))delete state.days[key]; }
function mealCapacity(key=selectedDate){ return Math.max(0,MAX_MEALS_PER_DAY-day(key,false).meals.length); }
function totals(key=selectedDate){
  return day(key,false).meals.reduce((sum,meal)=>({
    calories:sum.calories+meal.calories, protein:sum.protein+meal.protein,
    carbs:sum.carbs+meal.carbs, fat:sum.fat+meal.fat
  }),{calories:0,protein:0,carbs:0,fat:0});
}
function fmt(value,digits=0){ return Number(value||0).toLocaleString('de-DE',{minimumFractionDigits:digits,maximumFractionDigits:digits}); }
function avg(values){ return values.length?values.reduce((sum,value)=>sum+value,0)/values.length:null; }
function setText(selector,text){ const element=$(selector); if(element)element.textContent=text; }
function setBar(selector,value,max){
  const element=$(selector); if(!element)return;
  element.style.width=`${max>0?clamp(value/max*100,0,100):0}%`;
  element.classList.toggle('over',max>0&&value>max);
}
function escapeHtml(value){ return String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])); }
function toast(message){
  const element=$('#toast'); if(!element)return;
  clearTimeout(toastTimer); element.textContent=message; element.classList.add('show');
  toastTimer=setTimeout(()=>element.classList.remove('show'),2600);
}
function openModal(id){
  const modal=$(`#${id}`); if(!modal)return;
  lastFocusedElement=document.activeElement; modal.classList.add('open'); modal.setAttribute('aria-hidden','false'); document.body.classList.add('modal-open');
  setTimeout(()=>{const target=modal.querySelector('input:not([type="hidden"]),select,textarea,button');target?.focus();},80);
}
function closeModal(modal){
  modal?.classList.remove('open'); modal?.setAttribute('aria-hidden','true');
  if(!$('.modal.open'))document.body.classList.remove('modal-open');
  if(lastFocusedElement instanceof HTMLElement)lastFocusedElement.focus({preventScroll:true});
  lastFocusedElement=null;
}
function range(end,count=7){
  const result=[];
  for(let index=count-1;index>=0;index--){
    const key=shiftKey(end,-index);
    result.push({key,data:day(key,false),totals:totals(key)});
  }
  return result;
}
function hasRecoveryData(){return Boolean(readStorage(RECOVERY_KEY));}
function hasPreviousState(){return Boolean(readStorage(PREVIOUS_STATE_KEY));}
