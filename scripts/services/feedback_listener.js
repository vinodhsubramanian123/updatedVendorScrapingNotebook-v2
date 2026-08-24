'use strict';
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Watch outputs/history directory for catalog_deltas.json
const historyDir = path.join(__dirname, '../outputs/history');

if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir, { recursive: true });
}

console.log(`[Feedback Listener] Watching ${historyDir} for catalog_deltas.json changes...`);

let isProcessing = false;

fs.watch(historyDir, (eventType, filename) => {
  if (filename === 'catalog_deltas.json') {
    if (isProcessing) return;
    isProcessing = true;
    
    console.log(`\n[Feedback Listener] Detected change in ${filename}. Initiating Closed-Loop Knowledge Sync...`);
    
    setTimeout(() => {
      try {
        console.log('[Feedback Listener] Running build_catalog.js...');
        execSync('node scripts/rebuild_all.js', { stdio: 'inherit' });

        console.log('[Feedback Listener] Running regenerate_rules.js...');
        execSync('node scripts/regenerate_rules.js', { stdio: 'inherit' });

        console.log('[Feedback Listener] Running regression suite...');
        execSync('node scripts/regression_suite.js', { stdio: 'inherit' });

        console.log('[Feedback Listener] Closed-Loop Knowledge Sync completed successfully.');
      } catch (err) {
        console.error('[Feedback Listener] Error during Closed-Loop Knowledge Sync:', err.message);
      } finally {
        isProcessing = false;
      }
    }, 1000); // Debounce
  }
});
