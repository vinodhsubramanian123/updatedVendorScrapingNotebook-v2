const http = require('http');
const navigate_oca = require('./scripts/lib/navigate_oca.js');

const originalHttpGet = http.get;
http.get = function(url, cb) {
  if (typeof url === 'string' && url.includes('9222/json')) {
    const res = new (require('events').EventEmitter)();
    const req = new (require('events').EventEmitter)();

    setTimeout(() => {
      if (cb) cb(res);
      res.emit('data', JSON.stringify([
        {
          type: 'page',
          id: 'mock-page-id',
          url: 'https://oca.ext.hpe.com',
          title: 'External OCA',
          webSocketDebuggerUrl: 'ws://localhost:9223'
        }
      ]));
      res.emit('end');
    }, 10);
    return req;
  }
  return originalHttpGet(url, cb);
};

// Also mock setTimeout to speed up the retries in navigate_oca.js
const originalSetTimeout = global.setTimeout;
global.setTimeout = (fn, ms) => {
  if (ms === 3000 || ms === 6000 || ms === 5000) {
    return originalSetTimeout(fn, 10);
  }
  return originalSetTimeout(fn, ms);
};

// We would also need a WS server on 9223
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 9223 });
wss.on('connection', ws => {
  ws.on('message', msg => {
    const req = JSON.parse(msg);
    if (req.method === 'Runtime.evaluate') {
      ws.send(JSON.stringify({
        id: req.id,
        result: {
          result: {
            value: { basePrice: 1500, success: true }
          }
        }
      }));
    }
  });
});

navigate_oca.navigateToOCAChassis('DL380', {}).then(res => {
  console.log('Result:', res);
  wss.close();
  global.setTimeout = originalSetTimeout;
  http.get = originalHttpGet;
}).catch(err => {
  console.error(err);
  wss.close();
});
