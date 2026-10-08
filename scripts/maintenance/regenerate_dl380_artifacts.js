'use strict';
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { generateMainSheet } = require('../lib/catalog/catalog_formatter.js');
const { generateNotebookSyncPayload } = require('../lib/sync/sync_payload_builder.js');
const { refreshMasterCatalogCsv } = require('../lib/sync/nlm_sync_client.js');
const { buildKnowledgeWorkbookDatasets } = require('../lib/sync/google_sheets_writer.js');
const { projectWorkbookToMarkdown } = require('../lib/sync/semantic_workbook_projection.js');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const dl380Dir = path.join(PROJECT_ROOT, 'outputs', 'ProLiant', 'Gen12', 'DL380_Gen12');
const cat = JSON.parse(fs.readFileSync(path.join(dl380Dir, 'DL380_Gen12_Catalog.json'), 'utf8'));

// Format tabular files
const mainTsv = generateMainSheet(cat.entries, 'DL380 Gen12');
const scrapsDir = path.join(dl380Dir, 'intermittent_scraps');
if (!fs.existsSync(scrapsDir)) fs.mkdirSync(scrapsDir, { recursive: true });
fs.writeFileSync(path.join(scrapsDir, 'DL380_Gen12_Catalog_SKUs.tsv'), mainTsv, 'utf8');

const csvLines = mainTsv.split('\n').map(line => {
  const cols = line.split('\t');
  return cols.map(c => `"${c.replace(/"/g, '""')}"`).join(',');
});
fs.writeFileSync(path.join(dl380Dir, 'DL380_Gen12_Master_Catalog.csv'), csvLines.join('\n'), 'utf8');

// Regenerate Master Excel
const xlsxPath = path.join(dl380Dir, 'DL380_Gen12_OCA_Catalog.xlsx');
execSync(`node "${path.join(PROJECT_ROOT, 'scripts', 'catalogs', 'generate_xlsx.js')}" "${xlsxPath}"`, { stdio: 'inherit', cwd: PROJECT_ROOT });

// Regenerate NotebookLM payload
const payloadRes = generateNotebookSyncPayload('DL380_Gen12', false);
const payloadPath = payloadRes.payloadPath;
const csv = refreshMasterCatalogCsv(payloadPath, 'DL380_Gen12');
const datasets = buildKnowledgeWorkbookDatasets(csv, payloadPath, { chassisName: 'DL380_Gen12' });
const legacyFingerprint = datasets.fingerprints.combined;
const baseText = fs.readFileSync(payloadPath, 'utf8').split('\n<!-- MANAGED_FULL_CATALOG -->')[0];
const projection = projectWorkbookToMarkdown(datasets.workbookTabs);
fs.writeFileSync(payloadPath, `${baseText}\n<!-- MANAGED_FULL_CATALOG -->\nContent fingerprint: ${legacyFingerprint}\n\n${projection.markdown}\n`, 'utf8');

console.log('✅ Regenerated DL380_Gen12 tabular, Excel, and NotebookLM sync payload.');
