const fs = require('fs');
let content = fs.readFileSync('dashboard/src/components/TelemetryCard.jsx', 'utf8');

content = content.replace(/<\/div>\s*<Tooltip/g, '</div>\n          </Tooltip>\n          <Tooltip');
content = content.replace(/s' : '—'\}\n              <\/p>\n            <\/div>\n          <\/div>\n        <\/div>\n\n        \{\/\* Trend Chart \*\/\}/, "s' : '—'}\n              </p>\n            </div>\n          </div>\n          </Tooltip>\n        </div>\n\n        {/* Trend Chart */}");

fs.writeFileSync('dashboard/src/components/TelemetryCard.jsx', content, 'utf8');
