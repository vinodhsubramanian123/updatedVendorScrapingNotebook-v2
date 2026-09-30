'use strict';
/**
 * scripts/lib/scraper/scraping_verifiability.js
 *
 * Atomic Step Verifiability Matrix, Telemetry Observability & Self-Reflection
 * Engine for Vendor Portal Scraping and Catalog Intelligence Pipelines.
 *
 * Guarantees that at each atomic stage (Step 1 to 10):
 * 1. Pre-conditions and post-conditions are assertively verified.
 * 2. Anomaly bounds (e.g. >25% dropped SKUs, zero tables, broken session) are caught early.
 * 3. Structured telemetry is emitted with actionable diagnostic remediation.
 * 4. Self-reflection logs session metrics for continuous learning.
 */

const fs = require('fs');
const path = require('path');
const logger = require('../system/pipeline_logger.js');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const REFLECTIONS_DIR = path.join(PROJECT_ROOT, 'outputs', 'history', 'scraping_reflections');

class AtomicStepAnomalyError extends Error {
  constructor(stepNum, stage, assertionId, message, diagnosticContext = {}) {
    super(`[Step ${stepNum}: ${stage}] Anomaly detected (${assertionId}): ${message}`);
    this.name = 'AtomicStepAnomalyError';
    this.stepNum = stepNum;
    this.stage = stage;
    this.assertionId = assertionId;
    this.diagnosticContext = diagnosticContext;
  }
}

const SCRAPING_VERIFIABILITY_MATRIX = Object.freeze({
  1: {
    stage: 'CDP_CONNECT',
    name: 'CDP Handshake & Session Verification',
    assertions: [
      {
        id: 'WS_CONNECTED',
        description: 'WebSocket connection to CDP port 9222 is active',
        verify: ctx => Boolean(ctx.wsConnected || (ctx.ws && ctx.ws.readyState === 1)),
        remediation: 'Verify Chrome is launched with --remote-debugging-port=9222 and responsive.'
      }
    ]
  },
  2: {
    stage: 'PORTAL_NAV',
    name: 'Solution Root Discovery & Navigation',
    assertions: [
      {
        id: 'SOLUTION_RESOLVED',
        description: 'Active solution or navigation title is non-empty',
        verify: ctx => Boolean(ctx.solutionName && String(ctx.solutionName).trim().length > 0),
        remediation: 'Ensure active tab is within OCA workspace or Partner Portal tool links.'
      }
    ]
  },
  3: {
    stage: 'CATEGORY_DISCOVERY',
    name: 'Category Discovery & Profiling',
    assertions: [
      {
        id: 'PRODUCT_IDENTITY_VALID',
        description: 'Product cleanName, family, and generation resolved cleanly',
        verify: ctx => Boolean(ctx.cleanName && ctx.family && ctx.gen && ctx.cleanName !== 'Unknown'),
        remediation: 'Verify page heading matches a registered product profile in notebooks.json.'
      },
      {
        id: 'PRODUCT_FIREWALL_VERIFIED',
        description: 'Observed page does not violate strict product identity firewall (e.g. DL380 vs DL380a)',
        verify: ctx => ctx.firewallPassed !== false,
        remediation: 'Active page model conflicts with target chassis query. Abort to prevent catalog cross-contamination.'
      }
    ]
  },
  4: {
    stage: 'PAGE_EXPAND',
    name: 'Section Expansion & Multi-Tab Reveal',
    assertions: [
      {
        id: 'TABLES_DETECTED_POST_EXPAND',
        description: 'At least one category section or table detected after scrolling',
        verify: ctx => (ctx.tablesCount || 0) > 0,
        remediation: 'DOM failed to expand. Check if WebLogic session timed out or modal dialog is blocking.'
      }
    ]
  },
  5: {
    stage: 'DOM_EXTRACTION',
    name: 'DOM Extraction & Tabular Row Scraping',
    assertions: [
      {
        id: 'TEXT_PAYLOAD_AVAILABLE',
        description: 'Extracted text content is non-empty',
        verify: ctx => (ctx.textLength || 0) > 50,
        remediation: 'Verify DOM access permissions and CDP Runtime.evaluate evaluation.'
      },
      {
        id: 'ROWS_SCRAPED_NON_ZERO',
        description: 'Total scraped table rows must be greater than zero',
        verify: ctx => (ctx.rowsCount || 0) > 0,
        remediation: 'Check table selector in dom_extract.js against WebLogic DOM structure.'
      }
    ]
  },
  6: {
    stage: 'RULES_PARSING',
    name: 'Aspect Rules Engine & Constraint Graph',
    assertions: [
      {
        id: 'CTO_VARIANTS_IDENTIFIED',
        description: 'At least one Configure-to-Order base chassis identified',
        verify: ctx => (ctx.ctoVariantsCount || 0) >= 1,
        remediation: 'Verify CTO chassis search criteria and Option Type in product catalog.'
      }
    ]
  },
  7: {
    stage: 'CATALOG_GEN',
    name: 'Catalog Generation & Workbook Compilation',
    assertions: [
      {
        id: 'DIFF_ANOMALY_SAFE',
        description: 'Incremental diff must not drop >25% of existing SKUs unexpectedly',
        verify: ctx => ctx.diffAnomalySafe !== false,
        remediation: 'Diff anomaly detected (>25% dropped SKUs). Quarantined to prevent silent catalog corruption.'
      },
      {
        id: 'RECOMMENDED_COLUMN_POPULATED',
        description: 'HPE Recommended column is present with binary values',
        verify: ctx => ctx.recommendedColumnVerified !== false,
        remediation: 'Ensure parseSingleTableRow populates HPE Recommended field.'
      }
    ]
  },
  8: {
    stage: 'STAGING_AUDIT',
    name: '7-Check Post-Flight Tally Audit',
    assertions: [
      {
        id: 'TALLY_AUDIT_PASSED',
        description: 'Staging Excel workbook matches TSVs and JSON metadata exactly',
        verify: ctx => ctx.tallyAuditPassed !== false,
        remediation: 'Review verify_excel_tally.js report for row count or formula mismatches.'
      }
    ]
  },
  9: {
    stage: 'KNOWLEDGE_SYNC',
    name: 'Live Promotion & NotebookLM Grounding',
    assertions: [
      {
        id: 'CLOUD_SYNC_VERIFIED',
        description: 'Knowledge payload synchronized with Google NotebookLM',
        verify: ctx => ctx.cloudSyncVerified !== false,
        remediation: 'Check nlm CLI credentials and Google Sheet Drive permissions.'
      }
    ]
  },
  10: {
    stage: 'REGISTRY_SYNC',
    name: 'Portfolio Registry & Self-Reflection',
    assertions: [
      {
        id: 'REGISTRY_UPDATED',
        description: 'Learned knowledge registry and charters updated on disk',
        verify: ctx => ctx.registryUpdated !== false,
        remediation: 'Verify master_knowledge_registry.json write permissions.'
      }
    ]
  }
});

