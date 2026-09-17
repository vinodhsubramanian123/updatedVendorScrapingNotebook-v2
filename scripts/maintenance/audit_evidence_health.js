'use strict';
const fs = require('fs');
const path = require('path');
const { EvidenceLedger, EVIDENCE_LOGS_DIR } = require('../lib/system/evidence_ledger');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat');

function auditEvidenceDirectory(directory = EVIDENCE_LOGS_DIR) {
  const files = fs.existsSync(directory) ? fs.readdirSync(directory).filter(name => /^evidence_log_.*\.json$/.test(name)) : [];
  const records = files.map(name => {
    const filePath = path.join(directory, name);
    try {
      const payload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const ledger = Object.assign(new EvidenceLedger(), payload);
      const health = ledger.getHealth();
      const contradictions = [];
      if (payload.sharedState?.dualBrainVerified && !(payload.notebookLmTraces || []).some(t => t.responseSummary?.isCloudGrounded === true && t.citations?.length > 0)) contradictions.push('UNSUPPORTED_CLOUD_VERIFICATION');
      if (!payload.events?.length) contradictions.push('EVENT_HISTORY_MISSING');
      return { filePath, traceId: payload.traceId, version: payload.version, ...health, contradictions, healthy: health.healthy && contradictions.length === 0 };
    } catch (error) { return { filePath, healthy: false, gaps: ['UNREADABLE_RECORD'], error: error.message }; }
  });
  return { generatedAt: new Date().toISOString(), directory, total: records.length, healthy: records.filter(r => r.healthy).length, unhealthy: records.filter(r => !r.healthy).length, records };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const report = auditEvidenceDirectory(args.find(a => !a.startsWith('--')) || EVIDENCE_LOGS_DIR);
  if (args.includes('--save')) safeWriteJsonAtomic(path.join(EVIDENCE_LOGS_DIR, 'evidence_health_audit.json'), report);
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  if (report.unhealthy || report.total === 0) process.exitCode = 1;
}
module.exports = { auditEvidenceDirectory };
