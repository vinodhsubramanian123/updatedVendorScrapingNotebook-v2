'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { JSDOM } = require('jsdom');
const { buildPasswordFieldVerification, activeConfigurationMatches } = require('../../scripts/lib/scraper/navigate_oca');

function loginFixture() {
  const dom = new JSDOM('<input id="email-sign-in-with-input"><input id="password-sign-in" type="password"><input id="other">', { runScripts: 'outside-only' });
  const password = dom.window.document.getElementById('password-sign-in');
  password.getClientRects = () => [{ width: 100, height: 20 }];
  return { dom, password, user: dom.window.document.getElementById('email-sign-in-with-input') };
}

test('portal password verification repairs focus loss without reporting secrets', () => {
  const { dom, password, user } = loginFixture();
  try {
    dom.window.document.getElementById('other').focus();
    let inputs = 0, changes = 0;
    password.addEventListener('input', () => inputs++);
    password.addEventListener('change', () => changes++);
    const result = dom.window.eval(buildPasswordFieldVerification('fixture@example.test', 'fixture-"secret\\value'));
    assert.equal(password.value, 'fixture-"secret\\value');
    assert.equal(user.value, 'fixture@example.test');
    assert.equal(inputs, 1);
    assert.equal(changes, 1);
    assert.equal(result.passwordReady, true);
    assert.equal(JSON.stringify(result), '{"passwordReady":true}');
  } finally { dom.window.close(); }
});

test('portal password verification preserves saved password when no override exists', () => {
  const { dom, password } = loginFixture();
  try {
    password.value = 'saved-fixture';
    assert.equal(dom.window.eval(buildPasswordFieldVerification('fixture@example.test', '')).passwordReady, true);
    assert.equal(password.value, 'saved-fixture');
    password.value = '';
    assert.equal(dom.window.eval(buildPasswordFieldVerification('fixture@example.test', '')).passwordReady, false);
  } finally { dom.window.close(); }
});

test('missing password field cannot be reported ready', () => {
  const { dom, password } = loginFixture();
  try {
    password.remove();
    assert.equal(dom.window.eval(buildPasswordFieldVerification('fixture@example.test', 'fixture')).passwordReady, false);
  } finally { dom.window.close(); }
});

test('commercial active configuration is not rejected by its OEM Software category', () => {
  const text = 'DL380 Gen12 #1\nHPE ProLiant Compute DL380 Gen12 SFF NC Configure-to-order Server [P73282-B21]\nOEM Software\nNetworking';
  assert.equal(activeConfigurationMatches('DL380 Gen12', text), true);
  assert.equal(activeConfigurationMatches('DL380 Gen12', text, { targetSku: 'P73282-B21' }), true);
  assert.equal(activeConfigurationMatches('DL380 Gen12', text, { targetSku: 'OTHER' }), false);
  assert.equal(activeConfigurationMatches('DL380a Gen12', text), false);
  assert.equal(activeConfigurationMatches('DL380 Gen11', text), false);
  assert.equal(activeConfigurationMatches('DL380 Gen12', text.replace('SFF NC', 'OEM')), false);
  const otherBase = 'HPE DL380a Gen12 Configure-to-order Server [OTHER]\n' + text;
  assert.equal(activeConfigurationMatches('DL380 Gen12', otherBase), false,
    'Requested model elsewhere on the page cannot override a different active base');
});
