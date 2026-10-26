import test from 'node:test';import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync(new URL('../../auth-client.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('  function safeReturnPath('),source.indexOf('  const message ='));
const {safeReturnPath,navigationReturnPath}=Function('accountPath',helpers+';return {safeReturnPath,navigationReturnPath};')('/account/');
test('return destinations reject cross-origin and browser backslash reinterpretation',()=>{
 for(const value of ['https://external.example/','//external.example/','/\\external.example/','/\n/external.example/','javascript:alert(1)',null])assert.equal(safeReturnPath(value),'/account/');
 assert.equal(safeReturnPath('/os/?handoff=1&start=1#ai-intake'),'/os/?handoff=1&start=1#ai-intake');
});
test('login navigation preserves the intended destination instead of nesting login returns',()=>{
 const destination='/os/?handoff=1&start=1#ai-intake';
 const search='?return='+encodeURIComponent(destination);
 assert.equal(navigationReturnPath({pathname:'/auth/',search}),destination);
 assert.equal(safeReturnPath('/auth/?return='+encodeURIComponent('/auth/'+search)),destination);
 assert.equal(safeReturnPath('/auth/'),'/account/');
});
test('ordinary service navigation preserves query and anchor',()=>{
 assert.equal(navigationReturnPath({pathname:'/services/example/',search:'?q=renew',hash:'#requirements'}),'/services/example/?q=renew#requirements');
});

test('English authentication fallback stays in English without accepting unsafe destinations',()=>{
 const localized=Function('accountPath',helpers+';return {safeReturnPath,navigationReturnPath};')('/en/account/');
 for(const value of [null,'/en/auth/','//external.example/','/\\\\external.example/'])assert.equal(localized.safeReturnPath(value),'/en/account/');
 assert.equal(localized.safeReturnPath('/en/services/example/?handoff=1#requirements'),'/en/services/example/?handoff=1#requirements');
 assert.equal(localized.navigationReturnPath({pathname:'/en/auth/',search:''}),'/en/account/');
});
