const fs = require('fs');

let content = fs.readFileSync('dashboard/src/components/CatalogExplorer.jsx', 'utf8');

content = content.replace(/<button([^>]+)title="Filter to only show SKUs with price or attribute changes"([^>]*)>([\s\S]*?)<\/button>/g, '<AppTooltip content="Filter to only show SKUs with price or attribute changes"><button$1$2>$3</button></AppTooltip>');
content = content.replace(/<button([^>]+)title="Audit SKU Version History & SHA-256 Hashes"([^>]*)>([\s\S]*?)<\/button>/g, '<AppTooltip content="Audit SKU Version History & SHA-256 Hashes"><button$1$2>$3</button></AppTooltip>');
content = content.replace(/<button([^>]+)title="View Real Price History Trail"([^>]*)>([\s\S]*?)<\/button>/g, '<AppTooltip content="View Real Price History Trail"><button$1$2>$3</button></AppTooltip>');

fs.writeFileSync('dashboard/src/components/CatalogExplorer.jsx', content);
