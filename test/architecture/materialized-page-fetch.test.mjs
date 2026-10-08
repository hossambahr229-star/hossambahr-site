import test from 'node:test';import assert from 'node:assert/strict';
import {fetchMaterializedPage} from '../../src/publication/fetch-materialized-page.mjs';
const response=body=>({status:200,text:async()=>body});
test('HTTP 200 from the previous deployment waits for the expected page bytes',async()=>{
 let calls=0,waits=0;const result=await fetchMaterializedPage('https://example.test/page/',{expectedHash:'current',hash:String,fetchImpl:async()=>response(++calls===1?'previous':'current'),wait:async()=>{waits++;}});
 assert.equal(result.body,'current');assert.equal(result.attempts,2);assert.equal(waits,1);assert.equal(result.error,null);
});
test('permanently stale HTTP 200 is bounded and remains distinguishable from expected bytes',async()=>{
 let waits=0;const result=await fetchMaterializedPage('https://example.test/page/',{expectedHash:'current',hash:String,maxAttempts:3,fetchImpl:async()=>response('previous'),wait:async()=>{waits++;}});
 assert.notEqual(result.body,'current');assert.equal(result.attempts,3);assert.equal(waits,2);
});
test('a transport failure is retried without accepting an absent response',async()=>{
 let calls=0;const result=await fetchMaterializedPage('https://example.test/page/',{expectedHash:'current',hash:String,fetchImpl:async()=>{if(++calls===1)throw new TypeError('network');return response('current');},wait:async()=>{}});
 assert.equal(result.body,'current');assert.equal(result.error,null);assert.equal(result.attempts,2);
});

