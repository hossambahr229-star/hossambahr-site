const CACHE_NAME="hb-public-v2";
const PRECACHE=["/","/manifest.webmanifest","/icon.svg","/brand-tokens.css","/intent-first.css"];
const SENSITIVE_PREFIXES=["/auth/","/account/","/os/"];
const AUTH_RUNTIME_PATHS=new Set(["/auth-client.js","/auth-config.js","/vendor/supabase.js"]);

self.addEventListener("install",(event)=>{
  event.waitUntil(caches.open(CACHE_NAME).then((cache)=>cache.addAll(PRECACHE)).then(()=>self.skipWaiting()));
});

self.addEventListener("activate",(event)=>{
  event.waitUntil(
    caches.keys()
      .then((keys)=>Promise.all(keys.filter((key)=>key!==CACHE_NAME).map((key)=>caches.delete(key))))
      .then(()=>self.clients.claim())
  );
});

function isSensitive(url){
  return AUTH_RUNTIME_PATHS.has(url.pathname)||SENSITIVE_PREFIXES.some((prefix)=>url.pathname.startsWith(prefix));
}

self.addEventListener("fetch",(event)=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||isSensitive(url))return;

  if(request.mode==="navigate"){
    event.respondWith(
      fetch(request)
        .then((response)=>{
          if(response.ok){
            const clone=response.clone();
            caches.open(CACHE_NAME).then((cache)=>cache.put(request,clone));
          }
          return response;
        })
        .catch(()=>caches.match(request).then((cached)=>cached||caches.match("/")))
    );
    return;
  }

  const cacheable=["style","script","image","font","manifest"].includes(request.destination);
  if(!cacheable)return;
  event.respondWith(
    caches.match(request).then((cached)=>{
      const network=fetch(request).then((response)=>{
        if(response.ok){
          const clone=response.clone();
          caches.open(CACHE_NAME).then((cache)=>cache.put(request,clone));
        }
        return response;
      });
      return cached||network;
    })
  );
});
