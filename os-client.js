(() => {
  "use strict";
  const client = window.HB_AUTH;
  if (!client) return;

  const $ = (selector) => document.querySelector(selector);
  const setMessage = (text, state = "info") => {
    const node = $("[data-os-message]");
    if (!node) return;
    node.textContent = text;
    node.dataset.state = state;
    node.hidden = false;
  };
  const article = (title, meta = "") => {
    const el = document.createElement("article");
    const strong = document.createElement("strong");
    strong.textContent = title;
    el.append(strong);
    if (meta) {
      const p = document.createElement("p");
      p.textContent = meta;
      el.append(p);
    }
    return el;
  };
  const date = (value) => {
    if (!value) return "";
    try { return new Intl.DateTimeFormat("ar-AE", { dateStyle: "medium" }).format(new Date(value)); }
    catch { return String(value); }
  };

  async function loadOrganizations() {
    const target = $("[data-os-organizations]");
    const { data, error } = await client.from("hb_organizations").select("id,legal_name,trade_name,lifecycle_status,created_at").order("created_at",{ascending:false}).limit(20);
    if (error) { target.innerHTML = "<p>تعذر تحميل الشركات.</p>"; return; }
    target.replaceChildren(...(data.length ? data.map((item)=>article(item.trade_name || item.legal_name, `${item.legal_name} • ${item.lifecycle_status}`)) : [article("لا توجد شركة مضافة بعد","يمكنك إضافة أول كيان تجاري من هنا.")]));
  }

  const caseStatusLabel = (status) => ({
    draft:"مسودة",
    qualifying:"تجهيز المسار",
    waiting_customer:"بانتظارك",
    ready_for_review:"جاهزة للمراجعة",
    approved:"معتمدة",
    in_progress:"قيد التنفيذ",
    waiting_external:"بانتظار جهة خارجية",
    blocked:"متوقفة",
    completed:"مكتملة",
    cancelled:"ملغاة"
  })[status] || status;

  const taskStatusOpen = new Set(["todo","in_progress","waiting","needs_approval"]);

  function nextExecutableTask(tasks = []) {
    const done = new Set(tasks.filter((task)=>task.status==="done").map((task)=>task.id));
    return tasks.find((task)=>{
      if(!taskStatusOpen.has(task.status)) return false;
      const deps=Array.isArray(task.dependency_ids)?task.dependency_ids:[];
      return deps.every((id)=>done.has(id));
    }) || tasks.find((task)=>taskStatusOpen.has(task.status)) || null;
  }

  function buildCaseCard(item,tasks=[]) {
    const card=document.createElement("article");
    card.className="hb-case-card";
    const heading=document.createElement("div");
    heading.className="hb-case-card-heading";
    const title=document.createElement("strong");
    title.textContent=item.title;
    const status=document.createElement("span");
    status.className="hb-case-status";
    status.textContent=caseStatusLabel(item.status);
    heading.append(title,status);

    const completed=tasks.filter((task)=>task.status==="done").length;
    const total=tasks.length;
    const percent=total?Math.round((completed/total)*100):Number(item.readiness_percent||0);
    const progress=document.createElement("div");
    progress.className="hb-case-progress";
    progress.setAttribute("role","progressbar");
    progress.setAttribute("aria-valuemin","0");
    progress.setAttribute("aria-valuemax","100");
    progress.setAttribute("aria-valuenow",String(percent));
    const bar=document.createElement("span");
    bar.style.width=`${Math.max(0,Math.min(100,percent))}%`;
    progress.append(bar);

    const meta=document.createElement("p");
    meta.textContent=total ? `${completed} من ${total} خطوات مكتملة • ${percent}%` : `جاهزية ${percent}%`;

    const next=nextExecutableTask(tasks);
    const nextLine=document.createElement("p");
    nextLine.className="hb-case-next";
    if(next){
      const prefix=next.requires_approval ? "اعتماد مطلوب: " : next.assignee_type==="user" ? "مطلوب منك: " : "الخطوة التالية: ";
      nextLine.textContent=prefix+next.title;
    }else{
      nextLine.textContent=total && completed===total ? "اكتملت جميع خطوات المسار." : "سيتم تحديد الخطوة التالية تلقائيًا.";
    }
    card.append(heading,progress,meta,nextLine);
    return card;
  }

  async function loadCases() {
    const target = $("[data-os-cases]");
    const { data, error } = await client.from("hb_cases")
      .select("id,title,status,priority,readiness_percent,created_at")
      .not("status","in",'("completed","cancelled")')
      .order("created_at",{ascending:false})
      .limit(20);
    if (error) { target.innerHTML = "<p>تعذر تحميل الحالات.</p>"; return []; }
    if(!data.length){
      target.replaceChildren(article("لا توجد حالات مفتوحة","اكتب هدفك بالأعلى أو ابدأ من أي خدمة."));
      return [];
    }

    const ids=data.map((item)=>item.id);
    const {data:tasks,error:taskError}=await client.from("hb_case_tasks")
      .select("id,case_id,title,status,assignee_type,requires_approval,dependency_ids,due_at,created_at")
      .in("case_id",ids)
      .order("created_at",{ascending:true});

    const byCase=new Map(ids.map((id)=>[id,[]]));
    if(!taskError){
      for(const task of tasks||[]){
        if(!byCase.has(task.case_id))byCase.set(task.case_id,[]);
        byCase.get(task.case_id).push(task);
      }
    }

    const enriched=data.map((item)=>({...item,_tasks:byCase.get(item.id)||[]}));
    target.replaceChildren(...enriched.map((item)=>buildCaseCard(item,item._tasks)));
    return enriched;
  }

  async function loadAttention(cases) {
    const target = $("[data-os-attention]");
    const attention=[];
    for(const item of cases){
      const next=nextExecutableTask(item._tasks||[]);
      const needsUser=next && (next.assignee_type==="user" || next.requires_approval || next.status==="needs_approval");
      if(needsUser || ["blocked","waiting_customer"].includes(item.status) || ["high","urgent"].includes(item.priority)){
        attention.push({item,next});
      }
    }
    target.replaceChildren(...(attention.length ? attention.map(({item,next})=>{
      const message=next
        ? (next.requires_approval ? `اعتماد مطلوب: ${next.title}` : next.assignee_type==="user" ? `مطلوب منك: ${next.title}` : `الخطوة الحالية: ${next.title}`)
        : item.status==="waiting_customer" ? "بانتظار إجراء منك" : `الحالة: ${caseStatusLabel(item.status)} • أولوية: ${item.priority}`;
      return article(item.title,message);
    }) : [article("لا يوجد إجراء عاجل","سيظهر هنا أي عنصر يتطلب تدخلك.")]));
  }

  async function loadObligations() {
    const target = $("[data-os-obligations]");
    const start = new Date().toISOString();
    const end = new Date(Date.now()+60*24*60*60*1000).toISOString();
    const { data, error } = await client.from("hb_obligations").select("id,title,due_at,obligation_type,status").eq("status","open").gte("due_at",start).lte("due_at",end).order("due_at",{ascending:true}).limit(20);
    if (error) { target.innerHTML="<p>تعذر تحميل الاستحقاقات.</p>"; return; }
    target.replaceChildren(...(data.length ? data.map((item)=>article(item.title,`الاستحقاق: ${date(item.due_at)}`)) : [article("لا توجد استحقاقات خلال 60 يومًا","ستظهر التجديدات والمواعيد المهمة هنا.")]));
  }

  async function setupGoal(session) {
    const form = $("[data-os-goal-form]");
    form?.addEventListener("submit", async (event)=>{
      event.preventDefault();
      const goal = String(new FormData(form).get("goal") || "").trim();
      if (!goal) return;
      const button=form.querySelector("button");
      button.disabled=true;
      button.textContent="جاري إنشاء الحالة…";
      let createError=null;
      try {
        if(!window.HB_OS_API)throw new Error("Global OS API unavailable");
        await window.HB_OS_API.createCase({title:goal.slice(0,180),goal});
      } catch (error) {
        createError=error;
      }
      button.disabled=false;
      button.textContent="ابدأ الحالة";
      if (createError) return setMessage("تعذر إنشاء الحالة الآن. تأكد من تفعيل Global OS API.","error");
      form.reset();
      setMessage("تم إنشاء الحالة. أصبحت جزءًا من مركز التشغيل.","success");
      const cases=await loadCases();
      await loadAttention(cases);
    });
  }

  async function setupOrganization(session) {
    const toggle=$("[data-toggle-organization]");
    const form=$("[data-organization-form]");
    toggle?.addEventListener("click",()=>{form.hidden=!form.hidden;});
    form?.addEventListener("submit",async(event)=>{
      event.preventDefault();
      const fd=new FormData(form);
      const legal=String(fd.get("legal_name")||"").trim();
      const trade=String(fd.get("trade_name")||"").trim();
      if(!legal)return;
      const button=form.querySelector("button");
      button.disabled=true;
      const {error}=await client.from("hb_organizations").insert({
        owner_user_id:session.user.id,
        legal_name:legal,
        trade_name:trade||null
      });
      button.disabled=false;
      if(error)return setMessage("تعذر إضافة الشركة الآن.","error");
      form.reset();
      form.hidden=true;
      await loadOrganizations();
    });
  }


  async function loadDocuments() {
    const target = $("[data-os-documents]");
    if (!target) return;
    const { data, error } = await client.from("hb_documents")
      .select("id,document_type,original_filename,verification_status,expires_at,created_at")
      .order("created_at",{ascending:false})
      .limit(20);
    if (error) { target.innerHTML="<p>تعذر تحميل المستندات.</p>"; return; }
    target.replaceChildren(...(data.length ? data.map((item)=>{
      const expiry=item.expires_at ? ` • انتهاء: ${date(item.expires_at)}` : "";
      return article(item.original_filename || item.document_type, `${item.document_type} • ${item.verification_status}${expiry}`);
    }) : [article("الخزنة فارغة","ارفع المستند مرة واحدة ليصبح جزءًا من ملفك التشغيلي.")]));
  }

  async function setupDocumentUpload(session) {
    const toggle=$("[data-toggle-document]");
    const form=$("[data-document-upload-form]");
    if(!form)return;
    toggle?.addEventListener("click",()=>{form.hidden=!form.hidden;});
    form.addEventListener("submit",async(event)=>{
      event.preventDefault();
      const fd=new FormData(form);
      const file=fd.get("file");
      const documentType=String(fd.get("document_type")||"").trim();
      const expiresAt=String(fd.get("expires_at")||"").trim()||null;
      if(!(file instanceof File)||!documentType)return;
      const allowed=new Map([
        ["application/pdf","pdf"],
        ["image/jpeg","jpg"],
        ["image/png","png"],
        ["image/webp","webp"]
      ]);
      if(!allowed.has(file.type))return setMessage("نوع الملف غير مدعوم. استخدم PDF أو JPG أو PNG أو WEBP.","error");
      if(file.size>10*1024*1024)return setMessage("حجم الملف يتجاوز 10 ميجابايت.","error");
      const button=form.querySelector("button[type='submit']");
      button.disabled=true;
      button.textContent="جاري الرفع الآمن…";
      const objectId=crypto.randomUUID();
      const storagePath=`${session.user.id}/${objectId}/document.${allowed.get(file.type)}`;
      const upload=await client.storage.from("hb-private-documents").upload(storagePath,file,{contentType:file.type,upsert:false});
      if(upload.error){
        button.disabled=false; button.textContent="رفع إلى الخزنة الخاصة";
        return setMessage("تعذر رفع الملف إلى الخزنة الخاصة.","error");
      }
      const registered=await client.rpc("hb_register_document",{
        p_document_type:documentType,
        p_storage_path:storagePath,
        p_original_filename:file.name,
        p_size_bytes:file.size,
        p_mime_type:file.type,
        p_case_id:null,
        p_organization_id:null,
        p_expires_at:expiresAt
      });
      if(registered.error){
        await client.storage.from("hb-private-documents").remove([storagePath]);
        button.disabled=false; button.textContent="رفع إلى الخزنة الخاصة";
        return setMessage("تم إلغاء الرفع لأن تسجيل المستند لم يكتمل بأمان.","error");
      }
      await client.from("hb_consents").insert({
        user_id:session.user.id,
        grantee_type:"agent",
        grantee_ref:"document-intelligence",
        purpose:"document_storage_and_transaction_preparation",
        scopes:["document:store","document:analyze"]
      });
      button.disabled=false;
      button.textContent="رفع إلى الخزنة الخاصة";
      form.reset();
      form.hidden=true;
      setMessage("تم حفظ المستند في خزنتك الخاصة. لا يتم إرساله إلى جهة خارجية تلقائيًا.","success");
      await loadDocuments();
    });
  }

  async function boot() {
    if (location.pathname !== "/os/") return;
    const {data}=await client.auth.getSession();
    if(!data.session){
      location.replace(`/auth/?return=${encodeURIComponent("/os/")}`);
      return;
    }
    if(!window.HB_OS_API || !await window.HB_OS_API.health()){
      const main=document.querySelector("main");
      if(main){
        main.replaceChildren();
        const section=document.createElement("section");
        section.className="hb-os-hero";
        const kicker=document.createElement("span");
        kicker.className="eyebrow";
        kicker.textContent="HOSSAM BAHR OS";
        const title=document.createElement("h1");
        title.textContent="مركز التشغيل قيد التفعيل.";
        const p=document.createElement("p");
        p.textContent="الخدمات الحالية للمنصة مستمرة بشكل طبيعي. سيظهر مركز التشغيل تلقائيًا بعد اكتمال تفعيل البنية الخلفية الآمنة.";
        const link=document.createElement("a");
        link.href="/services/";
        link.className="save-service-action";
        link.textContent="العودة إلى الخدمات";
        section.append(kicker,title,p,link);
        main.append(section);
      }
      return;
    }
    await setupGoal(data.session);
    await setupOrganization(data.session);
    await setupDocumentUpload(data.session);
    const cases=await loadCases();
    await Promise.all([loadOrganizations(),loadAttention(cases),loadObligations(),loadDocuments()]);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();