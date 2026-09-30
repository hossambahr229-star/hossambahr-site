(() => {
  "use strict";
  const client = window.HB_AUTH;
  if (!client) return;
  const countryPackNameById=new Map();

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

  const healthLabel=(level)=>({
    stable:"مستقر",
    attention:"يحتاج انتباه",
    critical:"حرج"
  })[level] || level;

  function buildOrganizationTwin(item) {
    const twin=item.twin || {};
    const org=twin.organization || {};
    const health=twin.health || {};
    const counts=twin.counts || {};
    const card=document.createElement("article");
    card.className="hb-org-twin";

    const head=document.createElement("div");
    head.className="hb-org-twin-head";
    const titleWrap=document.createElement("div");
    const title=document.createElement("strong");
    title.textContent=org.trade_name || org.legal_name || "شركة";
    const legal=document.createElement("small");
    legal.textContent=[org.legal_name,org.registration_number ? "رقم "+org.registration_number : ""].filter(Boolean).join(" • ");
    titleWrap.append(title,legal);

    const score=document.createElement("span");
    score.className=`hb-org-health hb-org-health--${health.level || "stable"}`;
    score.textContent=`${Number(health.score ?? 100)}% • ${healthLabel(health.level || "stable")}`;
    head.append(titleWrap,score);

    const stats=document.createElement("div");
    stats.className="hb-org-twin-stats";
    const statPairs=[
      ["حالات مفتوحة",counts.open_cases||0],
      ["التزامات",counts.open_obligations||0],
      ["مستندات",counts.documents||0],
      ["رخص مرتبطة",counts.licenses||0],
      ["موظفون",counts.employees||0],
      ["إقامات",counts.residencies||0]
    ];
    for(const [label,value] of statPairs){
      const box=document.createElement("span");
      box.innerHTML=`<b>${Number(value||0)}</b><small>${label}</small>`;
      stats.append(box);
    }

    const details=document.createElement("details");
    details.className="hb-org-twin-details";
    const summary=document.createElement("summary");
    summary.textContent="عرض Digital Twin";

    const note=document.createElement("p");
    note.className="hb-org-health-note";
    note.textContent=health.note || "مؤشر تشغيلي داخلي.";

    const obligations=document.createElement("div");
    obligations.className="hb-org-twin-section";
    const obTitle=document.createElement("h4");
    obTitle.textContent="الاستحقاقات القادمة";
    obligations.append(obTitle);
    const obs=Array.isArray(twin.upcoming_obligations)?twin.upcoming_obligations:[];
    if(!obs.length){
      const p=document.createElement("p"); p.textContent="لا توجد استحقاقات مفتوحة."; obligations.append(p);
    } else {
      for(const ob of obs.slice(0,5)){
        const row=document.createElement("p");
        row.textContent=`${ob.title} • ${date(ob.due_at)}`;
        obligations.append(row);
      }
    }

    const docs=document.createElement("div");
    docs.className="hb-org-twin-section";
    const docsTitle=document.createElement("h4");
    docsTitle.textContent="المستندات";
    docs.append(docsTitle);
    const docRows=Array.isArray(twin.documents)?twin.documents:[];
    if(!docRows.length){
      const p=document.createElement("p"); p.textContent="لا توجد مستندات مرتبطة بالشركة بعد."; docs.append(p);
    } else {
      for(const d of docRows.slice(0,6)){
        const row=document.createElement("p");
        row.textContent=`${d.name || d.type}${d.expires_at ? " • انتهاء "+date(d.expires_at) : ""}`;
        docs.append(row);
      }
    }

    const cases=document.createElement("div");
    cases.className="hb-org-twin-section";
    const casesTitle=document.createElement("h4");
    casesTitle.textContent="المعاملات";
    cases.append(casesTitle);
    const caseRows=Array.isArray(twin.cases)?twin.cases:[];
    if(!caseRows.length){
      const p=document.createElement("p"); p.textContent="لا توجد معاملات مرتبطة بالشركة."; cases.append(p);
    } else {
      for(const c of caseRows.slice(0,6)){
        const row=document.createElement("p");
        row.textContent=`${c.title} • ${caseStatusLabel(c.status)} • ${Number(c.readiness_percent||0)}%`;
        cases.append(row);
      }
    }

    details.append(summary,note,obligations,docs,cases);
    card.append(head,stats,details);
    return card;
  }

  async function loadOrganizations() {
    const target = $("[data-os-organizations]");
    const { data, error } = await client.rpc("hb_my_organization_twins",{p_limit:20});
    if (error) { target.innerHTML = "<p>تعذر تحميل الشركات.</p>"; return []; }
    const rows=data || [];
    target.replaceChildren(...(rows.length ? rows.map(buildOrganizationTwin) : [article("لا توجد شركة مضافة بعد","يمكنك إضافة أول كيان تجاري من هنا.")]));
    syncDocumentOrganizationOptions(rows);
    return rows;
  }

  async function loadJurisdictions() {
    const selects=[...document.querySelectorAll("[data-jurisdiction-select]")];
    if(!selects.length)return;
    const {data,error}=await client.from("hb_jurisdictions")
      .select("id,name_ar,code")
      .eq("active",true)
      .eq("level","emirate")
      .order("code",{ascending:true});
    if(error)return;
    for(const select of selects){
      const current=select.value;
      select.replaceChildren(new Option("اختر الإمارة",""),...(data||[]).map((item)=>new Option(item.name_ar,item.id)));
      select.value=current;
    }
  }

  function syncDocumentOrganizationOptions(rows=[]) {
    const select=$("[data-document-organization]");
    if(!select)return;
    const current=select.value;
    const options=[new Option("بدون شركة","")];
    for(const item of rows){
      const org=item.twin?.organization || {};
      options.push(new Option(org.trade_name || org.legal_name || "شركة",item.organization_id));
    }
    select.replaceChildren(...options);
    select.value=current;
  }

  function syncDocumentCaseOptions(cases=[]) {
    const select=$("[data-document-case]");
    if(!select)return;
    const current=select.value;
    const options=[new Option("بدون معاملة","")];
    for(const item of cases){
      options.push(new Option(item.title,item.id));
    }
    select.replaceChildren(...options);
    select.value=current;
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
  const taskStatusLabel = (status) => ({
    todo:"لم تبدأ",
    in_progress:"قيد العمل",
    waiting:"بانتظار خطوة أخرى",
    needs_approval:"تحتاج موافقة",
    done:"مكتملة",
    cancelled:"ملغاة"
  })[status] || status;

  const caseEventLabel = (eventType) => ({
    "case.created":"تم إنشاء المعاملة",
    "case.task_submitted":"تم إرسال متطلب للمراجعة",
    "case.approval_decided":"تم تسجيل قرار الموافقة",
    "task.human_review_completed":"اكتملت مراجعة داخلية",
    "external_execution.recorded":"تم توثيق تنفيذ خارجي",
    "workflow.compiled":"تم تجهيز مسار التنفيذ"
  })[eventType] || "تم تحديث المعاملة";

  const actorLabel = (actorType) => ({
    user:"أنت",
    staff:"فريق التشغيل",
    agent:"المنصة الذكية",
    system:"النظام",
    integration:"تكامل خارجي",
    partner:"شريك تنفيذ"
  })[actorType] || "النظام";

  function nextExecutableTask(tasks = []) {
    const done = new Set(tasks.filter((task)=>task.status==="done").map((task)=>task.id));
    const ready=tasks.filter((task)=>{
      if(!taskStatusOpen.has(task.status)) return false;
      const deps=Array.isArray(task.dependency_ids)?task.dependency_ids:[];
      return deps.every((id)=>done.has(id));
    });
    const needsApproval=(task)=>task.requires_approval && !task.metadata?.approval_granted_at;
    return ready.find((task)=>task.assignee_type==="user" || needsApproval(task))
      || ready.find((task)=>task.status==="in_progress")
      || ready.find((task)=>task.status==="waiting")
      || ready[0]
      || tasks.find((task)=>taskStatusOpen.has(task.status))
      || null;
  }

  function appendTaskAction(card,item,next) {
    if(!next || !window.HB_OS_API) return;
    const approvalPending=next.requires_approval && !next.metadata?.approval_granted_at;
    const userRequirement=next.assignee_type==="user" && !next.requires_approval && ["todo","in_progress"].includes(next.status);
    if(!approvalPending && !userRequirement) return;

    const actions=document.createElement("div");
    actions.className="hb-case-actions";

    if(approvalPending){
      const approve=document.createElement("button");
      approve.type="button";
      approve.className="hb-case-action";
      approve.textContent="اعتماد الخطوة";
      approve.addEventListener("click",async()=>{
        const accepted=window.confirm(`سيتم تسجيل موافقتك على الخطوة: ${next.title}. هذه الموافقة لا ترسل أي طلب حكومي تلقائيًا. هل تعتمد؟`);
        if(!accepted)return;
        approve.disabled=true;
        reject.disabled=true;
        approve.textContent="جارٍ الحفظ…";
        try{
          await window.HB_OS_API.decideApproval(next.id,"approve");
          setMessage("تم تسجيل الموافقة بأمان.","success");
          const refreshed=await loadCases();
          await loadAttention();
        }catch{
          setMessage("تعذر تسجيل الموافقة الآن. لم يتم تنفيذ أي إجراء خارجي.","error");
          approve.disabled=false;
          reject.disabled=false;
          approve.textContent="اعتماد الخطوة";
        }
      });

      const reject=document.createElement("button");
      reject.type="button";
      reject.className="hb-case-action hb-case-action--danger";
      reject.textContent="رفض";
      reject.addEventListener("click",async()=>{
        const accepted=window.confirm(`سيتم رفض الخطوة: ${next.title} وستتوقف الحالة إلى أن تُراجع. هل تريد المتابعة؟`);
        if(!accepted)return;
        approve.disabled=true;
        reject.disabled=true;
        reject.textContent="جارٍ الحفظ…";
        try{
          await window.HB_OS_API.decideApproval(next.id,"reject");
          setMessage("تم تسجيل الرفض وإيقاف المسار عند هذه النقطة.","success");
          const refreshed=await loadCases();
          await loadAttention();
        }catch{
          setMessage("تعذر تسجيل الرفض الآن.","error");
          approve.disabled=false;
          reject.disabled=false;
          reject.textContent="رفض";
        }
      });
      actions.append(approve,reject);
    }else if(userRequirement){
      const button=document.createElement("button");
      button.type="button";
      button.className="hb-case-action";
      button.textContent="إرسال للمراجعة";
      button.addEventListener("click",async()=>{
        button.disabled=true;
        button.textContent="جارٍ الحفظ…";
        try{
          await window.HB_OS_API.submitTask(next.id);
          setMessage("تم إرسال المتطلب للمراجعة.","success");
          const refreshed=await loadCases();
          await loadAttention();
        }catch{
          setMessage("تعذر تحديث الخطوة الآن.","error");
          button.disabled=false;
          button.textContent="إرسال للمراجعة";
        }
      });
      actions.append(button);
    }
    card.append(actions);
  }

  function buildCasePlan(tasks=[]) {
    const details=document.createElement("details");
    details.className="hb-case-plan";
    const summary=document.createElement("summary");
    summary.textContent=`عرض خطة التنفيذ (${tasks.length} خطوة)`;
    const list=document.createElement("ol");
    list.className="hb-case-task-list";
    for(const task of tasks){
      const li=document.createElement("li");
      li.className=`hb-case-task hb-case-task--${task.status}`;
      const row=document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=task.title;
      const state=document.createElement("span");
      state.textContent=taskStatusLabel(task.status);
      row.append(title,state);
      const meta=document.createElement("small");
      const who=task.assignee_type==="user" ? "عليك"
        : task.assignee_type==="agent" ? "مراجعة المنصة"
        : task.assignee_type==="integration" ? "تنفيذ خارجي"
        : task.assignee_type==="system" ? "النظام"
        : "فريق التشغيل";
      meta.textContent=who+(task.requires_approval ? " • موافقة صريحة مطلوبة" : "");
      li.append(row,meta);
      const official=task.metadata?.officialUrl || task.metadata?.source;
      if(official && /^https:\/\//i.test(official)){
        const link=document.createElement("a");
        link.href=official;
        link.target="_blank";
        link.rel="noopener";
        link.textContent="المصدر الرسمي";
        li.append(link);
      }
      list.append(li);
    }
    details.append(summary,list);
    return details;
  }

  function buildCaseTimeline(events=[]) {
    const details=document.createElement("details");
    details.className="hb-case-timeline";
    const summary=document.createElement("summary");
    summary.textContent=`سجل المعاملة (${events.length})`;
    const list=document.createElement("ol");
    list.className="hb-case-event-list";
    if(!events.length){
      const empty=document.createElement("li");
      empty.textContent="لا توجد أحداث مسجلة بعد.";
      list.append(empty);
    }else{
      for(const event of events.slice(0,20)){
        const li=document.createElement("li");
        const title=document.createElement("strong");
        title.textContent=caseEventLabel(event.event_type);
        const meta=document.createElement("small");
        meta.textContent=`${actorLabel(event.actor_type)} • ${date(event.occurred_at)}`;
        li.append(title,meta);
        list.append(li);
      }
    }
    details.append(summary,list);
    return details;
  }

  function buildCaseAI(run) {
    const details=document.createElement("details");
    details.className="hb-case-ai";
    const summary=document.createElement("summary");
    summary.textContent="تحليل HOSSAM BAHR AI";
    const body=document.createElement("div");
    body.className="hb-case-ai-body";
    const result=run?.output_summary?.result || null;

    if(run?.status==="failed"){
      const p=document.createElement("p");
      p.textContent="تعذر إكمال التحليل الذكي لهذه الحالة حاليًا. لم يتم تنفيذ أي إجراء خارجي.";
      body.append(p);
    }else if(!result){
      const p=document.createElement("p");
      p.textContent="يجري تجهيز التحليل الذكي للحالة.";
      body.append(p);
    }else{
      const intro=document.createElement("p");
      intro.textContent=result.summary_ar || "تم تحليل الهدف وتجهيز مسار أولي.";
      body.append(intro);

      if(result.detected_intent){
        const intent=document.createElement("p");
        intent.innerHTML="<b>فهم الطلب:</b> ";
        intent.append(document.createTextNode(result.detected_intent));
        body.append(intent);
      }

      const addList=(label,items)=>{
        if(!Array.isArray(items)||!items.length)return;
        const section=document.createElement("div");
        const heading=document.createElement("b");
        heading.textContent=label;
        const list=document.createElement("ul");
        for(const item of items.slice(0,6)){
          const li=document.createElement("li");
          li.textContent=String(item);
          list.append(li);
        }
        section.append(heading,list);
        body.append(section);
      };
      addList("الخطوات المقترحة",result.recommended_next_steps);
      addList("معلومات نحتاجها",result.missing_information);
      addList("نقاط تحتاج انتباهًا",result.risk_flags);

      const note=document.createElement("small");
      note.textContent=result.needs_human_review
        ? "هذه قراءة مساعدة وتحتاج مراجعة بشرية/مصدرية قبل اعتماد أي معلومة تنظيمية أو إجراء حساس."
        : "تحليل تمهيدي للمساعدة في تجهيز الحالة؛ لا ينفذ مدفوعات أو توقيعًا أو إرسالًا حكوميًا تلقائيًا.";
      body.append(note);
    }
    details.append(summary,body);
    return details;
  }

  function buildCaseCard(item,tasks=[],events=[],aiRun=null) {
    const card=document.createElement("article");
    card.className="hb-case-card";
    card.id=`case-${item.id}`;
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
    const countryName=item.country_pack_id ? countryPackNameById.get(item.country_pack_id) : "";
    const progressText=total ? `${completed} من ${total} خطوات مكتملة • ${percent}%` : `جاهزية ${percent}%`;
    meta.textContent=countryName ? `${countryName} • ${progressText}` : progressText;

    const next=nextExecutableTask(tasks);
    const nextLine=document.createElement("p");
    nextLine.className="hb-case-next";
    if(next){
      const approvalPending=next.requires_approval && !next.metadata?.approval_granted_at;
      const prefix=approvalPending ? "اعتماد مطلوب: "
        : next.assignee_type==="user" ? "مطلوب منك: "
        : next.assignee_type==="agent" && next.status==="waiting" ? "قيد المراجعة: "
        : next.assignee_type==="integration" && next.status==="waiting" ? "بانتظار التنفيذ الخارجي: "
        : next.assignee_type==="agent" ? "المنصة تعالج: "
        : "الخطوة التالية: ";
      nextLine.textContent=prefix+next.title;
    }else{
      nextLine.textContent=total && completed===total ? "اكتملت جميع خطوات المسار." : "سيتم تحديد الخطوة التالية تلقائيًا.";
    }
    card.append(heading,progress,meta,nextLine);
    if(aiRun)card.append(buildCaseAI(aiRun));
    if(tasks.length)card.append(buildCasePlan(tasks));
    card.append(buildCaseTimeline(events));
    appendTaskAction(card,item,next);
    return card;
  }

  async function loadCases() {
    const target = $("[data-os-cases]");
    const { data, error } = await client.from("hb_cases")
      .select("id,title,status,priority,readiness_percent,created_at,organization_id,service_slug,country_pack_id")
      .not("status","in",'("completed","cancelled")')
      .order("created_at",{ascending:false})
      .limit(20);
    if (error) { target.innerHTML = "<p>تعذر تحميل الحالات.</p>"; return []; }
    if(!data.length){
      target.replaceChildren(article("لا توجد حالات مفتوحة","اكتب هدفك بالأعلى أو ابدأ من أي خدمة."));
      return [];
    }

    const ids=data.map((item)=>item.id);
    const [taskResult,eventResult,aiResult]=await Promise.all([
      client.from("hb_case_tasks")
        .select("id,case_id,title,status,assignee_type,requires_approval,dependency_ids,due_at,created_at,metadata")
        .in("case_id",ids)
        .order("created_at",{ascending:true}),
      client.from("hb_case_events")
        .select("id,case_id,event_type,actor_type,occurred_at")
        .in("case_id",ids)
        .order("occurred_at",{ascending:false})
        .limit(200),
      client.from("hb_agent_runs")
        .select("id,case_id,status,confidence,output_summary,created_at,completed_at")
        .in("case_id",ids)
        .order("created_at",{ascending:false})
        .limit(100)
    ]);

    const byCase=new Map(ids.map((id)=>[id,[]]));
    if(!taskResult.error){
      for(const task of taskResult.data||[]){
        if(!byCase.has(task.case_id))byCase.set(task.case_id,[]);
        byCase.get(task.case_id).push(task);
      }
    }

    const eventsByCase=new Map(ids.map((id)=>[id,[]]));
    if(!eventResult.error){
      for(const event of eventResult.data||[]){
        if(!eventsByCase.has(event.case_id))eventsByCase.set(event.case_id,[]);
        eventsByCase.get(event.case_id).push(event);
      }
    }

    const latestAIByCase=new Map();
    if(!aiResult.error){
      for(const run of aiResult.data||[]){
        if(run.case_id && !latestAIByCase.has(run.case_id)) latestAIByCase.set(run.case_id,run);
      }
    }

    const enriched=data.map((item)=>({
      ...item,
      _tasks:byCase.get(item.id)||[],
      _events:eventsByCase.get(item.id)||[],
      _ai:latestAIByCase.get(item.id)||null
    }));
    target.replaceChildren(...enriched.map((item)=>buildCaseCard(item,item._tasks,item._events,item._ai)));
    syncDocumentCaseOptions(enriched);
    return enriched;
  }

  const inboxPriorityLabel=(priority)=>({
    urgent:"عاجل",
    high:"مرتفع",
    normal:"عادي",
    low:"منخفض"
  })[priority] || priority;

  function inboxDestination(item) {
    if(["owner_internal_review","owner_external_execution"].includes(item.action_key)){
      return {type:"link",href:"/owner/",label:"فتح لوحة التشغيل"};
    }
    if(item.action_key==="obligation"){
      return {type:"scroll",selector:"[data-os-obligations]",label:"عرض الاستحقاقات"};
    }
    if(item.case_id){
      return {type:"scroll",selector:`#case-${item.case_id}`,label:"فتح المعاملة"};
    }
    if(item.action_key==="notification"){
      return {type:"read",label:"تم الاطلاع"};
    }
    return null;
  }

  function buildInboxItem(item) {
    const card=document.createElement("article");
    card.className=`hb-inbox-item hb-inbox-item--${item.priority || "normal"}`;

    const top=document.createElement("div");
    top.className="hb-inbox-item-top";
    const copy=document.createElement("div");
    const title=document.createElement("strong");
    title.textContent=item.title;
    const summary=document.createElement("p");
    summary.textContent=item.summary || "يحتاج انتباهك";
    copy.append(title,summary);

    const badge=document.createElement("span");
    badge.className="hb-inbox-priority";
    badge.textContent=inboxPriorityLabel(item.priority || "normal");
    top.append(copy,badge);
    card.append(top);

    const meta=document.createElement("small");
    meta.textContent=item.due_at ? `الموعد: ${date(item.due_at)}` : "بدون موعد محدد";
    card.append(meta);

    const destination=inboxDestination(item);
    if(destination){
      if(destination.type==="link"){
        const link=document.createElement("a");
        link.href=destination.href;
        link.className="hb-inbox-action";
        link.textContent=destination.label;
        card.append(link);
      }else{
        const button=document.createElement("button");
        button.type="button";
        button.className="hb-inbox-action";
        button.textContent=destination.label;
        button.addEventListener("click",async()=>{
          if(destination.type==="scroll"){
            const node=document.querySelector(destination.selector);
            node?.scrollIntoView({behavior:"smooth",block:"start"});
            if(node && node.matches(".hb-case-card")){
              node.classList.add("hb-case-card--focus");
              setTimeout(()=>node.classList.remove("hb-case-card--focus"),1800);
            }
            return;
          }
          if(destination.type==="read"){
            button.disabled=true;
            const {error}=await client.from("hb_notifications")
              .update({status:"read"})
              .eq("id",item.item_id);
            if(error){
              button.disabled=false;
              setMessage("تعذر تحديث التنبيه الآن.","error");
              return;
            }
            await loadAttention();
          }
        });
        card.append(button);
      }
    }
    return card;
  }

  async function loadAttention() {
    const target = $("[data-os-attention]");
    const {data,error}=await client.rpc("hb_my_action_inbox",{p_limit:50});
    if(error){
      target.replaceChildren(article("تعذر تحميل Action Inbox","ستظل معاملاتك وبقية الأقسام متاحة بشكل طبيعي."));
      return [];
    }
    const rows=data||[];
    target.replaceChildren(...(rows.length ? rows.map(buildInboxItem) : [
      article("لا يوجد إجراء يحتاج تدخلك الآن","سيظهر هنا كل ما يحتاج موافقتك أو انتباهك بترتيب الأولوية.")
    ]));
    return rows;
  }

  async function loadObligations() {
    const target = $("[data-os-obligations]");
    const now = new Date().toISOString();
    const end = new Date(Date.now()+60*24*60*60*1000).toISOString();
    const { data, error } = await client.from("hb_obligations")
      .select("id,title,due_at,obligation_type,status")
      .eq("status","open")
      .lte("due_at",end)
      .order("due_at",{ascending:true})
      .limit(30);
    if (error) { target.innerHTML="<p>تعذر تحميل الاستحقاقات.</p>"; return; }
    const rows=data||[];
    if(!rows.length){
      target.replaceChildren(article("لا توجد استحقاقات مفتوحة","ستظهر التجديدات والمواعيد المهمة هنا."));
      return;
    }
    target.replaceChildren(...rows.map((item)=>{
      const overdue=item.due_at && item.due_at < now;
      return article(
        overdue ? `متأخر: ${item.title}` : item.title,
        overdue ? `كان مستحقًا: ${date(item.due_at)}` : `الاستحقاق: ${date(item.due_at)}`
      );
    }));
  }

  function renderGoalSelection(candidate) {
    const hidden=$("[data-os-selected-service]");
    const selected=$("[data-os-goal-selection]");
    if(!hidden || !selected) return;
    hidden.value=candidate?.service_slug || "";
    if(!candidate){
      selected.hidden=true;
      selected.replaceChildren();
      return;
    }
    const text=document.createElement("span");
    text.textContent=`المسار المختار: ${candidate.service_name}${candidate.emirate ? " • "+candidate.emirate : ""}`;
    const clear=document.createElement("button");
    clear.type="button";
    clear.className="hb-os-goal-clear";
    clear.textContent="تغيير";
    clear.addEventListener("click",()=>{
      renderGoalSelection(null);
      const area=$("[data-os-goal-suggestions]");
      if(area)area.hidden=false;
    });
    selected.replaceChildren(text,clear);
    selected.hidden=false;
    const suggestions=$("[data-os-goal-suggestions]");
    if(suggestions)suggestions.hidden=true;
  }

  function renderGoalSuggestions(rows=[]) {
    const target=$("[data-os-goal-suggestions]");
    if(!target)return;
    if(!rows.length){
      target.hidden=true;
      target.replaceChildren();
      return;
    }
    const hint=document.createElement("p");
    hint.className="hb-os-goal-hint";
    hint.textContent="هل تقصد إحدى هذه الخدمات؟ اخترها لفتح المسار الموثق، أو اتركها بدون اختيار لبدء مسار عام.";
    const nodes=rows.map((candidate)=>{
      const button=document.createElement("button");
      button.type="button";
      button.className="hb-os-service-suggestion";
      const copy=document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=candidate.service_name;
      const meta=document.createElement("small");
      meta.textContent=[candidate.service_type,candidate.emirate,candidate.authority_key].filter(Boolean).join(" • ");
      copy.append(title,meta);
      const badge=document.createElement("span");
      badge.textContent=candidate.emirate || "خدمة موثقة";
      button.append(copy,badge);
      button.addEventListener("click",()=>renderGoalSelection(candidate));
      return button;
    });
    target.replaceChildren(hint,...nodes);
    target.hidden=false;
  }

  function setupGoalResolver() {
    const textarea=$("#os-goal");
    if(!textarea)return;
    let timer=null;
    let requestSeq=0;
    textarea.addEventListener("input",()=>{
      renderGoalSelection(null);
      const value=textarea.value.trim();
      clearTimeout(timer);
      if(value.length<4){
        renderGoalSuggestions([]);
        return;
      }
      const seq=++requestSeq;
      timer=setTimeout(async()=>{
        const {data,error}=await client.rpc("hb_resolve_service_candidates",{p_query:value,p_limit:5});
        if(seq!==requestSeq)return;
        if(error){
          renderGoalSuggestions([]);
          return;
        }
        renderGoalSuggestions(data||[]);
      },320);
    });
  }

  async function loadCountryPacks() {
    const select=$("[data-os-country-pack]");
    if(!select)return [];
    const {data,error}=await client.rpc("hb_active_country_packs");
    if(error || !Array.isArray(data) || !data.length){
      select.replaceChildren(new Option("لا توجد دولة مفعّلة حاليًا",""));
      select.disabled=true;
      return [];
    }
    countryPackNameById.clear();
    const options=data.map((pack)=>{
      const label=pack.name_ar || pack.name_en || pack.country_code || pack.pack_key;
      if(pack.pack_id)countryPackNameById.set(pack.pack_id,label);
      return new Option(label,pack.pack_key);
    });
    select.replaceChildren(...options);
    if(data.length===1)select.value=data[0].pack_key;
    select.disabled=false;
    return data;
  }

  async function setupGoal(session) {
    const form = $("[data-os-goal-form]");
    form?.addEventListener("submit", async (event)=>{
      event.preventDefault();
      const formData=new FormData(form);
      const goal = String(formData.get("goal") || "").trim();
      const serviceSlug=String(formData.get("service_slug") || "").trim() || null;
      const countryPackKey=String(formData.get("country_pack_key") || "").trim() || null;
      if (!goal) return;
      const button=form.querySelector("button");
      button.disabled=true;
      button.textContent="جاري إنشاء الحالة…";
      let createError=null;
      try {
        if(!window.HB_OS_API)throw new Error("Global OS API unavailable");
        await window.HB_OS_API.createCase({title:goal.slice(0,180),goal,service_slug:serviceSlug,country_pack_key:countryPackKey});
      } catch (error) {
        createError=error;
      }
      button.disabled=false;
      button.textContent="ابدأ الحالة";
      if (createError) return setMessage("تعذر إنشاء الحالة الآن. تأكد من تفعيل Global OS API.","error");
      form.reset();
      renderGoalSelection(null);
      renderGoalSuggestions([]);
      setMessage(serviceSlug ? "تم إنشاء الحالة وربطها بالمسار الموثق، وبدأ HOSSAM BAHR AI تحليلها." : "تم إنشاء الحالة في مسار عام آمن، وبدأ HOSSAM BAHR AI تحليلها.","success");
      const cases=await loadCases();
      setTimeout(()=>loadCases(),3000);
      setTimeout(()=>loadCases(),8000);
      await loadAttention();
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
      const jurisdictionId=String(fd.get("jurisdiction_id")||"").trim()||null;
      const registrationNumber=String(fd.get("registration_number")||"").trim()||null;
      if(!legal)return;
      const button=form.querySelector("button");
      button.disabled=true;
      const {error}=await client.from("hb_organizations").insert({
        owner_user_id:session.user.id,
        legal_name:legal,
        trade_name:trade||null,
        jurisdiction_id:jurisdictionId,
        registration_number:registrationNumber
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
      const organizationId=String(fd.get("organization_id")||"").trim()||null;
      const caseId=String(fd.get("case_id")||"").trim()||null;
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
        p_case_id:caseId,
        p_organization_id:organizationId,
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

  const HANDOFF_KEY="hb-public-ai-handoff-v1";
  function readPublicHandoff(){
    try{
      const raw=sessionStorage.getItem(HANDOFF_KEY)||localStorage.getItem(HANDOFF_KEY);
      if(!raw)return null;
      const value=JSON.parse(raw);
      if(!value?.goal||!value?.expires_at||Date.now()>Number(value.expires_at)){
        sessionStorage.removeItem(HANDOFF_KEY);localStorage.removeItem(HANDOFF_KEY);return null;
      }
      return value;
    }catch{return null;}
  }
  function clearPublicHandoff(){
    try{sessionStorage.removeItem(HANDOFF_KEY);}catch{}
    try{localStorage.removeItem(HANDOFF_KEY);}catch{}
  }
  async function consumePublicHandoff(session){
    const params=new URLSearchParams(location.search);
    if(params.get("handoff")!=="1")return;
    const handoff=readPublicHandoff();
    const goal=$("#os-goal");
    const service=$("[data-os-selected-service]");
    if(handoff?.goal&&goal)goal.value=handoff.goal;
    if(handoff?.service_slug&&service)service.value=handoff.service_slug;
    if(params.get("start")!=="1"||!handoff?.goal)return;
    const marker="hb-handoff-consumed:"+handoff.id;
    try{if(sessionStorage.getItem(marker)==="1")return;}catch{}
    try{
      if(!window.HB_OS_API)throw new Error("Global OS API unavailable");
      await window.HB_OS_API.createCase({
        title:handoff.goal.slice(0,180),
        goal:handoff.goal,
        service_slug:handoff.service_slug||null,
        country_pack_key:"country:AE"
      });
      try{sessionStorage.setItem(marker,"1");}catch{}
      clearPublicHandoff();
      history.replaceState(null,"","/os/#case-progress");
      setMessage("تم حفظ خطتك وبدء المعاملة من نفس الهدف الذي حللته قبل تسجيل الدخول.","success");
    }catch{
      setMessage("تم الاحتفاظ بهدفك، لكن تعذر إنشاء المعاملة الآن. يمكنك المحاولة من زر «ابدأ الحالة».","error");
    }
  }

  async function boot() {
    if (location.pathname !== "/os/") return;
    const {data}=await client.auth.getSession();
    if(!data.session){
      location.replace(`/auth/?return=${encodeURIComponent(location.pathname + location.search + location.hash)}`);
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
    await loadCountryPacks();
    setupGoalResolver();
    await loadJurisdictions();
    await setupGoal(data.session);
    await consumePublicHandoff(data.session);
    await setupOrganization(data.session);
    await setupDocumentUpload(data.session);
    const cases=await loadCases();
    const organizations=await loadOrganizations();
    syncDocumentOrganizationOptions(organizations);
    syncDocumentCaseOptions(cases);
    await Promise.all([loadAttention(),loadObligations(),loadDocuments()]);
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();