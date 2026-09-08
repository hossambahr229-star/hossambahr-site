import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const registry = JSON.parse(await readFile(resolve(root, 'src/registry/published-services.json'), 'utf8'));

const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;');

let updated = 0;
let injectedStepSections = 0;
let injectedExecutionPaths = 0;
let demotedDuplicateGovernmentCtas = 0;
const failures = [];

const commercialMessage = (service) => encodeURIComponent(`مرحباً، أريد مساعدة في إنجاز معاملة: ${service.name.ar}\nرابط الدليل: https://hossambahr.com${service.internalRoute}`);

function executionPaths(service) {
  const destinationKind = String(service.destinationKind || 'DIRECT_SERVICE').toLowerCase().replaceAll('_', '-');
  const officialAction = destinationKind === 'direct-execution'
    ? {
        title: 'ابدأ التنفيذ عبر الجهة الرسمية',
        description: 'انتقل مباشرة إلى قناة تقديم هذه المعاملة، وقد يُطلب تسجيل الدخول عبر UAE Pass.',
        label: 'ابدأ التنفيذ الحكومي الرسمي ↗',
      }
    : destinationKind === 'official-guidance'
      ? {
          title: 'راجع الدليل الحكومي الرسمي',
          description: 'هذه الوجهة مصدر حكومي يشرح المعاملة؛ اتبع منه قناة التقديم المتاحة ولا تُعامل كرابط تنفيذ مباشر.',
          label: 'افتح الدليل الحكومي الرسمي ↗',
        }
      : {
          title: 'افتح صفحة الخدمة الحكومية',
          description: 'راجع المتطلبات وقنوات التقديم المتاحة في الصفحة الحكومية الخاصة بهذه الخدمة.',
          label: 'افتح صفحة الخدمة الحكومية ↗',
        };
  const trust = service.verification || {};
  const trustLabel = trust.detailsVerified ? 'الرابط والتفاصيل المعروضة موثقة' : 'رابط التنفيذ الرسمي موثق — بعض التفاصيل قيد التحقق';
  const trustDetail = trust.detailsVerified
    ? 'تمت مراجعة الرابط والمتطلبات والرسوم والمدة والشروط المنشورة.'
    : 'لا نعرض أي رسم أو مدة أو مستند غير منشور رسميًا باعتباره معلومة مؤكدة.';
  return `<section class="detail-section phase2-execution-paths" data-phase2-execution-paths data-verification-label="${escapeHtml(trust.label)}"><div class="phase2-path-heading"><span class="eyebrow">اختر طريقة التنفيذ</span><h2>ماذا تريد أن تفعل الآن؟</h2><p>اختر المسار الحكومي الموثق المتاح لهذه المعاملة، أو اطلب مساعدة حسام بحر في تجهيزها.</p></div><div class="service-trust-state" role="status"><strong>${escapeHtml(trustLabel)}</strong><span>${escapeHtml(trustDetail)}</span></div><div class="phase2-path-grid"><article><span>المسار الحكومي</span><h3>${escapeHtml(officialAction.title)}</h3><p>${escapeHtml(officialAction.description)}</p><a class="primary-government-cta" data-government-cta="verified" data-destination-kind="${escapeHtml(destinationKind)}" href="${escapeHtml(service.officialCtaUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(officialAction.label)}</a></article><article><span>مسار المساعدة</span><h3>تواصل معنا لإنجاز المعاملة</h3><p>نساعدك في تحديد النواقص وتجهيز الخطوات دون الادعاء بأننا الجهة الحكومية.</p><a class="execute-with-us-cta" data-commercial-cta="verified" href="https://wa.me/971503780460?text=${commercialMessage(service)}" target="_blank" rel="noopener noreferrer">تواصل معنا لإنجاز المعاملة</a></article></div><p class="phase2-source-note">المصدر الرسمي: <a href="${escapeHtml(service.officialInformationUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(service.authority.ar)}</a> · آخر تحقق من الرابط الرسمي: <time datetime="${escapeHtml(trust.officialLinkLastCheckedAt)}">${escapeHtml(trust.officialLinkLastCheckedAt)}</time> · آخر مراجعة لمحتوى الخدمة: <time datetime="${escapeHtml(trust.dataLastReviewedAt)}">${escapeHtml(trust.dataLastReviewedAt)}</time></p></section>`;
}

for (const service of registry.services) {
  const file = resolve(root, `.${service.internalRoute}`, 'index.html');
  let html = await readFile(file, 'utf8');
  const original = html;
  const hasSteps = /<h2[^>]*>[^<]*(?:خطوات التنفيذ|خطوات الخدمة|الإجراءات)[^<]*<\/h2>/i.test(html);
  if (!hasSteps) {
    const items = (service.steps || [])
      .sort((left, right) => Number(left.order || 0) - Number(right.order || 0))
      .map((step) => `<li><b>${escapeHtml(step.title)}</b><p>${escapeHtml(step.description)}</p></li>`)
      .join('');
    if (!items) {
      failures.push(`${service.slug}: missing structured execution steps`);
      continue;
    }
    const section = `<section class="detail-section content-panel registry-steps-section" data-registry-steps><h2>خطوات التنفيذ</h2><ol>${items}</ol></section>`;
    if (html.includes('</div><aside class="service-aside">')) {
      html = html.replace('</div><aside class="service-aside">', `${section}</div><aside class="service-aside">`);
    } else if (html.includes('<section id="official-route"')) {
      html = html.replace('<section id="official-route"', `${section}<section id="official-route"`);
    } else if (html.includes('</main>')) {
      html = html.replace('</main>', `${section}</main>`);
    } else {
      failures.push(`${service.slug}: cannot place execution steps`);
      continue;
    }
    injectedStepSections += 1;
  }
  const block = executionPaths(service);
  const duplicateGovernmentCtas = html.match(/data-government-cta="verified"/g)?.length || 0;
  if (duplicateGovernmentCtas) {
    html = html.replaceAll('data-government-cta="verified"', 'data-government-cta-secondary="verified"');
    demotedDuplicateGovernmentCtas += duplicateGovernmentCtas;
  }
  if (html.includes('data-phase2-execution-paths')) {
    html = html.replace(/<section class="detail-section phase2-execution-paths" data-phase2-execution-paths(?:\s[^>]*)?>[\s\S]*?<\/section>/, block);
  } else {
    if (!html.includes('</main>')) {
      failures.push(`${service.slug}: cannot place execution paths`);
      continue;
    }
    html = html.replace('</main>', `${block}</main>`);
    injectedExecutionPaths += 1;
  }
  const normalizedHtml = html.replaceAll('&amp;', '&');
  if (!normalizedHtml.includes(service.officialCtaUrl)) failures.push(`${service.slug}: official CTA does not match registry`);
  if (!html.includes(service.name.ar)) failures.push(`${service.slug}: Arabic service name is absent`);
  if (html !== original) {
    await writeFile(file, html, 'utf8');
    updated += 1;
  }
}

if (failures.length) throw new Error(`Service page synchronization failed:\n${failures.join('\n')}`);
console.log(JSON.stringify({ servicePages: 'SYNCHRONIZED', registryServices: registry.services.length, updated, injectedStepSections, injectedExecutionPaths, demotedDuplicateGovernmentCtas }));
