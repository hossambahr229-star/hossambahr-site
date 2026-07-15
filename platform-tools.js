(function(){
  'use strict';
  var data=window.HB_PLATFORM||{services:[],emirates:[]};
  var count=document.querySelector('#publishedCount');
  if(count)count.textContent=String(data.services.length);
  var goalMap={
    establish:{category:'تأسيس الشركات',label:'تأسيس شركة',page:'company-formation-dubai.html',requirements:['هوية أو جواز الشركاء','النشاط والشكل القانوني','خيارات الاسم التجاري']},
    modify:{category:'تعديل الشركات',label:'تعديل شركة أو رخصة',page:'index.html?q=تعديل#discover',requirements:['الرخصة الحالية','وثائق الشركاء أو المدير','قرار التعديل والموافقات']},
    renew:{category:'التجديد والإلغاء',label:'تجديد الرخصة',page:'license-renewal-uae.html',requirements:['الرخصة الحالية','عقد المقر الساري','تسوية المخالفات والموافقات']},
    close:{category:'التجديد والإلغاء',label:'إلغاء أو تصفية شركة',page:'company-liquidation-uae.html',requirements:['قرار الشركاء','تسوية العمال والإقامات','براءات الذمة والإعلان حسب الشكل القانوني']},
    work:{category:'العمل والموظفون',label:'خدمات الموظفين وتصاريح العمل',page:'work-permit-uae.html',requirements:['ملف منشأة ساري','جواز الموظف','عرض أو عقد العمل']},
    residence:{category:'الإقامة والهوية',label:'الإقامة والهوية والتأشيرات',page:'residency-identity-dubai.html',requirements:['جواز ساري','صورة شخصية','بيانات الكفيل أو المنشأة']},
    tax:{category:'الضرائب والامتثال',label:'الضرائب والامتثال',page:'corporate-tax-registration-uae.html',requirements:['الرخصة ووثائق التأسيس','بيانات الملاك والمخول','بيانات النشاط والفترة المالية']},
    document:{category:'التوثيق الدولي',label:'تصديق مستند',page:'knowledge-hub.html#international',requirements:['أصل المستند','تصديقات بلد الإصدار','تحديد بلد الاستخدام']},
    education:{category:'معادلة الشهادات',label:'معادلة أو اعتراف بشهادة',page:'knowledge-hub.html#education',requirements:['الشهادة النهائية','كشف الدرجات','التصديقات والترجمة عند الحاجة']}
  };
  var selector=document.querySelector('#serviceSelector');
  selector&&selector.addEventListener('submit',function(event){
    event.preventDefault();
    var type=document.querySelector('#customerType').value,goal=document.querySelector('#serviceGoal').value,emirate=document.querySelector('#serviceEmirate').value,config=goalMap[goal];
    if(!type||!config||!emirate)return;
    var matches=data.services.filter(function(item){return item.category===config.category&&(item.emirate===emirate||item.emirate==='اتحادي')});
    var primary=matches[0],local=data.emirates.find(function(item){return item.name===emirate});
    var official=primary&&primary.url||local&&local.url||config.page;
    var authority=primary&&primary.authority||local&&local.authority||'الجهة المختصة في الإمارة';
    var team='https://wa.me/971503780460?text='+encodeURIComponent('مرحباً، أريد تحديد وتجهيز خدمة: '+config.label+' — الفئة: '+(type==='company'?'شركة':'فرد')+' — الإمارة: '+emirate);
    document.querySelector('#selectorResult').innerHTML='<span>الخدمة الأقرب إلى هدفك</span><h3>'+config.label+' في '+emirate+'</h3><p>ابدأ بتجهيز الأساسيات، ثم راجع التفاصيل الدقيقة قبل رفع أي مستند.</p><dl><div><dt>الجهة المرجحة</dt><dd>'+authority+'</dd></div><div><dt>المسارات المتاحة</dt><dd>'+(matches.length||1)+' مسار</dd></div></dl><ul>'+config.requirements.map(function(x){return'<li>'+x+'</li>'}).join('')+'</ul><div class="actions"><a href="'+config.page+'">افتح دليل التجهيز ←</a><a href="'+official+'" '+(official.indexOf('http')===0?'target="_blank" rel="noopener nofollow"':'')+'>المسار الرسمي ↗</a><a href="'+team+'" target="_blank" rel="noopener">اطلب التنفيذ من فريقنا</a></div>';
  });
  var fees={
    corporate:{label:'التسجيل في ضريبة الشركات',government:0,note:'الخدمة الحكومية مجانية وفق بطاقة FTA؛ قد توجد أتعاب تجهيز منفصلة.',source:'https://tax.gov.ae/ar/services/corporate.tax.registration.aspx'},
    vat:{label:'التسجيل في ضريبة القيمة المضافة',government:0,note:'الخدمة الحكومية مجانية وفق بطاقة FTA؛ لا يشمل ذلك أتعاب المحاسب أو التجهيز.',source:'https://tax.gov.ae/ar/services/vat.registration.aspx'},
    attestation:{label:'تصديق مستند شخصي لدى وزارة الخارجية',government:150,note:'رسم المستند الشخصي المنشور؛ قد تضاف رسوم توصيل أو قناة.',source:'https://www.mofa.gov.ae/services/attestation'},
    equivalency:{label:'معادلة شهادة ثانوية من خارج الإمارات',government:50,note:'الرسم المنشور للخدمة الأساسية؛ قد تضاف تكاليف تصديق أو ترجمة.',source:'https://moe.gov.ae/en/eservices/servicecard/Pages/CertEquivalent-Out.aspx'},
    tempPermit:{label:'تصريح عمل مؤقت',government:50,note:'رسم الطلب الاتحادي المنشور في بيانات المنصة؛ قد تضاف رسوم إصدار أو قناة حسب الحالة.',source:'https://www.mohre.gov.ae/en/services/temporary-work-permits-2022'},
    residenceRenewal:{label:'تجديد تصريح إقامة — سنة واحدة (تقدير أساسي)',government:300,note:'100 طلب + 100 إصدار لسنة + 100 خدمة ذكية؛ لا يشمل الهوية أو الفحص أو التأمين أو رسوم الحالة.',source:'https://icp.gov.ae/en/services-details/?serviceid=64afe3c1035448005bd52e66'},
    variable:{label:'تأسيس أو تجديد رخصة تجارية',government:null,note:'الرسوم تتغير حسب الإمارة والنشاط والشكل القانوني والموافقات؛ اطلب عرضًا رسميًا قبل الحساب.',source:'uae-service-catalog.html'}
  };
  var feeSelect=document.querySelector('#feeService');
  if(feeSelect)Object.keys(fees).forEach(function(key){var option=document.createElement('option');option.value=key;option.textContent=fees[key].label;feeSelect.appendChild(option)});
  var calculator=document.querySelector('#feeCalculator');
  calculator&&calculator.addEventListener('submit',function(event){event.preventDefault();var item=fees[feeSelect.value];if(!item)return;var service=Math.max(0,Number(document.querySelector('#platformFee').value)||0),gov=item.government;document.querySelector('#governmentFee').textContent=gov===null?'يتطلب عرضًا رسميًا':gov.toLocaleString('ar-AE')+' درهم';document.querySelector('#serviceFee').textContent=service.toLocaleString('ar-AE')+' درهم';document.querySelector('#totalFee').textContent=gov===null?'بعد استلام الرسم الحكومي':(gov+service).toLocaleString('ar-AE')+' درهم';document.querySelector('#feeNote').textContent=item.note;var link=document.querySelector('#feeSource');link.href=item.source;link.hidden=false;});
  var tracking=document.querySelector('#trackingForm');
  tracking&&tracking.addEventListener('submit',function(event){event.preventDefault();var value=document.querySelector('#trackingValue').value.trim();if(!value)return;var link=document.querySelector('#trackingWhatsapp');link.href='https://wa.me/971503780460?text='+encodeURIComponent('مرحباً، أريد متابعة الطلب: '+value);link.textContent='تابع الطلب '+value+' عبر واتساب ←';});
})();
