import {detectJurisdiction as actualJurisdiction} from '../../supabase/functions/public-ai-concierge/semantic-context.ts';
import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';import {stripTypeScriptTypes} from 'node:module';
const source=await readFile(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
const normal=source.slice(source.indexOf('function normalize('),source.indexOf('function scrubGoal('));
const helpers=source.slice(source.indexOf('function has('),source.indexOf('type SemanticState'));
const intent=source.slice(source.indexOf('function explicitIcpEstablishmentService('),source.indexOf('function rank('));
const resolve=new Function(stripTypeScriptTypes(normal+helpers+intent)+';return explicitIcpEstablishmentService')();
test('explicit ICP establishment operations keep their object and authority',()=>{
for(const [q,operation] of [
['رسوم تجديد بطاقة المنشأة لدى الهيئة الاتحادية ICP في الشارقة','تجديد-بطاقة-المنشأة'],
['Renew establishment card through ICP in Sharjah','تجديد-بطاقة-المنشأة'],
['إصدار بطاقة منشأة عبر ICP في عجمان','إصدار-بطاقة-منشأة'],
['إلغاء بطاقة المنشأة ICP','إلغاء-بطاقة-المنشأة'],
['تعديل بطاقة المنشأة لدى ICP','تعديل-أو-إضافة-بيانات-بطاقة-المنشأة']])assert.ok(resolve(q)?.startsWith(operation),q);
});
test('generic cards, competing authorities and ambiguous operations do not force an ICP match',()=>{
for(const q of ['تجديد الاسم التجاري في الشارقة','تجديد بطاقة المنشأة MOHRE','تجديد بطاقة المنشأة ICP GDRFA','بطاقة المنشأة ICP','تجديد أو إلغاء بطاقة المنشأة ICP'])assert.equal(resolve(q),null,q);
});
test('rank constrains explicit ICP card identity before emirate and generic renewal boosts',()=>{
const start=source.indexOf('function rank('),end=source.indexOf('async function selectSemanticCandidate',start),body=source.slice(start,end);
const rank=new Function('detectJurisdiction','explicitIcpEstablishmentService',stripTypeScriptTypes(normal+helpers+body)+';return rank')(actualJurisdiction,resolve);
const slug='تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي';
const rows=[{binding:{service_slug:'sharjah-trade-name-renewal'},authority:{authority_key:'sedd'}},{binding:{service_slug:slug},authority:{authority_key:'icp'}}];
assert.equal(rank('رسوم تجديد بطاقة المنشأة ICP في الشارقة',rows)[0].binding.service_slug,slug);
assert.deepEqual(rank('تجديد بطاقة المنشأة ICP في دبي',rows),[]);
assert.equal(rank('تجديد بطاقة المنشأة ICP خارج دبي',rows)[0].binding.service_slug,slug);
assert.equal(rank('Renew establishment card through ICP outside Dubai',rows)[0].binding.service_slug,slug);
});

test('outside Dubai is an exclusion, never a Dubai jurisdiction hint',()=>{for(const text of ['تجديد بطاقة المنشأة ICP خارج دبي','Renew establishment card through ICP outside Dubai'])assert.equal(actualJurisdiction(text),null);assert.equal(actualJurisdiction('خارج إمارة دبي في عجمان'),'AE-AJ');assert.equal(actualJurisdiction('outside the emirate of Dubai in Sharjah'),'AE-SH');assert.equal(actualJurisdiction('تجديد بطاقة المنشأة في دبي'),'AE-DU');});
