/* Apenas estrutura pública e arquivos estáticos. Dados de empresas ficam fora do CacheStorage. */
const CACHE='pc-estrutura-offline-v1';
const permitido=url=>url.origin===self.location.origin&&(url.pathname.startsWith('/_next/static/')||['/operacao','/icon-192.png','/icon-512.png'].includes(url.pathname));
async function preparar(){
 const cache=await caches.open(CACHE);const r=await fetch('/operacao',{cache:'reload'});if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw new Error('Estrutura indisponível');
 const html=await r.clone().text();await cache.put('/operacao',r);
 const urls=[...html.matchAll(/(?:src|href)="([^"<>]+)"/g)].map(m=>new URL(m[1].replace(/&amp;/g,'&'),self.location.origin)).filter(u=>permitido(u)&&u.pathname!=='/operacao');
 for(const u of urls){const res=await fetch(u);if(!res.ok)throw new Error('Arquivo indisponível');await cache.put(u,res.clone());if(u.pathname.endsWith('.css')){const css=await res.text();for(const m of css.matchAll(/url\(["']?([^\s)"']+)["']?\)/g)){const asset=new URL(m[1],u);if(permitido(asset)){const ar=await fetch(asset);if(ar.ok)await cache.put(asset,ar)}}}}
}
self.addEventListener('install',event=>event.waitUntil(preparar().then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const n of await caches.keys())if(n.startsWith('pc-estrutura-offline-')&&n!==CACHE)await caches.delete(n);await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data==='PREPARAR')event.waitUntil(preparar().then(()=>event.ports[0]?.postMessage({ok:true})).catch(()=>event.ports[0]?.postMessage({ok:false})));if(event.data?.tipo==='ATIVOS')event.waitUntil((async()=>{const c=await caches.open(CACHE);for(const path of event.data.urls||[]){const u=new URL(path,self.location.origin);if(permitido(u)&&u.pathname!=='/operacao'){const r=await fetch(u);if(r.ok)await c.put(u,r)}}})())});
self.addEventListener('fetch',event=>{
 const r=event.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==self.location.origin)return;
 if(r.mode==='navigate'&&u.pathname==='/operacao'){event.respondWith(fetch(r).catch(async()=>{const c=await caches.open(CACHE);return await c.match('/operacao')||Response.error()}));return}
 if(u.pathname.startsWith('/_next/static/'))event.respondWith((async()=>{const c=await caches.open(CACHE);const cached=await c.match(r);if(cached)return cached;const res=await fetch(r);if(res.ok)await c.put(r,res.clone());return res})());
});
