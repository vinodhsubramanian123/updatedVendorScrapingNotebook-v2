'use strict';
const path = require('path');
const { execFileSync } = require('child_process');

// Drive workbooks serve people; NotebookLM consumes the semantic projection.
function publishHumanWorkbook({ cfgEntry, chassisName, csvPath, payloadPath,
  run = execFileSync, env = process.env }) {
  if (cfgEntry?.publishDriveWorkbook !== true) return null;
  if (!cfgEntry.driveSheetId && !chassisName) throw new Error('HUMAN_WORKBOOK_TARGET_REQUIRED');
  const targetArgs = cfgEntry.driveSheetId ? [cfgEntry.driveSheetId] : ['--create', `${chassisName} Canonical Knowledge`];
  const output = run(process.execPath, [path.join(__dirname, 'google_sheets_writer.js'),
    ...targetArgs, csvPath, payloadPath, chassisName], {
    encoding: 'utf8', timeout: 600000, maxBuffer: 32 * 1024 * 1024, env, windowsHide: true
  });
  const result = JSON.parse(output);
  if (result.success !== true || result.readbackVerified !== true || !result.fingerprints?.combined
      || !result.spreadsheetId || (cfgEntry.driveSheetId && result.spreadsheetId !== cfgEntry.driveSheetId)) {
    throw new Error('HUMAN_WORKBOOK_READBACK_UNVERIFIED');
  }
  return result;
}
module.exports = { publishHumanWorkbook };
