import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../supabase/functions/document-ai/index.ts',import.meta.url),'utf8');
test('document authentication strips a real Bearer prefix before validating the user',()=>{
 const match=source.match(/const bearer=([^;]+);/);assert.ok(match);
 const parse=Function('req','return '+match[1]);
 for(const header of ['Bearer actual-token','bearer\tactual-token']) assert.equal(parse({headers:new Headers({authorization:header})}),'actual-token');
 assert.equal(parse({headers:new Headers()}),'');
 assert.ok(source.includes('admin.auth.getUser(bearer)'));
 assert.ok(source.includes('if(userError||!userData?.user?.id)'));
});
test('document provider completion and size limits remain truthful',()=>{
 assert.ok(source.includes('completedProviderText(j)'));
 const client=readFileSync(new URL('../../public-ai-concierge.js',import.meta.url),'utf8');
 assert.ok(client.includes('if (isText && file.size > MAX_PUBLIC_DOCUMENT_BYTES)'));
 assert.ok(client.includes('if(file.size>3*1024*1024)'));
 assert.ok(client.includes('if(!s?.access_token)'));
 assert.ok(source.includes('const MAX_BYTES=3*1024*1024'));
});
