#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { safeWriteJsonAtomic } = require('../lib/system/fs_compat.js');
const { isWithin, readFileRecord, fingerprint } = require('./skill_workflow/io.js');
const { scenarios, families } = require('./skill_workflow/golden_scenarios.js');
const { policy, semanticProjection, compareGolden } = require('./skill_workflow/golden_projection.js');
const { RESULT_MARKER, scenarioMode } = require('./skill_workflow/golden_worker.js');
const { projectLedgerArtifacts } = require('./skill_workflow/golden_ledger_artifacts.js');
const { projectBoqArtifacts } = require('./skill_workflow/golden_boq_artifacts.js');
const { captureProjectionInputs, projectCurrentExecution } = require('./skill_workflow/golden_current_execution.js');
const ARCHIVE_BASE = 'outputs/history/skill_workflow_excellence/cp0_goldens';
const WORKER = 'scripts/maintenance/skill_workflow/golden_worker.js';
const EVAL_MARKER = '__EVAL_RESULT_JSON__';
const ARTIFACT_FIELDS = new Set(['evidenceLogPath', 'evidenceSummaryPath', 'outputReportPath', 'exportPath', 'multiRankWorkbookPath', 'multiRankCsvPath', 'proposalWorkbookPath', 'portalWorkbookPath', 'runtimeDiscoveryPlanPath']);

function parseMarkers(stdout, marker) {
  const chunks = stdout.split(marker);
  if (chunks.length % 2 === 0) throw new Error(`Unbalanced ${marker} framing`);
  const records = [];
  for (let index = 1; index < chunks.length; index += 2) {
    try { records.push(JSON.parse(chunks[index].trim())); }
    catch (error) { throw new Error(`Malformed ${marker} JSON`, { cause: error }); }
  }
  return records;
}

function parseWorkerOutput(stdout, scenarioId) {
  const records = parseMarkers(stdout, RESULT_MARKER);
  if (records.length !== 1 || records[0].schemaVersion !== 1 || records[0].scenarioId !== scenarioId) throw new Error('Missing, duplicated or mismatched golden worker result');
  if (!['RETURNED', 'THROWN_ERROR', 'CLASSIFICATION_CHARACTERIZED'].includes(records[0].outcome)) throw new Error('Unknown golden worker outcome');
  const record = records[0];
  if (record.outcome === 'THROWN_ERROR' && typeof record.error?.message !== 'string') throw new Error('Thrown worker result requires original error evidence');
  if (record.outcome !== 'THROWN_ERROR' && (!record.response || typeof record.response !== 'object')) throw new Error('Returned worker result requires a response');
  if (record.outcome === 'CLASSIFICATION_CHARACTERIZED' && (record.mode !== 'CLASSIFICATION_ONLY_NOT_EXECUTED' || !record.response.classification)) throw new Error('Classification-only worker result missing declared non-execution');
  return { worker: records[0], response: records[0].response, error: records[0].error, envelopes: parseMarkers(stdout, EVAL_MARKER) };
}

function qualifyRun(run) {
  const attempts = run.deniedAttempts || [];
  const provenanceLimitations = attempts.filter(attempt => attempt.category === 'NON_NODE_SUBPROCESS' && /^(?:git|git\.exe)$/i.test(attempt.command || ''));
  const blockingDenials = attempts.filter(attempt => !provenanceLimitations.includes(attempt));
  return { qualified: run.exitCode === 0 && !run.error && run.sourceUnchanged === true && run.sourceProtectedUnchanged === true && !blockingDenials.length,
    provenanceLimitations, blockingDenials, observedDenials: attempts, scope: 'CAPTURE_QUALIFICATION_NOT_CUSTOMER_ACCEPTANCE' };
}

function scopedRecords(root, relative) {
  const base = path.join(root, relative), records = [];
  function walk(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`Aliased output artifact: ${file}`);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile()) records.push(readFileRecord(root, path.relative(root, file)));
    }
  }
  walk(base);
  return records;
}
function outputRecords(root) { return scopedRecords(root, 'outputs'); }

