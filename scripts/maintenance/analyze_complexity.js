'use strict';
/**
 * scripts/maintenance/analyze_complexity.js — Token-Aware Cyclomatic Complexity Profiler
 *
 * Scans JavaScript and JSX files across the codebase to measure:
 * - Cyclomatic Complexity (CC) per function/method (McCabe Metric)
 * - Lines of Code (LOC) per function
 * - Strips comments, string/template text, and regex literals before brace-depth & branch analysis
 * - Avoids double-counting `else if (` (counted +1 via `if (`) and optional chaining `?.`
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

const BRANCH_PATTERNS = [
  /\bif\s*\(/g,
  /\bfor\s+(?:await\s+)?\(/g,
  /\bwhile\s*\(/g,
  /\bcatch\s*\(/g,
  /\bcase\s+[^:]+:/g,
  /&&/g,
  /\|\|/g,
  /\?\?/g
];

const REGEX_PREV_KEYWORDS = new Set([
  'return', 'throw', 'case', 'typeof', 'void', 'delete', 'await', 'yield', 'in', 'of', 'new', 'else'
]);
const NON_METHOD_KEYWORDS = new Set([
  'if', 'for', 'while', 'switch', 'catch', 'else', 'try', 'finally', 'with', 'do', 'return', 'new', 'super'
]);

function _isRegexAllowed(prevWord, prevChar) {
  if (!prevChar) return true;
  if ('(=,:;[!&|?{}+-*%^~<>'.includes(prevChar)) return true;
  return REGEX_PREV_KEYWORDS.has(prevWord);
}

function _skipQuotedOrRegex(src, startIdx, delim, out) {
  let i = startIdx + 1;
  out.push(' ');
  let inClass = false;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\n') {
      out.push('\n');
      if (delim !== '`') return i;
    } else {
      out.push(' ');
    }
    if (ch === '\\') {
      if (i + 1 < src.length) { out.push(src[i + 1] === '\n' ? '\n' : ' '); i += 2; continue; }
      return i;
    }
    if (delim === '/') {
      if (ch === '[') inClass = true;
      else if (ch === ']') inClass = false;
      else if (ch === '/' && !inClass) return i;
    } else if (ch === delim) {
      return i;
    }
    i++;
  }
  return i;
}

function _consumeLineComment(src, i, out) {
  out.push('  ');
  i += 2;
  while (i < src.length && src[i] !== '\n') { out.push(' '); i++; }
  if (i < src.length) out.push('\n');
  return i;
}

function _consumeBlockComment(src, i, out) {
  out.push('  ');
  i += 2;
  while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) {
    out.push(src[i] === '\n' ? '\n' : ' ');
    i++;
  }
  if (i + 1 < src.length) { out.push('  '); return i + 1; }
  return i;
}

function _consumeTemplateLiteral(src, startIdx, out) {
  let i = startIdx + 1;
  out.push(' ');
  while (i < src.length) {
    const ch = src[i];
    if (ch === '\\') {
      out.push(' ');
      if (i + 1 < src.length) { out.push(src[i + 1] === '\n' ? '\n' : ' '); i += 2; continue; }
      return i;
    }
    if (ch === '`') { out.push(' '); return i; }
    if (ch === '$' && src[i + 1] === '{') {
      out.push('${');
      i += 2;
      let depth = 1;
      while (i < src.length && depth > 0) {
        const inner = src[i];
        if (inner === '{') depth++;
        else if (inner === '}') depth--;
        out.push(inner);
        i++;
      }
      continue;
    }
    out.push(ch === '\n' ? '\n' : ' ');
    i++;
  }
  return i;
}

/**
 * Strip comments, quoted strings, template text, and regex literals while preserving line count.
 * @param {string} src
 * @returns {string}
 */
function stripNonCodeLiterals(src) {
  const out = [];
  let prevChar = '';
  let prevWord = '';
  let curWord = '';

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];

    if (ch === '/' && next === '/') { i = _consumeLineComment(src, i, out); prevChar = '\n'; curWord = ''; continue; }
    if (ch === '/' && next === '*') { i = _consumeBlockComment(src, i, out); curWord = ''; continue; }
    if (ch === "'" || ch === '"') { i = _skipQuotedOrRegex(src, i, ch, out); prevChar = ch; prevWord = ''; curWord = ''; continue; }
    if (ch === '`') { i = _consumeTemplateLiteral(src, i, out); prevChar = '`'; prevWord = ''; curWord = ''; continue; }
    if (ch === '/' && _isRegexAllowed(prevWord || curWord, prevChar)) {
      i = _skipQuotedOrRegex(src, i, '/', out);
      prevChar = ')';
      prevWord = '';
      curWord = '';
      continue;
    }

    out.push(ch);
    if (/[a-zA-Z0-9_$]/.test(ch)) {
      curWord += ch;
      prevChar = ch;
    } else {
      if (curWord) { prevWord = curWord; curWord = ''; }
      if (!/\s/.test(ch)) { prevChar = ch; prevWord = ''; }
    }
  }
  return out.join('');
}

