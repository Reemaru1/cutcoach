function openMeal(id=null){
  editingMealId=id?String(id):null; const m=editingMealId?day().meals.find(x=>String(x.id)===editingMealId):null;
  setText('#mealModalTitle',m?'Mahlzeit bearbeiten':'Mahlzeit hinzufügen'); setText('#saveMeal',m?'Änderungen speichern':'Mahlzeit speichern');
  $('#mealName').value=m?.name||''; $('#mealType').value=m?.type||'Frühstück'; $('#mealCalories').value=m?.calories||''; $('#mealProtein').value=m?.protein||''; $('#mealCarbs').value=m?.carbs||''; $('#mealFat').value=m?.fat||''; openModal('mealModal');
}
function saveMeal(){
  const meal=sanitizeMeal({id:editingMealId||Date.now(),name:$('#mealName').value,type:$('#mealType').value,calories:$('#mealCalories').value,protein:$('#mealProtein').value,carbs:$('#mealCarbs').value,fat:$('#mealFat').value});
  if(!meal){ toast('Name und gültige Kalorien eintragen.'); return; }
  if(editingMealId){ const i=day().meals.findIndex(x=>String(x.id)===editingMealId); if(i>=0)day().meals[i]=meal; } else day().meals.push(meal);
  closeModal($('#mealModal')); const edited=Boolean(editingMealId); editingMealId=null; render(); toast(edited?'Mahlzeit aktualisiert.':'Mahlzeit gespeichert.');
}
function deleteMeal(id){ const m=day().meals.find(x=>String(x.id)===String(id)); if(!m||!confirm(`„${m.name}“ wirklich löschen?`))return; day().meals=day().meals.filter(x=>String(x.id)!==String(id)); render(); toast('Mahlzeit gelöscht.'); }
function saveSettings(){
  const raw={age:$('#setAge').value,height:$('#setHeight').value,calories:$('#setCalories').value,maintenance:$('#setMaintenance').value,protein:$('#setProtein').value,fat:$('#setFat').value,carbs:$('#setCarbs').value,steps:$('#setSteps').value,gymGoal:$('#setGymGoal').value,goalWeight:$('#setGoalWeight').value};
  const checks=[['Alter',raw.age,14,100],['Größe',raw.height,120,230],['Kalorienziel',raw.calories,1200,6000],['Erhaltungskalorien',raw.maintenance,1500,7000],['Eiweiß',raw.protein,50,350],['Fett',raw.fat,30,200],['Kohlenhydrate',raw.carbs,0,800],['Schritte',raw.steps,0,50000],['Gym/Woche',raw.gymGoal,0,7]];
  const bad=checks.find(([,v,min,max])=>parseNumber(v)===null||parseNumber(v)<min||parseNumber(v)>max); if(bad){toast(`${bad[0]} liegt außerhalb des gültigen Bereichs.`);return;}
  if(raw.goalWeight!==''&&nullable(raw.goalWeight,30,300)===null){toast('Bitte gültiges Wunschgewicht eintragen.');return;}
  state.settings=sanitizeSettings(raw); render(); toast('Einstellungen gespeichert.');
}
async function exportBackup(){
  const exportedAt=new Date().toISOString(),copy=deepClone(state); copy.meta.lastBackupAt=exportedAt; const text=JSON.stringify(copy,null,2),name=`CutCoach-Backup-${todayKey()}.json`,blob=new Blob([text],{type:'application/json'});
  try{
    const file=new File([blob],name,{type:'application/json'});
    if(navigator.share&&navigator.canShare?.({files:[file]})) await navigator.share({title:'CutCoach Backup',files:[file]});
    else{ const url=URL.createObjectURL(blob),a=document.createElement('a'); a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
    state.meta.lastBackupAt=exportedAt; saveState(); render(); toast('Backup erstellt.');
  }catch(e){ if(e?.name!=='AbortError')toast('Backup konnte nicht exportiert werden.'); }
}
function importBackup(file){ if(!file)return; const r=new FileReader(); r.onload=()=>{ try{const parsed=JSON.parse(r.result); if(!parsed?.settings||!parsed?.days)throw new Error(); if(!confirm('Das Backup ersetzt die aktuell gespeicherten Daten. Fortfahren?'))return; state=sanitizeState(parsed); selectedDate=todayKey(); render(); toast('Backup importiert.');}catch(e){toast('Ungültiges oder beschädigtes Backup.');}}; r.onerror=()=>toast('Backup konnte nicht gelesen werden.'); r.readAsText(file); }
function selectDate(k){ if(!/^\d{4}-\d{2}-\d{2}$/.test(k))return; selectedDate=k>todayKey()?todayKey():k; render(); }
