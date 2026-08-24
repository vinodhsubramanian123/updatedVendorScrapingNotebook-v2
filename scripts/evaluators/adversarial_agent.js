'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('../lib/index.js');
const { evaluateBOQMultiAspect } = lib.boq.evaluator;
const { loadTelemetry } = lib.system.telemetry;
const { safeWriteJsonAtomic } = lib.system.fsCompat;
const { listAllCatalogs } = lib.catalog.discovery;
const geminiRotator = lib.system.geminiRotator;

const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TELEMETRY_FILE = path.join(PROJECT_ROOT, 'outputs', 'history', 'pipeline_telemetry.json');

const MODEL_NAME = process.env.GEMINI_MODEL_NAME || 'gemini-3.6-flash';

async function generateAdversarialBOQ(targetChassis = 'DL380_Gen12_SFF') {
  const prompt = `You are an Adversarial BOQ Generator for HPE enterprise server hardware.
Target chassis model: ${targetChassis}.
Generate a JSON array of BOQ items representing a highly complex, subtly incorrect server configuration designed to stress-test physical constraint checkers.
Examples of subtle hardware flaws:
- Insert Gen11 DDR4 memory or incompatible DDR5 speeds into a Gen12 chassis.
- Include a >240W high-TDP processor without the mandatory High-Performance Fan Kit.
- Configure -48VDC power supplies without the required DC Terminal Lug Kit.
- Include Tri-Mode RAID controllers (e.g. MR416i) without the mandatory Smart Storage Battery or write-back cache protection.
- Configure unbalanced memory channel topologies (e.g. 9 or 13 DIMMs across 2 sockets).
Return ONLY valid JSON. No markdown formatting or backticks.

Format each item exactly like this:
[
  { "sku": "P52559-B21", "qty": 1, "description": "HPE ProLiant DL380 Gen12 8SFF NC CTO Server" },
  { "sku": "P49610-B21", "qty": 2, "description": "Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor" }
]`;

  try {
    const text = await geminiRotator.executeWithSmartRotation(async ({ ai }) => {
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: prompt
      });
      return response.text ? response.text.trim() : '';
    }, { model: MODEL_NAME });

    let cleanedText = text;
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\n?/, '').replace(/```\n?$/, '');
    }
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error("Adversarial agent generation failed:", err.message);
    // Fallback adversarial BOQ for DL380 Gen12
    return [
      { sku: "P52559-B21", qty: 1, description: "HPE ProLiant DL380 Gen12 8SFF NC CTO Server" },
      { sku: "P49610-B21", qty: 2, description: "Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor" },
      { sku: "P43322-B21", qty: 8, description: "HPE 16GB (1x16GB) Single Rank x8 DDR4-3200 CAS-22-22-22 Registered Smart Memory Kit" }
    ];
  }
}

function updateAdversarialTelemetry(isCaught, targetChassis, issuesCount) {
  const data = loadTelemetry();
  if (!data.adversarial) {
    data.adversarial = {
      totalRuns: 0,
      caughtRuns: 0,
      catchRate: 100,
      injectedAnomaliesCaught: 0,
      recentTargetChassis: []
    };
  }

  data.adversarial.totalRuns++;
  if (isCaught) {
    data.adversarial.caughtRuns++;
    data.adversarial.injectedAnomaliesCaught = (data.adversarial.injectedAnomaliesCaught || 0) + issuesCount;
  }
  
  data.adversarial.catchRate = parseFloat(((data.adversarial.caughtRuns / data.adversarial.totalRuns) * 100).toFixed(1));
  data.adversarial.lastRunTimestamp = new Date().toISOString();
  data.adversarial.lastTargetChassis = targetChassis;
  
  if (!data.adversarial.recentTargetChassis) data.adversarial.recentTargetChassis = [];
  data.adversarial.recentTargetChassis.unshift({
    timestamp: new Date().toISOString(),
    chassis: targetChassis,
    caught: isCaught,
    issuesCaught: issuesCount
  });
  if (data.adversarial.recentTargetChassis.length > 20) data.adversarial.recentTargetChassis.pop();

  safeWriteJsonAtomic(TELEMETRY_FILE, data);
  console.log(`Adversarial Run Complete for [${targetChassis}]. Anomaly Catch Rate (Recall): ${data.adversarial.catchRate}% (${data.adversarial.caughtRuns}/${data.adversarial.totalRuns})`);
}

async function runAdversarialAgent(targetChassis = null) {
  const catalogs = listAllCatalogs();
  const chassisList = catalogs.map(c => c.id);
  const selectedChassis = targetChassis || (chassisList.length > 0 ? chassisList[Math.floor(Math.random() * chassisList.length)] : 'DL380_Gen12_SFF');

  console.log(`😈 Adversarial Agent: Generating subtly incorrect BOQ for [${selectedChassis}]...`);
  const fakeBoq = await generateAdversarialBOQ(selectedChassis);
  
  console.log(`😈 Adversarial Agent: Sending hallucinated BOQ (${fakeBoq.length} items) to evaluator...`);
  const evalResult = evaluateBOQMultiAspect(fakeBoq, { chassis: selectedChassis });
  
  const errors = evalResult.errors || [];
  const missing = evalResult.missingDependencies || [];
  const totalIssuesCaught = errors.length + missing.length;
  
  const isCaught = totalIssuesCaught > 0;
  if (isCaught) {
    console.log(`✅ Evaluator successfully caught ${totalIssuesCaught} issue(s): ${[...errors, ...missing.map(m => m.reason || m.sku)].join(', ')}`);
  } else {
    console.warn(`⚠️ Evaluator did not flag any violations on the adversarial configuration.`);
  }

  updateAdversarialTelemetry(isCaught, selectedChassis, totalIssuesCaught);
}

async function main() {
  const args = process.argv.slice(2);
  const isLoop = args.includes('--loop');
  const intervalIdx = args.indexOf('--interval');
  const intervalSec = intervalIdx !== -1 && args[intervalIdx + 1] ? parseInt(args[intervalIdx + 1], 10) : 60;
  const iterIdx = args.indexOf('--iterations');
  const maxIterations = iterIdx !== -1 && args[iterIdx + 1] ? parseInt(args[iterIdx + 1], 10) : (isLoop ? Infinity : 1);
  const chIdx = args.indexOf('--chassis');
  const explicitChassis = chIdx !== -1 && args[chIdx + 1] ? args[chIdx + 1] : null;

  let currentIter = 0;
  while (currentIter < maxIterations) {
    currentIter++;
    console.log(`\n================================================================`);
    console.log(`😈 ADVERSARIAL RED-TEAM ITERATION ${currentIter}${maxIterations !== Infinity ? `/${maxIterations}` : ''}`);
    console.log(`================================================================`);
    await runAdversarialAgent(explicitChassis);

    if (currentIter < maxIterations) {
      console.log(`⏱️ Next adversarial pass in ${intervalSec}s... (Ctrl+C to stop)`);
      await new Promise(resolve => setTimeout(resolve, intervalSec * 1000));
    }
  }
}

main().catch(err => {
  console.error("Adversarial agent error:", err);
  process.exit(1);
});

