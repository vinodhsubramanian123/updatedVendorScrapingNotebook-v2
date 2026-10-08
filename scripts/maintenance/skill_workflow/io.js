'use strict';
// Shared read-only inventory and bounded report I/O for maintenance auditors.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { safeWriteJsonAtomic } = require('../../lib/system/fs_compat.js');

const SOURCE_EXTENSIONS = new Set(['.js', '.cjs', '.mjs', '.jsx', '.ts', '.tsx']);
const OMIT_DIRECTORIES = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.cache']);
const REPORT_BASE = 'outputs/history/skill_workflow_excellence';
const slash = value => value.replace(/\\/g, '/');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const relative = (root, file) => slash(path.relative(root, file));

function isWithin(root, target) {
  const rel = path.relative(root, target);
  return rel === '' || (!path.isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${path.sep}`));
}

function walkFiles(directory, options = {}) {
  const files = [];
  const issues = options.issues || [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const target = path.join(directory, entry.name);
    if (options.exclude?.(target)) continue;
    if (entry.isSymbolicLink()) {
      issues.push({ path: target, reason: 'SYMLINK_NOT_FOLLOWED' });
    } else if (entry.isDirectory()) {
      if (!options.omitDependencies || !OMIT_DIRECTORIES.has(entry.name)) files.push(...walkFiles(target, options));
    } else if (entry.isFile()) files.push(target);
    else issues.push({ path: target, reason: 'NOT_REGULAR_FILE' });
  }
  return files;
}

// rg honors repository ignore rules, matching the original inventory denominator.
// A filesystem fallback is explicit: its denominator must not be called identical.
function inventoryFiles(root, directories) {
  const present = directories.filter(dir => fs.existsSync(path.join(root, dir)));
  if (!present.length) return { files: [], method: 'rg', exclusions: [], issues: [] };
  try {
    const output = execFileSync('rg', ['--files', '--null', ...present], { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    return { files: [...new Set(output.split('\0').filter(Boolean).map(slash))].sort(), method: 'rg-ignore-aware', exclusions: ['rg default ignore rules'], issues: [] };
  } catch (error) {
    if (error.status === 1 && !String(error.stderr || '').trim()) return { files: [], method: 'rg-ignore-aware', exclusions: ['rg default ignore rules'], issues: [] };
    if (error.code !== 'ENOENT') throw error;
    const issues = [];
    const files = present.flatMap(dir => walkFiles(path.join(root, dir), { omitDependencies: true, issues })).map(file => relative(root, file)).sort();
    return { files, method: 'filesystem-fallback', exclusions: [...OMIT_DIRECTORIES], issues };
  }
}

function readFileRecord(root, file) {
  const full = path.resolve(root, file);
  const before = fs.lstatSync(full);
  if (!before.isFile()) throw new Error(`Not a regular file: ${file}`);
  const bytes = fs.readFileSync(full);
  const after = fs.lstatSync(full);
  if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error(`File changed during inventory: ${file}`);
  return { path: slash(file), bytes: bytes.length, sha256: sha256(bytes) };
}

function fingerprint(records) {
  // Code-point ordering matches the CP0 pre-authoring manifest across locales.
  return sha256([...records].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0).map(r => `${r.path}\0${r.sha256 || r.state}\n`).join(''));
}

function git(root, args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function parseArgs(args, valueOptions = []) {
  const values = new Set(['--root', '--report-dir', ...valueOptions]);
  const allowedFlags = new Set(['--save', '--json', '--help']);
  const result = { root: path.resolve(__dirname, '../../..'), save: false, json: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (values.has(arg)) {
      const value = args[++i];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      result[arg.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    } else if (allowedFlags.has(arg)) result[arg.slice(2)] = true;
    else throw new Error(`Unknown option: ${arg}`);
  }
  result.root = fs.realpathSync(path.resolve(result.root));
  return result;
}

function saveReport(root, reportDir, name, payload) {
  const base = path.resolve(root, REPORT_BASE);
  const directory = path.resolve(root, reportDir || `${REPORT_BASE}/${new Date().toISOString().slice(0, 10)}`);
  if (!isWithin(base, directory)) throw new Error(`Report directory must be under ${REPORT_BASE}`);
  // Reject aliased parents: lexical enclosure alone would allow writes elsewhere.
  for (let current = directory; isWithin(root, current); current = path.dirname(current)) {
    if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error(`Aliased report directory: ${current}`);
    if (current === root) break;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-') + `-${process.pid}`;
  const destination = path.join(directory, `${name}-${stamp}.json`);
  if (fs.existsSync(destination)) throw new Error(`Report already exists: ${destination}`);
  safeWriteJsonAtomic(destination, payload);
  return relative(root, destination);
}

module.exports = { SOURCE_EXTENSIONS, REPORT_BASE, slash, sha256, relative, isWithin, walkFiles, inventoryFiles, readFileRecord, fingerprint, git, parseArgs, saveReport };
