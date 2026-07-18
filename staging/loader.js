'use strict';
(async function(){
  try{
    if('serviceWorker' in navigator){
      const registrations=await navigator.serviceWorker.getRegistrations().catch(()=>[]);
      await Promise.all(registrations.filter(registration=>registration.scope.includes('/staging/')).map(registration=>registration.unregister().catch(()=>false)));
    }
    const response=await fetch('../index.html?staging='+Date.now(),{cache:'no-store'});
    if(!response.ok)throw new Error('index-load-failed');
    let html=await response.text();
    const injection=`
      <base href="../">
      <meta name="robots" content="noindex,nofollow">
      <link rel="stylesheet" href="staging/staging-nav.css?v=2">
      <script src="staging/bootstrap.js?v=2"><\/script>
      <script src="staging/staging-nav.js?v=2" defer><\/script>
    `;
    html=html.replace('<head>','<head>'+injection)
      .replace('<title>CutCoach</title>','<title>CutCoach Staging</title>')
      .replace('</body>','<div class="cc-staging-badge" aria-label="Staging-Version">STAGING</div></body>');
    document.open();document.write(html);document.close();
  }catch(error){
    console.error(error);
    document.body.innerHTML='<div class="staging-loader"><div><strong>Staging konnte nicht geladen werden.</strong><small>Bitte Seite neu laden.</small></div></div>';
  }
})();