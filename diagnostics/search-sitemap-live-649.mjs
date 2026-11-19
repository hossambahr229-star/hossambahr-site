import {readFile,mkdir,writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
const report={checkedAt:new Date().toISOString(),status:'FAIL',checks:[],errors:[]};
const sha=s=>createHash('sha256').update(s).digest('hex');
try{
 const expected=await readFile('site/sitemap.xml','utf8'),before=await readFile('before/sitemap.xml','utf8');
 const summary=JSON.parse(await readFile('site/artifacts/service-search-presentation/report.json','utf8')),pages=JSON.parse(await readFile('site/artifacts/service-search-presentation/pages.json','utf8'));
 const blocks=s=>new Map([...s.matchAll(/<url>[\s\S]*?<\/url>/g)].map(m=>[m[0].match(/<loc>([^<]+)<\/loc>/)[1],m[0]]));
 const next=blocks(expected),old=blocks(before);assert.deepEqual([...next.keys()].sort(),[...old.keys()].sort(),'Sitemap URL membership changed');
 const affected=new Set(pages.filter(p=>p.bodyPreserved&&(p.titleChanged||p.descriptionChanged||p.breadcrumbAdded)).map(p=>new URL(p.route,'https://hossambahr.com').href));assert.ok(affected.size>0);
 let updated=0,unrelated=0;
 for(const [url,block]of next){const prior=old.get(url);assert.equal(block.replace(/<lastmod>[^<]*<\/lastmod>/g,''),prior.replace(/<lastmod>[^<]*<\/lastmod>/g,''),'Non-date XML changed '+url);
 if(affected.has(url)){const d=block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];assert.ok(d&&d.slice(0,10)>=summary.researchDate,url);if(block!==prior)updated++;}else{assert.equal(block,prior,'Unrelated block changed '+url);unrelated++;}}
 let response,actual;for(let i=0;i<36;i++){response=await fetch('https://hossambahr.com/sitemap.xml',{headers:{'Cache-Control':'no-cache'}});actual=await response.text();if(response.ok&&sha(actual)===sha(expected))break;await new Promise(r=>setTimeout(r,10000));}
 assert.equal(response.status,200);assert.equal(sha(actual),sha(expected),'Live sitemap differs from deployed repository');
 report.status='PASS';report.sourceAssetSha=process.env.SOURCE_ASSET_SHA;report.recordedReleaseDate=summary.researchDate;report.urlCount=next.size;report.affectedCanonicalPages=affected.size;report.updatedLastmod=updated;report.unrelatedBlocksPreserved=unrelated;report.liveSha256=sha(actual);report.checks=['Actual Production HTTP 200','Exact deployed sitemap bytes','URL membership preserved','Only lastmod changed','Every affected canonical page dated','Unrelated entries unchanged'];
}catch(e){report.errors.push(e.stack||String(e));}
await mkdir('diagnostics/search-sitemap-live-649',{recursive:true});await writeFile('diagnostics/search-sitemap-live-649/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(report.status!=='PASS')process.exitCode=1;
