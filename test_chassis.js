const fs = require('fs');
const path = require('path');
const OUTPUTS_ROOT = path.join(__dirname, 'outputs');
function getCatalogPaths(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        if (fs.existsSync(path.join(filePath, `${file}_Catalog.json`))) {
          results.push(filePath);
        } else {
          results = results.concat(getCatalogPaths(filePath));
        }
      }
    });
    return results;
}
const catalogPaths = getCatalogPaths(OUTPUTS_ROOT);
const chassisName = "DL380_Gen12_SFF"; // or "DL380 Gen12 SFF"
const normChassis = chassisName.toLowerCase().replace(/[^a-z0-9]/g, '');
const filteredCatalogPaths = catalogPaths.filter(cDir => {
    const folderName = path.basename(cDir);
    const normFolder = folderName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normChassis.includes(normFolder) || normFolder.includes(normChassis) || normChassis.includes(normFolder.replace('sff', ''));
});
console.log("normChassis:", normChassis);
console.log("Filtered:", filteredCatalogPaths.map(p => path.basename(p)));
