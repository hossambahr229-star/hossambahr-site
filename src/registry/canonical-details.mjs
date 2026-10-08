import {hasRecordedFact} from './recorded-fact-state.mjs';

// Only recorded scalar text is publishable; never stringify an unknown object.
export function canonicalText(value, language = 'ar') {
  if (Array.isArray(value)) return value.map(item => canonicalText(item, language)).filter(Boolean).join('; ');
  if (typeof value === 'string') return hasRecordedFact(value) ? value.trim() : '';
  if (!value || typeof value !== 'object') return '';
  return canonicalText(value[language] ?? value.text ?? value.summary, language);
}

export function canonicalFees(fees, language = 'ar') {
  if (!fees || typeof fees !== 'object') return canonicalText(fees, language);
  const parts = [canonicalText(fees.summary, language)];
  for (const item of fees.items || []) {
    const label = canonicalText(item.label, language);
    const amount = typeof item.amount === 'number' && Number.isFinite(item.amount) && item.amount >= 0 ? item.amount : null;
    const currency = typeof item.currency === 'string' ? item.currency.trim() : '';
    const note = canonicalText(item.notes, language);
    // An incomplete amount/currency pair must not be presented as a price.
    const price = amount !== null && currency ? [label, amount, currency].filter(value => value !== '').join(' ') : '';
    if (price) parts.push([price, note].filter(Boolean).join(' — '));
    else if (note) parts.push(note);
  }
  parts.push(canonicalText(fees.notes, language));
  return [...new Set(parts.filter(Boolean))].join('; ');
}

export function canonicalDetails(service, language = 'ar') {
  return {
    documents: (service.documents?.items || []).map(item => canonicalText(item.name, language)).filter(Boolean),
    fees: canonicalFees(service.governmentFees, language),
    duration: canonicalText(service.duration, language),
    eligibility: canonicalText(service.conditions, language),
  };
}