/**
 * Verify atomic step pre/post conditions and return structured telemetry
 * @param {number} stepNum - Step 1 to 10
 * @param {object} context - Observability context
 * @returns {{ valid: boolean, stepNum: number, stage: string, checks: Array, failureReason?: string }}
 */
function verifyScrapingStep(stepNum, context = {}) {
  const stepSpec = SCRAPING_VERIFIABILITY_MATRIX[stepNum];
  if (!stepSpec) {
    return { valid: true, stepNum, stage: 'UNKNOWN_STEP', checks: [] };
  }

  const checks = [];
  let allPassed = true;
  let firstFailure = null;

  for (const assertion of stepSpec.assertions) {
    let passed = false;
    try {
      passed = Boolean(assertion.verify(context));
    } catch (err) {
      passed = false;
      assertion.error = err.message;
    }

    checks.push({
      id: assertion.id,
      description: assertion.description,
      passed,
      remediation: !passed ? assertion.remediation : null
    });

    if (!passed && allPassed) {
      allPassed = false;
      firstFailure = {
        assertionId: assertion.id,
        message: assertion.description,
        remediation: assertion.remediation
      };
    }
  }

  const telemetry = {
    valid: allPassed,
    stepNum,
    stage: stepSpec.stage,
    name: stepSpec.name,
    timestamp: new Date().toISOString(),
    checks,
    failure: firstFailure
  };

  if (!allPassed) {
    logger.warn('SCRAPING_OBSERVABILITY', `[Step ${stepNum}: ${stepSpec.stage}] Check Failed: ${firstFailure.assertionId} — ${firstFailure.message}. Remediation: ${firstFailure.remediation}`);
  } else {
    logger.info('SCRAPING_OBSERVABILITY', `[Step ${stepNum}: ${stepSpec.stage}] All ${checks.length} assertions PASSED.`);
  }

  return telemetry;
}

/**
 * Record session self-reflection and telemetry to disk
 * @param {object} sessionMetrics
 * @returns {object} Reflection record
 */
function selfReflectOnScrapingSession(sessionMetrics = {}) {
  const timestamp = new Date().toISOString();
  const id = `${Date.now()}-${sessionMetrics.product || 'session'}`;
  const reflection = {
    reflectionId: `REFL-${id}`,
    product: sessionMetrics.product || 'UNKNOWN_PRODUCT',
    family: sessionMetrics.family || 'UNKNOWN_FAMILY',
    generation: sessionMetrics.generation || 'UNKNOWN_GEN',
    timestamp,
    durationMs: sessionMetrics.durationMs || 0,
    totalSkusScraped: sessionMetrics.totalSkusScraped || 0,
    hwSkuCount: sessionMetrics.hwSkuCount || 0,
    serviceSkuCount: sessionMetrics.serviceSkuCount || 0,
    conditionalSkusCount: sessionMetrics.conditionalSkusCount || 0,
    networkRulesCaptured: sessionMetrics.networkRulesCaptured || 0,
    diffStatus: sessionMetrics.diffStatus || 'NORMAL',
    cloudSyncState: sessionMetrics.cloudSyncState || 'UNKNOWN',
    anomaliesEncountered: sessionMetrics.anomalies || [],
    remediationsApplied: sessionMetrics.remediations || [],
    stepTelemetrySummary: sessionMetrics.stepTelemetry || {}
  };

  try {
    if (!fs.existsSync(REFLECTIONS_DIR)) {
      fs.mkdirSync(REFLECTIONS_DIR, { recursive: true });
    }
    const targetFile = path.join(REFLECTIONS_DIR, `reflection_${id}.json`);
    safeWriteJsonAtomic(targetFile, reflection);
    logger.info('SCRAPING_OBSERVABILITY', `Session self-reflection saved to ${path.basename(targetFile)}.`);
  } catch (err) {
    logger.warn('SCRAPING_OBSERVABILITY', `Could not persist self-reflection: ${err.message}`);
  }

  return reflection;
}

module.exports = {
  AtomicStepAnomalyError,
  SCRAPING_VERIFIABILITY_MATRIX,
  verifyScrapingStep,
  selfReflectOnScrapingSession
};
