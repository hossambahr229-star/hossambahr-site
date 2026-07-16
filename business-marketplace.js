(function(){
  'use strict';
  var categories=[
    {name:'الأختام واللوحات',code:'ST',description:'أختام المنشأة واللوحات الداخلية والخارجية وفق المتطلبات المحلية.'},
    {name:'التصميم والمواقع الإلكترونية',code:'WEB',description:'هوية بصرية وموقع تعريفي أو متجر وحلول حضور رقمي للشركة.'},
    {name:'المحاسبة والضرائب',code:'ACC',description:'مسك الدفاتر والتسجيلات والإقرارات والاستعداد للامتثال.'},
    {name:'التأمين الطبي',code:'INS',description:'تحديد احتياج المالك أو الموظفين وطلب خيارات مناسبة.'},
    {name:'أجهزة الحضور والبصمة',code:'BIO',description:'حلول حضور وانصراف وربطها بإدارة الموظفين.'},
    {name:'كاميرات المراقبة',code:'CCTV',description:'تقييم وتجهيز أنظمة المراقبة مع مراعاة الموافقات المطلوبة.'},
    {name:'الأثاث وتجهيز المكاتب',code:'OFF',description:'تجهيز المقر بالأثاث والاحتياجات التشغيلية الأساسية.'},
    {name:'الترجمة القانونية',code:'TR',description:'ترجمة العقود والشهادات والمستندات على يد جهة مؤهلة.'}
  ];
  var grid=document.querySelector('#marketGrid'),select=document.querySelector('#marketCategory');
  categories.forEach(function(item,index){var card=document.createElement('article');card.className='market-card';card.innerHTML='<i>'+item.code+'</i><h3>'+item.name+'</h3><p>'+item.description+'</p><small>استقبال الطلبات متاح · السعر بعد تحديد النطاق</small><button type="button" data-index="'+index+'">اطلب عرضاً</button>';grid.appendChild(card);var option=document.createElement('option');option.value=item.name;option.textContent=item.name;select.appendChild(option)});
  grid.addEventListener('click',function(event){var button=event.target.closest('button[data-index]');if(!button)return;select.value=categories[Number(button.dataset.index)].name;document.querySelector('#marketRequest').scrollIntoView({behavior:'smooth'});document.querySelector('#marketEmirate').focus()});
  document.querySelector('#marketForm').addEventListener('submit',function(event){event.preventDefault();var category=select.value,emirate=document.querySelector('#marketEmirate').value,need=document.querySelector('#marketNeed').value.trim();if(!category||!emirate)return;var text='مرحباً، أريد عرضاً لخدمة '+category+' في '+emirate+(need?' — التفاصيل: '+need:'');window.open('https://wa.me/971503780460?text='+encodeURIComponent(text),'_blank','noopener')});
})();
