import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
test('ICP duration details retain source boundaries and do not promote the parent',async()=>{
 const registry=JSON.parse(await readFile('src/registry/published-services.json','utf8'));
 const service=registry.services.find(s=>s.slug==='تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي');
 assert.equal(service.verification.detailsVerified,false);
 const variants=service.officialVariantCards;assert.deepEqual(variants.map(v=>v.durationDays),[60,90,120]);
 assert.equal(variants[2].details.documents.en.length,1);assert.doesNotMatch(variants[2].details.fees.en,/1000/);
 assert.match(variants[2].details.note.en,/Absence does not establish an exemption/);
 for(const locale of ['ar','en']){
  const prefix=locale==='en'?'en/':'',html=await readFile(prefix+service.internalRoute.slice(1)+'index.html','utf8');
  assert.equal((html.match(/id="icp-variant-details"/g)||[]).length,1);
  for(const variant of variants){
   const key='icp-job-'+variant.durationDays,start=html.indexOf('data-scoped-case="'+key+'"'),end=html.indexOf('</article>',start);
   assert.ok(start>=0&&end>start);const fragment=html.slice(start,end);
   assert.ok(fragment.includes(variant.informationUrl));
   if(variant.durationDays===120)assert.doesNotMatch(fragment,/1000|top-500|أفضل 500/);
   const href=fragment.match(/data-scoped-assisted href="([^"]+)"/)?.[1];assert.ok(href);
   const message=new URL(href.replaceAll('&amp;','&')).searchParams.get('text');
   assert.ok(message.includes(variant.informationUrl));assert.ok(message.includes('https://hossambahr.com'+(locale==='en'?'/en':'')+service.internalRoute));
  }
 }
});
