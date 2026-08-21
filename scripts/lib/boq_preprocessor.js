'use strict';
/**
 * scripts/lib/boq_preprocessor.js — BOQ Manual Pre-processing & Variation Classification Engine
 *
 * Coordinator for:
 * 1. Multi-config grouping and variation identification.
 * 2. 1-Unit CTO atomic quantity normalization & divisor anomaly detection.
 * 3. Improbability index & anomaly scoring.
 * 4. Comparative side-by-side configuration diff matrix.
 * 5. Preprocessing audit trail & Human-in-the-Loop (HITL) review triggers.
 */

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx-js-style');
const { cleanBaseSKU } = require('./sku.js');
const { loadCatalogRules } = require('./catalog_rules.js');
const { parseSkuLines } = require('./boq_parser.js');

// Modular subcomponents
const {
  detectAndNormalizeAtomicCto,
  isCtoBaseChassis,
  KNOWN_CTO_SKU_PREFIXES
} = require('./preprocessor/cto_normalizer.js');

const {
  SPLIT_REASONS,
  extractHardwareProfile,
  calculateImprobabilityMetrics,
  buildConfigDiffMatrix
} = require('./preprocessor/variation_clusterer.js');

const {
  savePreprocessingRuleFeedback
} = require('./preprocessor/feedback_persister.js');

/**
 * Main Preprocessor: Parse, group configuration variations, build audit trail & diffs.
 *
 * @param {string} rawInput - Raw text or CSV content
 * @param {string} [filePath=''] - Path to input file (e.g. .xlsx or .csv)
 * @param {object} [options={}] - Optional chassisDir or context
 * @returns {object} Preprocessed BOQ result with variations and audit trail
 */
