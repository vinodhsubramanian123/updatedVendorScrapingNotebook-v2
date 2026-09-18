'use strict';
/**
 * scripts/maintenance/open_deliverables.js
 *
 * Fast zero-friction launcher to reveal or open the latest generated evaluation deliverables
 * in Windows File Explorer or Microsoft Excel directly without traversing directories.
 */

const fs = require('fs');
const path = require('path');
const { openInDefaultApp, revealInFileManager, toClickableFileUri } = require('../lib/system/uri_helper');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const OUTPUTS_ROOT = path.join(PROJECT_ROOT, 'outputs');

function findNewestDeliverable(baseDir, keyword = null, options = {}) {
  let newestFile = null;
  let newestMtime = 0;
  const kwLower = keyword ? keyword.toLowerCase() : null;
  const typeFilter = options.type ? String(options.type).toLowerCase() : null;
  const restrictReports = options.restrictReports !== false && !['evidence', 'all', 'csv'].includes(typeFilter);
  const allowedExts = options.allowedExts || (typeFilter === 'evidence' ? ['.md', '.json'] : (typeFilter === 'csv' ? ['.csv'] : ['.xlsx', '.csv']));

  function scan(currentDir) {
    let entries = [];
    try {
      entries = fs.readdirSync(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const ent of entries) {
      const fullPath = path.join(currentDir, ent.name);
      if (ent.isDirectory()) {
        scan(fullPath);
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (!allowedExts.includes(ext)) continue;

        if (restrictReports) {
          const inReports = fullPath.includes(path.sep + 'reports' + path.sep) || fullPath.includes('/reports/');
          if (!inReports) continue;
        }

        const nameLower = ent.name.toLowerCase();
        if (typeFilter === 'evidence' && !nameLower.includes('evidence')) continue;
        if (typeFilter === 'portal' && !nameLower.includes('portal')) continue;
        if (typeFilter === 'proposal' && !nameLower.includes('proposal')) continue;
        if (typeFilter === 'multirank' && !nameLower.includes('multirank')) continue;

        if (kwLower && !nameLower.includes(kwLower)) {
          continue;
        }

        try {
          const stat = fs.statSync(fullPath);
          if (stat.mtimeMs > newestMtime) {
            newestMtime = stat.mtimeMs;
            newestFile = fullPath;
          }
        } catch {}
      }
    }
  }

  scan(baseDir);
  return newestFile;
}

async function main() {
  const args = process.argv.slice(2);
  const openExcel = args.includes('--excel') || args.includes('-e');
  const typeArgIdx = args.findIndex(a => a === '--type' || a === '-t');
  let typeFilter = null;
  if (typeArgIdx !== -1 && args[typeArgIdx + 1]) {
    typeFilter = args[typeArgIdx + 1];
  }

  let targetArg = args.find((a, i) => !a.startsWith('-') && (typeArgIdx === -1 || (i !== typeArgIdx && i !== typeArgIdx + 1))) || null;
  let targetPath = null;

  if (targetArg && fs.existsSync(targetArg)) {
    targetPath = targetArg;
  } else {
    // If targetArg or typeFilter specified, find newest matching
    targetPath = findNewestDeliverable(OUTPUTS_ROOT, targetArg, { type: typeFilter });
    if (!targetPath && (targetArg || typeFilter)) {
      targetPath = findNewestDeliverable(OUTPUTS_ROOT, null, { type: typeFilter });
    }
    if (!targetPath) {
      targetPath = findNewestDeliverable(OUTPUTS_ROOT, null);
    }
    if (!targetPath) {
      console.error('[ERROR] No deliverables found under outputs/. Run an evaluation first.');
      process.exit(1);
    }
  }

  const resolved = path.resolve(targetPath);
  console.log('===============================================================');
  console.log('📂 Deliverable Fast Launcher');
  console.log('===============================================================');
  console.log(`Target:      ${resolved}`);
  console.log(`Clickable:   ${toClickableFileUri(resolved)}`);

  if (openExcel) {
    console.log('🚀 Launching file in default spreadsheet application (Excel)...');
    await openInDefaultApp(resolved);
  } else {
    console.log('📂 Revealing file in Windows File Explorer...');
    await revealInFileManager(resolved);
  }
  console.log('✅ Done! Check your screen/taskbar.');
  console.log('===============================================================');
}

if (require.main === module) {
  main().catch(err => {
    console.error('[ERROR]', err.message);
    process.exit(1);
  });
}

module.exports = { findNewestDeliverable };
