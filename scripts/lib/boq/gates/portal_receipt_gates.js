'use strict';
/**
 * scripts/lib/boq/gates/portal_receipt_gates.js — Live Portal Receipt & CLIC Evidence Gate (B19 / INV-0 / INV-104)
 */

const fs = require('fs');
const { readPortalReceipt, receiptMatches } = require('../portal_receipt.js');
const { makeCheck } = require('./gate_check_builder.js');

function _resolvePortalClaimStatus(output, context, ACCEPTANCE_STATUSES) {
  const outStatus = output?.portalValidationStatus;
  const ctxStatus = context?.portalValidationStatus;
  const outClaiming = Boolean(outStatus && ACCEPTANCE_STATUSES.has(outStatus));
  const ctxClaiming = Boolean(ctxStatus && ACCEPTANCE_STATUSES.has(ctxStatus));
  const clicValid = output?.clicValidation?.isValid === true || context?.clicValidation?.isValid === true;
  const hasConflict = Boolean(outStatus && ctxStatus && outClaiming !== ctxClaiming);
  const isClaimingVendorAcceptance = outClaiming || ctxClaiming || clicValid;
  const portalStatus = outStatus || ctxStatus || (clicValid ? 'CLIC_ACCEPTED' : 'PORTAL_VALIDATION_PENDING');

  return {
    outStatus,
    ctxStatus,
    outClaiming,
    ctxClaiming,
    clicValid,
    hasConflict,
    isClaimingVendorAcceptance,
    portalStatus
  };
}

function _resolveReceiptObject(rawReceipt, portalStatus, clicValid) {
  if (!rawReceipt || typeof rawReceipt === 'boolean' || typeof rawReceipt === 'number') {
    return {
      errorCheck: makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        'Output claims vendor acceptance or CLIC valid, but lacks official session receipt from outputs/history/oca_sessions/ (INV-0).',
        { portalStatus, clicValid, receipt: null })
    };
  }

  let receiptObj = null;

  if (typeof rawReceipt === 'string') {
    const receiptPath = rawReceipt.trim();
    if (!receiptPath || receiptPath.includes('\0')) {
      return {
        errorCheck: makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
          'Invalid session receipt path.', { portalStatus, receipt: receiptPath })
      };
    }
    if (!fs.existsSync(receiptPath)) {
      return {
        errorCheck: makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
          `Session receipt path does not exist on disk: ${receiptPath}.`,
          { portalStatus, clicValid, receipt: receiptPath })
      };
    }

    try {
      const stats = fs.statSync(receiptPath);
      if (stats.isDirectory()) {
        receiptObj = readPortalReceipt(receiptPath);
        if (!receiptObj) {
          return {
            errorCheck: makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
              `Receipt directory does not contain complete, fresh, verified CLIC evidence: ${receiptPath}.`,
              { portalStatus, receipt: receiptPath })
          };
        }
      } else {
        const fileContent = fs.readFileSync(receiptPath, 'utf-8');
        receiptObj = JSON.parse(fileContent);
      }
    } catch (parseErr) {
      return {
        errorCheck: makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
          `Failed to parse session receipt evidence: ${parseErr.message}.`,
          { portalStatus, receipt: receiptPath })
      };
    }
  } else if (typeof rawReceipt === 'object') {
    receiptObj = rawReceipt;
  }

  if (!receiptObj || typeof receiptObj !== 'object' || Array.isArray(receiptObj) || Object.keys(receiptObj).length === 0) {
    return {
      errorCheck: makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        'Session receipt object is empty or missing required verification fields.',
        { portalStatus, clicValid, receipt: rawReceipt })
    };
  }

  return { receiptObj };
}

