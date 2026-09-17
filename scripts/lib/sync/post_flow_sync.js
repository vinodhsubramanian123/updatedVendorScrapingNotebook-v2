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
 * Remove stale test payload .md files from outputs/ and subdirectories.
 * Called automatically at the end of each production sync.
 */
function cleanTestPayloads() {
  const OUTPUTS_DIR = path.join(PROJECT_ROOT, 'outputs');
  if (!fs.existsSync(OUTPUTS_DIR)) return;
  let cleaned = 0;

  function scanAndClean(dir) {
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const fullPath = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        scanAndClean(fullPath);
      } else if (ent.isFile() && ent.name.endsWith('.md')) {
        if (TEST_PAYLOAD_PATTERNS.some(p => p.test(ent.name))) {
          try {
            fs.unlinkSync(fullPath);
            cleaned++;
          } catch (e) {
            logger.warn('POST_FLOW_SYNC', `Could not remove test payload ${ent.name}: ${e.message}`);
          }
        }
      }
    }
  }

  scanAndClean(OUTPUTS_DIR);
  if (cleaned > 0) {
    logger.info('POST_FLOW_SYNC', `Cleaned ${cleaned} stale test payload file(s) from outputs/`);
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
  const opts = typeof options === 'string' ? { targetDir: options } : (options || {});
  try {
    logger.info('POST_FLOW_SYNC', `Triggering post-flow knowledge sync for ${chassisName} (Flow: ${flowType})`);
    
    // 1. Build / Update Master Knowledge Registry
    const registry = buildMasterKnowledgeRegistry();
    
    // 2. Generate updated sync payload for target chassis
    const autoUpload = opts.autoUploadNLM === undefined ? process.env.AUTO_UPLOAD_NLM === '1' : opts.autoUploadNLM === true;
    const payload = generateNotebookSyncPayload(chassisName, autoUpload, {
      confirmSourceRetirement: opts.confirmSourceRetirement === true,
      targetDir: opts.targetDir
    });
    
    // 3. Inspect drift metrics
    const drift = inspectKnowledgeDrift(chassisName);

    let syncStatus;
    if (!autoUpload) {
      syncStatus = 'LOCAL_PAYLOAD_ONLY';
    } else if (payload.uploadResult?.success) {
      syncStatus = 'CLOUD_VERIFIED';
    } else {
      syncStatus = 'CLOUD_FAILED';
    }

    logger.info('POST_FLOW_SYNC', `Post-flow sync complete. Status: ${syncStatus} (Drift: ${drift.status}), Total Rules: ${registry.totalLearnedRules}, Unsynced: ${drift.unSyncedDeltasCount}`);

    // 4. GAP-7 FIX: Clean up stale test payload files from outputs/history/
    cleanTestPayloads();

    // 5. Optionally trigger running knowledge charter sync if requested
    let runningKnowledgePromise = null;
    if (options.syncRunningKnowledge) {
      try {
        const { syncRunningKnowledge } = require('../../services/running_knowledge_sync.js');
        runningKnowledgePromise = syncRunningKnowledge({ dryRun: false });
      } catch (rkErr) {
        logger.warn('POST_FLOW_SYNC', `Running knowledge sync advisory: ${rkErr.message}`);
      }
    }

    const result = {
      success: syncStatus !== 'CLOUD_FAILED',
      syncStatus,
      cloudUploaded: Boolean(autoUpload && payload.uploadResult?.success),
      flowType,
      chassisName,
      masterRegistryRulesCount: registry.totalLearnedRules,
      payloadPath: payload.payloadPath,
      driftStatus: drift.status,
      unSyncedDeltasCount: drift.unSyncedDeltasCount,
      uploadResult: payload.uploadResult || null,
      runningKnowledgeSynced: false,
      runningKnowledgePromise
    };

    if (runningKnowledgePromise) {
      runningKnowledgePromise.then((res) => {
        result.runningKnowledgeSynced = res?.success === true;
      }).catch(() => {
        result.runningKnowledgeSynced = false;
      });
    }

    return result;
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

async function triggerPostFlowSyncAsync(chassisName = 'Unknown_Chassis', flowType = 'EVALUATION', options = {}) {
  const result = triggerPostFlowSync(chassisName, flowType, options);
  if (result.runningKnowledgePromise) {
    try {
      const rkRes = await result.runningKnowledgePromise;
      result.runningKnowledgeSynced = rkRes?.success === true;
    } catch (_) {
      result.runningKnowledgeSynced = false;
    }
  }
  delete result.runningKnowledgePromise;
  if (options.syncRunningKnowledge && !result.runningKnowledgeSynced) {
    result.success = false;
    result.error = result.error || 'Running knowledge synchronization did not complete successfully';
  }
  return result;
}

module.exports = { triggerPostFlowSync, triggerPostFlowSyncAsync, cleanTestPayloads };
