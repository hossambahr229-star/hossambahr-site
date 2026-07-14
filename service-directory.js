(function(){
  var key=document.body.getAttribute('data-directory');
  var config=window.HB_DIRECTORIES[key];
  if(!config)return;
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
      return '<article class="directory-card"><small>'+item[0]+'</small><h2>'+item[1]+'</h2><p>'+item[3]+'</p><div class="directory-meta"><span><b>الجهة:</b> '+item[2]+'</span><span><b>القناة المعتادة:</b> '+item[4]+'</span></div><div class="directory-actions"><a href="https://wa.me/971503780460?text='+message+'" target="_blank" rel="noopener">اطلب مراجعة المتطلبات ←</a><a href="'+config.source+'" target="_blank" rel="noopener nofollow">المصدر الرسمي ↗</a></div></article>';
    }).join('')||'<p class="directory-empty">لا توجد نتيجة مطابقة. جرّب اسماً آخر أو تواصل معنا لمراجعة النشاط.</p>';
  }
  search.oninput=draw;
  drawTabs();
  draw();
})();
