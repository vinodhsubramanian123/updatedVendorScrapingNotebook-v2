'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('http');
const WebSocket = require('ws');
const { navigateToOCAChassis } = require('../../scripts/lib/scraper/navigate_oca.js');
const cdp = require('../../scripts/lib/scraper/cdp.js');

// Save original methods
const originalHttpGet = http.get;
const originalSetTimeout = global.setTimeout;
const originalFetch = global.fetch;

let mockTargets = [];
let activeConnections = [];

function setupMocks() {
  global.fetch = async function(url, options = {}) {
    const urlStr = String(url);
    if (urlStr.includes('9222/json')) {
      if (urlStr.includes('/json/new?')) {
        const targetUrl = decodeURIComponent(urlStr.split('/json/new?')[1] || '');
        const newTarget = {
          type: 'page',
          id: `tab-${Date.now()}`,
          url: targetUrl,
          title: 'Partner Home',
          webSocketDebuggerUrl: 'ws://localhost:18999'
        };
        return { ok: true, status: 200, json: async () => newTarget, text: async () => JSON.stringify(newTarget) };
      }
      return { ok: true, status: 200, json: async () => mockTargets, text: async () => JSON.stringify(mockTargets) };
    }
    if (typeof originalFetch === 'function') {
      return originalFetch(url, options);
    }
    return { ok: true, status: 200 };
  };

  global.setTimeout = (fn, ms) => {
    if (ms === 3000 || ms === 6000 || ms === 5000) {
      return originalSetTimeout(fn, 1);
    }
    return originalSetTimeout(fn, ms);
  };

  http.get = function(url, cb) {
    if (typeof url === 'string' && url.includes('9222/json')) {
      const res = new (require('events').EventEmitter)();
      res.statusCode = 200;
      res.resume = function() {};
      const req = new (require('events').EventEmitter)();
      req.setTimeout = function() { return req; };
      req.destroy = function() {};

      originalSetTimeout(() => {
        if (url.includes('/json/close/')) {
          const parts = url.split('/json/close/');
          const targetId = decodeURIComponent(parts[1] || '');
          if (targetId) {
            mockTargets = mockTargets.filter(t => t.id !== targetId);
          }
        }
        if (cb) cb(res);
        res.emit('data', JSON.stringify(mockTargets));
        res.emit('end');
      }, 1);
      return req;
    }
    return originalHttpGet(url, cb);
  };
}

function restoreMocks() {
  http.get = originalHttpGet;
  global.setTimeout = originalSetTimeout;
  global.fetch = originalFetch;
}

function getMockEvaluateValue(expr, query = 'DL380 Gen12') {
  if (expr.includes('isLoggedOut')) {
    const isStalePresent = mockTargets.some(t => t.id === 'stale-logged-out-oca');
    return {
      hasMenu: !isStalePresent,
      isLoggedOut: isStalePresent,
      hasException: false,
      pageText: isStalePresent ? 'You are logged out successfully!' : `HPE ProLiant ${query}`
    };
  }
  if (expr.includes('candidates') || expr.includes('dqe_ai_mode_trigger') || expr.includes('selectNavTreeOption')) {
    return {
      candidates: [
        {
          sku: 'P73282-B21',
          text: `HPE ProLiant Compute ${query} SFF NC Configure-to-order Server`,
          isCto: true,
          isBto: false,
          isTaa: false,
          isGta: false,
          type: 'card',
          cardSelector: '.card',
          listPriceUsd: 1200
        }
      ]
    };
  }
  if (expr.includes('isConfigPage') || expr.includes('summary_property_summary_name')) {
    return { isConfigPage: true };
  }
  if (expr.includes('oktaEmailInput') || expr.includes('password-sign-in')) {
    return false;
  }
  if (expr.toLowerCase().includes('one config advanced') || expr.includes('187402') || expr.includes('ocaLink')) {
    return { clicked: true, text: 'One Config Advanced', launched: true };
  }
  return true;
}

