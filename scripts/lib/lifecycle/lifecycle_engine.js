'use strict';
/**
 * scripts/lib/lifecycle/lifecycle_engine.js
 *
 * Dynamic Pipeline Lifecycle Engine & Declarative Execution Manager
 *
 * Replaces hardcoded 9-phase loops with an extensible, declarative
 * lifecycle manager supporting arbitrary workflow pipelines (BOQ Evaluation,
 * RFP Sizing, BOM Reconciliation, OCA Portal Scraper).
 */

const PipelineLogger = require('../system/pipeline_logger.js');

const ALLOWED_STATUSES = Object.freeze(new Set([
  'NOT_STARTED',
  'RUNNING',
  'PASSED',
  'RESOLVED',
  'WARNED',
  'ACTION_REQUIRED',
  'SKIPPED',
  'FAILED',
  'NOT_REACHED'
]));

const CANONICAL_BOQ_9_PHASES = Object.freeze([
  { id: 'INGESTION', phaseNum: 1, name: 'BOM Ingestion & Normalization', mandatory: true, dependsOn: [] },
  { id: 'FINGERPRINTING', phaseNum: 2, name: 'Non-Repudiation Checksums & Baseline', mandatory: true, dependsOn: ['INGESTION'] },
  { id: 'DOMAIN_ASPECTS', phaseNum: 3, name: 'Deterministic Domain Physical Math', mandatory: true, allowActionRequired: true, dependsOn: ['FINGERPRINTING'] },
  { id: 'CONFLICT_GRAPH', phaseNum: 4, name: '5-Level Dependency Graph Validation', mandatory: true, allowActionRequired: true, dependsOn: ['DOMAIN_ASPECTS'] },
  { id: 'MODERNIZATION_LEAST_DELTA', phaseNum: 5, name: 'Generational Modernization & Least-Delta Combinator', mandatory: false, dependsOn: ['DOMAIN_ASPECTS'] },
  { id: 'STRATEGY_SYNTHESIS', phaseNum: 6, name: 'Multi-Tier Strategy Matrix Synthesis', mandatory: true, allowActionRequired: true, dependsOn: ['DOMAIN_ASPECTS', 'CONFLICT_GRAPH'] },
  { id: 'RAG_GROUNDING', phaseNum: 7, name: 'NotebookLM Ground-Truth Verification', mandatory: true, allowActionRequired: true, dependsOn: ['STRATEGY_SYNTHESIS'] },
  { id: 'DELIVERABLES_FINALIZATION', phaseNum: 8, name: 'Deliverables Generation & Ledger Seal', mandatory: true, allowActionRequired: true, dependsOn: ['STRATEGY_SYNTHESIS', 'RAG_GROUNDING'] },
  { id: 'REFLECTION_LEARNING', phaseNum: 9, name: 'Closed-Loop Reflection & Shared State Export', mandatory: false, allowActionRequired: true, dependsOn: ['DELIVERABLES_FINALIZATION'] }
]);

const CANONICAL_BOQ_PHASES = CANONICAL_BOQ_9_PHASES;

class LifecycleEngine {
  constructor(pipelineId = 'canonical_boq_eval', customPhases = null) {
    this.pipelineId = pipelineId;
    this.phases = [];
    this.executedPhases = new Map();
    this.startTime = Date.now();
    for (const phase of customPhases || CANONICAL_BOQ_PHASES) this.registerPhase(phase);
    for (const phase of this.phases) {
      if (phase.dependsOn.some(id => !this.phases.some(candidate => candidate.id === id))) throw new Error(`Unknown prerequisite for ${phase.id}`);
    }
    this.getExecutionOrder();
  }

  getExecutionOrder() {
    const order = [], visiting = new Set(), visited = new Set();
    const visit = phase => {
      if (visiting.has(phase.id)) throw new Error(`Cyclic phase dependency: ${phase.id}`);
      if (visited.has(phase.id)) return;
      visiting.add(phase.id);
      phase.dependsOn.forEach(id => visit(this._findPhase(id)));
      visiting.delete(phase.id);
      visited.add(phase.id);
      order.push(phase);
    };
    this.phases.forEach(visit);
    return order;
  }