function artifactReferences(value, references = new Set()) {
  if (!value || typeof value !== 'object') return references;
  for (const [key, item] of Object.entries(value)) {
    if (ARTIFACT_FIELDS.has(key) && typeof item === 'string') references.add(item);
    else if (item && typeof item === 'object') artifactReferences(item, references);
  }
  return references;
}

function workbookProjection(file, root) {
  const XLSX = require(require.resolve('xlsx-js-style', { paths: [root] }));
  const book = XLSX.readFile(file, { cellDates: false, cellNF: true, cellFormula: true, cellStyles: true, bookFiles: true });
  // The reader exposes cell fill styles but omits some border/font linkage.
  // Preserve style definitions and worksheet XML too; ZIP container metadata is not a workbook fact.
  const styleParts = Object.fromEntries(Object.keys(book.files || {}).filter(name => /^xl\/(?:styles\.xml|theme\/[^/]+\.xml|worksheets\/[^/]+\.xml)$/.test(name))
    .sort().map(name => [name, Buffer.from(book.files[name].content).toString('utf8')]));
  return { sheetNames: [...book.SheetNames], styles: book.Styles || null, styleParts, sheets: Object.fromEntries(book.SheetNames.map(name => {
    const sheet = book.Sheets[name];
    return [name, Object.fromEntries(Object.keys(sheet).sort().map(key => [key, key.startsWith('!') ? sheet[key] : {
      type: sheet[key].t, value: sheet[key].v ?? null, formula: sheet[key].f ?? null, numberFormat: sheet[key].z ?? null,
      style: sheet[key].s ?? null, hyperlink: sheet[key].l ?? null, comments: sheet[key].c ?? null,
      arrayFormula: sheet[key].F ?? null, richText: sheet[key].r ?? null
    }]))];
  })) };
}

function captureConfigSideEffects(receipt, archive) {
  const before = receipt.manifest.files.filter(record => record.path.startsWith('scripts/config/'));
  const after = scopedRecords(receipt.root, 'scripts/config'), beforeByPath = new Map(before.map(record => [record.path, record]));
  const changed = after.filter(record => beforeByPath.get(record.path)?.sha256 !== record.sha256);
  const removed = before.filter(record => !after.some(item => item.path === record.path));
  const archived = [], semantics = [];
  for (const record of changed) {
    const file = path.resolve(receipt.root, record.path), target = path.join(archive, 'isolated-config', record.path);
    if (!isWithin(path.join(receipt.root, 'scripts/config'), file) || fs.realpathSync(file) !== file) throw new Error('Aliased or unenclosed copied configuration');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
    if (readFileRecord(archive, path.relative(archive, target)).sha256 !== record.sha256) throw new Error('Copied configuration changed during archiving');
    archived.push({ ...record, archivePath: path.relative(archive, target).split(path.sep).join('/') });
    semantics.push(artifactProjection(file, record));
  }
  return { disposition: changed.length || removed.length ? 'OBSERVED_ISOLATED_CONFIG_SIDE_EFFECTS_NOT_ACCEPTANCE' : 'NO_ISOLATED_CONFIG_SIDE_EFFECTS',
    before, after, changed, removed, archived, semantics };
}

function artifactProjection(file, record) {
  if (!/\.json$/i.test(file)) return { path: record.path, state: 'EXACT_BYTES', sha256: record.sha256, bytes: record.bytes };
  try { return { path: record.path, state: 'PARSED_JSON', content: JSON.parse(fs.readFileSync(file, 'utf8')) }; }
  catch (error) { return { path: record.path, state: 'OPAQUE_JSON', sha256: record.sha256, bytes: record.bytes,
    parseError: { name: error.name, message: error.message } }; }
}

