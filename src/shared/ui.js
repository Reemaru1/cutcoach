'use strict';

(function(root){
  const FEEDBACK_KEY='cutcoach_customer_feedback_v1';
  const JOURNAL_FEEDBACK_KEY='cutcoach_journal_feedback_v800';
  const CATEGORIES=new Set(['clarity','helpfulness','accessibility','nutrition-search','other']);
  let accessibilityAuditTimer=0;
  const byId=id=>document.getElementById(id);
  function feedbackEntries(){try{const parsed=JSON.parse(localStorage.getItem(FEEDBACK_KEY)||'[]');return Array.isArray(parsed)?parsed.slice(-100):[]}catch{return[]}}
  function saveFeedback(entry){try{const entries=feedbackEntries();entries.push(entry);localStorage.setItem(FEEDBACK_KEY,JSON.stringify(entries.slice(-100)));return true}catch{return false}}
  function clearFeedback(){try{localStorage.removeItem(FEEDBACK_KEY);return true}catch{return false}}
  function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  function visible(element){const style=getComputedStyle(element),rect=element.getBoundingClientRect();return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&rect.height>0}
  function auditAccessibility(){
    const ids=new Map();document.querySelectorAll('[id]').forEach(element=>ids.set(element.id,(ids.get(element.id)||0)+1));
    const missingNames=[...document.querySelectorAll('button,a[href],[role="button"],[role="tab"]')].filter(element=>visible(element)&&!(element.getAttribute('aria-label')||element.getAttribute('aria-labelledby')||element.textContent.trim())).length;
    const labels=[...document.querySelectorAll('label[for]')],missingLabels=[...document.querySelectorAll('input,select,textarea')].filter(element=>{if(!visible(element)||element.type==='hidden')return false;const id=element.id;return!(element.getAttribute('aria-label')||element.closest('label')||(id&&labels.some(label=>label.htmlFor===id)))}).length;
    const missingAlt=[...document.images].filter(image=>!image.hasAttribute('alt')).length;
    const duplicateIds=[...ids.values()].filter(count=>count>1).length;
    const smallTargets=[...document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="tab"]')].filter(element=>{if(!visible(element))return false;const rect=element.getBoundingClientRect();return rect.width<44||rect.height<44}).length;
    const result={missingNames,missingLabels,missingAlt,duplicateIds,smallTargets};root.CutCoachInsights?.track('accessibility_audit',result);return result;
  }
  function renderSummary(){
    const node=byId('qualityMetricsSummary');if(!node)return;const data=root.CutCoachInsights?.snapshot();if(!data){node.textContent='Lokale Qualitätsmessung ist nicht verfügbar.';return}
    const success=data.search.attempts?Math.round(data.search.withResults/data.search.attempts*100):null;
    const journalVotes=Object.values(data.feedback?.journal||{}).reduce((sum,value)=>sum+(Number(value)||0),0),journalHelpful=journalVotes?Math.round((Number(data.feedback.journal.helpful)||0)/journalVotes*100):null;
    node.textContent=`Onboarding: ${data.onboarding.completed}/${data.onboarding.shown} abgeschlossen · Suche: ${success===null?'noch keine Daten':`${success} % mit Treffer`} · Tagebuch hilfreich: ${journalHelpful===null?'noch keine Daten':`${journalHelpful} %`} · Auswahl nach Suche: ${data.search.selections} · Barrierefreiheitsprüfungen: ${data.accessibility.audits}`;
  }
  function mount(){
    const enabled=byId('qualityMetricsEnabled'),status=byId('customerFeedbackStatus');if(!enabled)return;
    enabled.checked=Boolean(root.CutCoachInsights?.isEnabled());renderSummary();
    enabled.addEventListener('change',()=>{root.CutCoachInsights?.setEnabled(enabled.checked);renderSummary();if(status)status.textContent=enabled.checked?'Lokale Qualitätsmessung aktiviert.':'Qualitätsdaten wurden gelöscht und die Messung deaktiviert.'});
    byId('qualityMetricsExport')?.addEventListener('click',()=>download(`cutcoach-qualitaet-${new Date().toISOString().slice(0,10)}.json`,{exportedAt:new Date().toISOString(),insights:root.CutCoachInsights?.snapshot()||null,feedback:feedbackEntries()}));
    byId('qualityMetricsClear')?.addEventListener('click',()=>{if(!confirm('Lokale Qualitätsmessung und Feedback wirklich löschen?'))return;root.CutCoachInsights?.reset();clearFeedback();try{localStorage.removeItem(JOURNAL_FEEDBACK_KEY)}catch{}renderSummary();if(status)status.textContent='Lokale Qualitätsdaten und Feedback wurden gelöscht.'});
    byId('customerFeedbackSave')?.addEventListener('click',()=>{
      const category=byId('customerFeedbackCategory')?.value,score=Number(byId('customerFeedbackScore')?.value),note=String(byId('customerFeedbackText')?.value||'').replace(/[\u0000-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim().slice(0,600);
      if(!CATEGORIES.has(category)||!Number.isInteger(score)||score<1||score>5){if(status)status.textContent='Bitte Kategorie und Bewertung auswählen.';return}
      const entry={id:root.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,category,score,note,createdAt:new Date().toISOString(),appVersion:byId('appVersion')?.textContent?.trim()||null};
      if(!saveFeedback(entry)){if(status)status.textContent='Feedback konnte lokal nicht gespeichert werden.';return}
      byId('customerFeedbackText').value='';if(status)status.textContent='Danke. Dein Feedback wurde nur auf diesem Gerät gespeichert und nicht übertragen.';renderSummary();root.dispatchEvent(new CustomEvent('cutcoach:feedback-saved',{detail:{category,score}}));
    });
    root.addEventListener('cutcoach:insights-updated',renderSummary);
    scheduleAccessibilityAudit(800);
  }
  function scheduleAccessibilityAudit(delay=500){clearTimeout(accessibilityAuditTimer);accessibilityAuditTimer=window.setTimeout(auditAccessibility,delay)}
  root.addEventListener('cutcoach:module-enter',()=>scheduleAccessibilityAudit());
  root.CutCoachModules?.register({id:'settings',tab:'settings',screenSelector:'[data-screen="settings"]',onEnter:()=>root.CutCoachInsights?.track('feature_view',{feature:'settings'})});
  root.CutCoachUI=Object.freeze({auditAccessibility,renderQualitySummary:renderSummary});
  root.CutCoachFeedback=Object.freeze({entries:()=>JSON.parse(JSON.stringify(feedbackEntries())),clear:clearFeedback,storageKey:FEEDBACK_KEY});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(window);
