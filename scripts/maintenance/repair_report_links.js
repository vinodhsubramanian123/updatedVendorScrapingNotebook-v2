'use strict';
// Repair legacy file-URI links without rerunning the evaluation or changing evidence.
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = require('url');
const { toReportLink } = require('../lib/system/uri_helper');
function repairReportLinks(reportPath, sourceReportPath = null) {
  const original = fs.readFileSync(reportPath, 'utf8');
  let count = 0;
  let updated = original.replace(/\[([^\]\r\n]+)\]\((file:\/\/[^\r\n]*?)\)(?=\s*(?:\||\r?$))/gm, (match, label, uri) => {
    let target;
    try { target = fileURLToPath(uri); } catch (_) { return match; }
    if (!fs.existsSync(target)) return match;
    count++;
    return `[${label}](${toReportLink(target, reportPath)})`;
  });
  if (sourceReportPath) updated = updated.replace(/\[([^\]\r\n]+)\]\(([^\s)]+)\)/g, (match, label, href) => {
    if (/^[a-z][a-z\d+.-]*:|^#/i.test(href)) return match;
    const decoded = decodeURIComponent(href);
    if (fs.existsSync(path.resolve(path.dirname(reportPath), decoded))) return match;
    const target = path.resolve(path.dirname(sourceReportPath), decoded);
    if (!fs.existsSync(target)) return match;
    count++;
    return `[${label}](${toReportLink(target, reportPath)})`;
  });
  if (count) fs.writeFileSync(reportPath, updated, 'utf8');
  return count;
}
if (require.main === module) {
  for (const report of process.argv.slice(2)) console.log(`${path.basename(report)}: ${repairReportLinks(path.resolve(report))} links repaired`);
}
module.exports = { repairReportLinks };
