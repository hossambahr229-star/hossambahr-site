import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import{resolve}from'node:path';import{CATEGORY_LABELS}from'../service-capabilities.js';
const data=JSON.parse(await readFile('transaction-discovery-data.json','utf8'));let checked=0;
for(const service of data){const html=await readFile(resolve('.','.'+decodeURIComponent(service.u),'index.html'),'utf8');const aside=html.match(/<aside\b[^>]*class="[^"]*\bservice-aside\b[^"]*"[^>]*>([\s\S]*?)<\/aside>/)?.[1];if(!aside)continue;checked++;for(const key of Object.keys(CATEGORY_LABELS))assert.ok(!aside.includes('>'+key+'<'),'Visible internal category '+service.s+': '+key);}
assert.ok(checked>0);
const parent=await readFile('services/إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي/index.html','utf8');assert.match(parent,/<dd>الأسرة والكفالة<\/dd>/);assert.ok(!parent.includes('<dd>family-sponsorship</dd>'));
console.log(JSON.stringify({status:'PASS',published:data.length,asidesChecked:checked,parentCategory:'الأسرة والكفالة',factsChanged:false}));
