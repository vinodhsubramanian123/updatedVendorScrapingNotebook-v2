'use strict';
/**
 * scripts/lib/boq/eval_output_serializer.js — Modular BOQ Output Serializer & Deliverable Exporter
 *
 * Deconstructs the monolithic serializeAndExportResults and report generation into focused,
 * cleanly modularized functions (CC <= 15 per function):
 * 1. Markdown report section builders (_buildHeaderSection, _buildItemsSection, etc.)
 * 2. Workflow steps builder (_buildWorkflowSteps)
 * 3. Provenance trace builder (_buildProvenanceTrace, _buildTracePayloads)
 * 4. Google Drive upload handler (handleGoogleDriveUpload)
 * 5. Master serializer and export coordinator (serializeAndExportResults)
 */

const fs = require('fs');
const path = require('path');
const { generateMultiRankSolutionWorkbook, generateMultiRankSolutionCsv, generateRankedPortalWorkbook, generateProfessionalBOQ } = require('./generate_boq_xlsx.js');
const { outputQuantities } = require('./configuration_context');
const { formatNotebookQueryPayload } = require('./boq_evaluator.js');
const { triggerPostFlowSyncAsync } = require('../sync/post_flow_sync.js');
const { recordEvaluationTelemetry } = require('../system/telemetry.js');
const { emitProgress } = require('../system/progress.js');
const logger = require('../system/pipeline_logger.js');
const { candidateReviewCurrent } = require('./solution_evidence');
const { toClickableFileUri } = require('../system/uri_helper.js');

function _buildHeaderSection(ctx) {
  const { inputFile, catalogData, notebookId, evalResults, targetBudgetUsd } = ctx;
  const chassisLabel = (catalogData && catalogData.metadata && catalogData.metadata.chassis) || 'HPE ProLiant BOQ';
  const notebookLabel = notebookId ? `${chassisLabel} Notebook (\`${notebookId}\`)` : `${chassisLabel} — Local Catalog Rules (no Notebook configured)`;

  let md = `# HPE Pre-Flight BOQ Evaluation & Validation Report\n\n`;
  md += `**Target BOQ File**: \`${inputFile}\`  \n`;
  md += `**Target Gemini Notebook**: ${notebookLabel}  \n`;
  md += `**Evaluation Date**: ${new Date().toISOString()}  \n`;
  md += `**Quantity basis**: Physical validation and category figures describe 1 base configuration; requested configurations: ${evalResults.configurationContext?.multiplier || 1}. Order-level rows retain their own quantities. PORTAL VALIDATION PENDING.\n`;
  md += `**Quantitative Confidence Score**: \`${evalResults.confidence?.score ?? 'UNKNOWN'} / 1.00\` (model confidence; not a portal certification)  \n`;
  if (targetBudgetUsd > 0) {
    md += `**Target CapEx Budget**: \`$${targetBudgetUsd.toLocaleString()} USD\`  \n`;
  }
  md += `\n---\n\n`;
  return md;
}

function _buildItemsSection(items, budgetOpt) {
  let md = `## 📋 1. Consolidated BOQ Hardware Items (${items.length})\n\n`;
  md += `| # | Product # (SKU) | Total Order Qty | Description | Est. Unit Price (USD) | Extended Price (USD) |\n`;
  md += `|---|---|---|---|---|---|\n`;
  items.forEach((it, idx) => {
    const { totalQty } = outputQuantities(it);
    md += `| ${idx + 1} | \`${it.sku}\` | ${totalQty} | ${it.description} | \$${(it.unitPriceUsd || 0).toLocaleString()} | \$${(totalQty * (it.unitPriceUsd || 0)).toLocaleString()} |\n`;
  });
  md += `\n**Current Baseline BOM Total**: \`$${(budgetOpt?.currentBomCostUsd || 0).toLocaleString()} USD\`\n\n`;
  md += `---\n\n`;
  return md;
}

