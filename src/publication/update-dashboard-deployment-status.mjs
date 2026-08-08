import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const gate = JSON.parse(await readFile(resolve(root, 'reports/det-safe-publication-gate.json'), 'utf8').catch(() => '{"passed":false}'));
const notice = gate.passed
  ? `قرار النشر الآمن: مؤهل — الخدمات المتحققة مفعّلة، والخدمات قيد التحقق معزولة بأزرار خارجية معطّلة. يظل اكتمال قبول الأعمال الشامل قيد التقدم.`
  : `قرار النشر الآمن: محجوب — توجد مخالفة في بوابة الروابط أو المسارات.`;
const footer = gate.passed
  ? `النشر الآمن لا يعني اكتمال المراجعة التجارية الشاملة؛ لا يُفعّل أي رابط حكومي غير متحقق.`
  : `يُمنع النشر حتى اجتياز بوابة النشر الآمن.`;

for (const relative of ['dashboard/project/index.html', 'dashboard/business/index.html']) {
  const path = resolve(root, relative);
  let html = await readFile(path, 'utf8');
  html = html.replace(/<p class="legal-service-notice">[\s\S]*?<\/p>/, `<p class="legal-service-notice">${notice}</p>`);
  html = html.replace(/<small class="footer-legal">[\s\S]*?<\/small>/, `<small class="footer-legal">${footer}</small>`);
  await writeFile(path, html, 'utf8');
}
