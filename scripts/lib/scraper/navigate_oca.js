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
const dotenv = require('dotenv');
const { sendCommand, connectWS, getOCATarget, waitForDOMPredicate, sleep } = require('./cdp.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
dotenv.config({ path: path.join(PROJECT_ROOT, '.env') });

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
  
  // Appliance exclusion: do not match Aruba, SimpliVity, or networking central appliances unless requested
  const isArubaQuery = /aruba|networking/i.test(query);
  const isAppliance = /(?:aruba|networking\s+central|hardware\s+appliance|backup\s+gateway)/i.test(candidate.text || '');
  if (!isArubaQuery && isAppliance) return false;

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
      if (typeof res.resume === 'function') res.resume();
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
    expression: `(() => {
      const pageText = (document.body?.innerText || '').slice(0, 25000);
      const isLoggedOut = /you are logged out|logged out successfully|session (?:has )?expired|session (?:is )?invalid|session timed out|please sign in again/i.test(pageText) ||
        Boolean(document.querySelector('img[src*="lock"], .lock-icon, [class*="logout"]'));
      const hasException = Boolean(
        document.querySelector('.dqe-error, .dqe-alert, .ui-dialog-titlebar-close, .modal-error, [class*="error-dialog"]') ||
        /an unexpected error has occurred|exception occurred|internal server error|weblogic bridge message/i.test(pageText)
      );
      const hasMenu = Boolean(
        document.querySelector('#extended_overview_menu, .menu_label, .eo_nav_div, a[href*="extended_overview_menu"]') ||
        document.querySelectorAll('table').length > 40
      );
      return { hasMenu, isLoggedOut, hasException, pageText };
    })()`,
    returnByValue: true
  });

  const activeState = checkState?.result?.value;
  const isLoggedOut = Boolean(activeState?.isLoggedOut);
  const hasException = Boolean(activeState?.hasException);

  if (isLoggedOut || hasException) {
    const reason = isLoggedOut ? 'logged out ("You are logged out successfully!")' : 'displaying an exception/error dialog';
    console.warn(`🚨 [STALE_SESSION] OCA tab [${ocaTarget.id}] is ${reason}. As OCA cannot be reloaded in-place, closing tab immediately and recovering via Partner Portal...`);
    ws.close();
    try { await closePageTarget(ocaTarget.id); } catch (_) {}
    await new Promise(r => setTimeout(r, 1000));
    return { handled: true, isStaleOrLoggedOut: true };
  }

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
  
  // Sort eligible candidates: prefer standard worldwide -B21 CTO SKUs, ProLiant text, and SFF over LFF
  eligibleCandidates.sort((a, b) => {
    const aB21 = (a.sku || '').endsWith('-B21') ? 1 : 0;
    const bB21 = (b.sku || '').endsWith('-B21') ? 1 : 0;
    if (bB21 !== aB21) return bB21 - aB21;

    const aProLiant = /proliant/i.test(a.text || '') ? 1 : 0;
    const bProLiant = /proliant/i.test(b.text || '') ? 1 : 0;
    if (bProLiant !== aProLiant) return bProLiant - aProLiant;

    const a8Sff = /8sff/i.test(a.text || '') ? 1 : 0;
    const b8Sff = /8sff/i.test(b.text || '') ? 1 : 0;
    if (b8Sff !== a8Sff) return b8Sff - a8Sff;

    return 0;
  });

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

  // Dynamically poll for active OCA target to reach readiness
  const wsWaitStart = Date.now();
  while (Date.now() - wsWaitStart < 15000) {
    await sleep(1000);
    const pages = await getPageTargets();
    const activeTarget = pages.find(t => t.url && t.url.includes('oca.ext.hpe.com'));
    if (activeTarget) {
      try {
        const testWs = await connectWS(activeTarget.webSocketDebuggerUrl);
        const isReadyOrIntermediate = await waitForDOMPredicate(testWs, `Boolean(
          document.querySelector('#extended_overview_menu, .menu_label, .eo_nav_div, table.eo_category_table') ||
          Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).some(el => /customize|configure/i.test((el.innerText || el.value || '').trim())) ||
          document.querySelectorAll('table').length > 20
        )`, 3000, 500);
        testWs.close();
        if (isReadyOrIntermediate) break;
      } catch (_) {}
    }
  }

  // Handle intermediate "Customize" or "Configure" gateway page if present
  const intermediatePages = await getPageTargets();
  const intermediate = intermediatePages.find(t => t.url && t.url.includes('oca.ext.hpe.com'));
  if (intermediate) {
    const intermediateWs = await connectWS(intermediate.webSocketDebuggerUrl);
    const clickRes = await sendCommand(intermediateWs, 'Runtime.evaluate', {
      expression: String.raw`(() => {
        const body = (document.body?.innerText || '').toLowerCase();
        const expectedSku = ${JSON.stringify(selected.sku.toLowerCase())};
        if (expectedSku && !body.includes(expectedSku)) return false;
        const button = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'))
          .find(el => /customize|configure/i.test((el.innerText || el.value || '').trim()));
        if (!button) return false;
        button.click();
        return true;
      })()`,
      returnByValue: true
    });
    if (clickRes?.result?.value) {
      console.log(`⏳ Clicked intermediate configuration button. Waiting for menu to load...`);
      await waitForDOMPredicate(intermediateWs, `Boolean(
        document.querySelector('#extended_overview_menu, .menu_label, .eo_nav_div, table.eo_category_table') ||
        document.querySelectorAll('table').length > 20
      )`, 12000, 500);
    }
    intermediateWs.close();
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

  if (!deliveryEstimate) {
    deliveryEstimate = 'EDT 17 - 21 days';
  }

  eligibleCandidates.forEach(cand => {
    if (!cand.leadTime) cand.leadTime = deliveryEstimate;
  });

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
 * Automatically signs into HPE Partner Portal using auto-saved credentials in Chrome profile.
 */
async function performAutomatedSignIn(partnerTarget) {
  console.log(`🔐 [AUTO_LOGIN] Initiating automated sign-in on ${partnerTarget.url}...`);
  let ws = await connectWS(partnerTarget.webSocketDebuggerUrl);

  const portalUser = process.env.HPE_PORTAL_USER || 'hpeconfig@swiftline-uae.com';
  const portalPass = process.env.HPE_PORTAL_PASS || 'Amch1Mumb@2';

  try {
    // 1. Fill email input & click #oktaSignInBtn
    let emailSubmitted = false;
    for (let emailAttempt = 0; emailAttempt < 15 && !emailSubmitted; emailAttempt++) {
      try {
        const emailState = await sendCommand(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const cookieBtn = document.querySelector('#truste-consent-button, #truste-consent-close, .truste_popframe, #truste-consent-required');
            if (cookieBtn) cookieBtn.click();

            const emailInput = document.querySelector('#oktaEmailInput, input[name="email"], input[type="email"]');
            if (!emailInput) return { found: false };

            emailInput.focus();
            emailInput.value = '';
            return { found: true };
          })()`,
          returnByValue: true
        });

        if (emailState?.result?.value?.found) {
          await sendCommand(ws, 'Input.insertText', { text: portalUser });
          await sendCommand(ws, 'Runtime.evaluate', {
            expression: `(() => {
              const emailInput = document.querySelector('#oktaEmailInput, input[name="email"], input[type="email"]');
              if (emailInput) {
                emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                emailInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()`
          });

          const btnCoords = await sendCommand(ws, 'Runtime.evaluate', {
            expression: `(() => {
              const btn = document.querySelector('#oktaSignInBtn, button.btn-sign-in');
              if (!btn) return null;
              const rect = btn.getBoundingClientRect();
              btn.focus();
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            })()`,
            returnByValue: true
          });

          if (btnCoords?.result?.value?.x) {
            const { x, y } = btnCoords.result.value;
            await sendCommand(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
            await sendCommand(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
            console.log(`   Submitted email (${portalUser}) via Sign in button.`);
            emailSubmitted = true;
            break;
          }
        }
      } catch (_) {}
      await sleep(1000);
    }

    // 2. Wait for credential / password page and submit password
    let passwordSubmitted = false;
    for (let passAttempt = 0; passAttempt < 30 && !passwordSubmitted; passAttempt++) {
      try {
        const passState = await sendCommand(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const passInput = document.querySelector('#password-sign-in, input[type="password"], #okta-signin-password, #onepass-password');
            if (!passInput) {
              // If we are on /login and email input was cleared, re-fill email
              const emailAgain = document.querySelector('#oktaEmailInput');
              if (emailAgain && (!emailAgain.value || emailAgain.value.trim() === '')) {
                return { needsEmail: true };
              }
              return { found: false };
            }
            passInput.focus();
            passInput.value = '';
            return { found: true };
          })()`,
          returnByValue: true
        });

        const stateVal = passState?.result?.value;
        if (stateVal?.needsEmail) {
          await sendCommand(ws, 'Input.insertText', { text: portalUser });
          const retryBtn = await sendCommand(ws, 'Runtime.evaluate', {
            expression: `(() => {
              const btn = document.querySelector('#oktaSignInBtn');
              if (!btn) return null;
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            })()`,
            returnByValue: true
          });
          if (retryBtn?.result?.value?.x) {
            const { x, y } = retryBtn.result.value;
            await sendCommand(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
            await sendCommand(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
          }
        } else if (stateVal?.found) {
          await sendCommand(ws, 'Input.insertText', { text: portalPass });
          await sendCommand(ws, 'Runtime.evaluate', {
            expression: `(() => {
              const passInput = document.querySelector('#password-sign-in, input[type="password"], #okta-signin-password, #onepass-password');
              if (passInput) {
                passInput.dispatchEvent(new Event('input', { bubbles: true }));
                passInput.dispatchEvent(new Event('change', { bubbles: true }));
              }
            })()`
          });

          const submitCoords = await sendCommand(ws, 'Runtime.evaluate', {
            expression: `(() => {
              const btn = document.querySelector('#onepass-submit-btn, button.submit-btn, #okta-signin-submit, button[type="submit"]');
              if (!btn) return null;
              const rect = btn.getBoundingClientRect();
              btn.focus();
              return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
            })()`,
            returnByValue: true
          });

          if (submitCoords?.result?.value?.x) {
            const { x, y } = submitCoords.result.value;
            await sendCommand(ws, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
            await sendCommand(ws, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
            console.log(`   Submitted password via onepass-submit-btn.`);
            passwordSubmitted = true;
            break;
          }
        }
      } catch (err) {
        // Re-acquire target and reconnect ws if page navigated
        try {
          const freshPages = await getPageTargets();
          const pTarget = freshPages.find(t => !isSeismicTarget(t) && t.url && (t.url.includes('partner.hpe.com') || t.url.includes('login') || t.url.includes('sso')));
          if (pTarget && pTarget.webSocketDebuggerUrl) {
            try { ws.close(); } catch (_) {}
            ws = await connectWS(pTarget.webSocketDebuggerUrl);
          }
        } catch (_) {}
      }
      await sleep(1000);
    }
  } finally {
    try { ws.close(); } catch (_) {}
  }

  // 3. Wait for authentication redirect to settle on partner.hpe.com/group/prp or direct OCA tab
  console.log(`⏳ Authenticating account and loading Partner Portal (waiting up to 180s)...`);
  const authStart = Date.now();
  while (Date.now() - authStart < 180000) {
    await sleep(2500);
    const pages = await getPageTargets();
    await pruneSeismicTabs(pages);

    // If an OCA tab is already opened by the user or redirect, prioritize it directly
    const directOcaTarget = pages.find(t => t.url && t.url.includes('oca.ext.hpe.com') && !isSeismicTarget(t));
    if (directOcaTarget) {
      console.log(`🎉 [OCA_DETECTED] One Config Advanced tab detected at: ${directOcaTarget.url}`);
      return directOcaTarget;
    }

    const homeTarget = pages.find(t =>
      !isSeismicTarget(t) &&
      t.url &&
      t.url.includes('partner.hpe.com') &&
      !t.url.includes('login') && !t.url.includes('sso') && !t.url.includes('auth') &&
      !(t.title && /sign\s*in|login|log\s*in/i.test(t.title)) &&
      (t.url.includes('/group/prp') || t.url.includes('/home') || t.title.toLowerCase().includes('home - hpe partner portal') || t.title.toLowerCase().includes('partner home'))
    );
    if (homeTarget) {
      console.log(`🎉 [AUTH_SUCCESS] Successfully authenticated into HPE Partner Portal at: ${homeTarget.url}`);
      return homeTarget;
    }
  }

  throw new Error('Automated sign-in timed out waiting for redirect to Partner Portal home page.');
}

/**
 * Handles launching the OCA tool when browser is on Partner Portal tab.
 */
async function handlePartnerPortalLaunch(partnerTarget, query, options) {
  console.log(`🌐 Found active HPE Partner Portal tab at: ${partnerTarget.url} (title: "${partnerTarget.title}")`);

  let isLoginPage = partnerTarget.url.includes('/web/prp') ||
                    partnerTarget.url.includes('login') || 
                    partnerTarget.url.includes('sso') || 
                    partnerTarget.url.includes('auth') ||
                    Boolean(partnerTarget.title && /sign\s*in|login|log\s*in/i.test(partnerTarget.title)) ||
                    (!partnerTarget.url.includes('/group/prp') && !partnerTarget.url.includes('/home'));

  if (!isLoginPage) {
    try {
      const probeWs = await connectWS(partnerTarget.webSocketDebuggerUrl);
      const domCheck = await sendCommand(probeWs, 'Runtime.evaluate', {
        expression: `Boolean(document.querySelector('#oktaEmailInput, #password-sign-in, #oktaSignInBtn, input[type="password"], form[data-se="o-form"]'))`,
        returnByValue: true
      });
      probeWs.close();
      if (domCheck?.result?.value) isLoginPage = true;
    } catch (_) {}
  }

  let activePortalTarget = partnerTarget;
  if (isLoginPage) {
    try {
      activePortalTarget = await performAutomatedSignIn(partnerTarget);
    } catch (loginErr) {
      console.warn(`⚠️ [AUTO_LOGIN] Automated sign-in notice: ${loginErr.message}`);
    }
  }

  // Ensure we are using the authenticated portal home tab
  const currentPages = await getPageTargets();
  await pruneSeismicTabs(currentPages);
  const homeTarget = currentPages.find(t =>
    !isSeismicTarget(t) &&
    t.url &&
    t.url.includes('partner.hpe.com') &&
    !t.url.includes('login') &&
    !t.url.includes('sso') &&
    !t.url.includes('auth') &&
    !(t.title && /sign\s*in|login|log\s*in/i.test(t.title)) &&
    (t.url.includes('/group/prp') || t.url.includes('/home') || t.title.toLowerCase().includes('home - hpe partner portal') || t.title.toLowerCase().includes('partner home'))
  );

  if (activePortalTarget && activePortalTarget.url && activePortalTarget.url.includes('oca.ext.hpe.com')) {
    console.log(`⚡ Direct OCA tab active at: ${activePortalTarget.url}. Navigating directly to "${query}"...`);
    return navigateToOCAChassis(query, { ...options, existingTarget: activePortalTarget });
  }

  const targetToUse = homeTarget || activePortalTarget;
  console.log(`💡 Launching One Config Advanced from Partner Portal Quick links / Tools gateway...`);

  try {
    const partnerWs = await connectWS(targetToUse.webSocketDebuggerUrl);
    const launchResult = await sendCommand(partnerWs, 'Runtime.evaluate', {
      expression: `(() => {
        const link = Array.from(document.querySelectorAll('a')).find(a =>
          (a.href || '').includes('eServiceId=187402') ||
          (a.innerText || '').toLowerCase().includes('one config advanced')
        );
        if (link) {
          link.click();
          return { clicked: true, text: link.innerText };
        }
        return { clicked: false };
      })()`,
      userGesture: true,
      returnByValue: true
    });

    if (launchResult?.result?.value?.clicked) {
      console.log(`🚀 Clicked One Config Advanced link: ${launchResult.result.value.text}`);
    } else {
      console.log(`🧭 Navigating directly to tools-catalog?eServiceId=187402...`);
      await sendCommand(partnerWs, 'Page.navigate', {
        url: 'https://partner.hpe.com/group/prp/tools-catalog?eServiceId=187402'
      });
    }
    partnerWs.close();
  } catch (err) {
    console.warn(`⚠️ Warning launching OCA: ${err.message}`);
  }

  console.log(`⏳ Waiting for newly created OCA tab to initialize with fresh SAML tokens...`);
  const waitStart = Date.now();
  while (Date.now() - waitStart < 30000) {
    await sleep(1000);
    try {
      const currentTargets = await getPageTargets();
      const freshOca = currentTargets.find(t => !isSeismicTarget(t) && t.url && t.url.includes('oca.ext.hpe.com'));
      if (freshOca) break;
    } catch (_) {}
  }

  // Strip forceFreshSession before recursive navigation to allow menu resolution on the new tab
  const nextOptions = { ...options };
  delete nextOptions.forceFreshSession;
  return navigateToOCAChassis(query, nextOptions);
}

/**
 * Polls for user to log in or open Partner Portal / OCA in browser window.
 */
async function waitForBrowserSession(query, options) {
  console.log(`🌐 Checking for Partner Portal session or launching Chrome on port ${CDP_PORT}...`);
  const { ensureChromeBrowserRunning } = require('./browser_launcher.js');
  await ensureChromeBrowserRunning(CDP_PORT, 'https://partner.hpe.com/web/prp');

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
    `   Please ensure Chrome is running on port ${CDP_PORT} and re-run navigation.`
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

  // 0. Ensure Chrome is running with remote debugging port 9222 and persistent profile
  const { ensureChromeBrowserRunning } = require('./browser_launcher.js');
  await ensureChromeBrowserRunning(CDP_PORT, 'https://partner.hpe.com/web/prp');

  const pages = await getPageTargets();
  await pruneSeismicTabs(pages);

  const ocaTarget = !options.forceFreshSession ? pages.find(t => !isSeismicTarget(t) && t.url && t.url.includes('oca.ext.hpe.com')) : null;
  if (ocaTarget) {
    const ocaUrlLower = (ocaTarget.url || '').toLowerCase();
    const ocaTitleLower = (ocaTarget.title || '').toLowerCase();
    const isLoggedOutUrl = ocaUrlLower.includes('/logout') ||
      ocaUrlLower.includes('login_error') ||
      ocaUrlLower.includes('session_expired') ||
      ocaUrlLower.includes('ocainternallogin') ||
      ocaTitleLower.includes('external oca');
    if (isLoggedOutUrl) {
      console.warn(`🚨 [STALE_SESSION] OCA tab [${ocaTarget.id}] is at logged-out/error URL: ${ocaTarget.url}. As OCA cannot be reloaded in-place, closing tab and recovering via Partner Portal...`);
      try { await closePageTarget(ocaTarget.id); } catch (_) {}
      await new Promise(r => setTimeout(r, 1000));
      return recoverAndLaunchFreshOCA(query, options);
    }

    console.log(`✅ Found active OCA tab: [${ocaTarget.id}] ${ocaTarget.title}`);
    try {
      const menuCheck = await checkActiveMenuTab(ocaTarget, query, options);
      if (menuCheck.handled) {
        if (menuCheck.isStaleOrLoggedOut) {
          return recoverAndLaunchFreshOCA(query, options);
        }
        if (menuCheck.reopen) {
          return navigateToOCAChassis(query, options);
        }
        return menuCheck.result;
      }
      return await searchAndConfigureChassis(menuCheck.ws, query, ocaTarget);
    } catch (ocaErr) {
      console.warn(`⚠️ [RECOVERY] OCA interaction error: ${ocaErr.message}. Re-establishing session via Partner Portal...`);
      try { await closePageTarget(ocaTarget.id); } catch (_) {}
      await new Promise(r => setTimeout(r, 2000));
      return recoverAndLaunchFreshOCA(query, options);
    }
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

  // 3. Fallback: Launch Chrome and wait for session
  return waitForBrowserSession(query, options);
}

/**
 * Stale-Session Self-Healing Recovery Protocol (INV-89).
 * Recovers from WebLogic timeouts, silent hangs, or exceptions by returning to Tab 1 (Partner Portal),
 * refreshing the portal to refresh SAML tokens and Quick links, and clicking One Config Advanced anew.
 * Never attempts in-place OCA page reloads which break WebLogic session state.
 */
async function recoverAndLaunchFreshOCA(chassisQuery = 'DL380 Gen12', options = {}) {
  const query = String(chassisQuery || 'DL380 Gen12').trim();
  console.log(`\n===============================================================`);
  console.log(`🔄 [INV-89] TAB 1 STALE-SESSION SELF-HEALING RECOVERY`);
  console.log(`   Target Chassis Query: "${query}"`);
  console.log(`===============================================================\n`);

  // 1. Close any stale, frozen, or broken OCA tabs
  const pages = await getPageTargets();
  await pruneSeismicTabs(pages);
  for (const t of pages) {
    if (t.url && t.url.includes('oca.ext.hpe.com')) {
      console.log(`🧹 Closing stale/broken OCA tab: [${t.id}] ${t.title || t.url}`);
      try { await closePageTarget(t.id); } catch (_) {}
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  // 2. Locate Tab 1 (Partner Portal)
  let freshPages = await getPageTargets();
  let partnerTarget = freshPages.find(t =>
    !isSeismicTarget(t) &&
    t.url &&
    t.url.includes('partner.hpe.com') &&
    !t.url.includes('login') &&
    !t.url.includes('sso')
  );

  if (!partnerTarget) {
    const loginTarget = freshPages.find(t =>
      !isSeismicTarget(t) &&
      t.url &&
      (t.url.includes('partner.hpe.com') || t.url.includes('login') || t.url.includes('sso'))
    );
    if (loginTarget) {
      partnerTarget = await performAutomatedSignIn(loginTarget);
    } else {
      const { ensureChromeBrowserRunning } = require('./browser_launcher.js');
      await ensureChromeBrowserRunning(CDP_PORT, 'https://partner.hpe.com/web/prp');
      return waitForBrowserSession(query, options);
    }
  }

  // 3. Refresh Tab 1 to refresh OCA links and SAML endpoints
  console.log(`🔄 Refreshing Tab 1 (Partner Portal) to regenerate fresh SAML session tokens...`);
  try {
    const ws = await connectWS(partnerTarget.webSocketDebuggerUrl);
    await sendCommand(ws, 'Page.reload');
    await waitForDOMPredicate(ws, `Boolean(
      document.querySelector('.hpe-quicklinks__item a, a.hpe-quicklinks__link, #quick-links-807 a') ||
      document.readyState === 'complete'
    )`, 15000, 500);
    ws.close();
  } catch (reloadErr) {
    console.warn(`⚠️ Warning reloading Partner Portal: ${reloadErr.message}`);
  }

  // 4. Re-acquire fresh Partner Portal target and click One Config Advanced
  freshPages = await getPageTargets();
  const reloadedPartner = freshPages.find(t =>
    !isSeismicTarget(t) &&
    t.url &&
    t.url.includes('partner.hpe.com') &&
    !t.url.includes('login') &&
    !t.url.includes('sso')
  ) || partnerTarget;

  return handlePartnerPortalLaunch(reloadedPartner, query, { ...options, forceFreshSession: true });
}

// CLI runner support
if (require.main === module) {
  const chassisArg = process.argv[2] || 'DL380 Gen12';
  const isRecover = process.argv.includes('--recover') || process.argv.includes('--fresh');
  const runner = isRecover ? recoverAndLaunchFreshOCA(chassisArg) : navigateToOCAChassis(chassisArg);
  runner
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
  recoverAndLaunchFreshOCA,
  normalizeProductText,
  extractModelGeneration,
  isExactProductCandidate,
  waitForDOMPredicate
};
