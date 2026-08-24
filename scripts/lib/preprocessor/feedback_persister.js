'use strict';
/**
 * scripts/lib/preprocessor/feedback_persister.js — Preprocessing Rule Feedback Persistence
 *
 * Saves human validation / override rules to classification history for continuous learning.
 */

const fs = require('fs');
const path = require('path');
const { safeWriteJsonAtomic } = require('../system/fs_compat.js');

/**
 * Saves human validation/override rule to classification history
 *
 * @param {object} feedbackData - { configId, splitReason, notes }
 * @param {string} outputDir - Chassis output directory
 * @returns {object|null} Created record
 */
function savePreprocessingRuleFeedback(feedbackData, outputDir) {
  if (!outputDir) return null;

  const historyDir = path.join(outputDir, 'history');
  if (!fs.existsSync(historyDir)) {
    fs.mkdirSync(historyDir, { recursive: true });
  }

  const file = path.join(historyDir, 'preprocessing_rules_history.json');
  let history = [];
  if (fs.existsSync(file)) {
    try {
      history = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (_) {
      history = [];
    }
  }

  const record = {
    feedbackId: `PREPROC-${Date.now()}`,
    timestamp: new Date().toISOString(),
    configId: feedbackData.configId,
    humanConfirmedReason: feedbackData.splitReason,
    humanNotes: feedbackData.notes || '',
    chassis: path.basename(outputDir),
    status: 'CONFIRMED'
  };

  history.push(record);
  safeWriteJsonAtomic(file, history);
  return record;
}

module.exports = {
  savePreprocessingRuleFeedback
};
