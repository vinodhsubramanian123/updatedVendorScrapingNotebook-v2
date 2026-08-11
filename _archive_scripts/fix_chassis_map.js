const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'scripts', 'config', 'chassis_map.json');
let data = JSON.parse(fs.readFileSync(p, 'utf-8'));

const updates = {
  "P73282-B21": { model: "DL380 Gen12 8SFF", formFactor: "8SFF", listPrice: 5584.00, desc: "HPE ProLiant Compute DL380 Gen12 8SFF NC CTO Server" },
  "P73283-B21": { model: "DL380 Gen12 24SFF", formFactor: "24SFF", listPrice: 5980.00, desc: "HPE ProLiant Compute DL380 Gen12 24SFF NC CTO Server" }, // Swapped description
  "P73284-B21": { model: "DL380 Gen12 12LFF", formFactor: "12LFF", listPrice: 6350.00, desc: "HPE ProLiant Compute DL380 Gen12 12LFF NC CTO Server" },
  "P73285-B21": { model: "DL380 Gen12 8LFF", formFactor: "8LFF", listPrice: 6890.00, desc: "HPE ProLiant Compute DL380 Gen12 8LFF NC CTO Server" }, // Swapped description
  "P73286-B21": { model: "DL380 Gen12 16EDSFF", formFactor: "16EDSFF", listPrice: 7120.00, desc: "HPE ProLiant Compute DL380 Gen12 16EDSFF NC CTO Server" },
  "P73287-B21": { model: "DL380 Gen12 High Power / Telco", formFactor: "High Power", listPrice: 7450.00, desc: "HPE ProLiant Compute DL380 Gen12 High Power / Telco CTO Server" }
};

for (const sku in updates) {
  if (data.chassis_base_skus_by_family_gen["ProLiant_Gen12"].skus[sku]) {
    data.chassis_base_skus_by_family_gen["ProLiant_Gen12"].skus[sku].listPrice = updates[sku].listPrice;
    data.chassis_base_skus_by_family_gen["ProLiant_Gen12"].skus[sku].model = updates[sku].model;
    data.chassis_base_skus_by_family_gen["ProLiant_Gen12"].skus[sku].formFactor = updates[sku].formFactor;
    data.chassis_base_skus_by_family_gen["ProLiant_Gen12"].skus[sku].description = updates[sku].desc;
  }
  if (data.chassis_base_skus[sku]) {
    data.chassis_base_skus[sku].listPrice = updates[sku].listPrice;
    data.chassis_base_skus[sku].model = updates[sku].model;
    data.chassis_base_skus[sku].formFactor = updates[sku].formFactor;
    data.chassis_base_skus[sku].description = updates[sku].desc;
  }
}

fs.writeFileSync(p, JSON.stringify(data, null, 2));
console.log("Updated chassis_map.json");
