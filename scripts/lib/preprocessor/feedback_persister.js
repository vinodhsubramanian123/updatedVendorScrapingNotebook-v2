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
      if (!Array.isArray(history)) {
        throw new Error('Corrupted history: root element is not an array');
      }
    } catch (parseErr) {
      // Quarantine corrupted history per INV-131 and Finding F13
      const timestamp = Date.now();
      const quarantineFile = path.join(historyDir, `preprocessing_rules_history.corrupt.${timestamp}.json`);
      try {
        fs.copyFileSync(file, quarantineFile);
      } catch (copyErr) {
        try { fs.renameSync(file, quarantineFile); } catch (_) {}
      }
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
