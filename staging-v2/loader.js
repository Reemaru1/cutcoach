'use strict';
(async function(){
  const status=document.getElementById('status');
  const frame=document.getElementById('appFrame');
  try{
    const response=await fetch('../index.html?staging_v2='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('index-load-failed');
    let html=await response.text();
    const injection=`
      <base href="../">
      <meta name="robots" content="noindex,nofollow">
      <link rel="stylesheet" href="staging/staging-nav.css?v=2">
      <script>window.CUTCOACH_STAGING=true;try{Object.defineProperty(navigator,'serviceWorker',{value:undefined,configurable:true})}catch{}<\/script>
      <script src="staging/staging-nav.js?v=2" defer><\/script>
    `;
    html=html.replace('<head>','<head>'+injection)
      .replace('<title>CutCoach</title>','<title>CutCoach Staging V2</title>')
      .replace('</body>','<div class="cc-staging-badge" aria-label="Staging-Version">STAGING V2</div></body>');
    frame.addEventListener('load',()=>{status.hidden=true},{once:true});
    frame.srcdoc=html;
    setTimeout(()=>{if(!status.hidden)status.querySelector('small').textContent='Der Start dauert ungewöhnlich lange. Bitte Seite einmal neu laden.'},8000);
  }catch(error){
    console.error(error);
    status.innerHTML='<div><strong>Staging V2 konnte nicht geladen werden.</strong><small>Bitte Seite neu laden. Die produktive App ist davon nicht betroffen.</small></div>';
  }
})();