'use strict';

(function(){
  const VERSION='3.1.0';
  let scanner=null;
  let scanning=false;
  let activeTrack=null;
  let handled=false;

  function $(selector){return document.querySelector(selector);}
  function setStatus(text,type='info'){
    const node=$('#scannerStatus');
    if(!node)return;
    node.textContent=text;
    node.dataset.state=type;
  }
  function setVersion(){const node=$('#appVersion');if(node)node.textContent=`Version ${VERSION}`;}

  function waitForUi(){
    const button=$('#scanCode');
    if(!button){setTimeout(waitForUi,120);return;}
    injectStyles();
    button.onclick=startScanner;
    document.querySelectorAll('[data-library-close]').forEach(button=>button.addEventListener('click',()=>stopScanner(),true));
    $('#scannerModal')?.addEventListener('click',event=>{if(event.target.id==='scannerModal')stopScanner();},true);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')stopScanner();});
    setVersion();
  }

  function injectStyles(){
    if($('#scannerV2Styles'))return;
    const style=document.createElement('style');
    style.id='scannerV2Styles';
    style.textContent=`
      .scanner-frame{min-height:280px;aspect-ratio:auto!important}
      .scanner-reader{width:100%;min-height:280px;overflow:hidden;background:#050810}
      .scanner-reader video{width:100%!important;height:100%!important;min-height:280px;object-fit:cover!important}
      .scanner-reader canvas{max-width:100%;max-height:100%}
      .scanner-reader>div{border:0!important}
      .scanner-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}
      .scanner-controls button{padding:10px!important;font-size:12px}
      .scanner-photo{display:block;text-align:center;margin-top:8px}
      .scanner-photo input{display:none}
      #scannerStatus[data-state="success"]{border-color:rgba(114,227,166,.55);background:rgba(114,227,166,.12);color:#a9f4ca}
      #scannerStatus[data-state="error"]{border-color:rgba(255,112,126,.45);background:rgba(255,112,126,.1)}
      .scanner-frame .scan-line{pointer-events:none;z-index:8}
    `;
    document.head.appendChild(style);
  }

  function ensureFrame(){
    const frame=$('.scanner-frame');
    if(!frame)return null;
    frame.innerHTML='<div id="scannerReader" class="scanner-reader"></div><div class="scan-line"></div>';
    return frame;
  }

  function ensureControls(){
    const status=$('#scannerStatus');
    if(!status)return;
    let controls=$('#scannerControls');
    if(!controls){
      status.insertAdjacentHTML('afterend',`<div id="scannerControls" class="scanner-controls">
        <button id="scannerRetry" class="secondary" type="button">↻ Kamera neu starten</button>
        <button id="scannerTorch" class="secondary" type="button" hidden>💡 Licht</button>
      </div>
      <label class="secondary scanner-photo">📷 Barcode fotografieren<input id="scanPhotoV2" type="file" accept="image/*" capture="environment"></label>`);
      $('#scannerRetry').onclick=startScanner;
      $('#scannerTorch').onclick=toggleTorch;
      $('#scanPhotoV2').onchange=event=>scanPhoto(event.target);
    }
  }

  function supportedFormats(){
    if(typeof Html5QrcodeSupportedFormats!=='object')return undefined;
    return [
      Html5QrcodeSupportedFormats.QR_CODE,
      Html5QrcodeSupportedFormats.EAN_13,
      Html5QrcodeSupportedFormats.EAN_8,
      Html5QrcodeSupportedFormats.UPC_A,
      Html5QrcodeSupportedFormats.UPC_E,
      Html5QrcodeSupportedFormats.CODE_128,
      Html5QrcodeSupportedFormats.CODE_39
    ].filter(Number.isFinite);
  }

  function newScanner(){return new Html5Qrcode('scannerReader',supportedFormats(),false);}

  async function chooseBackCamera(){
    const cameras=await Html5Qrcode.getCameras();
    if(!Array.isArray(cameras)||!cameras.length)throw new Error('no-camera');
    const preferred=cameras.find(camera=>/back|rear|environment|rück|hinten/i.test(camera.label));
    return preferred||cameras[cameras.length-1];
  }

  async function startScanner(){
    openModal('scannerModal');
    handled=false;
    ensureControls();
    await stopScanner();
    ensureFrame();
    if(typeof Html5Qrcode!=='function'){
      setStatus('Scanner-Modul konnte nicht geladen werden. Bitte Internet prüfen und erneut öffnen.','error');
      return;
    }
    try{
      setStatus('Kamera wird vorbereitet …');
      scanner=newScanner();
      const camera=await chooseBackCamera();
      const config={
        fps:18,
        qrbox:(width,height)=>({width:Math.floor(Math.min(width*.92,420)),height:Math.floor(Math.min(height*.46,190))}),
        aspectRatio:1.6,
        disableFlip:true,
        experimentalFeatures:{useBarCodeDetectorIfSupported:true}
      };
      scanning=true;
      await scanner.start(camera.id,config,onDecoded,()=>{});
      activeTrack=$('#scannerReader video')?.srcObject?.getVideoTracks?.()[0]||null;
      configureCapabilities();
      setStatus('Live-Scan aktiv: Barcode quer, ruhig und gut beleuchtet in den Rahmen halten.');
    }catch(error){
      console.warn('Scanner 2.0 start failed',error);
      scanning=false;
      setStatus('Live-Kamera konnte nicht gestartet werden. Tippe auf „Kamera neu starten“ oder fotografiere den Barcode.','error');
    }
  }

  function configureCapabilities(){
    const torchButton=$('#scannerTorch');
    if(!torchButton)return;
    try{
      const capabilities=activeTrack?.getCapabilities?.()||{};
      torchButton.hidden=!capabilities.torch;
      if(capabilities.zoom){
        const min=Number(capabilities.zoom.min)||1;
        const max=Number(capabilities.zoom.max)||min;
        const target=Math.min(max,Math.max(min,min+(max-min)*.35));
        activeTrack.applyConstraints({advanced:[{zoom:target}]}).catch(()=>{});
      }
    }catch{torchButton.hidden=true;}
  }

  async function toggleTorch(){
    if(!activeTrack)return;
    const button=$('#scannerTorch');
    const enabled=button?.dataset.on==='true';
    try{
      await activeTrack.applyConstraints({advanced:[{torch:!enabled}]});
      button.dataset.on=String(!enabled);
      button.textContent=!enabled?'💡 Licht aus':'💡 Licht';
    }catch{setStatus('Die Taschenlampe wird von dieser Kamera nicht freigegeben.','error');}
  }

  async function stopScanner(){
    if(scanner){
      try{if(scanning)await scanner.stop();}catch{}
      try{scanner.clear();}catch{}
    }
    scanner=null;scanning=false;activeTrack=null;
    const torch=$('#scannerTorch');if(torch){torch.hidden=true;torch.dataset.on='false';torch.textContent='💡 Licht';}
  }

  async function onDecoded(decodedText){
    if(handled)return;
    const code=String(decodedText||'').trim();
    if(!code)return;
    handled=true;
    setStatus(`Erkannt: ${code}`,'success');
    if(navigator.vibrate)navigator.vibrate([70,40,70]);
    await stopScanner();
    const input=$('#manualCode');if(input)input.value=code;
    setTimeout(()=>$('#lookupManualCode')?.click(),250);
  }

  async function scanPhoto(input){
    const file=input.files?.[0];input.value='';if(!file)return;
    await stopScanner();
    ensureFrame();
    if(typeof Html5Qrcode!=='function'){setStatus('Scanner-Modul konnte nicht geladen werden.','error');return;}
    setStatus('Foto wird in mehreren Varianten geprüft …');
    const variants=[];
    try{
      variants.push(file);
      variants.push(...await makeImageVariants(file));
      for(let index=0;index<variants.length;index++){
        ensureFrame();
        scanner=newScanner();
        try{
          setStatus(`Foto wird geprüft (${index+1}/${variants.length}) …`);
          const result=await scanner.scanFile(variants[index],false);
          await onDecoded(result);
          return;
        }catch{}
        finally{try{scanner?.clear();}catch{}scanner=null;}
      }
      setStatus('Kein Barcode erkannt. Barcode möglichst formatfüllend, gerade und ohne Spiegelung fotografieren.','error');
    }catch(error){
      console.warn('Photo scan failed',error);
      setStatus('Foto konnte nicht verarbeitet werden. Bitte erneut aufnehmen oder Code manuell eingeben.','error');
    }
  }

  async function makeImageVariants(file){
    const bitmap=await createImageBitmap(file);
    const maxSide=1800;
    const scale=Math.min(1,maxSide/Math.max(bitmap.width,bitmap.height));
    const width=Math.max(1,Math.round(bitmap.width*scale));
    const height=Math.max(1,Math.round(bitmap.height*scale));
    const variants=[];
    variants.push(await canvasVariant(bitmap,width,height,0,0,bitmap.width,bitmap.height,false));
    variants.push(await canvasVariant(bitmap,width,height,0,0,bitmap.width,bitmap.height,true));
    const cropX=bitmap.width*.08,cropY=bitmap.height*.18,cropW=bitmap.width*.84,cropH=bitmap.height*.64;
    variants.push(await canvasVariant(bitmap,Math.round(width*.84),Math.round(height*.64),cropX,cropY,cropW,cropH,true));
    bitmap.close?.();
    return variants;
  }

  function canvasVariant(bitmap,width,height,sx,sy,sw,sh,enhance){
    return new Promise((resolve,reject)=>{
      const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
      const context=canvas.getContext('2d',{willReadFrequently:enhance});
      context.drawImage(bitmap,sx,sy,sw,sh,0,0,width,height);
      if(enhance){
        const image=context.getImageData(0,0,width,height),data=image.data;
        for(let index=0;index<data.length;index+=4){
          const gray=.299*data[index]+.587*data[index+1]+.114*data[index+2];
          const value=gray>145?255:gray<90?0:Math.max(0,Math.min(255,(gray-117)*2.2+128));
          data[index]=data[index+1]=data[index+2]=value;
        }
        context.putImageData(image,0,0);
      }
      canvas.toBlob(blob=>blob?resolve(new File([blob],`barcode-${Date.now()}.jpg`,{type:'image/jpeg'})):reject(new Error('canvas-blob')),'image/jpeg',.96);
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForUi,{once:true});else waitForUi();
})();