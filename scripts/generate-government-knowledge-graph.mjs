import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relative => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const serviceTree = readJson('content/government-service-tree.json');
const intentConfig = readJson('content/government-intents.json');
const evidenceData = readJson('content/government-route-evidence.json');
const platformContext = { window: {} };
vm.createContext(platformContext);
vm.runInContext(fs.readFileSync(path.join(root, 'platform-data.js'), 'utf8'), platformContext);
const platformServices = platformContext.window.HB_PLATFORM?.services || [];
const platformTitleByUrl = new Map(platformServices.map(service => [service.url, service.title]));

const normalize = value => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/\p{M}/gu, '')
  .replace(/ـ/g, '')
  .replace(/[أإآٱ]/g, 'ا')
  .replace(/ة/g, 'ه')
  .replace(/ى/g, 'ي')
  .replace(/[٠١٢٣٤٥٦٧٨٩]/g, digit => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
  .replace(/[^\p{L}\p{N}\s]/gu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const unique = values => [...new Set(values.filter(Boolean))];
const evidenceByTitle = new Map(evidenceData.records.map(record => [record.platformService, record]));
const serviceByTitle = new Map(serviceTree.services.map(service => [service.platformTitle, service]));

const conceptLexicon = {
  issue: ['اصدار', 'استخراج', 'فتح', 'جديد', 'issue', 'new'],
  renew: ['تجديد', 'اجدد', 'انتهت', 'renew'],
  amend: ['تعديل', 'تغيير', 'تحديث', 'amend', 'change', 'update'],
  cancel: ['الغاء', 'شطب', 'تصفيه', 'اقفل', 'cancel', 'liquidation'],
  transfer: ['نقل', 'تنازل', 'بيع', 'transfer'],
  establish: ['تاسيس', 'انشاء', 'افتح', 'فتح شركه', 'setup', 'formation'],
  register: ['تسجيل', 'register'],
  track: ['متابعه', 'تتبع', 'حاله الطلب', 'track', 'status'],
  pay: ['سداد', 'دفع', 'pay'],
  attest: ['تصديق', 'توثيق', 'attestation'],
  business_license: ['رخصه', 'ترخيص تجاري', 'business license', 'trade license'],
  company: ['شركه', 'مؤسسه', 'منشاه', 'company', 'business'],
  business_activity: ['نشاط', 'انشطه', 'activity'],
  partner: ['شريك', 'شركاء', 'partner'],
  ownership: ['ملكيه', 'تنازل', 'ownership'],
  work_permit: ['تصريح عمل', 'اذن عمل', 'work permit'],
  employment_contract: ['عقد عمل', 'عقد الموظف', 'employment contract', 'labour contract'],
  establishment_card: ['بطاقه منشاه', 'ملف منشاه', 'سجل منشاه', 'establishment card', 'establishment file'],
  residency: ['اقامه', 'تصريح اقامه', 'residency', 'residence permit'],
  family_residency: ['اقامه اسره', 'كفاله', 'عائله', 'family sponsorship', 'family residency'],
  parent: ['ام', 'امي', 'اب', 'ابوي', 'والدين', 'parents', 'mother', 'father'],
  wife_children: ['زوجه', 'زوجتي', 'ابناء', 'اطفال', 'wife', 'children'],
  investor_residency: ['اقامه مستثمر', 'اقامه شريك', 'investor visa', 'partner residency'],
  golden_residency: ['اقامه ذهبيه', 'فيزا ذهبيه', 'golden visa', 'golden residency'],
  emirates_id: ['هويه اماراتيه', 'بطاقه الهويه', 'emirates id', 'uae id'],
  visit_visa: ['تاشيره زياره', 'فيزا زياره', 'visit visa'],
  tourist_visa: ['تاشيره سياحيه', 'فيزا سياحه', 'tourist visa'],
  multiple_entry: ['متعدده الدخول', 'متعدده السفرات', 'multiple entry'],
  five_years: ['خمس سنوات', '5 سنوات', '5 years', 'five years'],
  corporate_tax: ['ضريبه الشركات', 'corporate tax'],
  vat: ['القيمه المضافه', 'vat', 'trn'],
  document: ['مستند', 'وثيقه', 'شهاده', 'document', 'certificate'],
  equivalency: ['معادله', 'اعتراف', 'equivalency', 'recognition'],
  residency_fine: ['غرامه اقامه', 'غرامه فيزا', 'مخالفه اقامه', 'overstay fine']
};

const normalizedLexicon = Object.fromEntries(
  Object.entries(conceptLexicon).map(([concept, terms]) => [concept, terms.map(normalize)])
);

const conceptsFor = service => {
  const haystack = normalize([
    service.platformTitle,
    service.serviceName,
    service.description,
    service.sector,
    service.requestType
  ].join(' '));
  return Object.entries(normalizedLexicon)
    .filter(([, terms]) => terms.some(term => haystack.includes(term)))
    .map(([concept]) => concept);
};

const spellingVariants = value => {
  const clean = String(value || '').trim();
  if (!clean) return [];
  return unique([
    clean,
    normalize(clean),
    clean.replace(/ة/g, 'ه'),
    clean.replace(/[أإآ]/g, 'ا'),
    clean.replace(/تأشيرة/g, 'فيزا'),
    clean.replace(/إقامة/g, 'اقامه'),
    clean.replace(/رخصة/g, 'رخصه'),
    clean.replace(/منشأة/g, 'منشاه'),
    clean.replace(/\b5\b/g, '٥'),
    clean.replace(/\b5\b/g, 'خمس')
  ]);
};

const resolvedIntents = intentConfig.intents.map(intent => {
  const targetServiceIds = unique(intent.targetTitles.map(title => {
    const service = serviceByTitle.get(title);
    if (!service) throw new Error(`Intent ${intent.id} targets a missing service: ${title}`);
    return service.id;
  }));
  return {
    ...intent,
    phrasesNormalized: unique(intent.phrases.flatMap(spellingVariants).map(normalize)),
    targetServiceIds
  };
});

const intentsByServiceId = new Map();
for (const intent of resolvedIntents) {
  for (const serviceId of intent.targetServiceIds) {
    const current = intentsByServiceId.get(serviceId) || [];
    current.push(intent);
    intentsByServiceId.set(serviceId, current);
  }
}

const nodes = serviceTree.services.map(service => {
  const evidence = evidenceByTitle.get(service.platformTitle);
  const intents = intentsByServiceId.get(service.id) || [];
  const officialName = evidence?.officialServiceName || service.serviceName || service.platformTitle;
  const officialNameEn = /[A-Za-z]{3}/.test(officialName) ? officialName : null;
  const guideUrl = service.id.startsWith('guide:') ? `services/${service.id.slice('guide:'.length)}.html` : null;
  const searchTitles = unique([
    service.platformTitle,
    guideUrl ? platformTitleByUrl.get(guideUrl) : null
  ]);
  const synonyms = unique([
    ...searchTitles.flatMap(spellingVariants),
    ...spellingVariants(service.platformTitle),
    ...spellingVariants(service.serviceName),
    ...(officialNameEn ? spellingVariants(officialNameEn) : []),
    ...intents.flatMap(intent => [intent.labelAr, intent.labelEn, ...intent.phrases])
  ]);
  const concepts = unique([...conceptsFor(service), ...intents.flatMap(intent => intent.concepts)]);
  return {
    id: service.id,
    officialNameAr: service.platformTitle,
    officialNameEn,
    platformTitle: service.platformTitle,
    searchTitles,
    description: service.description || null,
    authority: service.authority,
    emirate: service.emirate,
    category: service.sector,
    subcategory: service.requestType,
    audience: evidence?.targetAudience || service.audience || null,
    officialUrl: service.status === 'approved' ? service.officialUrl : null,
    evidenceUrl: service.evidenceUrl || evidence?.informationUrl || null,
    linkStatus: service.status === 'approved' ? 'verified' : 'verification_pending',
    verificationStatus: service.status,
    lastReviewed: evidenceData.reviewedAt || service.lastReviewed,
    documents: evidence?.requirements || service.requirements || [],
    conditions: evidence?.conditions || service.conditions || null,
    fees: evidence?.fees || service.fees || null,
    duration: evidence?.duration || service.duration || null,
    validity: evidence?.validity || null,
    specialCases: service.specialCases || null,
    navigation: evidence?.startRoute || null,
    synonyms,
    concepts,
    intents: intents.map(intent => intent.id),
    relatedServices: [],
    alternativeServices: [],
    previousServices: [],
    nextServices: [],
    provenance: {
      sourceLayer: service.sourceLayer,
      finding: service.finding,
      evidence: evidence?.evidence || null
    }
  };
});

const nodeById = new Map(nodes.map(node => [node.id, node]));
const edges = [];
const edgeKeys = new Set();
const connect = (from, to, type, confidence, provenance) => {
  if (!from || !to || from === to) return;
  const key = `${from}|${to}|${type}`;
  if (edgeKeys.has(key)) return;
  edgeKeys.add(key);
  edges.push({ from, to, type, confidence, provenance });
};

for (const intent of resolvedIntents) {
  for (const from of intent.targetServiceIds) {
    for (const to of intent.targetServiceIds) {
      if (from !== to) connect(from, to, 'alternative_jurisdiction_or_variant', 0.95, `intent:${intent.id}`);
    }
  }
}

const actionOrder = ['issue', 'renew', 'amend', 'cancel'];
for (const node of nodes) {
  const objectConcepts = node.concepts.filter(concept => !actionOrder.includes(concept) && !['establish', 'register', 'track', 'pay', 'attest', 'transfer'].includes(concept));
  if (!objectConcepts.length) continue;
  const action = actionOrder.find(concept => node.concepts.includes(concept));
  if (!action) continue;
  for (const candidate of nodes) {
    if (candidate.id === node.id || candidate.authority !== node.authority) continue;
    if (!objectConcepts.some(concept => candidate.concepts.includes(concept))) continue;
    const candidateAction = actionOrder.find(concept => candidate.concepts.includes(concept));
    if (!candidateAction) continue;
    const delta = actionOrder.indexOf(candidateAction) - actionOrder.indexOf(action);
    if (delta === 1) connect(node.id, candidate.id, 'lifecycle_next', 0.8, 'concept-lifecycle');
    if (delta === -1) connect(node.id, candidate.id, 'lifecycle_previous', 0.8, 'concept-lifecycle');
  }
}

const titleToId = title => serviceByTitle.get(title)?.id;
const journey = [
  titleToId('الموافقة المبدئية لتأسيس شركة في دبي'),
  titleToId('إصدار سجل منشأة لدى وزارة الموارد البشرية'),
  titleToId('إصدار تصريح عمل جديد من خارج الإمارات'),
  titleToId('إصدار أو تجديد عقد عمل في الإمارات'),
  titleToId('إصدار إقامة موظف في القطاع الخاص في دبي'),
  titleToId('إصدار الهوية الإماراتية لأول مرة')
].filter(Boolean);
for (let index = 0; index < journey.length - 1; index += 1) {
  connect(journey[index], journey[index + 1], 'journey_next', 0.9, 'platform-business-journey');
  connect(journey[index + 1], journey[index], 'journey_previous', 0.9, 'platform-business-journey');
}

for (const node of nodes) {
  if (edges.some(edge => edge.from === node.id)) continue;
  const sameAuthority = nodes.find(candidate =>
    candidate.id !== node.id &&
    candidate.authority === node.authority &&
    candidate.category === node.category
  );
  const sameCategory = sameAuthority || nodes.find(candidate =>
    candidate.id !== node.id && candidate.category === node.category
  );
  const sameAuthorityFallback = sameCategory || nodes.find(candidate =>
    candidate.id !== node.id && candidate.authority === node.authority
  );
  const sameEmirateFallback = sameAuthorityFallback || nodes.find(candidate =>
    candidate.id !== node.id && candidate.emirate === node.emirate
  );
  if (sameEmirateFallback) {
    const type = sameCategory
      ? 'related_same_category'
      : sameAuthorityFallback
        ? 'related_same_authority'
        : 'related_same_jurisdiction';
    connect(node.id, sameEmirateFallback.id, type, sameCategory ? 0.6 : 0.5, 'platform-taxonomy');
  }
}

for (const edge of edges) {
  const node = nodeById.get(edge.from);
  if (!node) continue;
  if (edge.type === 'alternative_jurisdiction_or_variant') node.alternativeServices.push(edge.to);
  else if (edge.type.endsWith('_previous')) node.previousServices.push(edge.to);
  else if (edge.type.endsWith('_next')) node.nextServices.push(edge.to);
  else node.relatedServices.push(edge.to);
}

for (const node of nodes) {
  node.relatedServices = unique(node.relatedServices);
  node.alternativeServices = unique(node.alternativeServices);
  node.previousServices = unique(node.previousServices);
  node.nextServices = unique(node.nextServices);
}

const unresolvedIntentTargets = resolvedIntents
  .filter(intent => !intent.targetServiceIds.length)
  .map(intent => intent.id);
const summary = {
  services: nodes.length,
  verifiedLinks: nodes.filter(node => node.linkStatus === 'verified').length,
  pendingVerification: nodes.filter(node => node.linkStatus !== 'verified').length,
  intents: resolvedIntents.length,
  synonyms: nodes.reduce((total, node) => total + node.synonyms.length, 0),
  edges: edges.length,
  servicesWithoutClassification: nodes.filter(node => !node.category || !node.subcategory).length,
  servicesWithoutSynonyms: nodes.filter(node => !node.synonyms.length).length,
  servicesWithoutRelationships: nodes.filter(node =>
    !node.relatedServices.length &&
    !node.alternativeServices.length &&
    !node.previousServices.length &&
    !node.nextServices.length
  ).length,
  unresolvedIntentTargets: unresolvedIntentTargets.length
};

const graph = {
  schemaVersion: 1,
  generatedAt: `${intentConfig.reviewedAt}T00:00:00+04:00`,
  searchArchitecture: [
    'intent_detection',
    'concept_semantics',
    'government_knowledge_graph',
    'relationship_expansion',
    'synonyms_ar_en',
    'weighted_ranking',
    'fuzzy_fallback'
  ],
  policy: {
    routeRule: 'Only verified officialUrl values may be used as direct government destinations.',
    unresolvedRule: 'Pending records remain searchable through platform context but never receive a guessed government URL.',
    relationshipRule: 'Edges include confidence and provenance; inferred platform navigation is not presented as an official government dependency.'
  },
  summary,
  concepts: conceptLexicon,
  intents: resolvedIntents,
  nodes,
  edges
};

fs.writeFileSync(path.join(root, 'content/government-knowledge-graph.json'), `${JSON.stringify(graph, null, 2)}\n`);
fs.writeFileSync(
  path.join(root, 'government-knowledge-graph.js'),
  `window.HB_GOVERNMENT_KNOWLEDGE_GRAPH=${JSON.stringify(graph)};\n`
);
console.log(JSON.stringify(summary));
