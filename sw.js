'use strict';

const RUNTIME_MANIFEST_URL='./runtime-manifest.js?v=1.3.1-alpha';
importScripts(RUNTIME_MANIFEST_URL);

const RUNTIME=self.CUTCOACH_RUNTIME;
const CACHE_PREFIX='cutcoach-';
const CACHE_NAME=`${CACHE_PREFIX}v${RUNTIME.version}`;
const APP_SHELL=Object.freeze([...new Set([
  './',
  './index.html',
  RUNTIME_MANIFEST_URL,
  ...RUNTIME.baseAssets,
  ...RUNTIME.styles,
  ...RUNTIME.scripts,
  './update.html'
])]);

async function openRuntimeCache(){
  return caches.open(CACHE_NAME);
}

async function preparePage(response){
  const body=await response.arrayBuffer();
  const headers=new Headers(response.headers);
  headers.set('content-type','text/html; charset=utf-8');
  headers.set('cache-control','no-cache');
  return new Response(body,{status:response.status,statusText:response.statusText,headers});
}

async function cacheSuccessfulResponse(request,response){
  if(response.ok){
    const cache=await openRuntimeCache();
    await cache.put(request,response.clone());
  }
  return response;
}

self.addEventListener('install',event=>{
  event.waitUntil(openRuntimeCache().then(cache=>cache.addAll(APP_SHELL)));
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys
        .filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME)
        .map(key=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('message',event=>{
  if(event.data?.type==='SKIP_WAITING')self.skipWaiting();
});

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
        if(page.ok){
          const cache=await openRuntimeCache();
          await cache.put('./index.html',page.clone());
        }
        return page;
      }catch{
        return (await caches.match('./index.html'))||Response.error();
      }
    })());
    return;
  }

  event.respondWith((async()=>{
    try{
      const response=await fetch(request,{cache:'no-store'});
      return cacheSuccessfulResponse(request,response);
    }catch{
      return (await caches.match(request))||Response.error();
    }
  })());
});
