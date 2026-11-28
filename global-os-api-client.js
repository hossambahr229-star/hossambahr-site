(() => {
  "use strict";
  const client=window.HB_AUTH;
  if(!client)return;

  let readinessPromise=null;

  async function invoke(body){
    const {data,error}=await client.functions.invoke("global-os-api",{body});
    if(error)throw error;
    if(data?.error)throw new Error(data.error);
    return data;
  }

  async function health({force=false}={}){
    if(!force && readinessPromise)return readinessPromise;
    readinessPromise=(async()=>{
      try{
        const data=await invoke({action:"health"});
        return Boolean(data?.ok && data?.ready);
      }catch{
        return false;
      }
    })();
    return readinessPromise;
  }

  async function createCase(payload){
    if(!await health())throw new Error("Global OS is not ready");
    const data=await invoke(payload);
    return data?.data||data;
  }

  async function submitTask(taskId,note=""){
    if(!await health())throw new Error("Global OS is not ready");
    const data=await invoke({action:"submit_task",task_id:taskId,note});
    return data?.data||data;
  }

  async function decideApproval(taskId,decision,note=""){
    if(!await health())throw new Error("Global OS is not ready");
    const data=await invoke({action:"decide_approval",task_id:taskId,decision,note});
    return data?.data||data;
  }

  window.HB_OS_API=Object.freeze({health,createCase,submitTask,decideApproval});
})();