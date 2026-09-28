import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root=resolve(import.meta.dirname,"../..");
const read=(path)=>readFile(resolve(root,path),"utf8");

test("organization Digital Twin is explicit operational guidance",async()=>{
  const migration=await read("supabase/migrations/20260928061000_organization_digital_twin.sql");
  assert.match(migration,/internal_operational_health/);
  assert.match(migration,/مؤشر تشغيلي داخلي وليس تصنيفًا حكوميًا أو ائتمانيًا/);
  assert.match(migration,/hb_my_organization_twins/);
  assert.match(migration,/hb_document_expiry_obligation/);
});

test("mobile OS links companies and documents to real entities",async()=>{
  const [html,client,css]=await Promise.all([
    read("os/index.html"),
    read("os-client.js"),
    read("os.css")
  ]);
  assert.match(html,/data-jurisdiction-select/);
  assert.match(html,/data-document-organization/);
  assert.match(html,/data-document-case/);
  assert.match(client,/hb_my_organization_twins/);
  assert.match(client,/syncDocumentOrganizationOptions/);
  assert.match(client,/syncDocumentCaseOptions/);
  assert.match(css,/\.hb-org-twin/);
});
