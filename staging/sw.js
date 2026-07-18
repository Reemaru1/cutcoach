'use strict';
const CACHE='cutcoach-staging-v1';
const SHELL=['./','./index.html','./loader.js','./bootstrap.js','./staging-nav.css','./staging-nav.js'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('cutcoach-staging-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request,{cache:'no-store'});
      if(response.ok&&url.pathname.includes('/staging/'))await (await caches.open(CACHE)).put(request,response.clone());
      return response;
    }catch{
      return (await caches.match(request))||(request.mode==='navigate'&&await caches.match('./index.html'))||Response.error();
    }
  })());
});
