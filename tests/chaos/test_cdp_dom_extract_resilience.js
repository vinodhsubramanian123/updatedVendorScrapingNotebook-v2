'use strict';

const assert = require('assert');
const cdp = require('../../scripts/lib/scraper/cdp.js');
const domExtract = require('../../scripts/lib/scraper/dom_extract.js');
const WebSocket = require('ws');

async function runTests() {
  console.log('🧪 Starting CDP and DOM Extract Resilience Tests...');

  // Test 1: Connection Timeouts (Mocking WebSocket)
  console.log('  Testing connection timeouts...');
  try {
    // connectWS with a port where nothing is listening
    await cdp.connectWS('ws://127.0.0.1:9999/invalid', 1, 10);
    assert.fail('Should have failed to connect');
  } catch (err) {
    assert(err.message.includes('ECONNREFUSED'), 'Expected ECONNREFUSED error from invalid WS connection');
  }

  // Test 1b: sendCommand timeout mock
  try {
    // Create a dummy WebSocket that mimics EventEmitter methods for cdp.sendCommand
    const fakeWs = {
      readyState: WebSocket.OPEN,
      send: (msg) => {},
      on: () => {},
      once: () => {},
      removeListener: () => {}
    };

    await cdp.sendCommand(fakeWs, 'Runtime.evaluate', {}, 10); // 10ms timeout
    assert.fail('Should have timed out');
  } catch (err) {
    assert(err.message.includes('timeout') || err.message.includes('Timed out'), 'Expected timeout error from sendCommand');
  }

  // Test 2: Scrolling Thresholds
  console.log('  Testing scrolling thresholds...');

  // Create an actual WS server to reply to cdp.js's internal sendCommand
  console.log('  Setting up mock WS server...');
  const wss = new WebSocket.Server({ port: 8999 });

  const mockServerPromise = new Promise((resolve) => {
    wss.on('connection', (ws) => {
      ws.on('message', (message) => {
        const msg = JSON.parse(message);
        if (msg.method === 'Runtime.evaluate') {
          if (msg.params && msg.params.expression && msg.params.expression.includes('document.body.scrollHeight')) {
             ws.send(JSON.stringify({ id: msg.id, result: { result: { value: { isExpanded: true, scrollHeight: 15000 } } } }));
          } else {
             ws.send(JSON.stringify({ id: msg.id, result: { result: { value: '[]' } } }));
          }
        } else {
           ws.send(JSON.stringify({ id: msg.id, result: {} }));
        }
      });
      resolve();
    });
  });

  const wsClient = await cdp.connectWS('ws://127.0.0.1:8999', 3, 100);
  await mockServerPromise; // wait for connection

  const expansionResult = await cdp.assertExpansionThreshold(wsClient, 5000);
  assert.strictEqual(expansionResult.isExpanded, true);
  assert.strictEqual(expansionResult.scrollHeight, 15000);

  // Test 3: Table Deduplication / DOM Extraction (extractTablesAsRows)
  console.log('  Testing DOM extractTablesAsRows mock extraction...');

  // We mock sendCommand passed to extractTablesAsRows
  const mockSendCommandDOM = async (ws, method, params) => {
    if (method === 'Runtime.evaluate' && params.expression.includes('querySelectorAll(\'table\')')) {
      // Simulate duplicate tables in DOM
      const mockResult = [
        { tableIndex: 0, rowCount: 2, rows: [['HPE', 'Server'], ['Qty', '1']] },
        { tableIndex: 1, rowCount: 2, rows: [['HPE', 'Server'], ['Qty', '1']] }, // Duplicate
        { tableIndex: 2, rowCount: 1, rows: [['Other', 'Data']] }
      ];
      return { result: { value: JSON.stringify(mockResult) } };
    }
    return { result: { value: '[]' } };
  };

  const tables = await domExtract.extractTablesAsRows({}, mockSendCommandDOM);
  assert.strictEqual(tables.length, 3);
  assert.deepStrictEqual(tables[0].rows, tables[1].rows); // Ensure the rows are exactly matching
  const reconstructedText = domExtract.deriveTextFromTables(tables);
  assert.match(reconstructedText, /HPE\tServer/);
  assert.match(reconstructedText, /Other\tData/);

  // Test 4: Reactive DOM text must be frozen before chunking. The simulated
  // live body changes after the first command, while the captured snapshot
  // remains complete across all subsequent chunks.
  console.log('  Testing immutable chunked text snapshot...');
  const originalText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let frozenText = '';
  const textCommands = [];
  const mockSnapshotCommand = async (_ws, method, params) => {
    assert.strictEqual(method, 'Runtime.evaluate');
    textCommands.push(params.expression);
    if (params.expression.includes('__ocaBodyTextSnapshot =')) {
      frozenText = originalText;
      return { result: { value: frozenText.length } };
    }
    const bounds = params.expression.match(/substring\((\d+), (\d+)\)/);
    if (bounds) return { result: { value: frozenText.substring(Number(bounds[1]), Number(bounds[2])) } };
    return { result: { value: true } };
  };
  const captured = await domExtract.extractChunkedText({}, mockSnapshotCommand, 10);
  assert.strictEqual(captured.totalLen, originalText.length);
  assert.strictEqual(captured.fullText, originalText);
  assert(textCommands.at(-1).includes('delete globalThis.__ocaBodyTextSnapshot'));

  wsClient.close();
  wss.close();

  console.log('✅ CDP and DOM Extract Resilience Tests Passed!');
}

runTests().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
