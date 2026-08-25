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
const failures = [];

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
  const normalizedHtml = html.replaceAll('&amp;', '&');
  if (!normalizedHtml.includes(service.officialCtaUrl)) failures.push(`${service.slug}: official CTA does not match registry`);
  if (!html.includes(service.name.ar)) failures.push(`${service.slug}: Arabic service name is absent`);
  if (html !== original) {
    await writeFile(file, html, 'utf8');
    updated += 1;
  }
}

if (failures.length) throw new Error(`Service page synchronization failed:\n${failures.join('\n')}`);
console.log(JSON.stringify({ servicePages: 'SYNCHRONIZED', registryServices: registry.services.length, updated, injectedStepSections }));
