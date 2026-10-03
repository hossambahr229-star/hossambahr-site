-- Ground the ICP five-year multiple-entry tourist visa from the current official service card.
update public.hb_policy_versions
set rules = '[
 {"id":"requirement-passport","when":[],"effect":"require","reason":"جواز سفر صالح لمدة لا تقل عن 6 أشهر","actions":["collect_document"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"requirement-photo","when":[],"effect":"require","reason":"صورة شخصية","actions":["collect_document"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"requirement-bank-statement","when":[],"effect":"require","reason":"شهادة أو كشف مصرفي يثبت توافر رصيد 4,000 دولار أمريكي أو ما يعادله خلال الأشهر الستة السابقة على تقديم الطلب","actions":["collect_document"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"requirement-return-ticket","when":[],"effect":"require","reason":"تذكرة عودة","actions":["collect_document"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"requirement-identity-specific-nationalities","when":[],"effect":"require","reason":"صورة من وثيقة الهوية الشخصية للحالات التي تطلبها بطاقة الخدمة لبعض الجنسيات (أفغانستان / إيران / العراق)","actions":["collect_document"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"requirement-accommodation","when":[],"effect":"require","reason":"إثبات مكان الإقامة أثناء البقاء في الدولة","actions":["collect_document"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"conditions","when":[],"effect":"review","reason":"يشترط تأمين صحي صادر داخل الإمارات لمدة 180 يومًا، وجواز صالح لمدة لا تقل عن 6 أشهر، وألا تتجاوز الإقامة 90 يومًا في السنة الواحدة وفق بطاقة الخدمة، مع إمكانية التمديد ضمن الحد الإجمالي المقرر.","actions":["review_conditions"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"fees","when":[],"effect":"review","reason":"الرسوم المنشورة حاليًا: 100 درهم رسوم طلب، 500 درهم إصدار التأشيرة متعددة الدخول لمدة 5 سنوات، 100 درهم خدمات ذكية، 3000 درهم ضمان مالي، و20 درهم رسم إيداع الضمان المالي.","actions":["review_fees"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"duration","when":[],"effect":"review","reason":"مدة إتمام الخدمة المنشورة: يومان بعد استيفاء المتطلبات.","actions":["review_duration"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]},
 {"id":"special-cases","when":[],"effect":"review","reason":"الخدمة اتحادية عبر ICP للتأشيرة السياحية متعددة الدخول طويلة الأمد لمدة 5 سنوات.","actions":["review_special_cases"],"sourceRefs":["https://icp.gov.ae/services-details/?serviceid=68f5bc968c587a0011cb16cd"]}
]'::jsonb
where policy_key='service:إصدار-تأشيرة-سياحية-متعددة-الدخول-لمدة-5-سنوات-عبر-icp'
  and status='active';
