'use strict';
/**
 * scripts/maintenance/notebook_health_audit.js
 *
 * Automated Notebook Health Validator for HPE AI Studio.
 *
 * Validates notebooks.json against a required-fields schema, flags gaps in
 * RAG grounding, stale syncs, missing certification sources, and chassis
 * naming consistency against master_knowledge_registry.json.
 *
 * Usage: node scripts/maintenance/notebook_health_audit.js [--json]
 *
 * Exit codes:
 *   0 = All checks passed
 *   1 = Critical issues found
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const NOTEBOOKS_CONFIG_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
const REGISTRY_PATH = path.join(PROJECT_ROOT, 'outputs', 'history', 'master_knowledge_registry.json');
const STALE_THRESHOLD_DAYS = 14; // Days before a sync is considered stale

/**
 * Required fields and their validation logic for each notebook entry.
 */
const REQUIRED_FIELDS = [
  { field: 'notebookId', label: 'Notebook ID', validate: v => typeof v === 'string' && v.length > 10 },
  { field: 'vendor', label: 'Vendor', validate: v => typeof v === 'string' && v.length > 0 },
  { field: 'pillar', label: 'Pillar', validate: v => ['SERVER', 'STORAGE', 'NETWORKING'].includes(v) },
  { field: 'family', label: 'Family', validate: v => typeof v === 'string' && v.length > 0 },
  { field: 'queryEnabled', label: 'Query Enabled', validate: v => typeof v === 'boolean' },
  { field: 'isolationLevel', label: 'Isolation Level', validate: v => typeof v === 'string' && v.length > 0 },
];

const RECOMMENDED_FIELDS = [
  { field: 'certifiedCatalogSourceIds', label: 'Certified Catalog Sources', validate: v => Array.isArray(v) && v.length > 0, severity: 'HIGH' },
  { field: 'canonicalKnowledgeSourceIds', label: 'Canonical Knowledge Sources', validate: v => Array.isArray(v) && v.length > 0, severity: 'HIGH' },
  { field: 'runningKnowledgeSourceId', label: 'Running Knowledge Grounding', validate: v => typeof v === 'string' && v.length > 10, severity: 'HIGH' },
  { field: 'driveSheetId', label: 'Google Drive Sheet', validate: v => typeof v === 'string' && v.length > 10, severity: 'MEDIUM' },
  { field: 'verifiedLearningSourceIds', label: 'Verified Learning Sources', validate: v => Array.isArray(v) && v.length > 0, severity: 'MEDIUM' },
  { field: 'lastSyncedSourceId', label: 'Last Synced Source', validate: v => typeof v === 'string' && v.length > 10, severity: 'MEDIUM' },
];

/**
 * Audits all notebook entries in notebooks.json.
 * @returns {{ issues: Array, summary: object }}
 */
