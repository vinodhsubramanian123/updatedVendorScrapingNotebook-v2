'use strict';
/**
 * scripts/lib/system/evidence_ledger.js — Unified Pipeline Shared State & Evidence Ledger
 *
 * Implements an auditable, chronological transaction log capturing every step,
 * decision, physical math check, active knowledge rule reached, and SKU mutation
 * across all 9 execution phases of the Antigravity evaluation engine.
 */

const fs = require('fs');
const path = require('path');
const { getTraceId, runWithTrace } = require('./trace_context.js');
const { safeWriteJsonAtomic } = require('./fs_compat.js');
const logger = require('./pipeline_logger.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const EVIDENCE_LOGS_DIR = path.join(PROJECT_ROOT, 'outputs', 'history', 'evidence_logs');

class EvidenceLedger {
  constructor(options = {}) {
    this.traceId = options.traceId || (getTraceId() !== 'NO_TRACE_CONTEXT' ? getTraceId() : `TRC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    this.startedAt = new Date().toISOString();
    this.chassis = options.chassis || 'UNKNOWN_CHASSIS';
    this.customerInput = {
      filePath: options.filePath || null,
      serverCount: options.serverCount || 1,
      totalRequestedLines: options.totalRequestedLines || 0
    };
    this.phases = {};
    this.skuAuditLedger = [];
    this.activeRulesReached = [];
    this.notebookLmTraces = [];
    this.arbitrationDecisions = [];
    this.modernizationDecisions = [];
    this.sharedState = {
      currentChassis: this.chassis,
      nodeMultiplier: options.serverCount || 1,
      detectedFormFactor: options.formFactor || 'Standard',
      aspectChecksCompleted: false,
      conflictGraphCompleted: false,
      strategySynthesized: false,
      dualBrainVerified: false,
      activeDeltaCount: 0
    };
  }

  /**
   * Start a named phase in the pipeline
   */
  startPhase(phaseNum, phaseName, inputSummary = {}) {
    const key = `phase_${phaseNum}`;
    this.phases[key] = {
      phaseNumber: phaseNum,
      phaseName,
      status: 'RUNNING',
      startedAt: new Date().toISOString(),
      completedAt: null,
      durationMs: 0,
      inputSummary,
      outputSummary: null,
      checks: [],
      warnings: [],
      errors: []
    };
    logger.info('EVIDENCE_LEDGER', `[Phase ${phaseNum}: ${phaseName}] STARTED (Trace: ${this.traceId})`);
  }

  /**
   * Complete a named phase with results and verification checks
   */
  completePhase(phaseNum, status = 'PASSED', outputSummary = {}, checks = [], warnings = [], errors = []) {
    const key = `phase_${phaseNum}`;
    if (!this.phases[key]) {
      this.startPhase(phaseNum, `Phase ${phaseNum}`, {});
    }
    const phase = this.phases[key];
    phase.completedAt = new Date().toISOString();
    phase.durationMs = Math.max(1, new Date(phase.completedAt) - new Date(phase.startedAt));
    phase.status = status;
    phase.outputSummary = outputSummary;
    phase.checks = Array.isArray(checks) ? checks : [];
    phase.warnings = Array.isArray(warnings) ? warnings : [];
    phase.errors = Array.isArray(errors) ? errors : [];

    logger.info('EVIDENCE_LEDGER', `[Phase ${phaseNum}: ${phase.phaseName}] COMPLETED (${status}) in ${phase.durationMs}ms`);
  }

  /**
   * Record an audit trail entry for a specific SKU decision
   */
  recordSkuAudit(sku, action, reason, ruleId = 'RULE_BASELINE', componentRole = 'Standard Option', details = {}) {
    this.skuAuditLedger.push({
      timestamp: new Date().toISOString(),
      sku: String(sku || '').trim().toUpperCase(),
      action, // e.g. 'RETAINED_BASELINE', 'INJECTED_MANDATORY_FIX', 'MODERNIZED_PLATFORM', 'PRUNED_OBSOLETE'
      reason,
      ruleId,
      componentRole,
      details
    });
  }

  /**
   * Record that a learned knowledge delta or registry rule was reached and applied
   */
  recordActiveRuleReached(rule) {
    if (!rule) return;
    this.activeRulesReached.push({
      ruleId: rule.ruleId || rule.deltaId || 'LEARNED_RULE',
      ruleType: rule.ruleType || rule.errorType || 'KNOWLEDGE_DELTA',
      chassis: rule.chassis || this.chassis,
      affectedSku: rule.affectedSku || null,
      targetSku: rule.requiredDependencySku || rule.targetSku || null,
      reasoning: rule.reasoning || rule.ruleUpdate || rule.rawMessage || '',
      scopeTaxonomy: rule.scopeTaxonomy || 'CHASSIS_SPECIFIC',
      timestamp: new Date().toISOString()
    });
    this.sharedState.activeDeltaCount = this.activeRulesReached.length;
  }

  /**
   * Record a NotebookLM RAG grounded verification query and response
   */
  recordNotebookLmTrace(queryPayload, responseSummary = {}, citations = [], status = 'VERIFIED_GROUNDED') {
    this.notebookLmTraces.push({
      timestamp: new Date().toISOString(),
      querySummary: typeof queryPayload === 'string' ? queryPayload.slice(0, 200) : (queryPayload.intent || 'RAG_GROUNDING_CHECK'),
      status,
      citations: Array.isArray(citations) ? citations : [],
      responseSummary
    });
    this.sharedState.dualBrainVerified = true;
  }

  /**
   * Finalize the ledger and export JSON and Markdown evidence files
   */
  finalizeAndExport(exportDir = EVIDENCE_LOGS_DIR) {
    this.completedAt = new Date().toISOString();
    this.totalDurationMs = Math.max(1, new Date(this.completedAt) - new Date(this.startedAt));

    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const payload = {
      version: '1.0.0',
      traceId: this.traceId,
      startedAt: this.startedAt,
      completedAt: this.completedAt,
      totalDurationMs: this.totalDurationMs,
      chassis: this.chassis,
      customerInput: this.customerInput,
      sharedState: this.sharedState,
      phases: this.phases,
      activeRulesReached: this.activeRulesReached,
      arbitrationDecisions: this.arbitrationDecisions,
      modernizationDecisions: this.modernizationDecisions,
      skuAuditLedger: this.skuAuditLedger,
      notebookLmTraces: this.notebookLmTraces
    };

    const jsonPath = path.join(exportDir, `evidence_log_${this.traceId}.json`);
    safeWriteJsonAtomic(jsonPath, payload);

    // Also generate markdown summary for human audit
    const mdSummary = this._renderMarkdownSummary();
    const mdPath = path.join(exportDir, `evidence_summary_${this.traceId}.md`);
    fs.writeFileSync(mdPath, mdSummary, 'utf-8');

    return { jsonPath, mdPath, payload };
  }

  /**
   * Render concise human-readable Markdown summary
   */
  _renderMarkdownSummary() {
    const lines = [
      `# Antigravity Execution Trace & Shared State Evidence Log`,
      `**Trace ID:** \`${this.traceId}\` | **Chassis:** \`${this.chassis}\` | **Duration:** ${this.totalDurationMs}ms`,
      `**Timestamp:** ${this.startedAt} to ${this.completedAt}`,
      '',
      `## 1. Pipeline Execution Phases & Status`,
      `| Phase | Name | Status | Duration (ms) | Key Output |`,
      `| :--- | :--- | :---: | :---: | :--- |`
    ];

    Object.values(this.phases).forEach(p => {
      const summaryText = p.outputSummary ? (typeof p.outputSummary === 'string' ? p.outputSummary : JSON.stringify(p.outputSummary).slice(0, 60)) : 'N/A';
      lines.push(`| ${p.phaseNumber} | ${p.phaseName} | **${p.status}** | ${p.durationMs}ms | ${summaryText} |`);
    });

    lines.push('');
    lines.push(`## 2. Active Knowledge Rules Reached & Applied (${this.activeRulesReached.length})`);
    if (this.activeRulesReached.length === 0) {
      lines.push(`*No specific delta overrides required; baseline catalog rules applied.*`);
    } else {
      lines.push(`| Rule ID | Type | Affected SKU | Target SKU | Rationale |`);
      lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
      this.activeRulesReached.forEach(r => {
        lines.push(`| \`${r.ruleId}\` | ${r.ruleType} | \`${r.affectedSku || 'N/A'}\` | \`${r.targetSku || 'N/A'}\` | ${r.reasoning.slice(0, 80)} |`);
      });
    }

    lines.push('');
    lines.push(`## 3. SKU Audit Ledger Decisions (${this.skuAuditLedger.length})`);
    lines.push(`| SKU | Action | Role | Rule ID | Rationale |`);
    lines.push(`| :--- | :--- | :--- | :--- | :--- |`);
    this.skuAuditLedger.slice(0, 50).forEach(s => {
      lines.push(`| \`${s.sku}\` | **${s.action}** | ${s.componentRole} | \`${s.ruleId}\` | ${s.reason.slice(0, 80)} |`);
    });
    if (this.skuAuditLedger.length > 50) {
      lines.push(`*... and ${this.skuAuditLedger.length - 50} more items recorded in JSON log.*`);
    }

    return lines.join('\n');
  }
}

function createEvidenceLedger(options = {}) {
  return new EvidenceLedger(options);
}

module.exports = {
  EvidenceLedger,
  createEvidenceLedger,
  EVIDENCE_LOGS_DIR
};
