import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
import {continuityPartition,summarizeQualityEvidence} from '../../scripts/quality-partition-evidence.mjs';
const edge=readFileSync(new URL('../../supabase/functions/public-ai-concierge/index.ts',import.meta.url),'utf8');
const start=edge.indexOf('async function fingerprint('),end=edge.indexOf('\n}',start)+2;
assert.ok(start>=0&&end>start);
const body=edge.slice(start,end);
const fingerprint=vm.runInNewContext(body.replace('req: Request','req')+'; fingerprint',{crypto:webcrypto,TextEncoder,Uint8Array,Date});
test('client-selected QA and user-agent headers cannot rotate quota identity',async()=>{
 const req=(qa,ua)=>({headers:new Headers({'cf-connecting-ip':'192.0.2.1','x-hb-qa-run':qa,'user-agent':ua})});
 assert.equal(await fingerprint(req('one','browser-a')),await fingerprint(req('two','browser-b')));
 assert.doesNotMatch(body,/x-hb-qa-run|user-agent/);
});
test('existing gateway IP precedence and distinct IP buckets are retained',async()=>{
 const req=h=>({headers:new Headers(h)});
 const a=await fingerprint(req({'cf-connecting-ip':'192.0.2.1','x-real-ip':'192.0.2.2'}));
 assert.equal(a,await fingerprint(req({'cf-connecting-ip':'192.0.2.1'})));
 assert.notEqual(a,await fingerprint(req({'cf-connecting-ip':'192.0.2.2'})));
 assert.equal(await fingerprint(req({})),await fingerprint(req({'x-hb-qa-run':'rotate'})));
});
test('protection remains capped and readiness is declared',()=>{
 assert.match(edge,/p_limit: 120/);assert.match(edge,/rate_limited/);
 assert.match(edge,/rate_limit_policy:\s*["']ip-hourly-120-v1["']/);
});
const independent={status:'PASS',metrics:{total:100,wrong_route_rate:0,unsupported_claim_guard_failures:0,dead_end_rate:0,fallback_rate:0}};
function parts(){return [0,1,2].map(index=>{
 const p=continuityPartition({HB_QA_PARTITION_COUNT:3,HB_QA_PARTITION_INDEX:index});
 return {status:'PASS',partition:{index,count:3},scenarioIndices:p.scenarioIndices,includesExact:p.includesExact,totalTurns:p.expectedTurns,scenarios:p.scenarioIndices.length+(p.includesExact?1:0),lost_context_rate:0,unnecessary_clarification_rate:0,generic_fallback_rate:0,wrong_route_rate:0,dead_end_rate:0,unsupported_claim_rate:0};
});}
test('all original cases remain mandatory within real quota budgets',()=>{
 const result=summarizeQualityEvidence(independent,parts());
 assert.deepEqual(result.perJobRequestBudgets,[100,74,66,66]);
 assert.equal(result.totalPublicRequests,306);assert.equal(result.conversationScenarios,101);
 assert.equal(continuityPartition({}).expectedTurns,206);assert.equal(result.quotaBypass,false);
});
test('missing duplicate truncated or failed partitions cannot produce PASS',()=>{
 assert.throws(()=>summarizeQualityEvidence(independent,parts().slice(1)));
 const duplicate=parts();duplicate[1]=duplicate[0];assert.throws(()=>summarizeQualityEvidence(independent,duplicate));
 const truncated=parts();truncated[0].totalTurns--;assert.throws(()=>summarizeQualityEvidence(independent,truncated));
 const failed=parts();failed[2].wrong_route_rate=.01;assert.throws(()=>summarizeQualityEvidence(independent,failed));
 assert.throws(()=>continuityPartition({HB_QA_PARTITION_COUNT:3,HB_QA_PARTITION_INDEX:3}));
});