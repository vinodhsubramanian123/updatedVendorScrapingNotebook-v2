const fs = require('fs');

const files = [
  'dashboard/src/components/ArtifactInspector.jsx',
  'dashboard/src/components/VendorScraperProgress.jsx',
  'dashboard/src/components/Header.jsx',
  'dashboard/src/components/WorkflowStepper.jsx',
  'dashboard/src/components/CatalogExplorer.jsx',
  'dashboard/src/components/ResolutionMatrix.jsx',
  'dashboard/src/components/ScraperTriggerCard.jsx',
  'dashboard/src/components/ChassisSyncSummaryView.jsx',
  'dashboard/src/components/ScrapingHistorySection.jsx',
  'dashboard/src/components/VendorBomVerificationModal.jsx',
  'dashboard/src/components/TelemetryCard.jsx',
  'dashboard/src/components/SettingsDrawer.jsx',
  'dashboard/src/components/RulesConfiguration.jsx'
];

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  content = content.replace(/import\s+Tooltip\s+from\s+'\.\/Tooltip';/g, '');
  content = "import Tooltip from './Tooltip';\n" + content;
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
  }
}
