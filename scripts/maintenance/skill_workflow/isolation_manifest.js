'use strict';
const fs = require('fs');
const path = require('path');
const { captureBaseline } = require('../capture_skill_workflow_baseline.js');
const { REPORT_BASE, isWithin, readFileRecord, fingerprint, slash } = require('./io.js');

const OMIT = new Set(['.git', 'node_modules', 'graphify-out', 'dist', 'build', 'coverage', '.cache']);
const ASSET_ROOTS = ['tests', 'fixtures', 'scripts/config', 'outputs', 'dashboard/public'];
function excluded(file) {
  return file === REPORT_BASE || file.startsWith(REPORT_BASE + '/') ||
    file.startsWith('outputs/history/locks/') ||
    file.split('/').some(part => OMIT.has(part) || /^\.env(?:\.|$)/.test(part)) ||
    /(?:^|\/)(?:credentials|token|client_secret)[^/]*\.json$/i.test(file);
}
function checkedFile(root, file) {
  const target = path.resolve(root, file);
  if (!isWithin(root, target) || target === root) throw new Error(`Unenclosed input: ${file}`);
  for (let item = target; item !== root; item = path.dirname(item)) {
    if (fs.lstatSync(item).isSymbolicLink()) throw new Error(`Input alias: ${file}`);
  }
  return readFileRecord(root, slash(path.relative(root, target)));
}
function addAssets(root, directory, files, omissions) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name), file = slash(path.relative(root, full));
    if (excluded(file)) { omissions.push({ path: file, reason: 'DECLARED_EXCLUSION' }); continue; }
    if (entry.isSymbolicLink()) throw new Error(`Input alias: ${file}`);
    if (entry.isDirectory()) addAssets(root, full, files, omissions);
    else if (entry.isFile()) files.add(file);
    else throw new Error(`Unsupported input: ${file}`);
  }
}
function acceptedManifest(source) {
  const root = fs.realpathSync(source), baseline = captureBaseline(root);
  if (baseline.issues.length) throw new Error(`Baseline inventory issues: ${JSON.stringify(baseline.issues)}`);
  const omissions = [], selected = new Set();
  for (const record of baseline.files) {
    if (record.state === 'MISSING') omissions.push({ path: record.path, reason: 'ACCEPTED_DELETION' });
    else if (excluded(record.path)) omissions.push({ path: record.path, reason: 'DECLARED_EXCLUSION' });
    else selected.add(record.path);
  }
  for (const item of fs.readdirSync(root)) if (/^\.env(?:\.|$)/.test(item) && !omissions.some(record => record.path === item)) omissions.push({ path: item, reason: 'DECLARED_EXCLUSION' });
  for (const item of ASSET_ROOTS) addAssets(root, path.join(root, item), selected, omissions);
  const files = [...selected].sort().map(file => checkedFile(root, file));
  const protectedPaths = files.filter(record => record.path.startsWith('outputs/') || record.path.startsWith('scripts/config/')).map(record => record.path);
  return { schemaVersion: 1, source: root, head: baseline.head, branch: baseline.branch,
    status: baseline.status, files, protectedPaths, omissions,
    sourceAccountedFingerprint: baseline.inputTreeFingerprint,
    sourceProtectedFingerprint: baseline.protectedFingerprint,
    inputTreeFingerprint: fingerprint(files),
    protectedFingerprint: fingerprint(files.filter(record => protectedPaths.includes(record.path))),
    policy: { assetRoots: ASSET_ROOTS, excludedDirectories: [...OMIT], environmentFilesCopied: false,
      credentialsCopied: false, acceptedDirtyTree: true, symlinksFollowed: false,
      runtimeLocksCopied: false, stagingArchives: 'Copied as inert accepted inputs; no promotion/recovery execution authorized' } };
}
function verifyFiles(root, manifest) {
  const current = manifest.files.map(record => checkedFile(root, record.path));
  const mismatches = current.filter((record, index) => record.sha256 !== manifest.files[index].sha256).map(record => record.path);
  if (mismatches.length) throw new Error(`Snapshot hash mismatch: ${mismatches.join(', ')}`);
  return { files: current.length, inputTreeFingerprint: fingerprint(current), mismatches };
}
module.exports = { acceptedManifest, verifyFiles, checkedFile, excluded };
