'use strict';
importScripts('./runtime-manifest.js?v=1.2.6-alpha');
const RUNTIME=self.CUTCOACH_RUNTIME;
const CACHE_PREFIX='cutcoach-';
const CACHE_NAME=`cutcoach-v${RUNTIME.version}-nav135`;
const APP_SHELL=['./','./index.html','./runtime-manifest.js?v=1.2.6-alpha',...RUNTIME.baseAssets,...RUNTIME.styles,...RUNTIME.scripts,'./update.html'];
async function preparePage(response){const body=await response.arrayBuffer(),headers=new Headers(response.headers);headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','no-cache');return new Response(body,{status:response.status,statusText:response.statusText,headers})}
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll([...new Set(APP_SHELL)]))));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||request.headers.has('range'))return;const url=new URL(request.url);if(url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith((async()=>{try{const network=await fetch(request,{cache:'no-store'}),page=await preparePage(network);if(page.ok)await(await caches.open(CACHE_NAME)).put('./index.html',page.clone());return page}catch{return(await caches.match('./index.html'))||Response.error()}})());return}event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-store'});if(response.ok)await(await caches.open(CACHE_NAME)).put(request,response.clone());return response}catch{return(await caches.match(request))||Response.error()}})())});