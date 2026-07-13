'use strict';

function openMeal(id=null){
  editingMealId=id?String(id):null;
  const meal=editingMealId?day(selectedDate,false).meals.find(item=>String(item.id)===editingMealId):null;
  setText('#mealModalTitle',meal?'Mahlzeit bearbeiten':'Mahlzeit hinzufügen');
  setText('#saveMeal',meal?'Änderungen speichern':'Mahlzeit speichern');
  $('#mealName').value=meal?.name||''; $('#mealType').value=meal?.type||'Frühstück';
  $('#mealCalories').value=meal?.calories??''; $('#mealProtein').value=meal?.protein??'';
  $('#mealCarbs').value=meal?.carbs??''; $('#mealFat').value=meal?.fat??'';
  openModal('mealModal');
}
function saveMeal(){
  const raw={
    id:editingMealId||makeId(), name:$('#mealName').value, type:$('#mealType').value,
    calories:$('#mealCalories').value, protein:$('#mealProtein').value,
    carbs:$('#mealCarbs').value, fat:$('#mealFat').value
  };
  const checks=[['Kalorien',raw.calories,1,10000],['Eiweiß',raw.protein||0,0,500],['Kohlenhydrate',raw.carbs||0,0,1000],['Fett',raw.fat||0,0,500]];
  const invalid=checks.find(([,value,min,max])=>parseNumber(value)===null||parseNumber(value)<min||parseNumber(value)>max);
  if(!String(raw.name).trim()){toast('Bitte einen Namen eintragen.');return;}
  if(invalid){toast(`${invalid[0]} liegt außerhalb des gültigen Bereichs.`);return;}
  const meal=sanitizeMeal(raw);
  if(!meal){toast('Mahlzeit konnte nicht gespeichert werden.');return;}
  const data=day();
  if(editingMealId){
    const index=data.meals.findIndex(item=>String(item.id)===editingMealId);
    if(index>=0)data.meals[index]=meal;
  }else data.meals.push(meal);
  closeModal($('#mealModal'));
  const edited=Boolean(editingMealId); editingMealId=null; render();
  toast(edited?'Mahlzeit aktualisiert.':'Mahlzeit gespeichert.');
}
function duplicateMeal(id){
  const source=day(selectedDate,false).meals.find(item=>String(item.id)===String(id));
  if(!source)return;
  day().meals.push({...deepClone(source),id:makeId(),name:`${source.name} (Kopie)`.slice(0,80)});
  render(); toast('Mahlzeit dupliziert.');
}
function deleteMeal(id){
  const data=day(selectedDate,false),meal=data.meals.find(item=>String(item.id)===String(id));
  if(!meal||!confirm(`„${meal.name}“ wirklich löschen?`))return;
  day().meals=day().meals.filter(item=>String(item.id)!==String(id)); pruneDay(); render(); toast('Mahlzeit gelöscht.');
}
function saveSettings(){
  const raw={
    age:$('#setAge').value,height:$('#setHeight').value,calories:$('#setCalories').value,maintenance:$('#setMaintenance').value,
    protein:$('#setProtein').value,fat:$('#setFat').value,carbs:$('#setCarbs').value,steps:$('#setSteps').value,
    gymGoal:$('#setGymGoal').value,goalWeight:$('#setGoalWeight').value
  };
  const checks=[['Alter',raw.age,14,100],['Größe',raw.height,120,230],['Kalorienziel',raw.calories,1200,6000],['Erhaltungskalorien',raw.maintenance,1500,7000],['Eiweiß',raw.protein,50,350],['Fett',raw.fat,30,200],['Kohlenhydrate',raw.carbs,0,800],['Schritte',raw.steps,0,50000],['Gym/Woche',raw.gymGoal,0,7]];
  const invalid=checks.find(([,value,min,max])=>parseNumber(value)===null||parseNumber(value)<min||parseNumber(value)>max);
  if(invalid){toast(`${invalid[0]} liegt außerhalb des gültigen Bereichs.`);return;}
  if(raw.goalWeight!==''&&nullable(raw.goalWeight,30,300)===null){toast('Bitte gültiges Wunschgewicht eintragen.');return;}
  state.settings=sanitizeSettings(raw); render();
  toast(state.settings.maintenance<state.settings.calories?'Gespeichert. Hinweis: Erhaltung liegt unter dem Kalorienziel.':'Einstellungen gespeichert.');
}
async function exportBackup(){
  const exportedAt=new Date().toISOString(),copy=deepClone(state);
  copy.meta.lastBackupAt=exportedAt; copy.meta.appVersion=APP_VERSION;
  const text=JSON.stringify(copy,null,2),name=`CutCoach-Backup-${todayKey()}.json`,blob=new Blob([text],{type:'application/json'});
  try{
    const file=typeof File==='function'?new File([blob],name,{type:'application/json'}):null;
    if(file&&navigator.share&&navigator.canShare?.({files:[file]})) await navigator.share({title:'CutCoach Backup',files:[file]});
    else{
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url; anchor.download=name; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }
    state.meta.lastBackupAt=exportedAt; saveState(true); render(); toast('Backup erstellt.');
  }catch(error){ if(error?.name!=='AbortError')toast('Backup konnte nicht exportiert werden.'); }
}
function importBackup(file){
  if(!file)return;
  if(file.size>5*1024*1024){toast('Das Backup ist ungewöhnlich groß und wurde nicht geöffnet.');return;}
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result);
      if(!parsed||typeof parsed!=='object'||!parsed.settings||!parsed.days)throw new Error('invalid');
      const sanitized=sanitizeState(parsed);
      const dayCount=Object.keys(sanitized.days).length;
      const mealCount=Object.values(sanitized.days).reduce((sum,item)=>sum+item.meals.length,0);
      if(!confirm(`Backup mit ${dayCount} Tagen und ${mealCount} Mahlzeiten importieren? Die aktuellen Daten werden ersetzt.`))return;
      state=sanitized; lastSavedSnapshot=''; selectedDate=todayKey(); saveState(true); render(); toast('Backup importiert.');
    }catch(error){toast('Ungültiges oder beschädigtes Backup.');}
  };
  reader.onerror=()=>toast('Backup konnte nicht gelesen werden.');
  reader.readAsText(file);
}
function clearWeight(){
  if(day(selectedDate,false).weight===null){closeModal($('#weightModal'));return;}
  if(!confirm('Gewichtseintrag für diesen Tag entfernen?'))return;
  day().weight=null; pruneDay(); closeModal($('#weightModal')); render(); toast('Gewichtseintrag entfernt.');
}
function clearSteps(){
  if(day(selectedDate,false).steps===null)return;
  if(!confirm('Schritteintrag für diesen Tag entfernen?'))return;
  day().steps=null; pruneDay(); render(); toast('Schritteintrag entfernt.');
}
function selectDate(key){
  if(!validDateKey(key))return;
  selectedDate=key>todayKey()?todayKey():key;
  render();
}
