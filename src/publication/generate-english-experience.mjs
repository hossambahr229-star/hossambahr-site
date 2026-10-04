import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const phrases={
 'مساعد المعاملات الذكي في الإمارات':'UAE transactions assistant','مساحة ذكاء لمعاملات الإمارات: افهم معاملتك، الجهة، المستندات، الخطوات والمصادر الرسمية ثم انتقل إلى التنفيذ.':'understand your UAE transaction, authority, documents, steps and official sources before starting a transaction.',
 'أدوات HOSSAM BAHR AI':'HOSSAM BAHR AI tools','محادثة جديدة':'New conversation','العودة إلى المنصة':'Back to the platform','مساعدك الذكي للمعاملات في الإمارات':'Your UAE transactions assistant','كيف يمكنني مساعدتك اليوم؟':'How can I help you today?','محادثة مع HOSSAM BAHR AI':'Chat with HOSSAM BAHR AI','اسأل HOSSAM BAHR AI':'Ask HOSSAM BAHR AI','استشارة عامة بدون تسجيل دخول':'General guidance without signing in','اسألني عن أي معاملة في الإمارات':'Ask about any UAE transaction','إرسال':'Send','بدايات سريعة':'Quick prompts','الإقامة والتأشيرات':'Residence and visas','تأسيس شركة':'Set up a company','معاملات العمل':'Employment transactions','تحليل مستند':'Analyse a document','عن HOSSAM BAHR AI':'About HOSSAM BAHR AI',
 'HOSSAM BAHR AI هو طبقة الذكاء في منظومة HOSSAM BAHR. يساعد الأفراد والشركات على فهم المعاملة والجهة المختصة والخطوات والمستندات والمعلومات الموثقة، مع الانتقال إلى HOSSAM BAHR OS عند بدء التنفيذ.':'HOSSAM BAHR AI helps individuals and businesses understand transactions, responsible authorities, steps, documents and verified information. Start a transaction to continue into HOSSAM BAHR OS.',
 'تعتمد الإجابات على قاعدة معرفة لمعاملات الإمارات ومصادر رسمية متاحة. إذا لم تكن معلومة مثل الرسوم أو الشروط موثقة، يوضح النظام أنها تحتاج إلى تحقق بدل اختراع إجابة.':'Answers use a UAE transaction catalog and available official sources. Fees and conditions that are not verified are identified as requiring verification.',
 'منهجية التحقق':'Verification methodology','الخصوصية':'Privacy','تواصل معنا':'Contact us','انتقل إلى المحتوى':'Skip to content','تسجيل الدخول إلى مركز التشغيل':'Sign in to your workspace','ادخل إلى حسابك للوصول إلى معاملاتك وشركاتك ومستنداتك ولوحة التشغيل من مكان واحد.':'Access your transactions, companies, documents and workspace in one place.',
 'الدخول برابط آمن عبر البريد':'Sign in with a secure email link','يمكنك تسجيل الدخول وتأكيد بريدك من خلال رابط يُرسل إليك، دون تعيين كلمة مرور.':'Sign in and verify your email with a secure link sent to your inbox.','إرسال رابط الدخول':'Send sign-in link','إنشاء حساب جديد':'Create a new account','نسيت كلمة المرور؟':'Forgot your password?','نسيت كلمة المرور':'Forgot password','إنشاء الحساب والتحقق من البريد':'Create account and verify email','إنشاء حساب':'Create account','استعادة كلمة المرور':'Recover password','إرسال رابط الاستعادة':'Send recovery link','البريد الإلكتروني':'Email address','كلمة المرور':'Password','الاسم':'Name','لا نطلب كلمة مرور UAE Pass أو بيانات الدخول إلى المواقع الحكومية.':'We do not request your UAE Pass password or government website credentials.',
 'تأكيد الحساب':'Verify account','جارٍ تأكيد حسابك':'Verifying your account','انتظر لحظات…':'Please wait…','تعيين كلمة مرور جديدة':'Set a new password','كلمة المرور الجديدة':'New password','حفظ كلمة المرور':'Save password','يجب أن تتكون من 10 أحرف على الأقل وتضم حروفًا وأرقامًا.':'Use at least 10 characters, including letters and numbers.',
 'حسابك الآمن':'Your secure account','مرحبًا بك':'Welcome','البريد:':'Email:','فتح مركز التشغيل':'Open your workspace','لوحة المالك':'Owner dashboard','تسجيل الخروج':'Sign out','تسجيل الدخول يحفظ الخدمات التي تختارها فقط. لا نخزن كلمات مرور المواقع الحكومية.':'Sign-in saves the services you choose. We do not store passwords for government websites.','المعاملات المحفوظة':'Saved transactions','جارٍ التحميل…':'Loading…','مركز القيادة':'Workspace','تسجيل الدخول':'Sign in','حسابي':'My account','الخدمات':'Services','بحث':'Search'
};
for(const route of ['ai','auth','auth/callback','auth/reset','account']){
 let html=await readFile(join(root,route,'index.html'),'utf8');
 html=html.replace('lang="ar" dir="rtl"','lang="en" dir="ltr"');
 for(const [ar,en] of Object.entries(phrases).sort((a,b)=>b[0].length-a[0].length)) html=html.replaceAll(ar,en);
 html=html.replaceAll('https://hossambahr.com/'+route+'/','https://hossambahr.com/en/'+route+'/');
 html=html.replace(/href="\/auth\//g,'href="/en/auth/').replace(/href="\/account\//g,'href="/en/account/').replace(/href="\/services\//g,'href="/en/services/').replace(/href="\/"/g,'href="/en/"');
 html=html.replace(/<script src="\/auth-client\.js(?:\?[^\"]*)?"/,match=>'<script src="/ui-i18n.js" defer></script>'+match);
 html=html.replace('</head>','<link rel="stylesheet" href="/english-experience.css"></head>');
 const dir=join(root,'en',route);await mkdir(dir,{recursive:true});await writeFile(join(dir,'index.html'),html);
}
let home=await readFile(join(root,'en/index.html'),'utf8');
home=home.replace(/href="\/ai\//g,'href="/en/ai/').replace(/href="\/auth\//g,'href="/en/auth/');
if(!home.includes('/ui-i18n.js')) home=home.replace(/<script src="\/auth-client\.js(?:\?[^\"]*)?"/,match=>'<script src="/ui-i18n.js" defer></script>'+match);
await writeFile(join(root,'en/index.html'),home);
console.log('Native English AI and authentication routes generated.');
