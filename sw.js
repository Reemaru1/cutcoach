'use strict';

const CACHE_PREFIX='cutcoach-';
const CACHE_NAME='cutcoach-v3.2.1';
const SCANNER_CDN='https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js';
const APP_SHELL=[
  './','./index.html','./style.css?v=2.3.0','./core.js?v=2.3.0','./render.js?v=2.3.0',
  './actions.js?v=2.3.0','./app.js?v=2.3.0','./manifest.webmanifest?v=2.3.0','./icon.svg',
  './apple-touch-icon.png?v=2.3.0','./icon-192.png?v=2.3.0','./library.js?v=3.0.0',
  './library-init.js?v=3.0.0','./library.css?v=3.0.0','./scanner-v2.js?v=3.1.0','./off-lookup.js?v=3.2.1','./update.html'
];

function injectApp(html){
  let page=html
    .replace("script-src 'self'","script-src 'self' https://cdn.jsdelivr.net")
    .replace("connect-src 'self'","connect-src 'self' https://world.openfoodfacts.org");
  const scripts=[];
  if(!page.includes('html5-qrcode@2.3.8'))scripts.push(`<script src="${SCANNER_CDN}" defer></script>`);
  if(!page.includes('library.js?v=3.0.0'))scripts.push('<script src="library.js?v=3.0.0" defer></script>');
  if(!page.includes('library-init.js?v=3.0.0'))scripts.push('<script src="library-init.js?v=3.0.0" defer></script>');
  if(!page.includes('scanner-v2.js?v=3.1.0'))scripts.push('<script src="scanner-v2.js?v=3.1.0" defer></script>');
  if(!page.includes('off-lookup.js?v=3.2.1'))scripts.push('<script src="off-lookup.js?v=3.2.1" defer></script>');
  return scripts.length?page.replace('</body>',`${scripts.join('')}</body>`):page;
}

async function preparePage(response){
  const html=injectApp(await response.text());
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  return new Response(html,{status:response.status,statusText:response.statusText,headers});
}

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});

self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET'||request.headers.has('range'))return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const network=await fetch(request,{cache:'no-store'});
        const page=await preparePage(network);
        if(page.ok){const cache=await caches.open(CACHE_NAME);await cache.put('./index.html',page.clone());}
        return page;
      }catch{return (await caches.match('./index.html'))||Response.error();}
    })());
    return;
  }
  event.respondWith((async()=>{
    const cached=await caches.match(request);
    if(cached)return cached;
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());}
      return response;
    }catch{return Response.error();}
  })());
});