function captureArtifacts(receipt, parsed, archive, projectWorkbook = workbookProjection, projectionInputs) {
  const before = new Map(receipt.manifest.files.map(record => [record.path, record]));
  const after = outputRecords(receipt.root);
  const changed = after.filter(record => before.get(record.path)?.sha256 !== record.sha256);
  const removed = [...before.keys()].filter(file => file.startsWith('outputs/') && !after.some(record => record.path === file));
  const files = new Set(changed.map(record => path.resolve(receipt.root, record.path)));
  for (const reference of artifactReferences(parsed)) files.add(path.resolve(receipt.root, reference));
  const artifacts = [], workbooks = [], artifactSemantics = [];
  for (const file of [...files].sort()) {
    if (!isWithin(receipt.root, file) || !isWithin(path.join(receipt.root, 'outputs'), file)) throw new Error('Referenced artifact lies outside copied outputs');
    const relative = path.relative(receipt.root, file).split(path.sep).join('/');
    if (!fs.existsSync(file)) {
      artifacts.push({ path: relative, state: 'MISSING_REFERENCE' });
      artifactSemantics.push({ path: relative, state: 'MISSING_REFERENCE' });
      continue;
    }
    if (!fs.lstatSync(file).isFile() || fs.realpathSync(file) !== file) throw new Error('Artifact is not an unaliased regular file');
    const record = readFileRecord(receipt.root, relative), target = path.join(archive, 'artifacts', relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(file, target, fs.constants.COPYFILE_EXCL);
    if (readFileRecord(archive, path.relative(archive, target)).sha256 !== record.sha256) throw new Error('Archived artifact bytes changed during capture');
    artifacts.push({ ...record, archivePath: path.relative(archive, target).split(path.sep).join('/') });
    if (/\.xlsx?$/i.test(file)) workbooks.push({ path: relative, content: projectWorkbook(file, receipt.root) });
    else artifactSemantics.push(artifactProjection(file, record));
  }
  const current = projectCurrentExecution(artifactSemantics, parsed, receipt.root, { records: artifacts, projectionInputs });
  const projected = { ...parsed, response: current.response };
  const boq = projectBoqArtifacts(current.artifacts, projected, receipt.root, { records: artifacts });
  return { artifacts, workbooks, artifactSemantics: projectLedgerArtifacts(boq.artifacts, projected, receipt.root),
    artifactProjectionProof: [...boq.proof, ...current.proof], projectedResponse: current.response, mutatedOutputs: changed, removedOutputs: removed };
}

function selectScenarios(ids) {
  if (!ids || !ids.length) return [...scenarios];
  const unknown = ids.filter(id => !scenarios.some(scenario => scenario.id === id));
  if (unknown.length) throw new Error(`Unknown scenario selection: ${unknown.join(', ')}`);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicated scenario selection');
  return ids.map(id => scenarios.find(scenario => scenario.id === id));
}

function capturedScenarioIds(records, family, mode) {
  return records.filter(record => record.family === family && record.qualified && record.reproducible && record.mode === mode).map(record => record.id);
}
function characterizationState(records, family) {
  if (capturedScenarioIds(records, family, 'CANONICAL_ROUTER').length) return 'PARTIAL_RUNTIME_CHARACTERIZATION';
  if (capturedScenarioIds(records, family, 'CLASSIFICATION_ONLY_NOT_EXECUTED').length) return 'CLASSIFICATION_ONLY_BASELINE';
  if (capturedScenarioIds(records, family, 'CONTROLLED_EXPORT_CONTRACT').length) return 'CONTROLLED_EXPORT_CONTRACT_BASELINE';
  // Preserve the existing label for legacy qualified records lacking a mode.
  // Such records still earn no runtime scenario or corrected acceptance credit.
  if (records.some(record => record.family === family && record.qualified && record.reproducible)) return 'CLASSIFICATION_ONLY_BASELINE';
  return 'PENDING';
}
function coverageRegister(selected, records = []) {
  return families.map(family => ({ ...family, characterization: characterizationState(records, family.id),
    runtimeScenariosCaptured: capturedScenarioIds(records, family.id, 'CANONICAL_ROUTER'),
    classificationOnlyCaptured: capturedScenarioIds(records, family.id, 'CLASSIFICATION_ONLY_NOT_EXECUTED'),
    controlledExportContractsCaptured: capturedScenarioIds(records, family.id, 'CONTROLLED_EXPORT_CONTRACT'),
    selectedScenarios: selected.filter(scenario => scenario.family === family.id).map(scenario => scenario.id),
    executionLimits: selected.filter(scenario => scenario.family === family.id).flatMap(scenario => scenario.limits || []),
    scope: 'SELECTED_DESCRIPTOR_CHARACTERIZATION_NOT_FAMILY_ACCEPTANCE',
    correctedAcceptance: 'PENDING_CHECKPOINT_BEHAVIOR_VERIFICATION' }));
}

function inputIdentity(receipt) {
  const manifest = receipt?.manifest;
  if (!manifest || !['inputTreeFingerprint', 'sourceAccountedFingerprint', 'sourceProtectedFingerprint', 'protectedFingerprint'].every(key => typeof manifest[key] === 'string' && manifest[key])) throw new Error('Missing source/global/protected tree fingerprints');
  if (!Array.isArray(receipt.dependencies) || receipt.dependencies.some(item => typeof item.path !== 'string' || typeof item.metadataFingerprint !== 'string' || !item.metadataFingerprint)) throw new Error('Missing dependency metadata fingerprint');
  return { inputTreeFingerprint: manifest.inputTreeFingerprint, sourceAccountedFingerprint: manifest.sourceAccountedFingerprint,
    sourceProtectedFingerprint: manifest.sourceProtectedFingerprint, protectedFingerprint: manifest.protectedFingerprint,
    head: manifest.head, branch: manifest.branch, status: manifest.status,
    dependencies: receipt.dependencies.map(item => ({ path: item.path, metadataFingerprint: item.metadataFingerprint })).sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) };
}

