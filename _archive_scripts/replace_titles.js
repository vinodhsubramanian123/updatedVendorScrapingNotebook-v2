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

function addTooltipImport(content) {
  if (content.includes("import Tooltip")) return content;
  
  const lastImportIndex = content.lastIndexOf('import ');
  if (lastImportIndex !== -1) {
    const nextNewline = content.indexOf('\n', lastImportIndex);
    return content.slice(0, nextNewline) + "\nimport Tooltip from './Tooltip';" + content.slice(nextNewline);
  }
  return "import Tooltip from './Tooltip';\n" + content;
}

// Just an automated replacement for single line elements or simple wrappers
// But let's just create a more robust regex that finds <[tag] ... title="[text]" ...> ... </[tag]>
// Since JSX can be multiline, this is best done with a careful regex.

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  content = content.replace(/<button([^>]*)title="([^"]+)"([^>]*)>([\s\S]*?)<\/button>/g, '<Tooltip content="$2"><button$1$3>$4</button></Tooltip>');
  content = content.replace(/<a([^>]*)title="([^"]+)"([^>]*)>([\s\S]*?)<\/a>/g, '<Tooltip content="$2"><a$1$3>$4</a></Tooltip>');
  content = content.replace(/<span([^>]*)title="([^"]+)"([^>]*)>([\s\S]*?)<\/span>/g, '<Tooltip content="$2"><span$1$3>$4</span></Tooltip>');
  content = content.replace(/<div([^>]*)title="([^"]+)"([^>]*)>([\s\S]*?)<\/div>/g, '<Tooltip content="$2"><div$1$3>$4</div></Tooltip>');

  if (content !== original) {
    content = addTooltipImport(content);
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
