import test from 'node:test';import assert from 'node:assert/strict';import{readFileSync}from'node:fs';import{renderEnglishMethodology}from'../../src/publication/methodology-page.mjs';
const read=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
test('English methodology explains partial verification without claiming government execution',()=>{
 const html=renderEnglishMethodology();assert.match(html,/<html lang="en" dir="ltr">/);
 assert.ok(html.includes('Coverage and verification are different'));
 assert.ok(html.includes('An unknown fee is not a zero fee.'));
 assert.ok(html.includes('not a government approval'));
 assert.ok(html.includes('Processing time, entry deadlines and permitted stay are separate'));
 assert.ok(html.includes('https://hossambahr.com/en/methodology/'));
 const anchors=[...html.matchAll(/<a\b[^>]*href="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(anchors.includes('/methodology/'));assert.ok(anchors.includes('/en/services/'));assert.ok(anchors.includes('/en/ai/'));
 for(const href of anchors)assert.ok(href==='#main-content'||href==='/methodology/'||href.startsWith('/en/'),href);
 assert.doesNotMatch(html,/<script|self\.__next_f/);
});
test('published English AI footer reaches the generated English methodology page',()=>{
 const ai=read('en/ai/index.html'),methodology=read('en/methodology/index.html');
 assert.ok(ai.includes('href="/en/methodology/"'));assert.ok(!ai.includes('href="/methodology/"'));
 assert.ok(methodology.includes('data-methodology="en-v1"'));assert.ok(methodology.includes('lang="en" dir="ltr"'));
 assert.ok(methodology.includes('href="/methodology/" lang="ar"'));
});
