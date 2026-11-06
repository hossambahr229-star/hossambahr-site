import { mkdir, writeFile } from 'node:fs/promises';
const base = 'https://hossambahr.com';
const routes = {'/':'home-ar','/en/':'home-en','/ai/':'ai-ar','/en/ai/':'ai-en','/command-center/':'command-center-ar'};
const out = 'diagnostics/product-social-live-630';
const get = url => fetch(url, { cache:'no-store', signal:AbortSignal.timeout(12000), headers:{'User-Agent':'facebookexternalhit/1.1'} });
const values = (html,key) => [...html.matchAll(/<meta\b[^>]*>/gi)].filter(m => new RegExp('(?:name|property)=["\\x27]'+key+'["\\x27]','i').test(m[0])).map(m => m[0].match(/\bcontent=["']([^"']*)/i)?.[1]);
const rows = [];
const deadline = Date.now() + 12 * 60e3;
for (const [path,id] of Object.entries(routes)) {
  const image = base + '/assets/social/product/' + id + '.jpg';
  const row = {path, image};
  do {
    try {
      const r = await get(base+path);
      const html = await r.text();
      const tag = key => values(html,key);
      row.htmlStatus = r.status;
      row.tags = {image:tag('og:image'), twitter:tag('twitter:image'), width:tag('og:image:width'),height:tag('og:image:height'),card:tag('twitter:card'),title:tag('og:title'),description:tag('og:description'),url:tag('og:url')};
      const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
      row.canonical = canonical;
      if (!r.ok || row.tags.image.length!==1 || row.tags.image[0]!==image || row.tags.twitter.length!==1 || row.tags.twitter[0]!==image || row.tags.width[0]!=='1200' || row.tags.height[0]!=='630' || row.tags.card[0]!=='summary_large_image' || !row.tags.title[0] || !row.tags.description[0] || canonical!==base+path || row.tags.url[0]!==canonical) throw Error('Product metadata does not match the expected published route');
      const i = await get(image);
      const bytes = Buffer.from(await i.arrayBuffer());
      row.imageStatus = i.status;
      row.mime = i.headers.get('content-type');
      row.bytes = bytes.length;
      if (!i.ok || !row.mime?.startsWith('image/jpeg') || bytes.readUInt16BE(0)!==0xffd8) throw Error('Published image is not a readable JPEG');
      row.status = 'PASS';
      delete row.error;
      break;
    } catch(error) {
      row.status = 'FAIL';
      row.error = error.message;
      if(Date.now()<deadline) await new Promise(r=>setTimeout(r,15000));
    }
  } while(Date.now()<deadline);
  rows.push(row);
}
await mkdir(out,{recursive:true});
await writeFile(out+'/report.json',JSON.stringify({sourceSha:'be18c4713331d5836b67c5653a1b9eaef16a36f2',scope:'LIVE_HTTP_CRAWLER_USER_AGENT',rows},null,2)+'\n');
if(rows.some(r=>r.status!=='PASS'))process.exitCode=1;
