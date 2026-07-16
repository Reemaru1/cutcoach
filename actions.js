'use strict';

function openMeal(id=null){
  editingMealId=id?String(id):null;
  const meal=editingMealId?day(selectedDate,false).meals.find(item=>String(item.id)===editingMealId):null;
  setText('#mealModalTitle',meal?'Mahlzeit bearbeiten':'Mahlzeit hinzufügen');
  setText('#saveMeal',meal?'Änderungen speichern':'Mahlzeit speichern');
  $('#mealName').value=meal?.name||'';$('#mealType').value=meal?.type||'Frühstück';
  $('#mealCalories').value=meal?.calories??'';$('#mealProtein').value=meal?.protein??'';
  $('#mealCarbs').value=meal?.carbs??'';$('#mealFat').value=meal?.fat??'';
  openModal('mealModal');
}
function saveMeal(){
  const raw={
    id:editingMealId||makeId(),name:$('#mealName').value,type:$('#mealType').value,
    calories:$('#mealCalories').value,protein:$('#mealProtein').value,
    carbs:$('#mealCarbs').value,fat:$('#mealFat').value
  };
  const checks=[['Kalorien',raw.calories,1,10000],['Eiweiß',raw.protein||0,0,500],['Kohlenhydrate',raw.carbs||0,0,1000],['Fett',raw.fat||0,0,500]];
  const invalid=checks.find(([,value,min,max])=>parseNumber(value)===null||parseNumber(value)<min||parseNumber(value)>max);
  if(!cleanText(raw.name,80)){toast('Bitte einen Namen eintragen.');return;}
  if(invalid){toast(`${invalid[0]} liegt außerhalb des gültigen Bereichs.`);return;}
  const meal=sanitizeMeal(raw);
  if(!meal){toast('Mahlzeit konnte nicht gespeichert werden.');return;}
  const editingExists=Boolean(editingMealId&&day(selectedDate,false).meals.some(item=>String(item.id)===editingMealId));
  if(!editingExists&&mealCapacity()<1){toast(`Maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten pro Tag möglich.`);return;}
  let message='Mahlzeit gespeichert.';
  const saved=commitDayMutation(data=>{
    if(editingMealId){
      const index=data.meals.findIndex(item=>String(item.id)===editingMealId);
      if(index>=0){data.meals[index]=meal;message='Mahlzeit aktualisiert.';}
      else{meal.id=makeId();data.meals.push(meal);message='Original nicht mehr gefunden – als neue Mahlzeit gespeichert.';}
    }else data.meals.push(meal);
  });
  if(!saved){toast('Mahlzeit konnte nicht gespeichert werden.');return;}
  editingMealId=null;closeModal($('#mealModal'));render();toast(message);
}
function duplicateMeal(id){
  const source=day(selectedDate,false).meals.find(item=>String(item.id)===String(id));
  if(!source)return;
  if(mealCapacity()<1){toast(`Maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten pro Tag möglich.`);return;}
  if(!commitDayMutation(data=>data.meals.push({...deepClone(source),id:makeId(),name:`${source.name} (Kopie)`.slice(0,80)}))){toast('Mahlzeit konnte nicht dupliziert werden.');return;}
  render();toast('Mahlzeit dupliziert.');
}
function copyPreviousMeals(){
  const previousKey=shiftKey(selectedDate,-1),source=day(previousKey,false).meals;
  if(!source.length){toast('Am Vortag sind keine Mahlzeiten eingetragen.');return;}
  if(source.length>mealCapacity()){toast(`Nicht genügend Platz: Noch ${fmt(mealCapacity())} von maximal ${fmt(MAX_MEALS_PER_DAY)} Mahlzeiten frei.`);return;}
  const target=day(selectedDate,false);
  if(target.meals.length&&!confirm(`${source.length} Mahlzeiten zusätzlich vom Vortag übernehmen?`))return;
  if(!commitDayMutation(data=>{for(const meal of source)data.meals.push({...deepClone(meal),id:makeId()})})){toast('Mahlzeiten konnten nicht übernommen werden.');return;}
  render();toast(`${source.length} Mahlzeiten vom Vortag übernommen.`);
}
function deleteMeal(id){
  const data=day(selectedDate,false),meal=data.meals.find(item=>String(item.id)===String(id));
  if(!meal||!confirm(`„${meal.name}“ wirklich löschen?`))return;
  if(!commitDayMutation(entry=>{entry.meals=entry.meals.filter(item=>String(item.id)!==String(id))})){toast('Mahlzeit konnte nicht gelöscht werden.');return;}
  render();toast('Mahlzeit gelöscht.');
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
  const nextSettings=sanitizeSettings(raw);
  if(!commitStateMutation(current=>{current.settings=nextSettings})){toast('Einstellungen konnten nicht gespeichert werden.');return;}
  render();
  const macroCalories=state.settings.protein*4+state.settings.carbs*4+state.settings.fat*9;
  if(state.settings.maintenance<state.settings.calories)toast('Gespeichert. Hinweis: Erhaltung liegt unter dem Kalorienziel.');
  else if(Math.abs(macroCalories-state.settings.calories)>350)toast(`Gespeichert. Deine Makroziele ergeben ungefähr ${fmt(macroCalories)} kcal.`);
  else toast('Einstellungen gespeichert.');
}
function backupEnvelope(data=state){
  const exportedAt=new Date().toISOString(),copy=deepClone(data);
  copy.meta.lastBackupAt=exportedAt;copy.meta.appVersion=APP_VERSION;
  return {format:'cutcoach-backup',formatVersion:1,appVersion:APP_VERSION,schemaVersion:SCHEMA_VERSION,exportedAt,data:copy};
}
async function shareOrDownload(text,name,title='CutCoach Backup'){
  const blob=new Blob([text],{type:'application/json'});
  const file=typeof File==='function'?new File([blob],name,{type:'application/json'}):null;
  if(file&&navigator.share&&navigator.canShare?.({files:[file]})){await navigator.share({title,files:[file]});return;}
  const url=URL.createObjectURL(blob),anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;document.body.appendChild(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
async function exportBackup(){
  const envelope=backupEnvelope();
  try{
    await shareOrDownload(JSON.stringify(envelope,null,2),`CutCoach-Backup-${todayKey()}.json`);
    const recorded=commitStateMutation(current=>{current.meta.lastBackupAt=envelope.exportedAt});render();toast(recorded?'Backup erstellt.':'Backup erstellt. Der Zeitpunkt konnte lokal nicht gespeichert werden.');
  }catch(error){if(error?.name!=='AbortError')toast('Backup konnte nicht exportiert werden.');}
}
function extractBackupData(parsed){
  if(parsed?.format==='cutcoach-backup'){
    if(Number(parsed.schemaVersion)>SCHEMA_VERSION)throw new Error('future-schema');
    return parsed.data;
  }
  if(schemaVersionOf(parsed)>SCHEMA_VERSION)throw new Error('future-schema');
  return parsed;
}
function savePreviousState(reason){
  const payload={reason,savedAt:new Date().toISOString(),appVersion:APP_VERSION,data:deepClone(state)};
  return writeStorage(PREVIOUS_STATE_KEY,JSON.stringify(payload));
}
function importBackup(file){
  if(!file)return;
  if(file.size>5*1024*1024){toast('Das Backup ist ungewöhnlich groß und wurde nicht geöffnet.');return;}
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const parsed=JSON.parse(reader.result),rawData=extractBackupData(parsed);
      if(!rawData||typeof rawData!=='object'||!rawData.settings||!rawData.days)throw new Error('invalid');
      const sanitized=sanitizeState(rawData,{rejectFuture:true});
      const dayCount=Object.keys(sanitized.days).length;
      const mealCount=Object.values(sanitized.days).reduce((sum,item)=>sum+item.meals.length,0);
      if(!confirm(`Backup mit ${dayCount} Tagen und ${mealCount} Mahlzeiten importieren? Der aktuelle Stand wird vorher lokal gesichert.`))return;
      if(!storageReadOnly&&!savePreviousState('Vor Backup-Import')){toast('Der aktuelle Stand konnte nicht gesichert werden. Import abgebrochen.');return;}
      if(!commitStateReplacement(sanitized,{clearReadOnly:true})){toast('Backup konnte nicht gespeichert werden. Der bisherige Stand bleibt aktiv.');return;}
      startupWarning=null;setSelectedDate(todayKey());render();toast('Backup importiert.');
    }catch(error){toast(error?.message==='future-schema'?'Dieses Backup stammt aus einer neueren CutCoach-Version.':'Ungültiges oder beschädigtes Backup.');}
  };
  reader.onerror=()=>toast('Backup konnte nicht gelesen werden.');
  reader.readAsText(file);
}
function restorePreviousState(){
  const raw=readStorage(PREVIOUS_STATE_KEY);
  if(!raw){toast('Kein vorheriger Stand vorhanden.');return;}
  try{
    const payload=JSON.parse(raw),restored=sanitizeState(payload.data,{rejectFuture:true});
    if(!confirm(`Stand „${payload.reason||'Vorheriger Stand'}“ vom ${new Date(payload.savedAt).toLocaleString('de-DE')} wiederherstellen?`))return;
    const current=deepClone(state),currentPayload=JSON.stringify({reason:'Vor Wiederherstellung',savedAt:new Date().toISOString(),appVersion:APP_VERSION,data:current});
    if(!writeStorage(PREVIOUS_STATE_KEY,currentPayload)){toast('Aktueller Stand konnte nicht gesichert werden. Wiederherstellung abgebrochen.');return;}
    if(!commitStateReplacement(restored)){writeStorage(PREVIOUS_STATE_KEY,raw);toast('Wiederherstellung konnte nicht gespeichert werden. Der aktuelle Stand bleibt aktiv.');return;}
    setSelectedDate(todayKey());render();toast('Vorheriger Stand wiederhergestellt.');
  }catch{toast('Der vorherige Stand ist beschädigt.');}
}
async function exportRecovery(){
  const raw=readStorage(RECOVERY_KEY);
  if(!raw){toast('Keine Rohdaten vorhanden.');return;}
  try{await shareOrDownload(raw,`CutCoach-Rohdaten-${todayKey()}.json`,'CutCoach Rohdaten');toast('Rohdaten exportiert.');}
  catch(error){if(error?.name!=='AbortError')toast('Rohdaten konnten nicht exportiert werden.');}
}
function clearWeight(){
  if(day(selectedDate,false).weight===null){closeModal($('#weightModal'));return;}
  if(!confirm('Gewichtseintrag für diesen Tag entfernen?'))return;
  if(!commitDayMutation(data=>{data.weight=null})){toast('Gewichtseintrag konnte nicht entfernt werden.');return;}
  closeModal($('#weightModal'));render();toast('Gewichtseintrag entfernt.');
}
function clearSteps(){
  if(day(selectedDate,false).steps===null)return;
  if(!confirm('Schritteintrag für diesen Tag entfernen?'))return;
  if(!commitDayMutation(data=>{data.steps=null})){toast('Schritteintrag konnte nicht entfernt werden.');return;}
  render();toast('Schritteintrag entfernt.');
}
function selectDate(key){
  if(!setSelectedDate(key))return;
  render();
}
