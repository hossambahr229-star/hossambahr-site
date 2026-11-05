/** Shared HOSSAM BAHR identity. These tokens describe presentation, never government eligibility. */
export const HB_IDENTITY = Object.freeze({
  version: '2026.11-next-1',
  brand: 'HOSSAM BAHR',
  colors: Object.freeze({
    evergreen: '#073f35', green: '#0b5c48', greenSoft: '#e7f1eb',
    pearl: '#fbfaf5', paper: '#ffffff', ink: '#17332d', muted: '#52645d',
    line: '#d8e2db', gold: '#a77b32', goldSoft: '#f1e5c8', coral: '#af5148',
  }),
  type: Object.freeze({ ui: 'Cairo', display: 'Cairo', bodyWeight: 600, headingWeight: 800 }),
  layout: Object.freeze({ maxWidth: 1280, gutter: 24, cardRadius: 20, controlRadius: 12, actionHeight: 48 }),
  spacing: Object.freeze([4, 8, 12, 16, 24, 32, 48, 64]),
  social: Object.freeze({ width: 1200, height: 630, jpegQuality: 90 }),
});

const family = (ar, en, symbol, layout, accent = '#a77b32') =>
  Object.freeze({ label: Object.freeze({ ar, en }), symbol, layout, accent });

export const SERVICE_VISUAL_FAMILIES = Object.freeze({
  business: family('الشركات والأعمال', 'Business setup', 'skyline', 'architecture'),
  renewal: family('تجديد الرخص', 'Licence renewal', 'renewal', 'document'),
  closure: family('الإلغاء والتصفية', 'Closure and cancellation', 'closure', 'document', '#af5148'),
  golden: family('الإقامة الذهبية', 'Golden residence', 'golden', 'orbit'),
  investor: family('خدمات المستثمرين', 'Investor services', 'investment', 'architecture'),
  family: family('الإقامة والكفالة الأسرية', 'Family residence', 'family', 'people'),
  employment: family('العمل والتوظيف', 'Work and employment', 'badge', 'document'),
  establishment: family('ملفات المنشآت', 'Establishment services', 'registry', 'architecture'),
  approvals: family('الموافقات والتصاريح', 'Approvals and permits', 'network', 'orbit'),
  certificates: family('الشهادات والتصديقات', 'Certificates and attestation', 'certificate', 'document'),
  visas: family('التأشيرات والزيارة', 'Visas and visits', 'travel', 'orbit'),
  property: family('العقار والإيجارات', 'Property and rentals', 'property', 'architecture'),
  finance: family('الخدمات المالية والضريبية', 'Tax and business finance', 'ledger', 'document'),
  legal: family('العقود والخدمات القانونية', 'Contracts and legal services', 'balance', 'document'),
  identity: family('الهوية والخدمات الشخصية', 'Identity and personal services', 'identity', 'people'),
  mobility: family('النقل والتجارة', 'Transport and trade', 'mobility', 'architecture'),
  government: family('دليل معاملات الإمارات', 'UAE transaction guide', 'network', 'orbit'),
});

const normalize = value => String(value || '').normalize('NFKD')
  .replace(/[\u064b-\u065f\u0670]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').toLowerCase();

export function socialPresentation(service) {
  const text = normalize([service.name?.ar, service.name?.en, service.slug].join(' '));
  const category = service.classification?.main || '';
  const intent = /الغاء|تصفيه|cancel|liquidat|closur/.test(text) ? 'cancel'
    : /تجديد|renew/.test(text) ? 'renew'
    : /تعديل|تحديث|amend|updat/.test(text) ? 'amend'
    : /تمديد|extend|extension/.test(text) ? 'extend'
    : /اصدار|تاسيس|انشاء|issuance|establish|setup|set.up|new /.test(text) ? 'start' : 'guide';
  let key = 'government';
  if (category === 'work-employees' || /مندوب|relations officer|pro.card/.test(text)) key = 'employment';
  else if (category === 'residency-visas' || category === 'family-sponsorship') {
    key = /ذهبي|golden/.test(text) ? 'golden'
      : /مستثمر|شريك|investor|partner/.test(text) ? 'investor'
      : /اسره|زوجه|والد|مولود|family|spouse|parent|newborn/.test(text) ? 'family' : 'visas';
  } else if (category === 'government-approvals' || /سيرا|sira|موافق|approval/.test(text)) key = 'approvals';
  else if (category === 'education-certificates' || /شهاد|certificate|attestation/.test(text)) key = 'certificates';
  else if (category === 'property-rentals' || category === 'real-estate-services') key = 'property';
  else if (category === 'financial-business') key = 'finance';
  else if (category === 'contracts-notarization' || category === 'legal-notary' || category === 'justice-police') key = 'legal';
  else if (category === 'identity-citizenship') key = 'identity';
  else if (category === 'vehicles-transport' || category === 'customs-trade') key = 'mobility';
  else if (category === 'companies-establishments' || category === 'business-licensing') {
    key = /بطاقه منش|ملف منش|سجل منش|establishment (?:card|file|record)|company file/.test(text) ? 'establishment'
      : intent === 'cancel' ? 'closure' : intent === 'renew' && /رخص|licen/.test(text) ? 'renewal' : 'business';
  }
  return { key, intent, ...SERVICE_VISUAL_FAMILIES[key] };
}
