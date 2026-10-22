import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
test('published discovery imports follow exact dependency content, including RERA search exports',()=>{
 const runtime=readFileSync('transaction-discovery.js','utf8');
 for(const dependency of ['business-domains.js','intent-search.js','customer-jurisdiction.js']){
  const hash=createHash('sha256').update(readFileSync(dependency)).digest('hex').slice(0,12);
  assert.ok(runtime.includes('./'+dependency+'?v='+hash),dependency+' must refresh for returning visitors');
 }
 assert.ok(readFileSync('intent-search.js','utf8').includes('export function reraApprovalIntent'));
});
