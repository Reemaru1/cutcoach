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
      <link rel="stylesheet" href="staging-v2/staging-nav.css?v=4">
      <script src="staging-v2/bootstrap.js?v=3"><\/script>
      <script src="staging-v2/staging-nav.js?v=4" defer><\/script>
    `;
    html=html.replace('<head>','<head>'+injection)
      .replace('<title>CutCoach</title>','<title>CutCoach Staging V2</title>')
      .replace('</body>','<div class="cc-staging-badge" aria-label="Staging-Version">STAGING V2</div></body>');
    frame.addEventListener('load',()=>{status.hidden=true},{once:true});
    frame.srcdoc=html;
    setTimeout(()=>{
      if(!status.hidden)status.querySelector('small').textContent='Der Start dauert ungewöhnlich lange. Bitte Link in Safari öffnen und einmal neu laden.';
    },8000);
  }catch(error){
    console.error(error);
    status.innerHTML='<div><strong>Staging V2 konnte nicht geladen werden.</strong><small>Bitte Link direkt in Safari öffnen. Die produktive App ist nicht betroffen.</small></div>';
  }
})();
