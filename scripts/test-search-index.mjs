import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context = {
  window: {},
  console,
  Map,
  Set,
  URLSearchParams,
  CustomEvent: function CustomEvent() {}
};
context.window.window = context.window;
vm.createContext(context);

for (const file of [
  'platform-data.js',
  'knowledge-data.js',
  'government-services-data.js',
  'government-knowledge-graph.js',
  'search-content-data.js',
  'search-engine.js'
]) {
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
}

const search = context.window.HBSearch;
assert.ok(search, 'HBSearch must be initialized');

const directoryTitles = Object.values(context.window.HB_DIRECTORIES)
  .flatMap((directory) => directory.items)
  .map((item) => item[1]);
const indexedTitles = new Set(search.index.map((item) => item.title));

for (const title of directoryTitles) {
  assert.ok(indexedTitles.has(title), `Directory service is missing from global search: ${title}`);
}

for (const query of [
  'زياره صديق او قريب',
  'زيارة قريب أو صديق',
  'فيزا زيارة صديق'
]) {
  const titles = search.search(query).map((item) => item.title);
  assert.ok(
    titles.includes('تأشيرة زيارة قريب أو صديق لدخول واحد في دبي'),
    `Dubai friend/family visit route missing for query: ${query}`
  );
  assert.ok(
    titles.includes('تأشيرة زيارة قريب أو صديق عبر ICP (خارج دبي)'),
    `ICP friend/family visit route missing for query: ${query}`
  );
}

const graph = context.window.HB_GOVERNMENT_KNOWLEDGE_GRAPH;
assert.ok(graph, 'Government Knowledge Graph must be initialized');
assert.equal(graph.summary.servicesWithoutClassification, 0);
assert.equal(graph.summary.servicesWithoutSynonyms, 0);
assert.equal(graph.summary.servicesWithoutRelationships, 0);
assert.equal(graph.summary.unresolvedIntentTargets, 0);

const prefixes = ['', 'اريد ', 'ممكن ', 'لو سمحت '];
const suffixes = ['', ' في دبي', ' في الامارات'];
let intentQueries = 0;
let intentMatches = 0;
for (const intent of graph.intents) {
  for (const phrase of intent.phrases) {
    for (const prefix of prefixes) {
      for (const suffix of suffixes) {
        const query = `${prefix}${phrase}${suffix}`.trim();
        intentQueries += 1;
        const detected = search.detectIntent(query).matchedIntents;
        if (detected.some((match) => match.id === intent.id)) intentMatches += 1;
      }
    }
  }
}
assert.equal(intentMatches, intentQueries, 'Every generated intent query must resolve to its configured intent');
assert.ok(intentQueries >= 1000, 'The generated intent suite must contain at least 1,000 queries');

const endToEndCases = [
  ['أريد أجيب أمي', 'إصدار إقامة للوالدين ضمن الحالات الإنسانية في دبي'],
  ['أبغى أجيب زوجتي', 'إصدار إقامة لأفراد الأسرة في دبي'],
  ['أريد أفتح شركة', 'الموافقة المبدئية في دبي'],
  ['أريد فيزا خمس سنوات', 'إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP'],
  ['فيزه ٥ سنوات', 'إصدار تأشيرة سياحية متعددة الدخول لمدة 5 سنوات عبر ICP'],
  ['أريد أغير النشاط', 'إضافة أو حذف نشاط تجاري في دبي'],
  ['أضيف شريك', 'إضافة أو انسحاب شريك في دبي'],
  ['ألغي الرخصة', 'إلغاء رخصة أو تصفية شركة في دبي'],
  ['إقامة ذهبى', 'الإقامة الذهبية'],
  ['تصريح عمل', 'تصريح عمل جديد من خارج الدولة'],
  ['كاتب عدل', 'محدد الخدمة الحكومية الذكي']
];
for (const [query, expectedTitle] of endToEndCases) {
  const results = search.search(query).slice(0, 8).map((item) => item.title);
  assert.ok(results.includes(expectedTitle), `Expected "${expectedTitle}" for query "${query}"`);
}

console.log(JSON.stringify({
  indexedRecords: search.index.length,
  directoryServices: directoryTitles.length,
  checkedQueries: 3,
  intentQueries,
  intentAccuracy: intentMatches / intentQueries,
  endToEndQueries: endToEndCases.length,
  graphServices: graph.summary.services,
  graphEdges: graph.summary.edges,
  graphSynonyms: graph.summary.synonyms,
  reviewed: search.reviewed
}));
