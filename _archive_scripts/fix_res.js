const fs = require('fs');

let content = fs.readFileSync('dashboard/src/components/ResolutionMatrix.jsx', 'utf8');
content = content.replace(/<button([^>]+)title="Copy formatted SKU list for offline submission into HPE Partner Portal"([^>]*)>([\s\S]*?)<\/button>/g, '<Tooltip content="Copy formatted SKU list for offline submission into HPE Partner Portal"><button$1$2>$3</button></Tooltip>');
fs.writeFileSync('dashboard/src/components/ResolutionMatrix.jsx', content);

content = fs.readFileSync('dashboard/src/components/ScraperTriggerCard.jsx', 'utf8');
content = content.replace(/<button([^>]+)title="Export logs to file"([^>]*)>([\s\S]*?)<\/button>/g, '<Tooltip content="Export logs to file"><button$1$2>$3</button></Tooltip>');
fs.writeFileSync('dashboard/src/components/ScraperTriggerCard.jsx', content);
