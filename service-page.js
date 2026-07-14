(function loadAnalytics(){if(!document.querySelector('script[data-hb-analytics]')){const s=document.createElement('script');s.src='analytics.js';s.defer=true;s.dataset.hbAnalytics='true';document.head.appendChild(s)}})();

document.querySelector('.lead-form')?.addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.target),service=document.querySelector('h1').textContent.trim(),msg=`مرحباً، أود الاستفسار عن ${service}. الاسم: ${f.get('name')}، الهاتف: ${f.get('phone')}`;location.href=`https://wa.me/971503780460?text=${encodeURIComponent(msg)}`});
