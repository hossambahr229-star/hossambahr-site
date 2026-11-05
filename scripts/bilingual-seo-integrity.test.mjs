import test from 'node:test';import assert from 'node:assert/strict';import{readFile,access}from'node:fs/promises';import{resolve,join}from'node:path';
const root=resolve(import.meta.dirname,'..'),origin='https://hossambahr.com';const{services}=JSON.parse(await readFile(join(root,'src/registry/published-services.json'),'utf8'));
test('all published service pairs expose reciprocal canonical language alternatives',async()=>{
 for(const s of services){const ar=s.internalRoute,en='/en'+ar,expected={ar:new URL(ar,origin).href,en:new URL(en,origin).href,'x-default':new URL(ar,origin).href};
 const arHtml=await readFile(join(root,ar.slice(1),'index.html'),'utf8'),arCanonical=new URL(arHtml.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]??ar,origin);if(arCanonical.href!==new URL(ar,origin).href){const enHtml=await readFile(join(root,en.slice(1),'index.html'),'utf8');assert.equal(new URL(enHtml.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1]??en,origin).href,new URL('/en'+arCanonical.pathname,origin).href);assert.doesNotMatch(enHtml,/<link\b[^>]*hreflang=/);continue;}
 for(const route of[ar,en]){const html=await readFile(join(root,route.slice(1),'index.html'),'utf8');const alternate=[...html.matchAll(/<link\b[^>]*rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"[^>]*>/g)].map(m=>[m[1],m[2]]);assert.equal(alternate.length,3,route);assert.deepEqual(Object.fromEntries(alternate),expected,route);assert.equal(new Set(alternate.map(x=>x[0])).size,3,route);}
 }
});
test('home language alternatives survive publication and reference only existing local stylesheets',async()=>{
 for(const route of['/','/en/']){const html=await readFile(join(root,route.slice(1),'index.html'),'utf8');for(const lang of['ar','en','x-default'])assert.match(html,new RegExp('hreflang="'+lang+'"'),route);assert.doesNotMatch(html,/href="\/site-global\.css(?:[?"])/);
 for(const match of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)){const url=new URL(match[1],origin);if(url.origin===origin)await access(join(root,decodeURIComponent(url.pathname).slice(1)));}
 }
});
