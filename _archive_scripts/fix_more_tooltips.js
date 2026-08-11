const fs = require('fs');

function processFile(file, replacements) {
  let content = fs.readFileSync(file, 'utf8');
  for (let [search, replace] of replacements) {
    content = content.replace(search, replace);
  }
  if (!content.includes("import Tooltip from './Tooltip';")) {
     content = "import Tooltip from './Tooltip';\n" + content;
  }
  fs.writeFileSync(file, content, 'utf8');
}

processFile('dashboard/src/components/NotebookLmHealthBadge.jsx', [
  [
    /<div\s+className=\{`\$\{baseClasses\} \$\{config\.bg\} \$\{config\.text\} \$\{config\.border\} \$\{className\}`\}\s+title=\{tooltipText\}\s*>/g,
    '<Tooltip content={tooltipText}><div className={`\${baseClasses} \${config.bg} \${config.text} \${config.border} \${className}`}>\n'
  ],
  [
    /<\/div>\n\s*\);\n\}/g,
    '</div></Tooltip>\n  );\n}'
  ]
]);

processFile('dashboard/src/components/TaskStatusBadge.jsx', [
  [
    /<div\s+className=\{`\$\{baseClasses\} \$\{currentConfig\.bg\} \$\{currentConfig\.text\} \$\{currentConfig\.border\} \$\{className\}`\}\s+title=\{`Task Lifecycle State: \$\{currentConfig\.label\}`\}\s*>/g,
    '<Tooltip content={`Task Lifecycle State: \${currentConfig.label}`}><div className={`\${baseClasses} \${currentConfig.bg} \${currentConfig.text} \${currentConfig.border} \${className}`}>'
  ],
  [
    /<\/div>\n\s*\);\n\}/g,
    '</div></Tooltip>\n  );\n}'
  ]
]);

processFile('dashboard/src/components/ResolutionMatrix.jsx', [
  [
    /<button([^>]+)title=\{!evalResults \? 'Run a BOQ evaluation first to enable export' : ''\}([^>]*)>/g,
    '<Tooltip content={!evalResults ? \'Run a BOQ evaluation first to enable export\' : \'\'}><button$1$2>'
  ],
  [
    /<\/button>\n\s*<\/div>\n\s*<\/div>\n\s*<\/div>/,
    '</button></Tooltip>\n        </div>\n      </div>\n    </div>'
  ]
]);

processFile('dashboard/src/components/ScraperTriggerCard.jsx', [
  [
    /<button([^>]+)title=\{canScrape \? "Start Scraping" : "Click for connection instructions"\}([^>]*)>/g,
    '<Tooltip content={canScrape ? "Start Scraping" : "Click for connection instructions"}><button$1$2>'
  ],
  [
    /<\/button>\n\s*\{!canScrape/,
    '</button></Tooltip>\n              {!canScrape'
  ]
]);

processFile('dashboard/src/components/VendorScraperProgress.jsx', [
  [
    /<button([^>]+)title=\{showDetails \? 'Hide details' : 'Show details'\}([^>]*)>/g,
    '<Tooltip content={showDetails ? \'Hide details\' : \'Show details\'}><button$1$2>'
  ],
  [
    /<\/button>\n\s*<\/div>\n\s*\{showDetails/,
    '</button></Tooltip>\n            </div>\n\n            {showDetails'
  ]
]);

