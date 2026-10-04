import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import vm from 'node:vm';
test('English authentication and account routes never enter the service-worker cache',()=>{
const src=readFileSync(new URL('../../sw.js',import.meta.url),'utf8');const ctx={self:{addEventListener(){}},URL};vm.createContext(ctx);vm.runInContext(src,ctx);
for(const pathname of ['/auth/callback/','/en/auth/callback/','/en/auth/reset/','/en/account/','/en/os/','/auth-client.js'])assert.equal(ctx.isSensitive({pathname}),true,pathname);
assert.equal(ctx.isSensitive({pathname:'/en/services/'}),false);
});
test('English auth email callbacks keep the existing allowlisted path and locale',()=>{const src=readFileSync(new URL('../../auth-client.js',import.meta.url),'utf8');assert.match(src,/\/auth\/callback\/\?\$\{english \? "locale=en&"/);assert.match(src,/\/auth\/reset\/\$\{english \? "\?locale=en"/);assert.match(src,/location\.replace\("\/en" \+ location\.pathname \+ location\.search/);});
