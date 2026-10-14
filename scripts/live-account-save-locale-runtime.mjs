import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const dir='artifacts/live-account-save-locale-runtime';mkdirSync(dir,{recursive:true});
const expected=readFileSync('auth-client.js','utf8');let actual,status;
for(let i=0;i<90;i++){const r=await fetch('https://hossambahr.com/auth-client.js?acceptance=466',{cache:'no-store'});status=r.status;actual=await r.text();if(r.ok&&actual===expected)break;await new Promise(resolve=>setTimeout(resolve,10000));}
if(actual!==expected)throw new Error('Published auth runtime has not reached expected source');
writeFileSync(dir+'/auth-client.js',actual);
const test=readFileSync('test/architecture/account-service-save-locale.test.mjs','utf8').replace("../../auth-client.js","../../artifacts/live-account-save-locale-runtime/auth-client.js");
writeFileSync('test/architecture/production-account-save-locale.generated.test.mjs',test);
const result=spawnSync(process.execPath,['--test','test/architecture/production-account-save-locale.generated.test.mjs'],{encoding:'utf8'});console.log(result.stdout);if(result.status!==0)throw new Error(result.stderr||result.stdout);
const report={capturedAt:new Date().toISOString(),status:'PASS',source:'LIVE_PRODUCTION_DOWNLOADED_JAVASCRIPT',httpStatus:status,sha256:createHash('sha256').update(actual).digest('hex'),sourceBytesMatch:true,localeCases:2,session:'synthetic in-memory only',actualAuthenticatedAccountAcceptance:false,privateDocumentsAccessed:false,externalModelRequests:0};writeFileSync(dir+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
