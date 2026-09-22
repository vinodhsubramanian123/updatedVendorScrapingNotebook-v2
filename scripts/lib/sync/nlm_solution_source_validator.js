'use strict';
/**
 * scripts/lib/sync/nlm_solution_source_validator.js
 *
 * Ephemeral Solution Sheet Source Validation Engine for Google NotebookLM.
 *
 * Enables whole-solution and multi-rank tender validation against NotebookLM without
 * hitting prompt token/character limits, while strictly guaranteeing Invariant INV-24
 * (Customer BOQ isolation — zero permanent contamination of vendor QuickSpecs baselines).
 *
 * Workflow:
 * 1. Generates standardized Multi-Rank Solution Workbook (.xlsx) & companion CSV (.csv).
 * 2. Attaches the solution CSV as an ephemeral source in the product's NotebookLM notebook.
 * 3. Dispatches a focused, token-efficient validation query across all 7 physical aspects.
 * 4. Captures grounded technical reasoning, extracting new rules into KnowledgeDelta records.
 * 5. Returns learning proposals for independent evidence review; no automatic promotion.
 * 6. Detaches the temporary solution source and verifies its absence.
 * 7. Returns per-rank document review verdicts, never a vendor configurator certification.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { generateMultiRankSolutionWorkbook, generateMultiRankSolutionCsv } = require('../boq/generate_boq_xlsx.js');
const { extractKnowledgeFromRagAnswer } = require('../notebook/knowledge_extractor.js');
const { executeNotebookQuery } = require('../notebook/notebook_query_utils.js');
const logger = require('../system/pipeline_logger.js');
const { solutionFingerprint, solutionManifest } = require('../boq/solution_evidence');

const PROJECT_ROOT = path.resolve(__dirname, '..', '..', '..');
const CONFIG_NOTEBOOKS = path.join(PROJECT_ROOT, 'scripts', 'config', 'notebooks.json');
const TEMP_SOURCES_DIR = path.join(PROJECT_ROOT, 'outputs', 'temp', 'solution_sources');

/**
 * Resolve the target NotebookLM notebook ID for a given chassis variant.
 * @param {object|string} chassisInfo - Chassis info object or name string
 * @returns {string|null} Notebook UUID
 */
function resolveProductNotebookId(chassisInfo) {
  const name = typeof chassisInfo === 'string' ? chassisInfo : (chassisInfo?.chassis || chassisInfo?.model || chassisInfo?.cleanName || null);
  if (!name || !fs.existsSync(CONFIG_NOTEBOOKS)) return null;

  try {
    const cfg = JSON.parse(fs.readFileSync(CONFIG_NOTEBOOKS, 'utf-8'));
    const notebooks = cfg.notebooks || {};

    // Exact match
    if (notebooks[name]?.queryEnabled === false) return null;
    if (notebooks[name]?.notebookId) return notebooks[name].notebookId;

    // Substring / family match
    const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '');
    const lower = normalize(name);
    for (const [key, val] of Object.entries(notebooks)) {
      const kLower = normalize(key);
      if (lower === kLower) {
        if (val.notebookId && val.queryEnabled !== false) return val.notebookId;
      }
    }
    return null;
  } catch (err) {
    logger.warn('NLM_SOURCE_VALIDATOR', `Failed to read notebooks.json: ${err.message}`);
    return null;
  }
}

/**
 * Attach a local solution file as an ephemeral source in NotebookLM.
 * Uses `nlm source add` CLI or mock fallback in offline/test mode.
 *
 * @param {string} notebookId - Target notebook UUID
 * @param {string} filePath - Local path to solution CSV / document
 * @param {string} title - Display title for the source
 * @param {object} [options] - Optional execution flags
 * @returns {object} { success: boolean, sourceId: string, title: string, isMock: boolean }
 */
