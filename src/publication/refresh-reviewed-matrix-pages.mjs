import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const matrix=JSON.parse(await readFile(resolve(root,'service-matrix.json'),'utf8'));
const review=JSON.parse(await readFile(resolve(root,'content/moe-edas-field-review-2026-10-08.json'),'utf8'));
const esc=value=>String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
for(const record of review.records){
 const service=matrix.services.find(s=>s.slug===record.slug);
 if(!service||service.lastReviewed!==(record.reviewedAt??review.reviewedAt))throw Error('Missing reviewed source: '+record.slug);
 const file=resolve(root,'services',service.slug,'index.html');let html=await readFile(file,'utf8');
 const sections=[['requirements','(?:المتطلبات والمستندات|المستندات والمتطلبات)','<ul>'+service.requirements.map(t=>'<li>'+esc(t)+'</li>').join('')+'</ul>'],['fees','الرسوم','<p>'+esc(service.fees)+'</p>'],['duration','(?:المدة المتوقعة|مدة الإنجاز)','<p>'+esc(service.duration)+'</p>'],['conditions','الشروط','<p>'+esc(service.conditions)+'</p>']];
 for(const [field,heading,body] of sections){
  if(!record.fields.includes(field))continue;
  let matches=0;
  html=html.replace(new RegExp('(<section[^>]*><h2>'+heading+'</h2>)[\\s\\S]*?</section>','g'),(_,open)=>{matches++;return open+body+'</section>';});
  if(matches!==1)throw Error(service.slug+': expected one '+heading+' section');
 }
 for(const [question,answer] of [['ما الرسوم؟',service.fees],['كم تستغرق المعاملة؟',service.duration]]){
  if(!record.fields.includes(question==='ما الرسوم؟'?'fees':'duration'))continue;
  const start='<details><summary>'+question+'</summary>';const position=html.indexOf(start);
  if(position!==-1){const end=html.indexOf('</details>',position);if(end===-1)throw Error('Unclosed FAQ');html=html.slice(0,position)+start+'<p>'+esc(answer)+'</p></details>'+html.slice(end+10);}
 }
 await writeFile(file,html,'utf8');
}
console.log('Reviewed matrix detail pages refreshed: '+review.records.length);