function auditNotebooks() {
  const issues = [];
  let config;

  try {
    config = JSON.parse(fs.readFileSync(NOTEBOOKS_CONFIG_PATH, 'utf8'));
  } catch (err) {
    return { issues: [{ notebook: 'GLOBAL', severity: 'CRITICAL', category: 'CONFIG', message: `Cannot read notebooks.json: ${err.message}` }], summary: { total: 0, critical: 1, high: 0, medium: 0, low: 0 } };
  }

  const notebooks = config.notebooks || {};
  const notebookKeys = Object.keys(notebooks);

  // Check each notebook
  for (const key of notebookKeys) {
    const entry = notebooks[key];

    // Required field checks
    for (const { field, label, validate } of REQUIRED_FIELDS) {
      if (!validate(entry[field])) {
        issues.push({ notebook: key, severity: 'CRITICAL', category: 'REQUIRED_FIELD', field, message: `Missing or invalid ${label} (${field}: ${JSON.stringify(entry[field])})` });
      }
    }

    if (entry.queryEnabled === false) {
      issues.push({ notebook: key, severity: 'LOW', category: 'QUERY_STATE', field: 'queryEnabled', message: 'Queries currently disabled (fail-closed mode active for unready/advisory product).' });
    }

    // Recommended field checks
    for (const { field, label, validate, severity } of RECOMMENDED_FIELDS) {
      if (!validate(entry[field])) {
        issues.push({ notebook: key, severity, category: 'RECOMMENDED_FIELD', field, message: `Missing ${label} — ${severity === 'HIGH' ? 'RAG grounding may be degraded' : 'optional but recommended'}` });
      }
    }

    // Stale sync check
    if (entry.lastSyncedAt) {
      const daysSince = (Date.now() - new Date(entry.lastSyncedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince > STALE_THRESHOLD_DAYS) {
        issues.push({ notebook: key, severity: 'MEDIUM', category: 'STALE_SYNC', message: `Last sync ${Math.floor(daysSince)} days ago (${entry.lastSyncedAt}). Threshold: ${STALE_THRESHOLD_DAYS} days.` });
      }
    } else {
      issues.push({ notebook: key, severity: 'HIGH', category: 'STALE_SYNC', message: 'No lastSyncedAt timestamp — notebook may never have been synced.' });
    }

    // Quarantine check
    if (Array.isArray(entry.quarantinedSourceIds) && entry.quarantinedSourceIds.length > 5) {
      issues.push({ notebook: key, severity: 'MEDIUM', category: 'QUARANTINE', message: `${entry.quarantinedSourceIds.length} quarantined sources — consider cleanup to reduce noise.` });
    }
  }

  // Cross-reference with knowledge registry
  if (fs.existsSync(REGISTRY_PATH)) {
    try {
      const registry = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf8'));

      // Check chassis coverage
      const chassisCoverage = new Map();
      for (const arr of [registry.universalRules, registry.familyGenRules, registry.chassisSpecificRules]) {
        for (const r of arr || []) {
          const ch = r.chassis || 'GLOBAL';
          chassisCoverage.set(ch, (chassisCoverage.get(ch) || 0) + 1);
        }
      }

      for (const key of notebookKeys) {
        const ruleCount = chassisCoverage.get(key) || 0;
        if (ruleCount === 0) {
          issues.push({ notebook: key, severity: 'LOW', category: 'KNOWLEDGE_GAP', message: `Zero learned rules in knowledge registry. Consider adding gap resolution documentation.` });
        }
      }

      // Check chassis name consistency (no spaces, no form-factor suffixes)
      for (const name of chassisCoverage.keys()) {
        if (name === 'GLOBAL') continue;
        if (name.includes(' ')) {
          issues.push({ notebook: 'REGISTRY', severity: 'HIGH', category: 'CHASSIS_NAMING', message: `Chassis name "${name}" uses spaces instead of underscores.` });
        }
        if (/_(8SFF|24SFF|8LFF|12LFF|EDSFF|SFF|LFF)$/i.test(name)) {
          issues.push({ notebook: 'REGISTRY', severity: 'HIGH', category: 'CHASSIS_NAMING', message: `Chassis name "${name}" has a form-factor suffix — should be consolidated per INV-36.` });
        }
      }

      // Verify registry consistency
      const actualTotal = (registry.universalRules?.length || 0) + (registry.familyGenRules?.length || 0) + (registry.chassisSpecificRules?.length || 0);
      if (registry.totalLearnedRules !== actualTotal) {
        issues.push({ notebook: 'REGISTRY', severity: 'CRITICAL', category: 'REGISTRY_INTEGRITY', message: `totalLearnedRules (${registry.totalLearnedRules}) !== sum of rule arrays (${actualTotal}).` });
      }
    } catch (err) {
      issues.push({ notebook: 'REGISTRY', severity: 'MEDIUM', category: 'REGISTRY_READ', message: `Cannot read registry: ${err.message}` });
    }
  }

  // Compute summary
  const summary = {
    totalNotebooks: notebookKeys.length,
    totalIssues: issues.length,
    critical: issues.filter(i => i.severity === 'CRITICAL').length,
    high: issues.filter(i => i.severity === 'HIGH').length,
    medium: issues.filter(i => i.severity === 'MEDIUM').length,
    low: issues.filter(i => i.severity === 'LOW').length,
    passed: issues.filter(i => i.severity === 'CRITICAL').length === 0,
  };

  return { issues, summary };
}

/**
 * Formats audit results for console output.
 */
function formatReport(result) {
  const { issues, summary } = result;
  const lines = [];

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push('  📋 NOTEBOOK HEALTH AUDIT REPORT');
  lines.push('═══════════════════════════════════════════════════════════');
  lines.push(`  Notebooks Audited: ${summary.totalNotebooks}`);
  lines.push(`  Total Issues:      ${summary.totalIssues}`);
  lines.push(`  🔴 Critical:       ${summary.critical}`);
  lines.push(`  🟠 High:           ${summary.high}`);
  lines.push(`  🟡 Medium:         ${summary.medium}`);
  lines.push(`  🔵 Low:            ${summary.low}`);
  lines.push(`  Verdict:           ${summary.passed ? '✅ PASSED' : '❌ FAILED (Critical issues found)'}`);
  lines.push('───────────────────────────────────────────────────────────');

  if (issues.length > 0) {
    const grouped = {};
    for (const issue of issues) {
      if (!grouped[issue.notebook]) grouped[issue.notebook] = [];
      grouped[issue.notebook].push(issue);
    }

    for (const [notebook, notebookIssues] of Object.entries(grouped)) {
      lines.push(`\n  📦 ${notebook}:`);
      for (const issue of notebookIssues) {
        const badge = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'HIGH' ? '🟠' : issue.severity === 'MEDIUM' ? '🟡' : '🔵';
        lines.push(`    ${badge} [${issue.category}] ${issue.message}`);
      }
    }
  }

  lines.push('');
  lines.push('═══════════════════════════════════════════════════════════');
  return lines.join('\n');
}

// CLI Execution
if (require.main === module) {
  const jsonMode = process.argv.includes('--json');
  const result = auditNotebooks();

  if (jsonMode) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(formatReport(result));
  }

  process.exit(result.summary.passed ? 0 : 1);
}

module.exports = { auditNotebooks, formatReport };