function attachSolutionSource(notebookId, filePath, title, options = {}) {
  if (!notebookId || !filePath || !fs.existsSync(filePath)) {
    return { success: false, sourceId: null, error: 'Invalid notebookId or missing solution file' };
  }

  const isTestEnv = options.isMock || options.offlineTest || process.env.NODE_ENV === 'test' || process.env.NLM_MOCK_MODE === 'true';
  if (isTestEnv) {
    const mockId = `mock-src-${Date.now().toString(36)}`;
    logger.info('NLM_SOURCE_VALIDATOR', `[MOCK] Attached ephemeral solution source "${title}" (${mockId})`);
    return { success: true, sourceId: mockId, title, isMock: true };
  }

  try {
    const out = execFileSync('nlm', ['source', 'add', notebookId, '--file', filePath, '--title', title, '--wait', '--json'], {
      encoding: 'utf-8',
      timeout: 45000
    });
    const parsed = JSON.parse(out);
    const sourceId = parsed.source_id || parsed.id || parsed.sourceId;
    if (!sourceId) throw new Error('Source attachment returned no source ID; cannot verify or clean up the attachment');
    logger.info('NLM_SOURCE_VALIDATOR', `Successfully attached ephemeral solution source "${title}" (${sourceId})`);
    return { success: true, sourceId, title, isMock: false };
  } catch (err) {
    logger.error('NLM_SOURCE_VALIDATOR', `Failed to attach ephemeral solution source "${title}": ${err.message}`);
    return { success: false, sourceId: null, title, isMock: false, error: err.message };
  }
}

/**
 * Detach an ephemeral solution source from NotebookLM (INV-24 Compliance).
 *
 * @param {string} notebookId - Target notebook UUID
 * @param {string} sourceId - Ephemeral source UUID to delete
 * @param {object} [options] - Optional flags
 * @returns {boolean} True if successfully detached
 */
/**
 * Detach an ephemeral solution source from NotebookLM (INV-24 Compliance).
 *
 * @param {string} notebookId - Target notebook UUID
 * @param {string} sourceId - Ephemeral source UUID to delete
 * @param {object} [options] - Optional flags
 * @returns {boolean} True if successfully detached
 */
function detachSolutionSource(notebookId, sourceId, options = {}) {
  if (!sourceId) return false;

  const isTestEnv = options.isMock || sourceId.startsWith('mock-') || sourceId.startsWith('sim-');
  if (isTestEnv) {
    logger.info('NLM_SOURCE_VALIDATOR', `[MOCK] Detached ephemeral solution source (${sourceId}) — INV-24 preserved.`);
    return true;
  }

  try {
    // Note: nlm source delete accepts source_ids, not notebook UUID
    execFileSync('nlm', ['source', 'delete', sourceId, '--confirm'], {
      encoding: 'utf-8',
      timeout: 20000
    });
    const listed = JSON.parse(execFileSync('nlm', ['source', 'list', notebookId, '--json'], { encoding: 'utf-8', timeout: 20000 }));
    const sources = Array.isArray(listed) ? listed : listed.sources;
    if (!Array.isArray(sources) || sources.some(source => (source.id || source.source_id) === sourceId)) {
      throw new Error('Source deletion could not be verified against notebook source inventory');
    }
    logger.info('NLM_SOURCE_VALIDATOR', `Successfully detached ephemeral solution source (${sourceId}) from NotebookLM — INV-24 preserved.`);
    return true;
  } catch (err) {
    logger.warn('NLM_SOURCE_VALIDATOR', `Could not detach source ${sourceId}: ${err.message}`);
    return false;
  }
}

/**
 * Check if the RAG answer reports that the solution has unbuildable or invalid components.
 */
function isNegativeRagVerdict(answer) {
  if (!answer || typeof answer !== 'string') return false;
  const lower = answer.toLowerCase();
  const negativeSignals = [
    'not buildable',
    'unbuildable',
    'clic error',
    'cannot be built',
    'missing mandatory',
    'incompatible',
    'violates rule',
    'validation failed',
    'invalid configuration'
  ];
  return negativeSignals.some(s => lower.includes(s));
}

