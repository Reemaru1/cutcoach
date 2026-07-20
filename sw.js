'use strict';
importScripts('./runtime-manifest.js?v=1.2.6-alpha');
const RUNTIME=self.CUTCOACH_RUNTIME;
const CACHE_PREFIX='cutcoach-';
const CACHE_BASE=`cutcoach-v${RUNTIME.version}-nav136-journal137-nutrition138-dishes140`;
const PORTION_CACHE=`${CACHE_BASE}-search153-portions`;
const LEARNING_CACHE=`${PORTION_CACHE}-search160-learning`;
const SEARCH_CACHE=`${LEARNING_CACHE}-search161-hardening`;
const EXACT_WHOLE_CACHE=`${SEARCH_CACHE}-search170-exact-whole`;
const EDGE_CACHE=`${EXACT_WHOLE_CACHE}-search171-edge-hardening`;
const STAGE6_CACHE=`${EDGE_CACHE}-stage6-production180`;
const INTEGRITY_CACHE=`${STAGE6_CACHE}-search190-integrity`;
const CATALOG_CACHE=`${INTEGRITY_CACHE}-catalog191-expansion`;
const CACHE_NAME=`${CATALOG_CACHE}-energy143`;
const APP_SHELL=['./','./index.html','./runtime-manifest.js?v=1.2.6-alpha',...RUNTIME.baseAssets,...RUNTIME.styles,...RUNTIME.scripts,'./update.html'];
const EXTERNAL_ASSETS=Object.freeze(['https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js']);
const NAVIGATION_TIMEOUT_MS=4500,ASSET_TIMEOUT_MS=6500;
function fetchWithTimeout(request,options={},timeout=ASSET_TIMEOUT_MS){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);return fetch(request,{...options,signal:controller.signal}).finally(()=>clearTimeout(timer))}
async function preparePage(response){const body=await response.arrayBuffer(),headers=new Headers(response.headers);headers.set('content-type','text/html; charset=utf-8');headers.set('cache-control','no-cache');return new Response(body,{status:response.status,statusText:response.statusText,headers})}
async function cacheResponse(request,response){if(response&&(response.ok||response.type==='opaque'))await(await caches.open(CACHE_NAME)).put(request,response.clone());return response}
async function navigationResponse(request){try{const network=await fetchWithTimeout(request,{cache:'no-store'},NAVIGATION_TIMEOUT_MS),page=await preparePage(network);if(page.ok)await(await caches.open(CACHE_NAME)).put('./index.html',page.clone());return page}catch{return(await caches.match('./index.html'))||Response.error()}}
async function assetResponse(request){try{return await cacheResponse(request,await fetchWithTimeout(request,{cache:'no-store'},ASSET_TIMEOUT_MS))}catch{return(await caches.match(request))||Response.error()}}
function externalResponse(event,request){const network=fetchWithTimeout(request,{cache:'no-store',mode:'cors'},ASSET_TIMEOUT_MS).then(response=>cacheResponse(request,response));event.waitUntil(network.then(()=>{}).catch(()=>{}));return caches.match(request).then(cached=>cached||network.catch(()=>Response.error()))}
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE_NAME);await cache.addAll([...new Set(APP_SHELL)]);await Promise.allSettled(EXTERNAL_ASSETS.map(asset=>cache.add(asset)))})()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();if(event.data?.type==='GET_CACHE_VERSION')event.source?.postMessage?.({type:'CACHE_VERSION',cache:CACHE_NAME})});
self.addEventListener('fetch',event=>{const request=event.request;if(request.method!=='GET'||request.headers.has('range'))return;const url=new URL(request.url);if(EXTERNAL_ASSETS.includes(url.href)){event.respondWith(externalResponse(event,request));return}if(url.origin!==self.location.origin)return;if(request.mode==='navigate'){event.respondWith(navigationResponse(request));return}event.respondWith(assetResponse(request))});