function requireRunBinding(receipt, run, scenario) {
  const script = typeof run.script === 'string' ? run.script.split(path.sep).join('/') : null;
  if (run.snapshotRoot !== receipt.root || run.inputTreeFingerprint !== receipt.manifest.inputTreeFingerprint ||
    script !== WORKER || run.args?.length !== 1 || run.args[0] !== JSON.stringify(scenario)) throw new Error('Execution receipt does not bind the copied input tree and exact scenario request');
}

function requireWorkerBinding(worker, scenario) {
  const mode = scenarioMode(scenario);
  if (worker.family !== scenario.family || worker.labeledIntent !== scenario.intent || worker.mode !== mode ||
    (worker.outcome !== 'THROWN_ERROR' && worker.outcome !== (scenario.execute === false ? 'CLASSIFICATION_CHARACTERIZED' : 'RETURNED'))) throw new Error('Worker descriptor and execution mode mismatch');
}

function prepareArchive(source) {
  const base = path.join(source, ARCHIVE_BASE);
  for (let directory = base; isWithin(source, directory); directory = path.dirname(directory)) {
    if (fs.existsSync(directory) && fs.lstatSync(directory).isSymbolicLink()) throw new Error('Aliased golden archive parent');
    if (directory === source) break;
  }
  fs.mkdirSync(base, { recursive: true });
  const archive = path.join(base, `${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}`);
  fs.mkdirSync(archive);
  return archive;
}

