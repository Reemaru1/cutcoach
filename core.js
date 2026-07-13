'use strict';

const APP_VERSION = '2.1.0';
const STORAGE_KEY = 'cutcoach_v2';
const SCHEMA_VERSION = 3;
const MEAL_TYPES = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack'];
const DEFAULTS = {
  settings: { age:28, height:179, calories:2300, maintenance:3000, protein:190, fat:65, carbs:200, steps:6000, gymGoal:5, goalWeight:null },
  days: {}, onboarded:false,
  meta:{ schemaVersion:SCHEMA_VERSION, createdAt:null, lastBackupAt:null }
};

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
let state = loadState();
let selectedDate = todayKey();
let editingMealId = null;
let toastTimer = null;
let deferredInstallPrompt = null;

function deepClone(v){ return JSON.parse(JSON.stringify(v)); }
function parseNumber(v){
  if(v === '' || v === null || v === undefined) return null;
  const n = Number(String(v).trim().replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function bounded(v,fallback,min,max,integer=false){
  const n=parseNumber(v); if(n===null || n<min || n>max) return fallback;
  return integer ? Math.round(n) : Math.round(n*10)/10;
}
function nullable(v,min,max){
  if(v==='' || v===null || v===undefined) return null;
  const n=parseNumber(v); if(n===null || n<min || n>max) return null;
  return Math.round(n*10)/10;
}
function sanitizeSettings(s={}){
  return {
    age:bounded(s.age,28,14,100,true), height:bounded(s.height,179,120,230,true),
    calories:bounded(s.calories,2300,1200,6000,true), maintenance:bounded(s.maintenance,3000,1500,7000,true),
    protein:bounded(s.protein,190,50,350,true), fat:bounded(s.fat,65,30,200,true),
    carbs:bounded(s.carbs,200,0,800,true), steps:bounded(s.steps,6000,0,50000,true),
    gymGoal:bounded(s.gymGoal,5,0,7,true), goalWeight:nullable(s.goalWeight,30,300)
  };
}
function sanitizeMeal(m={},fallbackId=Date.now()){
  const name=String(m.name??'').trim().slice(0,80);
  const calories=bounded(m.calories,0,0,10000);
  if(!name || calories<=0) return null;
  return { id:String(m.id??fallbackId), name, type:MEAL_TYPES.includes(m.type)?m.type:'Snack', calories,
    protein:bounded(m.protein,0,0,500), carbs:bounded(m.carbs,0,0,1000), fat:bounded(m.fat,0,0,500) };
}
function sanitizeDay(d={}){
  const meals=Array.isArray(d.meals)?d.meals.slice(0,500).map((m,i)=>sanitizeMeal(m,`${Date.now()}-${i}`)).filter(Boolean):[];
  return { meals, weight:nullable(d.weight,30,300), steps:bounded(d.steps,0,0,100000,true),
    gym:typeof d.gym==='boolean'?d.gym:null, alcohol:typeof d.alcohol==='boolean'?d.alcohol:null };
}
function sanitizeState(raw={}){
  const out=deepClone(DEFAULTS); out.settings=sanitizeSettings(raw.settings); out.onboarded=Boolean(raw.onboarded);
  out.meta={ schemaVersion:SCHEMA_VERSION, createdAt:raw.meta?.createdAt||new Date().toISOString(), lastBackupAt:raw.meta?.lastBackupAt||null };
  if(raw.days && typeof raw.days==='object') for(const [k,v] of Object.entries(raw.days)) if(/^\d{4}-\d{2}-\d{2}$/.test(k)) out.days[k]=sanitizeDay(v);
  return out;
}
function loadState(){
  try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?sanitizeState(JSON.parse(raw)):sanitizeState(DEFAULTS); }
  catch(e){ console.error(e); return sanitizeState(DEFAULTS); }
}
function saveState(){
  try{ localStorage.setItem(STORAGE_KEY,JSON.stringify(state)); return true; }
  catch(e){ console.error(e); toast('Speichern fehlgeschlagen – bitte Backup erstellen.'); return false; }
}
function keyFromDate(d){ return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function todayKey(){ return keyFromDate(new Date()); }
function dateFromKey(k){ const [y,m,d]=k.split('-').map(Number); return new Date(y,m-1,d,12); }
function shiftKey(k,days){ const d=dateFromKey(k); d.setDate(d.getDate()+days); return keyFromDate(d); }
function day(k=selectedDate,create=true){ if(!state.days[k]&&create) state.days[k]=sanitizeDay(); return state.days[k]||sanitizeDay(); }
function totals(k=selectedDate){ return day(k,false).meals.reduce((a,m)=>({calories:a.calories+m.calories,protein:a.protein+m.protein,carbs:a.carbs+m.carbs,fat:a.fat+m.fat}),{calories:0,protein:0,carbs:0,fat:0}); }
function fmt(v,d=0){ return Number(v||0).toLocaleString('de-DE',{minimumFractionDigits:d,maximumFractionDigits:d}); }
function avg(values){ return values.length?values.reduce((a,b)=>a+b,0)/values.length:null; }
function setText(sel,text){ const e=$(sel); if(e)e.textContent=text; }
function setBar(sel,value,max){ const e=$(sel); if(!e)return; e.style.width=`${max>0?clamp(value/max*100,0,100):0}%`; e.classList.toggle('over',max>0&&value>max); }
function escapeHtml(s){ return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function toast(msg){ const e=$('#toast'); if(!e)return; clearTimeout(toastTimer); e.textContent=msg; e.classList.add('show'); toastTimer=setTimeout(()=>e.classList.remove('show'),2200); }
function openModal(id){ const m=$(`#${id}`); if(!m)return; m.classList.add('open'); document.body.classList.add('modal-open'); setTimeout(()=>m.querySelector('input:not([type="hidden"]),select,textarea')?.focus(),80); }
function closeModal(m){ m?.classList.remove('open'); if(!$('.modal.open'))document.body.classList.remove('modal-open'); }
function range(end,count=7){ const r=[]; for(let i=count-1;i>=0;i--){ const k=shiftKey(end,-i); r.push({key:k,data:day(k,false),totals:totals(k)}); } return r; }
