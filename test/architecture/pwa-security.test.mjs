import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("service worker never caches sensitive application routes", async()=>{
  const sw=await readFile(new URL("../../sw.js",import.meta.url),"utf8");
  for(const route of ["/auth/","/account/","/os/"]) assert.ok(sw.includes(route), `missing sensitive bypass for ${route}`);
  assert.match(sw,/url\.origin!==self\.location\.origin/);
  assert.match(sw,/request\.method!==["']GET["']/);
});

test("PWA runtime is registration-only and does not request user permissions",async()=>{
  const runtime=await readFile(new URL("../../pwa-runtime.js",import.meta.url),"utf8");
  assert.match(runtime,/serviceWorker\.register/);
  assert.doesNotMatch(runtime,/getUserMedia|geolocation|getCurrentPosition/);
});
