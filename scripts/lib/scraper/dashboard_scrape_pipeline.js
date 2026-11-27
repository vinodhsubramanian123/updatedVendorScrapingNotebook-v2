#!/usr/bin/env node
'use strict';
/**
 * scripts/lib/scraper/dashboard_scrape_pipeline.js
 *
 * Orchestrates 1-Click Dashboard E2E Scraping & Product Onboarding:
 *   1. Verify/launch Chrome CDP session (port 9222, preserves .chrome_sso_profile)
 *   2. Navigate HPE Partner Portal & OCA to target product (supports --recover)
 *   3. Run live OCA scrape (with Step 8 7-check staging audit & atomic promotion)
 *   4. Infer & write ProductCapabilityManifestSchema JSON via onboard_product.js
 *   5. Optionally trigger post-flow NotebookLM sync
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { ensureChromeBrowserRunning, getConfiguredCdpPort } = require('./browser_launcher.js');
const { resolveChassisDirectory } = require('../catalog/sku_versioning.js');
const { runOnboarding } = require('../../maintenance/onboard_product.js');
const { emitProgress } = require('../system/progress.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');

function parsePipelineArgs(argv = process.argv.slice(2)) {
  const opts = { mode: 'solution', recover: false, syncKnowledge: false, skipNavigate: false, chassis: '' };
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i];
    if (tok === '--chassis' && argv[i + 1]) opts.chassis = String(argv[++i]).trim();
    else if (tok === '--mode' && argv[i + 1]) opts.mode = String(argv[++i]).trim();
    else if (tok === '--recover') opts.recover = true;
    else if (tok === '--sync-knowledge') opts.syncKnowledge = true;
    else if (tok === '--skip-navigate') opts.skipNavigate = true;
  }
  return opts;
}

function _runChildNodeScript(relScript, args = []) {
  const fullPath = path.join(PROJECT_ROOT, relScript);
  const res = spawnSync(process.execPath, [fullPath, ...args], {
    cwd: PROJECT_ROOT,
    env: { ...process.env, STRUCTURED_PROGRESS: '1' },
    stdio: 'inherit'
  });
  if (res.status !== 0) {
    throw new Error(`${relScript} exited with code ${res.status}`);
  }
}

function _findCatalogJsonForChassis(chassis) {
  const dir = resolveChassisDirectory(chassis);
  if (!dir || !fs.existsSync(dir)) return { dir: null, catalogPath: null, productId: null };
  const productId = path.basename(dir);
  const files = fs.readdirSync(dir);
  const catFile = files.find(f => /Catalog\.json$/i.test(f));
  return { dir, productId, catalogPath: catFile ? path.join(dir, catFile) : null };
}

async function runDashboardE2EScrape(opts) {
  if (!opts.chassis) throw new Error('--chassis <product> is required for E2E scrape pipeline');
  const productId = opts.chassis.replace(/\s+/g, '_');

  emitProgress(1, 5, 'Checking Chrome CDP Port 9222', 'in_progress', `Target: ${opts.chassis}`, { stage: 'CDP_PREFLIGHT', percent: 10 });
  const cdpPort = typeof getConfiguredCdpPort === 'function' ? getConfiguredCdpPort() : 9222;
  const cdpReady = await ensureChromeBrowserRunning(cdpPort, 'https://partner.hpe.com', { autoSelectFreePort: true });
  if (!cdpReady?.ok) {
    throw new Error(cdpReady?.error || `Chrome CDP port ${cdpPort} is not ready for portal navigation.`);
  }

  if (!opts.skipNavigate) {
    emitProgress(2, 5, 'Navigating HPE Partner Portal & OCA', 'in_progress', `Selecting ${opts.chassis}`, { stage: 'OCA_NAVIGATE', percent: 25 });
    const navArgs = [opts.chassis];
    if (opts.recover) navArgs.push('--recover');
    _runChildNodeScript('scripts/lib/scraper/navigate_oca.js', navArgs);
  }

  emitProgress(3, 5, 'Running Live OCA Scrape & Staging Audit', 'in_progress', `Mode: ${opts.mode}`, { stage: 'OCA_SCRAPE', percent: 50 });
  const scrapeRel = opts.mode === 'storage' ? 'scripts/scrapers/scrape_oca_storage_solution.js' : 'scripts/scrapers/scrape_oca_solution.js';
  const scrapeArgs = ['--chassis', opts.chassis];
  if (opts.recover) scrapeArgs.push('--recover');
  _runChildNodeScript(scrapeRel, scrapeArgs);

  emitProgress(4, 5, 'Onboarding Declarative Product Manifest', 'in_progress', `Inferring ${productId}.json`, { stage: 'ONBOARD_MANIFEST', percent: 85 });
  const located = _findCatalogJsonForChassis(opts.chassis);
  const onboardArgs = ['--product-id', located.productId || productId];
  if (located.catalogPath) onboardArgs.push('--catalog-path', located.catalogPath);
  runOnboarding(onboardArgs);

  if (opts.syncKnowledge) {
    emitProgress(5, 5, 'Syncing Knowledge Deltas', 'in_progress', 'Updating local RAG / NotebookLM queue', { stage: 'KNOWLEDGE_SYNC', percent: 95 });
    const { triggerPostFlowSync } = require('../sync/post_flow_sync.js');
    triggerPostFlowSync(located.productId || productId, 'SCRAPE_E2E');
  }

  emitProgress(5, 5, 'E2E Scrape & Manifest Onboarding Complete', 'completed', located.productId || productId, { stage: 'SCRAPE_E2E_COMPLETE', percent: 100 });
  return { status: 'SUCCESS', productId: located.productId || productId, catalogPath: located.catalogPath };
}

if (require.main === module) {
  runDashboardE2EScrape(parsePipelineArgs())
    .then(res => console.log(JSON.stringify(res, null, 2)))
    .catch(err => {
      console.error(`SCRAPE_E2E_FAILED: ${err.message}`);
      process.exit(1);
    });
}

module.exports = {
  DASHBOARD_SCRAPE_PIPELINE_PATH: __filename,
  parsePipelineArgs,
  runDashboardE2EScrape
};