function _countTernaries(text) {
  let count = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '?') {
      const prev = text[i - 1];
      const next = text[i + 1];
      if (prev !== '?' && next !== '?' && next !== '.') count++;
    }
  }
  return count;
}

const DEFAULT_BASELINE_PATH = path.join(PROJECT_ROOT, 'scripts', 'config', 'complexity_ratchet_baseline.json');
const CONTROL_BLOCK_RE = /\b(?:else\s+if|if|else|for(?:\s+await)?|while|do|try|catch|finally|switch)\b/;

function _computeMaxNesting(bodyText) {
  const lines = String(bodyText || '').split('\n');
  let braceDepth = 0;
  const controlStack = [];
  let maxNesting = 0;
  let pendingControl = false;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (idx > 0 && CONTROL_BLOCK_RE.test(line)) pendingControl = true;
    for (let k = 0; k < line.length; k++) {
      const ch = line[k];
      if (ch === '{') {
        braceDepth++;
        if (idx > 0 && pendingControl) {
          controlStack.push(braceDepth);
          if (controlStack.length > maxNesting) maxNesting = controlStack.length;
          pendingControl = false;
        }
      } else if (ch === '}') {
        if (controlStack.length > 0 && controlStack[controlStack.length - 1] === braceDepth) {
          controlStack.pop();
        }
        braceDepth = Math.max(0, braceDepth - 1);
      }
    }
    if (idx > 0 && !line.includes('{') && /;\s*$/.test(line.trim())) pendingControl = false;
  }
  return maxNesting;
}

function _computeBranchComplexity(bodyText) {
  let complexity = 1;
  for (const pattern of BRANCH_PATTERNS) {
    const matches = bodyText.match(pattern);
    if (matches) complexity += matches.length;
  }
  return complexity + _countTernaries(bodyText);
}

