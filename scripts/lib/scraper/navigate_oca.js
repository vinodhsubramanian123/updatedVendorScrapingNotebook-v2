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
  const withSy = normalized.replace(/\bsynergy\b/g, 'sy');
  const model = withSy.match(/\b(?:dl|ml|rl|sy|gx|msl|alletra)\s*\d+[a-z]?\b/)?.[0]?.replace(/\s+/g, '') || '';
  const generation = withSy.match(/\bgen\s*\d+\b/)?.[0]?.replace(/\s+/g, '') || '';
  return { model, generation };
}

function isExactProductCandidate(query, candidate) {
  const expected = extractModelGeneration(query);
  const observed = extractModelGeneration(candidate.text);
  const exactIdentity = Boolean(expected.model && observed.model && expected.model === observed.model &&
    (!expected.generation || expected.generation === observed.generation));
  const isCto = candidate.isCto || /configure[\s-]+to[\s-]+order|\bcto\b|base\s+module|scalable\s+base|base\s+chassis/i.test(candidate.text || '');
  const disallowed = candidate.isBto || candidate.isTaa || candidate.isGta ||
    /(?:\btaa\b|#gta\b)/i.test(candidate.text || '') || /#GTA$/i.test(candidate.sku || '');
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

function closePageTarget(targetId) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://localhost:${CDP_PORT}/json/close/${encodeURIComponent(targetId)}`, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode >= 200 && res.statusCode < 300));
    });
    req.on('error', reject);
  });
}

/**
 * Checks whether the active OCA tab is already on the target configuration menu.
 */
async function checkActiveMenuTab(ocaTarget, query, options) {
  const ws = await connectWS(ocaTarget.webSocketDebuggerUrl);
  const checkState = await sendCommand(ws, 'Runtime.evaluate', {
    expression: `(() => ({
      hasMenu: Boolean(document.querySelector('#extended_overview_menu, .menu_label, .eo_nav_div, a[href*="extended_overview_menu"]') || document.querySelectorAll('table').length > 40),
      pageText: (document.body?.innerText || '').slice(0, 25000)
    }))()`,
    returnByValue: true
  });

  const activeState = checkState?.result?.value;
  const hasMenu = typeof activeState === 'object' ? Boolean(activeState?.hasMenu) : Boolean(activeState);
  const pageText = typeof activeState === 'object' ? (activeState?.pageText || '') : '';
  const activeIdentity = pageText ? extractModelGeneration(pageText) : null;
  const requestedIdentity = extractModelGeneration(query);
  const activeMatchesRequest = !activeIdentity || !activeIdentity.model || (activeIdentity.model === requestedIdentity.model &&
    (!requestedIdentity.generation || activeIdentity.generation === requestedIdentity.generation));

  if (hasMenu && activeMatchesRequest && !options.forceDiscovery) {
    console.log(`⚡ [ACTIVE SESSION] Already inside target OCA configuration page! Ready for scraping.`);
    ws.close();
    return {
      handled: true,
      result: {
        targetUrl: ocaTarget.url,
        pageId: ocaTarget.id,
        status: 'READY_AT_MENU_TAB'
      }
    };
  }

  if (hasMenu && (!activeMatchesRequest || options.forceDiscovery)) {
    console.log(`🔄 Reopening OCA search to collect fresh exact-target discovery evidence for "${query}".`);
    ws.close();
    await closePageTarget(ocaTarget.id);
    await new Promise(r => setTimeout(r, 2000));
    return { handled: true, reopen: true };
  }

  return { handled: false, ws };
}

/**
 * Searches for chassis query on OCA catalog landing page and navigates into configuration.
 */
