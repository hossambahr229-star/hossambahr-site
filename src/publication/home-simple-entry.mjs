// Source-owned homepage entry: one search, one assistant action, one full-directory link.
export function simplifyHomepageEntry(home,{p,t}){
 home=home.replace(/\sdata-home-entry="[^"]*"/g,'').replace(/<body\b/,'<body data-home-entry="simple"');
 home=home.replace(/<div class="premium-popular(?: discovery-entry)?">[\s\S]*?<\/div>/,()=>'<div class="premium-popular discovery-entry"><a href="'+p+'/discover/">'+t('جميع الخدمات','All services')+'</a></div>');
 home=home.replace(/(<div class="premium-hero-copy"[^>]*>[\s\S]*?<p[^>]*>)[\s\S]*?(<\/p>)/,(_,open,close)=>open+t('ابحث عن معاملتك، وافهم المطلوب، واختر طريقة الإنجاز.','Find your transaction, check the requirements, and choose how to proceed.')+close);
 home=home.replace(/(<form\b[^>]*class="premium-intent-search"[^>]*>)([\s\S]*?)(<\/form>)/,(_,open,body,close)=>open+body.replace(/placeholder="[^"]*"/,'placeholder="'+t('مثل: تجديد إقامة، تأسيس شركة','e.g. residence renewal or company setup')+'"')+close);
 home=home.replace(/(<aside class="premium-ai-showcase"[^>]*>)([\s\S]*?)(<\/aside>)/,(_,open,body,close)=>{
  body=body.replace(/<div class="ai-showcase-links"[^>]*>[\s\S]*?<\/div>/,'').replace(/<div class="ai-showcase-actions"[^>]*>[\s\S]*?<\/div>/,'').replace(/<button\b[^>]*class="ai-showcase-orb"[^>]*>[\s\S]*?<\/button>/,'');
  body=body.replace(/<button\b[^>]*class="ai-showcase-cta"[^>]*>[\s\S]*?<\/button>/,'<button type="button" class="ai-showcase-cta" data-premium-ai-open aria-controls="premium-ai-panel" aria-expanded="false"><span class="home-ai-action-icon" aria-hidden="true">←</span>'+t('اشرح ما تحتاجه','Describe what you need')+'</button>');
  body=body.replace(/(<h2[^>]*>)[\s\S]*?(<\/h2>)/,(_,h,c)=>h+t('نساعدك في اختيار معاملتك','Find the right transaction')+c);
  return open+body+close;
 });
 home=home.replace(/<details class="home-en-mobile-menu"[^>]*>[\s\S]*?<\/details>/g,'');
 // Tracking remains reachable in the mobile menu after removing the duplicate hero action.
 home=home.replace(/<a class="home-account-entry"[^>]*>[\s\S]*?<\/a>/g,'');
 home=home.replace(/(<details class="mobile-menu"[\s\S]*?<nav[^>]*>)/,'$1<a class="home-account-entry" href="'+p+'/account/">'+t('حسابي ومتابعة طلباتي','My account and requests')+'</a>');

 if(p==='/en')home=home.replace(/(<header class="premium-en-header"[\s\S]*?<nav[^>]*>)/,'$1<a class="home-account-entry" href="/en/account/" aria-label="My account and requests">Account</a>');
 if(p==='/en')home=home.replace(/(<header class="premium-en-header"[^>]*>)([\s\S]*?)(<\/header>)/,(_,open,body,close)=>open+body+'<details class="home-en-mobile-menu"><summary>Menu</summary><nav aria-label="Mobile navigation"><a href="/en/discover/">All services</a><a href="/en/ai/">HB AI</a><a class="home-account-entry" href="/en/account/">My account and requests</a><a href="/en/authorities/">Authorities</a><a href="/en/contact/">Contact</a><a href="/" lang="ar" dir="rtl">العربية</a></nav></details>'+close);
 return home;
}