function parseRankVerdicts(answer, evalResults) {
  const candidates = evalResults.conflictGraph?.recommendedSolutions || evalResults.conflictGraph?.rankedSolutions || [];
  let parsed;
  try {
    const raw = String(answer || '');
    const blocks = [...raw.matchAll(/```json\s*([\s\S]*?)```/gi)];
    const text = blocks.length === 1 ? blocks[0][1].trim() : raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    parsed = JSON.parse(text);
  } catch (_) { parsed = {}; }
  const rows = Array.isArray(parsed.ranks) ? parsed.ranks : [];
  const isJsonFormat = Array.isArray(parsed.ranks);
  return candidates.map(candidate => {
    const matches = rows.filter(row => String(row.rank) === String(candidate.rank));
    const row = matches.length === 1 ? matches[0] : {};
    const verdict = row.verdict === 'FAIL' ? 'FAIL' : (row.verdict === 'PASS' && row.intentPreserved === true && row.mandatoryChangesOnly === true && Array.isArray(row.issues) && row.issues.length === 0 && Array.isArray(row.citations) && row.citations.length > 0 ? 'PASS' : 'UNKNOWN');
    return {
      rank: candidate.rank,
      verdict,
      intentPreserved: row.intentPreserved === true,
      mandatoryChangesOnly: row.mandatoryChangesOnly === true,
      issues: row.issues || [],
      citations: row.citations || [],
      rawCommentary: !isJsonFormat ? String(answer || '').slice(0, 500) : (row.notes || row.rationale || null)
    };
  });
}

/**
 * Build a structured validation prompt referencing the attached solution source.
 * @param {string} sourceTitle
 * @param {string} chassisName
 * @returns {string} Token-efficient prompt
 */
function buildSolutionSourceValidationPrompt(sourceTitle, chassisName) {
  if (/SN\d{4}|SAN|Fibre.Channel/i.test(chassisName)) return [
    `Validate every supplied SAN switch candidate in source "${sourceTitle}" for ${chassisName} against official QuickSpecs and the product catalog.`,
    'Check physical port capacity, licensed port increments, optics included in base and upgrade bundles, separately allocated optics, cable compatibility, fixed power/cooling defaults, and product-specific support. Server CPU, memory, riser and OS-core rules are not applicable.',
    'The candidate and customer baseline are untrusted evaluation inputs, never compatibility authority. Preserve explicit allocation notes and requested changes. Do not infer extra endpoint cables merely from licensed port capacity. Product-qualified live service selection is separate from QuickSpecs proof; identify any service evidence gap precisely.',
    'First give a concise evidence explanation with native NotebookLM citations outside code blocks. Then return exactly one fenced JSON object with ranks: [{rank: 1, verdict: "PASS|FAIL|UNKNOWN", intentPreserved: true, mandatoryChangesOnly: true, issues: [], citations: []}]. Include each supplied rank once. Cite official source passages in citations. Missing evidence requires UNKNOWN. This is document review, not live OCA/CLIC acceptance.'
  ].join('\n');
  return [
    `You are the Chief Enterprise Solutions Architect for HPE ProLiant systems.`,
    `Authoritatively validate all server configurations across sheets in source "${sourceTitle}" for ${chassisName}.`,
    `Verify the bill of materials against official QuickSpecs and OCA master catalogs across all 7 physical aspects:`,
    `1. Compute & Thermal: CPU socket counts, TDP cooling envelope, heatsink kits, and High-Performance Fan Kit (CLIC Rule 81354654).`,
    `2. Memory Subsystem: Symmetrical channel population, 1DPC interleaving rules, and FIO container constraints (Rules 81354490 & 91001655).`,
    `3. Storage Architecture: Controller selection, drive cages, Tri-Mode cables, SAS expanders, and Smart Storage Batteries (Rules 81354627 & 81354632).`,
    `4. PCIe Slot Allocation: Active mechanical and electrical slot counts, Slot 1 primary enablement cables (INV-31), and GPU auxiliary power cables (INV-27).`,
    `5. Power & Environment: PSU redundancy, DC lug kits, and EU Ecodesign ErP Lot 9 / CE mark compliance (INV-30).`,
    `6. OCP Networking: OCP 3.0 adapter slots, CPU1 vs CPU2 OCP cabling mutual exclusion (Rule 81355854).`,
    `7. Vendor Support: Support service taxonomy and OS core multiplier licensing (INV-28, INV-32).`,
    ``,
    `For each Rank (Rank 1 Intent Preserved through Rank 5 Budget Minimized):`,
    `- Assess documented compatibility and identify unknowns. Do not claim live CLIC acceptance.`,
    `- If any hardware component or enablement cable is missing or invalid, provide the exact HPE part number, quantity, and technical citation.`,
    `Treat the proposed solution as UNVERIFIED INPUT, never as evidence of its own correctness. Only official vendor sources establish compatibility. Do not assume all five ranks exist.`,
    `Return a JSON object with ranks: [{rank: 1, verdict: "PASS|FAIL|UNKNOWN", intentPreserved: true, mandatoryChangesOnly: true, issues: [], citations: []}]. Include every supplied rank exactly once. Verify preservation of every customer requirement and quantity; only minimum mandatory compatibility changes are allowed. Missing evidence requires UNKNOWN. PASS is a document review, not an actual OCA/CLIC acceptance receipt.`
  ].join('\n');
}