function capturePass(source, scenario, pass, archive, infrastructure) {
  const target = path.join(archive, scenario.id, `pass-${pass}`);
  fs.mkdirSync(target, { recursive: true });
  let receipt, run, parsed, capture, identity, copiedConfig;
  let projectionInputs = null;
  try {
    receipt = infrastructure.createIsolation({ source, checkpoint: 'CP0', dependencies: true });
    safeWriteJsonAtomic(path.join(target, 'copy-receipt.json'), receipt);
    identity = inputIdentity(receipt);
    projectionInputs = captureProjectionInputs(receipt, target, scenario);
    run = infrastructure.executeIsolated({ root: receipt.root, ownerToken: receipt.ownerToken, script: WORKER, args: [JSON.stringify(scenario)], timeoutMs: infrastructure.timeoutMs || 120000 });
    for (const name of ['stdout.log', 'stderr.log', 'receipt.json', 'denied.jsonl']) {
      const original = path.join(run.runDir, name);
      if (fs.existsSync(original)) fs.copyFileSync(original, path.join(target, name), fs.constants.COPYFILE_EXCL);
    }
    requireRunBinding(receipt, run, scenario);
    const stdout = fs.readFileSync(path.join(run.runDir, 'stdout.log'), 'utf8');
    parsed = parseWorkerOutput(stdout, scenario.id);
    requireWorkerBinding(parsed.worker, scenario);
    capture = captureArtifacts(receipt, parsed, target, infrastructure.workbookProjection || workbookProjection, projectionInputs);
    copiedConfig = captureConfigSideEffects(receipt, target);
    const qualification = qualifyRun(run);
    const semantic = semanticProjection({ response: capture.projectedResponse, error: parsed.error, envelopes: parsed.envelopes,
      workbooks: capture.workbooks, artifacts: capture.artifactSemantics, removedOutputs: capture.removedOutputs,
      copiedConfig: { disposition: copiedConfig.disposition, semantics: copiedConfig.semantics, removed: copiedConfig.removed } }, { root: receipt.root });
    const result = { schemaVersion: 1, scenario, pass, copiedRoot: receipt.root, qualification, worker: parsed.worker,
      raw: parsed, semantic, ...capture, copiedConfig, projectionInputs, executionReceipt: run, inputIdentity: identity, inputTreeFingerprint: receipt.manifest.inputTreeFingerprint };
    safeWriteJsonAtomic(path.join(target, 'capture.json'), result);
    return result;
  } catch (error) {
    const failure = { schemaVersion: 1, scenario, pass, copiedRoot: receipt?.root || null, qualification: { qualified: false },
      captureError: { name: error.name, message: error.message }, executionReceipt: run || null, raw: parsed || null,
      artifacts: capture?.artifacts || [], copiedConfig: copiedConfig || null, projectionInputs,
      inputIdentity: identity || null, inputTreeFingerprint: receipt?.manifest?.inputTreeFingerprint || null };
    safeWriteJsonAtomic(path.join(target, 'capture.json'), failure);
    return failure;
  }
}

function captureGoldens(options = {}, injectedInfrastructure) {
  if (options.passes !== undefined && options.passes !== 2) throw new Error('Strict golden capture requires exactly --passes 2');
  const source = fs.realpathSync(options.source || path.resolve(__dirname, '../..'));
  const selected = selectScenarios(options.scenarioIds), archive = prepareArchive(source);
  const infrastructure = { ...(injectedInfrastructure || require('./create_skill_workflow_isolation.js')), timeoutMs: options.timeoutMs || 120000 };
  const records = [];
  let acceptedInputIdentity, stoppedReason = null;
  for (const scenario of selected) {
    const first = capturePass(source, scenario, 1, archive, infrastructure);
    const second = capturePass(source, scenario, 2, archive, infrastructure);
    const comparison = first.semantic && second.semantic ? compareGolden(first.semantic, second.semantic) : { equal: false, differences: [{ code: 'CAPTURE_FAILED' }] };
    if (!acceptedInputIdentity && first.inputIdentity) acceptedInputIdentity = first.inputIdentity;
    const sameInputs = Boolean(acceptedInputIdentity && first.inputIdentity && second.inputIdentity &&
      compareGolden(acceptedInputIdentity, first.inputIdentity).equal && compareGolden(acceptedInputIdentity, second.inputIdentity).equal);
    const record = { id: scenario.id, family: scenario.family, labeledIntent: scenario.intent, mode: scenarioMode(scenario),
      qualified: first.qualification.qualified && second.qualification.qualified && sameInputs,
      reproducible: comparison.equal, sameInputs, comparison, passes: [first, second] };
    records.push(record);
    if (!record.qualified || !record.reproducible) {
      stoppedReason = { scenarioId: scenario.id, disposition: 'REVIEW_REQUIRED_BEFORE_FURTHER_CAPTURE',
        codes: [...(!first.qualification.qualified || !second.qualification.qualified ? ['UNQUALIFIED_PASS'] : []),
          ...(!sameInputs ? ['INPUT_IDENTITY_MISMATCH'] : []), ...(!comparison.equal ? ['GOLDEN_COMPARISON_FAILED'] : [])],
        unqualifiedPasses: record.passes.filter(pass => !pass.qualification.qualified).map(pass => pass.pass) };
      break;
    }
  }
  const files = records.flatMap(record => record.passes.flatMap(pass => [...(pass.artifacts || []), ...(pass.copiedConfig?.archived || [])]
    .map(file => ({ ...file, path: `${record.id}/pass-${pass.pass}/${file.archivePath || file.path}` }))));
  const summary = { schemaVersion: 1, checkpoint: 'CP0', purpose: 'CHARACTERIZATION_NOT_CORRECTED_ACCEPTANCE', archive, source, comparisonPolicy: policy,
    state: records.every(record => record.qualified && record.reproducible) ? 'CAPTURED_REPRODUCIBLE' : 'REVIEW_REQUIRED',
    selectedScenarioIds: selected.map(scenario => scenario.id), fullScenarioSelection: selected.length === scenarios.length,
    capturedScenarioIds: records.map(record => record.id),
    unexecutedScenarioIds: selected.filter(scenario => !records.some(record => record.id === scenario.id)).map(scenario => scenario.id),
    fullSelectedCapture: records.length === selected.length, stoppedReason,
    acceptedInputTreeFingerprint: acceptedInputIdentity?.inputTreeFingerprint || null, acceptedInputIdentity: acceptedInputIdentity || null,
    capturePasses: 2, coverageScope: 'PARTIAL_CHARACTERIZATION_19_FAMILY_ACCEPTANCE_PENDING',
    records, artifactReceiptFingerprint: fingerprint(files), coverage: coverageRegister(selected, records),
    limits: ['Capture stops after the first unqualified or unequal pair; both passes are retained for review.',
      'Classification-only adversarial case does not execute customer-candidate scrutiny.', 'Clean BOQ and corrupt-file controls remain pending.',
      'Selected descriptors do not establish acceptance of all 19 families.', 'No live vendor or cloud acceptance.',
      'Raw artifacts retained; JSON compares parsed facts, opaque JSON and other non-workbook artifacts compare exact bytes; workbook reader semantics do not prove complete OOXML equivalence.'] };
  safeWriteJsonAtomic(path.join(archive, 'golden-receipt.json'), summary);
  return summary;
}

