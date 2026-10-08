#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { parseArgs, saveReport } = require('./skill_workflow/io.js');
const { auditHardcodes } = require('./skill_workflow/hardcode.js');

function main(args) {
  const options = parseArgs(args, ['--allowlist', '--baseline']);
  if (options.help) { console.log('Usage: node scripts/maintenance/audit_skill_hardcodes.js [--root <workspace>] [--allowlist <json>] [--baseline <prior-report.json>] [--save] [--report-dir <outputs/history/skill_workflow_excellence/...>] [--json]\nReport-only: candidates never fail CI. Exceptions require exact path/rule/value hash, reason, owner, scope and review date.'); return; }
  const read = file => file ? JSON.parse(fs.readFileSync(path.resolve(options.root, file), 'utf8')) : undefined;
  const report = auditHardcodes(options.root, { allowlist: read(options.allowlist), baseline: read(options.baseline) });
  const saved = options.save ? saveReport(options.root, options.reportDir, 'cp2-hardcodes', report) : null;
  console.log(JSON.stringify(options.json ? report : { mode: report.mode, sourceFingerprint: report.sourceFingerprint, ...report.summary, comparison: report.comparison.status, saved, verification: 'TRIAGE_BASELINE_NOT_CLASSIFIED_VIOLATION_COUNT' }, null, 2));
}
if (require.main === module) {
  try { main(process.argv.slice(2)); }
  catch (error) { console.error(`Hardcode audit could not complete: ${error.message}`); process.exitCode = 1; }
}
module.exports = { main };