function preprocessAndGroupBOQ(filePathOrRaw = null, rawTextOrFilePath = null, options = {}) {
  let filePath = '';
  let rawText = '';

  if (typeof filePathOrRaw === 'string' && (filePathOrRaw.endsWith('.xlsx') || filePathOrRaw.endsWith('.xls') || filePathOrRaw.endsWith('.csv') || filePathOrRaw.endsWith('.tsv') || filePathOrRaw.endsWith('.txt')) && fs.existsSync(filePathOrRaw)) {
    filePath = filePathOrRaw;
    rawText = typeof rawTextOrFilePath === 'string' ? rawTextOrFilePath : '';
  } else if (typeof rawTextOrFilePath === 'string' && (rawTextOrFilePath.endsWith('.xlsx') || rawTextOrFilePath.endsWith('.xls') || rawTextOrFilePath.endsWith('.csv') || rawTextOrFilePath.endsWith('.tsv') || rawTextOrFilePath.endsWith('.txt')) && fs.existsSync(rawTextOrFilePath)) {
    filePath = rawTextOrFilePath;
    rawText = typeof filePathOrRaw === 'string' ? filePathOrRaw : '';
  } else if (typeof filePathOrRaw === 'string') {
    rawText = filePathOrRaw;
    filePath = (typeof rawTextOrFilePath === 'string' && fs.existsSync(rawTextOrFilePath)) ? rawTextOrFilePath : '';
  } else if (typeof rawTextOrFilePath === 'string') {
    rawText = rawTextOrFilePath;
  }

  const auditTrail = {
    rawInputSummary: {
      source: filePath ? path.basename(filePath) : 'Raw Text Paste',
      totalLines: 0,
      totalSheets: 0,
      sheetNames: []
    },
    steps: []
  };

  const addStep = (stepNumber, name, detail, status = 'COMPLETED') => {
    auditTrail.steps.push({
      step: stepNumber,
      name,
      timestamp: new Date().toISOString(),
      detail,
      status
    });
  };

  addStep(1, 'Raw File Intake & Sheet Discovery', `Reading BOQ input source: ${filePath ? path.basename(filePath) : 'Direct Text Input'}`);

  let sheetsData = [];

  if (filePath && (filePath.endsWith('.xlsx') || filePath.endsWith('.xls'))) {
    try {
      const workbook = xlsx.readFile(filePath);
      auditTrail.rawInputSummary.totalSheets = workbook.SheetNames.length;
      auditTrail.rawInputSummary.sheetNames = workbook.SheetNames;

      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const csvText = xlsx.utils.sheet_to_csv(sheet);
        sheetsData.push({
          sectionName: sheetName,
          content: csvText
        });
      });
      addStep(2, 'Multi-Sheet Excel Workbook Parsing', `Discovered ${workbook.SheetNames.length} sheet(s): ${workbook.SheetNames.join(', ')}`);
    } catch (err) {
      addStep(2, 'Excel Parsing Fallback', `Failed to parse Excel workbook natively: ${err.message}. Treating as text.`, 'WARNING');
      sheetsData.push({ sectionName: 'Main_BOQ', content: String(rawText) });
    }
  } else {
    const text = String(rawText || '');
    const sectionRegex = /(?:^|\n)(?:[=#*\-]{3,}\s*(.*?)\s*[=#*\-]{3,}|\[(.*?)\]|Configuration\s+(\d+[:\s\w]*))/gi;
    let match;
    let lastIndex = 0;
    let sections = [];

    while ((match = sectionRegex.exec(text)) !== null) {
      const secName = (match[1] || match[2] || match[3] || `Section_${sections.length + 1}`).trim();
      if (match.index > lastIndex) {
        const prevText = text.substring(lastIndex, match.index).trim();
        if (prevText) {
          sections.push({ sectionName: sections.length === 0 ? 'Main_Section' : `Section_${sections.length}`, content: prevText });
        }
      }
      lastIndex = sectionRegex.lastIndex;
      sections.push({ sectionName: secName, content: '' });
    }

    if (sections.length > 0) {
      if (lastIndex < text.length) {
        sections[sections.length - 1].content = text.substring(lastIndex).trim();
      }
      sheetsData = sections.filter(s => s.content.length > 0);
    } else {
      sheetsData = [{ sectionName: 'Main_BOQ', content: text }];
    }

    auditTrail.rawInputSummary.totalSheets = sheetsData.length;
    auditTrail.rawInputSummary.sheetNames = sheetsData.map(s => s.sectionName);
    addStep(2, 'Text Section Segmentation', `Identified ${sheetsData.length} text block section(s)`);
  }

/**
 * Segments lines of a single sheet or text block into distinct configuration blocks.
 * Detects:
 * - Explicit configuration/server/chassis section banners (e.g. "Server 1", "Config 2", "Option B", "Chassis A", "### DL380 Gen12")
 * - Repeated CTO Base Chassis anchor lines (e.g. encountering a second CTO base chassis item triggers a new config block)
 * - Major blank/separator row divides between SKU tables
 */
function segmentSheetIntoConfigBlocks(lines, sheetName = 'Sheet') {
  const blocks = [];
  let currentBlock = {
    name: sheetName,
    lines: [],
    baseChassisFound: null
  };

  const isConfigBanner = (l) => {
    const trimmed = String(l || '').trim();
    if (!trimmed) return false;
    if (/^[#*=\-_]{3,}\s*(.*?)\s*[#*=\-_]{3,}$/.test(trimmed)) return true;
    if (/^\[(.*?)\]$/.test(trimmed)) return true;
    if (/^(?:Configuration|Config|Server|Chassis|Node|Solution|System|Quote\s*Item)\s*[\d:#\-_A-Za-z]/i.test(trimmed)) {
      const parts = trimmed.split(/[\t,;|]/);
      const isTableData = parts.length >= 3 && parts.some(p => /^\d+$/.test(p.trim()));
      if (!isTableData) return true;
    }
    return false;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = String(rawLine || '').trim();
    if (!line) continue;

    if (isConfigBanner(line)) {
      if (currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
      }
      const bannerClean = line.replace(/^[#*=\-_\[\]\s]+|[#*=\-_\[\]\s]+$/g, '').trim();
      currentBlock = {
        name: `${sheetName} - ${bannerClean}`,
        lines: [line],
        baseChassisFound: null
      };
      continue;
    }

    // Check if line contains a CTO Base Chassis SKU
    const skuMatches = line.match(/\b([A-Z0-9]{5,8}-[A-Z0-9]{3,4})\b/g) || [];
    for (const match of skuMatches) {
      const clean = cleanBaseSKU(match);
      if (isCtoBaseChassis({ sku: clean, description: line })) {
        if (currentBlock.baseChassisFound && currentBlock.lines.length > 0) {
          // A second base chassis in the same sheet without an explicit header banner
          blocks.push(currentBlock);
          currentBlock = {
            name: `${sheetName} - Config ${blocks.length + 1}`,
            lines: [],
            baseChassisFound: clean
          };
        } else {
          currentBlock.baseChassisFound = clean;
        }
        break;
      }
    }

    currentBlock.lines.push(line);
  }

  if (currentBlock.lines.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks.length > 0 ? blocks : [{ name: sheetName, lines }];
}

// Parse items for each section / sheet with intelligent intra-sheet config segmentation
  const rawVariations = [];
  let globalLineCount = 0;

  sheetsData.forEach((sec) => {
    const lines = sec.content.split(/\r?\n/).filter(l => l.trim().length > 0);
    globalLineCount += lines.length;

    const configBlocks = segmentSheetIntoConfigBlocks(lines, sec.sectionName);

    configBlocks.forEach((block, bIdx) => {
      const { items, multiplier } = parseSkuLines(block.lines);
      if (items.length > 0) {
        rawVariations.push({
          configId: `config_${rawVariations.length + 1}`,
          rawName: block.name || `${sec.sectionName}_Config_${bIdx + 1}`,
          items: items,
          multiplier: multiplier || 1
        });
      }
    });
  });

  auditTrail.rawInputSummary.totalLines = globalLineCount;
  addStep(3, 'Line-Level Cleaning & Quantity Normalization', `Processed ${globalLineCount} lines across sections. Cleaned SKU items extracted into ${rawVariations.length} configuration variation(s).`);

  // Intra-list variant detection if only 1 section with multiple distinct processors
  if (rawVariations.length === 1) {
    const single = rawVariations[0];
    const cpus = single.items.filter(it => {
      const desc = (it.description || '').toLowerCase();
      if (desc.includes('cable') || desc.includes('heatsink') || desc.includes('fan') || desc.includes('ocp')) return false;
      return desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc');
    });

    if (cpus.length > 1) {
      addStep(4, 'Intra-List Variant Cluster Detection', `Detected ${cpus.length} distinct processor SKUs in single list. Splitting into configuration variations.`);

      const splitVariations = cpus.map((cpuItem, cIdx) => {
        const variantItems = single.items.filter(it => {
          const desc = it.description.toLowerCase();
          if (desc.includes('processor') || desc.includes('xeon') || desc.includes('epyc')) {
            return cleanBaseSKU(it.sku) === cleanBaseSKU(cpuItem.sku);
          }
          return true;
        });

        return {
          configId: `config_${cIdx + 1}`,
          rawName: `Variation ${cIdx + 1} (${cpuItem.description.split(' ')[0] || cpuItem.sku})`,
          items: variantItems,
          primaryCpu: cpuItem,
          multiplier: single.multiplier || 1
        };
      });

      rawVariations.length = 0;
      rawVariations.push(...splitVariations);
    }
  }

  addStep(5, 'Differential Analysis & Categorization', `Building comparative profile across ${rawVariations.length} configuration variation(s).`);

  const loadedRules = options.chassisDir ? loadCatalogRules(options.chassisDir) : { parsedRules: [], subcategoryConstraints: [] };

  const processedVariations = rawVariations.map((v, idx) => {
    const ctoNorm = detectAndNormalizeAtomicCto(v.items, { explicitMultiplier: v.multiplier });
    const profile = extractHardwareProfile(ctoNorm.items);

    let chassisName = 'DL380 Gen12 SFF';
    let solutionType = 'SERVER';
    let vendor = 'HPE';
    let family = 'ProLiant';
    let gen = 'Gen12';
    let notebookId = '1d190853-4e9c-48df-aa70-eae66c6f2c1f';

    const allSkus = v.items.map(i => cleanBaseSKU(i.sku || '').toUpperCase());
    const allDescs = v.items.map(i => (i.description || '').toLowerCase()).join(' ');

    if (allDescs.includes('alletra') || allSkus.some(s => s.startsWith('R0Q') || s.startsWith('R7G') || s.startsWith('P764'))) {
      chassisName = 'Alletra Storage System';
      solutionType = 'STORAGE';
      family = 'Alletra';
      gen = 'Gen12';
      notebookId = '';
    } else if (allDescs.includes('synergy') || allDescs.includes('vc 100gb') || allDescs.includes('sy') || allSkus.some(s => s.startsWith('Q8D') || s.startsWith('Q6F'))) {
      chassisName = 'SY100Gb F32 Module';
      solutionType = 'NETWORKING';
      family = 'Synergy';
      gen = 'General';
      notebookId = '';
    } else if (allDescs.includes('gx5000') || allDescs.includes('cray') || allDescs.includes('supercomputing') || allSkus.some(s => s.startsWith('P57'))) {
      chassisName = 'GX5000 General RACK';
      solutionType = 'HPC';
      family = 'Cray';
      gen = 'General';
      notebookId = '';
    } else if (allDescs.includes('msl3040') || allDescs.includes('tape library') || allDescs.includes('storeever') || allSkus.some(s => s.startsWith('Q6Q') || s.startsWith('Q6L'))) {
      chassisName = 'MSL3040 Tape';
      solutionType = 'TAPE';
      family = 'StoreEver';
      gen = 'General';
      notebookId = '';
    } else if ((allDescs.includes('dl380') || allDescs.includes('proliant')) && allDescs.includes('gen11')) {
      chassisName = 'DL380 Gen11';
      solutionType = 'SERVER';
      family = 'ProLiant';
      gen = 'Gen11';
      notebookId = '';
    } else if ((allDescs.includes('dl380') || allDescs.includes('proliant')) && (allDescs.includes('gen12') || allSkus.some(s => s.startsWith('P732') || s.startsWith('P767')))) {
      chassisName = 'DL380 Gen12 SFF';
      solutionType = 'SERVER';
      family = 'ProLiant';
      gen = 'Gen12';
      notebookId = '1d190853-4e9c-48df-aa70-eae66c6f2c1f';
    } else if (options && options.chassisHint) {
      chassisName = options.chassisHint;
    }

    const tempVar = {
      configId: v.configId,
      name: v.rawName || `Configuration #${idx + 1}`,
      chassis: chassisName,
      solutionType,
      vendor,
      family,
      gen,
      notebookId,
      itemCount: v.items.length,
      items: ctoNorm.items,
      profile: profile,
      baseChassisSku: ctoNorm.baseChassisSku,
      baseChassisQty: ctoNorm.baseChassisQty,
      isMultipliedOrder: ctoNorm.isMultipliedOrder,
      hasNonIntegerDivisor: ctoNorm.hasNonIntegerDivisor,
      ctoAnomalies: ctoNorm.ctoAnomalies,
      splitReasons: [],
      businessRationale: '',
      confidenceScore: ctoNorm.hasNonIntegerDivisor ? 0.70 : 0.95
    };

    const improbabilityMetrics = calculateImprobabilityMetrics(tempVar, loadedRules.subcategoryConstraints || []);
    tempVar.improbabilityMetrics = improbabilityMetrics;

    return tempVar;
  });

  // Assign split reasons if multiple variations exist
  if (processedVariations.length > 1) {
    const v1 = processedVariations[0];
    for (let i = 1; i < processedVariations.length; i++) {
      const vCurr = processedVariations[i];
      const reasons = [];

      if (v1.profile.cpus !== vCurr.profile.cpus || v1.profile.maxTdpWatts !== vCurr.profile.maxTdpWatts) {
        reasons.push({ ...SPLIT_REASONS.COMPUTE_VARIATION, detectedDifferences: `Config 1: ${v1.profile.cpus} (${v1.profile.maxTdpWatts}W) vs Config ${i + 1}: ${vCurr.profile.cpus} (${vCurr.profile.maxTdpWatts}W)` });
      }

      if (v1.profile.totalRamGb !== vCurr.profile.totalRamGb || v1.profile.dimmCount !== vCurr.profile.dimmCount) {
        reasons.push({ ...SPLIT_REASONS.MEMORY_DENSITY_VARIATION, detectedDifferences: `Config 1: ${v1.profile.totalRamGb}GB (${v1.profile.dimmCount} DIMMs) vs Config ${i + 1}: ${vCurr.profile.totalRamGb}GB (${vCurr.profile.dimmCount} DIMMs)` });
      }

      if (v1.profile.driveCount !== vCurr.profile.driveCount || v1.profile.driveMedia !== vCurr.profile.driveMedia) {
        reasons.push({ ...SPLIT_REASONS.STORAGE_VARIATION, detectedDifferences: `Config 1: ${v1.profile.driveCount}x ${v1.profile.driveMedia} vs Config ${i + 1}: ${vCurr.profile.driveCount}x ${vCurr.profile.driveMedia}` });
      }

      if (v1.profile.psuType !== vCurr.profile.psuType) {
        reasons.push({ ...SPLIT_REASONS.POWER_ELECTRICAL_VARIATION, detectedDifferences: `Config 1: ${v1.profile.psuType} vs Config ${i + 1}: ${vCurr.profile.psuType}` });
      }

      if (reasons.length === 0) {
        reasons.push({ ...SPLIT_REASONS.WORKLOAD_NODE_PURPOSE, detectedDifferences: `Node role split by customer sheet: ${vCurr.name}` });
      }

      vCurr.splitReasons = reasons;
      vCurr.businessRationale = `Split due to ${reasons.map(r => r.label).join(', ')}.`;
    }
    processedVariations[0].splitReasons = [{ code: 'PRIMARY_BASELINE', label: 'Primary Baseline Configuration', description: 'Initial baseline node configuration in quote.' }];
    processedVariations[0].businessRationale = 'Baseline primary node.';
  }

  // Preflight Cleansing Pipeline 5-Stage Gate Validation
  const totalRawItems = rawVariations.reduce((acc, v) => acc + (v.items?.length || 0), 0);
  const totalProcessedItems = processedVariations.reduce((acc, v) => acc + (v.items?.length || 0), 0);
  const baseChassisDetected = processedVariations.some(v => v.baseChassisSku !== null);
  const hasNonIntegerFraction = processedVariations.some(v => v.hasNonIntegerDivisor);
  const anyHighlyAnomalous = processedVariations.some(v => v.improbabilityMetrics?.isHighlyAnomalous);

  const preflightPipeline = {
    totalStages: 5,
    stagesCleared: 5,
    isCleansingValid: !hasNonIntegerFraction,
    hasNonInteger: hasNonIntegerFraction,
    totalAnomaliesCount: processedVariations.reduce((acc, v) => acc + (v.ctoAnomalies?.length || 0), 0),
    isHitlRequired: hasNonIntegerFraction || anyHighlyAnomalous,
    cleansingStatus: hasNonIntegerFraction ? 'FRACTIONAL_ANOMALY_DETECTED' : 'CLEAN_INTEGER_DIVISORS',
    stages: [
      { id: 1, name: 'File Intake & Header Offset Cleansing', status: 'PASS', detail: `Processed ${globalLineCount} line(s) from ${auditTrail.rawInputSummary.source}` },
      { id: 2, name: 'HPE SKU & Line Normalization', status: totalProcessedItems > 0 ? 'PASS' : 'WARN', detail: `Extracted ${totalProcessedItems} clean SKU item(s) from raw input` },
      { id: 3, name: '1-Unit CTO Multiplier Normalization', status: hasNonIntegerFraction ? 'WARN' : 'PASS', detail: baseChassisDetected ? `Chassis multiplier: ${processedVariations[0]?.baseChassisQty}x (${processedVariations[0]?.baseChassisSku})` : 'Standalone / 1x unit order' },
      { id: 4, name: 'Multi-Configuration Clustering', status: 'PASS', detail: `Grouped into ${processedVariations.length} configuration variation(s)` },
      { id: 5, name: 'Preflight Improbability & Math Audit', status: anyHighlyAnomalous ? 'WARN' : 'PASS', detail: anyHighlyAnomalous ? 'High anomaly index flagged for review' : 'Hardware bounds & probability verified' }
    ]
  };

  const diffMatrix = buildConfigDiffMatrix(processedVariations);

  let overallConfidence = 0.98;
  const confidenceReasons = [];

  if (processedVariations.length > 1) {
    overallConfidence = 0.92;
    confidenceReasons.push(`Automated multi-config clustering generated ${processedVariations.length} configurations.`);
  }

  if (hasNonIntegerFraction) {
    overallConfidence = 0.70;
    confidenceReasons.push('CTO fractional non-integer quantity divisor anomaly detected.');
  }

  if (anyHighlyAnomalous) {
    overallConfidence = Math.min(overallConfidence, 0.65);
    confidenceReasons.push('High Improbability Index detected in configuration profile.');
  }

  return {
    rawSummary: auditTrail.rawInputSummary,
    auditTrail: auditTrail.steps,
    totalVariations: processedVariations.length,
    variations: processedVariations,
    configVariations: processedVariations,
    diffMatrix,
    overallConfidence,
    isHitlRequired: preflightPipeline.isHitlRequired,
    requiresHumanReview: preflightPipeline.isHitlRequired || (overallConfidence < 0.75),
    confidenceReasons,
    preflightPipeline,
    activeConfigId: processedVariations[0]?.configId || 'config_1'
  };
}

module.exports = {
  SPLIT_REASONS,
  preprocessAndGroupBOQ,
  buildConfigDiffMatrix,
  savePreprocessingRuleFeedback,
  extractHardwareProfile,
  detectAndNormalizeAtomicCto,
  calculateImprobabilityMetrics,
  isCtoBaseChassis,
  KNOWN_CTO_SKU_PREFIXES
};