function main(args) {
  const options = { scenarioIds: [] };
  let capture = false;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--capture') capture = true;
    else if (arg === '--list') { console.log(JSON.stringify({ scenarios, families, comparisonPolicy: policy }, null, 2)); return; }
    else if (['--root', '--scenario', '--timeout', '--passes'].includes(arg)) {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${arg}`);
      if (arg === '--root') options.source = value;
      else if (arg === '--scenario') options.scenarioIds.push(value);
      else if (arg === '--passes') options.passes = Number(value);
      else options.timeoutMs = Number(value);
    } else if (arg === '--help') { console.log('Usage: --list | --capture [--root accepted-tree] [--scenario ID ...] [--passes 2] [--timeout ms]\nTwo pristine isolated passes per selected scenario. Archive: ' + ARCHIVE_BASE); return; }
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!capture) throw new Error('Explicit --capture or --list required');
  if (options.timeoutMs !== undefined && (!Number.isSafeInteger(options.timeoutMs) || options.timeoutMs < 1)) throw new Error('Timeout must be a positive integer');
  const result = captureGoldens(options);
  console.log(JSON.stringify({ state: result.state, archive: result.archive, scenarios: result.records.length,
    selectedScenarioIds: result.selectedScenarioIds, capturedScenarioIds: result.capturedScenarioIds,
    unexecutedScenarioIds: result.unexecutedScenarioIds, stoppedReason: result.stoppedReason, coverage: result.coverage }, null, 2));
  if (result.state !== 'CAPTURED_REPRODUCIBLE') process.exitCode = 1;
}
if (require.main === module) { try { main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 1; } }
module.exports = { ARCHIVE_BASE, parseMarkers, parseWorkerOutput, qualifyRun, scopedRecords, outputRecords, artifactReferences, workbookProjection, artifactProjection, captureArtifacts, captureConfigSideEffects, selectScenarios, coverageRegister, inputIdentity, requireRunBinding, requireWorkerBinding, capturePass, captureGoldens, main };
