const fs = require('fs');
let content = fs.readFileSync('scripts/lib/conflict_graph.js', 'utf8');

const getMandatoryLine = 'const { getMandatorySkusForChassis } = require(\'./boq_evaluator\');';
if (!content.includes(getMandatoryLine)) {
  content = getMandatoryLine + '\n' + content;
}

const findText = `    if (fixSku === 'P48820-B21') { // High-Perf Fan Kit
      recordAudit('SKU', \`High-TDP Fan Fix \${fixSku}\`, 'PASS', \`Injected Fan Kit \${fixSku} has no physical conflicts with chassis/CPU.\`, fixSku);
      resolvedFixes.push({
        sku: fixSku,
        action: 'INJECTED_WITHOUT_CONFLICT',
        reasoning: \`High-Performance Fan Kit mandatory for CPU TDP >= 240W. Verified zero conflicts with base chassis.\`
      });
    } else if (fixSku === 'P36877-B21') { // DC Lug Kit`;

const replaceText = `    const mandatorySkus = getMandatorySkusForChassis(chassisInfo);
    if (fixSku === cleanBaseSKU(mandatorySkus.HIGH_PERF_FAN_KIT?.sku || 'P48820-B21') || fixSku === cleanBaseSKU(mandatorySkus.HIGH_PERF_HEATSINK?.sku || '')) {
      recordAudit('SKU', \`High-TDP Thermal Fix \${fixSku}\`, 'PASS', \`Injected Thermal Kit \${fixSku} has no physical conflicts with chassis/CPU.\`, fixSku);
      resolvedFixes.push({
        sku: fixSku,
        action: 'INJECTED_WITHOUT_CONFLICT',
        reasoning: \`High-Performance Thermal Kit mandatory for CPU TDP >= 240W. Verified zero conflicts with base chassis.\`
      });
    } else if (fixSku === cleanBaseSKU(mandatorySkus.DC_LUG_KIT?.sku || 'P36877-B21')) { // DC Lug Kit`;

content = content.replace(findText, replaceText);
fs.writeFileSync('scripts/lib/conflict_graph.js', content);
