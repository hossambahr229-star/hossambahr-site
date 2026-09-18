(() => {
  "use strict";
  const client=window.HB_AUTH;
  if(!client)return;

  async function createCase(payload){
    const {data,error}=await client.functions.invoke("global-os-api",{body:payload});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    return data?.data||data;
  }

  window.HB_OS_API=Object.freeze({createCase});
})();