import {readFile,writeFile,mkdir,readdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {escapeHtml as esc} from './english-catalog.mjs';
const root=resolve(import.meta.dirname,'../..');
export function privacyCopy(en=false){
 return en ? [
 ['Public browsing and HB AI','You can browse services and ask general questions without an account. Service search uses the browser; questions sent to HB AI are processed by the assistant service. Do not include identity numbers, passport details, passwords or bank-card information in public search or chat.'],
 ['Accounts and saved requests','When you choose to create an account or save a request, the platform processes the account details you provide, selected services, request context and follow-up information. An account is required for protected saved transactions.'],
 ['Documents','Documents you choose to upload through the protected workspace are stored in the platform’s private document storage. Access is subject to account and organisation permissions. Upload only documents needed for your request; public chat is not the place to submit identity documents.'],
 ['Government sites and WhatsApp','Opening an official link takes you to the authority’s site and its own terms and privacy policy. The assisted WhatsApp link prepares transaction context for your review; sending it shares that context with WhatsApp and the recipient. Do not send passwords or payment-card information.'],
 ['Questions about your data','For questions about information saved in your account, contact the platform using the contact page. Do not attach identity documents to a general enquiry.']
 ] : [
 ['الاستكشاف العام وHB AI','يمكنك تصفح الخدمات وطلب الاستشارة العامة دون حساب. يعمل بحث الخدمات داخل المتصفح، وتُعالج الأسئلة المرسلة إلى HB AI عبر خدمة المساعد. لا تكتب أرقام الهوية أو الجواز أو كلمات المرور أو بيانات البطاقة المصرفية في البحث أو المحادثة العامة.'],
 ['الحسابات والطلبات المحفوظة','عند اختيار إنشاء حساب أو حفظ طلب، تعالج المنصة بيانات الحساب التي تقدمها والخدمات المختارة وسياق الطلب ومعلومات متابعته. تتطلب المعاملات المحفوظة والمحمية تسجيل الدخول.'],
 ['المستندات','تُحفظ المستندات التي تختار رفعها عبر مساحة العمل المحمية في مخزن مستندات خاص بالمنصة، ويخضع الوصول إلى صلاحيات الحساب والمؤسسة. ارفع المستندات اللازمة للطلب فقط؛ المحادثة العامة ليست قناة لإرسال مستندات الهوية.'],
 ['المواقع الحكومية وواتساب','عند فتح رابط حكومي تنتقل إلى موقع الجهة وسياسة الخصوصية والشروط الخاصة بها. يجهّز رابط مساعدة واتساب سياق المعاملة لمراجعته؛ إرساله يشارك هذا السياق مع واتساب والمستلم. لا ترسل كلمات المرور أو بيانات بطاقات الدفع.'],
 ['الاستفسار عن بياناتك','للاستفسار عن المعلومات المحفوظة في حسابك، تواصل مع المنصة عبر صفحة التواصل. لا ترفق مستندات الهوية باستفسار عام.']
 ];
}
export const dataAnswer=en=>en
 ? 'General browsing does not require an account. If you create an account, save a request or upload a document in the protected workspace, the platform processes that information to provide those features. Read the privacy page before sharing personal data.'
 : 'الاستكشاف العام لا يحتاج إلى حساب. عند إنشاء حساب أو حفظ طلب أو رفع مستند في مساحة العمل المحمية، تعالج المنصة هذه البيانات لتقديم الوظيفة التي اخترتها. راجع صفحة الخصوصية قبل مشاركة بيانات شخصية.';
const render=items=>items.map(([title,text])=>'<section><h2>'+esc(title)+'</h2><p>'+esc(text)+'</p></section>').join('');
function enPage(title,route,body){
 return '<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' | HOSSAM BAHR</title><meta name="referrer" content="strict-origin-when-cross-origin"><link rel="canonical" href="https://hossambahr.com/en/'+route+'/"><link rel="alternate" hreflang="ar" href="https://hossambahr.com/'+route+'/"><link rel="alternate" hreflang="en" href="https://hossambahr.com/en/'+route+'/"><link rel="icon" href="/icon.svg"><link rel="stylesheet" href="/english-catalog.css"></head><body><a class="skip-link" href="#main-content">Skip to content</a><header><a class="en-brand" href="/en/"><img src="/icon.svg" width="48" height="48" alt=""><b>HOSSAM BAHR</b></a><nav aria-label="Main navigation"><a href="/en/discover/">Services</a><a href="/en/ai/">HB AI</a><a href="/en/contact/">Contact</a><a href="/en/privacy/">Privacy</a><a href="/en/faq/">Help</a><a href="/'+route+'/" lang="ar">العربية</a></nav></header><main id="main-content" data-customer-data-notice="account-documents-v1"><h1>'+title+'</h1>'+body+'</main><footer>HOSSAM BAHR is an independent platform. Government decisions remain with the responsible authority.</footer></body></html>';
}
export async function synchronizeCustomerNotices(publicationRoot=root){
 const root=publicationRoot;
 const path=join(root,'privacy/index.html');let html=await readFile(path,'utf8');
 const analytics=html.match(/<section\b[^>]*data-hb-analytics-disclosure[^>]*>[\s\S]*?<\/section>/)?.[0];
 if(!analytics)throw Error('Existing analytics disclosure missing; preserve and review before changing privacy copy');
 html=html.replace(/<article class="prose"(?: data-customer-data-notice="[^"]*")?>[\s\S]*?<\/article>/,
 '<article class="prose" data-customer-data-notice="account-documents-v1">'+render(privacyCopy())+'<p><a href="/contact/">تواصل بشأن بياناتك</a></p>'+analytics+'</article>');
 await writeFile(path,html);
 const faqPath=join(root,'faq/index.html');let faq=await readFile(faqPath,'utf8');
 faq=faq.replace(/(<summary>هل تخزن المنصة بياناتي الشخصية\؟<\/summary>)[\s\S]*?(<\/details>)/,
 '$1<p data-customer-data-notice="account-documents-v1">'+esc(dataAnswer(false))+' <a href="/privacy/">سياسة الخصوصية</a></p>$2');
 await writeFile(faqPath,faq);
 const enAnalytics='<section data-hb-analytics-disclosure="v3"><h2>Platform usage measurement</h2><p>Internal usage measurement may record the page path, a temporary browser session identifier, an external referring site, UTM campaign tags and the general type of service, search or contact interaction. The analytics record does not include contact destinations, phone numbers, email addresses, WhatsApp URLs, message text, identity or passport numbers, search text or IP addresses. Owner and authentication pages are excluded from this measurement.</p></section>';
 const privacy=enPage('Privacy','privacy',render(privacyCopy(true))+'<p><a href="/en/contact/">Contact us about your data</a></p>'+enAnalytics);
 const questions=[
 ['Is HOSSAM BAHR a government authority?','No. HOSSAM BAHR is an independent service. Government authorities make approval, visa and licensing decisions.'],
 ['Why does the emirate matter?','The responsible authority and transaction pathway can depend on the emirate and issuing authority. Dubai residence and federal ICP pathways must be distinguished.'],
 ['Are the displayed fees final?','Published fees may depend on your case. The amount shown by the responsible authority before payment is the final reference. Hossam Bahr assistance fees are separate and agreed before execution.'],
 ['Does the platform store personal data?',dataAnswer(true)],
 ['What if my request is unclear?','The assistant may ask for the emirate or another detail to identify the correct transaction. Missing verified information must remain visible rather than being guessed.'],
 ['How do I check service information?','Open the service details and linked official source. Review the displayed verification status and any missing information before applying.']
 ];
 const help=enPage('Help and frequently asked questions','faq',questions.map(([q,a])=>'<details><summary>'+esc(q)+'</summary><p>'+esc(a)+'</p></details>').join('')+'<p><a href="/en/privacy/">Read the privacy notice</a></p>');
 for(const [route,content]of [['privacy',privacy],['faq',help]]){await mkdir(join(root,'en',route),{recursive:true});await writeFile(join(root,'en',route,'index.html'),content);}
 let sitemap=await readFile(join(root,'sitemap.xml'),'utf8');
 for(const route of ['privacy','faq'])if(!sitemap.includes('<loc>https://hossambahr.com/en/'+route+'/</loc>'))sitemap=sitemap.replace('</urlset>','<url><loc>https://hossambahr.com/en/'+route+'/</loc></url></urlset>');
 await writeFile(join(root,'sitemap.xml'),sitemap);
 // Keep existing English journeys on the newly published native notices.
 async function linkNotices(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=join(dir,entry.name);if(entry.isDirectory())await linkNotices(file);else if(entry.name.endsWith('.html')){const before=await readFile(file,'utf8');const after=before.replaceAll('href="/privacy/"','href="/en/privacy/"').replaceAll('href="/faq/"','href="/en/faq/"').replaceAll('Help (Arabic)','Help');if(after!==before)await writeFile(file,after);}}}
 await linkNotices(join(root,'en'));
}
if(process.argv[1]&&resolve(process.argv[1])===resolve(import.meta.filename))await synchronizeCustomerNotices();
