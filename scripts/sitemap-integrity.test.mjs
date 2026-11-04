import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sitemap = await readFile(resolve(root, "sitemap.xml"), "utf8");
const directory = await readFile(resolve(root, "en/services/index.html"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const urlSet = new Set(urls);
const publishedEnglish = new Set(
  [...directory.matchAll(/href="(\/en\/services\/[^"?#]+)"/g)].map((match) => match[1])
);
const origin = "https://hossambahr.com";

test("sitemap begins with valid XML markup, without literal escaped newlines", () => {
  assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">\n/);
  assert.doesNotMatch(sitemap.slice(0, sitemap.indexOf("<url>")), /\\n/);
  assert.match(sitemap.trimEnd(), /<\/urlset>$/);
});

test("sitemap has no duplicated or foreign URL locations", () => {
  assert.equal(urls.length, urlSet.size, "Every canonical page must appear once");
  assert.ok(urls.length >= 250, "Expected the current published catalog and site sections");
  for (const url of urls) {
    assert.ok(url.startsWith(origin + "/"), "Only this site's URLs belong in the sitemap");
    assert.equal(new URL(url).search, "", "No query-based index duplicates");
    assert.equal(new URL(url).hash, "", "No fragment URLs in sitemap");
  }
});

test("all published English service routes are included after catalog generation", () => {
  assert.ok(publishedEnglish.size >= 200, "English service directory unexpectedly shrank");
  for (const route of publishedEnglish) {
    assert.ok(urlSet.has(new URL(route, origin).href), `Missing English service sitemap URL: ${route}`);
  }
  assert.ok(urlSet.has(origin + "/en/"));
  assert.ok(urlSet.has(origin + "/en/services/"));
});
