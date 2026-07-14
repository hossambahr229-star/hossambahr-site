(function(){
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
  var grid=document.querySelector('#directoryGrid');
  var tabs=document.querySelector('#directoryTabs');
  var search=document.querySelector('#directorySearch');
  var count=document.querySelector('#directoryCount');
  var group='الكل';
  var groups=['الكل'];
  config.items.forEach(function(item){if(groups.indexOf(item[0])===-1)groups.push(item[0]);});
  function drawTabs(){
    tabs.innerHTML=groups.map(function(name){return '<button class="'+(name===group?'active':'')+'" data-group="'+name+'">'+name+'</button>';}).join('');
    Array.prototype.forEach.call(tabs.querySelectorAll('button'),function(button){button.onclick=function(){group=button.getAttribute('data-group');drawTabs();draw();};});
  }
  function draw(){
    var query=search.value.trim().toLowerCase();
    var list=config.items.filter(function(item){return (group==='الكل'||item[0]===group)&&(!query||item.join(' ').toLowerCase().indexOf(query)!==-1);});
    count.textContent=list.length+' خدمة ومعاملة';
    grid.innerHTML=list.map(function(item){
      var message=encodeURIComponent('مرحباً، أود الاستفسار عن خدمة: '+item[1]+' ('+item[2]+')');
      var source=officialSource(item);
      return '<article class="directory-card"><small>'+item[0]+'</small><h2>'+item[1]+'</h2><p>'+item[3]+'</p><div class="directory-meta"><span><b>الجهة:</b> '+item[2]+'</span><span><b>القناة المعتادة:</b> '+item[4]+'</span></div><div class="directory-actions"><a href="https://wa.me/971503780460?text='+message+'" target="_blank" rel="noopener">اطلب مراجعة المتطلبات ←</a><a href="'+source+'" target="_blank" rel="noopener nofollow">المصدر الرسمي ↗</a></div></article>';
    }).join('')||'<p class="directory-empty">لا توجد نتيجة مطابقة. جرّب اسماً آخر أو تواصل معنا لمراجعة النشاط.</p>';
  }
  search.oninput=draw;
  drawTabs();
  draw();
})();
