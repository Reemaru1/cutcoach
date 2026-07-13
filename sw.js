'use strict';

const CACHE_PREFIX='cutcoach-';
const CACHE_NAME='cutcoach-v2.2.0';
const APP_SHELL=['./','./index.html','./style.css?v=2.2.0','./core.js?v=2.2.0','./render.js?v=2.2.0','./actions.js?v=2.2.0','./app.js?v=2.2.0','./manifest.webmanifest?v=2.2.0','./icon.svg'];

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
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
  if(request.method!=='GET'||new URL(request.url).origin!==self.location.origin||request.headers.has('range'))return;
  if(request.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const response=await fetch(request,{cache:'no-store'});
        if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put('./index.html',response.clone());}
        return response;
      }catch{
        return (await caches.match('./index.html'))||Response.error();
      }
    })());
    return;
  }
  const refresh=fetch(request,{cache:'no-store'}).then(async response=>{
    if(response.ok){const cache=await caches.open(CACHE_NAME);await cache.put(request,response.clone());}
    return response;
  });
  event.waitUntil(refresh.then(()=>undefined).catch(()=>undefined));
  event.respondWith(caches.match(request).then(cached=>cached||refresh.catch(()=>Response.error())));
});
