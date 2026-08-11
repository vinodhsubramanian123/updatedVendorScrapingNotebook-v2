const fs = require('fs');
let c = fs.readFileSync('dashboard/src/components/Header.jsx', 'utf8');

c = c.replace(/<button([^>]+onClick=\{\(\) => \{\s*setSearchQuery\(''\);\s*setIsSearchOpen\(false\);\s*\}\}[^>]+)>\s*<X className="w-3\.5 h-3\.5" \/>\s*<\/button>/g, '<Tooltip content="Clear search"><button$1><X className="w-3.5 h-3.5" /></button></Tooltip>');

c = c.replace(/<button([^>]+onClick=\{\(\) => setIsComplexModalOpen\(true\)\}[^>]+)>\s*<Maximize2 className="w-3\.5 h-3\.5" \/>\s*<\/button>/g, '<Tooltip content="Expand for Complex Multi-sentence / Natural Language Query Workspace"><button$1><Maximize2 className="w-3.5 h-3.5" /></button></Tooltip>');

c = c.replace(/<button([^>]+onClick=\{\(\) => setIsSearchOpen\(false\)\}[^>]+)>\s*<X className="w-4 h-4" \/>\s*<\/button>/g, '<Tooltip content="Close search popover (Esc)"><button$1><X className="w-4 h-4" /></button></Tooltip>');

fs.writeFileSync('dashboard/src/components/Header.jsx', c);
