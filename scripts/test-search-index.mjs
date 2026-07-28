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

console.log(JSON.stringify({
  indexedRecords: search.index.length,
  directoryServices: directoryTitles.length,
  checkedQueries: 3,
  reviewed: search.reviewed
}));
