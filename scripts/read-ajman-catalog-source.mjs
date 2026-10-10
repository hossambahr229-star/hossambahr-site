import{mkdir,writeFile,readFile}from'node:fs/promises';import{execFileSync}from'node:child_process';import{createHash}from'node:crypto';
const out='artifacts/ajman-catalog-source',url='https://www.ajmanded.ae/assets/download/8c2679bc/service-catalog.aspx';await mkdir(out,{recursive:true});
let report={capturedAt:new Date().toISOString(),source:'OFFICIAL_PUBLIC_CATALOG_READ',url,scope:'Read only the specific remaining inquiry card. No full catalog republication, transactions or user data.'};
try{const r=await fetch(url,{signal:AbortSignal.timeout(90000)}),bytes=Buffer.from(await r.arrayBuffer());report={...report,status:r.status,contentType:r.headers.get('content-type'),lastModified:r.headers.get('last-modified'),sha256:createHash('sha256').update(bytes).digest('hex'),length:bytes.length};
if(!r.ok||bytes.subarray(0,4).toString()!=='%PDF')throw Error('Official catalog download is not a successful PDF');
await writeFile('/tmp/hb-ajman-catalog.pdf',bytes);execFileSync('pdftotext',['-layout','/tmp/hb-ajman-catalog.pdf','/tmp/hb-ajman-catalog.txt']);
const text=await readFile('/tmp/hb-ajman-catalog.txt','utf8'),pages=text.split('\f');report.pageCount=pages.length;report.matches=pages.map((text,index)=>({page:index+1,text})).filter(p=>/business activity inquiry|activities approval|الاستعلام عن الأنشطة|الأنشطة الاقتصادية/i.test(p.text)).map(p=>({page:p.page,text:p.text.slice(0,16000)})).slice(0,8);
report.frontMatter=pages.slice(0,2).join('\n').slice(0,2000);
}catch(error){report.error=String(error)}
await writeFile(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({status:report.status,length:report.length,matches:report.matches?.map(x=>x.page),error:report.error}));
