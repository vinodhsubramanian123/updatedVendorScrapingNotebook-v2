'use strict';
/**
 * scripts/lib/navigate_oca.js — Smart HPE Partner Portal & OCA Auto-Navigator
 *
 * Automates passage through HPE Partner Portal (partner.hpe.com) SSO authentication,
 * WebLogic tools catalog navigation, chassis search, base price extraction, and menu entry
 * using lightweight CDP (port 9222) WebSocket commands — without Playwright/Selenium bloat.
 */

const http = require('http');
const path = require('path');
const { sendCommand, connectWS, getOCATarget } = require('./cdp.js');

const CDP_PORT = 9222;

function normalizeProductText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/hewlett[\s-]+packard|enterprise|hpe|proliant|compute|configure[\s-]+to[\s-]+order|cto|server/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function extractModelGeneration(value) {
  const normalized = normalizeProductText(value);
  const model = normalized.match(/\b(?:dl|ml|rl|sy|gx)\s*\d+[a-z]?\b/)?.[0]?.replace(/\s+/g, '') || '';
  const generation = normalized.match(/\bgen\s*\d+\b/)?.[0]?.replace(/\s+/g, '') || '';
  return { model, generation };
}

function isExactProductCandidate(query, candidate) {
  const expected = extractModelGeneration(query);
  const observed = extractModelGeneration(candidate.text);
  const exactIdentity = Boolean(expected.model && observed.model && expected.model === observed.model &&
    (!expected.generation || expected.generation === observed.generation));
  const disallowed = candidate.isBto || candidate.isTaa || candidate.isGta ||
    /(?:\btaa\b|#gta\b|\bbto\b)/i.test(candidate.text || '') || /#GTA$/i.test(candidate.sku || '');
  const isCto = candidate.isCto || /configure[\s-]+to[\s-]+order|\bcto\b/i.test(candidate.text || '');
  return exactIdentity && isCto && !disallowed;
}

/**
 * List all open page targets in Chrome on port 9222.
 */
function getPageTargets() {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${CDP_PORT}/json`, (res) => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const targets = JSON.parse(data);
          resolve(targets.filter(t => t.type === 'page'));
        } catch (err) {
          reject(err);
        }
      });
    });
    
    req.on('error', (err) => {
      reject(new Error(`Chrome remote debugging port ${CDP_PORT} is not accessible (${err.message}). Ensure Chrome is running with --remote-debugging-port=${CDP_PORT}.`));
    });
  });
}

/**
 * Automate navigation from Partner Portal or OCA Search page into target chassis Menu tab.
 * @param {string} chassisQuery E.g. "DL380 Gen12", "Alletra 9000", "Synergy 12000"
 * @param {object} [options] { autoScrape: boolean }
 * @returns {object} { targetUrl, pageId, baseChassisPriceUsd }
 */
async function navigateToOCAChassis(chassisQuery, options = {}) {
  const query = String(chassisQuery || 'DL380 Gen12').trim();
  console.log(`\n===============================================================`);
  console.log(`🧭 SMART HPE OCA PORTAL AUTO-NAVIGATOR`);
  console.log(`   Target Chassis Query: "${query}"`);
  console.log(`===============================================================\n`);

  const pages = await getPageTargets();

  // 1. Check if active OCA configuration page is already at Menu tab
  let ocaTarget = pages.find(t => t.url && t.url.includes('oca.ext.hpe.com'));

  if (ocaTarget) {
    console.log(`✅ Found active OCA tab: [${ocaTarget.id}] ${ocaTarget.title}`);
    const ws = await connectWS(ocaTarget.webSocketDebuggerUrl);

    // Test if already inside configuration Menu page
    const checkState = await sendCommand(ws, 'Runtime.evaluate', {
      expression: `Boolean(document.querySelector('#extended_overview_menu, .menu_label, .eo_nav_div, a[href*="extended_overview_menu"]') || document.querySelectorAll('table').length > 40)`
    });

    if (checkState && checkState.result && checkState.result.value) {
      console.log(`⚡ [ACTIVE SESSION] Already inside target OCA configuration page! Ready for scraping.`);
      ws.close();
      return {
        targetUrl: ocaTarget.url,
        pageId: ocaTarget.id,
        status: 'READY_AT_MENU_TAB'
      };
    }

    // 2. If at OCA Product Search / Catalog page: search chassis and configure
    console.log(`🔍 At OCA Product Search page. Entering chassis query: "${query}"...`);
    const navExpr = `
      (async function() {
        // Find search input
        const searchInput = document.querySelector('#searchProductInput') || 
                            document.querySelector('input[type="search"]') ||
                            document.querySelector('input[placeholder*="Search"]');
        if (searchInput) {
          searchInput.focus();
          searchInput.value = '';
          const query = ${JSON.stringify(query)};
          for (const char of query) {
            searchInput.value += char;
            searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
            await new Promise(r => setTimeout(r, 120));
          }
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Trigger search button or Enter key
          const searchBtn = document.querySelector('#searchButton') || document.querySelector('button[aria-label*="Search"]');
          if (searchBtn) searchBtn.click();
          else searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        }

        await new Promise(r => setTimeout(r, 5000));

        const configBtns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).filter(el => {
          const txt = (el.innerText || '').toLowerCase();
          const value = (el.value || '').toLowerCase();
          return txt.includes('configure') || txt.includes('customize') || txt.includes('create quote') ||
            value.includes('configure') || value.includes('customize');
        });
        const candidates = configBtns.map((button, index) => {
          const card = button.closest('[data-product-id], [data-bto], [data-istaa], tr, article, li, .card, .product-card, .product') || button.parentElement;
          if (card) card.setAttribute('data-codex-oca-candidate-index', String(index));
          const text = (card?.innerText || button.innerText || '').replace(/\\s+/g, ' ').trim();
          const sku = text.match(/\\b(?=[A-Z0-9-]{5,}(?:#GTA)?\\b)(?=[A-Z0-9-]*\\d)[A-Z0-9]{5,}(?:-[A-Z0-9]{2,3})?(?:#GTA)?\\b/i)?.[0] || '';
          const priceText = text.match(/(?:USD|\\$)\\s*[0-9,]+(?:\\.\\d{2})?/i)?.[0] || '';
          const dates = text.match(/\\b\\d{1,2}\\/\\d{1,2}\\/\\d{4}\\b/g) || [];
          const attr = name => String(card?.getAttribute(name) || '').toLowerCase();
          return {
            index, text, sku: sku.toUpperCase(),
            listPriceUsd: parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0,
            startDate: dates[0] || '', discontinuedDate: dates[1] || '',
            isBto: attr('data-bto') === 'true', isTaa: attr('data-istaa') === 'true',
            isGta: attr('data-isgta') === 'true',
            isCto: attr('data-bto') === 'false' || /configure[\\s-]+to[\\s-]+order|\\bcto\\b/i.test(text)
          };
        });
        return { success: candidates.length > 0, candidates, action: 'CANDIDATES_EXTRACTED' };
      })()
    `;

    const navResult = await sendCommand(ws, 'Runtime.evaluate', { expression: navExpr, awaitPromise: true });
    const extracted = navResult?.result?.value || {};
    const candidates = Array.isArray(extracted.candidates) ? extracted.candidates : [];
    const eligibleCandidates = candidates.filter(candidate => isExactProductCandidate(query, candidate));
    if (eligibleCandidates.length === 0) {
      ws.close();
      const seen = candidates.map(c => `${c.sku || 'NO-SKU'}: ${String(c.text || '').slice(0, 120)}`).join('\n  - ');
      throw new Error(`No exact standard CTO result found for "${query}". BTO, TAA, GTA, and neighboring product identities were rejected.\n  - ${seen || '(no result cards)'}`);
    }
    const selected = eligibleCandidates[0];
    await sendCommand(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const card = document.querySelector('[data-codex-oca-candidate-index="${selected.index}"]');
        const button = Array.from(card?.querySelectorAll('button, a, input[type="button"], input[type="submit"]') || [])
          .find(el => /configure|customize|create quote/i.test((el.innerText || el.value || '').trim()));
        if (!button) return false;
        button.click();
        return true;
      })()`
    });
    ws.close();

    console.log(`⏳ Waiting for OCA WebLogic DOM to fully load configuration Menu tab...`);
    await new Promise(r => setTimeout(r, 6000));

    const intermediatePages = await getPageTargets();
    const intermediate = intermediatePages.find(t => t.url && t.url.includes('oca.ext.hpe.com'));
    if (intermediate) {
      const intermediateWs = await connectWS(intermediate.webSocketDebuggerUrl);
      await sendCommand(intermediateWs, 'Runtime.evaluate', {
        expression: `(() => {
          const body = (document.body?.innerText || '').toLowerCase();
          const expectedSku = ${JSON.stringify(selected.sku.toLowerCase())};
          if (expectedSku && !body.includes(expectedSku)) return false;
          const button = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
            .find(el => /customize|configure/i.test((el.innerText || el.value || '').trim()));
          if (!button) return false;
          button.click();
          return true;
        })()`
      });
      intermediateWs.close();
      await new Promise(r => setTimeout(r, 6000));
    }

    // Re-verify target page
    const updatedPages = await getPageTargets();
    const activeOca = updatedPages.find(t => t.url && t.url.includes('oca.ext.hpe.com'));

    return {
      targetUrl: activeOca ? activeOca.url : ocaTarget.url,
      pageId: activeOca ? activeOca.id : ocaTarget.id,
      baseChassisPriceUsd: selected.listPriceUsd || 0,
      selectedCandidate: selected,
      chassisDiscovery: {
        query,
        selectedSku: selected.sku,
        source: 'HPE OCA Product Search via authenticated CDP session',
        capturedAt: new Date().toISOString(),
        candidates: eligibleCandidates,
        excludedCandidates: candidates.filter(candidate => !isExactProductCandidate(query, candidate))
      },
      status: 'NAVIGATED_TO_CONFIG_PAGE'
    };
  }

  // 3. Check if Partner Portal (partner.hpe.com) is open
  const partnerTarget = pages.find(t => t.url && (t.url.includes('partner.hpe.com') || t.url.includes('login') || t.url.includes('sso')));
  if (partnerTarget) {
    console.log(`🌐 Found active HPE Partner Portal tab at: ${partnerTarget.url}`);

    // Detect if session is expired or at login screen
    const isLoginPage = partnerTarget.url.includes('login') || partnerTarget.url.includes('sso') || partnerTarget.url.includes('auth');
    if (isLoginPage) {
      console.log(`🔒 [AUTH_REQUIRED] Session expired or SSO login required.`);
      console.log(`   Please log into partner.hpe.com in your browser window. Auto-navigator is watching...`);

      // Poll until user completes login
      let retries = 0;
      while (retries < 60) {
        await new Promise(r => setTimeout(r, 3000));
        retries++;
        const currentPages = await getPageTargets();
        const activeTarget = currentPages.find(t => t.url && t.url.includes('partner.hpe.com') && !t.url.includes('login') && !t.url.includes('sso'));
        if (activeTarget) {
          console.log(`🎉 [AUTH_SUCCESS] Re-login detected! Resuming navigation to "${query}"...`);
          return navigateToOCAChassis(query, options);
        }
      }
    }

    console.log(`💡 Launching OCA tool from Partner Portal navigation bar...`);
    const partnerWs = await connectWS(partnerTarget.webSocketDebuggerUrl);
    const launchExpr = `
      (function() {
        const ocaLink = Array.from(document.querySelectorAll('a, button')).find(a => {
          const text = (a.innerText || '').trim().toLowerCase();
          return text.includes('one config advanced') || text === 'oca' || (a.href || '').includes('oca.ext.hpe.com');
        });
        if (ocaLink) {
          ocaLink.click();
          return true;
        }
        return false;
      })()
    `;

    const launchResult = await sendCommand(partnerWs, 'Runtime.evaluate', { expression: launchExpr });
    partnerWs.close();
    if (!launchResult?.result?.value) {
      throw new Error('One Config Advanced launcher was not found on the authenticated Partner Portal page. Direct OCA URL navigation is disabled to preserve SSO state.');
    }

    console.log(`⏳ Waiting for newly created OCA tab to initialize...`);
    await new Promise(r => setTimeout(r, 5000));

    // Recursively enter search & config steps
    return navigateToOCAChassis(query, options);
  }

  // 4. Fallback: Prompt user to log into Partner Portal in Chrome window
  console.log(`🔒 [AUTH_REQUIRED] No active Partner Portal or OCA session found on CDP port ${CDP_PORT}.`);
  console.log(`   Please open Chrome and log into https://partner.hpe.com. Watching for session...`);

  let waitAttempts = 0;
  while (waitAttempts < 60) {
    await new Promise(r => setTimeout(r, 3000));
    waitAttempts++;
    try {
      const freshPages = await getPageTargets();
      const ocaOrPartner = freshPages.find(t => t.url && (t.url.includes('oca.ext.hpe.com') || t.url.includes('partner.hpe.com')));
      if (ocaOrPartner) {
        console.log(`🎉 Session detected! Resuming auto-navigation...`);
        return navigateToOCAChassis(query, options);
      }
    } catch (_) { console.warn('Caught suppressed error in navigate_oca.js:', _); }
  }

  throw new Error(
    `🔒 Timeout waiting for Partner Portal SSO login on CDP port ${CDP_PORT}.\n` +
    `   Please log into https://partner.hpe.com in your browser window and re-run navigation.`
  );
}

// CLI runner support
if (require.main === module) {
  const chassisArg = process.argv[2] || 'DL380 Gen12';
  navigateToOCAChassis(chassisArg)
    .then(res => {
      console.log('🎉 OCA Navigation Complete:', res);
      process.exit(0);
    })
    .catch(err => {
      console.error('❌ OCA Navigation Error:', err.message);
      process.exit(1);
    });
}

module.exports = {
  navigateToOCAChassis,
  normalizeProductText,
  extractModelGeneration,
  isExactProductCandidate
};
