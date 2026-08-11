const fs = require('fs');

const files = [
  'dashboard/src/components/WorkflowStepper.jsx',
  'dashboard/src/components/ChassisSyncSummaryView.jsx',
  'dashboard/src/components/ScrapingHistorySection.jsx'
];

for (let file of files) {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace("import Tooltip from './Tooltip';\nimport {\nimport Tooltip from './Tooltip';", "import Tooltip from './Tooltip';\nimport {");
  content = content.replace("import Tooltip from './Tooltip';\nimport {\n  import Tooltip from './Tooltip';", "import Tooltip from './Tooltip';\nimport {");
  // Also:
  content = content.replace(/import\s*\{\s*import Tooltip from '\.\/Tooltip';/g, "import {");
  fs.writeFileSync(file, content, 'utf8');
}
