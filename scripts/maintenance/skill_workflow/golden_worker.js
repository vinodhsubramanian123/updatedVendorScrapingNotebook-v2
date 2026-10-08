'use strict';
// Permanent characterization adapter. It delegates to the canonical router;
// it never implements customer evaluation or creates its own successful result.
const path = require('path');
const RESULT_MARKER = '__SKILL_GOLDEN_RESULT_JSON__';

function requestContext(scenario, root) {
  const context = { ...scenario.context, offlineMode: true, persistLedger: true };
  if (scenario.scope) context.chassisName = scenario.scope;
  for (const [key, relative] of Object.entries(scenario.files || {})) {
    if (!['filePath', 'secondaryFilePath', 'vendorFilePath', 'customerFilePath'].includes(key) || typeof relative !== 'string') throw new Error('Invalid scenario file descriptor');
    const target = path.resolve(root, relative);
    const enclosure = path.relative(root, target);
    if (path.isAbsolute(relative) || !enclosure || enclosure.startsWith('..' + path.sep) || enclosure === '..' || path.isAbsolute(enclosure)) throw new Error('Scenario file must be scoped inside the copy');
    context[key] = target;
  }
  return context;
}

function scenarioMode(scenario, router) {
  if (scenario.mode !== undefined && scenario.mode !== 'CONTROLLED_EXPORT_CONTRACT') throw new Error('Unknown golden scenario mode');
  const contractMode = scenario.mode === 'CONTROLLED_EXPORT_CONTRACT';
  if (contractMode && (scenario.execute === false || router)) throw new Error('Controlled export cannot use classification or injected router');
  if (contractMode) return 'CONTROLLED_EXPORT_CONTRACT';
  return scenario.execute === false ? 'CLASSIFICATION_ONLY_NOT_EXECUTED' : 'CANONICAL_ROUTER';
}
async function executeScenarioMode(scenario, root, context, router, mode) {
  if (mode === 'CONTROLLED_EXPORT_CONTRACT') return require('./golden_export_contract.js').runExportContract(scenario, root);
  const service = router || require('../../evaluators/route_query.js');
  if (scenario.execute === false) return { classification: service.classifyQueryIntent(scenario.query, context) };
  return service.executeRoutedQuery(scenario.query, context);
}
async function runScenario(scenario, root, router) {
  if (!scenario || typeof scenario.id !== 'string' || typeof scenario.query !== 'string') throw new Error('Invalid golden scenario');
  const mode = scenarioMode(scenario, router);
  const context = requestContext(scenario, root);
  const record = { schemaVersion: 1, scenarioId: scenario.id, family: scenario.family, labeledIntent: scenario.intent,
    mode, response: null, error: null };
  try {
    record.response = await executeScenarioMode(scenario, root, context, router, mode);
    record.outcome = scenario.execute === false ? 'CLASSIFICATION_CHARACTERIZED' : 'RETURNED';
  } catch (error) {
    record.outcome = 'THROWN_ERROR';
    record.error = { name: error.name, message: error.message, code: error.code || null,
      traceId: error.traceId || null, evidenceLogPath: error.evidenceLogPath || null,
      secondaryFailure: error.cleanupError || error.evidenceExportError || null };
  }
  return record;
}

async function main(args) {
  if (args.length !== 1) throw new Error('Worker requires exactly one JSON scenario descriptor');
  if (!process.env.SKILL_ISOLATION_ROOT || !process.env.SKILL_ISOLATION_CONTROL) throw new Error('Golden worker requires the qualified isolation runner');
  const record = await runScenario(JSON.parse(args[0]), path.resolve(process.env.SKILL_ISOLATION_ROOT));
  process.stdout.write(`\n${RESULT_MARKER}${JSON.stringify(record)}${RESULT_MARKER}\n`);
}
if (require.main === module) main(process.argv.slice(2)).catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });
module.exports = { RESULT_MARKER, requestContext, scenarioMode, runScenario, main };
