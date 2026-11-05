import assert from 'node:assert/strict';import{readFile}from'node:fs/promises';import{resolve,join}from'node:path';
import{canonicalSocialCatalog,socialDesignSignature,socialRecordFingerprint,jpegDimensions,socialHash,SOCIAL_ORIGIN,normalizedSocialRoute}from'../src/publication/service-social-catalog.mjs';
const root=resolve(import.meta.dirname,'..'),manifest=JSON.parse(await readFile(join(root,'assets/social/services/manifest.json'),'utf8'));
const catalog=await canonicalSocialCatalog(root),signature=await socialDesignSignature(root);
assert.equal(manifest.designSignature,signature,'Service artwork needs regeneration after a design change');
assert.equal(manifest.records.length,catalog.services.length*2);
assert.equal(new Set(manifest.records.map(r=>r.imageUrl)).size,manifest.records.length);
const records=new Map(manifest.records.map(r=>[r.id+':'+r.locale,r])),byUrl=new Map(manifest.records.map(r=>[new URL(r.canonicalRoute,SOCIAL_ORIGIN).href,r]));const hashes=new Set();let bytes=0,pages=0;
for(const service of catalog.services)for(const locale of['ar','en']){
 const r=records.get(service.id+':'+locale);assert.ok(r,service.slug+' '+locale);assert.equal(r.fingerprint,socialRecordFingerprint(service,locale,signature));
 assert.equal(r.title,service.name[locale]);assert.match(r.path,/^assets\/social\/services\/[a-f0-9]{16}-(?:ar|en)-[a-f0-9]{12}\.jpg$/);
 assert.equal(r.imageUrl,SOCIAL_ORIGIN+'/'+r.path);const buffer=await readFile(join(root,r.path));assert.deepEqual(jpegDimensions(buffer),{width:1200,height:630});assert.equal(socialHash(buffer),r.sha256);assert.equal(buffer.length,r.bytes);assert.ok(buffer.length<256000);hashes.add(r.sha256);bytes+=r.bytes;
}
assert.equal(hashes.size,manifest.records.length,'Different canonical service cards unexpectedly share identical image bytes');
const attrs=tag=>Object.fromEntries([...tag.matchAll(/([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),(m[2]??m[3]??m[4]).replaceAll('&amp;','&').replaceAll('&quot;','"')]));
const required=['og:title','og:description','og:type','og:url','og:image','og:image:width','og:image:height','og:image:alt','twitter:card','twitter:title','twitter:description','twitter:image'];
for(const service of catalog.publishedRecords)for(const locale of['ar','en']){
 const route=(locale==='en'?'/en':'')+service.internalRoute,html=await readFile(join(root,normalizedSocialRoute(route).slice(1),'index.html'),'utf8'),head=html.split('</head>')[0];
 const links=[...head.matchAll(/<link\b[^>]*>/gi)].map(m=>attrs(m[0])),canonical=new URL(links.find(a=>a.rel==='canonical')?.href||route,SOCIAL_ORIGIN).href,r=byUrl.get(canonical);assert.ok(r,'No image for canonical page '+route);
 const tags=[...head.matchAll(/<meta\b[^>]*>/gi)].map(m=>attrs(m[0])),values=new Map();
 for(const t of tags){const key=t.property||t.name;if(required.includes(key)){assert.ok(!values.has(key),'Duplicate social field '+route+' '+key);values.set(key,t.content);}}
 for(const key of required)assert.ok(values.get(key),'Missing static '+key+' '+route);
 assert.equal(values.get('og:url'),canonical);assert.equal(values.get('og:image'),r.imageUrl);assert.equal(values.get('twitter:image'),r.imageUrl);assert.equal(values.get('twitter:card'),'summary_large_image');assert.equal(values.get('og:type'),'website');assert.equal(values.get('og:image:width'),'1200');assert.equal(values.get('og:image:height'),'630');
 if(locale==='en')for(const key of['og:title','og:description','og:image:alt','twitter:title','twitter:description'])assert.doesNotMatch(values.get(key),/[\u0600-\u06ff]/,route+' '+key);
 pages++;
}
console.log(JSON.stringify({socialAssets:'PASS',canonicalServices:catalog.services.length,images:manifest.records.length,uniqueImageBytes:hashes.size,staticPages:pages,totalBytes:bytes,aliases:catalog.aliases.length,scope:'SOURCE_ARTWORK_AND_STATIC_METADATA_ONLY; live platform extraction remains separate'}));
