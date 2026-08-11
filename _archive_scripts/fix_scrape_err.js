const fs = require('fs');
const file = 'dashboard/src/components/VendorBomVerificationModal.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "const data = await res.json();\n      alert(`Fresh CDP catalog scrape initiated for ${selectedChassis}. Watch logs in Dashboard timeline.`);",
  `const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to trigger scrape');
      alert(\`Fresh CDP catalog scrape initiated for \${selectedChassis}. Watch logs in Dashboard timeline. Task ID: \${data.taskId}\`);`
);

fs.writeFileSync(file, content);
