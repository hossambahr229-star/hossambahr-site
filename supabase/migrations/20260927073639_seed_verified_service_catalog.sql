-- Seed the verified public service catalog into Global OS execution metadata.
begin;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل مدرس خصوصي — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/private-tutor-licensing','official',
'2026-08-01T00:00:00Z'::timestamptz,true,'{"service_slug":"mohre-private-tutor-permit","category":"work-employees","official_name":"Private Tutor Licensing","official_card_url":"https://www.mohre.gov.ae/en/services/private-tutor-licensing","execution_url":"https://publicservices.mohre.gov.ae/UserNotifications/MohrePrivateTeacherWorkPermit","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card_and_execution_route"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:mohre-private-tutor-permit',(select id from public.hb_jurisdictions where code='AE'),1,'2026-08-01T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"هوية إماراتية سارية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/private-tutor-licensing"]},{"id":"requirement:2","when":[],"effect":"review","reason":"المؤهل أو إثبات الصفة التعليمية عند الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/private-tutor-licensing"]},{"id":"requirement:3","when":[],"effect":"review","reason":"الموافقات المطلوبة بحسب فئة مقدم الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/private-tutor-licensing"]},{"id":"conditions","when":[],"effect":"review","reason":"يجب اختيار فئة مقدم الطلب الصحيحة وإرفاق الموافقات الخاصة بها.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/private-tutor-licensing"]},{"id":"special-cases","when":[],"effect":"review","reason":"لا تستخدم مسار تصاريح المنشآت لهذه الخدمة؛ لها بوابة تقديم مستقلة.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/private-tutor-licensing"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/private-tutor-licensing' limit 1)],
'service-matrix-review','2026-08-01T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:mohre-private-tutor-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre-private-tutor-permit',1,'active','{"id":"service:mohre-private-tutor-permit","version":1,"name":"تصريح عمل مدرس خصوصي","serviceSlug":"mohre-private-tutor-permit","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"هوية إماراتية سارية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/private-tutor-licensing"}},{"key":"requirement-2","title":"المؤهل أو إثبات الصفة التعليمية عند الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/private-tutor-licensing"}},{"key":"requirement-3","title":"الموافقات المطلوبة بحسب فئة مقدم الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/private-tutor-licensing"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3"],"metadata":{"agent":"quality","conditions":"يجب اختيار فئة مقدم الطلب الصحيحة وإرفاق الموافقات الخاصة بها.","specialCases":"لا تستخدم مسار تصاريح المنشآت لهذه الخدمة؛ لها بوابة تقديم مستقلة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/private-tutor-licensing","executionUrl":"https://publicservices.mohre.gov.ae/UserNotifications/MohrePrivateTeacherWorkPermit"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/private-tutor-licensing","executionUrl":"https://publicservices.mohre.gov.ae/UserNotifications/MohrePrivateTeacherWorkPermit","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-08-01T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('mohre-private-tutor-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:mohre-private-tutor-permit','service:mohre-private-tutor-permit','assisted',true,'{"name":"تصريح عمل مدرس خصوصي","category":"work-employees","emirate":"اتحادي","type":"إصدار تصريح","officialUrl":"https://www.mohre.gov.ae/en/services/private-tutor-licensing","executionUrl":"https://publicservices.mohre.gov.ae/UserNotifications/MohrePrivateTeacherWorkPermit","fees":"راجع بطاقة الخدمة الرسمية قبل الإرسال؛ قد تختلف المتطلبات بحسب فئة مقدم الطلب.","duration":"تحددها الوزارة بعد اكتمال البيانات والموافقات.","lastReviewed":"2026-08-01"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل لمواطني الإمارات ودول مجلس التعاون — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022','official',
'2026-08-01T00:00:00Z'::timestamptz,true,'{"service_slug":"mohre-uae-nationals-gcc-work-permit","category":"work-employees","official_name":"UAE Nationals/GCC Citizens Work Permit","official_card_url":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/75","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card_and_execution_route"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:mohre-uae-nationals-gcc-work-permit',(select id from public.hb_jurisdictions where code='AE'),1,'2026-08-01T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"بيانات العامل والهوية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"بيانات المنشأة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"عرض أو عقد العمل المعتمد","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"يقدم الطلب من المنشأة عبر مسار تصريح العمل المخصص لهذه الفئة.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"اختيار فئة تصريح أخرى يغيّر المتطلبات وقد يوقف الطلب.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022' limit 1)],
'service-matrix-review','2026-08-01T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:mohre-uae-nationals-gcc-work-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre-uae-nationals-gcc-work-permit',1,'active','{"id":"service:mohre-uae-nationals-gcc-work-permit","version":1,"name":"تصريح عمل لمواطني الإمارات ودول مجلس التعاون","serviceSlug":"mohre-uae-nationals-gcc-work-permit","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"بيانات العامل والهوية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"}},{"key":"requirement-2","title":"بيانات المنشأة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"}},{"key":"requirement-3","title":"عرض أو عقد العمل المعتمد","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3"],"metadata":{"agent":"quality","conditions":"يقدم الطلب من المنشأة عبر مسار تصريح العمل المخصص لهذه الفئة.","specialCases":"اختيار فئة تصريح أخرى يغيّر المتطلبات وقد يوقف الطلب."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/75"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/75","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-08-01T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('mohre-uae-nationals-gcc-work-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:mohre-uae-nationals-gcc-work-permit','service:mohre-uae-nationals-gcc-work-permit','assisted',true,'{"name":"تصريح عمل لمواطني الإمارات ودول مجلس التعاون","category":"work-employees","emirate":"اتحادي","type":"إصدار تصريح","officialUrl":"https://www.mohre.gov.ae/en/services/uae-nationalsgcc-citizens-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/75","fees":"تعرض الوزارة الرسوم في بطاقة الخدمة وقبل السداد.","duration":"تحددها الوزارة بعد اكتمال الطلب.","lastReviewed":"2026-08-01"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل لتدريب مواطن إماراتي — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022','official',
'2026-08-01T00:00:00Z'::timestamptz,true,'{"service_slug":"mohre-uae-national-trainee-work-permit","category":"work-employees","official_name":"Work Permit for UAE National Trainees","official_card_url":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card_and_execution_route"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:mohre-uae-national-trainee-work-permit',(select id from public.hb_jurisdictions where code='AE'),1,'2026-08-01T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"هوية المتدرب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"بيانات المنشأة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"برنامج أو اتفاق التدريب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"يجب أن يطابق الطلب غرض التدريب وفئته ولا يستخدم كبديل لتصريح توظيف عادي.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"مسار التنفيذ قد يشترك تقنياً مع تدريب الطلبة؛ يجب اختيار فئة المتدرب المواطن داخل المعاملة.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022' limit 1)],
'service-matrix-review','2026-08-01T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:mohre-uae-national-trainee-work-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre-uae-national-trainee-work-permit',1,'active','{"id":"service:mohre-uae-national-trainee-work-permit","version":1,"name":"تصريح عمل لتدريب مواطن إماراتي","serviceSlug":"mohre-uae-national-trainee-work-permit","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"هوية المتدرب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"}},{"key":"requirement-2","title":"بيانات المنشأة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"}},{"key":"requirement-3","title":"برنامج أو اتفاق التدريب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3"],"metadata":{"agent":"quality","conditions":"يجب أن يطابق الطلب غرض التدريب وفئته ولا يستخدم كبديل لتصريح توظيف عادي.","specialCases":"مسار التنفيذ قد يشترك تقنياً مع تدريب الطلبة؛ يجب اختيار فئة المتدرب المواطن داخل المعاملة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-08-01T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('mohre-uae-national-trainee-work-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:mohre-uae-national-trainee-work-permit','service:mohre-uae-national-trainee-work-permit','assisted',true,'{"name":"تصريح عمل لتدريب مواطن إماراتي","category":"work-employees","emirate":"اتحادي","type":"إصدار تصريح تدريب","officialUrl":"https://www.mohre.gov.ae/en/services/work-permit-for-uae-national-trainees-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232","fees":"تعرض الوزارة الرسوم في بطاقة الخدمة وقبل السداد.","duration":"تحددها الوزارة بعد اكتمال الطلب.","lastReviewed":"2026-08-01"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','نقل تصريح عمل موظف إلى منشأة جديدة — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/transfer-work-permit-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"transfer-work-permit-uae","category":"work-employees","official_name":"Issuance of a New Work Permit - Transfer Work Permit","official_card_url":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:transfer-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"عرض العمل والتوقيعات المطلوبة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"جواز وهوية وإقامة العامل السارية بحسب الحالة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"بيانات المنشأة الجديدة وتصنيفها","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"إلغاء أو أهلية الانتقال من العلاقة السابقة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"تحتاجه المنشأة الجديدة لتشغيل عامل موجود داخل الدولة وفق العلاقة الجديدة، مع فصل واضح بين ملف العمل وملف الإقامة.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"الخلط بين تصريح العمل والإقامة يسبب توقفاً: اعتماد MOHRE لا يعني أن تعديل وضع الإقامة اكتمل.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/transfer-work-permit-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:transfer-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'transfer-work-permit-uae',1,'active','{"id":"service:transfer-work-permit-uae","version":1,"name":"نقل تصريح عمل موظف إلى منشأة جديدة","serviceSlug":"transfer-work-permit-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"عرض العمل والتوقيعات المطلوبة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"}},{"key":"requirement-2","title":"جواز وهوية وإقامة العامل السارية بحسب الحالة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"}},{"key":"requirement-3","title":"بيانات المنشأة الجديدة وتصنيفها","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"}},{"key":"requirement-4","title":"إلغاء أو أهلية الانتقال من العلاقة السابقة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"تحتاجه المنشأة الجديدة لتشغيل عامل موجود داخل الدولة وفق العلاقة الجديدة، مع فصل واضح بين ملف العمل وملف الإقامة.","specialCases":"الخلط بين تصريح العمل والإقامة يسبب توقفاً: اعتماد MOHRE لا يعني أن تعديل وضع الإقامة اكتمل."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('transfer-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:transfer-work-permit-uae','service:transfer-work-permit-uae','assisted',true,'{"name":"نقل تصريح عمل موظف إلى منشأة جديدة","category":"work-employees","emirate":"اتحادي","type":"إصدار تصريح انتقال","officialUrl":"https://www.mohre.gov.ae/en/services/transfer-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309","fees":"تبدأ رسوم الطلب الاتحادية من القيمة المعروضة في بطاقة الوزارة، وتختلف رسوم الإصدار حسب فئة المنشأة.","duration":"تعرض وزارة الموارد البشرية المدة المتوقعة عند اكتمال الطلب؛ وقد يمتد المسار بسبب الإقامة.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار أو تجديد عقد عمل في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"employment-contract-uae","category":"companies-establishments","official_name":"Issuance/Renewal of Employment Contracts","official_card_url":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70","review_result":"approved_for_user_navigation","functional_finding":"exact_official_combined_service"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:employment-contract-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"عرض العمل أو العقد المعتمد","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"وثائق العامل السارية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"بيانات المنشأة والتصريح","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"توقيع الطرفين وأي مؤهل مطلوب للمهنة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"العقد المسجل يثبت شروط العلاقة ويجب أن يتوافق مع التصريح وبيانات المنشأة والعامل.","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"اختلاف المسمى أو الأجر أو رقم الوثيقة بين العرض والعقد والتصريح يؤدي إلى طلب استكمال أو رفض.","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:employment-contract-uae',(select id from public.hb_jurisdictions where code='AE'),'employment-contract-uae',1,'active','{"id":"service:employment-contract-uae","version":1,"name":"إصدار أو تجديد عقد عمل في الإمارات","serviceSlug":"employment-contract-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"عرض العمل أو العقد المعتمد","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"}},{"key":"requirement-2","title":"وثائق العامل السارية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"}},{"key":"requirement-3","title":"بيانات المنشأة والتصريح","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"}},{"key":"requirement-4","title":"توقيع الطرفين وأي مؤهل مطلوب للمهنة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"العقد المسجل يثبت شروط العلاقة ويجب أن يتوافق مع التصريح وبيانات المنشأة والعامل.","specialCases":"اختلاف المسمى أو الأجر أو رقم الوثيقة بين العرض والعقد والتصريح يؤدي إلى طلب استكمال أو رفض."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('employment-contract-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:employment-contract-uae','service:employment-contract-uae','assisted',true,'{"name":"إصدار أو تجديد عقد عمل في الإمارات","category":"companies-establishments","emirate":"اتحادي","type":"إصدار أو تجديد","officialUrl":"https://mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70","fees":"تختلف بحسب نوع التصريح وفئة المنشأة وقناة التقديم كما تعرضها الوزارة.","duration":"تعرضها بطاقة الخدمة الرسمية، وتتأثر بالنواقص والتوقيعات.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إلغاء تصريح وعقد عمل في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"cancel-work-permit-uae","category":"work-employees","official_name":"Cancellation of Work Permits and Employment Contracts","official_card_url":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:cancel-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"بيانات التصريح والعقد","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"طلب الإلغاء وتوقيع الأطراف بحسب الحالة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"إقرار أو إثبات تسوية المستحقات","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"ترتيب الخطوة التالية للإقامة والهوية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"إنهاء العمل دون إلغاء رسمي يترك التصريح والملفات غير مكتملة وقد يعرقل انتقال العامل أو إغلاق المنشأة.","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"إلغاء تصريح العمل لا يلغي الإقامة تلقائياً؛ ترك ملف الهجرة مفتوحاً يسبب مشاكل لاحقة.","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:cancel-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'cancel-work-permit-uae',1,'active','{"id":"service:cancel-work-permit-uae","version":1,"name":"إلغاء تصريح وعقد عمل في الإمارات","serviceSlug":"cancel-work-permit-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"بيانات التصريح والعقد","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"}},{"key":"requirement-2","title":"طلب الإلغاء وتوقيع الأطراف بحسب الحالة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"}},{"key":"requirement-3","title":"إقرار أو إثبات تسوية المستحقات","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"}},{"key":"requirement-4","title":"ترتيب الخطوة التالية للإقامة والهوية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"إنهاء العمل دون إلغاء رسمي يترك التصريح والملفات غير مكتملة وقد يعرقل انتقال العامل أو إغلاق المنشأة.","specialCases":"إلغاء تصريح العمل لا يلغي الإقامة تلقائياً؛ ترك ملف الهجرة مفتوحاً يسبب مشاكل لاحقة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('cancel-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:cancel-work-permit-uae','service:cancel-work-permit-uae','guidance',true,'{"name":"إلغاء تصريح وعقد عمل في الإمارات","category":"work-employees","emirate":"اتحادي","type":"إلغاء","officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-work-permits-and-employment-contracts-2022","executionUrl":null,"fees":"تعرض بطاقة الوزارة الرسوم المطبقة؛ وقد توجد رسوم قناة أو إجراءات مرتبطة.","duration":"تعتمد على اكتمال التسوية والتوقيعات وعدم وجود قيود على الملف.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إلغاء تصريح الإقامة الصادر من دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"cancel-residency-permit-uae","category":"residency-visas","official_name":"Canceling all types of residence permits","official_card_url":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:cancel-residency-permit-uae',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"جواز وبيانات الإقامة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"]},{"id":"requirement:2","when":[],"effect":"review","reason":"طلب الكفيل أو المخول","actions":["collect_or_verify_requirement"],"sourceRefs":["https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"]},{"id":"requirement:3","when":[],"effect":"review","reason":"إلغاء تصريح العمل إذا كانت إقامة موظف","actions":["collect_or_verify_requirement"],"sourceRefs":["https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"]},{"id":"requirement:4","when":[],"effect":"review","reason":"وثائق التابعين أو الالتزامات المرتبطة عند انطباقها","actions":["collect_or_verify_requirement"],"sourceRefs":["https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"]},{"id":"conditions","when":[],"effect":"review","reason":"تغطي خدمة GDRFA الرسمية إلغاء جميع أنواع تصاريح الإقامة الصادرة من دبي. لا تستخدم هذا المسار لإقامة صادرة من ICP في إمارة أخرى.","actions":["review_conditions"],"sourceRefs":["https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"بدء إلغاء إقامة موظف قبل تسوية ملف MOHRE أو استخدام مسار دبي لإقامة صادرة من ICP يعرقل التسلسل الصحيح.","actions":["review_special_cases"],"sourceRefs":["https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:cancel-residency-permit-uae',(select id from public.hb_jurisdictions where code='AE-DU'),'cancel-residency-permit-uae',1,'active','{"id":"service:cancel-residency-permit-uae","version":1,"name":"إلغاء تصريح الإقامة الصادر من دبي","serviceSlug":"cancel-residency-permit-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"جواز وبيانات الإقامة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"}},{"key":"requirement-2","title":"طلب الكفيل أو المخول","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"}},{"key":"requirement-3","title":"إلغاء تصريح العمل إذا كانت إقامة موظف","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"}},{"key":"requirement-4","title":"وثائق التابعين أو الالتزامات المرتبطة عند انطباقها","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"تغطي خدمة GDRFA الرسمية إلغاء جميع أنواع تصاريح الإقامة الصادرة من دبي. لا تستخدم هذا المسار لإقامة صادرة من ICP في إمارة أخرى.","specialCases":"بدء إلغاء إقامة موظف قبل تسوية ملف MOHRE أو استخدام مسار دبي لإقامة صادرة من ICP يعرقل التسلسل الصحيح."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('cancel-residency-permit-uae',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:cancel-residency-permit-uae','service:cancel-residency-permit-uae','guidance',true,'{"name":"إلغاء تصريح الإقامة الصادر من دبي","category":"residency-visas","emirate":"دبي","type":"إلغاء","officialUrl":"https://gdrfad.gov.ae/en/services/0613ab0e-5858-11ea-0320-0050569629e8","executionUrl":null,"fees":"تعرضها GDRFA بحسب نوع الطلب والقناة قبل السداد.","duration":"تعتمد على خلو الملف من القيود واكتمال إلغاء العلاقة المرتبطة.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-SH'),'sharjah-ded','تجديد رخصة تجارية في الشارقة — دائرة التنمية الاقتصادية في الشارقة','https://sedd.ae/ar/w/renew-license','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"renew-business-license-sharjah","category":"companies-establishments","official_name":"تجديد رخصة","official_card_url":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","execution_url":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:renew-business-license-sharjah',(select id from public.hb_jurisdictions where code='AE-SH'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"بيانات الرخصة الحالية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://sedd.ae/ar/w/renew-license"]},{"id":"requirement:2","when":[],"effect":"review","reason":"وثيقة المقر السارية عند الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://sedd.ae/ar/w/renew-license"]},{"id":"requirement:3","when":[],"effect":"review","reason":"هوية أو تفويض مقدم الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://sedd.ae/ar/w/renew-license"]},{"id":"requirement:4","when":[],"effect":"review","reason":"الموافقات المنظمة للنشاط","actions":["collect_or_verify_requirement"],"sourceRefs":["https://sedd.ae/ar/w/renew-license"]},{"id":"conditions","when":[],"effect":"review","reason":"يبقي التجديد الرخصة سارية ويتيح استمرار خدمات المنشأة، بينما تختلف المتطلبات وفق النشاط والشكل القانوني والموقع.","actions":["review_conditions"],"sourceRefs":["https://sedd.ae/ar/w/renew-license"]},{"id":"special-cases","when":[],"effect":"review","reason":"اختلاف بيانات المقر أو النشاط بين الرخصة والمستندات يسبب طلب استكمال.","actions":["review_special_cases"],"sourceRefs":["https://sedd.ae/ar/w/renew-license"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='sharjah-ded' and source_url='https://sedd.ae/ar/w/renew-license' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:renew-business-license-sharjah',(select id from public.hb_jurisdictions where code='AE-SH'),'renew-business-license-sharjah',1,'active','{"id":"service:renew-business-license-sharjah","version":1,"name":"تجديد رخصة تجارية في الشارقة","serviceSlug":"renew-business-license-sharjah","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"بيانات الرخصة الحالية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://sedd.ae/ar/w/renew-license"}},{"key":"requirement-2","title":"وثيقة المقر السارية عند الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://sedd.ae/ar/w/renew-license"}},{"key":"requirement-3","title":"هوية أو تفويض مقدم الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://sedd.ae/ar/w/renew-license"}},{"key":"requirement-4","title":"الموافقات المنظمة للنشاط","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://sedd.ae/ar/w/renew-license"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"يبقي التجديد الرخصة سارية ويتيح استمرار خدمات المنشأة، بينما تختلف المتطلبات وفق النشاط والشكل القانوني والموقع.","specialCases":"اختلاف بيانات المقر أو النشاط بين الرخصة والمستندات يسبب طلب استكمال."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","executionUrl":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"sharjah-ded","officialUrl":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","executionUrl":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('renew-business-license-sharjah',(select id from public.hb_jurisdictions where code='AE-SH'),'sharjah-ded','service:renew-business-license-sharjah','service:renew-business-license-sharjah','assisted',true,'{"name":"تجديد رخصة تجارية في الشارقة","category":"companies-establishments","emirate":"الشارقة","type":"تجديد","officialUrl":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","executionUrl":"https://digital.sedd.gov.ae/digital/license/renew-license/license-details-step","fees":"تعرضها الدائرة في الطلب بعد التحقق من بيانات الرخصة والمتطلبات.","duration":"تعتمد على اكتمال الملف والموافقات المرتبطة بالنشاط.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-AJ'),'ajman-ded','تجديد رخصة اقتصادية في عجمان — دائرة التنمية الاقتصادية في عجمان','https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"renew-business-license-ajman","category":"companies-establishments","official_name":"تجديد رخصة تجارية","official_card_url":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","execution_url":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","review_result":"approved_for_user_navigation","functional_finding":"exact_transaction_route"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:renew-business-license-ajman',(select id from public.hb_jurisdictions where code='AE-AJ'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"رقم وبيانات الرخصة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"]},{"id":"requirement:2","when":[],"effect":"review","reason":"وثيقة مقر سارية عند انطباقها","actions":["collect_or_verify_requirement"],"sourceRefs":["https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"]},{"id":"requirement:3","when":[],"effect":"review","reason":"بيانات المالك أو المفوض","actions":["collect_or_verify_requirement"],"sourceRefs":["https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"]},{"id":"requirement:4","when":[],"effect":"review","reason":"الموافقات المطلوبة للنشاط","actions":["collect_or_verify_requirement"],"sourceRefs":["https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"]},{"id":"conditions","when":[],"effect":"review","reason":"يحافظ التجديد على صلاحية المنشأة ويمنع تراكم التأخير، ويجب تنفيذه من جهة إصدار الرخصة نفسها.","actions":["review_conditions"],"sourceRefs":["https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"]},{"id":"special-cases","when":[],"effect":"review","reason":"محاولة التجديد من بوابة إمارة أخرى أو قبل تحديث بيانات المنشأة تؤدي إلى مسار خاطئ.","actions":["review_special_cases"],"sourceRefs":["https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='ajman-ded' and source_url='https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:renew-business-license-ajman',(select id from public.hb_jurisdictions where code='AE-AJ'),'renew-business-license-ajman',1,'active','{"id":"service:renew-business-license-ajman","version":1,"name":"تجديد رخصة اقتصادية في عجمان","serviceSlug":"renew-business-license-ajman","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"رقم وبيانات الرخصة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"}},{"key":"requirement-2","title":"وثيقة مقر سارية عند انطباقها","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"}},{"key":"requirement-3","title":"بيانات المالك أو المفوض","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"}},{"key":"requirement-4","title":"الموافقات المطلوبة للنشاط","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"يحافظ التجديد على صلاحية المنشأة ويمنع تراكم التأخير، ويجب تنفيذه من جهة إصدار الرخصة نفسها.","specialCases":"محاولة التجديد من بوابة إمارة أخرى أو قبل تحديث بيانات المنشأة تؤدي إلى مسار خاطئ."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","executionUrl":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"ajman-ded","officialUrl":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","executionUrl":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('renew-business-license-ajman',(select id from public.hb_jurisdictions where code='AE-AJ'),'ajman-ded','service:renew-business-license-ajman','service:renew-business-license-ajman','assisted',true,'{"name":"تجديد رخصة اقتصادية في عجمان","category":"companies-establishments","emirate":"عجمان","type":"تجديد","officialUrl":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","executionUrl":"https://eservices.ajmanded.ae/ar/Account/Login?ReturnUrl=%2Far%2Frenewpermit","fees":"تظهرها دائرة عجمان داخل الطلب الرسمي بحسب بيانات الرخصة.","duration":"تختلف بحسب اكتمال الوثائق والموافقات وحالة الرخصة.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار سجل منشأة لدى وزارة الموارد البشرية — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"establishment-card-mohre-uae","category":"companies-establishments","official_name":"Issuance of Establishment Card","official_card_url":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/330","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:establishment-card-mohre-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"رخصة تجارية سارية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"بيانات الملاك والمخولين","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"وثائق الهوية والتوقيع المطلوبة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"بيانات التواصل والمنشأة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"وفق إعلان الوزارة في 9 فبراير 2026، أصبحت الخدمة تُعالج آليًا عند تقديم طلب الترخيص إلى جهة التنمية الاقتصادية، مع ضرورة التحقق من ظهور السجل قبل بدء معاملات الموظفين.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"اختلاف أسماء الملاك أو المفوضين بين الرخصة والطلب يمنع إكمال التسجيل أو يسبب طلب تعديل.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:establishment-card-mohre-uae',(select id from public.hb_jurisdictions where code='AE'),'establishment-card-mohre-uae',1,'active','{"id":"service:establishment-card-mohre-uae","version":1,"name":"إصدار سجل منشأة لدى وزارة الموارد البشرية","serviceSlug":"establishment-card-mohre-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"رخصة تجارية سارية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"}},{"key":"requirement-2","title":"بيانات الملاك والمخولين","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"}},{"key":"requirement-3","title":"وثائق الهوية والتوقيع المطلوبة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"}},{"key":"requirement-4","title":"بيانات التواصل والمنشأة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"وفق إعلان الوزارة في 9 فبراير 2026، أصبحت الخدمة تُعالج آليًا عند تقديم طلب الترخيص إلى جهة التنمية الاقتصادية، مع ضرورة التحقق من ظهور السجل قبل بدء معاملات الموظفين.","specialCases":"اختلاف أسماء الملاك أو المفوضين بين الرخصة والطلب يمنع إكمال التسجيل أو يسبب طلب تعديل."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/330"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/330","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('establishment-card-mohre-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:establishment-card-mohre-uae','service:establishment-card-mohre-uae','assisted',true,'{"name":"إصدار سجل منشأة لدى وزارة الموارد البشرية","category":"companies-establishments","emirate":"اتحادي","type":"إصدار","officialUrl":"https://www.mohre.gov.ae/en/services/issuance-of-establishment-card-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/330","fees":"تعرضها الوزارة داخل بطاقة الخدمة والطلب بحسب قناة التقديم.","duration":"معالجة آلية مع طلب الترخيص الاقتصادي وفق إعلان الوزارة؛ قد تتأثر الحالات الاستثنائية بصحة الربط والبيانات.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تحديث سجل المنشأة لدى وزارة الموارد البشرية — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/updating-the-establishment-file-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"update-establishment-file-mohre-uae","category":"companies-establishments","official_name":"Updating the Establishment File","official_card_url":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/331","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:update-establishment-file-mohre-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"الرخصة المحدثة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"مستند التعديل أو القرار","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"وثائق الملاك أو المفوضين الجدد","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"بيانات المنشأة الحالية لدى الوزارة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"أعلنت الوزارة أن تحديث ملف المنشأة أصبح فوريًا عند تحديث البيانات لدى جهة التنمية الاقتصادية؛ ويظل التحقق من ظهور البيانات الجديدة مهمًا قبل معاملات الموظفين.","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"بدء تصريح جديد قبل اكتمال تحديث ملف المنشأة قد يربط الطلب ببيانات قديمة.","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/updating-the-establishment-file-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:update-establishment-file-mohre-uae',(select id from public.hb_jurisdictions where code='AE'),'update-establishment-file-mohre-uae',1,'active','{"id":"service:update-establishment-file-mohre-uae","version":1,"name":"تحديث سجل المنشأة لدى وزارة الموارد البشرية","serviceSlug":"update-establishment-file-mohre-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"الرخصة المحدثة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"}},{"key":"requirement-2","title":"مستند التعديل أو القرار","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"}},{"key":"requirement-3","title":"وثائق الملاك أو المفوضين الجدد","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"}},{"key":"requirement-4","title":"بيانات المنشأة الحالية لدى الوزارة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"أعلنت الوزارة أن تحديث ملف المنشأة أصبح فوريًا عند تحديث البيانات لدى جهة التنمية الاقتصادية؛ ويظل التحقق من ظهور البيانات الجديدة مهمًا قبل معاملات الموظفين.","specialCases":"بدء تصريح جديد قبل اكتمال تحديث ملف المنشأة قد يربط الطلب ببيانات قديمة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/331"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/331","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('update-establishment-file-mohre-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:update-establishment-file-mohre-uae','service:update-establishment-file-mohre-uae','assisted',true,'{"name":"تحديث سجل المنشأة لدى وزارة الموارد البشرية","category":"companies-establishments","emirate":"اتحادي","type":"تحديث","officialUrl":"https://mohre.gov.ae/en/services/updating-the-establishment-file-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/331","fees":"تحددها بطاقة الخدمة الرسمية وقناة التقديم.","duration":"فوري عند تحديث بيانات جهة التنمية الاقتصادية وفق إعلان الوزارة؛ وقد تتطلب الحالات غير المرتبطة معالجة إضافية.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار تصريح عمل جديد من خارج الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"new-work-permit-overseas-uae","category":"work-employees","official_name":"Issuance of a New Work Permit - Overseas","official_card_url":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:new-work-permit-overseas-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"جواز العامل وصورة شخصية وفق الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"عرض عمل معتمد وتوقيعات","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"حصة وتصنيف منشأة مؤهلان","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"مؤهل أو موافقة مهنية عند الحاجة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"تحتاج المنشأة إلى تصريح معتمد قبل تشغيل أو استقدام العامل، ثم تنتقل الرحلة إلى الهجرة والإقامة.","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"بدء إجراءات السفر قبل صدور التصريح أو اختيار مهنة لا تطابق المؤهل والموافقة يسبب تعطيلاً.","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:new-work-permit-overseas-uae',(select id from public.hb_jurisdictions where code='AE'),'new-work-permit-overseas-uae',1,'active','{"id":"service:new-work-permit-overseas-uae","version":1,"name":"إصدار تصريح عمل جديد من خارج الإمارات","serviceSlug":"new-work-permit-overseas-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"جواز العامل وصورة شخصية وفق الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"}},{"key":"requirement-2","title":"عرض عمل معتمد وتوقيعات","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"}},{"key":"requirement-3","title":"حصة وتصنيف منشأة مؤهلان","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"}},{"key":"requirement-4","title":"مؤهل أو موافقة مهنية عند الحاجة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"تحتاج المنشأة إلى تصريح معتمد قبل تشغيل أو استقدام العامل، ثم تنتقل الرحلة إلى الهجرة والإقامة.","specialCases":"بدء إجراءات السفر قبل صدور التصريح أو اختيار مهنة لا تطابق المؤهل والموافقة يسبب تعطيلاً."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('new-work-permit-overseas-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:new-work-permit-overseas-uae','service:new-work-permit-overseas-uae','assisted',true,'{"name":"إصدار تصريح عمل جديد من خارج الإمارات","category":"work-employees","emirate":"اتحادي","type":"إصدار جديد من الخارج","officialUrl":"https://mohre.gov.ae/en/services/recruiting-a-worker-from-overseas-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/309","fees":"تختلف رسوم الإصدار حسب فئة المنشأة ونوع التصريح وتظهر في الطلب الرسمي.","duration":"تعرضها MOHRE عند اكتمال الطلب، ثم تضاف مدة إجراءات الدخول والإقامة.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل لمقيم على كفالة ذويه — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"family-sponsored-work-permit-uae","category":"family-sponsorship","official_name":"Issuance of a New Work Permit - Dependents Sponsored by Family Members","official_card_url":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/186","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:family-sponsored-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"إقامة وهوية ساريتان","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"جواز سفر ساري","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"عرض أو عقد العمل","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"بيانات الكفيل أو الموافقة المطلوبة بحسب الحالة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"الإقامة الأسرية لا تمنح وحدها تصريح العمل؛ تحتاج المنشأة إلى التصريح المناسب قبل التشغيل.","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"الخلط بين صلاحية الإقامة وصلاحية العمل قد يعرض المنشأة والعامل لمخالفة.","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:family-sponsored-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'family-sponsored-work-permit-uae',1,'active','{"id":"service:family-sponsored-work-permit-uae","version":1,"name":"تصريح عمل لمقيم على كفالة ذويه","serviceSlug":"family-sponsored-work-permit-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"إقامة وهوية ساريتان","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"}},{"key":"requirement-2","title":"جواز سفر ساري","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"}},{"key":"requirement-3","title":"عرض أو عقد العمل","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"}},{"key":"requirement-4","title":"بيانات الكفيل أو الموافقة المطلوبة بحسب الحالة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"الإقامة الأسرية لا تمنح وحدها تصريح العمل؛ تحتاج المنشأة إلى التصريح المناسب قبل التشغيل.","specialCases":"الخلط بين صلاحية الإقامة وصلاحية العمل قد يعرض المنشأة والعامل لمخالفة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/186"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/186","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('family-sponsored-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:family-sponsored-work-permit-uae','service:family-sponsored-work-permit-uae','assisted',true,'{"name":"تصريح عمل لمقيم على كفالة ذويه","category":"family-sponsorship","emirate":"اتحادي","type":"إصدار تصريح تابع على كفالة الأسرة","officialUrl":"https://mohre.gov.ae/en/services/work-permits-for-dependents-sponsored-by-family-members-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/186","fees":"تعرضها بطاقة الوزارة وتختلف الرسوم الإضافية بحسب قناة التقديم.","duration":"تحددها الوزارة عند اكتمال المستندات والموافقات.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار تصريح عمل مؤقت في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/temporary-work-permits-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"temporary-work-permit-uae","category":"work-employees","official_name":"Issuance of a New Work Permit - Temporary Work Permits","official_card_url":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/81","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:temporary-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"بيانات العامل ووثائقه السارية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"تفاصيل المهمة والمدة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"بيانات المنشأة مقدمة الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"موافقة أو مستند من العلاقة الحالية إذا طلبته الوزارة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"ينظم التصريح علاقة عمل مؤقتة بدلاً من تشغيل العامل خارج نوع التصريح المناسب.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"اختيار تصريح مؤقت لعمل دائم أو تجاهل موافقة العلاقة الحالية يؤدي إلى رفض أو مخالفة.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/temporary-work-permits-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:temporary-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'temporary-work-permit-uae',1,'active','{"id":"service:temporary-work-permit-uae","version":1,"name":"إصدار تصريح عمل مؤقت في الإمارات","serviceSlug":"temporary-work-permit-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"بيانات العامل ووثائقه السارية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"}},{"key":"requirement-2","title":"تفاصيل المهمة والمدة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"}},{"key":"requirement-3","title":"بيانات المنشأة مقدمة الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"}},{"key":"requirement-4","title":"موافقة أو مستند من العلاقة الحالية إذا طلبته الوزارة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"ينظم التصريح علاقة عمل مؤقتة بدلاً من تشغيل العامل خارج نوع التصريح المناسب.","specialCases":"اختيار تصريح مؤقت لعمل دائم أو تجاهل موافقة العلاقة الحالية يؤدي إلى رفض أو مخالفة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/81"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/81","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('temporary-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:temporary-work-permit-uae','service:temporary-work-permit-uae','assisted',true,'{"name":"إصدار تصريح عمل مؤقت في الإمارات","category":"work-employees","emirate":"اتحادي","type":"إصدار مؤقت","officialUrl":"https://www.mohre.gov.ae/en/services/temporary-work-permits-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/81","fees":"تظهر الرسوم الاتحادية ورسوم القناة في بطاقة الخدمة قبل التقديم.","duration":"تعرض الوزارة مدة الإنجاز عند اكتمال المتطلبات.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار تصريح عمل جزئي في الإمارات — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/part-time-work-permit-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"part-time-work-permit-uae","category":"work-employees","official_name":"Issuance of a New Work Permit - Part Time Work Permit","official_card_url":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:part-time-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"وثائق العامل والإقامة السارية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"]},{"id":"requirement:2","when":[],"effect":"review","reason":"عرض العمل الجزئي","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"]},{"id":"requirement:3","when":[],"effect":"review","reason":"بيانات المنشأة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"]},{"id":"requirement:4","when":[],"effect":"review","reason":"الموافقات التي يحددها وضع العامل الحالي","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"]},{"id":"conditions","when":[],"effect":"review","reason":"يتيح التصريح تنظيم العمل الجزئي قانونياً وفق الشروط بدلاً من ممارسة عمل إضافي دون تصريح.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"بدء العمل الإضافي قبل إصدار التصريح أو عدم الإفصاح عن الوضع الحالي يعطل الطلب.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/part-time-work-permit-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:part-time-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'part-time-work-permit-uae',1,'active','{"id":"service:part-time-work-permit-uae","version":1,"name":"إصدار تصريح عمل جزئي في الإمارات","serviceSlug":"part-time-work-permit-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"وثائق العامل والإقامة السارية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"}},{"key":"requirement-2","title":"عرض العمل الجزئي","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"}},{"key":"requirement-3","title":"بيانات المنشأة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"}},{"key":"requirement-4","title":"الموافقات التي يحددها وضع العامل الحالي","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"يتيح التصريح تنظيم العمل الجزئي قانونياً وفق الشروط بدلاً من ممارسة عمل إضافي دون تصريح.","specialCases":"بدء العمل الإضافي قبل إصدار التصريح أو عدم الإفصاح عن الوضع الحالي يعطل الطلب."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('part-time-work-permit-uae',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:part-time-work-permit-uae','service:part-time-work-permit-uae','assisted',true,'{"name":"إصدار تصريح عمل جزئي في الإمارات","category":"work-employees","emirate":"اتحادي","type":"إصدار دوام جزئي","officialUrl":"https://www.mohre.gov.ae/en/services/part-time-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184","fees":"تعرضها الوزارة في بطاقة الخدمة، وقد تضاف رسوم قناة التقديم.","duration":"تحددها الوزارة عند اكتمال الطلب وعدم وجود نواقص.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار الهوية الإماراتية لأول مرة — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"issue-emirates-id-uae","category":"identity-citizenship","official_name":"New Identity Card Issuance","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:issue-emirates-id-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"جواز السفر","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"]},{"id":"requirement:2","when":[],"effect":"review","reason":"طلب الإقامة أو الإقامة المرتبطة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"]},{"id":"requirement:3","when":[],"effect":"review","reason":"صورة وبيانات شخصية بحسب الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"]},{"id":"requirement:4","when":[],"effect":"review","reason":"إجراء البصمة عند انطباقه","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"]},{"id":"conditions","when":[],"effect":"review","reason":"الهوية وثيقة أساسية للمقيم وترتبط بإجراءات الإقامة، وقد تتطلب بصمة لأول إصدار حسب الفئة والعمر.","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"]},{"id":"special-cases","when":[],"effect":"review","reason":"اختلاف الاسم أو رقم الجواز بين طلب الإقامة والهوية يسبب تأخيراً وتصحيحاً إضافياً.","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:issue-emirates-id-uae',(select id from public.hb_jurisdictions where code='AE'),'issue-emirates-id-uae',1,'active','{"id":"service:issue-emirates-id-uae","version":1,"name":"إصدار الهوية الإماراتية لأول مرة","serviceSlug":"issue-emirates-id-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"جواز السفر","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"}},{"key":"requirement-2","title":"طلب الإقامة أو الإقامة المرتبطة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"}},{"key":"requirement-3","title":"صورة وبيانات شخصية بحسب الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"}},{"key":"requirement-4","title":"إجراء البصمة عند انطباقه","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"الهوية وثيقة أساسية للمقيم وترتبط بإجراءات الإقامة، وقد تتطلب بصمة لأول إصدار حسب الفئة والعمر.","specialCases":"اختلاف الاسم أو رقم الجواز بين طلب الإقامة والهوية يسبب تأخيراً وتصحيحاً إضافياً."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('issue-emirates-id-uae',(select id from public.hb_jurisdictions where code='AE'),'icp','service:issue-emirates-id-uae','service:issue-emirates-id-uae','guidance',true,'{"name":"إصدار الهوية الإماراتية لأول مرة","category":"identity-citizenship","emirate":"اتحادي","type":"إصدار لأول مرة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5a","executionUrl":null,"fees":"تختلف حسب مدة البطاقة والخدمة والقناة وتظهر في طلب ICP.","duration":"تعتمد على اكتمال الإقامة والبصمة والبيانات.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تجديد الهوية الإماراتية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"renew-emirates-id-uae","category":"identity-citizenship","official_name":"Identity Card Renewal","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:renew-emirates-id-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"الهوية الحالية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"]},{"id":"requirement:2","when":[],"effect":"review","reason":"جواز سفر ساري","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"]},{"id":"requirement:3","when":[],"effect":"review","reason":"طلب أو إقامة سارية بحسب الفئة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"]},{"id":"requirement:4","when":[],"effect":"review","reason":"عنوان وبيانات تواصل محدثة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"]},{"id":"conditions","when":[],"effect":"review","reason":"تحافظ البطاقة السارية على سهولة استخدام الخدمات، ويجب أن تتطابق بياناتها مع الجواز والإقامة.","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"]},{"id":"special-cases","when":[],"effect":"review","reason":"تجديد الإقامة دون متابعة طلب الهوية أو استخدام عنوان قديم يؤدي إلى تأخير الاستلام.","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:renew-emirates-id-uae',(select id from public.hb_jurisdictions where code='AE'),'renew-emirates-id-uae',1,'active','{"id":"service:renew-emirates-id-uae","version":1,"name":"تجديد الهوية الإماراتية","serviceSlug":"renew-emirates-id-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"الهوية الحالية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"}},{"key":"requirement-2","title":"جواز سفر ساري","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"}},{"key":"requirement-3","title":"طلب أو إقامة سارية بحسب الفئة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"}},{"key":"requirement-4","title":"عنوان وبيانات تواصل محدثة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"تحافظ البطاقة السارية على سهولة استخدام الخدمات، ويجب أن تتطابق بياناتها مع الجواز والإقامة.","specialCases":"تجديد الإقامة دون متابعة طلب الهوية أو استخدام عنوان قديم يؤدي إلى تأخير الاستلام."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('renew-emirates-id-uae',(select id from public.hb_jurisdictions where code='AE'),'icp','service:renew-emirates-id-uae','service:renew-emirates-id-uae','guidance',true,'{"name":"تجديد الهوية الإماراتية","category":"identity-citizenship","emirate":"اتحادي","type":"تجديد","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5d","executionUrl":null,"fees":"تظهر في طلب ICP بحسب المدة والخدمة والقناة.","duration":"تعتمد على اكتمال تجديد الإقامة والبيانات المطلوبة.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار إقامة لأفراد الأسرة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"family-residency-uae","category":"family-sponsorship","official_name":"Issuance of a residence permit for foreign family members","official_card_url":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","execution_url":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:family-residency-uae',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"جوازات المكفولين","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]},{"id":"requirement:2","when":[],"effect":"review","reason":"إقامة وهوية الكفيل","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]},{"id":"requirement:3","when":[],"effect":"review","reason":"إثبات صلة القرابة المصدق عند الحاجة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]},{"id":"requirement:4","when":[],"effect":"review","reason":"إثبات السكن والدخل والتأمين بحسب الطلب","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]},{"id":"conditions","when":[],"effect":"review","reason":"هذه الخدمة مخصصة لإصدار إقامة أفراد الأسرة عندما يكون ملف الكفيل في دبي؛ لا تستخدمها لمسارات ICP في الإمارات الأخرى.","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"استخدام مستند قرابة غير مصدق أو اختيار مسار دبي مع ملف كفيل صادر من ICP يؤدي إلى رفض أو تأخير.","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:family-residency-uae',(select id from public.hb_jurisdictions where code='AE-DU'),'family-residency-uae',1,'active','{"id":"service:family-residency-uae","version":1,"name":"إصدار إقامة لأفراد الأسرة في دبي","serviceSlug":"family-residency-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"جوازات المكفولين","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"}},{"key":"requirement-2","title":"إقامة وهوية الكفيل","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"}},{"key":"requirement-3","title":"إثبات صلة القرابة المصدق عند الحاجة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"}},{"key":"requirement-4","title":"إثبات السكن والدخل والتأمين بحسب الطلب","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"هذه الخدمة مخصصة لإصدار إقامة أفراد الأسرة عندما يكون ملف الكفيل في دبي؛ لا تستخدمها لمسارات ICP في الإمارات الأخرى.","specialCases":"استخدام مستند قرابة غير مصدق أو اختيار مسار دبي مع ملف كفيل صادر من ICP يؤدي إلى رفض أو تأخير."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('family-residency-uae',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:family-residency-uae','service:family-residency-uae','assisted',true,'{"name":"إصدار إقامة لأفراد الأسرة في دبي","category":"family-sponsorship","emirate":"دبي","type":"إصدار","officialUrl":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE","fees":"تعرض GDRFA الرسوم بحسب المدة ومكان المكفول والخدمات المرتبطة.","duration":"تعتمد على اكتمال إثبات القرابة والفحص والتأمين والهوية.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار الإقامة الذهبية للمستثمرين في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"golden-residency-uae","category":"residency-visas","official_name":"Issuing a golden residence permit (investors)","official_card_url":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8","execution_url":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=256a91d9-23d7-469f-a054-ffee6c0fc4c7&Lang=ar-AE","review_result":"approved_for_user_navigation","functional_finding":"exact_category_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:golden-residency-uae',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"جواز سفر ساري","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"]},{"id":"requirement:2","when":[],"effect":"review","reason":"إثبات الاستثمار وفق فئة المستثمر","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"]},{"id":"requirement:3","when":[],"effect":"review","reason":"ترشيح أو موافقة الجهة المختصة عند انطباقه","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"]},{"id":"requirement:4","when":[],"effect":"review","reason":"تأمين وفحص وهوية بحسب مرحلة الإصدار","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"]},{"id":"conditions","when":[],"effect":"review","reason":"هذه بطاقة خدمة المستثمرين في دبي فقط، وليست مسارًا للمواهب أو العلماء أو رواد الأعمال أو فئات الإقامة الذهبية الأخرى.","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"هذه الخدمة لا تصلح لفئة أخرى من فئات الإقامة الذهبية حتى لو كانت قريبة بالاسم.","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:golden-residency-uae',(select id from public.hb_jurisdictions where code='AE-DU'),'golden-residency-uae',1,'active','{"id":"service:golden-residency-uae","version":1,"name":"إصدار الإقامة الذهبية للمستثمرين في دبي","serviceSlug":"golden-residency-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"جواز سفر ساري","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"}},{"key":"requirement-2","title":"إثبات الاستثمار وفق فئة المستثمر","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"}},{"key":"requirement-3","title":"ترشيح أو موافقة الجهة المختصة عند انطباقه","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"}},{"key":"requirement-4","title":"تأمين وفحص وهوية بحسب مرحلة الإصدار","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"هذه بطاقة خدمة المستثمرين في دبي فقط، وليست مسارًا للمواهب أو العلماء أو رواد الأعمال أو فئات الإقامة الذهبية الأخرى.","specialCases":"هذه الخدمة لا تصلح لفئة أخرى من فئات الإقامة الذهبية حتى لو كانت قريبة بالاسم."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=256a91d9-23d7-469f-a054-ffee6c0fc4c7&Lang=ar-AE"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=256a91d9-23d7-469f-a054-ffee6c0fc4c7&Lang=ar-AE","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('golden-residency-uae',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:golden-residency-uae','service:golden-residency-uae','assisted',true,'{"name":"إصدار الإقامة الذهبية للمستثمرين في دبي","category":"residency-visas","emirate":"دبي","type":"إصدار","officialUrl":"https://www.gdrfad.gov.ae/en/services/8ea80da4-f43e-11eb-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=256a91d9-23d7-469f-a054-ffee6c0fc4c7&Lang=ar-AE","fees":"تعرض GDRFA الرسوم الرسمية الخاصة بخدمة المستثمرين قبل السداد.","duration":"تعتمد على التحقق من أهلية المستثمر واكتمال أدلة الاستثمار.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'fta','التسجيل في ضريبة الشركات بالإمارات — الهيئة الاتحادية للضرائب (FTA)','https://tax.gov.ae/ar/services/corporate.tax.registration.aspx','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"corporate-tax-registration-uae","category":"financial-business","official_name":"التسجيل في ضريبة الشركات","official_card_url":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:corporate-tax-registration-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"الرخص والوثائق القانونية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"]},{"id":"requirement:2","when":[],"effect":"review","reason":"بيانات الملاك والمخول","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"]},{"id":"requirement:3","when":[],"effect":"review","reason":"عقد التأسيس أو المستند المنشئ","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"]},{"id":"requirement:4","when":[],"effect":"review","reason":"بيانات التواصل والفترة الضريبية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"]},{"id":"conditions","when":[],"effect":"review","reason":"ينشئ التسجيل رقم ضريبة الشركات للشخص الخاضع، ويجب أن تتطابق بياناته مع الرخص والوثائق القانونية.","actions":["review_conditions"],"sourceRefs":["https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"]},{"id":"special-cases","when":[],"effect":"review","reason":"استخدام بيانات رخصة قديمة أو تسجيل كيان واحد بدلاً من أشخاص قانونيين منفصلين يؤدي إلى طلب تصحيح.","actions":["review_special_cases"],"sourceRefs":["https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='fta' and source_url='https://tax.gov.ae/ar/services/corporate.tax.registration.aspx' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:corporate-tax-registration-uae',(select id from public.hb_jurisdictions where code='AE'),'corporate-tax-registration-uae',1,'active','{"id":"service:corporate-tax-registration-uae","version":1,"name":"التسجيل في ضريبة الشركات بالإمارات","serviceSlug":"corporate-tax-registration-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"الرخص والوثائق القانونية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"}},{"key":"requirement-2","title":"بيانات الملاك والمخول","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"}},{"key":"requirement-3","title":"عقد التأسيس أو المستند المنشئ","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"}},{"key":"requirement-4","title":"بيانات التواصل والفترة الضريبية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"ينشئ التسجيل رقم ضريبة الشركات للشخص الخاضع، ويجب أن تتطابق بياناته مع الرخص والوثائق القانونية.","specialCases":"استخدام بيانات رخصة قديمة أو تسجيل كيان واحد بدلاً من أشخاص قانونيين منفصلين يؤدي إلى طلب تصحيح."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"fta","officialUrl":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('corporate-tax-registration-uae',(select id from public.hb_jurisdictions where code='AE'),'fta','service:corporate-tax-registration-uae','service:corporate-tax-registration-uae','guidance',true,'{"name":"التسجيل في ضريبة الشركات بالإمارات","category":"financial-business","emirate":"اتحادي","type":"تسجيل","officialUrl":"https://tax.gov.ae/ar/services/corporate.tax.registration.aspx","executionUrl":null,"fees":"الخدمة الحكومية موضحة في بطاقة الهيئة؛ تحقق من البطاقة الرسمية قبل الإرسال.","duration":"توضح الهيئة مدة التقديم والمراجعة في بطاقة الخدمة وتتأثر بالنواقص.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'fta','التسجيل في ضريبة القيمة المضافة بالإمارات — الهيئة الاتحادية للضرائب (FTA)','https://tax.gov.ae/ar/services/vat.registration.aspx','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"vat-registration-uae","category":"financial-business","official_name":"التسجيل لضريبة القيمة المضافة","official_card_url":"https://tax.gov.ae/ar/services/vat.registration.aspx","execution_url":"https://eservices.tax.gov.ae/sap/bc/ui5_ui5/sap/zmcf_fmca/index.html?saml2=disabled&sap-client=100&sap-language=AR&serviceId=6001&sCode=396-02-001-000","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:vat-registration-uae',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"الرخصة والوثائق القانونية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/vat.registration.aspx"]},{"id":"requirement:2","when":[],"effect":"review","reason":"إثباتات التوريدات والمصروفات","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/vat.registration.aspx"]},{"id":"requirement:3","when":[],"effect":"review","reason":"بيانات الحساب البنكي والمخول","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/vat.registration.aspx"]},{"id":"requirement:4","when":[],"effect":"review","reason":"توقعات النشاط والفترة ذات الصلة","actions":["collect_or_verify_requirement"],"sourceRefs":["https://tax.gov.ae/ar/services/vat.registration.aspx"]},{"id":"conditions","when":[],"effect":"review","reason":"التسجيل إلزامي أو اختياري بحسب القواعد والحدود، ويجب دعم الأرقام بمستندات واضحة للفترة المطلوبة.","actions":["review_conditions"],"sourceRefs":["https://tax.gov.ae/ar/services/vat.registration.aspx"]},{"id":"special-cases","when":[],"effect":"review","reason":"رفع أرقام دون فواتير أو كشف منظم للفترة يؤدي إلى استفسارات وتأخير وربما رفض.","actions":["review_special_cases"],"sourceRefs":["https://tax.gov.ae/ar/services/vat.registration.aspx"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='fta' and source_url='https://tax.gov.ae/ar/services/vat.registration.aspx' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:vat-registration-uae',(select id from public.hb_jurisdictions where code='AE'),'vat-registration-uae',1,'active','{"id":"service:vat-registration-uae","version":1,"name":"التسجيل في ضريبة القيمة المضافة بالإمارات","serviceSlug":"vat-registration-uae","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"الرخصة والوثائق القانونية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/vat.registration.aspx"}},{"key":"requirement-2","title":"إثباتات التوريدات والمصروفات","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/vat.registration.aspx"}},{"key":"requirement-3","title":"بيانات الحساب البنكي والمخول","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/vat.registration.aspx"}},{"key":"requirement-4","title":"توقعات النشاط والفترة ذات الصلة","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://tax.gov.ae/ar/services/vat.registration.aspx"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"التسجيل إلزامي أو اختياري بحسب القواعد والحدود، ويجب دعم الأرقام بمستندات واضحة للفترة المطلوبة.","specialCases":"رفع أرقام دون فواتير أو كشف منظم للفترة يؤدي إلى استفسارات وتأخير وربما رفض."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://tax.gov.ae/ar/services/vat.registration.aspx","executionUrl":"https://eservices.tax.gov.ae/sap/bc/ui5_ui5/sap/zmcf_fmca/index.html?saml2=disabled&sap-client=100&sap-language=AR&serviceId=6001&sCode=396-02-001-000"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"fta","officialUrl":"https://tax.gov.ae/ar/services/vat.registration.aspx","executionUrl":"https://eservices.tax.gov.ae/sap/bc/ui5_ui5/sap/zmcf_fmca/index.html?saml2=disabled&sap-client=100&sap-language=AR&serviceId=6001&sCode=396-02-001-000","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('vat-registration-uae',(select id from public.hb_jurisdictions where code='AE'),'fta','service:vat-registration-uae','service:vat-registration-uae','assisted',true,'{"name":"التسجيل في ضريبة القيمة المضافة بالإمارات","category":"financial-business","emirate":"اتحادي","type":"تسجيل","officialUrl":"https://tax.gov.ae/ar/services/vat.registration.aspx","executionUrl":"https://eservices.tax.gov.ae/sap/bc/ui5_ui5/sap/zmcf_fmca/index.html?saml2=disabled&sap-client=100&sap-language=AR&serviceId=6001&sCode=396-02-001-000","fees":"تعرض بطاقة الهيئة تكلفة الخدمة الحكومية الحالية قبل بدء الطلب.","duration":"توضحها بطاقة الخدمة الرسمية وتتأثر بجودة أدلة الإيرادات والمصروفات.","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-AJ'),'ajman-ded','تأسيس منشأة جديدة في عجمان — دائرة التنمية الاقتصادية في عجمان','https://eservices.ajmanded.ae/en/','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأسيس-منشأة-جديدة-في-عجمان","category":"companies-establishments","official_name":"New Establishment","official_card_url":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","execution_url":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","review_result":"approved_for_user_navigation","functional_finding":"exact_login_return_route"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأسيس-منشأة-جديدة-في-عجمان',(select id from public.hb_jurisdictions where code='AE-AJ'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://eservices.ajmanded.ae/en/"]},{"id":"special-cases","when":[],"effect":"review","reason":"بوابة عجمان الرسمية تعرض Future Investor > Issue Trade License، ويحفظ رابط الدخول وجهة newestablishment.","actions":["review_special_cases"],"sourceRefs":["https://eservices.ajmanded.ae/en/"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='ajman-ded' and source_url='https://eservices.ajmanded.ae/en/' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأسيس-منشأة-جديدة-في-عجمان',(select id from public.hb_jurisdictions where code='AE-AJ'),'تأسيس-منشأة-جديدة-في-عجمان',1,'active','{"id":"service:تأسيس-منشأة-جديدة-في-عجمان","version":1,"name":"تأسيس منشأة جديدة في عجمان","serviceSlug":"تأسيس-منشأة-جديدة-في-عجمان","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بوابة عجمان الرسمية تعرض Future Investor > Issue Trade License، ويحفظ رابط الدخول وجهة newestablishment."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","executionUrl":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"ajman-ded","officialUrl":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","executionUrl":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأسيس-منشأة-جديدة-في-عجمان',(select id from public.hb_jurisdictions where code='AE-AJ'),'ajman-ded','service:تأسيس-منشأة-جديدة-في-عجمان','service:تأسيس-منشأة-جديدة-في-عجمان','assisted',true,'{"name":"تأسيس منشأة جديدة في عجمان","category":"companies-establishments","emirate":"عجمان","type":"إصدار رخصة","officialUrl":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","executionUrl":"https://eservices.ajmanded.ae/en/Account/Login?ReturnUrl=%2Fen%2Fnewestablishment","fees":"غير موثق في سجل الكتالوج","duration":"غير موثق في سجل الكتالوج","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-FU'),'fujairah-free-zone','تأسيس شركة في المنطقة الحرة بالفجيرة — هيئة المنطقة الحرة بالفجيرة','https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة","category":"companies-establishments","official_name":"تسجيل رخصة تجارية","official_card_url":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","execution_url":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","review_result":"approved_for_user_navigation","functional_finding":"department_and_service_parameter"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة',(select id from public.hb_jurisdictions where code='AE-FU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1"]},{"id":"special-cases","when":[],"effect":"review","reason":"المسار يحدد الجهة ومعرّف الخدمة، وليس الصفحة الرئيسية للحكومة الرقمية.","actions":["review_special_cases"],"sourceRefs":["https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='fujairah-free-zone' and source_url='https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة',(select id from public.hb_jurisdictions where code='AE-FU'),'تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة',1,'active','{"id":"service:تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة","version":1,"name":"تأسيس شركة في المنطقة الحرة بالفجيرة","serviceSlug":"تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"المسار يحدد الجهة ومعرّف الخدمة، وليس الصفحة الرئيسية للحكومة الرقمية."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","executionUrl":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"fujairah-free-zone","officialUrl":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","executionUrl":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة',(select id from public.hb_jurisdictions where code='AE-FU'),'fujairah-free-zone','service:تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة','service:تأسيس-شركة-في-المنطقة-الحرة-بالفجيرة','assisted',true,'{"name":"تأسيس شركة في المنطقة الحرة بالفجيرة","category":"companies-establishments","emirate":"الفجيرة","type":"تأسيس","officialUrl":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","executionUrl":"https://digital.fujairah.ae/public/portal/?department=/sites/FujairahFreeZone&service=1","fees":"غير موثق في سجل الكتالوج","duration":"غير موثق في سجل الكتالوج","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل لمهمة — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/mission-work-permit-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"issuance-of-a-new-work-permit-mission-work-permit","category":"work-employees","official_name":"Issuance of a New Work Permit - Mission Work Permit","official_card_url":"https://www.mohre.gov.ae/en/services/mission-work-permit-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/54","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:issuance-of-a-new-work-permit-mission-work-permit',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/mission-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة الخدمة الرسمية المطابقة.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/mission-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/mission-work-permit-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:issuance-of-a-new-work-permit-mission-work-permit',(select id from public.hb_jurisdictions where code='AE'),'issuance-of-a-new-work-permit-mission-work-permit',1,'active','{"id":"service:issuance-of-a-new-work-permit-mission-work-permit","version":1,"name":"تصريح عمل لمهمة","serviceSlug":"issuance-of-a-new-work-permit-mission-work-permit","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة الخدمة الرسمية المطابقة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/mission-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/54"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/mission-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/54","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('issuance-of-a-new-work-permit-mission-work-permit',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:issuance-of-a-new-work-permit-mission-work-permit','service:issuance-of-a-new-work-permit-mission-work-permit','assisted',true,'{"name":"تصريح عمل لمهمة","category":"work-employees","emirate":"اتحادي","type":"إصدار تصريح لمهمة","officialUrl":"https://www.mohre.gov.ae/en/services/mission-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/54","fees":"غير موثق في سجل الكتالوج","duration":"غير موثق في سجل الكتالوج","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل لحامل الإقامة الذهبية — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"issuance-of-a-new-work-permit-golden-visa-holders","category":"residency-visas","official_name":"Issuance of a New Work Permit - Golden Visa Holders","official_card_url":"https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:issuance-of-a-new-work-permit-golden-visa-holders',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة الخدمة الرسمية المطابقة.","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:issuance-of-a-new-work-permit-golden-visa-holders',(select id from public.hb_jurisdictions where code='AE'),'issuance-of-a-new-work-permit-golden-visa-holders',1,'active','{"id":"service:issuance-of-a-new-work-permit-golden-visa-holders","version":1,"name":"تصريح عمل لحامل الإقامة الذهبية","serviceSlug":"issuance-of-a-new-work-permit-golden-visa-holders","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة الخدمة الرسمية المطابقة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('issuance-of-a-new-work-permit-golden-visa-holders',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:issuance-of-a-new-work-permit-golden-visa-holders','service:issuance-of-a-new-work-permit-golden-visa-holders','guidance',true,'{"name":"تصريح عمل لحامل الإقامة الذهبية","category":"residency-visas","emirate":"اتحادي","type":"إصدار تصريح","officialUrl":"https://mohre.gov.ae/en/services/work-permits-of-golden-visa-holders-2022","executionUrl":null,"fees":"غير موثق في سجل الكتالوج","duration":"غير موثق في سجل الكتالوج","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تسجيل شكوى عمالية للقطاع الخاص — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"register-labour-complaints-private-sector-employees","category":"justice-police","official_name":"Register Labour Complaints - Private Sector Employees","official_card_url":"https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022","execution_url":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:register-labour-complaints-private-sector-employees',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة الخدمة الرسمية المطابقة.","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:register-labour-complaints-private-sector-employees',(select id from public.hb_jurisdictions where code='AE'),'register-labour-complaints-private-sector-employees',1,'active','{"id":"service:register-labour-complaints-private-sector-employees","version":1,"name":"تسجيل شكوى عمالية للقطاع الخاص","serviceSlug":"register-labour-complaints-private-sector-employees","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة الخدمة الرسمية المطابقة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022","executionUrl":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022","executionUrl":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('register-labour-complaints-private-sector-employees',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:register-labour-complaints-private-sector-employees','service:register-labour-complaints-private-sector-employees','assisted',true,'{"name":"تسجيل شكوى عمالية للقطاع الخاص","category":"justice-police","emirate":"اتحادي","type":"تسجيل شكوى","officialUrl":"https://www.mohre.gov.ae/en/services/register-labor-complaints-private-sector-employees-2022","executionUrl":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en","fees":"دون رسوم","duration":"14 يوم عمل","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تعديل بيانات تصريح الإقامة — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"amendment-of-residency-permit-data","category":"residency-visas","official_name":"Amendment of Residency Permit Data","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:amendment-of-residency-permit-data',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة مستقلة للتعديل وبها زر بدء الخدمة.","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:amendment-of-residency-permit-data',(select id from public.hb_jurisdictions where code='AE'),'amendment-of-residency-permit-data',1,'active','{"id":"service:amendment-of-residency-permit-data","version":1,"name":"تعديل بيانات تصريح الإقامة","serviceSlug":"amendment-of-residency-permit-data","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة مستقلة للتعديل وبها زر بدء الخدمة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('amendment-of-residency-permit-data',(select id from public.hb_jurisdictions where code='AE'),'icp','service:amendment-of-residency-permit-data','service:amendment-of-residency-permit-data','guidance',true,'{"name":"تعديل بيانات تصريح الإقامة","category":"residency-visas","emirate":"الإمارات عدا دبي","type":"تعديل بيانات","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e67","executionUrl":null,"fees":"غير موثق في سجل الكتالوج","duration":"غير موثق في سجل الكتالوج","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تعديل بيانات التأشيرة — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"amendment-of-visa-data","category":"residency-visas","official_name":"Amendment of Visa Data","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:amendment-of-visa-data',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة مستقلة للتعديل وبها زر بدء الخدمة.","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:amendment-of-visa-data',(select id from public.hb_jurisdictions where code='AE'),'amendment-of-visa-data',1,'active','{"id":"service:amendment-of-visa-data","version":1,"name":"تعديل بيانات التأشيرة","serviceSlug":"amendment-of-visa-data","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة مستقلة للتعديل وبها زر بدء الخدمة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('amendment-of-visa-data',(select id from public.hb_jurisdictions where code='AE'),'icp','service:amendment-of-visa-data','service:amendment-of-visa-data','guidance',true,'{"name":"تعديل بيانات التأشيرة","category":"residency-visas","emirate":"الإمارات عدا دبي","type":"تعديل بيانات","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e61","executionUrl":null,"fees":"50 درهماً للطلب و100 درهم للخدمة الذكية","duration":"يومان","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تمديد التأشيرة أو إذن الدخول — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تمديد-التأشيرة-أو-إذن-الدخول","category":"residency-visas","official_name":"Visa Extension","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card_with_category_selector"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تمديد-التأشيرة-أو-إذن-الدخول',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62"]},{"id":"special-cases","when":[],"effect":"review","reason":"نوع الطلب واحد: التمديد. تختلف الأهلية والحدود حسب فئة الإذن، وتعرضها بطاقة الخدمة الرسمية.","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تمديد-التأشيرة-أو-إذن-الدخول',(select id from public.hb_jurisdictions where code='AE'),'تمديد-التأشيرة-أو-إذن-الدخول',1,'active','{"id":"service:تمديد-التأشيرة-أو-إذن-الدخول","version":1,"name":"تمديد التأشيرة أو إذن الدخول","serviceSlug":"تمديد-التأشيرة-أو-إذن-الدخول","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"نوع الطلب واحد: التمديد. تختلف الأهلية والحدود حسب فئة الإذن، وتعرضها بطاقة الخدمة الرسمية."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تمديد-التأشيرة-أو-إذن-الدخول',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تمديد-التأشيرة-أو-إذن-الدخول','service:تمديد-التأشيرة-أو-إذن-الدخول','guidance',true,'{"name":"تمديد التأشيرة أو إذن الدخول","category":"residency-visas","emirate":"الإمارات عدا دبي","type":"تمديد","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e62","executionUrl":null,"fees":"100 درهم طلب و500 درهم تمديد؛ قد تختلف حسب الحالة","duration":"يومان","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mofa','تصديق مستند شخصي داخل الإمارات — وزارة الخارجية','https://www.mofa.gov.ae/services/attestation','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصديق-مستند-شخصي-داخل-الإمارات","category":"contracts-notarization","official_name":"Documents Attestation","official_card_url":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","execution_url":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصديق-مستند-شخصي-داخل-الإمارات',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://www.mofa.gov.ae/services/attestation"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة الخدمة تحدد المسار الرقمي أو التوصيل حسب نوع المستند وجهة الإصدار.","actions":["review_special_cases"],"sourceRefs":["https://www.mofa.gov.ae/services/attestation"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mofa' and source_url='https://www.mofa.gov.ae/services/attestation' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصديق-مستند-شخصي-داخل-الإمارات',(select id from public.hb_jurisdictions where code='AE'),'تصديق-مستند-شخصي-داخل-الإمارات',1,'active','{"id":"service:تصديق-مستند-شخصي-داخل-الإمارات","version":1,"name":"تصديق مستند شخصي داخل الإمارات","serviceSlug":"تصديق-مستند-شخصي-داخل-الإمارات","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة الخدمة تحدد المسار الرقمي أو التوصيل حسب نوع المستند وجهة الإصدار."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","executionUrl":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mofa","officialUrl":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","executionUrl":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصديق-مستند-شخصي-داخل-الإمارات',(select id from public.hb_jurisdictions where code='AE'),'mofa','service:تصديق-مستند-شخصي-داخل-الإمارات','service:تصديق-مستند-شخصي-داخل-الإمارات','assisted',true,'{"name":"تصديق مستند شخصي داخل الإمارات","category":"contracts-notarization","emirate":"اتحادي","type":"تصديق مستند شخصي","officialUrl":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","executionUrl":"https://www.mofa.gov.ae/Account/Login?returnUrl=%2Far-ae%2FServices%2FForms%2Fattestation","fees":"150 درهماً للمستند الشخصي","duration":"1–3 أيام عمل؛ الرقمي خلال ساعتين ضمن الدوام","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mofa','تصديق مستند تجاري دولي (عدا الفاتورة وشهادة المنشأ) — وزارة الخارجية','https://www.mofa.gov.ae/services/attestation','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ","category":"contracts-notarization","official_name":"Documents Attestation","official_card_url":"https://www.mofa.gov.ae/services/attestation","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card_with_explicit_exclusion"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://www.mofa.gov.ae/services/attestation"]},{"id":"special-cases","when":[],"effect":"review","reason":"استثنيت الفواتير التجارية وشهادات المنشأ صراحة لأنها انتقلت إلى eDAS 2.0.","actions":["review_special_cases"],"sourceRefs":["https://www.mofa.gov.ae/services/attestation"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mofa' and source_url='https://www.mofa.gov.ae/services/attestation' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ',(select id from public.hb_jurisdictions where code='AE'),'تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ',1,'active','{"id":"service:تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ","version":1,"name":"تصديق مستند تجاري دولي (عدا الفاتورة وشهادة المنشأ)","serviceSlug":"تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"استثنيت الفواتير التجارية وشهادات المنشأ صراحة لأنها انتقلت إلى eDAS 2.0."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mofa.gov.ae/services/attestation","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mofa","officialUrl":"https://www.mofa.gov.ae/services/attestation","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ',(select id from public.hb_jurisdictions where code='AE'),'mofa','service:تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ','service:تصديق-مستند-تجاري-دولي-عدا-الفاتورة-وشهادة-المنشأ','guidance',true,'{"name":"تصديق مستند تجاري دولي (عدا الفاتورة وشهادة المنشأ)","category":"contracts-notarization","emirate":"اتحادي","type":"تصديق مستند تجاري","officialUrl":"https://www.mofa.gov.ae/services/attestation","executionUrl":null,"fees":"يعرض المبلغ الإجمالي رسميًا قبل الدفع حسب نوع وعدد المستندات","duration":"1–3 أيام عمل حسب التوصيل","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mofa','تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0 — وزارة الخارجية','https://www.mofa.gov.ae/services/edas-attestation-v2','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"attestation-of-commercial-invoices-via-edas-2-0","category":"contracts-notarization","official_name":"Attestation of commercial invoices via eDAS 2.0","official_card_url":"https://www.mofa.gov.ae/services/edas-attestation-v2","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card_and_current_replacement"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:attestation-of-commercial-invoices-via-edas-2-0',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://www.mofa.gov.ae/services/edas-attestation-v2"]},{"id":"special-cases","when":[],"effect":"review","reason":"eDAS 2.0 هو البديل الإلزامي بعد إيقاف eDAS 1.0 في 8 يونيو 2026.","actions":["review_special_cases"],"sourceRefs":["https://www.mofa.gov.ae/services/edas-attestation-v2"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mofa' and source_url='https://www.mofa.gov.ae/services/edas-attestation-v2' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:attestation-of-commercial-invoices-via-edas-2-0',(select id from public.hb_jurisdictions where code='AE'),'attestation-of-commercial-invoices-via-edas-2-0',1,'active','{"id":"service:attestation-of-commercial-invoices-via-edas-2-0","version":1,"name":"تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0","serviceSlug":"attestation-of-commercial-invoices-via-edas-2-0","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"eDAS 2.0 هو البديل الإلزامي بعد إيقاف eDAS 1.0 في 8 يونيو 2026."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mofa.gov.ae/services/edas-attestation-v2","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mofa","officialUrl":"https://www.mofa.gov.ae/services/edas-attestation-v2","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('attestation-of-commercial-invoices-via-edas-2-0',(select id from public.hb_jurisdictions where code='AE'),'mofa','service:attestation-of-commercial-invoices-via-edas-2-0','service:attestation-of-commercial-invoices-via-edas-2-0','guidance',true,'{"name":"تصديق فاتورة تجارية أو شهادة منشأ عبر eDAS 2.0","category":"contracts-notarization","emirate":"اتحادي","type":"تصديق فاتورة تجارية أو شهادة منشأ","officialUrl":"https://www.mofa.gov.ae/services/edas-attestation-v2","executionUrl":null,"fees":"150 درهماً لكل فاتورة أو شهادة منشأ","duration":"دقيقتان وفق بطاقة الخدمة","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'moe','معادلة شهادة الثانوية من خارج الإمارات — وزارة التربية والتعليم','https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"equivalency-of-general-education-certificate-from-abroad-grade-12","category":"education-certificates","official_name":"Equivalency of General Education Certificate from Abroad (Grade 12)","official_card_url":"https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:equivalency-of-general-education-certificate-from-abroad-grade-12',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة خدمة مستقلة وبها بدء الخدمة.","actions":["review_special_cases"],"sourceRefs":["https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='moe' and source_url='https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:equivalency-of-general-education-certificate-from-abroad-grade-12',(select id from public.hb_jurisdictions where code='AE'),'equivalency-of-general-education-certificate-from-abroad-grade-12',1,'active','{"id":"service:equivalency-of-general-education-certificate-from-abroad-grade-12","version":1,"name":"معادلة شهادة الثانوية من خارج الإمارات","serviceSlug":"equivalency-of-general-education-certificate-from-abroad-grade-12","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة خدمة مستقلة وبها بدء الخدمة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"moe","officialUrl":"https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('equivalency-of-general-education-certificate-from-abroad-grade-12',(select id from public.hb_jurisdictions where code='AE'),'moe','service:equivalency-of-general-education-certificate-from-abroad-grade-12','service:equivalency-of-general-education-certificate-from-abroad-grade-12','guidance',true,'{"name":"معادلة شهادة الثانوية من خارج الإمارات","category":"education-certificates","emirate":"اتحادي","type":"معادلة","officialUrl":"https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx","executionUrl":null,"fees":"50 درهماً","duration":"3–30 يوم عمل حسب المراسلة واللجنة","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'moe','معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات — وزارة التربية والتعليم','https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"equivalency-of-general-education-certificate-in-the-uae-grade-12","category":"education-certificates","official_name":"Equivalency of General Education Certificate in the UAE (Grade 12)","official_card_url":"https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:equivalency-of-general-education-certificate-in-the-uae-grade-12',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة خدمة مستقلة؛ يجب إبقاء استثناءات أبوظبي ودبي والشارقة ورأس الخيمة ظاهرة في المحتوى.","actions":["review_special_cases"],"sourceRefs":["https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='moe' and source_url='https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:equivalency-of-general-education-certificate-in-the-uae-grade-12',(select id from public.hb_jurisdictions where code='AE'),'equivalency-of-general-education-certificate-in-the-uae-grade-12',1,'active','{"id":"service:equivalency-of-general-education-certificate-in-the-uae-grade-12","version":1,"name":"معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات","serviceSlug":"equivalency-of-general-education-certificate-in-the-uae-grade-12","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة خدمة مستقلة؛ يجب إبقاء استثناءات أبوظبي ودبي والشارقة ورأس الخيمة ظاهرة في المحتوى."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"moe","officialUrl":"https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('equivalency-of-general-education-certificate-in-the-uae-grade-12',(select id from public.hb_jurisdictions where code='AE'),'moe','service:equivalency-of-general-education-certificate-in-the-uae-grade-12','service:equivalency-of-general-education-certificate-in-the-uae-grade-12','guidance',true,'{"name":"معادلة شهادة ثانوية منهاج أجنبي داخل الإمارات","category":"education-certificates","emirate":"اتحادي مع استثناءات الجهات التعليمية المحلية المنشورة","type":"معادلة","officialUrl":"https://moe.gov.ae/en/eservices/servicecard/pages/certequivalent.aspx","executionUrl":null,"fees":"غير موثق في سجل الكتالوج","duration":"غير موثق في سجل الكتالوج","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'moe','التحقق من صحة المعادلة أو التصديق — وزارة التربية والتعليم','https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"confirming-the-authenticity-of-equivalency","category":"education-certificates","official_name":"Confirming the Authenticity of Equivalency","official_card_url":"https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:confirming-the-authenticity-of-equivalency',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","actions":["review_conditions"],"sourceRefs":["https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx"]},{"id":"special-cases","when":[],"effect":"review","reason":"بطاقة مستقلة؛ التحقق فوري ومجاني وفق المصدر الرسمي.","actions":["review_special_cases"],"sourceRefs":["https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='moe' and source_url='https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:confirming-the-authenticity-of-equivalency',(select id from public.hb_jurisdictions where code='AE'),'confirming-the-authenticity-of-equivalency',1,'active','{"id":"service:confirming-the-authenticity-of-equivalency","version":1,"name":"التحقق من صحة المعادلة أو التصديق","serviceSlug":"confirming-the-authenticity-of-equivalency","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"راجع بطاقة الخدمة الرسمية المعتمدة قبل بدء الطلب.","specialCases":"بطاقة مستقلة؛ التحقق فوري ومجاني وفق المصدر الرسمي."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"moe","officialUrl":"https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('confirming-the-authenticity-of-equivalency',(select id from public.hb_jurisdictions where code='AE'),'moe','service:confirming-the-authenticity-of-equivalency','service:confirming-the-authenticity-of-equivalency','guidance',true,'{"name":"التحقق من صحة المعادلة أو التصديق","category":"education-certificates","emirate":"اتحادي","type":"تحقق","officialUrl":"https://moe.gov.ae/ar/eservices/servicecard/pages/certificateequilizationverification.aspx","executionUrl":null,"fees":"مجانية","duration":"فورية","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار بطاقة مندوب علاقات عامة PRO — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-بطاقة-مندوب-علاقات-عامة-pro","category":"companies-establishments","official_name":"إصدار بطاقة مندوب علاقات عامة PRO","official_card_url":"https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/239","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-بطاقة-مندوب-علاقات-عامة-pro',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مركز خدمة","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-بطاقة-مندوب-علاقات-عامة-pro',(select id from public.hb_jurisdictions where code='AE'),'إصدار-بطاقة-مندوب-علاقات-عامة-pro',1,'active','{"id":"service:إصدار-بطاقة-مندوب-علاقات-عامة-pro","version":1,"name":"إصدار بطاقة مندوب علاقات عامة PRO","serviceSlug":"إصدار-بطاقة-مندوب-علاقات-عامة-pro","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مركز خدمة"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/239"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/239","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-بطاقة-مندوب-علاقات-عامة-pro',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إصدار-بطاقة-مندوب-علاقات-عامة-pro','service:إصدار-بطاقة-مندوب-علاقات-عامة-pro','assisted',true,'{"name":"إصدار بطاقة مندوب علاقات عامة PRO","category":"companies-establishments","emirate":"اتحادي","type":"ملفات المنشآت","officialUrl":"https://www.mohre.gov.ae/en/services/issuance-of-a-public-relations-officer-card-pro-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/239","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','التفويض الإلكتروني للمنشأة (بديل بطاقة التوقيع الإلكتروني) — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني","category":"companies-establishments","official_name":"التفويض الإلكتروني للمنشأة (بديل بطاقة التوقيع الإلكتروني)","official_card_url":"https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and"]},{"id":"special-cases","when":[],"effect":"review","reason":"تطبيق MOHRE","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني',(select id from public.hb_jurisdictions where code='AE'),'التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني',1,'active','{"id":"service:التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني","version":1,"name":"التفويض الإلكتروني للمنشأة (بديل بطاقة التوقيع الإلكتروني)","serviceSlug":"التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"تطبيق MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني','service:التفويض-الإلكتروني-للمنشأة-بديل-بطاقة-التوقيع-الإلكتروني','guidance',true,'{"name":"التفويض الإلكتروني للمنشأة (بديل بطاقة التوقيع الإلكتروني)","category":"companies-establishments","emirate":"اتحادي","type":"ملفات المنشآت","officialUrl":"https://www.mohre.gov.ae/en/media-center/news/9/2/2026/mohre-launches-range-of-services-eliminating-most-required-documents-in-person-visits-and","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','حصة تصاريح العمل للمنشأة — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"حصة-تصاريح-العمل-للمنشأة","category":"companies-establishments","official_name":"حصة تصاريح العمل للمنشأة","official_card_url":"https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/319","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:حصة-تصاريح-العمل-للمنشأة',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مركز خدمة","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:حصة-تصاريح-العمل-للمنشأة',(select id from public.hb_jurisdictions where code='AE'),'حصة-تصاريح-العمل-للمنشأة',1,'active','{"id":"service:حصة-تصاريح-العمل-للمنشأة","version":1,"name":"حصة تصاريح العمل للمنشأة","serviceSlug":"حصة-تصاريح-العمل-للمنشأة","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مركز خدمة"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/319"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/319","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('حصة-تصاريح-العمل-للمنشأة',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:حصة-تصاريح-العمل-للمنشأة','service:حصة-تصاريح-العمل-للمنشأة','assisted',true,'{"name":"حصة تصاريح العمل للمنشأة","category":"companies-establishments","emirate":"اتحادي","type":"ملفات المنشآت","officialUrl":"https://www.mohre.gov.ae/en/services/work-permit-quotas-for-establishments-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/319","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تقرير تقييم المنشأة — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تقرير-تقييم-المنشأة","category":"companies-establishments","official_name":"تقرير تقييم المنشأة","official_card_url":"https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تقرير-تقييم-المنشأة',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1"]},{"id":"special-cases","when":[],"effect":"review","reason":"تسهيل / تطبيق MOHRE / تقييم","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تقرير-تقييم-المنشأة',(select id from public.hb_jurisdictions where code='AE'),'تقرير-تقييم-المنشأة',1,'active','{"id":"service:تقرير-تقييم-المنشأة","version":1,"name":"تقرير تقييم المنشأة","serviceSlug":"تقرير-تقييم-المنشأة","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"تسهيل / تطبيق MOHRE / تقييم"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تقرير-تقييم-المنشأة',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تقرير-تقييم-المنشأة','service:تقرير-تقييم-المنشأة','guidance',true,'{"name":"تقرير تقييم المنشأة","category":"companies-establishments","emirate":"اتحادي","type":"ملفات المنشآت","officialUrl":"https://mohre.gov.ae/en/services/taqyeem.aspx?DisableResponsive=1","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصنيف المنشأة — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصنيف-المنشأة","category":"companies-establishments","official_name":"تصنيف المنشأة","official_card_url":"https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصنيف-المنشأة',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx"]},{"id":"special-cases","when":[],"effect":"review","reason":"دليل MOHRE لأصحاب العمل","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصنيف-المنشأة',(select id from public.hb_jurisdictions where code='AE'),'تصنيف-المنشأة',1,'active','{"id":"service:تصنيف-المنشأة","version":1,"name":"تصنيف المنشأة","serviceSlug":"تصنيف-المنشأة","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"دليل MOHRE لأصحاب العمل"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصنيف-المنشأة',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تصنيف-المنشأة','service:تصنيف-المنشأة','guidance',true,'{"name":"تصنيف المنشأة","category":"companies-establishments","emirate":"اتحادي","type":"ملفات المنشآت","officialUrl":"https://www.mohre.gov.ae/assets/download/9414d544/Awareness%20Guide%20for%20New%20Employers%20Companies%20-%20EN_639011571513592816.pdf.aspx","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إلغاء ملف أو بطاقة المنشأة — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-ملف-أو-بطاقة-المنشأة","category":"companies-establishments","official_name":"إلغاء ملف أو بطاقة المنشأة","official_card_url":"https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-ملف-أو-بطاقة-المنشأة',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مركز الاتصال 600590000","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-ملف-أو-بطاقة-المنشأة',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-ملف-أو-بطاقة-المنشأة',1,'active','{"id":"service:إلغاء-ملف-أو-بطاقة-المنشأة","version":1,"name":"إلغاء ملف أو بطاقة المنشأة","serviceSlug":"إلغاء-ملف-أو-بطاقة-المنشأة","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مركز الاتصال 600590000"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-ملف-أو-بطاقة-المنشأة',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إلغاء-ملف-أو-بطاقة-المنشأة','service:إلغاء-ملف-أو-بطاقة-المنشأة','guidance',true,'{"name":"إلغاء ملف أو بطاقة المنشأة","category":"companies-establishments","emirate":"اتحادي","type":"ملفات المنشآت","officialUrl":"https://mohre.gov.ae/en/media-center/news/6/3/2025/18-interactive-and-informational-phone-services-for-establishments-and-domestic-workers","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل جزئي — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/part-time-work-permit-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصريح-عمل-جزئي","category":"work-employees","official_name":"تصريح عمل جزئي","official_card_url":"https://mohre.gov.ae/en/services/part-time-work-permit-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصريح-عمل-جزئي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/part-time-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/part-time-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/part-time-work-permit-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصريح-عمل-جزئي',(select id from public.hb_jurisdictions where code='AE'),'تصريح-عمل-جزئي',1,'active','{"id":"service:تصريح-عمل-جزئي","version":1,"name":"تصريح عمل جزئي","serviceSlug":"تصريح-عمل-جزئي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/part-time-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/part-time-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصريح-عمل-جزئي',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تصريح-عمل-جزئي','service:تصريح-عمل-جزئي','assisted',true,'{"name":"تصريح عمل جزئي","category":"work-employees","emirate":"اتحادي","type":"تصاريح العمل","officialUrl":"https://mohre.gov.ae/en/services/part-time-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/184","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح عمل حدث — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/juvenile-work-permit-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصريح-عمل-حدث","category":"work-employees","official_name":"تصريح عمل حدث","official_card_url":"https://mohre.gov.ae/en/services/juvenile-work-permit-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/185","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصريح-عمل-حدث',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/juvenile-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/juvenile-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/juvenile-work-permit-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصريح-عمل-حدث',(select id from public.hb_jurisdictions where code='AE'),'تصريح-عمل-حدث',1,'active','{"id":"service:تصريح-عمل-حدث","version":1,"name":"تصريح عمل حدث","serviceSlug":"تصريح-عمل-حدث","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/juvenile-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/185"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/juvenile-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/185","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصريح-عمل-حدث',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تصريح-عمل-حدث','service:تصريح-عمل-حدث','assisted',true,'{"name":"تصريح عمل حدث","category":"work-employees","emirate":"اتحادي","type":"تصاريح العمل","officialUrl":"https://mohre.gov.ae/en/services/juvenile-work-permit-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/185","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تصريح تدريب وعمل طالب — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصريح-تدريب-وعمل-طالب","category":"work-employees","official_name":"تصريح تدريب وعمل طالب","official_card_url":"https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصريح-تدريب-وعمل-طالب',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصريح-تدريب-وعمل-طالب',(select id from public.hb_jurisdictions where code='AE'),'تصريح-تدريب-وعمل-طالب',1,'active','{"id":"service:تصريح-تدريب-وعمل-طالب","version":1,"name":"تصريح تدريب وعمل طالب","serviceSlug":"تصريح-تدريب-وعمل-طالب","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصريح-تدريب-وعمل-طالب',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تصريح-تدريب-وعمل-طالب','service:تصريح-تدريب-وعمل-طالب','assisted',true,'{"name":"تصريح تدريب وعمل طالب","category":"work-employees","emirate":"اتحادي","type":"تصاريح العمل","officialUrl":"https://mohre.gov.ae/en/services/training-and-work-permit-for-students-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/232","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تجديد تصريح العمل — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-تصريح-العمل","category":"work-employees","official_name":"تجديد تصريح العمل","official_card_url":"https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-تصريح-العمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / حزمة العمل","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-تصريح-العمل',(select id from public.hb_jurisdictions where code='AE'),'تجديد-تصريح-العمل',1,'active','{"id":"service:تجديد-تصريح-العمل","version":1,"name":"تجديد تصريح العمل","serviceSlug":"تجديد-تصريح-العمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / حزمة العمل"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-تصريح-العمل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تجديد-تصريح-العمل','service:تجديد-تصريح-العمل','assisted',true,'{"name":"تجديد تصريح العمل","category":"work-employees","emirate":"اتحادي","type":"تصاريح العمل","officialUrl":"https://www.mohre.gov.ae/en/services/issuancerenewal-of-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/70","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تعديل تصاريح وعقود العمل — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تعديل-تصاريح-وعقود-العمل","category":"work-employees","official_name":"تعديل تصاريح وعقود العمل","official_card_url":"https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022","execution_url":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/85","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تعديل-تصاريح-وعقود-العمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تعديل-تصاريح-وعقود-العمل',(select id from public.hb_jurisdictions where code='AE'),'تعديل-تصاريح-وعقود-العمل',1,'active','{"id":"service:تعديل-تصاريح-وعقود-العمل","version":1,"name":"تعديل تصاريح وعقود العمل","serviceSlug":"تعديل-تصاريح-وعقود-العمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/85"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/85","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تعديل-تصاريح-وعقود-العمل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تعديل-تصاريح-وعقود-العمل','service:تعديل-تصاريح-وعقود-العمل','assisted',true,'{"name":"تعديل تصاريح وعقود العمل","category":"work-employees","emirate":"اتحادي","type":"تصاريح العمل","officialUrl":"https://mohre.gov.ae/en/services/modification-of-work-permits-employment-contracts-2022","executionUrl":"https://eservices.mohre.gov.ae/TasheelWeb/services/transactionentry/85","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار عرض العمل ضمن طلب تصريح العمل — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل","category":"contracts-notarization","official_name":"إصدار عرض العمل ضمن طلب تصريح العمل","official_card_url":"https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / Work Bundle","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل',(select id from public.hb_jurisdictions where code='AE'),'إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل',1,'active','{"id":"service:إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل","version":1,"name":"إصدار عرض العمل ضمن طلب تصريح العمل","serviceSlug":"إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / Work Bundle"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل','service:إصدار-عرض-العمل-ضمن-طلب-تصريح-العمل','guidance',true,'{"name":"إصدار عرض العمل ضمن طلب تصريح العمل","category":"contracts-notarization","emirate":"اتحادي","type":"العقود","officialUrl":"https://mohre.gov.ae/en/guidance-and-awareness-portal-new/work-bundle","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','التسجيل والمتابعة في WPS — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"التسجيل-والمتابعة-في-wps","category":"work-employees","official_name":"التسجيل والمتابعة في WPS","official_card_url":"https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:التسجيل-والمتابعة-في-wps',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / وكيل دفع معتمد","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:التسجيل-والمتابعة-في-wps',(select id from public.hb_jurisdictions where code='AE'),'التسجيل-والمتابعة-في-wps',1,'active','{"id":"service:التسجيل-والمتابعة-في-wps","version":1,"name":"التسجيل والمتابعة في WPS","serviceSlug":"التسجيل-والمتابعة-في-wps","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / وكيل دفع معتمد"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('التسجيل-والمتابعة-في-wps',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:التسجيل-والمتابعة-في-wps','service:التسجيل-والمتابعة-في-wps','guidance',true,'{"name":"التسجيل والمتابعة في WPS","category":"work-employees","emirate":"اتحادي","type":"الأجور والتوطين","officialUrl":"https://www.mohre.gov.ae/en/guidance-and-awareness-portal-new/wages-protection-system","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','خدمات نافس للمنشآت — وزارة الموارد البشرية والتوطين (MOHRE)','https://nafis.gov.ae/employer','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"خدمات-نافس-للمنشآت","category":"work-employees","official_name":"خدمات نافس للمنشآت","official_card_url":"https://nafis.gov.ae/employer","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:خدمات-نافس-للمنشآت',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://nafis.gov.ae/employer"]},{"id":"special-cases","when":[],"effect":"review","reason":"منصة نافس / أصحاب العمل","actions":["review_special_cases"],"sourceRefs":["https://nafis.gov.ae/employer"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://nafis.gov.ae/employer' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:خدمات-نافس-للمنشآت',(select id from public.hb_jurisdictions where code='AE'),'خدمات-نافس-للمنشآت',1,'active','{"id":"service:خدمات-نافس-للمنشآت","version":1,"name":"خدمات نافس للمنشآت","serviceSlug":"خدمات-نافس-للمنشآت","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"منصة نافس / أصحاب العمل"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://nafis.gov.ae/employer","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://nafis.gov.ae/employer","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('خدمات-نافس-للمنشآت',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:خدمات-نافس-للمنشآت','service:خدمات-نافس-للمنشآت','guidance',true,'{"name":"خدمات نافس للمنشآت","category":"work-employees","emirate":"اتحادي","type":"الأجور والتوطين","officialUrl":"https://nafis.gov.ae/employer","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','ضمان أو تأمين العامل — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"ضمان-أو-تأمين-العامل","category":"work-employees","official_name":"ضمان أو تأمين العامل","official_card_url":"https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:ضمان-أو-تأمين-العامل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / معاملة تصريح العمل","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:ضمان-أو-تأمين-العامل',(select id from public.hb_jurisdictions where code='AE'),'ضمان-أو-تأمين-العامل',1,'active','{"id":"service:ضمان-أو-تأمين-العامل","version":1,"name":"ضمان أو تأمين العامل","serviceSlug":"ضمان-أو-تأمين-العامل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / معاملة تصريح العمل"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('ضمان-أو-تأمين-العامل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:ضمان-أو-تأمين-العامل','service:ضمان-أو-تأمين-العامل','guidance',true,'{"name":"ضمان أو تأمين العامل","category":"work-employees","emirate":"اتحادي","type":"الأجور والتوطين","officialUrl":"https://mohre.gov.ae/en/media-center/news/9/8/2022/ministry-of-human-resources-and-emiratisation-issues-resolution-on-bank-guarantees-and-employees-pro","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','بلاغ انقطاع عن العمل — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"بلاغ-انقطاع-عن-العمل","category":"work-employees","official_name":"بلاغ انقطاع عن العمل","official_card_url":"https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022","execution_url":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:بلاغ-انقطاع-عن-العمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:بلاغ-انقطاع-عن-العمل',(select id from public.hb_jurisdictions where code='AE'),'بلاغ-انقطاع-عن-العمل',1,'active','{"id":"service:بلاغ-انقطاع-عن-العمل","version":1,"name":"بلاغ انقطاع عن العمل","serviceSlug":"بلاغ-انقطاع-عن-العمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022","executionUrl":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022","executionUrl":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('بلاغ-انقطاع-عن-العمل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:بلاغ-انقطاع-عن-العمل','service:بلاغ-انقطاع-عن-العمل','assisted',true,'{"name":"بلاغ انقطاع عن العمل","category":"work-employees","emirate":"اتحادي","type":"الشكاوى والتسويات","officialUrl":"https://mohre.gov.ae/en/services/filing-a-labor-complaint-absence-from-work-2022","executionUrl":"https://backoffice.mohre.gov.ae/mohre.complaints.app/TwafouqAnonymous2/CallerVerification?lang=en","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إلغاء بلاغ انقطاع عن العمل — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-بلاغ-انقطاع-عن-العمل","category":"work-employees","official_name":"إلغاء بلاغ انقطاع عن العمل","official_card_url":"https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-بلاغ-انقطاع-عن-العمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-بلاغ-انقطاع-عن-العمل',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-بلاغ-انقطاع-عن-العمل',1,'active','{"id":"service:إلغاء-بلاغ-انقطاع-عن-العمل","version":1,"name":"إلغاء بلاغ انقطاع عن العمل","serviceSlug":"إلغاء-بلاغ-انقطاع-عن-العمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-بلاغ-انقطاع-عن-العمل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إلغاء-بلاغ-انقطاع-عن-العمل','service:إلغاء-بلاغ-انقطاع-عن-العمل','guidance',true,'{"name":"إلغاء بلاغ انقطاع عن العمل","category":"work-employees","emirate":"اتحادي","type":"الشكاوى والتسويات","officialUrl":"https://www.mohre.gov.ae/en/services/cancellation-of-an-absence-from-work-complaint-absconding-report-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إلغاء تصريح لعامل لديه قضية عمالية — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-تصريح-لعامل-لديه-قضية-عمالية","category":"work-employees","official_name":"إلغاء تصريح لعامل لديه قضية عمالية","official_card_url":"https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-تصريح-لعامل-لديه-قضية-عمالية',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-تصريح-لعامل-لديه-قضية-عمالية',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-تصريح-لعامل-لديه-قضية-عمالية',1,'active','{"id":"service:إلغاء-تصريح-لعامل-لديه-قضية-عمالية","version":1,"name":"إلغاء تصريح لعامل لديه قضية عمالية","serviceSlug":"إلغاء-تصريح-لعامل-لديه-قضية-عمالية","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-تصريح-لعامل-لديه-قضية-عمالية',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إلغاء-تصريح-لعامل-لديه-قضية-عمالية','service:إلغاء-تصريح-لعامل-لديه-قضية-عمالية','guidance',true,'{"name":"إلغاء تصريح لعامل لديه قضية عمالية","category":"work-employees","emirate":"اتحادي","type":"الشكاوى والتسويات","officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-work-permit-for-an-employee-with-a-labour-court-case","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار تصريح عمل جديد لعامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-تصريح-عمل-جديد-لعامل-مساعد","category":"work-employees","official_name":"إصدار تصريح عمل جديد لعامل مساعد","official_card_url":"https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-تصريح-عمل-جديد-لعامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مراكز تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-تصريح-عمل-جديد-لعامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'إصدار-تصريح-عمل-جديد-لعامل-مساعد',1,'active','{"id":"service:إصدار-تصريح-عمل-جديد-لعامل-مساعد","version":1,"name":"إصدار تصريح عمل جديد لعامل مساعد","serviceSlug":"إصدار-تصريح-عمل-جديد-لعامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مراكز تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-تصريح-عمل-جديد-لعامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إصدار-تصريح-عمل-جديد-لعامل-مساعد','service:إصدار-تصريح-عمل-جديد-لعامل-مساعد','guidance',true,'{"name":"إصدار تصريح عمل جديد لعامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/issuance-of-a-new-work-permit-domestic-workers-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إصدار عقد عمل جديد لعامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-عقد-عمل-جديد-لعامل-مساعد","category":"work-employees","official_name":"إصدار عقد عمل جديد لعامل مساعد","official_card_url":"https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-عقد-عمل-جديد-لعامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مراكز تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-عقد-عمل-جديد-لعامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'إصدار-عقد-عمل-جديد-لعامل-مساعد',1,'active','{"id":"service:إصدار-عقد-عمل-جديد-لعامل-مساعد","version":1,"name":"إصدار عقد عمل جديد لعامل مساعد","serviceSlug":"إصدار-عقد-عمل-جديد-لعامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مراكز تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-عقد-عمل-جديد-لعامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إصدار-عقد-عمل-جديد-لعامل-مساعد','service:إصدار-عقد-عمل-جديد-لعامل-مساعد','guidance',true,'{"name":"إصدار عقد عمل جديد لعامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/issuance-of-a-new-employment-contract-domestic-worker-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تجديد عقد عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-عقد-عمل-عامل-مساعد","category":"work-employees","official_name":"تجديد عقد عمل عامل مساعد","official_card_url":"https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-عقد-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مراكز تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-عقد-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'تجديد-عقد-عمل-عامل-مساعد',1,'active','{"id":"service:تجديد-عقد-عمل-عامل-مساعد","version":1,"name":"تجديد عقد عمل عامل مساعد","serviceSlug":"تجديد-عقد-عمل-عامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مراكز تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-عقد-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تجديد-عقد-عمل-عامل-مساعد','service:تجديد-عقد-عمل-عامل-مساعد','guidance',true,'{"name":"تجديد عقد عمل عامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/renewal-of-a-domestic-workers-employment-contract-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','تعديل عقد وتصريح عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تعديل-عقد-وتصريح-عمل-عامل-مساعد","category":"work-employees","official_name":"تعديل عقد وتصريح عمل عامل مساعد","official_card_url":"https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تعديل-عقد-وتصريح-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مراكز تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تعديل-عقد-وتصريح-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'تعديل-عقد-وتصريح-عمل-عامل-مساعد',1,'active','{"id":"service:تعديل-عقد-وتصريح-عمل-عامل-مساعد","version":1,"name":"تعديل عقد وتصريح عمل عامل مساعد","serviceSlug":"تعديل-عقد-وتصريح-عمل-عامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مراكز تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تعديل-عقد-وتصريح-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:تعديل-عقد-وتصريح-عمل-عامل-مساعد','service:تعديل-عقد-وتصريح-عمل-عامل-مساعد','guidance',true,'{"name":"تعديل عقد وتصريح عمل عامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/amendments-to-a-domestic-workers-employment-contract-and-work-permit-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إلغاء عقد عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-عقد-عمل-عامل-مساعد","category":"work-employees","official_name":"إلغاء عقد عمل عامل مساعد","official_card_url":"https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-عقد-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مراكز تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-عقد-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-عقد-عمل-عامل-مساعد',1,'active','{"id":"service:إلغاء-عقد-عمل-عامل-مساعد","version":1,"name":"إلغاء عقد عمل عامل مساعد","serviceSlug":"إلغاء-عقد-عمل-عامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مراكز تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-عقد-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إلغاء-عقد-عمل-عامل-مساعد','service:إلغاء-عقد-عمل-عامل-مساعد','guidance',true,'{"name":"إلغاء عقد عمل عامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-employment-contract-inside-or-outside-of-the-country-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','إلغاء تصريح عمل عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-تصريح-عمل-عامل-مساعد","category":"work-employees","official_name":"إلغاء تصريح عمل عامل مساعد","official_card_url":"https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-تصريح-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / مراكز تدبير","actions":["review_special_cases"],"sourceRefs":["https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-تصريح-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-تصريح-عمل-عامل-مساعد',1,'active','{"id":"service:إلغاء-تصريح-عمل-عامل-مساعد","version":1,"name":"إلغاء تصريح عمل عامل مساعد","serviceSlug":"إلغاء-تصريح-عمل-عامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / مراكز تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-تصريح-عمل-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:إلغاء-تصريح-عمل-عامل-مساعد','service:إلغاء-تصريح-عمل-عامل-مساعد','guidance',true,'{"name":"إلغاء تصريح عمل عامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://www.mohre.gov.ae/en/services/cancellation-of-a-domestic-workers-work-permit-inside-or-outside-of-the-country-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','بلاغ انقطاع عامل مساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"بلاغ-انقطاع-عامل-مساعد","category":"work-employees","official_name":"بلاغ انقطاع عامل مساعد","official_card_url":"https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:بلاغ-انقطاع-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:بلاغ-انقطاع-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'بلاغ-انقطاع-عامل-مساعد',1,'active','{"id":"service:بلاغ-انقطاع-عامل-مساعد","version":1,"name":"بلاغ انقطاع عامل مساعد","serviceSlug":"بلاغ-انقطاع-عامل-مساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('بلاغ-انقطاع-عامل-مساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:بلاغ-انقطاع-عامل-مساعد','service:بلاغ-انقطاع-عامل-مساعد','guidance',true,'{"name":"بلاغ انقطاع عامل مساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/absence-from-work-absconding-report-domestic-workers-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','سحب بلاغ انقطاع عامل مساعد من صاحب العمل — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل","category":"work-employees","official_name":"سحب بلاغ انقطاع عامل مساعد من صاحب العمل","official_card_url":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل',(select id from public.hb_jurisdictions where code='AE'),'سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل',1,'active','{"id":"service:سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل","version":1,"name":"سحب بلاغ انقطاع عامل مساعد من صاحب العمل","serviceSlug":"سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل','service:سحب-بلاغ-انقطاع-عامل-مساعد-من-صاحب-العمل','guidance',true,'{"name":"سحب بلاغ انقطاع عامل مساعد من صاحب العمل","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-employer-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'mohre','سحب بلاغ انقطاع بطلب العامل المساعد — وزارة الموارد البشرية والتوطين (MOHRE)','https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"سحب-بلاغ-انقطاع-بطلب-العامل-المساعد","category":"work-employees","official_name":"سحب بلاغ انقطاع بطلب العامل المساعد","official_card_url":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:سحب-بلاغ-انقطاع-بطلب-العامل-المساعد',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022"]},{"id":"special-cases","when":[],"effect":"review","reason":"MOHRE / تدبير","actions":["review_special_cases"],"sourceRefs":["https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='mohre' and source_url='https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:سحب-بلاغ-انقطاع-بطلب-العامل-المساعد',(select id from public.hb_jurisdictions where code='AE'),'سحب-بلاغ-انقطاع-بطلب-العامل-المساعد',1,'active','{"id":"service:سحب-بلاغ-انقطاع-بطلب-العامل-المساعد","version":1,"name":"سحب بلاغ انقطاع بطلب العامل المساعد","serviceSlug":"سحب-بلاغ-انقطاع-بطلب-العامل-المساعد","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"MOHRE / تدبير"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"mohre","officialUrl":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('سحب-بلاغ-انقطاع-بطلب-العامل-المساعد',(select id from public.hb_jurisdictions where code='AE'),'mohre','service:سحب-بلاغ-انقطاع-بطلب-العامل-المساعد','service:سحب-بلاغ-انقطاع-بطلب-العامل-المساعد','guidance',true,'{"name":"سحب بلاغ انقطاع بطلب العامل المساعد","category":"work-employees","emirate":"اتحادي","type":"العمالة المساعدة","officialUrl":"https://mohre.gov.ae/en/services/withdrawal-of-absconding-report-domestic-workers-the-domestic-worker-2022","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','بدل فاقد أو تالف للهوية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"بدل-فاقد-أو-تالف-للهوية","category":"identity-citizenship","official_name":"بدل فاقد أو تالف للهوية","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:بدل-فاقد-أو-تالف-للهوية',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP / مركز خدمة","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:بدل-فاقد-أو-تالف-للهوية',(select id from public.hb_jurisdictions where code='AE'),'بدل-فاقد-أو-تالف-للهوية',1,'active','{"id":"service:بدل-فاقد-أو-تالف-للهوية","version":1,"name":"بدل فاقد أو تالف للهوية","serviceSlug":"بدل-فاقد-أو-تالف-للهوية","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP / مركز خدمة"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('بدل-فاقد-أو-تالف-للهوية',(select id from public.hb_jurisdictions where code='AE'),'icp','service:بدل-فاقد-أو-تالف-للهوية','service:بدل-فاقد-أو-تالف-للهوية','guidance',true,'{"name":"بدل فاقد أو تالف للهوية","category":"identity-citizenship","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"هوية إماراتية","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5b","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تحديث بيانات الهوية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تحديث-بيانات-الهوية","category":"identity-citizenship","official_name":"تحديث بيانات الهوية","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تحديث-بيانات-الهوية',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تحديث-بيانات-الهوية',(select id from public.hb_jurisdictions where code='AE'),'تحديث-بيانات-الهوية',1,'active','{"id":"service:تحديث-بيانات-الهوية","version":1,"name":"تحديث بيانات الهوية","serviceSlug":"تحديث-بيانات-الهوية","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تحديث-بيانات-الهوية',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تحديث-بيانات-الهوية','service:تحديث-بيانات-الهوية','guidance',true,'{"name":"تحديث بيانات الهوية","category":"identity-citizenship","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"هوية إماراتية","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5c","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','الإعفاء من غرامة تأخير الهوية — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"الإعفاء-من-غرامة-تأخير-الهوية","category":"identity-citizenship","official_name":"الإعفاء من غرامة تأخير الهوية","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:الإعفاء-من-غرامة-تأخير-الهوية',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:الإعفاء-من-غرامة-تأخير-الهوية',(select id from public.hb_jurisdictions where code='AE'),'الإعفاء-من-غرامة-تأخير-الهوية',1,'active','{"id":"service:الإعفاء-من-غرامة-تأخير-الهوية","version":1,"name":"الإعفاء من غرامة تأخير الهوية","serviceSlug":"الإعفاء-من-غرامة-تأخير-الهوية","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('الإعفاء-من-غرامة-تأخير-الهوية',(select id from public.hb_jurisdictions where code='AE'),'icp','service:الإعفاء-من-غرامة-تأخير-الهوية','service:الإعفاء-من-غرامة-تأخير-الهوية','guidance',true,'{"name":"الإعفاء من غرامة تأخير الهوية","category":"identity-citizenship","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"هوية إماراتية","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5f","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','استرداد رسوم إصدار الهوية غير المكتمل — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"استرداد-رسوم-إصدار-الهوية-غير-المكتمل","category":"identity-citizenship","official_name":"استرداد رسوم إصدار الهوية غير المكتمل","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e","execution_url":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/depositRefund/376/request/step1?administrativeRegionId=1&withException=false","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:استرداد-رسوم-إصدار-الهوية-غير-المكتمل',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:استرداد-رسوم-إصدار-الهوية-غير-المكتمل',(select id from public.hb_jurisdictions where code='AE'),'استرداد-رسوم-إصدار-الهوية-غير-المكتمل',1,'active','{"id":"service:استرداد-رسوم-إصدار-الهوية-غير-المكتمل","version":1,"name":"استرداد رسوم إصدار الهوية غير المكتمل","serviceSlug":"استرداد-رسوم-إصدار-الهوية-غير-المكتمل","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/depositRefund/376/request/step1?administrativeRegionId=1&withException=false"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/depositRefund/376/request/step1?administrativeRegionId=1&withException=false","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('استرداد-رسوم-إصدار-الهوية-غير-المكتمل',(select id from public.hb_jurisdictions where code='AE'),'icp','service:استرداد-رسوم-إصدار-الهوية-غير-المكتمل','service:استرداد-رسوم-إصدار-الهوية-غير-المكتمل','assisted',true,'{"name":"استرداد رسوم إصدار الهوية غير المكتمل","category":"identity-citizenship","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"هوية إماراتية","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e5e","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/depositRefund/376/request/step1?administrativeRegionId=1&withException=false","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار تصريح إقامة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-تصريح-إقامة-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"إصدار تصريح إقامة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-تصريح-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-تصريح-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إصدار-تصريح-إقامة-عبر-icp-خارج-دبي',1,'active','{"id":"service:إصدار-تصريح-إقامة-عبر-icp-خارج-دبي","version":1,"name":"إصدار تصريح إقامة عبر ICP (خارج دبي)","serviceSlug":"إصدار-تصريح-إقامة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-تصريح-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إصدار-تصريح-إقامة-عبر-icp-خارج-دبي','service:إصدار-تصريح-إقامة-عبر-icp-خارج-دبي','guidance',true,'{"name":"إصدار تصريح إقامة عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الإقامة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار إقامة موظف في القطاع الخاص في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي","category":"residency-visas","official_name":"إصدار إقامة موظف في القطاع الخاص في دبي","official_card_url":"https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي',1,'active','{"id":"service:إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي","version":1,"name":"إصدار إقامة موظف في القطاع الخاص في دبي","serviceSlug":"إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي','service:إصدار-إقامة-موظف-في-القطاع-الخاص-في-دبي','guidance',true,'{"name":"إصدار إقامة موظف في القطاع الخاص في دبي","category":"residency-visas","emirate":"دبي","type":"الإقامة","officialUrl":"https://gdrfad.gov.ae/en/services/bf4095ea-56e2-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تجديد تصريح إقامة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-تصريح-إقامة-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"تجديد تصريح إقامة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-تصريح-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-تصريح-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تجديد-تصريح-إقامة-عبر-icp-خارج-دبي',1,'active','{"id":"service:تجديد-تصريح-إقامة-عبر-icp-خارج-دبي","version":1,"name":"تجديد تصريح إقامة عبر ICP (خارج دبي)","serviceSlug":"تجديد-تصريح-إقامة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-تصريح-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تجديد-تصريح-إقامة-عبر-icp-خارج-دبي','service:تجديد-تصريح-إقامة-عبر-icp-خارج-دبي','guidance',true,'{"name":"تجديد تصريح إقامة عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الإقامة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تعديل بيانات جميع أنواع الإقامة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي","category":"residency-visas","official_name":"تعديل بيانات جميع أنواع الإقامة في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي',1,'active','{"id":"service:تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي","version":1,"name":"تعديل بيانات جميع أنواع الإقامة في دبي","serviceSlug":"تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي','service:تعديل-بيانات-جميع-أنواع-الإقامة-في-دبي','guidance',true,'{"name":"تعديل بيانات جميع أنواع الإقامة في دبي","category":"residency-visas","emirate":"دبي","type":"الإقامة","officialUrl":"https://www.gdrfad.gov.ae/en/services/dff87d9f-b81d-11ed-5210-4cd98f768936","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تعديل الوضع داخل الدولة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تعديل-الوضع-داخل-الدولة-في-دبي","category":"residency-visas","official_name":"تعديل الوضع داخل الدولة في دبي","official_card_url":"https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تعديل-الوضع-داخل-الدولة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تعديل-الوضع-داخل-الدولة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تعديل-الوضع-داخل-الدولة-في-دبي',1,'active','{"id":"service:تعديل-الوضع-داخل-الدولة-في-دبي","version":1,"name":"تعديل الوضع داخل الدولة في دبي","serviceSlug":"تعديل-الوضع-داخل-الدولة-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تعديل-الوضع-داخل-الدولة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تعديل-الوضع-داخل-الدولة-في-دبي','service:تعديل-الوضع-داخل-الدولة-في-دبي','guidance',true,'{"name":"تعديل الوضع داخل الدولة في دبي","category":"residency-visas","emirate":"دبي","type":"الإقامة","officialUrl":"https://gdrfad.gov.ae/en/services/63c69432-585e-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي","category":"residency-visas","official_name":"تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي',1,'active','{"id":"service:تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي","version":1,"name":"تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي)","serviceSlug":"تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي','service:تغيير-الوضع-عبر-icp-ضمن-إصدار-الإقامة-خارج-دبي','guidance',true,'{"name":"تغيير الوضع عبر ICP ضمن إصدار الإقامة (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الإقامة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp","category":"residency-visas","official_name":"تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc","execution_url":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/serviceCards/1040?administrativeRegionId=1","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),'تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp',1,'active','{"id":"service:تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp","version":1,"name":"تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP","serviceSlug":"تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/serviceCards/1040?administrativeRegionId=1"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/serviceCards/1040?administrativeRegionId=1","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp','service:تصريح-بقاء-خارج-الدولة-لأكثر-من-6-أشهر-عبر-icp','assisted',true,'{"name":"تصريح بقاء خارج الدولة لأكثر من 6 أشهر عبر ICP","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الإقامة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e352d65ae59b00117383fc","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/serviceCards/1040?administrativeRegionId=1","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تقرير تفاصيل الإقامة عبر ICP — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تقرير-تفاصيل-الإقامة-عبر-icp","category":"justice-police","official_name":"تقرير تفاصيل الإقامة عبر ICP","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413","execution_url":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/others/guestRequestDetails/447/step1?administrativeRegionId=1&withException=false","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تقرير-تفاصيل-الإقامة-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تقرير-تفاصيل-الإقامة-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),'تقرير-تفاصيل-الإقامة-عبر-icp',1,'active','{"id":"service:تقرير-تفاصيل-الإقامة-عبر-icp","version":1,"name":"تقرير تفاصيل الإقامة عبر ICP","serviceSlug":"تقرير-تفاصيل-الإقامة-عبر-icp","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/others/guestRequestDetails/447/step1?administrativeRegionId=1&withException=false"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/others/guestRequestDetails/447/step1?administrativeRegionId=1&withException=false","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تقرير-تفاصيل-الإقامة-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تقرير-تفاصيل-الإقامة-عبر-icp','service:تقرير-تفاصيل-الإقامة-عبر-icp','assisted',true,'{"name":"تقرير تفاصيل الإقامة عبر ICP","category":"justice-police","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الإقامة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e353815ae59b0011738413","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/others/guestRequestDetails/447/step1?administrativeRegionId=1&withException=false","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تجديد إقامة أفراد الأسرة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-إقامة-أفراد-الأسرة-في-دبي","category":"family-sponsorship","official_name":"تجديد إقامة أفراد الأسرة في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-إقامة-أفراد-الأسرة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-إقامة-أفراد-الأسرة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تجديد-إقامة-أفراد-الأسرة-في-دبي',1,'active','{"id":"service:تجديد-إقامة-أفراد-الأسرة-في-دبي","version":1,"name":"تجديد إقامة أفراد الأسرة في دبي","serviceSlug":"تجديد-إقامة-أفراد-الأسرة-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-إقامة-أفراد-الأسرة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تجديد-إقامة-أفراد-الأسرة-في-دبي','service:تجديد-إقامة-أفراد-الأسرة-في-دبي','guidance',true,'{"name":"تجديد إقامة أفراد الأسرة في دبي","category":"family-sponsorship","emirate":"دبي","type":"إقامة الأسرة","officialUrl":"https://www.gdrfad.gov.ae/en/services/95222a46-56f2-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي","category":"family-sponsorship","official_name":"إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي',1,'active','{"id":"service:إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي","version":1,"name":"إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي","serviceSlug":"إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي','service:إصدار-إقامة-للوالدين-ضمن-الحالات-الإنسانية-في-دبي','guidance',true,'{"name":"إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي","category":"family-sponsorship","emirate":"دبي","type":"إقامة الأسرة","officialUrl":"https://www.gdrfad.gov.ae/en/services/f52024ec-b812-11ed-5210-4cd98f768936","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار إقامة للوالدين عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي","category":"family-sponsorship","official_name":"إصدار إقامة للوالدين عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي',1,'active','{"id":"service:إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي","version":1,"name":"إصدار إقامة للوالدين عبر ICP (خارج دبي)","serviceSlug":"إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي','service:إصدار-إقامة-للوالدين-عبر-icp-خارج-دبي','guidance',true,'{"name":"إصدار إقامة للوالدين عبر ICP (خارج دبي)","category":"family-sponsorship","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"إقامة الأسرة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار إقامة لمولود جديد في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-إقامة-لمولود-جديد-في-دبي","category":"family-sponsorship","official_name":"إصدار إقامة لمولود جديد في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","execution_url":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-إقامة-لمولود-جديد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-إقامة-لمولود-جديد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'إصدار-إقامة-لمولود-جديد-في-دبي',1,'active','{"id":"service:إصدار-إقامة-لمولود-جديد-في-دبي","version":1,"name":"إصدار إقامة لمولود جديد في دبي","serviceSlug":"إصدار-إقامة-لمولود-جديد-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-إقامة-لمولود-جديد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:إصدار-إقامة-لمولود-جديد-في-دبي','service:إصدار-إقامة-لمولود-جديد-في-دبي','assisted',true,'{"name":"إصدار إقامة لمولود جديد في دبي","category":"family-sponsorship","emirate":"دبي","type":"إقامة الأسرة","officialUrl":"https://www.gdrfad.gov.ae/en/services/bf409606-56e2-11ea-0320-0050569629e8","executionUrl":"https://smart.gdrfad.gov.ae/SmartChannels_Individual/Dashboard.aspx?Service=14aefa78-624c-4f8a-aee9-c6876fcc8b1a&Lang=ar-AE","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار إقامة لمولود جديد عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي","category":"family-sponsorship","official_name":"إصدار إقامة لمولود جديد عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي',1,'active','{"id":"service:إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي","version":1,"name":"إصدار إقامة لمولود جديد عبر ICP (خارج دبي)","serviceSlug":"إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي','service:إصدار-إقامة-لمولود-جديد-عبر-icp-خارج-دبي','guidance',true,'{"name":"إصدار إقامة لمولود جديد عبر ICP (خارج دبي)","category":"family-sponsorship","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"إقامة الأسرة","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e64","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار تأشيرة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-تأشيرة-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"إصدار تأشيرة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-تأشيرة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-تأشيرة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إصدار-تأشيرة-عبر-icp-خارج-دبي',1,'active','{"id":"service:إصدار-تأشيرة-عبر-icp-خارج-دبي","version":1,"name":"إصدار تأشيرة عبر ICP (خارج دبي)","serviceSlug":"إصدار-تأشيرة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-تأشيرة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إصدار-تأشيرة-عبر-icp-خارج-دبي','service:إصدار-تأشيرة-عبر-icp-خارج-دبي','guidance',true,'{"name":"إصدار تأشيرة عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إلغاء تأشيرة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-تأشيرة-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"إلغاء تأشيرة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-تأشيرة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-تأشيرة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-تأشيرة-عبر-icp-خارج-دبي',1,'active','{"id":"service:إلغاء-تأشيرة-عبر-icp-خارج-دبي","version":1,"name":"إلغاء تأشيرة عبر ICP (خارج دبي)","serviceSlug":"إلغاء-تأشيرة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-تأشيرة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إلغاء-تأشيرة-عبر-icp-خارج-دبي','service:إلغاء-تأشيرة-عبر-icp-خارج-دبي','guidance',true,'{"name":"إلغاء تأشيرة عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e63","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إلغاء إذن دخول أو تأشيرة صادرة من دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي","category":"residency-visas","official_name":"إلغاء إذن دخول أو تأشيرة صادرة من دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي',1,'active','{"id":"service:إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي","version":1,"name":"إلغاء إذن دخول أو تأشيرة صادرة من دبي","serviceSlug":"إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي','service:إلغاء-إذن-دخول-أو-تأشيرة-صادرة-من-دبي','guidance',true,'{"name":"إلغاء إذن دخول أو تأشيرة صادرة من دبي","category":"residency-visas","emirate":"دبي","type":"تأشيرات الدخول","officialUrl":"https://www.gdrfad.gov.ae/en/services/71e9f170-56c3-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تأشيرة زيارة قريب أو صديق لدخول واحد في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي","category":"residency-visas","official_name":"تأشيرة زيارة قريب أو صديق لدخول واحد في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي',1,'active','{"id":"service:تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي","version":1,"name":"تأشيرة زيارة قريب أو صديق لدخول واحد في دبي","serviceSlug":"تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي','service:تأشيرة-زيارة-قريب-أو-صديق-لدخول-واحد-في-دبي','guidance',true,'{"name":"تأشيرة زيارة قريب أو صديق لدخول واحد في دبي","category":"residency-visas","emirate":"دبي","type":"تأشيرات الدخول","officialUrl":"https://www.gdrfad.gov.ae/en/services/d551ce89-52e8-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي',1,'active','{"id":"service:تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي","version":1,"name":"تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)","serviceSlug":"تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي','service:تأشيرة-زيارة-قريب-أو-صديق-عبر-icp-خارج-دبي','guidance',true,'{"name":"تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تأشيرة سياحية لدخول واحد في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-سياحية-لدخول-واحد-في-دبي","category":"residency-visas","official_name":"تأشيرة سياحية لدخول واحد في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-سياحية-لدخول-واحد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-سياحية-لدخول-واحد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تأشيرة-سياحية-لدخول-واحد-في-دبي',1,'active','{"id":"service:تأشيرة-سياحية-لدخول-واحد-في-دبي","version":1,"name":"تأشيرة سياحية لدخول واحد في دبي","serviceSlug":"تأشيرة-سياحية-لدخول-واحد-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-سياحية-لدخول-واحد-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تأشيرة-سياحية-لدخول-واحد-في-دبي','service:تأشيرة-سياحية-لدخول-واحد-في-دبي','guidance',true,'{"name":"تأشيرة سياحية لدخول واحد في دبي","category":"residency-visas","emirate":"دبي","type":"تأشيرات الدخول","officialUrl":"https://www.gdrfad.gov.ae/en/services/f9e586fe-0642-11ec-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تأشيرة سياحية عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-سياحية-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"تأشيرة سياحية عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-سياحية-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-سياحية-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تأشيرة-سياحية-عبر-icp-خارج-دبي',1,'active','{"id":"service:تأشيرة-سياحية-عبر-icp-خارج-دبي","version":1,"name":"تأشيرة سياحية عبر ICP (خارج دبي)","serviceSlug":"تأشيرة-سياحية-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-سياحية-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تأشيرة-سياحية-عبر-icp-خارج-دبي','service:تأشيرة-سياحية-عبر-icp-خارج-دبي','guidance',true,'{"name":"تأشيرة سياحية عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp","category":"residency-visas","official_name":"إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd","execution_url":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/issueVisa/request/783/step1?administrativeRegionId=1&withException=false","review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),'إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp',1,'active','{"id":"service:إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp","version":1,"name":"إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP","serviceSlug":"إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/issueVisa/request/783/step1?administrativeRegionId=1&withException=false"}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/issueVisa/request/783/step1?administrativeRegionId=1&withException=false","executionMode":"direct-execution"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp','service:إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp','assisted',true,'{"name":"إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68f5bc968c587a0011cb16cd","executionUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/issueVisa/request/783/step1?administrativeRegionId=1&withException=false","fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تأشيرة استكشاف فرص عمل في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-استكشاف-فرص-عمل-في-دبي","category":"residency-visas","official_name":"تأشيرة استكشاف فرص عمل في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-استكشاف-فرص-عمل-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-استكشاف-فرص-عمل-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تأشيرة-استكشاف-فرص-عمل-في-دبي',1,'active','{"id":"service:تأشيرة-استكشاف-فرص-عمل-في-دبي","version":1,"name":"تأشيرة استكشاف فرص عمل في دبي","serviceSlug":"تأشيرة-استكشاف-فرص-عمل-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-استكشاف-فرص-عمل-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تأشيرة-استكشاف-فرص-عمل-في-دبي','service:تأشيرة-استكشاف-فرص-عمل-في-دبي','guidance',true,'{"name":"تأشيرة استكشاف فرص عمل في دبي","category":"residency-visas","emirate":"دبي","type":"تأشيرات الدخول","officialUrl":"https://www.gdrfad.gov.ae/en/services/2a679791-408a-11ed-4fe5-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي',1,'active','{"id":"service:تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي","version":1,"name":"تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي)","serviceSlug":"تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي','service:تأشيرة-استكشاف-فرص-عمل-عبر-icp-خارج-دبي','guidance',true,'{"name":"تأشيرة استكشاف فرص عمل عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تأشيرة استكشاف فرص تأسيس الأعمال في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي","category":"residency-visas","official_name":"تأشيرة استكشاف فرص تأسيس الأعمال في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي',1,'active','{"id":"service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي","version":1,"name":"تأشيرة استكشاف فرص تأسيس الأعمال في دبي","serviceSlug":"تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي','service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-في-دبي','guidance',true,'{"name":"تأشيرة استكشاف فرص تأسيس الأعمال في دبي","category":"residency-visas","emirate":"دبي","type":"تأشيرات الدخول","officialUrl":"https://www.gdrfad.gov.ae/en/services/957ca221-4083-11ed-4fe5-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي","category":"residency-visas","official_name":"تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي',1,'active','{"id":"service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي","version":1,"name":"تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي)","serviceSlug":"تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"executionMode":"official-bundle-selector"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي','service:تأشيرة-استكشاف-فرص-تأسيس-الأعمال-عبر-icp-خارج-دبي','guidance',true,'{"name":"تأشيرة استكشاف فرص تأسيس الأعمال عبر ICP (خارج دبي)","category":"residency-visas","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"تأشيرات الدخول","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e60","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تجديد إقامة موظف في القطاع الخاص في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي","category":"residency-visas","official_name":"تجديد إقامة موظف في القطاع الخاص في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي',1,'active','{"id":"service:تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي","version":1,"name":"تجديد إقامة موظف في القطاع الخاص في دبي","serviceSlug":"تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي','service:تجديد-إقامة-موظف-في-القطاع-الخاص-في-دبي','guidance',true,'{"name":"تجديد إقامة موظف في القطاع الخاص في دبي","category":"residency-visas","emirate":"دبي","type":"الإقامة","officialUrl":"https://www.gdrfad.gov.ae/en/services/95222a40-56f2-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي","category":"companies-establishments","official_name":"إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي',1,'active','{"id":"service:إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي","version":1,"name":"إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي","serviceSlug":"إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي','service:إصدار-بطاقة-منشأة-للقطاع-الخاص-أو-المنطقة-الحرة-في-دبي','guidance',true,'{"name":"إصدار بطاقة منشأة للقطاع الخاص أو المنطقة الحرة في دبي","category":"companies-establishments","emirate":"دبي","type":"المنشآت","officialUrl":"https://www.gdrfad.gov.ae/en/services/0bae0953-6749-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إصدار بطاقة منشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي","category":"companies-establishments","official_name":"إصدار بطاقة منشأة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي',1,'active','{"id":"service:إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي","version":1,"name":"إصدار بطاقة منشأة عبر ICP (خارج دبي)","serviceSlug":"إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي','service:إصدار-بطاقة-منشأة-عبر-icp-خارج-دبي','guidance',true,'{"name":"إصدار بطاقة منشأة عبر ICP (خارج دبي)","category":"companies-establishments","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"المنشآت","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6d","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تجديد بطاقة المنشأة في دبي لجميع الفئات — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات","category":"companies-establishments","official_name":"تجديد بطاقة المنشأة في دبي لجميع الفئات","official_card_url":"https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),'تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات',1,'active','{"id":"service:تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات","version":1,"name":"تجديد بطاقة المنشأة في دبي لجميع الفئات","serviceSlug":"تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات','service:تجديد-بطاقة-المنشأة-في-دبي-لجميع-الفئات','guidance',true,'{"name":"تجديد بطاقة المنشأة في دبي لجميع الفئات","category":"companies-establishments","emirate":"دبي","type":"المنشآت","officialUrl":"https://gdrfad.gov.ae/en/services/1fa970e9-5b9e-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تجديد بطاقة المنشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي","category":"companies-establishments","official_name":"تجديد بطاقة المنشأة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي',1,'active','{"id":"service:تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي","version":1,"name":"تجديد بطاقة المنشأة عبر ICP (خارج دبي)","serviceSlug":"تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي','service:تجديد-بطاقة-المنشأة-عبر-icp-خارج-دبي','guidance',true,'{"name":"تجديد بطاقة المنشأة عبر ICP (خارج دبي)","category":"companies-establishments","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"المنشآت","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6e","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات","category":"companies-establishments","official_name":"تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات","official_card_url":"https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),'تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات',1,'active','{"id":"service:تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات","version":1,"name":"تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات","serviceSlug":"تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات','service:تعديل-بيانات-بطاقة-المنشأة-في-دبي-لجميع-الفئات','guidance',true,'{"name":"تعديل بيانات بطاقة المنشأة في دبي لجميع الفئات","category":"companies-establishments","emirate":"دبي","type":"المنشآت","officialUrl":"https://www.gdrfad.gov.ae/en/services/1fa97110-5b9e-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي","category":"companies-establishments","official_name":"تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي',1,'active','{"id":"service:تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي","version":1,"name":"تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي)","serviceSlug":"تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي','service:تعديل-أو-إضافة-بيانات-بطاقة-المنشأة-عبر-icp-خارج-دبي','guidance',true,'{"name":"تعديل أو إضافة بيانات بطاقة المنشأة عبر ICP (خارج دبي)","category":"companies-establishments","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"المنشآت","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e70","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إلغاء بطاقة المنشأة في دبي لجميع الفئات — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات","category":"companies-establishments","official_name":"إلغاء بطاقة المنشأة في دبي لجميع الفئات","official_card_url":"https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),'إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات',1,'active','{"id":"service:إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات","version":1,"name":"إلغاء بطاقة المنشأة في دبي لجميع الفئات","serviceSlug":"إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات','service:إلغاء-بطاقة-المنشأة-في-دبي-لجميع-الفئات','guidance',true,'{"name":"إلغاء بطاقة المنشأة في دبي لجميع الفئات","category":"companies-establishments","emirate":"دبي","type":"المنشآت","officialUrl":"https://gdrfad.gov.ae/en/services/a58a973d-5b86-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','إلغاء بطاقة المنشأة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي","category":"companies-establishments","official_name":"إلغاء بطاقة المنشأة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي',1,'active','{"id":"service:إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي","version":1,"name":"إلغاء بطاقة المنشأة عبر ICP (خارج دبي)","serviceSlug":"إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي','service:إلغاء-بطاقة-المنشأة-عبر-icp-خارج-دبي','guidance',true,'{"name":"إلغاء بطاقة المنشأة عبر ICP (خارج دبي)","category":"companies-establishments","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"المنشآت","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e6f","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','الاستعلام عن غرامات ملف أو مكفول في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/fines-inquiry-service','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي","category":"justice-police","official_name":"الاستعلام عن غرامات ملف أو مكفول في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/fines-inquiry-service","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/fines-inquiry-service"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/fines-inquiry-service"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/fines-inquiry-service' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي',1,'active','{"id":"service:الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي","version":1,"name":"الاستعلام عن غرامات ملف أو مكفول في دبي","serviceSlug":"الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/fines-inquiry-service","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/fines-inquiry-service","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي','service:الاستعلام-عن-غرامات-ملف-أو-مكفول-في-دبي','guidance',true,'{"name":"الاستعلام عن غرامات ملف أو مكفول في دبي","category":"justice-police","emirate":"دبي","type":"الغرامات والتقارير","officialUrl":"https://www.gdrfad.gov.ae/en/fines-inquiry-service","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','سداد غرامات مخالفي قانون الإقامة في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي","category":"justice-police","official_name":"سداد غرامات مخالفي قانون الإقامة في دبي","official_card_url":"https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي',1,'active','{"id":"service:سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي","version":1,"name":"سداد غرامات مخالفي قانون الإقامة في دبي","serviceSlug":"سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي','service:سداد-غرامات-مخالفي-قانون-الإقامة-في-دبي','guidance',true,'{"name":"سداد غرامات مخالفي قانون الإقامة في دبي","category":"justice-police","emirate":"دبي","type":"الغرامات والتقارير","officialUrl":"https://www.gdrfad.gov.ae/en/services/a39eb4a3-5ba5-11ea-0320-0050569629e8","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي","category":"justice-police","official_name":"سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي)","official_card_url":"https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي',1,'active','{"id":"service:سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي","version":1,"name":"سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي)","serviceSlug":"سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي','service:سداد-غرامة-مخالفة-تأشيرة-أو-إقامة-عبر-icp-خارج-دبي','guidance',true,'{"name":"سداد غرامة مخالفة تأشيرة أو إقامة عبر ICP (خارج دبي)","category":"justice-police","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الغرامات والتقارير","officialUrl":"https://icp.gov.ae/en/services-details/?serviceid=68e73faf5ae59b00117389f1","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','متابعة حالة طلب أو ملف لدى GDRFA دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي","category":"justice-police","official_name":"متابعة حالة طلب أو ملف لدى GDRFA دبي","official_card_url":"https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US"]},{"id":"special-cases","when":[],"effect":"review","reason":"GDRFA Dubai","actions":["review_special_cases"],"sourceRefs":["https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي',1,'active','{"id":"service:متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي","version":1,"name":"متابعة حالة طلب أو ملف لدى GDRFA دبي","serviceSlug":"متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"GDRFA Dubai"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي','service:متابعة-حالة-طلب-أو-ملف-لدى-gdrfa-دبي','guidance',true,'{"name":"متابعة حالة طلب أو ملف لدى GDRFA دبي","category":"justice-police","emirate":"دبي","type":"الغرامات والتقارير","officialUrl":"https://smart.gdrfad.gov.ae/Public_Th/StatusInquiry_New.aspx?GdfraLocale=en-US","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE'),'icp','متابعة حالة طلب تأشيرة لدى ICP (خارج دبي) — الهيئة الاتحادية للهوية والجنسية والجمارك وأمن المنافذ (ICP)','https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking','official',
'2026-07-27T00:00:00Z'::timestamptz,true,'{"service_slug":"متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي","category":"justice-police","official_name":"متابعة حالة طلب تأشيرة لدى ICP (خارج دبي)","official_card_url":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),1,'2026-07-27T00:00:00Z'::timestamptz,'active',
'[{"id":"conditions","when":[],"effect":"review","reason":"غير موثق بعد","actions":["review_conditions"],"sourceRefs":["https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking"]},{"id":"special-cases","when":[],"effect":"review","reason":"ICP","actions":["review_special_cases"],"sourceRefs":["https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='icp' and source_url='https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking' limit 1)],
'service-matrix-review','2026-07-27T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي',1,'active','{"id":"service:متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي","version":1,"name":"متابعة حالة طلب تأشيرة لدى ICP (خارج دبي)","serviceSlug":"متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["intake"],"metadata":{"agent":"quality","conditions":"غير موثق بعد","specialCases":"ICP"}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"icp","officialUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-07-27T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي',(select id from public.hb_jurisdictions where code='AE'),'icp','service:متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي','service:متابعة-حالة-طلب-تأشيرة-لدى-icp-خارج-دبي','guidance',true,'{"name":"متابعة حالة طلب تأشيرة لدى ICP (خارج دبي)","category":"justice-police","emirate":"الإمارات الخاضعة لمسار ICP (خارج دبي)","type":"الغرامات والتقارير","officialUrl":"https://smartservices.icp.gov.ae/echannels/web/client/guest/index.html#/applicationTracking","executionUrl":null,"fees":"غير موثق بعد","duration":"غير موثق بعد","lastReviewed":"2026-07-27"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

insert into public.hb_policy_sources
(jurisdiction_id,authority_key,title,source_url,source_type,last_verified_at,active,metadata)
values((select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','إصدار الإقامة الخضراء لشريك أو مستثمر في دبي — الإدارة العامة للإقامة وشؤون الأجانب في دبي (GDRFA Dubai)','https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936','official',
'2026-08-10T00:00:00Z'::timestamptz,true,'{"service_slug":"green-residence-partner-investor-dubai","category":"residency-visas","official_name":"Issuing green residence permit (partner investor)","official_card_url":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936","execution_url":null,"review_result":"approved_for_user_navigation","functional_finding":"exact_service_card"}'::jsonb)
on conflict(authority_key,source_url) do update set
last_verified_at=greatest(public.hb_policy_sources.last_verified_at,excluded.last_verified_at),active=true;

insert into public.hb_policy_versions
(policy_key,jurisdiction_id,version,effective_from,status,rules,source_ids,reviewed_by,reviewed_at)
values('service:green-residence-partner-investor-dubai',(select id from public.hb_jurisdictions where code='AE-DU'),1,'2026-08-10T00:00:00Z'::timestamptz,'active',
'[{"id":"requirement:1","when":[],"effect":"review","reason":"صورة شخصية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"]},{"id":"requirement:2","when":[],"effect":"review","reason":"نسخة من جواز السفر بصلاحية لا تقل عن ستة أشهر","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"]},{"id":"requirement:3","when":[],"effect":"review","reason":"عقد شراكة أو عقد تأسيس أو عقد استثمار","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"]},{"id":"requirement:4","when":[],"effect":"review","reason":"الرخصة التجارية","actions":["collect_or_verify_requirement"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"]},{"id":"conditions","when":[],"effect":"review","reason":"مخصصة لشريك أو مستثمر في مشروع تجاري، وتتطلب مستند الشراكة أو الاستثمار والرخصة التجارية.","actions":["review_conditions"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"]},{"id":"special-cases","when":[],"effect":"review","reason":"لا تُستخدم لإقامة المستثمر الذهبية أو لإقامة موظف قطاع خاص؛ لكل منهما خدمة رسمية مستقلة.","actions":["review_special_cases"],"sourceRefs":["https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"]}]'::jsonb,array[(select id from public.hb_policy_sources where authority_key='gdrfa-dubai' and source_url='https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936' limit 1)],
'service-matrix-review','2026-08-10T00:00:00Z'::timestamptz)
on conflict(policy_key,jurisdiction_id,version) do update set
status='active',rules=excluded.rules,source_ids=excluded.source_ids,reviewed_at=excluded.reviewed_at;

insert into public.hb_workflow_templates
(workflow_key,jurisdiction_id,service_slug,version,status,definition,effective_from)
values('service:green-residence-partner-investor-dubai',(select id from public.hb_jurisdictions where code='AE-DU'),'green-residence-partner-investor-dubai',1,'active','{"id":"service:green-residence-partner-investor-dubai","version":1,"name":"إصدار الإقامة الخضراء لشريك أو مستثمر في دبي","serviceSlug":"green-residence-partner-investor-dubai","steps":[{"key":"intake","title":"تأكيد بيانات الطلب والحالة","taskType":"intake","assigneeType":"agent","metadata":{"agent":"intake"}},{"key":"requirement-1","title":"صورة شخصية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"}},{"key":"requirement-2","title":"نسخة من جواز السفر بصلاحية لا تقل عن ستة أشهر","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"}},{"key":"requirement-3","title":"عقد شراكة أو عقد تأسيس أو عقد استثمار","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"}},{"key":"requirement-4","title":"الرخصة التجارية","taskType":"requirement","assigneeType":"user","dependsOn":["intake"],"metadata":{"source":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936"}},{"key":"quality-review","title":"مراجعة اكتمال المستندات والمتطلبات","taskType":"review","assigneeType":"agent","dependsOn":["requirement-1","requirement-2","requirement-3","requirement-4"],"metadata":{"agent":"quality","conditions":"مخصصة لشريك أو مستثمر في مشروع تجاري، وتتطلب مستند الشراكة أو الاستثمار والرخصة التجارية.","specialCases":"لا تُستخدم لإقامة المستثمر الذهبية أو لإقامة موظف قطاع خاص؛ لكل منهما خدمة رسمية مستقلة."}},{"key":"execution-approval","title":"اعتماد الانتقال إلى مسار التنفيذ","taskType":"approval","assigneeType":"user","dependsOn":["quality-review"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"officialUrl":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936","executionUrl":null}},{"key":"external-execution","title":"تنفيذ أو متابعة الإجراء لدى الجهة المختصة","taskType":"external","assigneeType":"integration","dependsOn":["execution-approval"],"requiresApproval":true,"risk":{"externalSubmission":true},"metadata":{"authority":"gdrfa-dubai","officialUrl":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936","executionUrl":null,"executionMode":"official-service-card"}},{"key":"completion","title":"توثيق النتيجة وإغلاق المعاملة","taskType":"completion","assigneeType":"system","dependsOn":["external-execution"]}]}'::jsonb,'2026-08-10T00:00:00Z'::timestamptz)
on conflict(workflow_key,jurisdiction_id,version) do update set
status='active',definition=excluded.definition,service_slug=excluded.service_slug;

insert into public.hb_service_bindings
(service_slug,jurisdiction_id,authority_key,policy_key,workflow_key,execution_mode,active,metadata)
values('green-residence-partner-investor-dubai',(select id from public.hb_jurisdictions where code='AE-DU'),'gdrfa-dubai','service:green-residence-partner-investor-dubai','service:green-residence-partner-investor-dubai','guidance',true,'{"name":"إصدار الإقامة الخضراء لشريك أو مستثمر في دبي","category":"residency-visas","emirate":"دبي","type":"إصدار","officialUrl":"https://www.gdrfad.gov.ae/en/services/f52024c6-b812-11ed-5210-4cd98f768936","executionUrl":null,"fees":"200 درهم رسم تصريح الإقامة، و10 دراهم معرفة، و10 دراهم ابتكار، و500 درهم عند التقديم من داخل الدولة، و20 درهمًا للتوصيل. يزداد رسم الإصدار 100 درهم عن كل سنة تزيد على سنتين وفق البطاقة الرسمية.","duration":"48 ساعة وفق بطاقة الخدمة الرسمية.","lastReviewed":"2026-08-10"}'::jsonb)
on conflict(service_slug,jurisdiction_id) do update set
authority_key=excluded.authority_key,policy_key=excluded.policy_key,workflow_key=excluded.workflow_key,
execution_mode=excluded.execution_mode,active=true,metadata=excluded.metadata;

commit;