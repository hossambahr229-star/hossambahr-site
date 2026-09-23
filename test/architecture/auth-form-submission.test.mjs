import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../../auth-client.js', import.meta.url), 'utf8');
for (const [formName, method] of Object.entries({ login: 'signInWithPassword', signup: 'signUp', magic: 'signInWithOtp', forgot: 'resetPasswordForEmail', reset: 'updateUser' })) {
  test(`${formName} submits entered values before disabling controls`, async () => {
    const values = { email: 'auth-regression@example.invalid', password: 'Synthetic12345', name: 'Test User' };
    const fields = Object.entries(values).map(([name, value]) => ({ name, value, disabled: false }));
    let submit;
    let sent;
    let boot;
    const form = { querySelectorAll: () => fields, setAttribute() {}, addEventListener: (_event, handler) => { submit = handler; } };
    const client = { auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange() {},
      [method]: async (...args) => {
        assert.ok(fields.every(field => field.disabled), 'controls are busy during the request');
        sent = args;
        return { data: {}, error: null };
      }
    } };
    class BrowserFormData {
      constructor(target) { this.values = new Map(target.querySelectorAll().filter(field => !field.disabled).map(field => [field.name, field.value])); }
      get(name) { return this.values.get(name) ?? null; }
    }
    vm.runInNewContext(source, {
      window: { HB_AUTH_CONFIG: { url: 'https://example.invalid', publishableKey: 'test-public-key', siteUrl: 'https://example.invalid' }, supabase: { createClient: () => client } },
      document: { readyState: 'loading', addEventListener: (_event, handler) => { boot = handler; }, querySelector: selector => selector === `[data-${formName}-form]` ? form : null },
      location: { pathname: '/auth/', search: '?return=%2Fos%2F', assign() {}, replace() {} },
      FormData: BrowserFormData, URLSearchParams, setTimeout() {}
    });
    await boot();
    await submit({ preventDefault() {} });
    assert.ok(sent, 'authentication request was issued');
    if (formName === 'forgot') assert.equal(sent[0], values.email);
    else if (formName === 'reset') assert.equal(sent[0].password, values.password);
    else {
      assert.equal(sent[0].email, values.email);
      if (formName !== 'magic') assert.equal(sent[0].password, values.password);
    }
    assert.ok(fields.every(field => !field.disabled), 'controls become usable again');
  });
}
