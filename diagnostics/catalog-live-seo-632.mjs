import { mkdir, writeFile } from 'node:fs/promises';

const origin = 'https://hossambahr.com';
const out = 'diagnostics/catalog-live-seo-632';
const request = (url, init = {}) => fetch(url, { ...init, signal: AbortSignal.timeout(15000), headers: {'User-Agent':'HossamBahr-public-acceptance/1.0'} });
const report = { checkedAt: new Date().toISOString(), scope: 'ACTUAL_PUBLIC_HTTP_SEO', routes: [], errors: [] };
function attr(tag,key) {
  return tag?.match(new RegExp('\\b'+key+'\\s*=\\s*(["\\x27])(.*?)\\1','i'))?.[2];
}
function sameUrl(a,b) {
  if (!a || !b) return false;
  return decodeURI(new URL(a,origin).href)===decodeURI(new URL(b,origin).href);
}
async function check(url, allRoutes) {
  const row={url, errors:[]};
  try {
    const r=await request(url);
    const html=await r.text();
    row.httpStatus=r.status;
    if(!r.ok||!sameUrl(r.url,url)) row.errors.push('unexpected_http_or_redirect');
    const links=[...html.matchAll(/<link\b[^>]*>/gi)].map(m=>m[0]);
    const meta=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>m[0]);
    const tags=key=>meta.filter(t=>[attr(t,'name'),attr(t,'property')].includes(key)).map(t=>attr(t,'content'));
    const path=new URL(url).pathname;
    const locale=path.startsWith('/en/')?'en':'ar';
    const counterpart=origin+(locale==='en'?path.slice(3):'/en'+path);
    row.title=html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]?.trim();
    row.description=tags('description')[0];
    row.image=tags('og:image')[0];
    const canon=links.filter(t=>attr(t,'rel')==='canonical').map(t=>attr(t,'href'));
    if(canon.length!==1||!sameUrl(canon[0],url))row.errors.push('canonical');
    if(!allRoutes.has(decodeURI(counterpart))||!links.some(t=>attr(t,'rel')==='alternate'&&attr(t,'hreflang')===(locale==='en'?'ar':'en')&&sameUrl(attr(t,'href'),counterpart)))row.errors.push('hreflang');
    if(!row.title||!row.description||tags('robots').some(v=>/noindex/i.test(v)))row.errors.push('indexability_metadata');
    if(!sameUrl(tags('og:url')[0],url)||!tags('og:title')[0]||!tags('og:description')[0]||tags('twitter:card')[0]!=='summary_large_image'||tags('og:image').length!==1||!row.image?.startsWith(origin+'/assets/social/services/'))row.errors.push('sharing_metadata');
    if(row.image?.startsWith(origin+'/assets/social/services/')){
      const i=await request(row.image,{method:'HEAD'});
      row.imageStatus=i.status;
      if(!i.ok||!i.headers.get('content-type')?.startsWith('image/jpeg'))row.errors.push('sharing_image_http');
    }
  }catch(e){row.errors.push(e.message);}
  return row;
}
try {
  const deadline=Date.now()+9*60e3;
  let ready=false;
  do {
    try {
      const page=await request(origin+'/en/services/sharjah-economic-license-issuance/?qa=632');
      ready=page.ok && /<title>[^<]*License Issuance in Sharjah/i.test(await page.text());
    } catch {}
    if(!ready)await new Promise(r=>setTimeout(r,15000));
  }while(!ready&&Date.now()<deadline);
  if(!ready)throw Error('Updated title not visible on Production');
  const r=await request(origin+'/sitemap.xml');
  if(!r.ok)throw Error('Sitemap HTTP '+r.status);
  const xml=await r.text();
  const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
  report.sitemapCount=urls.length;
  const serviceLike=urls.filter(url=>/^\/(?:en\/)?services\/[^/]+\/$/.test(new URL(url).pathname));
  const manifestRes=await request(origin+'/assets/social/services/manifest.json');
  if(!manifestRes.ok)throw Error('Sharing manifest HTTP '+manifestRes.status);
  const manifest=await manifestRes.json();
  const routes=[...new Set(manifest.records.map(row=>new URL(row.canonicalRoute,origin).href))];
  const allRoutes=new Set(serviceLike.map(url=>decodeURI(url)));
  const registryRoutes=new Set(routes.map(url=>decodeURI(url)));
  report.legacyServiceLikeUrls=serviceLike.filter(url=>!registryRoutes.has(decodeURI(url)));
  report.missingFromSitemap=routes.filter(url=>!allRoutes.has(decodeURI(url)));
  if(report.missingFromSitemap.length)report.errors.push('Canonical catalog routes missing from the sitemap');
  for(let i=0;i<routes.length;i+=8)report.routes.push(...await Promise.all(routes.slice(i,i+8).map(url=>check(url,allRoutes))));
  for(const field of ['title','description','image']){
    const map=new Map();
    for(const row of report.routes){if(!row[field])continue;const values=map.get(row[field])||[];values.push(row.url);map.set(row[field],values);}
    report[field+'Duplicates']=[...map.values()].filter(group=>group.length>1);
  }
  if(routes.length!==404)report.errors.push('Unexpected canonical service route count: '+routes.length);
}catch(e){report.errors.push(e.message);}
report.passed=report.routes.filter(row=>!row.errors.length).length;
report.failed=report.routes.length-report.passed;
await mkdir(out,{recursive:true});
await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
if(report.errors.length||report.failed||report.titleDuplicates?.length||report.descriptionDuplicates?.length||report.imageDuplicates?.length)process.exitCode=1;
