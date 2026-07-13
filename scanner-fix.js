'use strict';

(function(){
  let scanner=null;
  let scanning=false;

  function waitForLibrary(){
    const button=document.querySelector('#scanCode');
    if(!button){setTimeout(waitForLibrary,120);return;}
    button.onclick=startScanner;
    document.querySelectorAll('[data-library-close]').forEach(close=>close.addEventListener('click',stopScanner,true));
    document.querySelector('#scannerModal')?.addEventListener('click',event=>{if(event.target.id==='scannerModal')stopScanner();},true);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')stopScanner();});
    const version=document.querySelector('#appVersion');if(version)version.textContent='Version 3.0.1';
  }

  function scannerFrame(){
    const frame=document.querySelector('.scanner-frame');
    if(!frame)return null;
    frame.innerHTML='<div id="scannerReader" class="scanner-reader"></div><div class="scan-line"></div>';
    return frame;
  }

  function addPhotoFallback(){
    const status=document.querySelector('#scannerStatus');
    if(!status||document.querySelector('#scanPhoto'))return;
    status.insertAdjacentHTML('afterend','<label class="secondary scanner-photo">📷 Barcode fotografieren<input id="scanPhoto" type="file" accept="image/*" capture="environment"></label>');
    document.querySelector('#scanPhoto').addEventListener('change',async event=>{
      const file=event.target.files?.[0];event.target.value='';if(!file)return;
      await stopScanner();
      if(typeof Html5Qrcode!=='function'){setStatus('Scanner konnte nicht geladen werden. Bitte Code manuell eingeben.');return;}
      scannerFrame();scanner=new Html5Qrcode('scannerReader',false);
      try{setStatus('Foto wird ausgewertet …');const code=await scanner.scanFile(file,true);handleCode(code);}
      catch{setStatus('Auf dem Foto wurde kein Barcode erkannt. Näher herangehen und erneut versuchen.');}
      finally{try{scanner?.clear();}catch{}scanner=null;}
    });
  }

  function setStatus(text){const element=document.querySelector('#scannerStatus');if(element)element.textContent=text;}

  async function startScanner(){
    openModal('scannerModal');document.querySelector('#manualCode').value='';scannerFrame();addPhotoFallback();
    if(typeof Html5Qrcode!=='function'){
      setStatus('Scanner wird geladen … Bitte kurz warten und erneut auf Scannen tippen.');return;
    }
    await stopScanner(false);scannerFrame();scanner=new Html5Qrcode('scannerReader',false);
    const formats=typeof Html5QrcodeSupportedFormats==='object'?[Html5QrcodeSupportedFormats.QR_CODE,Html5QrcodeSupportedFormats.EAN_13,Html5QrcodeSupportedFormats.EAN_8,Html5QrcodeSupportedFormats.UPC_A,Html5QrcodeSupportedFormats.UPC_E,Html5QrcodeSupportedFormats.CODE_128,Html5QrcodeSupportedFormats.CODE_39].filter(Number.isFinite):undefined;
    const config={fps:12,qrbox:(width,height)=>({width:Math.floor(Math.min(width*.88,360)),height:Math.floor(Math.min(height*.42,180))}),aspectRatio:1.45,disableFlip:false};
    if(formats?.length)config.formatsToSupport=formats;
    try{
      setStatus('Kamerazugriff erlauben und Barcode mittig in den Rahmen halten.');
      scanning=true;
      await scanner.start({facingMode:{ideal:'environment'}},config,handleCode,()=>{});
      setStatus('Barcode ruhig und gut beleuchtet in den Rahmen halten.');
    }catch(error){
      scanning=false;
      console.warn('Scanner start failed',error);
      setStatus('Live-Kamera konnte nicht gestartet werden. Nutze „Barcode fotografieren“ oder gib den Code manuell ein.');
    }
  }

  async function stopScanner(clear=true){
    if(!scanner)return;
    try{if(scanning)await scanner.stop();}catch{}
    scanning=false;
    if(clear){try{scanner.clear();}catch{}scanner=null;}
  }

  async function handleCode(decodedText){
    const code=String(decodedText||'').trim();if(!code)return;
    if(navigator.vibrate)navigator.vibrate(80);
    await stopScanner();
    const input=document.querySelector('#manualCode');if(input)input.value=code;
    document.querySelector('#lookupManualCode')?.click();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForLibrary,{once:true});else waitForLibrary();
})();