function _matchFunctionSignature(line) {
  const decl = line.match(/(?:^|[\s;(])(?:async\s+)?function\s*\*?\s*([a-zA-Z0-9_$]+)\s*\(/);
  if (decl) return decl[1];

  const arrow = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[a-zA-Z0-9_$]+)\s*=>\s*\{/);
  if (arrow) return arrow[1];

  const fnExpr = line.match(/(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s+)?function\s*\(/);
  if (fnExpr) return fnExpr[1];

  const method = line.match(/^\s*(?:static\s+)?(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^;]*\)\s*\{/);
  if (method && !NON_METHOD_KEYWORDS.has(method[1])) return method[1];

  return null;
}

function _findBlockEndLine(cleanLines, startIdx) {
  let braceCount = 0;
  let foundStart = false;
  for (let j = startIdx; j < cleanLines.length; j++) {
    const l = cleanLines[j];
    for (let k = 0; k < l.length; k++) {
      if (l[k] === '{') { braceCount++; foundStart = true; }
      else if (l[k] === '}') braceCount--;
    }
    if (foundStart && braceCount === 0) return j + 1;
  }
  return startIdx + 1;
}

function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const cleanText = stripNonCodeLiterals(content);
  const cleanLines = cleanText.split('\n');
  const functions = [];
  const nameCounts = new Map();

  for (let i = 0; i < cleanLines.length; i++) {
    const funcName = _matchFunctionSignature(cleanLines[i]);
    if (!funcName) continue;
    const occ = (nameCounts.get(funcName) || 0) + 1;
    nameCounts.set(funcName, occ);
    const startLine = i + 1;
    const endLine = _findBlockEndLine(cleanLines, i);
    const bodyText = cleanLines.slice(i, endLine).join('\n');
    const relPath = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
    const ratchetKey = occ === 1 ? `${relPath}::${funcName}` : `${relPath}::${funcName}#${occ}`;
    functions.push({
      name: funcName,
      ratchetKey,
      startLine,
      endLine,
      loc: endLine - startLine + 1,
      maxNesting: _computeMaxNesting(bodyText),
      complexity: _computeBranchComplexity(bodyText)
    });
  }

  return {
    filePath: path.relative(PROJECT_ROOT, filePath),
    totalLines: cleanLines.length,
    fileComplexity: _computeBranchComplexity(cleanText),
    functions
  };
}

function walkDir(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build', '_archive_scripts'].includes(entry.name)) continue;
      walkDir(fullPath, fileList);
    } else if (entry.isFile() && /\.(js|cjs|jsx)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function _resolveTargetDirs(tier) {
  if (tier === 'aspects') return [path.join(PROJECT_ROOT, 'scripts', 'lib', 'aspects')];
  if (tier === 'core') return [path.join(PROJECT_ROOT, 'scripts', 'lib')];
  if (tier === 'dashboard') {
    return [
      path.join(PROJECT_ROOT, 'dashboard', 'src'),
      path.join(PROJECT_ROOT, 'dashboard', 'routes'),
      path.join(PROJECT_ROOT, 'dashboard', 'services')
    ];
  }
  return [
    path.join(PROJECT_ROOT, 'scripts'),
    path.join(PROJECT_ROOT, 'dashboard', 'src'),
    path.join(PROJECT_ROOT, 'dashboard', 'routes'),
    path.join(PROJECT_ROOT, 'dashboard', 'services')
  ];
}

function _parseIntOpt(args, prefix, fallback) {
  const match = args.find(a => a.startsWith(prefix));
  if (!match) return fallback;
  const parsed = parseInt(match.split('=')[1], 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function _parseCliOptions(args) {
  const maxCcArg = args.find(a => a.startsWith('--max-cc=') || a.startsWith('--threshold='));
  const tierArg = args.find(a => a.startsWith('--tier='));
  const baselineArg = args.find(a => a.startsWith('--baseline='));
  return {
    failOnBreach: args.includes('--fail-on-breach'),
    ratchet: args.includes('--ratchet'),
    writeBaseline: args.includes('--write-baseline'),
    pruneBaseline: args.includes('--prune-baseline'),
    baselinePath: baselineArg ? path.resolve(baselineArg.split('=')[1]) : DEFAULT_BASELINE_PATH,
    maxCcThreshold: maxCcArg ? parseInt(maxCcArg.split('=')[1], 10) : 30,
    maxLocThreshold: _parseIntOpt(args, '--max-loc=', 80),
    maxNestingThreshold: _parseIntOpt(args, '--max-nesting=', 4),
    tier: tierArg ? tierArg.split('=')[1].toLowerCase() : 'all',
    topCount: _parseIntOpt(args, '--top=', 10)
  };
}

function _loadRatchetBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) return { entries: {} };
  try {
    const parsed = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    return { entries: parsed.entries || {} };
  } catch {
    return { entries: {} };
  }
}

function _evaluateFunctionGate(fn, opts, baselineEntries) {
  if (!opts.ratchet) {
    return fn.complexity > opts.maxCcThreshold ? [`CC ${fn.complexity} > ${opts.maxCcThreshold}`] : [];
  }
  const entry = baselineEntries[fn.ratchetKey];
  const ccCap = entry ? Math.min(30, entry.cc) : opts.maxCcThreshold;
  const locCap = entry ? entry.loc : opts.maxLocThreshold;
  const nestCap = entry ? entry.nesting : opts.maxNestingThreshold;
  const reasons = [];
  if (fn.complexity > ccCap) reasons.push(`CC ${fn.complexity} > ${ccCap}`);
  if (fn.loc > locCap) reasons.push(`LOC ${fn.loc} > ${locCap}`);
  if (fn.maxNesting > nestCap) reasons.push(`Nesting ${fn.maxNesting} > ${nestCap}`);
  return reasons;
}

function _writeOrPruneBaseline(allFunctions, opts) {
  const existing = opts.pruneBaseline ? _loadRatchetBaseline(opts.baselinePath).entries : {};
  const entries = {};
  for (const fn of allFunctions) {
    const exceedsModern = fn.complexity > opts.maxCcThreshold || fn.loc > opts.maxLocThreshold || fn.maxNesting > opts.maxNestingThreshold;
    if (!exceedsModern) continue;
    if (opts.pruneBaseline && !existing[fn.ratchetKey]) continue;
    const prev = existing[fn.ratchetKey];
    entries[fn.ratchetKey] = {
      cc: prev ? Math.min(prev.cc, fn.complexity) : fn.complexity,
      loc: prev ? Math.min(prev.loc, fn.loc) : fn.loc,
      nesting: prev ? Math.min(prev.nesting, fn.maxNesting) : fn.maxNesting
    };
  }
  const payload = {
    schemaVersion: '1.0.0',
    thresholds: { maxCc: opts.maxCcThreshold, maxLoc: opts.maxLocThreshold, maxNesting: opts.maxNestingThreshold },
    legacyRatchetCount: Object.keys(entries).length,
    entries
  };
  fs.mkdirSync(path.dirname(opts.baselinePath), { recursive: true });
  fs.writeFileSync(opts.baselinePath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  return payload;
}

function _printTopFunctions(allFunctions, topCount) {
  console.log('----------------------------------------------------------------');
  console.log(`📌 TOP ${topCount} HIGHEST CYCLOMATIC COMPLEXITY FUNCTIONS`);
  console.log('----------------------------------------------------------------');
  allFunctions.slice(0, topCount).forEach((fn, idx) => {
    const badge = fn.complexity > 30 ? '🚨 >30' : (fn.complexity > 20 ? '🔴 >20' : (fn.complexity > 15 ? '🟠 16-20' : '🟢 <=15'));
    console.log(`${idx + 1}. [CC:${String(fn.complexity).padStart(2)} LOC:${String(fn.loc).padStart(3)} Nest:${fn.maxNesting}] ${badge} ${fn.name}()`);
    console.log(`   File: ${fn.file}:${fn.startLine}`);
  });
}

function _printComplexityReport(meta) {
  const { tier, results, allFunctions, lowComplexity, moderateComplexity, highComplexity, criticalComplexity, target30Breaches, topCount, maxCcThreshold, breaches, failOnBreach, ratchet } = meta;
  const total = Math.max(1, allFunctions.length);
  console.log('================================================================');
  console.log('🔍 CYCLOMATIC COMPLEXITY & 3D MAINTAINABILITY PROFILER');
  console.log('================================================================\n');
  console.log(`📊 Scanned Tier: [${tier.toUpperCase()}] | ${results.length} files | ${allFunctions.length} total functions\n`);
  console.log(`🟢 Low Complexity (1-9 CC)        : ${lowComplexity.length} functions (${((lowComplexity.length / total) * 100).toFixed(1)}%)`);
  console.log(`🟡 Moderate Complexity (10-15 CC)  : ${moderateComplexity.length} functions (${((moderateComplexity.length / total) * 100).toFixed(1)}%)`);
  console.log(`🟠 High Complexity (16-25 CC)      : ${highComplexity.length - criticalComplexity.length} functions`);
  console.log(`🔴 Critical Complexity (26-30 CC)  : ${criticalComplexity.length - target30Breaches.length} functions`);
  console.log(`🚨 Functions Exceeding Target (>30): ${target30Breaches.length} functions (${((target30Breaches.length / total) * 100).toFixed(1)}%)\n`);
  _printTopFunctions(allFunctions, topCount);
  console.log('\n================================================================');
  if (breaches.length > 0) {
    console.log(`⚠️  ${breaches.length} function(s) exceed ${ratchet ? '3D ratchet gate' : `CC threshold of ${maxCcThreshold}`}.`);
    if (failOnBreach) {
      console.error(`\n❌ COMPLEXITY GATE BREACH (${breaches.length}):`);
      breaches.forEach(b => console.error(`  • ${b.name}() [${(b.breachReasons || []).join(', ')}] at ${b.file}:${b.startLine}`));
      process.exit(1);
    }
  } else {
    console.log(`✅ All scanned functions pass ${ratchet ? '3D maintainability ratchet (CC<=20, LOC<=80, Nest<=4)' : `CC <= ${maxCcThreshold}`}.`);
  }
}

function runAnalysis() {
  const opts = _parseCliOptions(process.argv.slice(2));
  const results = _resolveTargetDirs(opts.tier).flatMap(t => walkDir(t)).map(f => analyzeFile(f));
  const allFunctions = [];
  results.forEach(r => r.functions.forEach(fn => allFunctions.push({ ...fn, file: r.filePath })));
  allFunctions.sort((a, b) => b.complexity - a.complexity);

  if (opts.writeBaseline || opts.pruneBaseline) {
    _writeOrPruneBaseline(allFunctions, opts);
  }
  const baseline = opts.ratchet ? _loadRatchetBaseline(opts.baselinePath).entries : {};
  const breaches = [];
  for (const fn of allFunctions) {
    const reasons = _evaluateFunctionGate(fn, opts, baseline);
    if (reasons.length > 0) breaches.push({ ...fn, breachReasons: reasons });
  }

  const highComplexity = allFunctions.filter(f => f.complexity > 15);
  const criticalComplexity = allFunctions.filter(f => f.complexity > 25);
  const target30Breaches = allFunctions.filter(f => f.complexity > 30);
  const moderateComplexity = allFunctions.filter(f => f.complexity >= 10 && f.complexity <= 15);
  const lowComplexity = allFunctions.filter(f => f.complexity < 10);

  _printComplexityReport({
    tier: opts.tier, results, allFunctions, lowComplexity, moderateComplexity,
    highComplexity, criticalComplexity, target30Breaches, topCount: opts.topCount,
    maxCcThreshold: opts.maxCcThreshold, breaches, failOnBreach: opts.failOnBreach, ratchet: opts.ratchet
  });

  return {
    totalFiles: results.length,
    totalFunctions: allFunctions.length,
    violations: breaches,
    topComplexFunctions: allFunctions.slice(0, opts.topCount),
    results, allFunctions, highComplexity, criticalComplexity, target30Breaches, breaches
  };
}

if (require.main === module) {
  runAnalysis();
}

module.exports = { runAnalysis, analyzeFile, walkDir, stripNonCodeLiterals };
