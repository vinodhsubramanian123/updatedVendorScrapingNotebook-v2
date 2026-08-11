const fs = require('fs');
let c = fs.readFileSync('dashboard/src/components/ResolutionMatrix.jsx', 'utf8');

c = c.replace(/<button([^>]+onClick=\{\(\) => handleCopyBomText\(tier\)\}[^>]+)>\s*\{copyStatus\[tier\.rank\] \? \(\s*<>\s*<CheckCircle className="w-3 h-3 text-emerald-600" \/>\s*<span>Copied to Clipboard!<\/span>\s*<\/>\s*\) : \(\s*<>\s*<Copy className="w-3 h-3" \/>\s*<span>Copy BOM<\/span>\s*<\/>\s*\)\}\s*<\/button>/g, '<Tooltip content="Copy formatted SKU list for offline submission into HPE Partner Portal"><button$1>\n                        {copyStatus[tier.rank] ? (\n                          <>\n                            <CheckCircle className="w-3 h-3 text-emerald-600" />\n                            <span>Copied to Clipboard!</span>\n                          </>\n                        ) : (\n                          <>\n                            <Copy className="w-3 h-3" />\n                            <span>Copy BOM</span>\n                          </>\n                        )}\n                      </button></Tooltip>');

fs.writeFileSync('dashboard/src/components/ResolutionMatrix.jsx', c);
