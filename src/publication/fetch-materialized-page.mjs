// A successful HTTP response can still belong to the previous Pages deployment.
// Wait only for the expected bytes; stale content must never count as acceptance.
export async function fetchMaterializedPage(url,{expectedHash,hash,maxAttempts=12,delayMs=5000,fetchImpl=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms))}={}){
 let response,body='',error,attempts=0;
 for(;attempts<maxAttempts;){
  attempts++;
  try{
   response=await fetchImpl(url,{redirect:'follow',signal:AbortSignal.timeout(30000),headers:{'cache-control':'no-cache'}});
   body=await response.text();error=null;
   if(response.status===200&&(!expectedHash||hash(body)===expectedHash))break;
  }catch(e){error=e.name;}
  if(attempts<maxAttempts)await wait(delayMs);
 }
 return {response,body,error,attempts};
}

