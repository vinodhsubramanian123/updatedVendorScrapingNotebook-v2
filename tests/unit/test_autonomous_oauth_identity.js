'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { verifyOAuthIdentity, assertOAuthScopes, SCOPES } = require('../../scripts/services/autonomous_oauth_flow.js');
const tokens = { access_token: 'fixture-access', refresh_token: 'fixture-refresh' };
const account = 'owner@example.com';
const response = data => async () => ({ ok: true, json: async () => data });

test('Email-only consent cannot report a successful catalog synchronization login', () => {
  assert.throws(() => assertOAuthScopes(['openid', 'email', 'https://www.googleapis.com/auth/userinfo.email']), /consent is incomplete/);
  for (const omitted of SCOPES) assert.throws(() => assertOAuthScopes(SCOPES.filter(scope => scope !== omitted)), /missing scopes/);
  assert.doesNotThrow(() => assertOAuthScopes(SCOPES));
  assert.doesNotThrow(() => assertOAuthScopes(SCOPES.join(' ')));
  assert.ok(!SCOPES.includes('https://www.googleapis.com/auth/cloud-platform'));
});

test('OAuth identity comes from verified Google readback and token stays out of URLs', async () => {
  const email = await verifyOAuthIdentity(tokens, account, async (url, options) => {
    assert.equal(url, 'https://www.googleapis.com/oauth2/v2/userinfo');
    assert.equal(options.headers.Authorization, 'Bearer fixture-access');
    return { ok: true, json: async () => ({ email: 'Owner@example.com', verified_email: true }) };
  });
  assert.equal(email, 'Owner@example.com');
});

test('OAuth refuses missing, blank or unverified email instead of inventing an account', async () => {
  for (const data of [{}, { email: account }, { email: account, verified_email: false }, { email: ' ', verified_email: true }]) {
    await assert.rejects(verifyOAuthIdentity(tokens, undefined, response(data)), /no verified email/);
  }
});

test('OAuth refuses a different account and failed identity service', async () => {
  await assert.rejects(verifyOAuthIdentity(tokens, account, response({ email: 'other@example.com', verified_email: true })), /does not match/);
  await assert.rejects(verifyOAuthIdentity(tokens, account, async () => ({ ok: false })), /verification failed/);
});

test('OAuth refuses incomplete offline credentials before making a request', async () => {
  for (const incomplete of [{}, { access_token: 'fixture-access' }, { refresh_token: 'fixture-refresh' }]) {
    await assert.rejects(verifyOAuthIdentity(incomplete, account, () => assert.fail('Identity request must not run')), /complete offline credentials/);
  }
});
