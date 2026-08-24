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
  /\=>\s*\{/g,
  /console\.(log|error|warn)\s*\(/g,
  /process\.(env|exit|argv|stdout)/g,
  /execSync\s*\(/g,
  /execFile\s*\(/g,
  /fs\.(readFileSync|writeFileSync|existsSync|mkdirSync)/g,
  /path\.(join|resolve|dirname|basename)/g,
  /\{\s*[\s\S]*?\}/g,
  /```[\s\S]*?```/g
];

function classifyQueryScenario(rawQuery = '') {
  const q = String(rawQuery).toLowerCase();
  if (q.includes('ambiguity') || q.includes('delta') || q.includes('human') || q.includes('fix') || q.includes('reasoning')) return 'AMBIGUITY_HITL';
  if (q.includes('core') || q.includes('64-core') || q.includes('core count') || q.includes('core-count')) return 'PROCESSOR_SPECS';
  if (q.includes('lug') || q.includes('dc') || q.includes('-48v') || q.includes('telco') || q.includes('power cable')) return 'TELCO_DC';
  if (q.includes('battery') || q.includes('smart storage') || q.includes('controller') || q.includes('cache')) return 'STORAGE_CACHE';
  if (q.includes('memory') || q.includes('dimm') || q.includes('channel') || q.includes('balance') || q.includes('interleaving')) return 'MEMORY_SYMMETRY';
  if (q.includes('pcie') || q.includes('riser') || q.includes('slot') || q.includes('gpu') || q.includes('lane')) return 'PCIE_EXPANSION';
  if (q.includes('cto') || q.includes('fraction') || q.includes('multiplier') || q.includes('node') || q.includes('chassis qty')) return 'MULTI_NODE_CTO';
  if (q.includes('fan') || q.includes('thermal') || q.includes('tdp') || q.includes('heatsink') || q.includes('cooling')) return 'THERMAL_TDP';
  if (q.includes('processor') || q.includes('xeon') || q.includes('epyc')) return 'PROCESSOR_SPECS';
  return 'GENERAL_QUICKSPECS';
}

function stripAnsi(str) {
  if (!str) return '';
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function sanitizeNotebookQuery(rawQuery, context = {}) {
  let queryStr = '';
  if (typeof rawQuery === 'string') {
    queryStr = rawQuery;
  } else if (rawQuery && typeof rawQuery === 'object') {
    queryStr = rawQuery.query || rawQuery.prompt || rawQuery.text || '';
    if (!context.chassis && rawQuery.chassis) context.chassis = rawQuery.chassis;
    if (!context.skus && rawQuery.skus) context.skus = rawQuery.skus;
  }

  if (!queryStr) {
    const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';
    const skus = Array.isArray(context.skus) ? context.skus.slice(0, 12).join(', ') : '';
    return skus
      ? `What are the hardware configuration rules, memory rules, and QuickSpecs specifications for ${chassisName} regarding parts: ${skus}?`
      : `What are the hardware configuration rules and QuickSpecs specifications for ${chassisName}?`;
  }

  let clean = queryStr.trim();

  const skuMatches = Array.from(clean.matchAll(/([A-Z0-9]{5,6}-[A-Z0-9]{2,3})/g)).map(m => m[1]);
  if (Array.isArray(context.skus)) {
    context.skus.forEach(s => { if (typeof s === 'string' && /^[A-Z0-9]{5,6}-[A-Z0-9]{2,3}$/.test(s)) skuMatches.push(s); });
  }
  const uniqueSkus = Array.from(new Set(skuMatches));

  const containsCode = SCRIPTING_PATTERNS.some(pattern => pattern.test(clean)) ||
    clean.includes('const fs') ||
    clean.includes('require(') ||
    clean.includes('function(') ||
    clean.includes('module.exports');

  if (containsCode) {
    SCRIPTING_PATTERNS.forEach(pattern => {
      clean = clean.replace(pattern, ' ');
    });
    clean = clean.replace(/[`"${}$<>;]/g, ' ').replace(/\s+/g, ' ').trim();

    const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';
    let reconstructed = `What are the hardware configuration rules, physical cable requirements, and QuickSpecs specifications for ${chassisName}?`;
    if (uniqueSkus.length > 0) {
      reconstructed += ` Specifically regarding part numbers: ${uniqueSkus.join(', ')}.`;
    }
    return reconstructed;
  }

  clean = clean
    .replace(/```[a-z]*\n?/gi, '')
    .replace(/```/g, '')
    .replace(/["$`\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const chassisName = context.chassis || 'HPE ProLiant DL380 Gen12 SFF';

  let itemDescriptions = [];
  if (Array.isArray(context.items) && context.items.length > 0) {
    itemDescriptions = context.items
      .filter(it => it && it.sku)
      .map(it => `${cleanBaseSKU(it.sku)}${it.description ? ` (${it.description.slice(0, 60)})` : ''}`);
  }

  const partsListStr = itemDescriptions.length > 0
    ? itemDescriptions.join(', ')
    : (uniqueSkus.length > 0 ? uniqueSkus.join(', ') : '');

  if (clean.length > 1000 && partsListStr) {
    return `Validate physical hardware configuration rules, thermal constraints, memory rules, and QuickSpecs specifications for ${chassisName} regarding Part Numbers and Descriptions: ${partsListStr.slice(0, 800)}.`;
  }

  if (clean.length === 0) {
    clean = partsListStr
      ? `What are the hardware configuration rules, cabling requirements, and QuickSpecs rules for ${chassisName} regarding: ${partsListStr}?`
      : 'What are the hardware configuration rules and QuickSpecs specifications for this model?';
  }

  const meta = parseProductMeta(chassisName);
  
  let scope = 'Server';
  if (['Alletra', 'Nimble', 'StoreOnce', 'MSA', 'SimpliVity'].includes(meta.family)) scope = 'Storage System';
  else if (meta.family === 'Synergy') scope = 'Interconnect & Frame Module';
  else if (meta.family === 'StoreEver') scope = 'Tape Library System';
  else if (meta.family === 'Cray') scope = 'Supercomputing System';

  if (!clean.toLowerCase().includes(chassisName.toLowerCase())) {
    clean = `For ${meta.family} ${meta.gen} ${chassisName} ${scope}: ${clean}`;
  }

  clean = clean.replace(/[\[\]|`"$\\]/g, ' ').replace(/\s+/g, ' ').trim();

  return clean;
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