  getPhases() { return this.phases.map(phase => ({ ...phase, dependsOn: [...phase.dependsOn] })); }

  registerPhase(def = {}) {
    const id = String(def.id || '').toUpperCase();
    const phaseNum = def.phaseNum ?? Math.max(0, ...this.phases.map(phase => phase.phaseNum)) + 1;
    if (!/^[A-Z0-9_]+$/.test(id) || !Number.isInteger(phaseNum) || phaseNum < 1) throw new Error('Invalid phase identity');
    if (this.phases.some(phase => phase.id === id || phase.phaseNum === phaseNum)) throw new Error(`Duplicate phase: ${id}/${phaseNum}`);
    const phase = { ...def, id, phaseNum, mandatory: def.mandatory === true, dependsOn: [...(def.dependsOn || [])] };
    if (phase.dependsOn.includes(id)) throw new Error(`Self-dependent phase: ${id}`);
    this.phases.push(phase);
    return phase;
  }

  _findPhase(identifier) {
    const phase = this.phases.find(p => typeof identifier === 'number' ? p.phaseNum === identifier : p.id === String(identifier).toUpperCase());
    if (!phase) throw new Error(`Unregistered phase: ${identifier}`);
    return phase;
  }

  _satisfied(phase, record) {
    return Boolean(record && (record.status === 'PASSED' || record.status === 'RESOLVED' ||
      (record.status === 'WARNED' && (phase.allowWarnings === true || phase.allowActionRequired === true)) ||
      (record.status === 'SKIPPED' && (!phase.mandatory || phase.allowSkip === true))));
  }

  startPhase(identifier, inputSummary = {}) {
    const phase = this._findPhase(identifier);
    if (this.executedPhases.has(phase.id)) throw new Error(`Phase already started: ${phase.id}`);
    const blocked = phase.dependsOn.filter(id => {
      const dep = this._findPhase(id);
      const record = this.executedPhases.get(id);
      return !(this._satisfied(dep, record) || (dep.allowActionRequired === true && record?.status === 'ACTION_REQUIRED'));
    });
    if (blocked.length) throw new Error(`Phase ${phase.id} blocked by ${blocked.join(', ')}`);
    const record = { ...phase, phaseNum: phase.phaseNum, status: 'RUNNING', startedAt: new Date().toISOString(), completedAt: null, durationMs: null, inputSummary, outputSummary: {}, checklistItems: [], warnings: [], errors: [] };
    this.executedPhases.set(phase.id, record);
    return record;
  }

  completePhase(identifier, status, outputSummary = {}, checklistItems = [], warnings = [], errors = []) {
    if (!status) throw new Error(`[INV-105 ZERO_DEFAULT_SUCCESS] completePhase called without explicit status for ${identifier}.`);
    const phase = this._findPhase(identifier);
    const record = this.executedPhases.get(phase.id);
    if (!record || record.status !== 'RUNNING') throw new Error(`Phase is not running: ${phase.id}`);
    if (!ALLOWED_STATUSES.has(status) || ['NOT_STARTED', 'RUNNING'].includes(status)) throw new Error(`Invalid terminal status: ${status}`);
    if (status === 'SKIPPED' && (!String(outputSummary?.skipReason || '').trim() || !String(outputSummary?.policyCode || '').trim())) {
      throw new Error('Skipped phase requires skipReason and policyCode.');
    }
    const checks = Array.isArray(checklistItems) ? checklistItems : [];
    const checkStatus = item => String(item?.status || (item?.checked === true ? 'PASS' : 'UNKNOWN')).toUpperCase();
    const hasFailure = checks.some(item => ['FAIL', 'FAILED'].includes(checkStatus(item)) || (item?.checked === false && checkStatus(item) === 'PASS'));
    const hasUnknown = checks.some(item => !['PASS', 'WARN', 'WARNING', 'SKIP', 'SKIPPED', 'FAIL', 'FAILED'].includes(checkStatus(item)));
    let finalStatus = status;
    if (errors.length) finalStatus = 'FAILED';
    else if (hasFailure) finalStatus = phase.allowActionRequired ? 'ACTION_REQUIRED' : 'FAILED';
    else if (hasUnknown || (status === 'SKIPPED' && phase.mandatory && !phase.allowSkip)) finalStatus = 'ACTION_REQUIRED';
    else if (['PASSED', 'RESOLVED'].includes(status) && (warnings.length || checks.some(item => ['WARN', 'WARNING'].includes(checkStatus(item))))) finalStatus = 'WARNED';
    Object.assign(record, { status: finalStatus, outputSummary, checklistItems: checks, warnings: [...warnings], errors: [...errors], completedAt: new Date().toISOString(), durationMs: Math.max(1, Date.now() - Date.parse(record.startedAt)) });
    PipelineLogger.checklist(phase.phaseNum, phase.name, checks);
    return record;
  }

