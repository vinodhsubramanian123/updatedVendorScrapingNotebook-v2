'use strict';
/**
 * scripts/lib/cdp.js — Shared Chrome DevTools Protocol utilities
 *
 * Imported by all scraping scripts to avoid copy-paste drift and
 * inconsistent timeouts. Every caller gets the same robust
 * sendCommand, getOCATarget, getAnyPageTarget, connectWS, and sleep.
 */

const WebSocket = require('ws');
const http      = require('http');
const domExtract = require('./dom_extract.js');

const CDP_PORT        = 9222;
const DEFAULT_TIMEOUT = 45000;   // ms — generous for slow OCA pages

let _nextMsgId = 1;

/**
 * Send one CDP command on an open WebSocket and await its response.
 * @param {WebSocket} ws
 * @param {string}    method  e.g. 'Runtime.evaluate'
 * @param {object}    [params]
 * @param {number}    [timeoutMs]
 * @returns {Promise<object>} result field from the CDP response
 */
function sendCommand(ws, method, params = {}, timeoutMs = DEFAULT_TIMEOUT) {
  return new Promise((resolve, reject) => {
    const id = _nextMsgId++;
    let timer = null;

    const cleanup = () => {
      ws.removeListener('message', handler);
      ws.removeListener('close', closeHandler);
      if (timer) clearTimeout(timer);
    };

    const handler = (raw) => {
      let msg;
      try { msg = JSON.parse(raw.toString()); } catch (e) { console.warn('Caught suppressed error in cdp.js:', e);
return; }
      if (msg.id !== id) return;
      cleanup();
      if (msg.error) reject(new Error(`CDP error [${method}]: ${JSON.stringify(msg.error)}`));
      else resolve(msg.result);
    };

    const closeHandler = () => {
      cleanup();
      reject(new Error(`WebSocket closed unexpectedly while waiting for CDP command: ${method}`));
    };

    ws.on('message', handler);
    ws.on('close', closeHandler);

    timer = setTimeout(() => {
      cleanup();
      reject(new Error(`CDP timeout (${timeoutMs} ms) waiting for: ${method}`));
    }, timeoutMs);

    try {
      ws.send(JSON.stringify({ id, method, params }));
    } catch (err) {
      cleanup();
      reject(new Error(`Failed to send CDP command [${method}]: ${err.message}`));
    }
  });
}

/**
 * Find the active OCA browser tab.
 * Matches on URL (oca.ext.hpe.com) or page title containing 'OCA'.
 * Throws a detailed diagnostic error if no matching tab is open.
 */
function getOCATarget() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const pages   = targets.filter(t => t.type === 'page');

          // Primary match: active OCA configuration portal tab (must not be local dashboard or Seismic sales redirect)
          const nonLocalPages = pages.filter(t => !t.url?.includes('localhost') && !t.url?.includes('127.0.0.1') && !t.url?.includes('antigravity') && !t.url?.includes('seismic.com'));
          
          const isStaleOrLoggedOut = (t) => {
            const url = (t.url || '').toLowerCase();
            return url.includes('/logout') || url.includes('login_error') || url.includes('session_expired');
          };
          const ocaPage = nonLocalPages.find(
            t => !isStaleOrLoggedOut(t) && (
                 (t.url && (t.url.includes('oca.ext.hpe.com') || t.url.includes('oca.hpe.com'))) ||
                 (t.title && (t.title.includes('External OCA') || t.title.includes('Online Config') || (t.title.includes('OCA') && !t.title.includes('Engine'))))
            )
          );
          if (ocaPage) return resolve(ocaPage);

          // Secondary diagnostic: check if HPE Partner Portal is open
          const partnerPage = pages.find(t => t.url && t.url.includes('partner.hpe.com') && !t.url.includes('seismic.com'));
          const openTabList = pages.map(t => `   - [${t.id}] ${t.title || 'Untitled'} (${t.url})`).join('\n');

          let errHelp = `No active HPE OCA page (oca.ext.hpe.com) found on CDP port ${CDP_PORT}.\n`;
          if (partnerPage) {
            errHelp += `💡 Found active HPE Partner Portal session at: ${partnerPage.url}\n` +
                       `   Please click through to the OCA / Configuration Application portal in your browser tab.\n`;
          } else {
            errHelp += `💡 Ensure you are logged into the HPE Partner Portal and have opened OCA in your browser.\n`;
          }
          errHelp += `Currently open browser page tabs (${pages.length}):\n${openTabList || '   (none)'}`;

          reject(new Error(errHelp));
        } catch (e) { reject(e); }
      });
    }).on('error', e =>
      reject(new Error(`Cannot reach CDP on port ${CDP_PORT}: ${e.message}\nEnsure Chrome / Antigravity browser is running with --remote-debugging-port=${CDP_PORT}`))
    );
  });
}

