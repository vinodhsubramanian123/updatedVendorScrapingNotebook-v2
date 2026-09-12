'use strict';
/**
 * scripts/lib/conflict/decision_trace.js — Decision Chain & Rejected Alternatives Ledger
 *
 * Captures explicit thinking process, trade-offs, and rejected alternatives
 * during conflict resolution and 5-tier strategy synthesis.
 */

class DecisionTraceLedger {
  constructor(sessionId = null) {
    this.sessionId = sessionId || `SESSION-${Date.now()}`;
    this.decisions = [];
    this.startTime = Date.now();
  }

  /**
   * Record a decision point with its alternatives and trade-offs.
   * @param {object} param0
   * @param {string} param0.decisionPoint Name/type of decision (e.g. 'PIVOT_STORAGE_CONTROLLER_TO_PCIE')
   * @param {string} param0.trigger What triggered this decision (e.g. 'Contested OCP Slot 1')
   * @param {Array<object>} param0.alternativesEvaluated Array of candidate options
   * @param {object} param0.selectedAlternative Chosen alternative details
   * @param {Array<string>} [param0.downstreamImpact] Cascading cables, fan kits, or licenses
   * @param {number} [param0.confidence] Score 0.0 - 1.0
   * @returns {object} The recorded decision entry
   */
  recordDecision({
    decisionPoint,
    trigger,
    alternativesEvaluated = [],
    selectedAlternative = null,
    downstreamImpact = [],
    confidence = 1.0
  }) {
    const entry = {
      decisionId: `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      decisionPoint: String(decisionPoint || 'GENERAL_RESOLUTION'),
      trigger: String(trigger || 'Aspect check conflict'),
      alternativesCount: alternativesEvaluated.length,
      alternativesEvaluated: alternativesEvaluated.map(alt => ({
        id: alt.id || alt.name || 'OPTION',
        description: alt.description || '',
        capExDeltaUsd: Number(alt.capExDeltaUsd || 0),
        status: alt.status || (alt.id === selectedAlternative?.id ? 'SELECTED' : 'REJECTED'),
        pros: Array.isArray(alt.pros) ? alt.pros : [],
        cons: Array.isArray(alt.cons) ? alt.cons : [],
        rejectionReason: alt.rejectionReason || null
      })),
      selectedAlternative: selectedAlternative ? {
        id: selectedAlternative.id || selectedAlternative.name || 'SELECTED',
        description: selectedAlternative.description || '',
        capExDeltaUsd: Number(selectedAlternative.capExDeltaUsd || 0),
        selectionRationale: selectedAlternative.selectionRationale || 'Optimal workload match with minimum disruption'
      } : null,
      downstreamImpact: Array.isArray(downstreamImpact) ? downstreamImpact : [],
      confidence: Number(confidence)
    };

    this.decisions.push(entry);
    return entry;
  }

  /**
   * Get all recorded decisions.
   * @returns {Array<object>}
   */
  getDecisions() {
    return this.decisions;
  }

  /**
   * Get a concise markdown summary of the thinking process.
   * @returns {string}
   */
  toMarkdownSummary() {
    if (this.decisions.length === 0) {
      return '> ℹ️ No alternative substitutions were required. Original customer hardware was 100% buildable as drafted.\n';
    }

    let md = `### 🧠 Solution Thinking & Decision Chain (${this.decisions.length} decisions evaluated)\n\n`;
    for (const d of this.decisions) {
      md += `#### 🔹 ${d.decisionPoint}\n`;
      md += `- **Trigger**: ${d.trigger}\n`;
      if (d.selectedAlternative) {
        md += `- **Winning Choice**: **${d.selectedAlternative.id}** (${d.selectedAlternative.description}) — ${d.selectedAlternative.selectionRationale}\n`;
      }
      if (d.alternativesEvaluated.length > 1) {
        md += `- **Rejected Alternatives**:\n`;
        for (const alt of d.alternativesEvaluated) {
          if (alt.status === 'REJECTED') {
            md += `  - ❌ *${alt.id}*: ${alt.rejectionReason || alt.description}\n`;
          }
        }
      }
      if (d.downstreamImpact.length > 0) {
        md += `- **Cascading Dependencies Injected**: ${d.downstreamImpact.join(', ')}\n`;
      }
      md += `\n`;
    }
    return md;
  }

  /**
   * Persist decision traces atomically to history ledger.
   * @param {string} [outputPath] Optional target path
   * @returns {string|null} Saved path or null
   */
  persistLedger(outputPath = null) {
    if (this.decisions.length === 0) return null;
    try {
      const fs = require('fs');
      const path = require('path');
      const { safeWriteJsonAtomic } = require('../system/fs_compat.js');
      const targetPath = outputPath || path.join(process.cwd(), 'outputs', 'history', 'decision_traces.json');
      const dir = path.dirname(targetPath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

      let existing = [];
      if (fs.existsSync(targetPath)) {
        try {
          const raw = fs.readFileSync(targetPath, 'utf8');
          const parsed = JSON.parse(raw);
          existing = Array.isArray(parsed) ? parsed : (parsed.traces || []);
        } catch (_) {}
      }

      const payload = {
        sessionId: this.sessionId,
        savedAt: new Date().toISOString(),
        decisionsCount: this.decisions.length,
        decisions: this.decisions
      };

      // Keep recent 100 session traces
      const updated = [payload, ...existing.filter(e => e.sessionId !== this.sessionId)].slice(0, 100);
      safeWriteJsonAtomic(targetPath, updated);
      return targetPath;
    } catch (_) {
      return null;
    }
  }
}

/**
 * Load historical decision traces from ledger.
 * @param {string} [historyDir] 
 * @returns {Array<object>}
 */
function loadHistoricalDecisionTraces(historyDir = null) {
  const fs = require('fs');
  const path = require('path');
  const targetPath = historyDir
    ? path.join(historyDir, 'decision_traces.json')
    : path.join(process.cwd(), 'outputs', 'history', 'decision_traces.json');

  if (!fs.existsSync(targetPath)) return [];
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : (parsed.traces || []);
  } catch (_) {
    return [];
  }
}

/**
 * Global singleton factory or scoped instance creator.
 */
function createDecisionTraceLedger(sessionId) {
  return new DecisionTraceLedger(sessionId);
}

module.exports = {
  DecisionTraceLedger,
  createDecisionTraceLedger,
  loadHistoricalDecisionTraces
};