test('CDP Navigator Resilience Test Suite', async (t) => {
  setupMocks();
  let wss = null;

  t.after(() => {
    if (wss) {
      activeConnections.forEach(ws => {
        try { ws.close(); } catch (_) {}
      });
      try { wss.close(); } catch (_) {}
    }
    restoreMocks();
  });

  wss = new WebSocket.Server({ port: 18999 });

  await t.test('Test 1: Testing >10s timeout recovery (Login polling)', async () => {
    activeConnections = [];
    wss.removeAllListeners('connection');
    wss.on('connection', ws => {
      activeConnections.push(ws);
      ws.on('message', msg => {
        const req = JSON.parse(msg);
        if (req.method === 'Runtime.evaluate') {
          ws.send(JSON.stringify({
            id: req.id,
            result: { result: { value: getMockEvaluateValue(req.params?.expression || '', 'DL380') } }
          }));
        } else {
          ws.send(JSON.stringify({ id: req.id, result: {} }));
        }
      });
      ws.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== ws);
      });
    });

    mockTargets = [
      {
        type: 'page',
        id: 'new-tab-page',
        url: 'chrome://newtab/',
        title: 'New Tab',
        webSocketDebuggerUrl: 'ws://localhost:18999'
      }
    ];

    let pollCount = 0;
    const pollingSetTimeout = global.setTimeout;
    global.setTimeout = (fn, ms) => {
      if (ms === 3000) {
        pollCount++;
        if (pollCount === 5) {
          mockTargets = [
            {
              type: 'page',
              id: 'partner-page',
              url: 'https://partner.hpe.com/home',
              title: 'Partner Home',
              webSocketDebuggerUrl: 'ws://localhost:18999'
            },
            {
              type: 'page',
              id: 'oca-page',
              url: 'https://oca.ext.hpe.com',
              title: 'OCA Menu',
              webSocketDebuggerUrl: 'ws://localhost:18999'
            }
          ];
        }
      }
      return pollingSetTimeout(fn, ms);
    };

    const res = await navigateToOCAChassis('DL380', {});
    assert.strictEqual(res.status, 'READY_AT_MENU_TAB');
    assert.ok(pollCount >= 5, 'Should have polled at least 5 times');
    global.setTimeout = pollingSetTimeout;
  });

  await t.test('Test 2: Testing Partner Portal navigation to OCA tool launch', async () => {
    mockTargets = [
      {
        type: 'page',
        id: 'partner-home-page',
        url: 'https://partner.hpe.com/home',
        title: 'Partner Home',
        webSocketDebuggerUrl: 'ws://localhost:18999'
      }
    ];

    let launchCalled = false;
    wss.removeAllListeners('connection');

    wss.on('connection', ws => {
      activeConnections.push(ws);
      ws.on('message', msg => {
        const req = JSON.parse(msg);
        if (req.method === 'Runtime.evaluate') {
          const expr = req.params?.expression || '';
          if (expr.includes('oktaEmailInput') || expr.includes('password-sign-in')) {
            ws.send(JSON.stringify({ id: req.id, result: { result: { value: false } } }));
          } else if (expr.toLowerCase().includes('one config advanced') || expr.includes('187402') || expr.includes('ocaLink')) {
            launchCalled = true;
            mockTargets.unshift({
              type: 'page',
              id: 'new-oca-page',
              url: 'https://oca.ext.hpe.com',
              title: 'OCA Menu',
              webSocketDebuggerUrl: 'ws://localhost:18999'
            });
            ws.send(JSON.stringify({ id: req.id, result: { result: { value: { clicked: true, text: 'One Config Advanced', launched: true } } } }));
          } else {
            ws.send(JSON.stringify({
              id: req.id,
              result: { result: { value: getMockEvaluateValue(expr, 'Alletra 9000') } }
            }));
          }
        } else {
          ws.send(JSON.stringify({ id: req.id, result: {} }));
        }
      });
      ws.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== ws);
      });
    });

    const res2 = await navigateToOCAChassis('Alletra 9000', {});
    assert.strictEqual(res2.status, 'READY_AT_MENU_TAB');
    assert.strictEqual(launchCalled, true, 'Launch evaluate command should have been called on Partner Portal');
  });

  await t.test('Test 3: Graceful WebSocket reconnect when CDP port drops temporarily', async () => {
    let flackyWss = null;
    let successfulConnection = false;
    try {
      let mockServerStarted = false;
      originalSetTimeout(() => {
        mockServerStarted = true;
        flackyWss = new WebSocket.Server({ port: 9225 });
        flackyWss.on('connection', () => {
          successfulConnection = true;
        });
      }, 50);

      const flackyWs = await cdp.connectWS('ws://localhost:9225', 5, 20);
      assert.strictEqual(successfulConnection, true, 'Should have reconnected successfully');
      assert.strictEqual(mockServerStarted, true, 'Server should have started after initial failures');
      flackyWs.close();
    } finally {
      if (flackyWss) {
        try { flackyWss.close(); } catch (_) {}
      }
    }
  });

  await t.test('Test 4: Testing automatic closure of logged-out OCAInternalLogin tab and recovery', async () => {
    let freshTabSpawned = false;

    mockTargets = [
      {
        type: 'page',
        id: 'stale-logged-out-oca',
        url: 'https://oca.ext.hpe.com/oca/OCAInternalLogin',
        title: 'External OCA | Hewlett Packard Enterprise',
        webSocketDebuggerUrl: 'ws://localhost:18999'
      },
      {
        type: 'page',
        id: 'partner-home-page',
        url: 'https://partner.hpe.com/home',
        title: 'Partner Home',
        webSocketDebuggerUrl: 'ws://localhost:18999'
      }
    ];

    wss.removeAllListeners('connection');
    wss.on('connection', ws => {
      activeConnections.push(ws);
      ws.on('message', msg => {
        const req = JSON.parse(msg);
        if (req.method === 'Page.reload') {
          ws.send(JSON.stringify({ id: req.id, result: {} }));
        } else if (req.method === 'Runtime.evaluate') {
          const expr = req.params?.expression || '';
          if (expr.includes('isLoggedOut')) {
            const isStalePresent = mockTargets.some(t => t.id === 'stale-logged-out-oca');
            ws.send(JSON.stringify({
              id: req.id,
              result: {
                result: {
                  value: {
                    hasMenu: !isStalePresent,
                    isLoggedOut: isStalePresent,
                    hasException: false,
                    pageText: isStalePresent ? 'You are logged out successfully!' : 'HPE ProLiant DL380 Gen12'
                  }
                }
              }
            }));
          } else if (expr.includes('oktaEmailInput') || expr.includes('password-sign-in')) {
            ws.send(JSON.stringify({ id: req.id, result: { result: { value: false } } }));
          } else if (expr.toLowerCase().includes('one config advanced') || expr.includes('187402') || expr.includes('ocaLink')) {
            freshTabSpawned = true;
            mockTargets.unshift({
              type: 'page',
              id: 'fresh-recovered-oca',
              url: 'https://oca.ext.hpe.com/dqe',
              title: 'OCA Menu',
              webSocketDebuggerUrl: 'ws://localhost:18999'
            });
            ws.send(JSON.stringify({ id: req.id, result: { result: { value: { clicked: true, text: 'One Config Advanced', launched: true } } } }));
          } else {
            ws.send(JSON.stringify({
              id: req.id,
              result: { result: { value: getMockEvaluateValue(expr, 'DL380 Gen12') } }
            }));
          }
        } else {
          ws.send(JSON.stringify({ id: req.id, result: {} }));
        }
      });
      ws.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== ws);
      });
    });

    const res4 = await navigateToOCAChassis('DL380 Gen12', {});
    assert.strictEqual(res4.status, 'READY_AT_MENU_TAB');
    assert.strictEqual(mockTargets.some(t => t.id === 'stale-logged-out-oca'), false, 'Logged out tab should have been closed via CDP /json/close');
    assert.strictEqual(freshTabSpawned, true, 'Fresh session should have been triggered from Tab 1 Quick Links');
  });
});