/**
 * Find the first non-Antigravity page target.
 * Used by the QuickSpecs PDF downloader to open a helper tab
 * without disturbing the active OCA session.
 */
function getAnyPageTarget() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', c => (data += c));
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          const page = targets.find(
            t => t.type === 'page' && !t.url.includes('antigravity')
          );
          if (page) resolve(page);
          else reject(new Error('No usable Chrome page target found on port 9222'));
        } catch (e) { reject(e); }
      });
    }).on('error', e =>
      reject(new Error(`Cannot reach CDP on port ${CDP_PORT}: ${e.message}`))
    );
  });
}

/**
 * Open a WebSocket connection to the given CDP debugger URL.
 * Resolves with the open WebSocket instance.
 */
async function connectWS(debuggerUrl, retries = 3, backoffMs = 1500) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await new Promise((resolve, reject) => {
        const ws = new WebSocket(debuggerUrl);
        ws.once('open', () => resolve(ws));
        ws.once('error', reject);
      });
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(backoffMs * attempt);
    }
  }
}

/**
 * Automatically handle JS alert/confirm dialogs, permission requests, and DOM modal popups (WebLogic / legacy UI).
 */
async function setupDialogAutoHandler(ws) {
  if (ws._dialogHandlerAttached) return;
  ws._dialogHandlerAttached = true;

  try {
    await sendCommand(ws, 'Page.enable');
    // Enable download behavior with clean naming to prevent GUID/numbered file naming and blocks
    try {
      const os = require('os');
      const path = require('path');
      const dlDir = path.join(os.homedir(), 'Downloads');
      try {
        await sendCommand(ws, 'Browser.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: dlDir,
          eventsEnabled: true
        });
      } catch {
        await sendCommand(ws, 'Page.setDownloadBehavior', {
          behavior: 'allow',
          downloadPath: dlDir
        });
      }
    } catch (_) { console.warn('Caught suppressed error in cdp.js download setup:', _); }

    ws.on('message', async (data) => {
      try {
        const msg = JSON.parse(data);
        if (msg.method === 'Page.javascriptDialogOpening') {
          console.log(`  ⚡ JS Dialog Intercepted: "${msg.params.message}" (${msg.params.type}) — Auto Accepting...`);
          await sendCommand(ws, 'Page.handleJavaScriptDialog', { accept: true });
        } else if (msg.method === 'Page.fileChooserOpened') {
          console.log('  ⚡ File Chooser Intercepted — Auto Bypassing...');
          await sendCommand(ws, 'Page.handleFileChooser', { action: 'cancel' });
        }
      } catch (err) {
        // Safe debug output
      }
    });
  } catch (err) {
    console.warn('  ⚠️ setupDialogAutoHandler advisory:', err.message);
  }
}

/**
 * Handle DOM session extension prompts, cookie banners, and modal proceed/confirm/allow buttons.
 */
