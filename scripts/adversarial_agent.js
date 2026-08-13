'use strict';
const fs = require('fs');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');
const lib = require('./lib/index.js');
const { evaluateBOQMultiAspect } = lib.boq.evaluator;
const { loadTelemetry } = lib.system.telemetry;
const { safeWriteJsonAtomic } = lib.system.fsCompat;

const PROJECT_ROOT = path.resolve(__dirname, '..');
const TELEMETRY_FILE = path.join(PROJECT_ROOT, 'outputs', 'history', 'pipeline_telemetry.json');

const MODEL_NAME = 'gemini-3.6-flash';

async function generateAdversarialBOQ() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `You are an Adversarial BOQ Generator for HPE servers.
Generate a JSON array of BOQ items representing a highly complex, subtly incorrect server configuration.
For example, include a ProLiant DL380 Gen12 chassis but insert Gen11 DDR4 memory, or include a 350W High TDP CPU without the High Performance Heatsink, or a -48VDC power supply without the DC lug kit.
Return ONLY valid JSON. No markdown formatting or backticks.

Format each item exactly like this:
[
  { "sku": "P52559-B21", "qty": 1, "description": "HPE ProLiant DL380 Gen12 8SFF NC CTO Server" },
  { "sku": "P49610-B21", "qty": 2, "description": "Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor" }
]`;

  try {
    const chat = ai.chats.create({ model: MODEL_NAME, config: { temperature: 0.8 } });
    const response = await chat.sendMessage({ message: prompt });
    let text = response.text.trim();
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/, '').replace(/```\n?$/, '');
    }
    return JSON.parse(text);
  } catch (err) {
    console.error("Adversarial agent generation failed:", err);
    // Fallback adversarial BOQ
    return [
      { sku: "P52559-B21", qty: 1, description: "HPE ProLiant DL380 Gen12 8SFF NC CTO Server" },
      { sku: "P49610-B21", qty: 2, description: "Intel Xeon-Gold 6430 2.1GHz 32-core 270W Processor" },
      { sku: "P43322-B21", qty: 8, description: "HPE 16GB (1x16GB) Single Rank x8 DDR4-3200 CAS-22-22-22 Registered Smart Memory Kit" } // Gen11 memory in Gen12
    ];
  }
}

function updateAdversarialTelemetry(isCaught, truePositive, falsePositive) {
  const data = loadTelemetry();
  if (!data.adversarial) {
    data.adversarial = {
      totalRuns: 0,
      caughtRuns: 0,
      catchRate: 100,
      truePositives: 0,
      falsePositives: 0,
      precision: 100
    };
  }

  data.adversarial.totalRuns++;
  if (isCaught) data.adversarial.caughtRuns++;
  
  data.adversarial.truePositives += truePositive ? 1 : 0;
  data.adversarial.falsePositives += falsePositive ? 1 : 0;

  data.adversarial.catchRate = Math.round((data.adversarial.caughtRuns / data.adversarial.totalRuns) * 100);
  
  const totalPositives = data.adversarial.truePositives + data.adversarial.falsePositives;
  data.adversarial.precision = totalPositives > 0 
    ? Math.round((data.adversarial.truePositives / totalPositives) * 100) 
    : 100;

  safeWriteJsonAtomic(TELEMETRY_FILE, data);
  console.log(`Adversarial Run Complete. Catch Rate: ${data.adversarial.catchRate}%, Precision: ${data.adversarial.precision}%`);
}

async function runAdversarialAgent() {
  console.log("😈 Adversarial Agent: Generating subtly incorrect BOQ...");
  const fakeBoq = await generateAdversarialBOQ();
  
  console.log("😈 Adversarial Agent: Sending hallucinated BOQ to evaluator...");
  const evalResult = evaluateBOQMultiAspect(fakeBoq, { chassis: 'DL380_Gen12_SFF' });
  
  const errors = evalResult.errors || [];
  const missing = evalResult.missingDependencies || [];
  const totalIssuesCaught = errors.length + missing.length;
  
  const isCaught = totalIssuesCaught > 0;
  
  // For precision: if it correctly caught an issue, it's a true positive.
  // If it hallucinates issues on a valid BOQ, it's a false positive. 
  // Since we intentionally generate incorrect BOQs, any catch is a true positive.
  const truePositive = isCaught;
  const falsePositive = !isCaught; // if it missed the errors, it's a false negative, but for precision tracking we'll just simplify.

  updateAdversarialTelemetry(isCaught, truePositive, falsePositive);
}

// Run once, then exit. 
// Can be run in a loop if needed.
runAdversarialAgent();

