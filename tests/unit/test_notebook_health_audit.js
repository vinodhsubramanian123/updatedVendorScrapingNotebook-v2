'use strict';
/**
 * tests/unit/test_notebook_health_audit.js
 *
 * Unit test suite for notebook_health_audit.js.
 * Validates schema enforcement, stale sync detection, chassis naming,
 * and registry consistency checks.
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { auditNotebooks } = require('../../scripts/maintenance/notebook_health_audit.js');

describe('Notebook Health Audit Unit Suite', () => {
  it('auditNotebooks returns a structured result with issues and summary', () => {
    const result = auditNotebooks();
    assert.ok(result.issues, 'Result must have issues array');
    assert.ok(result.summary, 'Result must have summary object');
    assert.ok(typeof result.summary.totalNotebooks === 'number', 'Summary must have totalNotebooks');
    assert.ok(typeof result.summary.totalIssues === 'number', 'Summary must have totalIssues');
    assert.ok(typeof result.summary.critical === 'number', 'Summary must have critical count');
    assert.ok(typeof result.summary.high === 'number', 'Summary must have high count');
    assert.ok(typeof result.summary.medium === 'number', 'Summary must have medium count');
    assert.ok(typeof result.summary.low === 'number', 'Summary must have low count');
    assert.ok(typeof result.summary.passed === 'boolean', 'Summary must have passed boolean');
  });

  it('audits at least 8 product notebooks', () => {
    const result = auditNotebooks();
    assert.ok(result.summary.totalNotebooks >= 8,
      `Expected >= 8 notebooks, got ${result.summary.totalNotebooks}`);
  });

  it('has zero CRITICAL issues after Phase 2 remediation', () => {
    const result = auditNotebooks();
    const criticals = result.issues.filter(i => i.severity === 'CRITICAL');
    assert.strictEqual(criticals.length, 0,
      `Expected 0 critical issues but found ${criticals.length}:\n${criticals.map(c => `  [${c.notebook}] ${c.message}`).join('\n')}`);
  });

  it('every issue has required fields (notebook, severity, category, message)', () => {
    const result = auditNotebooks();
    for (const issue of result.issues) {
      assert.ok(issue.notebook, `Issue missing notebook: ${JSON.stringify(issue)}`);
      assert.ok(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(issue.severity), `Invalid severity: ${issue.severity}`);
      assert.ok(issue.category, `Issue missing category: ${JSON.stringify(issue)}`);
      assert.ok(typeof issue.message === 'string' && issue.message.length > 0, `Issue missing message: ${JSON.stringify(issue)}`);
    }
  });

  it('registry has consistent totalLearnedRules (no REGISTRY_INTEGRITY critical)', () => {
    const result = auditNotebooks();
    const integrityIssues = result.issues.filter(i => i.category === 'REGISTRY_INTEGRITY');
    assert.strictEqual(integrityIssues.length, 0,
      `Registry integrity issues found:\n${integrityIssues.map(i => `  ${i.message}`).join('\n')}`);
  });

  it('no chassis names with spaces in registry (INV-36 compliance)', () => {
    const result = auditNotebooks();
    const namingIssues = result.issues.filter(i => i.category === 'CHASSIS_NAMING');
    assert.strictEqual(namingIssues.length, 0,
      `Chassis naming issues found:\n${namingIssues.map(i => `  ${i.message}`).join('\n')}`);
  });

  it('all notebooks have queryEnabled: true', () => {
    const result = auditNotebooks();
    const queryDisabled = result.issues.filter(i =>
      i.field === 'queryEnabled' && i.severity === 'CRITICAL');
    assert.strictEqual(queryDisabled.length, 0,
      `Notebooks with queryEnabled issues:\n${queryDisabled.map(i => `  [${i.notebook}] ${i.message}`).join('\n')}`);
  });
});
