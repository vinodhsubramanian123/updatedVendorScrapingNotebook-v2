const fs = require('fs');
let content = fs.readFileSync('dashboard/src/components/TelemetryCard.jsx', 'utf8');

content = content.replace(/<Tooltip ([^>]+)><div/g, '<div');
content = content.replace(/<\/div>\n\s*<\/Tooltip>/g, '</div>');
content = content.replace(/<\/div>\s*<\/Tooltip>\s*<\/div>\s*\{\/\* Trend Chart \*\/\}/, '</div>\n        </div>\n\n        {/* Trend Chart */}');

fs.writeFileSync('dashboard/src/components/TelemetryCard.jsx', content, 'utf8');
