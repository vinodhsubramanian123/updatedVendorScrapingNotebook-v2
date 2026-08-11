const fs = require('fs');
let c = fs.readFileSync('dashboard/src/components/ScraperTriggerCard.jsx', 'utf8');

c = c.replace(/<button([^>]+onClick=\{exportLogs\}[^>]+)>\s*<Download className="w-3\.5 h-3\.5" \/>\s*<\/button>/g, '<Tooltip content="Export logs to file"><button$1><Download className="w-3.5 h-3.5" /></button></Tooltip>');

fs.writeFileSync('dashboard/src/components/ScraperTriggerCard.jsx', c);
