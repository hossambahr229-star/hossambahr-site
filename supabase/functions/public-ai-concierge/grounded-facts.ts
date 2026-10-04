export function hasDocumentedValue(value: unknown) {
  const text = String(value ?? '').trim();
  if (!text) return false;
  const normalized = text.toLowerCase().replace(/[\u064B-\u065F\u0670]/g, '').replace(/[إأآ]/g, 'ا').replace(/[.،؛!؟\s]+$/g, '');
  return !/^(غير موثق( بعد| حاليا)?|غير متوفر|غير متاح|غير منشور|لم يتم التحقق|not (verified|documented|available|published)( yet)?|pending verification|tbd|n\/a|unknown)$/.test(normalized);
}

export function documentedRule(rules: any[], id: string, sources: any[]) {
  const rule = rules.find(item => String(item?.id || '') === id);
  if (!hasDocumentedValue(rule?.reason)) return null;
  const approved = new Set(sources.filter(source => !source.review_required).map(source => source.source_url));
  const refs = Array.isArray(rule.sourceRefs) ? rule.sourceRefs.filter((ref: string) => approved.has(ref)) : [];
  if (!refs.length) return null;
  return { value: String(rule.reason).trim(), source_refs: refs };
}

export function serviceIntroduction(title: string, authority: string | null, jurisdiction: string | null) {
  const identity = [title, authority].filter(Boolean).join(' ');
  return 'المسار المناسب لطلبك هو «' + title + '»' + (authority ? ' لدى ' + authority : '') +
    (jurisdiction && !identity.includes(jurisdiction) ? ' في ' + jurisdiction : '') + '.';
}