function _buildAspectsSection(evalResults) {
  const aspectCount = evalResults.aspectChecks ? evalResults.aspectChecks.length : 7;
  let md = `## ⚡ 2. Modular ${aspectCount}-Aspect Physical Pre-Checks\n\n`;
  if (evalResults.aspectChecks && Array.isArray(evalResults.aspectChecks)) {
    evalResults.aspectChecks.forEach(asp => {
      md += `- **Aspect ${asp.id}: ${asp.name}**: ${asp.status === 'PASS' ? '✅ PASS' : '❌ VIOLATION'} — ${asp.detail}\n`;
    });
    md += `\n`;
  } else {
    md += `- **Aspect 1: Compute & Thermal**: ${evalResults.cpuCount || 0} CPUs (Max TDP: ${evalResults.maxCpuTdpWatts || 0}W) | High-Perf Fans: ${evalResults.hasHighPerfFans ? '✅ Present' : '❌ Missing'}\n`;
    md += `- **Aspect 2: Memory & Channels**: ${evalResults.memoryCount || 0} DIMMs (${evalResults.totalMemoryGb || 0} GB Total)\n`;
    md += `- **Aspect 3: Storage & Tri-Mode**: ${evalResults.driveCount || 0} Drives | Controller Battery: ${evalResults.hasSmartBattery ? '✅ Present' : '❌ Missing'}\n`;
    md += `\n`;
  }

  if (evalResults.missingDependencies && evalResults.missingDependencies.length > 0) {
    md += `### 🚨 Missing Physical Dependencies Detected\n\n`;
    md += `| # | Rule Name | Direct SKU Fix | Required Qty | Description |\n`;
    md += `|---|---|---|---|---|\n`;
    evalResults.missingDependencies.forEach((dep, idx) => {
      md += `| ${idx + 1} | ${dep.rule} | \`${dep.sku}\` | ${dep.quantity} | ${dep.description} |\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildWorkloadSection(graph, chassisDir, chassisDetection) {
  let md = `## 1. Workload Fingerprint & Intent Analysis  \n`;
  md += `- **Detected Chassis Variant**: \`${graph.chassisInfo ? graph.chassisInfo.model : (chassisDir.split('/').pop() || 'Unknown')}\`  \n`;
  md += `- **Primary Workload DNA**: \`${graph.workloadDna ? graph.workloadDna.workloadDescription : 'Balanced Enterprise'}\`  \n`;
  if (chassisDetection) {
    md += `- **Chassis Auto-Detection**: Match Type \`${chassisDetection.matchType}\` (Confidence: ${Math.round(chassisDetection.confidenceScore * 100)}%)  \n`;
  }

  const rulesSrcName = chassisDir ? `${chassisDir.split('/').pop()}_Catalog.json` : 'Unknown_Catalog.json';
  md += `- **Rules Loaded Source**: \`${graph.rulesSource || rulesSrcName}\` ${graph.isFallbackSource ? '(Fallback Safety Net)' : '(Dual Safety Net)'}  \n\n`;

  if (graph.auditLog && graph.auditLog.length > 0) {
    md += `| Hierarchy Level | Evaluated Rule Text | Status | Technical Audit Details |\n`;
    md += `|---|---|---|---|\n`;
    graph.auditLog.forEach(al => {
      const statusIcon = al.status === 'PASS' ? '✅ PASS' : (al.status === 'FAIL' ? '❌ FAIL' : '⚠️ WARNING');
      md += `| **${al.level}** | ${al.ruleText} | ${statusIcon} | ${al.details} |\n`;
    });
    md += `\n`;
  }

  md += `### 🏆 2.6 Workload DNA Profile & Top 5 Strategic Resolution Matrix\n\n`;
  const dna = graph.workloadDna || {};
  md += `- **Inferred Workload DNA Profile**: \`${dna.workloadDescription || 'Balanced Enterprise'}\`  \n`;
  md += `- **CPU / Core Density**: \`${dna.totalCores || 0} Total Cores\` (Max Freq: \`${dna.maxFreqGhz || 0} GHz\`)  \n`;
  md += `- **Memory Density Ratio**: \`${dna.totalMemoryGb || 0} GB Total RAM\` (\`${dna.gbPerCore || 0} GB/Core\`)  \n`;
  md += `- **Storage I/O Profile**: \`${dna.storageWorkload || 'READ_INTENSIVE'} (${dna.storageType || 'SATA/NVMe'})\`  \n\n`;

  if (graph.recommendedSolutions && graph.recommendedSolutions.length > 0) {
    md += `| Rank | Solution Tier Name | Score | Est. Cost (USD) | Workload Match | SKU Mods | Technical Tradeoff Rationale |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    graph.recommendedSolutions.forEach(rs => {
      md += `| **Rank ${rs.rank}** | ${rs.name} | \`${rs.score}\` | \$${(rs.totalOrderCostUsd ?? rs.estimatedCostUsd).toLocaleString()} | ${rs.workloadDnaMatch} | ${rs.changesCount} | ${rs.reasoning} |\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildBudgetSection(budgetOpt, targetBudgetUsd) {
  if (!budgetOpt) return '';
  let md = `---\n\n`;
  md += `## 💰 3. Budget-Constrained Optimization & Golden Rule Assurance\n\n`;
  md += `${budgetOpt.goldenRuleSummary || ''}\n\n`;
  if (budgetOpt.hasZeroPriceSkus) md += `**PRICING INCOMPLETE — ${budgetOpt.zeroPriceCount} SKU(s) unresolved or zero price unconfirmed. Totals are known-price subtotals, not complete quotations.**\n\n`;
  md += `- **Mandatory Buildable Cost**: \`$${(budgetOpt.mandatoryBomCostUsd || 0).toLocaleString()} USD\` (Includes all direct SKU fixes)\n`;

  if (budgetOpt.isBudgetExceeded) {
    md += `- **Minimum Budget Overrun Delta**: \`+$${budgetOpt.budgetOverrunUsd.toLocaleString()} USD\`\n`;
    md += `> **Engineering Rationale**: The Golden Rule mandates that solution validation must eliminate 100% of unbuildable errors. Budget caps cannot override mandatory thermal cooling, power terminal safety, or write-cache lithium-ion battery requirements.\n\n`;
  } else if (targetBudgetUsd > 0) {
    md += `- **Remaining Budget Surplus**: \`$${budgetOpt.remainingBudgetUsd.toLocaleString()} USD\`\n\n`;
    if (budgetOpt.recommendedUpgrades && budgetOpt.recommendedUpgrades.length > 0) {
      md += `### 🌟 Recommended Surplus Budget Performance Upgrades\n\n`;
      md += `| Component Upgrade | Recommended SKU | Qty | Cost (USD) | Performance Benefit |\n`;
      md += `|---|---|---|---|---|\n`;
      budgetOpt.recommendedUpgrades.forEach(upg => {
        md += `| ${upg.upgrade} | \`${upg.sku}\` | ${upg.qty} | \$${upg.costUsd.toLocaleString()} | ${upg.benefit} |\n`;
      });
      md += `\n`;
    }
  }
  return md;
}

function _buildValueEngineeringSection(evalResults) {
  if (!evalResults.valueEngineering) return '';
  const ve = evalResults.valueEngineering;
  let md = `---\n\n`;
  md += `## 💡 3.5 Value Engineering & Deal Optimization Analysis\n\n`;
  md += `- **Workload Classification**: \`${ve.workloadProfile?.profileName || 'General Enterprise'}\`\n`;
  md += `- **Workload Rationale**: ${ve.workloadProfile?.rationale || 'Standard enterprise profile'}\n`;
  md += `- **Total Identified Savings**: \`$${(ve.totalEstimatedSavingsUsd || 0).toLocaleString()} USD\`\n\n`;

  if (ve.opportunities && ve.opportunities.length > 0) {
    md += `| Optimization Category | Opportunity Headline | Est. Savings (USD) | Presales Value Pitch |\n`;
    md += `|---|---|---|---|\n`;
    ve.opportunities.forEach(opp => {
      md += `| **${opp.type}** | ${opp.headline} | \$${(opp.potentialSavingsUsd || 0).toLocaleString()} | ${opp.presalesPitch} |\n`;
    });
    md += `\n`;
  }
  return md;
}

function _buildDeliverablesSection(ctx) {
  const { evalResults, outputPath } = ctx;
  if (!evalResults) return '';

  const deliverables = [];
  if (outputPath) {
    deliverables.push({
      type: 'Executive Evaluation Report',
      name: path.basename(outputPath),
      path: outputPath,
      format: 'Markdown (.md)',
      desc: 'Pre-flight engineering audit, 7 physical aspect pre-checks & BOM validation'
    });
  }
  if (evalResults.multiRankWorkbookPath) {
    deliverables.push({
      type: 'Multi-Rank Strategy Matrix',
      name: path.basename(evalResults.multiRankWorkbookPath),
      path: evalResults.multiRankWorkbookPath,
      format: 'Excel (.xlsx)',
      desc: '5-Tier Strategy Matrix (Rank 1A, 1B, 1L, Rank 2, Rank 5)'
    });
  }
  if (evalResults.multiRankCsvPath) {
    deliverables.push({
      type: 'Token-Dense Solution BOM',
      name: path.basename(evalResults.multiRankCsvPath),
      path: evalResults.multiRankCsvPath,
      format: 'CSV (.csv)',
      desc: 'Dense tabular SKU itemization formatted for rapid LLM reasoning'
    });
  }
  if (evalResults.proposalWorkbookPath) {
    deliverables.push({
      type: 'Customer Sizing Proposal',
      name: path.basename(evalResults.proposalWorkbookPath),
      path: evalResults.proposalWorkbookPath,
      format: 'Excel (.xlsx)',
      desc: 'Client-facing presentation workbook with commercial summary'
    });
  }
  if (evalResults.portalWorkbookPath) {
    deliverables.push({
      type: 'Partner Portal Upload Sheet',
      name: path.basename(evalResults.portalWorkbookPath),
      path: evalResults.portalWorkbookPath,
      format: 'Excel (.xlsx)',
      desc: 'Standardized 7-column OCA/CLIC format with subtotals and 2-line gaps'
    });
  }
  if (evalResults.evidenceSummaryPath) {
    deliverables.push({
      type: 'Evidence Ledger Summary',
      name: path.basename(evalResults.evidenceSummaryPath),
      path: evalResults.evidenceSummaryPath,
      format: 'Markdown (.md)',
      desc: '9-Phase cryptographic non-repudiation audit summary'
    });
  }

  if (deliverables.length === 0) return '';

  let md = `---\n\n`;
  md += `## 📁 5. Certified Deliverables & Generated Workbooks\n\n`;
  md += `> **Direct Access**: Click any local deliverable link below to open directly in your native viewer without navigating nested directories:\n\n`;
  md += `| Deliverable Type | Clickable Deliverable Link | Format | Purpose |\n`;
  md += `|---|---|---|---|\n`;
  deliverables.forEach(d => {
    const uri = toClickableFileUri(d.path);
    md += `| **${d.type}** | [${d.name}](${uri}) | \`${d.format}\` | ${d.desc} |\n`;
  });
  md += `\n`;
  return md;
}

/**
 * Generates the full evaluation markdown report
 * @param {object} ctx - Serialization context
 * @returns {string} Markdown text
 */
function generateMarkdownReport(ctx) {
  let report = _buildHeaderSection(ctx);
  report += _buildItemsSection(ctx.items, ctx.budgetOpt);
  report += _buildAspectsSection(ctx.evalResults);
  report += _buildWorkloadSection(ctx.graph, ctx.chassisDir, ctx.chassisDetection);
  report += _buildBudgetSection(ctx.budgetOpt, ctx.targetBudgetUsd);
  report += _buildValueEngineeringSection(ctx.evalResults);

  report += `---\n\n`;
  report += `## 🤖 4. Gemini Notebook RAG Status\n\n`;
  report += `${ctx.ragAnswer || 'No Gemini Notebook RAG answer recorded.'}\n\n`;
  report += _buildDeliverablesSection(ctx);
  report += `---\n\n`;
  report += `*Report generated automatically by HPE BOQ Evaluation Engine.*  \n`;

  return report;
}

function _buildWorkflowSteps(ctx) {
  const { items, inputFile, graph, evalResults, stage3RAGMs, stage4GuardrailMs, notebookId, chassisPrefix } = ctx;
  return [
    {
      stepId: 1,
      title: 'BOQ Pre-cleaning & Parsing',
      subtitle: 'Excel Multi-Sheet & Raw BOM Cleaning',
      status: 'COMPLETED',
      durationMs: ctx.stage1ParsingMs ?? null,
      details: `Parsed ${items.length} hardware SKU lines from ${inputFile || 'Pasted Text BOM'}. Cleaned formatting and tokenized quantities.`,
      metrics: { totalSkus: items.length, sheetsParsed: 1 }
    },
    {
      stepId: 2,
      title: 'Aspect Math & Rule Engine Validation',
      subtitle: 'Local Hardware Constraints Validation',
      status: evalResults.errors?.length > 0 ? 'WARNING' : 'COMPLETED',
      durationMs: ctx.stage2AspectMathMs ?? null,
      details: `Evaluated ${graph.totalRulesEvaluated || 18} hardware rules. Detected ${evalResults.errors?.length || 0} physical conflicts & ${evalResults.missingDependencies?.length || 0} missing accessories.`,
      metrics: { rulesEvaluated: graph.totalRulesEvaluated || 18, physicalConflicts: evalResults.errors?.length || 0, fixesInjected: evalResults.missingDependencies?.length || 0 }
    },
    {
      stepId: 3,
      title: 'NotebookLM RAG Consultation',
      subtitle: 'HPE QuickSpecs Knowledge Grounding',
      status: evalResults.cloudGroundingStatus === 'CLOUD_VERIFIED' ? 'COMPLETED' : (evalResults.cloudGroundingStatus === 'CLOUD_PENDING' ? 'PENDING' : 'SKIPPED'),
      durationMs: stage3RAGMs,
      details: evalResults.cloudGroundingStatus === 'CLOUD_PENDING'
        ? `Cloud grounding is pending and will be owned by the dashboard worker for Notebook ${notebookId}.`
        : (notebookId ? `NotebookLM grounding status: ${evalResults.cloudGroundingStatus}.` : `No dedicated Notebook ID mapped for ${chassisPrefix}; local rules remain available.`),
      metrics: { notebookId: notebookId || 'UNMAPPED', ragStatus: evalResults.cloudGroundingStatus || 'LOCAL_FALLBACK' }
    },
    {
      stepId: 4,
      title: 'Agentic AI Cross-Verification',
      subtitle: 'Gemini LLM Dual-Brain Verification',
      status: stage4GuardrailMs > 0 ? 'COMPLETED' : 'NOT_RUN',
      durationMs: stage4GuardrailMs,
      details: stage4GuardrailMs > 0 ? 'Agentic guardrail completed.' : 'Agentic guardrail was not run during the provisional local phase.',
      metrics: { workloadMatch: graph.workloadDna?.workloadDescription || 'Standard', confidenceScore: evalResults.confidence?.score || 0.9 }
    },
    {
      stepId: 5,
      title: 'Ranked Solutions & Vertical Parts Itemization',
      subtitle: '5-Tier Strategic Resolution Matrix',
      status: 'COMPLETED',
      durationMs: ctx.stage5MatrixMs ?? null,
      details: `Synthesized ${graph.rankedSolutions?.length || 0} compatibility tiers; ${graph.recommendedSolutions?.length || 0} passed the buildability, Pareto, uniqueness, and closeness publication gates.`,
      metrics: { rankedTiers: graph.rankedSolutions?.length || 0, recommendedSolutions: graph.recommendedSolutions?.length || 0, topRankScore: graph.recommendedSolutions?.[0]?.score || null }
    },
    {
      stepId: 6,
      title: 'Partner Portal Post-BOM Learning Loop',
      subtitle: 'Bi-Directional Quote Verification',
      status: 'READY',
      durationMs: 0,
      details: 'Ready for official HPE Partner Portal quote verification and self-learning KnowledgeDelta recording.',
      metrics: { deltaStatus: 'LISTENING_FOR_FEEDBACK' }
    }
  ];
}

function _buildProvenanceTrace(ctx, traceId) {
  const {
    startTime, chassisPrefix, graph, inputFile, stage1ParsingMs, stage2AspectMathMs,
    stage3RAGMs, stage4GuardrailMs, stage5MatrixMs, evalResults, notebookId
  } = ctx;

  return {
    traceId,
    timestamp: new Date(startTime).toISOString(),
    completedAt: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    chassis: chassisPrefix || graph.chassisInfo?.model || 'UNKNOWN_CHASSIS',
    inputFile: path.basename(inputFile),
    stages: [
      { stageId: 1, name: 'BOQ Parsing & Multi-Cluster Discovery', durationMs: stage1ParsingMs, status: 'COMPLETED' },
      { stageId: 2, name: '7-Aspect Physical Rule Engine', durationMs: stage2AspectMathMs, status: (evalResults.errors || []).length > 0 ? 'VIOLATIONS_FOUND' : 'CLEAN' },
      { stageId: 3, name: 'NotebookLM Cloud RAG Grounding', durationMs: stage3RAGMs, status: evalResults.cloudGroundingStatus || 'LOCAL_FALLBACK' },
      { stageId: 4, name: 'Dual-Brain Agentic Guardrail', durationMs: stage4GuardrailMs, status: stage4GuardrailMs > 0 ? 'COMPLETED' : 'NOT_RUN' },
      { stageId: 5, name: '5-Tier Strategy Matrix & Conflict Resolution', durationMs: stage5MatrixMs, status: 'SYNTHESIZED' },
      { stageId: 6, name: 'Post-Flow Knowledge Sync', durationMs: 0, status: evalResults.postFlowSync?.syncStatus || 'LOCAL_PAYLOAD_ONLY' }
    ],
    grounding: {
      notebookId,
      source: evalResults.notebookLmStatus?.source || (evalResults.cloudGroundingStatus === 'CLOUD_PENDING' ? 'NOTEBOOK_LM_PENDING' : 'LOCAL_RULE_ENGINE'),
      isCloudGrounded: Boolean(evalResults.notebookLmStatus?.isCloudGrounded),
      groundingTier: evalResults.notebookLmStatus?.groundingTier || 'UNVERIFIED_PENDING',
      citationsCount: evalResults.notebookLmStatus?.citationsCount || 0,
      sourcesUsed: evalResults.notebookLmStatus?.sourcesUsed || [],
      latencyMs: stage3RAGMs
    },
    rulesAudit: {
      totalRulesEvaluated: graph.totalRulesEvaluated ?? null,
      conflictsCount: (graph.conflicts || []).length,
      resolvedFixesCount: (graph.resolvedFixes || []).length,
      learnedDeltasCount: evalResults.learnedDeltasCount || 0
    },
    unsolicitedServices: {
      unsolicitedCount: (evalResults.unsolicitedOptionalItems || []).length,
      totalUnsolicitedCostUsd: evalResults.totalUnsolicitedCostUsd || 0
    },
    needsActions: evalResults.evalSummary?.needsActions || []
  };
}

function _buildTracePayloads(ctx) {
  const { items, evalResults, notebookId } = ctx;
  return [
    {
      stage: 'Rule Engine Evaluation',
      timestamp: new Date().toISOString(),
      payload: {
        itemsEvaluated: items.length,
        errorsDetected: evalResults.errors,
        missingDependencies: evalResults.missingDependencies,
        confidenceScore: evalResults.confidence?.score
      }
    },
    {
      stage: 'NotebookLM RAG Dispatch',
      timestamp: new Date().toISOString(),
      payload: {
        notebookId,
        ragPromptSent: formatNotebookQueryPayload(items, evalResults)
      }
    }
  ];
}

/**
 * Handle Google Drive deliverable upload if requested
 */
async function handleGoogleDriveUpload(workbookPath) {
  try {
    const { uploadFileToGoogleSheet, ensureGoogleAuthValid } = require('../../services/google_sheets_service.js');
    const authCheck = await ensureGoogleAuthValid({ autoHeal: true, verbose: false });
    if (!authCheck.authenticated) {
      console.log(`\n⚠️ Google Drive upload requires authentication.`);
      console.log(`👉 Run "npm run auth:drive" or "npm run auth:check" to authenticate without human in the loop.\n`);
      return null;
    } else {
      const driveResult = await uploadFileToGoogleSheet(workbookPath);
      console.log(`☁️ Google Drive Live Deliverable: ${driveResult.spreadsheetUrl}`);
      console.log(`📄 Spreadsheet ID: ${driveResult.spreadsheetId}\n`);
      return driveResult;
    }
  } catch (err) {
    console.log(`\n⚠️ Google Drive upload note: ${err.message}`);
    return null;
  }
}

/**
 * Master Output Serializer and Deliverable Exporter
 * @param {object} ctx - Execution context
 */
async function serializeAndExportResults(ctx) {
  const {
    outputPath, evalResults, chassisPrefix, inputFile, startTime, items,
    graph, notebookId, stage1ParsingMs, stage2AspectMathMs, stage3RAGMs,
    stage4GuardrailMs, stage5MatrixMs, JSON_MODE, chassisDir, chassisDetection,
    budgetOpt, ragAnswer, queryPayload
  } = ctx;

  const reportDir = path.dirname(outputPath);
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  // Multi-Rank Solution Deliverable Export
  const inputBase = path.basename(inputFile, path.extname(inputFile));
  const fileSuffix = ctx.targetSheetName ? `${inputBase}_${ctx.targetSheetName.replace(/[/\\?*[\]:]/g, '_')}` : inputBase;
  const multiRankWorkbookPath = path.join(reportDir, `${fileSuffix}_MultiRank_Solutions.xlsx`);
  const multiRankCsvPath = path.join(reportDir, `${fileSuffix}_MultiRank_Solutions.csv`);

  try {
    const targetChassisName = chassisPrefix || ctx.detectedChassisName || (graph.chassisInfo ? graph.chassisInfo.model : (ctx.chassisDir ? path.basename(ctx.chassisDir) : 'Generic_Server'));
    generateMultiRankSolutionWorkbook(evalResults, multiRankWorkbookPath, targetChassisName, {
      clusterSizing: evalResults.clusterSizing
    });
    generateMultiRankSolutionCsv(evalResults, multiRankCsvPath, {
      clusterSizing: evalResults.clusterSizing
    });
    evalResults.multiRankWorkbookPath = multiRankWorkbookPath;
    evalResults.multiRankCsvPath = multiRankCsvPath;
    const proposalPath = path.join(reportDir, `${fileSuffix}_Proposal.xlsx`);
    generateProfessionalBOQ(evalResults, proposalPath, targetChassisName, graph.recommendedSolutions?.[0]?.rank || 1);
    evalResults.proposalWorkbookPath = proposalPath;
    const portalWorkbookPath = path.join(reportDir, `${fileSuffix}_Partner_Portal.xlsx`);
    generateRankedPortalWorkbook(evalResults, portalWorkbookPath);
    evalResults.portalWorkbookPath = portalWorkbookPath;
  } catch (sheetErr) {
    logger.warn('EVAL_OUTPUT_SERIALIZER', `Multi-Rank workbook export note: ${sheetErr.message}`);
    evalResults.deliveryError = sheetErr.message;
  }

  // Post-flow sync
  try {
    const autoUpload = !ctx.OFFLINE_MODE && !ctx.DEFER_RAG;
    const syncResult = await triggerPostFlowSyncAsync(chassisPrefix, 'EVALUATION', { autoUploadNLM: autoUpload, syncRunningKnowledge: autoUpload });
    evalResults.postFlowSync = syncResult;
    if (!syncResult.success) {
      const syncWarning = `⚠️ Post-flow knowledge sync failed: ${syncResult.error || 'Unknown error'}. NotebookLM may have stale data.`;
      if (!evalResults.warnings) evalResults.warnings = [];
      evalResults.warnings.push(syncWarning);
      if (!JSON_MODE) console.log(`\n${syncWarning}`);
    }
  } catch (syncErr) {
    logger.error('EVAL_OUTPUT_SERIALIZER', `Post-flow sync failed hard: ${syncErr.message}`);
    evalResults.postFlowSync = { success: false, error: syncErr.message };
    if (!evalResults.warnings) evalResults.warnings = [];
    evalResults.warnings.push(`⚠️ Post-flow knowledge sync crashed: ${syncErr.message}. NotebookLM is NOT in sync.`);
  }

  evalResults.stageBreakdown = {
    stage1ParsingMs,
    stage2AspectMathMs,
    stage3RAGConsultationMs: stage3RAGMs,
    stage4GeminiVerificationMs: stage4GuardrailMs,
    stage5ResolutionMatrixMs: stage5MatrixMs
  };

  recordEvaluationTelemetry(evalResults, inputFile, Date.now() - startTime);

  // Deliverable Drive Upload if requested
  if (ctx.UPLOAD_DRIVE && !candidateReviewCurrent(evalResults)) {
    evalResults.deliveryError = 'Google Sheet publication withheld: the final candidate BOM has no current successful document review';
  } else if (ctx.UPLOAD_DRIVE && evalResults.multiRankWorkbookPath) {
    const driveUpload = await handleGoogleDriveUpload(evalResults.portalWorkbookPath);
    if (driveUpload) {
      evalResults.googleDriveDeliverable = driveUpload;
    } else {
      evalResults.deliveryError = 'Requested Google Sheet upload did not return a delivery receipt';
    }
  }

  const ledger = evalResults.evidenceLedger;
  if (ledger) {

    ledger.recordArtifact('RANKED_WORKBOOK', evalResults.multiRankWorkbookPath, { googleDriveDeliverable: evalResults.googleDriveDeliverable || null });
    ledger.recordArtifact('RANKED_CSV', evalResults.multiRankCsvPath);
    ledger.recordArtifact('PARTNER_PORTAL_WORKBOOK', evalResults.portalWorkbookPath, { googleDriveDeliverable: evalResults.googleDriveDeliverable || null });
    ledger.completePhase(8, evalResults.deliveryError ? 'FAILED' : 'PASSED', { workbookPath: evalResults.multiRankWorkbookPath || null, googleDriveDeliverable: evalResults.googleDriveDeliverable || null, uploadRequested: Boolean(ctx.UPLOAD_DRIVE) }, [], [], evalResults.deliveryError ? [evalResults.deliveryError] : []);
    ledger.startPhase(9, 'Continuous Learning Reflection & Shared State Export', { newLearningsCount: evalResults.newLearningsCount || 0 });
    let phase9Status = 'ACTION_REQUIRED';
    const sync = evalResults.postFlowSync;
    const isOffline = Boolean(ctx.OFFLINE_MODE || ctx.DEFER_RAG);
    const syncRequested = Boolean(ctx.SYNC_RAG);

    if (isOffline || (!syncRequested && !sync)) {
      phase9Status = 'SKIPPED';
    } else if (sync?.success === false || sync?.error || sync?.syncStatus === 'FAILED') {
      phase9Status = 'ACTION_REQUIRED';
    } else if (sync?.success === true && sync?.syncStatus === 'CLOUD_VERIFIED') {
      phase9Status = 'PASSED';
    } else if (!syncRequested && sync?.success === true && sync?.syncStatus === 'LOCAL_PAYLOAD_ONLY') {
      phase9Status = 'PASSED';
    }
    ledger.completePhase(9, phase9Status, {
      newLearningsCount: evalResults.newLearningsCount || 0,
      postFlowSync: evalResults.postFlowSync || null,
      priceDrift: evalResults.priceDriftResult || null,
      syncRequested,
      isOffline
    });

  }

  if (ledger) {
    const evidenceDir = ctx.evidenceDir || path.resolve(__dirname, '../../../outputs/history/evidence_logs');
    evalResults.evidenceLogPath = path.join(evidenceDir, `evidence_log_${ledger.traceId}.json`);
    evalResults.evidenceSummaryPath = path.join(evidenceDir, `evidence_summary_${ledger.traceId}.md`);
    evalResults.evidenceHealth = ledger.getHealth();
  }
  const reportContent = generateMarkdownReport(ctx);
  fs.writeFileSync(outputPath, reportContent, 'utf-8');
  if (ledger) {
    ledger.recordArtifact('ANALYSIS_REPORT', outputPath);
    const requiredArtifacts = ['ANALYSIS_REPORT', 'RANKED_WORKBOOK', 'RANKED_CSV', 'PARTNER_PORTAL_WORKBOOK'];
    const missing = requiredArtifacts.filter(role => !ledger.artifacts.some(artifact => artifact.role === role && artifact.exists && artifact.sha256));
    if (missing.length) {
      evalResults.deliveryError = `Missing deliverable artifacts: ${missing.join(', ')}`;
      ledger.completePhase(8, 'FAILED', { missingArtifacts: missing }, [], [], [evalResults.deliveryError]);
    }
    const exported = ledger.finalizeAndExport(ctx.evidenceDir);
    evalResults.evidenceLogPath = exported.jsonPath;
    evalResults.evidenceSummaryPath = exported.mdPath;
    evalResults.evidenceHealth = exported.payload.health;
  }


  const workflowSteps = _buildWorkflowSteps(ctx);

  if (JSON_MODE) {
    const traceId = ledger?.traceId || `TRACE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const provenanceTrace = _buildProvenanceTrace(ctx, traceId);
    const tracePayloads = _buildTracePayloads(ctx);

    const isMathClean = evalResults.isMathClean === true && (!evalResults.missingDependencies || evalResults.missingDependencies.length === 0);

    const jsonResult = {
      status: evalResults.deliveryError ? 'ERROR' : (evalResults.evidenceHealth?.workflowStatus === 'COMPLETE' ? 'SUCCESS' : 'ACTION_REQUIRED'),
      data: {
        traceId,
        provenanceTrace,
        inputFile,
        chassisDir,
        chassisPrefix,
        chassisDetection,
        notebookId,
        tracePayloads,
        outputReportPath: outputPath,
        evidenceLogPath: evalResults.evidenceLogPath || null,
        evidenceSummaryPath: evalResults.evidenceSummaryPath || null,
        googleDriveDeliverable: evalResults.googleDriveDeliverable || null,
        buildStatus: isMathClean ? 'LOCAL_RULE_CHECKED' : 'ACTION_REQUIRED',
        itemCount: items.length,
        items,
        workflowSteps,
        parsedSheets: [
          { sheetName: 'BOQ_Main_Quote', itemCount: items.length, status: 'PARSED' }
        ],
        telemetry: {
          parsingTimeMs: stage1ParsingMs,
          aspectMathTimeMs: stage2AspectMathMs,
          ragTimeMs: stage3RAGMs,
          guardrailTimeMs: stage4GuardrailMs,
          matrixTimeMs: stage5MatrixMs,
          totalEvalTimeMs: Date.now() - startTime
        },
        ragAnswer: evalResults.ragAnswer || null,
        ragResult: evalResults.ragResult || null,
        notebookLmStatus: evalResults.notebookLmStatus || null,
        postFlowSync: evalResults.postFlowSync || null,
        needsActions: evalResults.evalSummary?.needsActions || [],
        requirementResolution: evalResults.requirementResolution || null,
        pcieTopology: evalResults.evalSummary?.pcie?.slotLayout || null,
        unsolicitedOptionalItems: evalResults.unsolicitedOptionalItems || [],
        totalUnsolicitedCostUsd: evalResults.totalUnsolicitedCostUsd || 0,
        aspectChecks: evalResults.aspectChecks || [],
        stageBreakdown: evalResults.stageBreakdown || {},
        evalResults: {
          ...evalResults,
          notebookLmStatus: evalResults.notebookLmStatus || null,
          postFlowSync: evalResults.postFlowSync || null,
          needsActions: evalResults.evalSummary?.needsActions || [],
          unsolicitedOptionalItems: evalResults.unsolicitedOptionalItems || [],
          totalUnsolicitedCostUsd: evalResults.totalUnsolicitedCostUsd || 0,
          aspectChecks: evalResults.aspectChecks || [],
          stageBreakdown: evalResults.stageBreakdown || {},
          provenanceTrace
        },
        clusterSizing: evalResults.clusterSizing || null,
        chassisDefaults: evalResults.chassisDefaults || [],
        redundantDefaults: evalResults.redundantDefaults || [],
        opinionDiscrepancies: evalResults.opinionDiscrepancies || [],
        conflictGraph: {
          chassisInfo: graph.chassisInfo,
          workloadDna: graph.workloadDna,
          isWholeSolutionValid: graph.isWholeSolutionValid,
          totalRulesEvaluated: graph.totalRulesEvaluated,
          conflicts: graph.conflicts,
          resolvedFixes: graph.resolvedFixes,
          rankedSolutions: graph.rankedSolutions,
          recommendedSolutions: evalResults.conflictGraph?.recommendedSolutions || [],
          auditLog: graph.auditLog,
          rulesSource: graph.rulesSource,
          isFallbackSource: graph.isFallbackSource
        },
        budgetOptimization: budgetOpt,
        notebookPayload: queryPayload,
        multiRankWorkbookPath: evalResults.multiRankWorkbookPath || null,
        multiRankCsvPath: evalResults.multiRankCsvPath || null,
        ephemeralSourceValidation: evalResults.ephemeralSourceValidation || null,
        durationMs: Date.now() - startTime
      }
    };
    emitProgress(10, 10, 'Evaluation Finished', 'completed', `Analysis status: ${jsonResult.status}. Consult evidence health for outstanding gates.`);
    process.stdout.write('\n__EVAL_RESULT_JSON__' + JSON.stringify(jsonResult) + '__EVAL_RESULT_JSON__\n');
  } else {
    console.log(`\n===============================================================`);
    console.log(`✅ EVALUATION COMPLETE! Deliverables generated:`);
    console.log(`📄 Markdown Report:              ${toClickableFileUri(outputPath)}`);
    if (evalResults.multiRankWorkbookPath) {
      console.log(`📊 Multi-Rank Solution Matrix:   ${toClickableFileUri(evalResults.multiRankWorkbookPath)}`);
    }
    if (evalResults.multiRankCsvPath) {
      console.log(`📄 Token-Dense Solution CSV:     ${toClickableFileUri(evalResults.multiRankCsvPath)}`);
    }
    if (evalResults.proposalWorkbookPath) {
      console.log(`💼 Customer Proposal Sheet:      ${toClickableFileUri(evalResults.proposalWorkbookPath)}`);
    }
    if (evalResults.portalWorkbookPath) {
      console.log(`🏢 Partner Portal Upload Sheet:  ${toClickableFileUri(evalResults.portalWorkbookPath)}`);
    }
    if (evalResults.evidenceSummaryPath) {
      console.log(`🛡️ Evidence Ledger Summary:      ${toClickableFileUri(evalResults.evidenceSummaryPath)}`);
    }
    console.log(`===============================================================\n`);
  }
}

module.exports = {
  generateMarkdownReport,
  handleGoogleDriveUpload,
  serializeAndExportResults
};