  getHealth() {
    const gaps = [], failures = [], actionRequired = [], warnings = [];
    for (const phase of this.phases) {
      const record = this.executedPhases.get(phase.id);
      if (!record) { if (phase.mandatory) gaps.push(`PHASE_${phase.id}_MISSING`); continue; }
      if (['RUNNING', 'NOT_STARTED', 'NOT_REACHED'].includes(record.status)) gaps.push(`PHASE_${phase.id}_UNFINISHED`);
      else if (record.status === 'FAILED' || record.errors.length) failures.push(`PHASE_${phase.id}_FAILED`);
      else if (!this._satisfied(phase, record)) actionRequired.push(`PHASE_${phase.id}_ACTION_REQUIRED`);
      if (record.status === 'WARNED') warnings.push(`PHASE_${phase.id}_WARNED`);
    }
    const healthy = !gaps.length && !failures.length && !actionRequired.length;
    return { healthy, gaps, failures, actionRequired, warnings, workflowStatus: failures.length ? 'FAILED' : healthy ? (warnings.length ? 'COMPLETE_WITH_WARNINGS' : 'COMPLETE') : 'INCOMPLETE', totalPhases: this.phases.length, executedCount: this.executedPhases.size };
  }

  exportSummary() {
    return Object.fromEntries([...this.executedPhases.values()].map(record => [`phase_${record.phaseNum}`, { ...record, phaseId: record.id, phaseNumber: record.phaseNum, phaseName: record.name }]));
  }

  async executePipelineDAG(context = {}, phaseHandlers = {}) {
    const ordered = this.getExecutionOrder();
    for (const phase of ordered) {
      if (phase.mandatory && typeof (phaseHandlers[phase.id] || phaseHandlers[phase.phaseNum]) !== 'function') {
        throw new Error(`Mandatory phase ${phase.id} has no registered execution handler.`);
      }
    }
    for (const phase of ordered) {
      const handler = phaseHandlers[phase.id] || phaseHandlers[phase.phaseNum];
      if (typeof handler !== 'function') {
        this.startPhase(phase.id);
        this.completePhase(phase.id, 'SKIPPED', { skipReason: 'No optional handler configured', policyCode: 'OPTIONAL_HANDLER_ABSENT' });
        continue;
      }
      for (const prereq of phase.dependsOn) {
        const prereqRecord = this.executedPhases.get(prereq);
        if (!prereqRecord) throw new Error(`Phase ${phase.id} prerequisite ${prereq} has not been executed.`);
        if (prereqRecord.status === 'FAILED') throw new Error(`Phase ${phase.id} cannot run because prerequisite ${prereq} failed.`);
      }
      this.startPhase(phase.id);
      try {
        const result = await handler(context, this);
        const status = result?.status;
        const summary = result?.summary || result || {};
        const checks = result?.checks || [];
        this.completePhase(phase.id, status, summary, checks);
      } catch (err) {
        if (this.executedPhases.get(phase.id)?.status === 'RUNNING') {
          this.completePhase(phase.id, 'FAILED', { error: err.message }, [], [], [err.message]);
        }
        throw err;
      }
    }
    return this.getHealth();
  }
}

module.exports = {
  CANONICAL_BOQ_PHASES,
  CANONICAL_BOQ_9_PHASES,
  LifecycleEngine
};