async function dismissDOMModals(ws) {
  try {
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        // Handle session keep-alive or timeout prompts
        const sessionBtns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
          .filter(el => {
            const t = (el.innerText || el.value || '').trim().toLowerCase();
            return t.includes('continue session') || t.includes('stay logged in') || t.includes('extend session');
          });
        sessionBtns.forEach(btn => btn.click());

        // Handle permission & notification popups / cookie consent banners (Allow, Accept All, Proceed, OK)
        const consentBtns = Array.from(document.querySelectorAll('#onetrust-accept-btn-handler, .cookie-accept, .cc-accept, .btn-allow, button[id*="allow"], button[class*="allow"], button[id*="accept"]'))
          .filter(el => el.offsetWidth > 0 && el.offsetHeight > 0);
        consentBtns.forEach(btn => btn.click());

        // Handle modal confirmation dialogs (Proceed / Continue / Confirm / OK / Allow) — ignoring Cancel / Delete
        const confirmBtns = Array.from(document.querySelectorAll('.modal-dialog button, .ui-dialog button, .dialog-button, .popup-button, .modal-footer button, #btnContinue, .btn-confirm'))
          .filter(el => {
            const t = (el.innerText || el.value || '').trim().toLowerCase();
            return (t === 'proceed' || t === 'continue' || t === 'ok' || t === 'yes' || t === 'confirm' || t === 'accept' || t === 'allow')
              && !t.includes('cancel') && !t.includes('delete') && !t.includes('remove');
          });
        confirmBtns.forEach(btn => btn.click());
      })()`
    });
  } catch (err) {
    // Non-fatal modal dismiss warning
  }
}

/**
 * Expand all sections and "Show More" checkboxes on active page.
 * Recursively reveals all hidden categories, additional processor/memory choices,
 * and column/date options (Show PLC dates, Show Obsolete Date, Show extra columns).
 */
async function expandSections(ws) {
  await dismissDOMModals(ws);
  await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // 1. Expand all collapsed sections, accordions, and headers
      Array.from(document.querySelectorAll('a, button, span, div.expander, .section_header, .accordion_header, .ui-accordion-header, [class*="expander"], [class*="collapse"], [data-toggle="collapse"]')).forEach(el => {
        const t = (el.innerText || el.textContent || '').trim();
        if (t === 'Expand All' || t === 'Expand Subsections' || t === 'Expand' || el.classList.contains('collapsed') || el.classList.contains('ui-state-default')) {
          el.click();
        }
      });

      // 2. Click toolbar option toggles for complete column visibility & dispatch change
      ['show_extra_columns', 'show_dates', 'show_obsolete_date', 'show_cost', 'show_price'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('active') && !el.checked) {
          el.click();
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          if (typeof jQuery !== 'undefined') {
            jQuery(el).prop('checked', true).trigger('change');
          }
        }
      });

      // 3. Ensure 'View HPE Recommended only' is NOT filtering out valid options
      const recOnly = document.querySelector('#view_recommended_only, [id*="recommended_only"], input[name*="recommended"]');
      if (recOnly && recOnly.checked) {
        recOnly.click();
        recOnly.checked = false;
        recOnly.dispatchEvent(new Event('change', { bubbles: true }));
        if (typeof jQuery !== 'undefined') jQuery(recOnly).prop('checked', false).trigger('change');
      }

      // 4. Find and check all showmore checkboxes (native + jQuery dispatch)
      const showmoreInputs = Array.from(document.querySelectorAll('input[type="checkbox"][id*="showmore"], input[type="checkbox"][name*="showmore"], input[type="checkbox"][id*="show_"], input[type="checkbox"][id*="expand"], input[type="checkbox"][id*="subchoice"]'));
      showmoreInputs.forEach(i => {
        if (!i.checked) {
          i.checked = true;
          i.click();
          i.dispatchEvent(new Event('change', { bubbles: true }));
          if (typeof jQuery !== 'undefined') {
            jQuery(i).prop('checked', true).trigger('change');
          }
        }
      });

      // 5. Click any remaining label/span wrappers and sub-choice triggers
      document.querySelectorAll('label[for*="showmore"], label[for*="show_"], .showmore_container, a.showmore, span.showmore_text, a[id*="showmore"], [class*="subchoice_trigger"], [onclick*="Choice"], [onclick*="SubChoice"], [onclick*="showMore"], [onclick*="expand"]').forEach(el => {
        el.click();
      });

      // 6. Dynamic Mode & Sub-Choice Option Revealer:
      // For choice groups that gate dependent option tables (e.g. GPU Mode on DL380a, controller mode, riser choice)
      const choiceRadios = Array.from(document.querySelectorAll('input[type="radio"][id*="Choice"], input[type="radio"][name*="Choice"], input[type="radio"][id*="mode"], input[type="radio"][name*="mode"], .choice_radio'));
      choiceRadios.forEach(radio => {
        const name = radio.name;
        const group = name ? document.querySelectorAll('input[name="' + name + '"]') : [radio];
        const hasSelected = Array.from(group).some(r => r.checked);
        if (!hasSelected) {
          radio.click();
          radio.checked = true;
          radio.dispatchEvent(new Event('change', { bubbles: true }));
          if (typeof jQuery !== 'undefined') jQuery(radio).trigger('change');
        }
      });
    })()`,
    returnByValue: true
  });
  await sleep(1500);
}