function _validateReceiptContent(receiptObj, portalStatus, clicValid, ACCEPTANCE_STATUSES, context, output) {
  const statusStr = String(receiptObj.status || '').toUpperCase();
  if (statusStr === 'READY' || statusStr === 'SESSION_READY' || statusStr === 'NAVIGATED' || receiptObj.isReadinessOnly === true) {
    return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
      `Session readiness receipt ({status: "${receiptObj.status}"}) does not constitute final vendor configuration acceptance.`,
      { portalStatus, receiptStatus: receiptObj.status });
  }

  const hasAcceptanceEvidence = Boolean(
    ACCEPTANCE_STATUSES.has(statusStr) ||
    receiptObj.manifestSha256 ||
    (Array.isArray(receiptObj.rows) && receiptObj.rows.length > 0)
  );

  if (!hasAcceptanceEvidence) {
    return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
      'Session receipt object is missing required verification fields (status or manifestSha256).',
      { portalStatus, clicValid, receipt: receiptObj });
  }

  const captureTime = receiptObj.capturedAt || receiptObj.validatedAt;
  if (captureTime) {
    const parsedTs = Date.parse(captureTime);
    if (!Number.isFinite(parsedTs) || parsedTs > Date.now() + 60000) {
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        'Session receipt timestamp is invalid or recorded in the future.',
        { portalStatus, captureTime });
    }
    if (statusStr === 'CLIC_ACCEPTED' && Date.now() - parsedTs > 24 * 3600000 && !context.allowHistoricalReceipt) {
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        'Session receipt is stale (>24h since live vendor capture). Fresh portal validation required.',
        { portalStatus, captureTime });
    }
  }

  const candidateItems = output?.items || context?.items || output?.skuPartsList || context?.skuPartsList;
  if (receiptObj.rows && Array.isArray(candidateItems) && candidateItems.length > 0) {
    const isMatched = receiptMatches(receiptObj, { ...output, items: candidateItems }, context);
    if (!isMatched) {
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        'Captured portal receipt does not match candidate BOM manifest, scope, or chassis identity.',
        { portalStatus, candidateCount: candidateItems.length });
    }
  }

  return null;
}

function _resolveProcessControlOverride(source, output, context, processControl) {
  const pcApproval = source?.processControlApproval || output?.processControlApproval || context?.processControlApproval || null;
  const smartFormExceptionId = String(pcApproval?.exceptionId || '').trim() || null;
  const processControlOverrideApproved = Boolean(processControl > 0 && pcApproval?.approved === true && smartFormExceptionId);
  return {
    smartFormExceptionId,
    processControlOverrideApproved,
    unresolvedProcessControl: processControlOverrideApproved ? 0 : processControl
  };
}

function _normalizeClicEvidence(output, context) {
  const liveClic = output?.liveClicValidation || context?.liveClicValidation || output?.clicValidation || context?.clicValidation || null;
  const bomClic = output?.clicStatusSummary || context?.clicStatusSummary || null;
  const source = liveClic || bomClic || {};
  const unbuildables = Number(source.unbuildablesCount ?? source.unbuildables ?? source.unbuildableCount ?? 0);
  const errors = Number(source.errorsCount ?? source.errors ?? source.errorCount ?? 0);
  const processControl = Number(source.processControlCount ?? source.processControl ?? 0);
  const warnings = Number(source.warningsCount ?? source.warnings ?? source.warningCount ?? 0);
  const ruleIds = Array.isArray(source.warningRuleIds) ? source.warningRuleIds : [];
  const ucid = source.ucid || null;
  const {
    smartFormExceptionId,
    processControlOverrideApproved,
    unresolvedProcessControl
  } = _resolveProcessControlOverride(source, output, context, processControl);
  const hasFailures = unbuildables > 0 || errors > 0 || unresolvedProcessControl > 0;
  const hasEvidence = Boolean(liveClic || bomClic?.portalValidatedFromBom || (bomClic?.hasClicStatusColumn && (hasFailures || processControl > 0)));
  return {
    liveClic, bomClic, unbuildables, errors, processControl,
    unresolvedProcessControl, processControlOverrideApproved, smartFormExceptionId,
    warnings, ruleIds, ucid, hasFailures, hasEvidence
  };
}

