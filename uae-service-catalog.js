(function(){
  'use strict';
  if(!document.querySelector('link[href="search-fixes.css"]'))document.head.insertAdjacentHTML('beforeend','<link rel="stylesheet" href="search-fixes.css">');
  var data=window.HB_PLATFORM||{services:[]};
  var query=document.querySelector('#catalogQuery');
  var emirate=document.querySelector('#catalogEmirate');
  var category=document.querySelector('#catalogCategory');
  var grid=document.querySelector('#catalogGrid');
  var count=document.querySelector('#catalogCount');
  var more=document.querySelector('#catalogMore');
  var limit=18;
  var stops=['اريد','احتاج','ابغي','عايز','كيف','خدمه','معامله','عمل','في','من','على','عن','لي'];
  document.querySelector('#catalogTotal').textContent=data.services.length;
  var incomingQuery=new URLSearchParams(location.search).get('q');
  if(incomingQuery)query.value=incomingQuery;

  function norm(value){return String(value||'').toLowerCase().normalize('NFKD').replace(/[ًٌٍَُِّْـ]/g,'').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/g,' ').trim();}
  function tokens(value){return norm(value).split(' ').filter(function(x){return x.length>1&&stops.indexOf(x)===-1;});}
  function emirateMatches(item){return !emirate.value||item.emirate===emirate.value||item.emirate==='اتحادي';}
  function categoryMatches(item){return !category.value||item.category===category.value;}
  function queryMatches(item,value){var words=tokens(value);if(!words.length)return true;var text=norm([item.title,item.description,item.authority,item.category,item.emirate,item.country].join(' '));var matched=words.filter(function(word){return text.indexOf(word)!==-1;}).length;return matched>=Math.max(1,Math.ceil(words.length*.5));}
  function card(item){
    var team='https://wa.me/971503780460?text='+encodeURIComponent('مرحباً، أريد تجهيز خدمة: '+item.title+' — '+item.emirate);
    return '<article class="national-card"><div><span>'+item.emirate+'</span><i>'+item.category+'</i></div><h2>'+item.title+'</h2><p>'+item.description+'</p><dl><div><dt>الجهة</dt><dd>'+item.authority+'</dd></div>'+(item.duration?'<div><dt>المدة المنشورة</dt><dd>'+item.duration+'</dd></div>':'')+(item.fee?'<div><dt>الرسوم المنشورة</dt><dd>'+item.fee+'</dd></div>':'')+'</dl><small>آخر مراجعة: '+(item.updated||data.reviewed)+'</small><footer><a href="'+item.url+'" '+(item.url.indexOf('http')===0?'target="_blank" rel="noopener nofollow"':'')+'>المسار الرسمي ↗</a><a href="'+team+'" target="_blank" rel="noopener">اطلب التنفيذ</a></footer></article>';
  }
  function draw(){
    var list=data.services.filter(function(item){return emirateMatches(item)&&categoryMatches(item)&&queryMatches(item,query.value);});
    var exact=list.length>0;
    var suggestions=exact?list:data.services.filter(function(item){return emirateMatches(item)&&categoryMatches(item);}).slice(0,6);
    if(!suggestions.length)suggestions=data.services.slice(0,6);
    count.textContent=exact?list.length+' خدمة مطابقة':'لا يوجد تطابق دقيق · هذه أقرب المسارات';
    var message=encodeURIComponent('مرحباً، أبحث عن خدمة: '+(query.value||'غير محددة')+' — الإمارة: '+(emirate.value||'غير محددة')+' — المجال: '+(category.value||'غير محدد'));
    var rescue=exact?'':'<article class="catalog-rescue"><h2>سنوصلك إلى الخدمة حتى لو اختلف اسمها</h2><p>راجع المسارات المقترحة، أزل التصفية، أو أرسل هدفك مباشرة إلى الفريق.</p><div><button type="button" data-catalog-reset>عرض جميع الخدمات</button><a href="platform-tools.html#selector">محدد الخدمة الذكي</a><a href="https://wa.me/971503780460?text='+message+'" target="_blank" rel="noopener">أرسل هدفك عبر واتساب</a></div></article>';
    grid.innerHTML=rescue+suggestions.slice(0,limit).map(card).join('');
    more.hidden=!exact||list.length<=limit;
  }
  query.addEventListener('input',function(){limit=18;draw();});
  [emirate,category].forEach(function(control){control.addEventListener('change',function(){limit=18;draw();});});
  more.addEventListener('click',function(){limit+=18;draw();});
  grid.addEventListener('click',function(event){if(event.target.closest('[data-catalog-reset]')){query.value='';emirate.value='';category.value='';limit=18;draw();query.focus();}});
  draw();
})();
