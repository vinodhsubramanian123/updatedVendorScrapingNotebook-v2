const path = require('path');
const fs = require('fs');
const { buildMasterKnowledgeRegistry, generateNotebookSyncPayload, inspectKnowledgeDrift } = require('./knowledge_sync.js');
const logger = require('../system/pipeline_logger.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const HISTORY_DIR  = path.join(PROJECT_ROOT, 'outputs', 'history');

// GAP-7 FIX: Patterns matching ephemeral test chassis payload files that
// should never accumulate in outputs/history/.
const TEST_PAYLOAD_PATTERNS = [
  /^notebook_sync_payload_edge-test-/,
  /^notebook_sync_payload_hpe-chaos-test-/,
  /^notebook_sync_payload_tmp[_-]test/,
  /^notebook_sync_payload_test[_-]/
];

/**
 * Remove stale test payload .md files from outputs/history/.
 * Called automatically at the end of each production sync.
 */
function cleanTestPayloads() {
  if (!fs.existsSync(HISTORY_DIR)) return;
  let cleaned = 0;
  for (const fname of fs.readdirSync(HISTORY_DIR)) {
    if (!fname.endsWith('.md')) continue;
    if (TEST_PAYLOAD_PATTERNS.some(p => p.test(fname))) {
      try {
        fs.unlinkSync(path.join(HISTORY_DIR, fname));
        cleaned++;
      } catch (e) {
        logger.warn('POST_FLOW_SYNC', `Could not remove test payload ${fname}: ${e.message}`);
      }
    }
  }
  if (cleaned > 0) {
    logger.info('POST_FLOW_SYNC', `Cleaned ${cleaned} stale test payload file(s) from outputs/history/`);
  }
}

/**
 * Trigger post-flow knowledge synchronization.
 * @param {string} chassisName Target chassis identifier
 * @param {string} flowType E.g. 'EVALUATION', 'SCRAPE', 'PORTAL_FEEDBACK', 'GUARDRAIL'
 * @param {object} [options] Optional settings { autoUploadNLM: false }
 * @returns {object} Sync result summary
 */
function triggerPostFlowSync(chassisName = 'Unknown_Chassis', flowType = 'EVALUATION', options = {}) {
  try {
    logger.info('POST_FLOW_SYNC', `Triggering post-flow knowledge sync for ${chassisName} (Flow: ${flowType})`);
    
    // 1. Build / Update Master Knowledge Registry
    const registry = buildMasterKnowledgeRegistry();
    
    // 2. Generate updated sync payload for target chassis
    const payload = generateNotebookSyncPayload(chassisName, options.autoUploadNLM || false);
    
    // 3. Inspect drift metrics
    const drift = inspectKnowledgeDrift(chassisName);
    
    logger.info('POST_FLOW_SYNC', `Post-flow sync complete. Status: ${drift.status}, Total Rules: ${registry.totalLearnedRules}, Unsynced: ${drift.unSyncedDeltasCount}`);

    // 4. GAP-7 FIX: Clean up stale test payload files from outputs/history/
    cleanTestPayloads();
    
    return {
      success: true,
      flowType,
      chassisName,
      masterRegistryRulesCount: registry.totalLearnedRules,
      payloadPath: payload.payloadPath,
      driftStatus: drift.status,
      unSyncedDeltasCount: drift.unSyncedDeltasCount,
      uploadResult: payload.uploadResult || null
    };
  } catch (err) {
    logger.error('POST_FLOW_SYNC', `Failed post-flow knowledge sync for ${chassisName}`, err);
    return {
      success: false,
      flowType,
      chassisName,
      error: err.message
    };
  }
}

module.exports = { triggerPostFlowSync, cleanTestPayloads };
