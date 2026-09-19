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
const crypto = require('crypto');
const { getTraceId } = require('./trace_context.js');
const { execFileSync } = require('child_process');
const { safeWriteJsonAtomic } = require('./fs_compat.js');
const logger = require('./pipeline_logger.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const EVIDENCE_LOGS_DIR = path.join(PROJECT_ROOT, 'outputs', 'history', 'evidence_logs');

class EvidenceLedger {
  constructor(options = {}) {
    this.traceId = options.traceId || (getTraceId() !== 'NO_TRACE_CONTEXT' ? getTraceId() : `TRC-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`);
    this.startedAt = new Date().toISOString();
    this.chassis = options.chassis || (options.chassisDir ? path.basename(options.chassisDir) : (options.CHASSIS_OVERRIDE || 'UNKNOWN_CHASSIS'));
    this.customerInput = {
      filePath: options.filePath || options.inputFile || options.BOQ_FILE || null,
      serverCount: options.serverCount || 1,
      totalRequestedLines: options.totalRequestedLines || 0
    };
    this.phases = {};
    this.skuAuditLedger = [];
    this.activeRulesReached = [];
    this.notebookLmTraces = [];
    this.arbitrationDecisions = [];
    this.modernizationDecisions = [];
    this.artifacts = [];
    this.events = [];
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
   * Dynamically update target chassis once detected from BOM
   */
  updateTargetChassis(chassis, chassisDir = '') {
    if (chassis) {
      this.chassis = chassis;
      this.sharedState.currentChassis = chassis;
    }
    if (chassisDir) {
      this.customerInput.chassisDir = chassisDir;
    }
  }

  /**
   * Get an immutable snapshot of current ledger state
   */
  getSummarySnapshot() {
    return {
      traceId: this.traceId,
      chassis: this.chassis,
      sharedState: { ...this.sharedState },
      dualBrainVerified: this.sharedState.dualBrainVerified,
      phasesCount: Object.keys(this.phases).length
    };
  }

  /**
   * Start a named phase in the pipeline
   */
  startPhase(phaseNum, phaseName, inputSummary = {}) {
    this.events.push({ sequence: this.events.length + 1, phaseNum, event: 'STARTED', timestamp: new Date().toISOString() });
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
    this.events.push({ sequence: this.events.length + 1, phaseNum, event: status, timestamp: new Date().toISOString() });
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

    // Execution completion and validation outcome are separate facts.
    const executed = !['RUNNING', 'SKIPPED', 'NOT_RUN'].includes(status);
    if (phaseNum === 3) {
      this.sharedState.aspectChecksCompleted = executed;
      this.sharedState.aspectChecksStatus = status;
    } else if (phaseNum === 4) {
      this.sharedState.conflictGraphCompleted = executed;
      this.sharedState.conflictGraphStatus = status;
    } else if (phaseNum === 6) {
      this.sharedState.strategySynthesized = executed;
      this.sharedState.strategyStatus = status;
    }

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
    const isCloudVerified = status === 'VERIFIED_GROUNDED' && responseSummary?.isCloudGrounded === true && Array.isArray(citations) && citations.length > 0;
    const recordedStatus = isCloudVerified ? 'VERIFIED_GROUNDED' : (status === 'VERIFIED_GROUNDED' ? 'LOCAL_RAG_FALLBACK' : status);

    this.notebookLmTraces.push({
      timestamp: new Date().toISOString(),
      querySummary: typeof queryPayload === 'string' ? queryPayload : (queryPayload?.intent || 'RAG_GROUNDING_CHECK'),
      queryPayload,
      querySha256: crypto.createHash('sha256').update(JSON.stringify(queryPayload ?? null)).digest('hex'),
      status: recordedStatus,
      citations: Array.isArray(citations) ? citations : [],
      responseSummary
    });
    this.sharedState.dualBrainVerified = Boolean(isCloudVerified);
  }

  recordInlineArtifact(role, content) {
    const bytes = Buffer.from(typeof content === 'string' ? content : JSON.stringify(content));
    const artifact = { role, filePath: 'IN_MEMORY_BOM', storage: 'INLINE', content,
      exists: true, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
      recordedAt: new Date().toISOString() };
    this.artifacts.push(artifact);
    return artifact;
  }

  recordArtifact(role, filePath, details = {}) {
    const artifact = { role, filePath, ...details, recordedAt: new Date().toISOString(), exists: false };
    if (filePath && fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const bytes = fs.readFileSync(filePath);
      Object.assign(artifact, { exists: true, sizeBytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') });
    }
    this.artifacts.push(artifact);
    return artifact;
  }

  getHealth() {
    const gaps = [];
    if (!this.customerInput.filePath) gaps.push('INPUT_NOT_IDENTIFIED');
    if (!this.chassis || this.chassis === 'UNKNOWN_CHASSIS') gaps.push('CHASSIS_NOT_IDENTIFIED');

    // Dynamic vs Default Phases validation:
    // If specific mandatory phases are registered on the ledger instance, validate them;
    // otherwise validate canonical phases 1 through 9 for full backwards compatibility.
    const mandatoryPhaseKeys = this.mandatoryPhaseKeys || Array.from({ length: 9 }, (_, i) => `phase_${i + 1}`);
    for (const key of mandatoryPhaseKeys) {
      const phase = this.phases[key];
      const nStr = key.replace(/^phase_/, '').toUpperCase();
      if (!phase) gaps.push(`PHASE_${nStr}_MISSING`);
      else if (phase.status === 'RUNNING') gaps.push(`PHASE_${nStr}_UNFINISHED`);
    }
    if (!this.skuAuditLedger.length) gaps.push('SKU_DECISIONS_MISSING');
    if (!this.artifacts.some(a => a.role === 'CUSTOMER_INPUT' && a.sha256)) gaps.push('INPUT_FINGERPRINT_MISSING');
    const outcomes = Object.values(this.phases).map(p => p.status);
    return { healthy: gaps.length === 0, gaps, workflowStatus: outcomes.includes('FAILED') ? 'FAILED' : (outcomes.every(s => s === 'PASSED' || s === 'RESOLVED' || s === 'SKIPPED') && gaps.length === 0 ? 'COMPLETE' : 'INCOMPLETE') };
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

    const execution = { nodeVersion: process.version, platform: process.platform, gitRevision: null, workingDiffSha256: null };
    try {
      const names = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', 'scripts', 'dashboard', 'tests', 'package.json', 'package-lock.json'], { cwd: PROJECT_ROOT, maxBuffer: 10 * 1024 * 1024 }).toString().split('\0').filter(Boolean);
      execution.sourceManifest = [...new Set(names)].sort().map(name => {
        const file = path.join(PROJECT_ROOT, name);
        return { path: name, sha256: fs.existsSync(file) && fs.statSync(file).isFile() ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null };
      });
      execution.sourceManifestSha256 = crypto.createHash('sha256').update(JSON.stringify(execution.sourceManifest)).digest('hex');
      execution.gitRevision = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: PROJECT_ROOT, encoding: 'utf8', timeout: 5000 }).trim();
      execution.workingDiffSha256 = crypto.createHash('sha256').update(execFileSync('git', ['diff', 'HEAD', '--', 'scripts', 'dashboard'], { cwd: PROJECT_ROOT, timeout: 5000, maxBuffer: 10 * 1024 * 1024 })).digest('hex');
    } catch (error) { execution.revisionError = error.message; }
    const payload = {
      version: '2.0.0',
      execution,
      health: this.getHealth(),
      events: this.events,
      artifacts: this.artifacts,
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
      `**Evidence health:** ${JSON.stringify(this.getHealth())}`,
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

    const phase3 = this.phases.phase_3;
    if (phase3 && Array.isArray(phase3.checks) && phase3.checks.length > 0) {
      lines.push('', '## 3. Physical Pre-Flight Math & Constraint Proofs');
      lines.push('| Aspect | Status | Formula / Arithmetic Verification | Detail |');
      lines.push('| :--- | :---: | :--- | :--- |');
      phase3.checks.forEach(c => {
        const formula = c.equation || c.formula || 'NOT_RECORDED';
        lines.push(`| ${c.name || c.id || 'Aspect'} | **${c.status || 'PASS'}** | \`${formula}\` | ${c.detail || ''} |`);
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

    lines.push('', '## 4. NotebookLM verification', '```json', JSON.stringify(this.notebookLmTraces, null, 2), '```');
    lines.push('', '## 5. Artifact fingerprints and delivery receipts', '```json', JSON.stringify(this.artifacts, null, 2), '```');
    lines.push('', '## 6. Complete phase inputs, decisions, checks and outcomes', '```json', JSON.stringify(this.phases, null, 2), '```');
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
