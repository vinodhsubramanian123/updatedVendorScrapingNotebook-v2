const fs = require('fs');
let c = fs.readFileSync('dashboard/src/components/CatalogExplorer.jsx', 'utf8');

c = c.replace(/<button([^>]+onClick=\{\(\) => setShowOnlyChanges\(!showOnlyChanges\)\}[^>]+)>\s*<Filter className="w-4 h-4" \/>\s*Only Changed\s*<\/button>/g, '<AppTooltip content="Filter to only show SKUs with price or attribute changes"><button$1><Filter className="w-4 h-4" /> Only Changed</button></AppTooltip>');

c = c.replace(/<button([^>]+onClick=\{\(\) => handleAuditHistory\(sku\)\}[^>]+)>\s*<History className="w-3\.5 h-3\.5" \/>\s*<\/button>/g, '<AppTooltip content="Audit SKU Version History & SHA-256 Hashes"><button$1><History className="w-3.5 h-3.5" /></button></AppTooltip>');

c = c.replace(/<button([^>]+onClick=\{\(\) => handleViewPriceTrail\(sku\)\}[^>]+)>\s*<TrendingDown className="w-3\.5 h-3\.5" \/>\s*<\/button>/g, '<AppTooltip content="View Real Price History Trail"><button$1><TrendingDown className="w-3.5 h-3.5" /></button></AppTooltip>');

fs.writeFileSync('dashboard/src/components/CatalogExplorer.jsx', c);
