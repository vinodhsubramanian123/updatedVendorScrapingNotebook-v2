'use strict';
/**
 * scripts/lib/post_flow_sync.js — Post-Flow Knowledge Sync Hook
 *
 * Automatically triggers bi-directional knowledge synchronization post completion
 * of evaluation flows, scrape flows, and partner portal feedback loops.
 */

const { buildMasterKnowledgeRegistry, generateNotebookSyncPayload, inspectKnowledgeDrift } = require('./knowledge_sync');
const logger = require('./pipeline_logger');

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

module.exports = { triggerPostFlowSync };
