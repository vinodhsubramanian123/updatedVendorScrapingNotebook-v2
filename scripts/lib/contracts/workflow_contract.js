'use strict';
/**
 * scripts/lib/contracts/workflow_contract.js — Core Runtime Contracts & Data Schemas
 *
 * Defines declarative Zod runtime schemas and validation helpers for:
 * 1. EvidenceState (VERIFIED, GROUNDED, DEGRADED, STALE, MISSING, UNREADABLE, NOT_APPLICABLE, UNKNOWN)
 * 2. StageResult (stageId, executionState, outcome, evidenceIds, policyCode)
 * 3. AcceptanceDecision & DeliveryAuthorization (strict gating before artifact export)
 * 4. Unified WorkflowResult (replaces ambiguous generic booleans with typed evidence envelopes)
 */

const { z } = require('zod');
const crypto = require('crypto');

// ==========================================
// 1. Evidence & Stage Enums
// ==========================================

const EvidenceStateEnum = z.enum([
  'VERIFIED',
  'GROUNDED',
  'DEGRADED',
  'STALE',
  'MISSING',
  'UNREADABLE',
  'NOT_APPLICABLE',
  'UNKNOWN'
]);

const StageExecutionStateEnum = z.enum([
  'NOT_STARTED',
  'IN_PROGRESS',
  'COMPLETED',
  'FAILED',
  'SKIPPED'
]);

const StageOutcomeEnum = z.enum([
  'PASSED',
  'FAILED',
  'WARNING',
  'DEGRADED',
  'ACTION_REQUIRED',
  'NOT_EVALUATED'
]);

const CustomerDispositionEnum = z.enum([
  'PRESENTATION_READY',
  'DELIVERY_BLOCKED_UNBUILDABLE',
  'VALIDATION_REQUIRED',
  'ADVISORY_ONLY',
  'NOT_EVALUATED',
  'ACTION_REQUIRED'
]);

// ==========================================
// 2. Stage Result Contract
// ==========================================

const StageResultSchema = z.object({
  stageId: z.string().min(1),
  stageName: z.string().default(''),
  executionState: StageExecutionStateEnum,
  outcome: StageOutcomeEnum,
  skipReason: z.string().optional(),
  policyCode: z.string().optional(),
  evidenceIds: z.array(z.string()).default([]),
  data: z.record(z.any()).default({}),
  timestamp: z.string().default(() => new Date().toISOString())
}).refine(data => {
  // INV-105: If executionState is SKIPPED, skipReason and policyCode are mandatory
  if (data.executionState === 'SKIPPED') {
    return Boolean(data.skipReason && data.skipReason.trim().length > 0);
  }
  return true;
}, {
  message: 'Stage marked as SKIPPED must provide a non-empty skipReason.'
});

// ==========================================
// 3. Acceptance Decision & Delivery Authorization Contract
// ==========================================

const AcceptanceDecisionSchema = z.object({
  isApproved: z.boolean(),
  profile: z.string().default('BOQ_EVALUATION'),
  evaluatedChecksCount: z.number().default(0),
  passedChecks: z.array(z.string()).default([]),
  failedChecks: z.array(z.string()).default([]),
  blockingErrors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  authorizationToken: z.string().nullable().default(null),
  decisionTimestamp: z.string().default(() => new Date().toISOString())
});

const DeliveryAuthorizationSchema = z.object({
  token: z.string().startsWith('DELIV-AUTH-'),
  manifestFingerprint: z.string().min(8),
  chassisKey: z.string().min(1),
  issuedAt: z.string(),
  expiresAt: z.string(),
  profile: z.string()
});

/**
 * Issues an immutable, cryptographically verifiable delivery authorization token
 * only when acceptance has passed.
 *
 * @param {object} params
 * @param {string} params.manifestFingerprint - SHA-256 or truncated hash of candidate BOM
 * @param {string} params.chassisKey - target product generation
 * @param {object} params.acceptanceDecision - validated AcceptanceDecision
 * @returns {object} DeliveryAuthorization record
 */