/**
 * Assert DOM expansion using adaptive scroll height thresholds.
 * Avoids false retries on compact storage UI wizards.
 */
async function assertExpansionThreshold(ws, initialHeight = 5000) {
  const res = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const scrollHeight = document.body.scrollHeight || 0;
      const targetThreshold = Math.min(15000, ${initialHeight} + 3000);
      return {
        scrollHeight,
        targetThreshold,
        isExpanded: scrollHeight >= targetThreshold || scrollHeight >= ${initialHeight} * 1.3
      };
    })()`,
    returnByValue: true
  });
  return (res && res.result) ? res.result.value : { isExpanded: true, scrollHeight: 15000 };
}

/**
 * Trigger HPE OCA CLIC Check (Configuration Language & Inspection Engine Check)
 * and extract inspection error messages, root causes, and recommended direct SKU fixes.
 * @param {WebSocket} ws 
 * @param {'root' | 'component'} level 
 * @returns {Promise<object>} CLIC inspection results
 */
async function triggerClicCheck(ws, level = 'root') {
  await dismissDOMModals(ws);
  const evalRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      // Find top-right CLIC Check button
      const clicBtn = document.querySelector('#clic_check, .btn-clic, #nav_clic, [id*="clic_check"], a[href*="clic"], button[title*="CLIC"]');
      if (clicBtn) {
        clicBtn.click();
        return { clicked: true, level };
      }
      return { clicked: false, level };
    })()`,
    returnByValue: true
  });

  await sleep(2000);
  await dismissDOMModals(ws);

  const errorRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => {
      const modal = document.querySelector('.clic-error-modal, .ui-dialog, .modal-dialog, #clic_results');
      if (!modal) return { hasErrors: false, errorText: '', rootCause: '', recommendedSkus: [] };

      const errorText = modal.innerText || '';
      const skuMatches = errorText.match(/\\b([A-Z0-9]{3,8}-[A-Z0-9]{3,4}|[A-Z0-9]{6})\\b/g) || [];
      return {
        hasErrors: errorText.toLowerCase().includes('error') || errorText.toLowerCase().includes('incompatible'),
        errorText: errorText.trim(),
        rootCause: errorText.substring(0, 300),
        recommendedSkus: Array.from(new Set(skuMatches))
      };
    })()`,
    returnByValue: true
  });

  return (errorRes && errorRes.result) ? errorRes.result.value : { hasErrors: false };
}

/** Async sleep helper */
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/**
 * Dynamic DOM predicate poller over CDP WebSocket.
 * Replaces fixed blind sleeps by repeatedly evaluating a JavaScript expression
 * in the browser context until it returns truthy, or timeout expires.
 * @param {WebSocket} ws Connected CDP WebSocket
 * @param {string} expression JS expression that evaluates to truthy when condition is met
 * @param {number} [maxTimeoutMs=15000] Maximum duration to poll
 * @param {number} [intervalMs=500] Interval between checks
 * @returns {Promise<any>} Resolves with the truthy result value, or false on timeout
 */
async function waitForDOMPredicate(ws, expression, maxTimeoutMs = 15000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < maxTimeoutMs) {
    try {
      const evalRes = await sendCommand(ws, 'Runtime.evaluate', {
        expression,
        returnByValue: true
      }, Math.min(intervalMs * 2, 5000));
      const val = evalRes?.result?.value;
      if (val) return val;
    } catch (_) {}
    await sleep(intervalMs);
  }
  return false;
}

module.exports = {
  sendCommand,
  getOCATarget,
  getAnyPageTarget,
  connectWS,
  setupDialogAutoHandler,
  dismissDOMModals,
  expandSections,
  assertExpansionThreshold,
  triggerClicCheck,
  sleep,
  waitForDOMPredicate,
  CDP_PORT,
  deriveTextFromTables: domExtract.deriveTextFromTables,
  extractChunkedText: (ws, chunkSize) => domExtract.extractChunkedText(ws, sendCommand, chunkSize),
  extractTablesAsRows: (ws, scopeSelector) => domExtract.extractTablesAsRows(ws, sendCommand, scopeSelector),
  extractSectionHeaders: (ws) => domExtract.extractSectionHeaders(ws, sendCommand)
};