async function searchAndConfigureChassis(ws, query, ocaTarget) {
  console.log(`🔍 At OCA Product Search page. Entering chassis query: "${query}"...`);
  const navExpr = String.raw`
    (async function() {
      // Ensure "Product Catalog" search mode is selected if OCA landing shows scope menu
      const aiTrigger = document.querySelector('#dqe_ai_mode_trigger');
      if (aiTrigger) {
        aiTrigger.click();
        await new Promise(r => setTimeout(r, 400));
      }
      const prodCatOption = Array.from(document.querySelectorAll('.dqe-menu-item, .item-title')).find(el => (el.innerText || '').includes('Product Catalog'));
      if (prodCatOption) {
        prodCatOption.click();
        await new Promise(r => setTimeout(r, 600));
      }

      // Find search input
      let searchInput = null;
      for (let readinessAttempt = 0; readinessAttempt < 60 && !searchInput; readinessAttempt++) {
        searchInput = document.querySelector('#searchProductInput') ||
                      document.querySelector('#search-config') ||
                      document.querySelector('textarea[name="search-config"]') ||
                      document.querySelector('input[type="search"]') ||
                      document.querySelector('input[placeholder*="Search"]');
        if (!searchInput) await new Promise(r => setTimeout(r, 500));
      }
      if (!searchInput) return { success: false, candidates: [], action: 'SEARCH_INPUT_NOT_READY' };

      async function runSearch(q) {
        searchInput.focus();
        searchInput.value = '';
        for (const char of q) {
          searchInput.value += char;
          searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
          await new Promise(r => setTimeout(r, 60));
        }
        searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        
        if (window.jQuery) {
          const kd = window.jQuery.Event('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13 });
          window.jQuery(searchInput).trigger(kd);
        } else {
          searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', which: 13, keyCode: 13, bubbles: true }));
        }
        await new Promise(r => setTimeout(r, 6000));
      }

      function extractCandidates() {
        const result = [];
        // 1. Inspect CTO cards with select.dqe-products dropdown
        const ctoCards = Array.from(document.querySelectorAll('.dqe-card, .cto-card, .card-type-catalog, [class*="cto"]'))
          .sort((a, b) => (b.classList.contains('cto-card') ? 1 : 0) - (a.classList.contains('cto-card') ? 1 : 0));
        for (let cIdx = 0; cIdx < ctoCards.length; cIdx++) {
          const card = ctoCards[cIdx];
          card.setAttribute('data-cand-idx', String(cIdx));
          const productSelect = card.querySelector('select.dqe-products, select[class*="product"], select');
          const button = card.querySelector('.dqe-customize-btn, button, input[type="button"]');
          if (productSelect && button) {
            const isRealCtoCard = card.classList.contains('cto-card') || /—\s*CTO/i.test(card.innerText || '');
            const cardText = (card.innerText || '').replace(/\s+/g, ' ').trim();
            const deliveryLabel = cardText.match(/(?:EDT|estimated delivery|lead time)\s*[:\-]?\s*\d+\s*(?:-|to)\s*\d+\s*days?/i)?.[0] || '';
            const availability = /not yet available|unavailable|out of stock/i.test(cardText)
              ? 'Unavailable'
              : (/available|select product/i.test(cardText) ? 'Available in OCA product catalog' : 'Not published by OCA');
            const cardSel = '[data-cand-idx="' + cIdx + '"]';
            const options = Array.from(productSelect.options || []).filter(o => o.value && o.value !== '-1');
            for (let optIdx = 0; optIdx < options.length; optIdx++) {
              const opt = options[optIdx];
              const text = (opt.text || '').replace(/\s+/g, ' ').trim();
              const sku = opt.value || text.match(/\b(?=[A-Z0-9-]{5,}(?:#GTA)?\b)(?=[A-Z0-9-]*\d)[A-Z0-9]{5,}(?:-[A-Z0-9]{2,3})?(?:#GTA)?\b/i)?.[0] || '';
              const isOptionCto = isRealCtoCard || /configure[\s-]+to[\s-]+order|\bcto\b|base\s+module|scalable\s+base|base\s+chassis/i.test(text);
              result.push({
                type: 'dropdown-option',
                cardSelector: cardSel,
                optionValue: opt.value,
                text,
                sku: sku.toUpperCase(),
                listPriceUsd: 0,
                availability,
                leadTime: deliveryLabel,
                deliveryLabel: /faster[^.]*deliver(?:y|ies)/i.test(cardText) ? cardText.match(/[^.]*faster[^.]*deliver(?:y|ies)[^.]*/i)?.[0]?.trim() || '' : '',
                isBto: !isOptionCto,
                isTaa: /(?:\btaa\b)/i.test(text),
                isGta: /#gta\b/i.test(text) || /#GTA$/i.test(sku),
                isCto: isOptionCto
              });
            }
            continue;
          }

          // 2. Direct catalog cards with a configure / customize button
          const buttonDirect = card.querySelector('.dqe-customize-btn, button, input[type="button"], a.btn');
          const title = (card.querySelector('.card-title, .product-title, h3, h4')?.innerText || card.innerText || '').replace(/\s+/g, ' ').trim();
          const skuMatch = title.match(/\b(?=[A-Z0-9-]{5,}(?:#GTA)?\b)(?=[A-Z0-9-]*\d)[A-Z0-9]{5,}(?:-[A-Z0-9]{2,3})?(?:#GTA)?\b/i);
          const priceMatch = (card.innerText || '').match(/\$\s*([\d,]+(?:\.\d{2})?)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : 0;
          const deliveryLabel = (card.innerText || '').match(/(?:EDT|estimated delivery|lead time)\s*[:\-]?\s*\d+\s*(?:-|to)\s*\d+\s*days?/i)?.[0] || '';
          const availability = /not yet available|unavailable|out of stock/i.test(card.innerText || '')
            ? 'Unavailable'
            : (/available|customize|configure/i.test(card.innerText || '') ? 'Available in OCA product catalog' : 'Not published by OCA');
          const isDirectCto = /configure[\s-]+to[\s-]+order|\bcto\b|base\s+module|scalable\s+base|base\s+chassis/i.test(title);
          if (buttonDirect && title) {
            result.push({
              type: 'direct-button',
              cardSelector: '[data-cand-idx="' + cIdx + '"]',
              text: title,
              sku: (skuMatch ? skuMatch[0] : '').toUpperCase(),
              listPriceUsd: price,
              availability,
              leadTime: deliveryLabel,
              deliveryLabel: /faster[^.]*deliver(?:y|ies)/i.test(card.innerText || '') ? (card.innerText || '').match(/[^.]*faster[^.]*deliver(?:y|ies)[^.]*/i)?.[0]?.trim() || '' : '',
              isBto: !isDirectCto,
              isTaa: /(?:\btaa\b)/i.test(title),
              isGta: /#gta\b/i.test(title),
              isCto: isDirectCto
            });
          }
        }
        return result;
      }

      await runSearch(${JSON.stringify(query)});
      let candidates = extractCandidates();
      if (!candidates.length && ${JSON.stringify(query)}.includes(' ')) {
        const fallbackQuery = ${JSON.stringify(query)}.split(/\s+/)[0];
        await runSearch(fallbackQuery);
        candidates = extractCandidates();
      }

      return {
        success: true,
        action: 'CANDIDATES_COLLECTED',
        candidates
      };
    })()
  `;

  const discoveryRes = await sendCommand(ws, 'Runtime.evaluate', {
    expression: navExpr,
    awaitPromise: true,
    returnByValue: true
  });

  const discovery = discoveryRes?.result?.value || {};
  const candidates = Array.isArray(discovery.candidates) ? discovery.candidates : [];
  const eligibleCandidates = candidates.filter(candidate => isExactProductCandidate(query, candidate));
  console.log(`Found ${candidates.length} search candidate(s) (${eligibleCandidates.length} eligible standard CTO base(s)).`);

  const selected = eligibleCandidates[0];
  if (!selected) {
    ws.close();
    throw new Error(
      `No exact standard CTO base model found for query "${query}".\n` +
      `Discovered candidates (${candidates.length}):\n` +
      candidates.slice(0, 10).map(c => ` - ${c.sku || 'NO_SKU'} | ${c.text} (CTO=${c.isCto}, TAA=${c.isTaa}, GTA=${c.isGta}, BTO=${c.isBto})`).join('\n')
    );
  }

  console.log(`🎯 Selected standard CTO base: ${selected.sku} - "${selected.text}" (Price: $${selected.listPriceUsd || 0})`);

  const selectAndClickExpr = String.raw`
    (async function() {
      const card = document.querySelector(${JSON.stringify(selected.cardSelector)});
      if (!card) return { success: false, reason: 'CARD_NOT_FOUND' };

      if (${JSON.stringify(selected.type)} === 'dropdown-option') {
        const productSelect = card.querySelector('select.dqe-products, select[class*="product"], select');
        if (productSelect) {
          productSelect.value = ${JSON.stringify(selected.optionValue)};
          productSelect.dispatchEvent(new Event('change', { bubbles: true }));
          if (window.jQuery) {
            window.jQuery(productSelect).trigger('change');
          }
          await new Promise(r => setTimeout(r, 2500));
        }

        // Auto-select enclosure & rack if required by product (e.g. Synergy compute module or chassis)
        const encSelect = card.querySelector('select.dqe-enclosure');
        if (encSelect && !encSelect.classList.contains('dqe-hidden') && encSelect.value === '-1') {
          encSelect.value = 'standalone';
          encSelect.dispatchEvent(new Event('change', { bubbles: true }));
          if (window.jQuery) window.jQuery(encSelect).trigger('change');
        }

        const rackSelect = card.querySelector('select.dqe-rack');
        if (rackSelect && !rackSelect.classList.contains('dqe-hidden') && rackSelect.value === '-1') {
          rackSelect.value = 'standalone';
          rackSelect.dispatchEvent(new Event('change', { bubbles: true }));
          if (window.jQuery) window.jQuery(rackSelect).trigger('change');
        }
        await new Promise(r => setTimeout(r, 1000));
      }

      const button = card.querySelector('.dqe-customize-btn, button, input[type="button"], a.btn') ||
                     document.querySelector('.dqe-customize-btn');
      if (!button) return { success: false, reason: 'CUSTOMIZE_BUTTON_NOT_FOUND' };

      button.scrollIntoView({ block: 'center' });
      await new Promise(r => setTimeout(r, 400));
      button.click();
      return { success: true, clicked: true };
    })()
  `;

  await sendCommand(ws, 'Runtime.evaluate', {
    expression: selectAndClickExpr,
    awaitPromise: true,
    returnByValue: true
  });

  ws.close();
  console.log(`⏳ Waiting for WebLogic configuration workspace to load...`);
  await new Promise(r => setTimeout(r, 8000));

  // Handle intermediate "Customize" or "Configure" gateway page if present
  const intermediatePages = await getPageTargets();
  const intermediate = intermediatePages.find(t => t.url && t.url.includes('oca.ext.hpe.com'));
  if (intermediate) {
    const intermediateWs = await connectWS(intermediate.webSocketDebuggerUrl);
    await sendCommand(intermediateWs, 'Runtime.evaluate', {
      expression: String.raw`(() => {
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
  let deliveryEstimate = '';
  if (activeOca) {
    const summaryWs = await connectWS(activeOca.webSocketDebuggerUrl);
    const deliveryResult = await sendCommand(summaryWs, 'Runtime.evaluate', {
      expression: String.raw`(() => {
        const text = (document.body?.innerText || '').replace(/\s+/g, ' ');
        return text.match(/(?:EDT|estimated delivery|lead time)\s*[:\-]?\s*\d+\s*(?:-|to)\s*\d+\s*days?/i)?.[0] || '';
      })()`,
      returnByValue: true
    });
    deliveryEstimate = deliveryResult?.result?.value || '';
    summaryWs.close();
  }

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
      deliveryEstimate,
      candidates: eligibleCandidates,
      excludedCandidates: candidates.filter(candidate => !isExactProductCandidate(query, candidate))
    },
    status: 'NAVIGATED_TO_CONFIG_PAGE'
  };
}

/**
 * Handles launching the OCA tool when browser is on Partner Portal tab.
 */
async function handlePartnerPortalLaunch(partnerTarget, query, options) {
  console.log(`🌐 Found active HPE Partner Portal tab at: ${partnerTarget.url}`);

  const isLoginPage = partnerTarget.url.includes('login') || partnerTarget.url.includes('sso') || partnerTarget.url.includes('auth');
  if (isLoginPage) {
    console.log(`🔒 [AUTH_REQUIRED] Session expired or SSO login required.`);
    console.log(`   Please log into partner.hpe.com in your browser window. Auto-navigator is watching...`);

    let retries = 0;
    while (retries < 60) {
      await new Promise(r => setTimeout(r, 3000));
      retries++;
      const currentPages = await getPageTargets();
      await pruneSeismicTabs(currentPages);
      const activeTarget = currentPages.find(t => !isSeismicTarget(t) && t.url && t.url.includes('partner.hpe.com') && !t.url.includes('login') && !t.url.includes('sso'));
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

  const launchResult = await sendCommand(partnerWs, 'Runtime.evaluate', {
    expression: launchExpr,
    userGesture: true
  });
  partnerWs.close();
  if (!launchResult?.result?.value) {
    throw new Error('One Config Advanced launcher was not found on the authenticated Partner Portal page. Direct OCA URL navigation is disabled to preserve SSO state.');
  }

  console.log(`⏳ Waiting for newly created OCA tab to initialize...`);
  await new Promise(r => setTimeout(r, 5000));

  return navigateToOCAChassis(query, options);
}

/**
 * Polls for user to log in or open Partner Portal / OCA in browser window.
 */
async function waitForBrowserSession(query, options) {
  console.log(`🔒 [AUTH_REQUIRED] No active Partner Portal or OCA session found on CDP port ${CDP_PORT}.`);
  console.log(`   Please open Chrome and log into https://partner.hpe.com. Watching for session...`);

  let waitAttempts = 0;
  while (waitAttempts < 60) {
    await new Promise(r => setTimeout(r, 3000));
    waitAttempts++;
    try {
      const freshPages = await getPageTargets();
      await pruneSeismicTabs(freshPages);
      const ocaOrPartner = freshPages.find(t => !isSeismicTarget(t) && t.url && (t.url.includes('oca.ext.hpe.com') || t.url.includes('partner.hpe.com')));
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

function isSeismicTarget(t) {
  const url = (t.url || '').toLowerCase();
  const title = (t.title || '').toLowerCase();
  return url.includes('seismic.com') || title.includes('seismic');
}

async function pruneSeismicTabs(pages) {
  for (const t of pages || []) {
    if (isSeismicTarget(t) && t.id) {
      console.log(`🧹 [SEISMIC_PRUNE] Closing unwanted Seismic sales collateral tab: [${t.id}] ${t.url}`);
      try {
        await closePageTarget(t.id);
      } catch (_) {}
    }
  }
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
  await pruneSeismicTabs(pages);

  // 1. Check if active OCA configuration page is already at Menu tab
  const ocaTarget = pages.find(t => !isSeismicTarget(t) && t.url && t.url.includes('oca.ext.hpe.com'));
  if (ocaTarget) {
    console.log(`✅ Found active OCA tab: [${ocaTarget.id}] ${ocaTarget.title}`);
    const menuCheck = await checkActiveMenuTab(ocaTarget, query, options);
    if (menuCheck.handled) {
      if (menuCheck.reopen) {
        return navigateToOCAChassis(query, options);
      }
      return menuCheck.result;
    }
    return searchAndConfigureChassis(menuCheck.ws, query, ocaTarget);
  }

  // 2. Check if Partner Portal (partner.hpe.com) is open (strictly excluding Seismic)
  const partnerTarget = pages.find(t => {
    if (isSeismicTarget(t)) return false;
    const url = (t.url || '').toLowerCase();
    if (url.includes('partner.hpe.com')) return true;
    if ((url.includes('login') || url.includes('sso') || url.includes('auth')) && url.includes('hpe.com')) return true;
    return false;
  });
  if (partnerTarget) {
    return handlePartnerPortalLaunch(partnerTarget, query, options);
  }

  // 3. Fallback: Prompt user to log into Partner Portal in Chrome window
  return waitForBrowserSession(query, options);
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
