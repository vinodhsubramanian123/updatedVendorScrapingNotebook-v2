'use strict';
/**
 * scripts/lib/notebook/query_sanitizer.js — Natural Language Query Sanitizer & Parser
 *
 * Cleans code snippets, braces, and scripting keywords from raw prompts,
 * preserving hardware SKUs, part numbers, and semantic intent.
 */

const { parseProductMeta } = require('../catalog/product_meta.js');
const { cleanBaseSKU } = require('../catalog/sku.js');

const SCRIPTING_PATTERNS = [
  /const\s+[a-zA-Z0-9_$]+\s*=/g,
  /let\s+[a-zA-Z0-9_$]+\s*=/g,
  /var\s+[a-zA-Z0-9_$]+\s*=/g,
  /require\s*\(['"][^'"]+['"]\)/g,
  /import\s+.*?\s+from\s+['"][^'"]+['"]/g,
  /function\s*\w*\s*\(/g,
  /=>\s*\{/g,
  /console\.(log|error|warn)\s*\(/g,
  /process\.(env|exit|argv|stdout)/g,
  /execSync\s*\(/g,
  /execFile\s*\(/g,
  /fs\.(readFileSync|writeFileSync|existsSync|mkdirSync)/g,
  /path\.(join|resolve|dirname|basename)/g,
  /\{\s*[\s\S]*?\}/g,
  /```[\s\S]*?```/g
];

const SCENARIO_KEYWORD_MAP = [
  { scenario: 'AMBIGUITY_HITL', keywords: ['ambiguity', 'delta', 'human', 'fix', 'reasoning'] },
  { scenario: 'PROCESSOR_SPECS', keywords: ['core', '64-core', 'core count', 'core-count'] },
  { scenario: 'TELCO_DC', keywords: ['lug', 'dc', '-48v', 'telco', 'power cable'] },
  { scenario: 'STORAGE_CACHE', keywords: ['battery', 'smart storage', 'controller', 'cache'] },
  { scenario: 'MEMORY_SYMMETRY', keywords: ['memory', 'dimm', 'channel', 'balance', 'interleaving'] },
  { scenario: 'PCIE_EXPANSION', keywords: ['pcie', 'riser', 'slot', 'gpu', 'lane'] },
  { scenario: 'MULTI_NODE_CTO', keywords: ['cto', 'fraction', 'multiplier', 'node', 'chassis qty'] },
  { scenario: 'THERMAL_TDP', keywords: ['fan', 'thermal', 'tdp', 'heatsink', 'cooling'] },
  { scenario: 'PROCESSOR_SPECS', keywords: ['processor', 'xeon', 'epyc'] }
];

function classifyQueryScenario(rawQuery = '') {
  const q = String(rawQuery).toLowerCase();
  for (const entry of SCENARIO_KEYWORD_MAP) {
    if (entry.keywords.some(kw => q.includes(kw))) {
      return entry.scenario;
    }
  }
  return 'GENERAL_QUICKSPECS';
}

function stripAnsi(str) {
  if (!str) return '';
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function _extractQueryStringAndContext(rawQuery, context) {
  if (typeof rawQuery === 'string') {
    return rawQuery;
  }
  if (rawQuery && typeof rawQuery === 'object') {
    const queryStr = rawQuery.query || rawQuery.prompt || rawQuery.text || '';
    if (!context.chassis && rawQuery.chassis) context.chassis = rawQuery.chassis;
    if (!context.skus && rawQuery.skus) context.skus = rawQuery.skus;
    return queryStr;
  }
  return '';
}

function _buildDefaultHardwareQuery(context) {
  const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';
  const skus = Array.isArray(context.skus) ? context.skus.slice(0, 12).join(', ') : '';
  if (skus) {
    return `What are the hardware configuration rules, memory rules, and QuickSpecs specifications for ${chassisName} regarding parts: ${skus}?`;
  }
  return `What are the hardware configuration rules and QuickSpecs specifications for ${chassisName}?`;
}

function _collectQuerySkus(clean, context) {
  const skuMatches = Array.from(clean.matchAll(/([A-Z0-9]{5,6}-[A-Z0-9]{2,3})/g)).map(m => m[1]);
  if (Array.isArray(context.skus)) {
    context.skus.forEach(s => {
      if (typeof s === 'string' && /^[A-Z0-9]{5,6}-[A-Z0-9]{2,3}$/.test(s)) {
        skuMatches.push(s);
      }
    });
  }
  return Array.from(new Set(skuMatches));
}

function _hasCodePatterns(clean) {
  return SCRIPTING_PATTERNS.some(pattern => { pattern.lastIndex = 0; return pattern.test(clean); }) ||
    clean.includes('const fs') ||
    clean.includes('require(') ||
    clean.includes('function(') ||
    clean.includes('module.exports');
}

function _reconstructQueryFromCode(context, uniqueSkus) {
  const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';
  let reconstructed = `What are the hardware configuration rules, physical cable requirements, and QuickSpecs specifications for ${chassisName}?`;
  if (uniqueSkus.length > 0) {
    reconstructed += ` Specifically regarding part numbers: ${uniqueSkus.join(', ')}.`;
  }
  return reconstructed;
}

function _formatPartsList(context, uniqueSkus) {
  if (Array.isArray(context.items) && context.items.length > 0) {
    const itemDescriptions = context.items
      .filter(it => it && it.sku)
      .map(it => `${cleanBaseSKU(it.sku)}${it.description ? ` (${it.description.slice(0, 60)})` : ''}`);
    if (itemDescriptions.length > 0) return itemDescriptions.join(', ');
  }
  return uniqueSkus.length > 0 ? uniqueSkus.join(', ') : '';
}

function _resolveProductScope(family) {
  if (['Alletra', 'Nimble', 'StoreOnce', 'MSA', 'SimpliVity'].includes(family)) return 'Storage System';
  if (family === 'Synergy') return 'Interconnect & Frame Module';
  if (family === 'StoreEver') return 'Tape Library System';
  if (family === 'Cray') return 'Supercomputing System';
  return 'Server';
}

function sanitizeNotebookQuery(rawQuery, context = {}) {
  const queryStr = _extractQueryStringAndContext(rawQuery, context);
  if (!queryStr) {
    return _buildDefaultHardwareQuery(context);
  }

  let clean = queryStr.trim();
  // Internal structured validation is sent as an execFile argument, never shell
  // code. Preserve its JSON schema and candidate manifest rather than replacing
  // the task with a generic hardware question. Customer text remains untrusted.
  if (context.structuredValidation === true) return stripAnsi(clean);

  const uniqueSkus = _collectQuerySkus(clean, context);
  if (_hasCodePatterns(clean)) {
    return _reconstructQueryFromCode(context, uniqueSkus);
  }

  clean = clean
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/["$`\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';
  const partsListStr = _formatPartsList(context, uniqueSkus);

  if (clean.length > 1000 && partsListStr) {
    return `Validate physical hardware configuration rules, thermal constraints, memory rules, and QuickSpecs specifications for ${chassisName} regarding Part Numbers and Descriptions: ${partsListStr.slice(0, 800)}.`;
  }

  if (clean.length === 0) {
    clean = partsListStr
      ? `What are the hardware configuration rules, cabling requirements, and QuickSpecs rules for ${chassisName} regarding: ${partsListStr}?`
      : 'What are the hardware configuration rules and QuickSpecs specifications for this model?';
  }

  const meta = parseProductMeta(chassisName);
  const scope = _resolveProductScope(meta.family);

  if (!clean.toLowerCase().includes(chassisName.toLowerCase())) {
    clean = `For ${meta.family} ${meta.gen} ${chassisName} ${scope}: ${clean}`;
  }

  return clean.replace(/[[\]|`"$\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getSanitizationBreakdown(rawQuery, context = {}) {
  const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';
  const meta = parseProductMeta(chassisName);
  
  let scope = 'Server';
  if (['Alletra', 'Nimble', 'StoreOnce', 'MSA', 'SimpliVity'].includes(meta.family)) scope = 'Storage System';
  else if (meta.family === 'Synergy') scope = 'Interconnect & Frame Module';
  else if (meta.family === 'StoreEver') scope = 'Tape Library System';
  else if (meta.family === 'Cray') scope = 'Supercomputing System';

  const clean = rawQuery ? String(rawQuery).trim() : '';
  const skuMatches = Array.from(clean.matchAll(/([A-Z0-9]{5,6}-[A-Z0-9]{2,3})/g)).map(m => m[1]);
  const uniqueSkus = Array.from(new Set(skuMatches));

  const strippedPatterns = [];
  SCRIPTING_PATTERNS.forEach(pat => {
    if (pat.test(clean)) strippedPatterns.push(pat.toString());
  });

  const containsCode = strippedPatterns.length > 0 ||
    clean.includes('const fs') || clean.includes('require(') || clean.includes('function(') || clean.includes('module.exports');

  const sanitizedQuery = sanitizeNotebookQuery(rawQuery, context);
  const scenario = classifyQueryScenario(rawQuery);

  const steps = [];
  if (containsCode) {
    steps.push('Detected Node.js code / scripting keywords or braces in query.');
    steps.push(`Stripped ${strippedPatterns.length} code pattern(s) and shell metacharacters.`);
    if (uniqueSkus.length > 0) steps.push(`Preserved extracted HPE Part Numbers: ${uniqueSkus.join(', ')}.`);
    steps.push(`Reconstructed natural language query focused on QuickSpecs rules.`);
  } else {
    steps.push('Input query is valid natural language text.');
    steps.push('Cleaned markdown code fences and shell metacharacters.');
  }

  steps.push(`Prepended chassis scope metadata header: [Product Scope: ${scope} | Family: ${meta.family} | Gen: ${meta.gen} | Chassis: ${chassisName}]`);

  return {
    rawQuery: rawQuery || '',
    sanitizedQuery,
    scenario,
    extractedSkus: uniqueSkus,
    productScope: { scope, family: meta.family, gen: meta.gen, chassis: chassisName },
    containsCode,
    strippedPatternsCount: strippedPatterns.length,
    sanitizationSteps: steps,
    cliCommandPreview: `nlm notebook query <NOTEBOOK_ID> "${sanitizedQuery.replace(/"/g, '\\"')}" --json`
  };
}

module.exports = {
  SCRIPTING_PATTERNS,
  classifyQueryScenario,
  stripAnsi,
  sanitizeNotebookQuery,
  getSanitizationBreakdown
};
