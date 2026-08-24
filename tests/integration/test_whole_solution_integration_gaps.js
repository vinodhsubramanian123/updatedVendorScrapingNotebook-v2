'use strict';

const fs = require('fs');
const path = require('path');
const { evaluateBOQMultiAspect, formatNotebookQueryPayload } = require('../../scripts/lib/boq/boq_evaluator.js');
const { executeNotebookQuery } = require('../../scripts/lib/notebook/notebook_query_utils.js');

let totalPasses = 0;
let totalFails = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    totalPasses++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalFails++;
  }
}

async function runTests() {
  console.log(`================================================================`);
  console.log(`🚀 INTEGRATION GAPS & NUANCES TEST SUITE`);
  console.log(`================================================================\n`);

  try {
    // 1. Input / Output Variety
    console.log(`🔹 Test Group 1: Input / Output Variety`);
    const varietyInput = `
      // This is a comment that should be ignored
      skU, qTy, NoTes
      P52562-B21, 2, "HPE DL380 Gen11 8SFF NC CTO Server"
      p49610-b21 , 4 , "Intel Xeon-S 4410Y 2.0GHz 12-core"   
      P43322-B21, 8, HPE 16GB 1Rx8 PC5-4800B-R Smart Kit
      P48820-B21, 1, 
      "P40502-B21", "2", "HPE 480GB SATA MU SFF BC MV SSD" 
    `;
    
    // Write to a temporary file
    const tempCsvPath = path.join(__dirname, 'temp_variety.csv');
    fs.writeFileSync(tempCsvPath, varietyInput);
    
    const varietyEval = evaluateBOQMultiAspect(tempCsvPath);
    const skusFound = varietyEval.items.map(i => i.sku.toUpperCase());
    
    assert(skusFound.includes('P52562-B21'), 'Parsed standard SKU');
    assert(skusFound.includes('P49610-B21'), 'Parsed lowercase/padded SKU');
    assert(skusFound.includes('P43322-B21'), 'Parsed regular SKU');
    assert(skusFound.includes('P48820-B21'), 'Parsed SKU with missing notes');
    assert(skusFound.includes('P40502-B21'), 'Parsed SKU enclosed in quotes');
    assert(!skusFound.includes('SKU'), 'Header row excluded');
    assert(!skusFound.some(s => s.includes('COMMENT')), 'Comments ignored');
    
    if (fs.existsSync(tempCsvPath)) fs.unlinkSync(tempCsvPath);

    // 2. Whole-Configuration Grounding & Manifests
    console.log(`\n🔹 Test Group 2: Whole-Configuration Grounding & Manifests`);
    const multiNodeItems = [
      { sku: 'P73282-B21', quantity: 15, description: 'DL380 Gen12 CTO Server (10x DB + 5x App)' },
      { sku: 'P49610-B21', quantity: 30, description: 'Intel Xeon CPU' },
      { sku: 'P43322-B21', quantity: 240, description: 'HPE 16GB Memory' }
    ];
    const mockEvalResults = {
      conflictGraph: {
        chassisInfo: { model: 'HPE ProLiant DL380 Gen12' },
        conflicts: [{ message: 'Missing Power Supply' }]
      },
      errors: [],
      missingDependencies: [{ sku: 'P36877-B21' }],
      evalSummary: { maxCpuTdpWatts: 150, totalMemoryGb: 3840 }
    };
    
    const payload = formatNotebookQueryPayload(multiNodeItems, mockEvalResults);
    
    assert(payload.query.includes('BOM Manifest: P73282-B21 (x15), P49610-B21 (x30), P43322-B21 (x240)'), 'Manifest correctly strings multi-node quantities');
    assert(payload.query.includes('Missing Power Supply'), 'Query includes conflict messages');
    assert(payload.query.includes('Proposed Auxiliary Fixes: P36877-B21'), 'Query includes proposed auxiliary fixes');
    assert(payload.context.itemsCount === 3, 'Context has correct item count');
    assert(payload.context.memoryTotalGb === 3840, 'Context has correct total memory');
    
    // 3. Strategy Matrix Consistency
    console.log(`\n🔹 Test Group 3: Strategy Matrix Consistency`);
    
    const strategyEvalInput = `
P52562-B21, 1, "HPE DL380 Gen11 8SFF NC CTO Server"
P49610-B21, 2, "Intel Xeon-S 4410Y 2.0GHz 12-core"   
P43322-B21, 4, "HPE 16GB 1Rx8 PC5-4800B-R Smart Kit"
    `;
    const tempStrategyPath = path.join(__dirname, 'temp_strategy.csv');
    fs.writeFileSync(tempStrategyPath, strategyEvalInput);
    const strategyEval = evaluateBOQMultiAspect(tempStrategyPath);
    if (fs.existsSync(tempStrategyPath)) fs.unlinkSync(tempStrategyPath);
    
    const ranks = strategyEval.conflictGraph?.rankedSolutions || [];
    assert(Array.isArray(ranks) && ranks.length === 5, 'Strategy Matrix generates exactly 5 ranked solutions');
    
    // Check rank uniqueness
    const rankIds = ranks.map(r => r.rank);
    const uniqueRanks = new Set(rankIds);
    assert(uniqueRanks.size === 5, 'Ranks contain zero duplicate rank IDs');
    
    // Check CapEx consistency (Rank 4 >= Rank 3 >= Rank 2 >= Rank 1/5 etc)
    const costRank4 = ranks.find(r => r.rank === 4)?.estimatedCostUsd || 0;
    const costRank3 = ranks.find(r => r.rank === 3)?.estimatedCostUsd || 0;
    const costRank5 = ranks.find(r => r.rank === 5)?.estimatedCostUsd || 0;
    assert(costRank4 >= costRank3, 'Rank 4 (Maximum Density) cost is greater than or equal to Rank 3');
    assert(costRank4 >= costRank5, 'Rank 4 cost is greater than or equal to Rank 5 (Budget Minimized)');
    
    // Ensure all ranks include base SKUs and no unbuildable states
    const allHaveBase = ranks.every(r => (r.skuPartsList || []).some(part => part.sku === 'P52562-B21'));
    assert(allHaveBase, 'All ranks maintain foundational chassis SKUs (no unbuildable partial lists)');

    // 4. Offline vs Live Fallback Nuances
    console.log(`\n🔹 Test Group 4: Offline vs Live Fallback Nuances`);
    const oldPath = process.env.PATH;
    process.env.PATH = '/dev/null';
    
    const fallbackRes = await executeNotebookQuery('missing-creds-notebook', 'Validate memory limits for DL380 Gen12', {
      context: { chassis: 'HPE ProLiant DL380 Gen12' },
      bypassCache: true
    });
    
    process.env.PATH = oldPath;
    
    assert(fallbackRes && fallbackRes.source === 'LOCAL_RAG_FALLBACK', 'executeNotebookQuery gracefully fell back to LOCAL_RAG_FALLBACK');
    assert(fallbackRes.answer && fallbackRes.answer.length > 10, 'Fallback returned non-empty knowledge answer without crashing');
    assert(!fallbackRes.error, 'No uncaught exceptions bubbled up from execution failure');
    
  } catch (err) {
    console.error('Test suite failed:', err);
    totalFails++;
  }

  console.log(`\n================================================================`);
  console.log(`📊 FINAL TEST SUMMARY: ${totalPasses} PASSED | ${totalFails} FAILED`);
  console.log(`================================================================\n`);

  if (totalFails > 0) {
    process.exit(1);
  }
}

runTests();
