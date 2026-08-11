'use strict';
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const FIXTURES_DIR = path.join(__dirname, '../tests/fixtures');
const BOQ_FILES = [
  'test_boq_dl380_gen12.csv'
];

console.log('----------------------------------------------------');
console.log('🚀 Automated Regression Suite Started');
console.log('----------------------------------------------------');

let allPassed = true;

for (const file of BOQ_FILES) {
  const filePath = path.join(FIXTURES_DIR, file);
  console.log(`\nTesting ${file}...`);
  try {
    const output = execSync(`node scripts/eval_boq.js ${filePath} --chassis outputs/ProLiant/Gen12/DL380_Gen12_SFF --json`, { encoding: 'utf-8' });
    
    // Find the last line that starts with '{'
    const lines = output.trim().split('\n');
    let jsonStr = null;
    for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].startsWith('{')) {
            jsonStr = lines[i];
            break;
        }
    }
    
    if (!jsonStr) throw new Error("No JSON found in output.");

    const result = JSON.parse(jsonStr);
    
    if (result.status === 'ERROR') {
      console.error(`❌ [FAILED] ${file} - Execution Error: ${result.error}`);
      allPassed = false;
      continue;
    }
    
    const confidence = result.data.evalResults?.confidence?.score;
    console.log(`✅ [PASSED] ${file} - Confidence Score: ${confidence}`);
    
    // Check if score meets baseline
    if (confidence < 0.2) {
      console.warn(`⚠️ [WARNING] ${file} - Confidence score is very low (${confidence}). This may indicate a regression in rules.`);
    }
    
  } catch (err) {
    console.error(`❌ [FAILED] ${file} - Command failed: ${err.message}`);
    allPassed = false;
  }
}

console.log('\n----------------------------------------------------');
if (allPassed) {
  console.log('🎉 All regression tests passed.');
  process.exit(0);
} else {
  console.log('💥 Regression suite failed.');
  process.exit(1);
}
