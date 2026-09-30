'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('events');
const { setupNetworkSniffer } = require('../../scripts/lib/scraper/cdp.js');

test('network capture waits for completion, decodes base64 and does not invent conflicts', async () => {
  const ws = new EventEmitter();
  const commands = [];
  ws.send = raw => {
    const command = JSON.parse(raw);
    commands.push(command.method);
    queueMicrotask(() => ws.emit('message', JSON.stringify({ id: command.id, result:
      command.method === 'Network.getResponseBody' ? {
        base64Encoded: true,
        body: Buffer.from(JSON.stringify({ messages: [{ message: 'An informational vendor notice' }] })).toString('base64')
      } : {} })));
  };
  const capture = await setupNetworkSniffer(ws);
  const emit = (method, params) => ws.emit('message', JSON.stringify({ method, params }));
  emit('Network.responseReceived', { requestId: 'one', response: { url: 'https://oca.ext.hpe.com/advice/list?token=secret', mimeType: 'application/json', status: 200 } });
  assert.equal(commands.includes('Network.getResponseBody'), false);
  emit('Network.loadingFinished', { requestId: 'one' });
  await capture.flush();
  assert.equal(capture.getCapturedRules()[0].ruleType, 'UNCLASSIFIED_OBSERVATION');
  assert.equal(capture.getCapturedRules()[0].sourceUrl, 'https://oca.ext.hpe.com/advice/list');
  assert.equal(JSON.stringify(capture.getCapturedPayloads()).includes('secret'), false);
  emit('Network.responseReceived', { requestId: 'external', response: { url: 'https://unrelated.example/advice/list', mimeType: 'application/json' } });
  emit('Network.loadingFinished', { requestId: 'external' });
  await capture.flush();
  assert.equal(commands.filter(method => method === 'Network.getResponseBody').length, 1);
  assert.equal(capture.getCoverage().pendingResponses, 0);
  await capture.detach();
});
