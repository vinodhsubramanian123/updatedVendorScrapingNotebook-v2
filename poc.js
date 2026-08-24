const assert = require('assert');
const http = require('http');
const WebSocket = require('ws');
const { navigateToOCAChassis } = require('./scripts/lib/navigate_oca.js');
const cdp = require('./scripts/lib/cdp.js');

async function poc() {
    console.log('POC');
}
poc().catch(console.error);