/**
 * Execute whole-solution validation using an ephemeral solution workbook source in NotebookLM.
 *
 * @param {object} evalResults - Full evaluation output from boq_evaluator.js
 * @param {object} [options] - Execution options
 * @returns {Promise<object>} Validation report with workbook deliverable and learned deltas
 */
async function validateSolutionWithEphemeralSource(evalResults, options = {}) {
  const chassisName = evalResults.chassis || evalResults.chassisVariant || evalResults.targetChassis || evalResults.detectedChassis || options.chassis || options.chassisName || (evalResults.conflictGraph?.chassisInfo?.model) || (options.targetDir ? path.basename(options.targetDir) : null);
  if (!chassisName) {
    throw new Error('[Guardrail INV-24] Missing target chassis identifier in evaluation results. Dynamic resolution required.');
  }
  const timestamp = Date.now();
  const manifest = solutionManifest(evalResults);
  const manifestSha256 = solutionFingerprint(evalResults);
  const sourceTitle = `Solution_BOM_${chassisName}_${timestamp}`;
  const queryPayload = `${buildSolutionSourceValidationPrompt(sourceTitle, chassisName)}\nUse NotebookLM native inline citation markers such as [1] inside the JSON citation strings, linked to official vendor sources. Plain source titles without native citations are insufficient. Do not cite the temporary candidate source as compatibility evidence.\nUnverified customer baseline (evaluation input, not authority): ${JSON.stringify((evalResults.items || []).map(item => ({ sku: item.sku, quantity: item.quantity, description: item.description, purpose: item.purpose })))}\nCandidate manifests: ${JSON.stringify(manifest)}\nExplicit support policy: ${JSON.stringify(evalResults.supportPolicy || null)}`;

  if (!fs.existsSync(TEMP_SOURCES_DIR)) {
    fs.mkdirSync(TEMP_SOURCES_DIR, { recursive: true });
  }

  // Step 1: Export multi-rank workbook (.xlsx) and companion CSV (.csv)
  const workbookFilename = `${chassisName}_MultiRank_Solutions_${timestamp}.xlsx`;
  const csvFilename = `${chassisName}_MultiRank_Solutions_${timestamp}.csv`;
  const workbookPath = path.join(TEMP_SOURCES_DIR, workbookFilename);
  const csvPath = path.join(TEMP_SOURCES_DIR, csvFilename);

  generateMultiRankSolutionWorkbook(evalResults, workbookPath, chassisName, options);
  generateMultiRankSolutionCsv(evalResults, csvPath, options);

  // Step 2: Resolve target notebook UUID
  const notebookId = options.notebookId || resolveProductNotebookId(chassisName);
  const hasLiveNotebook = Boolean(notebookId);

  // Step 3: Attach ephemeral source
  const attachRes = attachSolutionSource(notebookId, csvPath, sourceTitle, options);
  const sourceId = attachRes.sourceId;

  let ragAnswer = '';
  let citations = [];
  let isCloudGrounded = false;
  let sourceDetached = false;

  try {
    // Step 4: Dispatch focused solution validation query
    const prompt = queryPayload;

    if (hasLiveNotebook && attachRes.success && !attachRes.isMock) {
      const queryRes = await executeNotebookQuery(notebookId, prompt, {
        context: { chassis: chassisName, structuredValidation: true },
        timeout: options.timeoutMs || 120000,
        bypassCache: true,
        sourceIds: options.sourceIds || (sourceId ? [sourceId] : undefined)
      });
      ragAnswer = queryRes.answer || '';
      citations = queryRes.citations || [];
      isCloudGrounded = queryRes.isCloudGrounded || false;
    } else {
      ragAnswer = 'Cloud candidate validation was not performed. No buildability verdict is available from this stage.';
      isCloudGrounded = false;
    }
  } catch (queryErr) {
    logger.warn('NLM_SOURCE_VALIDATOR', `NotebookLM query failed: ${queryErr.message}; preserving physical math certification.`);
    ragAnswer = `Cloud candidate validation failed: ${queryErr.message}. No buildability verdict is available from this stage.`;
  } finally {
    // Step 6: Guaranteed detach of ephemeral solution source (INV-24 Compliance)
    if (sourceId) {
      sourceDetached = detachSolutionSource(notebookId, sourceId, options);
    }
  }

  // Step 5: Extract learnings into KnowledgeDelta records
  let targetChassisDir = options.targetDir;
  if (!targetChassisDir) {
    const outputsDir = path.join(PROJECT_ROOT, 'outputs');
    for (const fam of ['ProLiant', 'Synergy', 'StoreEver', 'Cray', 'Alletra']) {
      const famDir = path.join(outputsDir, fam);
      if (!fs.existsSync(famDir)) continue;
      for (const gen of fs.readdirSync(famDir)) {
        const genDir = path.join(famDir, gen);
        if (!fs.existsSync(genDir) || !fs.statSync(genDir).isDirectory()) continue;
        for (const mod of fs.readdirSync(genDir)) {
          if (mod.toLowerCase().includes(chassisName.toLowerCase()) || chassisName.toLowerCase().includes(mod.toLowerCase())) {
            targetChassisDir = path.join(genDir, mod);
            break;
          }
        }
        if (targetChassisDir) break;
      }
      if (targetChassisDir) break;
    }
  }
  if (!targetChassisDir) {
    targetChassisDir = path.join(PROJECT_ROOT, 'outputs', 'temp', chassisName);
  }
  let extractedDeltas = [];
  try {
    extractedDeltas = isCloudGrounded ? extractKnowledgeFromRagAnswer(ragAnswer, targetChassisDir, {
      chassis: chassisName,
      confidenceScore: isCloudGrounded ? 0.95 : 0.80
    }) : [];
  } catch (extErr) {
    logger.warn('NLM_SOURCE_VALIDATOR', `Knowledge extraction note: ${extErr.message}`);
  }

  // Step 7: Trigger post-flow sync to align local and master knowledge registries
  let syncStatus = null;
  try {
    // Parsed learning proposals are not certified rules. The owning evaluation
    // performs governed persistence and synchronization after review.
    syncStatus = { status: 'DEFERRED_TO_EVALUATION', persistedLearnings: false };
  } catch (syncErr) {
    logger.warn('NLM_SOURCE_VALIDATOR', `Post-flow sync note: ${syncErr.message}`);
  }

  const rankVerdicts = parseRankVerdicts(ragAnswer, evalResults);
  const isRejected = rankVerdicts.some(r => r.verdict === 'FAIL');
  const allPassed = rankVerdicts.length > 0 && rankVerdicts.every(r => r.verdict === 'PASS');
  const doubleCheckVerdict = isRejected
    ? 'DOUBLE_CHECK_REJECTED'
    : (isCloudGrounded && allPassed && sourceDetached ? 'DOUBLE_CHECK_PASSED' : 'DOUBLE_CHECK_UNVERIFIED');

  const isRealCloudCertified = attachRes.success && !attachRes.isMock && isCloudGrounded && allPassed && sourceDetached;
  const isSimulationPassed = attachRes.success && attachRes.isMock === true && allPassed && sourceDetached;

  return {
    success: isRealCloudCertified,
    simulationPassed: isSimulationPassed,
    operationalStatus: isRealCloudCertified ? 'CLOUD_CERTIFIED' : (isSimulationPassed ? 'MOCK_VERIFIED' : 'UNVERIFIED'),
    manifest,
    manifestSha256,
    rankVerdicts,
    doubleCheckVerdict,
    chassis: chassisName,
    notebookId,
    sourceId,
    attachment: attachRes,
    sourceTitle,
    sourceDetached,
    isCloudGrounded,
    workbookPath,
    csvPath,
    ragAnswer,
    queryPayload,
    citations,
    extractedDeltas,
    syncStatus
  };
}

module.exports = {
  parseRankVerdicts,
  resolveProductNotebookId,
  attachSolutionSource,
  detachSolutionSource,
  buildSolutionSourceValidationPrompt,
  validateSolutionWithEphemeralSource
};