function _checkPortalReceiptIntegrity(output, context = {}) {
  const ACCEPTANCE_STATUSES = new Set([
    'ACCEPTED_BY_VENDOR',
    'CLIC_ACCEPTED',
    'CORRECTED_CANDIDATE_CLIC_ACCEPTED',
    'VERIFIED',
    'VENDOR_ACCEPTED'
  ]);

  const claim = _resolvePortalClaimStatus(output, context, ACCEPTANCE_STATUSES);

  if (claim.hasConflict) {
    return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
      `Conflicting portal validation claims between output (${claim.outStatus}) and context (${claim.ctxStatus}). Evidence verification fails closed.`,
      { outStatus: claim.outStatus, ctxStatus: claim.ctxStatus });
  }

  if (!claim.isClaimingVendorAcceptance) {
    const ev = _normalizeClicEvidence(output, context);
    const BOM_VALIDATED_STATUSES = new Set([
      'PORTAL_VALIDATED',
      'PORTAL_VALIDATED_WITH_WARNINGS',
      'PORTAL_VALIDATED_WITH_PC_OVERRIDE'
    ]);
    const claimsBomValidated = BOM_VALIDATED_STATUSES.has(claim.outStatus) || BOM_VALIDATED_STATUSES.has(claim.ctxStatus);
    if (claimsBomValidated && !ev.hasEvidence) {
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        `Output claims ${claim.outStatus || claim.ctxStatus} without live CLIC check or BOM CLIC Status column evidence.`,
        { portalStatus: claim.portalStatus });
    }
    if (ev.hasEvidence && ev.hasFailures) {
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
        `Portal CLIC validation reported ${ev.unbuildables} unbuildable(s), ${ev.errors} error(s), ${ev.unresolvedProcessControl} unresolved process control block(s).`,
        { portalStatus: 'PORTAL_VALIDATION_FAILED', liveClicValidation: ev.liveClic, clicStatusSummary: ev.bomClic });
    }
    if (ev.hasEvidence) {
      const resolvedStatus = ev.processControlOverrideApproved
        ? 'PORTAL_VALIDATED_WITH_PC_OVERRIDE'
        : (ev.warnings > 0 ? 'PORTAL_VALIDATED_WITH_WARNINGS' : 'PORTAL_VALIDATED');
      const ucidNote = ev.ucid ? ` (UCID ${ev.ucid})` : '';
      const rulesNote = ev.ruleIds.length ? ` [${ev.ruleIds.join(', ')}]` : '';
      const pcNote = ev.processControlOverrideApproved
        ? ` Approved SmartForm override ${ev.smartFormExceptionId} covers ${ev.processControl} Process Control (P+) block(s) for quote/partner release.`
        : '';
      return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'WARN', 'PASSED',
        `Portal CLIC validated${ucidNote}: 0 unbuildables, 0 errors, ${ev.unresolvedProcessControl} unresolved process control, ${ev.warnings} warning(s)${rulesNote}.${pcNote} Solution has no unbuildable errors; advisories surfaced.`,
        { portalStatus: resolvedStatus, portalValidated: true, smartFormExceptionId: ev.smartFormExceptionId, liveClicValidation: ev.liveClic, clicStatusSummary: ev.bomClic });
    }
    return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'WARN', 'NOT_APPLICABLE',
      'Live portal validation pending. Output appropriately marked as PORTAL VALIDATION PENDING (Tier 1/2).',
      { portalStatus: claim.portalStatus });
  }

  const rawReceipt = output?.sessionReceipt || context?.sessionReceipt || output?.sessionReceiptPath || output?.portalReceipt || context?.portalReceipt;
  const { receiptObj, errorCheck } = _resolveReceiptObject(rawReceipt, claim.portalStatus, claim.clicValid);
  if (errorCheck) {
    return errorCheck;
  }

  const contentError = _validateReceiptContent(receiptObj, claim.portalStatus, claim.clicValid, ACCEPTANCE_STATUSES, context, output);
  if (contentError) {
    return contentError;
  }

  if (!require('../portal_receipt').verifyCurrentPortalReceipt(output, context)) {
    return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'FAILED',
      'Fresh source captures and exact candidate scope/manifest could not be independently verified.');
  }

  return makeCheck('B19', 'Live Portal Validation & Receipt Integrity (INV-0)', 'BLOCK', 'PASSED',
    'Official vendor acceptance receipt verified against active session record.',
    { portalStatus: claim.portalStatus, receipt: receiptObj.status || 'VERIFIED', manifestSha256: receiptObj.manifestSha256 || null });
}

module.exports = {
  _resolvePortalClaimStatus,
  _resolveReceiptObject,
  _validateReceiptContent,
  _resolveProcessControlOverride,
  _normalizeClicEvidence,
  _checkPortalReceiptIntegrity
};
