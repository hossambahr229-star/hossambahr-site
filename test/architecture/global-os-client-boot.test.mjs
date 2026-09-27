import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const source = await readFile(resolve(root, "global-os-client.js"), "utf8");

async function runAt(pathname, session) {
  let sessionReads = 0;
  let healthCalls = 0;
  const client = {
    auth: {
      async getSession() {
        sessionReads += 1;
        return { data: { session } };
      },
    },
  };
  const context = {
    window: {
      HB_AUTH: client,
      HB_OS_API: {
        async health() {
          healthCalls += 1;
          return true;
        },
      },
    },
    location: { pathname, assign() {} },
    document: {
      readyState: "complete",
      querySelector() { return null; },
      createElement() { return {}; },
    },
    Intl,
    Date,
    Promise,
    setTimeout,
    clearTimeout,
  };
  vm.runInNewContext(source, context);
  await new Promise((resolveDone) => setTimeout(resolveDone, 0));
  return { sessionReads, healthCalls };
}

test("Global OS client does not probe protected API on unrelated public pages", async () => {
  const result = await runAt("/", null);
  assert.equal(result.sessionReads, 0);
  assert.equal(result.healthCalls, 0);
});

test("anonymous service visitors do not probe protected Global OS API", async () => {
  const result = await runAt("/services/example/", null);
  assert.equal(result.sessionReads, 1);
  assert.equal(result.healthCalls, 0);
});

test("authenticated service visitors can perform the Global OS health check", async () => {
  const result = await runAt("/services/example/", { user: { id: "user-1" } });
  assert.equal(result.sessionReads, 1);
  assert.equal(result.healthCalls, 1);
});
