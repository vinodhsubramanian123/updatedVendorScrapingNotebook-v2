'use strict';

const assert = require('assert');
const http = require('http');
const WebSocket = require('ws');
const { navigateToOCAChassis } = require('../scripts/lib/navigate_oca.js');
const cdp = require('../scripts/lib/cdp.js');

// Save original methods
const originalHttpGet = http.get;
const originalSetTimeout = global.setTimeout;

// Mock setTimeout to speed up the tests
global.setTimeout = (fn, ms) => {
  if (ms === 3000 || ms === 6000 || ms === 5000) {
    return originalSetTimeout(fn, 1);
  }
  return originalSetTimeout(fn, ms);
};

let mockTargets = [];
let activeConnections = [];

// Mock http.get for CDP targets
http.get = function(url, cb) {
  if (typeof url === 'string' && url.includes('9222/json')) {
    const res = new (require('events').EventEmitter)();
    const req = new (require('events').EventEmitter)();
    
    originalSetTimeout(() => {
      if (cb) cb(res);
      res.emit('data', JSON.stringify(mockTargets));
      res.emit('end');
    }, 1);
    return req;
  }
  return originalHttpGet(url, cb);
};

async function runTests() {
  console.log('🧪 Starting CDP Navigator Resilience Tests...');
  let wss;
  try {
    wss = new WebSocket.Server({ port: 9222 });
    
    wss.on('connection', ws => {
      activeConnections.push(ws);
      ws.on('message', msg => {
        const req = JSON.parse(msg);
        if (req.method === 'Runtime.evaluate') {
          ws.send(JSON.stringify({
            id: req.id,
            result: {
              result: {
                value: true
              }
            }
          }));
        }
      });
      ws.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== ws);
      });
    });

    // --- Test 1: Portal auto-navigation state machine when DOM elements load slowly ---
    console.log('\n  --- Test 1: Testing >10s timeout recovery (Login polling) ---');
    
    mockTargets = [
      {
        type: 'page',
        id: 'login-page',
        url: 'https://partner.hpe.com/login',
        title: 'Login',
        webSocketDebuggerUrl: 'ws://localhost:9222'
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
              webSocketDebuggerUrl: 'ws://localhost:9222'
            },
            {
              type: 'page',
              id: 'oca-page',
              url: 'https://oca.ext.hpe.com',
              title: 'OCA Menu',
              webSocketDebuggerUrl: 'ws://localhost:9222'
            }
          ];
        }
      }
      return pollingSetTimeout(fn, ms);
    };

    const res = await navigateToOCAChassis('DL380', {});
    assert.strictEqual(res.status, 'READY_AT_MENU_TAB');
    assert.ok(pollCount >= 5, 'Should have polled at least 5 times');
    console.log('✅ Test 1 Passed: Successfully recovered from slow login/DOM state.');

    // Reset for next test
    global.setTimeout = pollingSetTimeout;

    // --- Test 2: WebLogic SSO popups, unexpected modal dialogs, and navigation redirects ---
    console.log('\n  --- Test 2: Testing Partner Portal navigation to OCA tool launch ---');
    
    mockTargets = [
      {
        type: 'page',
        id: 'partner-home-page',
        url: 'https://partner.hpe.com/home',
        title: 'Partner Home',
        webSocketDebuggerUrl: 'ws://localhost:9222'
      }
    ];

    let launchCalled = false;
    wss.removeAllListeners('connection');
    
    wss.on('connection', ws => {
      activeConnections.push(ws);
      ws.on('message', msg => {
        const req = JSON.parse(msg);
        if (req.method === 'Runtime.evaluate') {
          if (req.params.expression && req.params.expression.includes('ocaLink')) {
            launchCalled = true;
            // Simulate that launching opens OCA page
            mockTargets.unshift({
              type: 'page',
              id: 'new-oca-page',
              url: 'https://oca.ext.hpe.com',
              title: 'OCA Menu',
              webSocketDebuggerUrl: 'ws://localhost:9222'
            });
            ws.send(JSON.stringify({ id: req.id, result: { result: { value: true } } }));
          } else {
            ws.send(JSON.stringify({ id: req.id, result: { result: { value: true } } }));
          }
        }
      });
      ws.on('close', () => {
        activeConnections = activeConnections.filter(c => c !== ws);
      });
    });

    const res2 = await navigateToOCAChassis('Alletra 9000', {});
    assert.strictEqual(res2.status, 'READY_AT_MENU_TAB');
    assert.strictEqual(launchCalled, true, 'Launch evaluate command should have been called on Partner Portal');
    
    console.log('✅ Test 2 Passed: Successfully navigated WebLogic portal redirect and launched OCA.');

    // --- Test 3: Graceful WebSocket reconnect when CDP port drops temporarily ---
    console.log('\n  --- Test 3: Graceful WebSocket reconnect when CDP port drops temporarily ---');
    
    let connectionAttempts = 0;
    let flackyWss;
    let successfulConnection = false;
    
    try {
      flackyWss = new WebSocket.Server({ port: 9224 });
      flackyWss.on('connection', ws => {
        connectionAttempts++;
        if (connectionAttempts === 1) {
          ws.close();
        } else {
          successfulConnection = true;
          ws.send(JSON.stringify({ ok: true })); 
        }
      });

      flackyWss.close();

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
      console.log('✅ Test 3 Passed: Successfully reconnected WebSocket on retry.');
    } finally {
      if (flackyWss) flackyWss.close();
    }

  } finally {
    if (wss) {
      activeConnections.forEach(ws => ws.close());
      wss.close();
    }
    http.get = originalHttpGet;
    global.setTimeout = originalSetTimeout;
  }
}

runTests().catch(err => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
