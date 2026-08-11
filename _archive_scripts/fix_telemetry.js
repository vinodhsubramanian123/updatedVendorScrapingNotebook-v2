const fs = require('fs');

let content = fs.readFileSync('dashboard/src/components/TelemetryCard.jsx', 'utf8');

content = content.replace(/<Tooltip ([^>]+)><div className="bg-slate-50([^>]+)>\s*<div([^>]+)>\s*<([^\s]+) className="w-5 h-5" \/>\s*<\/div>\s*<div className="flex-1">\s*<div className="text-xs text-slate-500 font-medium">([^<]+)<\/div>\s*<div className="text-xl font-bold text-slate-800">([^<]+)<\/div>\s*<\/div>\s*<\/div>/g, '<Tooltip $1><div className="bg-slate-50$2>\n            <div$3>\n              <$4 className="w-5 h-5" />\n            </div>\n            <div className="flex-1">\n              <div className="text-xs text-slate-500 font-medium">$5</div>\n              <div className="text-xl font-bold text-slate-800">$6</div>\n            </div>\n          </div></Tooltip>');

fs.writeFileSync('dashboard/src/components/TelemetryCard.jsx', content, 'utf8');
