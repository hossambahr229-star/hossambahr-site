import test from 'node:test';import assert from 'node:assert/strict';import {transactionObject,transactionObjectMatches,visitVisaFollowUp} from '../../supabase/functions/public-ai-concierge/transaction-object.ts';
const norm=s=>s.toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670]/g,'').replace(/[أإآ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const published=JSON.parse(await (await import('node:fs/promises')).readFile(new URL('../../src/registry/published-services.json',import.meta.url),'utf8')).services;
const cards=published.map(s=>[/سياحية/.test(s.slug)?'tourism':'visitor',s.authority.id,s.name.ar]);
const resolve=i=>cards.filter(([k,a,t])=>transactionObjectMatches(i,norm(t),a)).map(([k,a])=>k+':'+a);
for(const locale of ['ar','en'])for(const kind of ['tourism','visitor'])test(locale+' '+kind+' stays exact across emirates and facts',()=>{
 const q=norm(locale==='ar'?(kind==='tourism'?'أريد تأشيرة سياحية لدخول واحد في الشارقة':'أريد تأشيرة زيارة صديق لدخول واحد في الشارقة'):(kind==='tourism'?'I need a single-entry tourist visa in Sharjah':'I need a single-entry visa to visit a friend in Sharjah'));
 const slug=kind==='tourism'?'تأشيرة-سياحية-عبر-icp-خارج-دبي':'تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي';
 assert.deepEqual(resolve(transactionObject(q,'AE-SH')),[kind+':icp']);
 for(const [turn,j,authority]of [['والرسوم؟','AE-SH','icp'],['What about Dubai?','AE-DU','gdrfa-dubai'],['ولو في دبي؟','AE-DU','gdrfa-dubai'],['What about Ajman?','AE-AJ','icp']])assert.deepEqual(resolve(visitVisaFollowUp(slug,j,'issue',norm(turn),q)),[kind+':'+authority]);
});
test('unsupported operations, unknown entry in Dubai and conflicts fail closed',()=>{
 for(const q of ['Renew tourist visa in Sharjah','Cancel a visa to visit a friend in Dubai','Multiple entry tourist visa Dubai','Tourist visa Dubai','ICP single entry tourist visa Dubai','GDRFA tourist visa Sharjah','تمديد تأشيرة سياحية في الشارقة'])assert.deepEqual(resolve(transactionObject(norm(q),q.includes('Sharjah')||q.includes('الشارقة')?'AE-SH':'AE-DU')),[],q);
});
test('does not coerce five-year, family residence, work or exploration visas',()=>{
 for(const q of ['5 year tourist visa Sharjah','تأشيرة سياحية خمس سنوات','عايز تأشيرة سياحية 5 سنين','تأشيرة سياحية ٥ سنين','تأشيرة سياحية خمس أعوام','wife residence visa Sharjah','work permit for golden visa holder Dubai','business exploration visa Sharjah'])assert.doesNotMatch(transactionObject(norm(q),'AE-SH')?.kind||'',/^(?:tourism-visa|friend-relative-visit-visa)$/);
 const i=transactionObject(norm('single entry tourist visa Sharjah'),'AE-SH');for(const title of ['Renew a Trade Licence in Sharjah','إقامة الأسرة','5 year tourist visa'])assert.equal(transactionObjectMatches(i,norm(title),'icp'),false);
});
test('generic outside-Dubai visit is valid but does not guess Dubai entry type',()=>{
 const q=norm('I need a tourist visa in Sharjah. What documents are required?');assert.deepEqual(resolve(transactionObject(q,'AE-SH')),['tourism:icp']);
 assert.deepEqual(resolve(visitVisaFollowUp('تأشيرة-سياحية-عبر-icp-خارج-دبي','AE-DU',null,norm('What about Dubai?'),q)),[]);
});
