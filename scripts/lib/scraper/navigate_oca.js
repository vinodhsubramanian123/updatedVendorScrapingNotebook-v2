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
  const model = normalized.match(/\b(?:dl|ml|rl|sy|gx|msl|alletra)\s*\d+[a-z]?\b/)?.[0]?.replace(/\s+/g, '') || '';
  const generation = normalized.match(/\bgen\s*\d+\b/)?.[0]?.replace(/\s+/g, '') || '';
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
    if (hasMenu && activeMatchesRequest) {
      console.log(`⚡ [ACTIVE SESSION] Already inside target OCA configuration page! Ready for scraping.`);
      ws.close();
      return {
        targetUrl: ocaTarget.url,
        pageId: ocaTarget.id,
        status: 'READY_AT_MENU_TAB'
      };
    }
    if (hasMenu && !activeMatchesRequest) {
      console.log(`🔄 Active OCA configuration is for another product; reopening OCA search for exact target "${query}".`);
      ws.close();
      await closePageTarget(ocaTarget.id);
      await new Promise(r => setTimeout(r, 2000));
      return navigateToOCAChassis(query, options);
    }

    // 2. If at OCA Product Search / Catalog page: search chassis and configure
    console.log(`🔍 At OCA Product Search page. Entering chassis query: "${query}"...`);
    const navExpr = `
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
        const searchInput = document.querySelector('#searchProductInput') ||
                            document.querySelector('#search-config') ||
                            document.querySelector('textarea[name="search-config"]') ||
                            document.querySelector('input[type="search"]') ||
                            document.querySelector('input[placeholder*="Search"]');

        async function runSearch(q) {
          searchInput.focus();
          searchInput.value = '';
          for (const char of q) {
            searchInput.value += char;
            searchInput.dispatchEvent(new InputEvent('input', { bubbles: true, data: char, inputType: 'insertText' }));
            await new Promise(r => setTimeout(r, 60));
          }
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          const searchBtn = document.querySelector('#dqe_search_icon_left') ||
                            document.querySelector('#dqe_search_icon_right') ||
                            document.querySelector('#searchButton') ||
                            document.querySelector('button[aria-label*="Search"]');
          if (searchBtn) searchBtn.click();
          else {
            searchInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
            if (window.jQuery) {
              window.jQuery(searchInput).trigger(window.jQuery.Event('keydown', { which: 13, keyCode: 13 }));
            }
          }
          await new Promise(r => setTimeout(r, 5000));
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
                  isBto: !isOptionCto,
                  isTaa: /(?:\btaa\b)/i.test(text),
                  isGta: /#gta\b/i.test(text) || /#GTA$/i.test(sku),
                  isCto: isOptionCto
                });
              }
            }
          }

          // 2. Also inspect standalone button cards (preconfigured servers, etc.)
          const configBtns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).filter(el => {
            const txt = (el.innerText || '').toLowerCase();
            const value = (el.value || '').toLowerCase();
            return (txt.includes('configure') || txt.includes('customize') || txt.includes('create quote') ||
              value.includes('configure') || value.includes('customize')) && !el.closest('.cto-card');
          });
          for (let index = 0; index < configBtns.length; index++) {
            const button = configBtns[index];
            const card = button.closest('[data-product-id], [data-bto], [data-istaa], tr, article, li, .card, .product-card, .product') || button.parentElement;
            if (card) card.setAttribute('data-codex-oca-candidate-index', String(index));
            const text = (card?.innerText || button.innerText || '').replace(/\s+/g, ' ').trim();
            const sku = text.match(/\b(?=[A-Z0-9-]{5,}(?:#GTA)?\b)(?=[A-Z0-9-]*\d)[A-Z0-9]{5,}(?:-[A-Z0-9]{2,3})?(?:#GTA)?\b/i)?.[0] || '';
            const priceText = text.match(/(?:USD|\$)\s*[0-9,]+(?:\.\d{2})?/i)?.[0] || '';
            const dates = text.match(new RegExp('\\b\\d{1,2}/\\d{1,2}/\\d{4}\\b', 'g')) || [];
            const attr = name => String(card?.getAttribute(name) || '').toLowerCase();
            result.push({
              type: 'button-card',
              index, text, sku: sku.toUpperCase(),
              listPriceUsd: parseFloat(priceText.replace(/[^0-9.]/g, '')) || 0,
              startDate: dates[0] || '', discontinuedDate: dates[1] || '',
              isBto: attr('data-bto') === 'true', isTaa: attr('data-istaa') === 'true',
              isGta: attr('data-isgta') === 'true',
              isCto: attr('data-bto') === 'false' || /configure[\s-]+to[\s-]+order|\bcto\b/i.test(text)
            });
          }
          return result;
        }

        if (searchInput) {
          const searchTerm = ${JSON.stringify(query)}.replace(/\s*(?:tape|storage|module|server|chassis)\b/ig, '').trim() || ${JSON.stringify(query)};
          await runSearch(searchTerm);
        }
        let candidates = extractCandidates();
        if (candidates.length === 0 && searchInput && /\b(?:gen\s*\d+|tape|module|server|storage)\b/i.test(${JSON.stringify(query)})) {
          const baseQuery = ${JSON.stringify(query)}.replace(/\s*(?:gen\s*\d+|tape|module|server|storage)\b/ig, '').trim();
          if (baseQuery && baseQuery !== ${JSON.stringify(query)}) {
            await runSearch(baseQuery);
            candidates = extractCandidates();
          }
        }
        return { success: candidates.length > 0, candidates, action: 'CANDIDATES_EXTRACTED' };
      })()
    `;

    const navResult = await sendCommand(ws, 'Runtime.evaluate', { expression: navExpr, awaitPromise: true, returnByValue: true });
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
      expression: `(async () => {
        if (${JSON.stringify(selected.type)} === 'dropdown-option') {
          const card = document.querySelector(${JSON.stringify(selected.cardSelector || '.cto-card')}) || document.querySelector('.cto-card');
          const select = card?.querySelector('select.dqe-products, select');
          if (select) {
            select.value = ${JSON.stringify(selected.optionValue)};
            if (window.jQuery) window.jQuery(select).val(${JSON.stringify(selected.optionValue)}).trigger('change');
            else select.dispatchEvent(new Event('change', { bubbles: true }));
          }
          await new Promise(r => setTimeout(r, 1000));
          const rackSelect = card?.querySelector('select.dqe-rack');
          if (rackSelect && rackSelect.offsetParent !== null) {
            rackSelect.value = 'standalone';
            if (window.jQuery) window.jQuery(rackSelect).val('standalone').trigger('change');
            else rackSelect.dispatchEvent(new Event('change', { bubbles: true }));
          }
          await new Promise(r => setTimeout(r, 500));
          const btn = card?.querySelector('.dqe-customize-btn, button, input[type="button"]');
          if (btn) {
            btn.click();
            return true;
          }
          return false;
        } else {
          const card = document.querySelector('[data-codex-oca-candidate-index="${selected.index}"]');
          const button = Array.from(card?.querySelectorAll('button, a, input[type="button"], input[type="submit"]') || [])
            .find(el => /configure|customize|create quote/i.test((el.innerText || el.value || '').trim()));
          if (!button) return false;
          button.click();
          return true;
        }
      })()`,
      awaitPromise: true
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