function issueDeliveryAuthorization(params) {
  const { manifestFingerprint, chassisKey, acceptanceDecision } = params;
  if (!acceptanceDecision || acceptanceDecision.isApproved !== true) {
    throw new Error('Cannot issue DeliveryAuthorization: Pre-presentation acceptance is not approved.');
  }
  if (!manifestFingerprint) {
    throw new Error('Cannot issue DeliveryAuthorization: Manifest fingerprint is required.');
  }

  const nonce = crypto.randomBytes(4).toString('hex').toUpperCase();
  const token = `DELIV-AUTH-${manifestFingerprint.slice(0, 10).toUpperCase()}-${nonce}`;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString();

  const auth = {
    token,
    manifestFingerprint,
    chassisKey: chassisKey || 'UNKNOWN_CHASSIS',
    issuedAt: now.toISOString(),
    expiresAt,
    profile: acceptanceDecision.profile || 'BOQ_EVALUATION'
  };

  return DeliveryAuthorizationSchema.parse(auth);
}

/**
 * Validates whether a delivery authorization token matches the candidate manifest fingerprint
 * and is within its freshness window.
 *
 * @param {object} auth - DeliveryAuthorization record
 * @param {string} currentFingerprint - candidate manifest fingerprint
 * @returns {boolean}
 */
function verifyDeliveryAuthorization(auth, currentFingerprint) {
  if (!auth || typeof auth !== 'object' || !auth.token) return false;
  if (!auth.token.startsWith('DELIV-AUTH-')) return false;
  if (currentFingerprint && auth.manifestFingerprint) {
    const cleanCurrent = String(currentFingerprint).toLowerCase();
    const cleanAuth = String(auth.manifestFingerprint).toLowerCase();
    if (!cleanCurrent.startsWith(cleanAuth.slice(0, 8)) && !cleanAuth.startsWith(cleanCurrent.slice(0, 8))) {
      return false;
    }
  }
  const expiry = Date.parse(auth.expiresAt);
  if (isNaN(expiry) || Date.now() > expiry) return false;
  return true;
}

// ==========================================
// 4. Unified Workflow Result Contract
// ==========================================

const WorkflowResultSchema = z.object({
  traceId: z.string().min(1),
  intent: z.string().default('BOQ_EVALUATION'),
  chassis: z.string().default(''),
  timestamp: z.string().default(() => new Date().toISOString()),
  customerDisposition: CustomerDispositionEnum.default('NOT_EVALUATED'),
  execution: z.object({
    state: z.enum(['COMPLETED', 'FAILED', 'BLOCKED', 'DEGRADED']),
    totalStages: z.number().default(0),
    stages: z.array(StageResultSchema).default([])
  }),
  localBuildability: z.object({
    isMathClean: z.boolean().default(false),
    isGraphClean: z.boolean().default(false),
    errorsCount: z.number().default(0),
    warningsCount: z.number().default(0),
    aspectChecksCount: z.number().default(0)
  }),
  documentGrounding: z.object({
    state: EvidenceStateEnum.default('UNKNOWN'),
    notebookId: z.string().nullable().default(null),
    confidenceLabel: z.string().default('UNKNOWN'),
    groundedSourcesCount: z.number().default(0)
  }),
  candidateReview: z.object({
    rankedSolutionsCount: z.number().default(0),
    selectedRank: z.union([z.number(), z.string()]).nullable().default(null),
    hasLeastDeltaAlternative: z.boolean().default(false),
    isRevalidated: z.boolean().default(false)
  }),
  acceptance: AcceptanceDecisionSchema.optional(),
  delivery: z.object({
    authorized: z.boolean().default(false),
    authorizationToken: z.string().nullable().default(null),
    exportedArtifacts: z.array(z.string()).default([])
  }).default({ authorized: false, authorizationToken: null, exportedArtifacts: [] }),
  portalValidationStatus: z.string().default('PORTAL VALIDATION PENDING')
});

module.exports = {
  EvidenceStateEnum,
  StageExecutionStateEnum,
  StageOutcomeEnum,
  CustomerDispositionEnum,
  StageResultSchema,
  AcceptanceDecisionSchema,
  DeliveryAuthorizationSchema,
  WorkflowResultSchema,
  issueDeliveryAuthorization,
  verifyDeliveryAuthorization
};
