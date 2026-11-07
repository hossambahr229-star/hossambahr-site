import { readFile, writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
const [config,out]=process.argv.slice(2);
const raw=await readFile(config,'utf8');
const val=name=>raw.match(new RegExp('^'+name+'="?([^"\\r\\n]+)','m'))?.[1];
const api=new URL(val('API_URL')||'http://127.0.0.1:54321');
if(!['localhost','127.0.0.1'].includes(api.hostname))throw Error('Expected an isolated loopback API');
const key=val('ANON_KEY')||val('PUBLISHABLE_KEY');
if(!key)throw Error('Missing isolated public API key');
const checks=[];
const request=(path,{token,method='GET',body,type='application/json'}={})=>fetch(new URL(path,api),{method,headers:{apikey:key,authorization:'Bearer '+(token||key),'content-type':type},body,signal:AbortSignal.timeout(10000)});
function check(label,response,expected){
 const pass=expected.includes(response.status);
 checks.push({label,status:response.status,pass});
 if(!pass)throw Error(label+' returned '+response.status);
}
try{
 const users=[];
 for(const label of ['owner','other']){
   const email=label+'-'+randomUUID()+'@example.com',password=randomUUID()+'Aa9';
   const signup=await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})});
   check(label+'_signup',signup,[200,201]);
   const login=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
   check(label+'_login',login,[200]);
   const data=await login.json();
   if(!data.access_token||!data.user?.id)throw Error('Local login returned no session');
   const user=await request('/auth/v1/user',{token:data.access_token});
   check(label+'_session',user,[200]);
   if((await user.json()).id!==data.user.id)throw Error('Session returned a different user');
   users.push({id:data.user.id,token:data.access_token});
 }
 const [owner,other]=users, keyPath=owner.id+'/acceptance.pdf';
 const route='/storage/v1/object/hb-private-documents/'+keyPath;
 const authenticated='/storage/v1/object/authenticated/hb-private-documents/'+keyPath;
 const publicRoute='/storage/v1/object/public/hb-private-documents/'+keyPath;
 const bytes='%PDF-1.4\n% isolated test fixture\n%%EOF\n';
 check('owner_upload',await request(route,{token:owner.token,method:'POST',body:bytes,type:'application/pdf'}),[200,201]);
 const read=await request(authenticated,{token:owner.token});
 check('owner_download',read,[200]);
 if(await read.text()!==bytes)throw Error('Private file bytes differ');
 check('second_user_download_denied',await request(authenticated,{token:other.token}),[400,401,403,404]);
 check('anonymous_public_download_denied',await request(publicRoute),[400,401,403,404]);
 check('second_user_upload_denied',await request(route.replace('acceptance.pdf','foreign.pdf'),{token:other.token,method:'POST',body:bytes,type:'application/pdf'}),[400,401,403,404]);
}catch(error){checks.push({label:'execution',pass:false,error:error.message});}
const report={scope:'DISPOSABLE_LOOPBACK_AUTH_AND_STORAGE_API',checks};
await writeFile(out+'/http.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
if(checks.some(check=>!check.pass))process.exitCode=1;
