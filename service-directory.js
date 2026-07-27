(function(){
  if(!document.querySelector('link[href="search-fixes.css"]'))document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="search-fixes.css">');
  var key=document.body.getAttribute('data-directory');
  var config=window.HB_DIRECTORIES[key];
  if(!config)return;
  var approvalSources=[
    [/SIRA|أمن/,'https://www.sira.gov.ae/en/services'],
    [/دفاع مدني|DCD/,'https://www.dcd.gov.ae/portal/en/services.jsp'],
    [/بلدية دبي|بلدية/,'https://www.dm.gov.ae/dubai-municipality-services/'],
    [/DHA|الصحة بدبي/,'https://dha.gov.ae/en/dubai-health-licensing-system-shreyan'],
    [/KHDA/,'https://web.khda.gov.ae/en/Services'],
    [/RERA|DLD|الأراضي والأملاك/,'https://dubailand.gov.ae/en/eservices/'],
    [/DCAA|GCAA/,'https://www.dcaa.gov.ae/services/'],
    [/TDRA/,'https://tdra.gov.ae/en/services'],
    [/VARA/,'https://www.vara.ae/en/licenses-and-register/licence-applications/'],
    [/جمارك دبي/,'https://www.dubaicustoms.gov.ae/en/eServices/Pages/default.aspx'],
    [/سلطة دبي البحرية|PCFC/,'https://pcfc.ae/en/Pages/servicelists.aspx?BU=Dubai+Maritime+Authority'],
    [/MoIAT|الصناعة والتكنولوجيا/,'https://moiat.gov.ae/en/services'],
    [/CDA|تنمية المجتمع/,'https://www.cda.gov.ae/en/Pages/default.aspx'],
    [/مجلس دبي الرياضي/,'https://www.dubaisc.ae/'],
    [/مجلس الإمارات للإعلام/,'https://uaemc.gov.ae/media-services/'],
    [/الثقافة والفنون|دبي للثقافة/,'https://dubaiculture.gov.ae/'],
    [/IACAD|الشؤون الإسلامية/,'https://www.iacad.gov.ae/'],
    [/سلطة المنطقة المختصة|المناطق الخاصة/,'https://www.investindubai.gov.ae/en/business-setup/free-zone-companies'],
    [/RTA|الطرق والمواصلات/,'https://rta.ae/wps/portal/rta/ae/corporate-services'],
    [/DET|الاقتصاد والسياحة/,'https://www.dubaidet.gov.ae/en/our-services/']
  ];
  function officialSource(item){
    if(item[5])return item[5];
    if(key==='mohre')return item.join(' ').indexOf('حزمة العمل')!==-1?config.extra:'https://mohre.gov.ae/en/services/services-directory';
    if(key==='residency'){
      var details=item[2]+' '+item[4];
      if(details.indexOf('GDRFA')!==-1)return 'https://www.gdrfad.gov.ae/en/services';
      if(details.indexOf('ICP')!==-1)return 'https://icp.gov.ae/en/services/interactive-services/';
    }
    if(key==='approvals'){
      if(item[0]==='التراخيص الاقتصادية')return 'https://www.investindubai.gov.ae/en/business-setup/business-setup-services';
      var details=item[0]+' '+item[1]+' '+item[2]+' '+item[4];
      for(var i=0;i<approvalSources.length;i++)if(approvalSources[i][0].test(details))return approvalSources[i][1];
    }
    return config.source;
  }
  function hasApprovedExactSource(item){
    if(!item[5])return false;
    if(key==='mohre')return true;
    if(key==='residency')return [
      'إصدار هوية جديدة',
      'تجديد الهوية الإماراتية',
      'بدل فاقد أو تالف للهوية',
      'تحديث بيانات الهوية',
      'الإعفاء من غرامة تأخير الهوية',
      'استرداد رسوم إصدار الهوية غير المكتمل',
      'إلغاء جميع أنواع تصاريح الإقامة الصادرة من دبي',
      'إصدار إقامة لأفراد الأسرة في دبي',
      'تجديد إقامة أفراد الأسرة في دبي',
      'إصدار الإقامة الذهبية للمستثمرين في دبي',
      'تجديد إقامة موظف في القطاع الخاص في دبي'
    ].indexOf(item[1])!==-1;
    return false;
  }
  var publicItems=config.items.filter(hasApprovedExactSource);
  var grid=document.querySelector('#directoryGrid');
  var tabs=document.querySelector('#directoryTabs');
  var search=document.querySelector('#directorySearch');
  var count=document.querySelector('#directoryCount');
  var group='الكل';
  var incomingQuery=new URLSearchParams(location.search).get('q');
  if(incomingQuery)search.value=incomingQuery;
  function normalize(value){return String(value||'').toLowerCase().normalize('NFKD').replace(/[ًٌٍَُِّْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
  var searchStops=['اريد','احتاج','ابغي','عايز','كيف','خدمه','معامله','اجراء','غير','معروف','معروفه','في','من','على','عن','لي'];
  function matchesQuery(item,value){var tokens=normalize(value).split(' ').filter(function(x){return x.length>1&&searchStops.indexOf(x)===-1;});var text=normalize(item.join(' '));if(!tokens.length)return!normalize(value);var matched=tokens.filter(function(token){return text.indexOf(token)!==-1;}).length;return matched>=Math.max(1,Math.ceil(tokens.length*.5));}
  var groups=['الكل'];
  publicItems.forEach(function(item){if(groups.indexOf(item[0])===-1)groups.push(item[0]);});
  function drawTabs(){
    tabs.innerHTML=groups.map(function(name){return '<button class="'+(name===group?'active':'')+'" data-group="'+name+'">'+name+'</button>';}).join('');
    Array.prototype.forEach.call(tabs.querySelectorAll('button'),function(button){button.onclick=function(){group=button.getAttribute('data-group');drawTabs();draw();};});
  }
  function draw(){
    var query=search.value.trim();
    var list=publicItems.filter(function(item){return (group==='الكل'||item[0]===group)&&matchesQuery(item,query);});
    var exact=list.length>0;
    var suggestions=exact?list:publicItems.filter(function(item){return group==='الكل'||item[0]===group;}).slice(0,6);
    count.textContent=exact?list.length+' خدمة ومعاملة':'اقتراحات قريبة لمساعدتك';
    var rescue=exact?'':'<article class="directory-rescue"><h2>لم نتركك دون نتيجة</h2><p>اعرض كل المعاملات أو أرسل وصف هدفك لنحدد الجهة والخدمة الصحيحة.</p><div><button type="button" data-directory-reset>عرض جميع المعاملات</button><a href="https://wa.me/971503780460?text='+encodeURIComponent('مرحباً، أبحث عن معاملة: '+query)+'" target="_blank" rel="noopener">أرسل هدفك عبر واتساب</a></div></article>';
    grid.innerHTML=rescue+suggestions.map(function(item){
      var message=encodeURIComponent('مرحباً، أود الاستفسار عن خدمة: '+item[1]+' ('+item[2]+')');
      var source=officialSource(item);
      var officialAction='<a href="'+source+'" target="_blank" rel="noopener nofollow">المسار الرسمي الدقيق ↗</a>';
      return '<article class="directory-card"><small>'+item[0]+'</small><h2>'+item[1]+'</h2><p>'+item[3]+'</p><div class="directory-meta"><span><b>الجهة:</b> '+item[2]+'</span><span><b>القناة المعتادة:</b> '+item[4]+'</span></div><div class="directory-actions"><a href="https://wa.me/971503780460?text='+message+'" target="_blank" rel="noopener">اطلب مراجعة المتطلبات ←</a>'+officialAction+'</div></article>';
    }).join('');
  }
  search.oninput=draw;
  grid.addEventListener('click',function(event){if(event.target.closest('[data-directory-reset]')){search.value='';group='الكل';drawTabs();draw();search.focus();}});
  drawTabs();
  draw();
})();
