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
const fs = require('fs');
const path = require('path');

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
  // INV-105: If executionState is SKIPPED, BOTH skipReason and policyCode are mandatory
  if (data.executionState === 'SKIPPED') {
    const hasReason = Boolean(data.skipReason && data.skipReason.trim().length > 0);
    const hasPolicy = Boolean(data.policyCode && data.policyCode.trim().length > 0);
    return hasReason && hasPolicy;
  }
  return true;
}, {
  message: 'Stage marked as SKIPPED must provide both a non-empty skipReason and policyCode.'
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

// Offline authorization stays process-local. Persisted/cross-process delivery
// requires a privately provisioned DELIVERY_AUTH_SECRET, never a public constant.
if (!process.env.DELIVERY_AUTH_SECRET) {
  try {
    const dotenvPath = path.resolve(__dirname, '..', '..', '..', '.env');
    if (fs.existsSync(dotenvPath)) {
      const loaded = require('dotenv').config({ path: dotenvPath });
      if (loaded.error) throw loaded.error;
    }
  } catch {
    process.emitWarning('Delivery key configuration could not be loaded; a generated process-family key will be used if no key is configured.', { code: 'DELIVERY_KEY_CONFIGURATION_UNAVAILABLE' });
  }
}
if (!process.env.DELIVERY_AUTH_SECRET) {
  process.env.DELIVERY_AUTH_SECRET = crypto.randomBytes(32).toString('hex');
}
// Signing uses the configured string as-is; retain the same bytes if a caller
// later removes the environment variable (configured secrets need not be hex).
const DEFAULT_AUTH_SECRET = process.env.DELIVERY_AUTH_SECRET;

function getAuthSecret(customSecret) {
  return customSecret || process.env.DELIVERY_AUTH_SECRET || DEFAULT_AUTH_SECRET;
}

function computeDeliveryHmac(payload, secret = null) {
  const sec = getAuthSecret(secret);
  return crypto.createHmac('sha256', sec).update(payload).digest('hex');
}

const DeliveryAuthorizationSchema = z.object({
  token: z.string().startsWith('DELIV-AUTH-'),
  signature: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character SHA-256 hex HMAC'),
  manifestFingerprint: z.string().regex(/^[a-fA-F0-9]{64}$/, 'Must be a 64-character SHA-256 hex string'),
  chassisKey: z.string().min(1),
  issuedAt: z.string(),
  expiresAt: z.string(),
  profile: z.string()
});

/**
 * Issues an immutable, cryptographically verifiable delivery authorization token
 * bound to the candidate manifest SHA-256 fingerprint, scope, and pre-presentation acceptance.
 *
 * @param {object} params
 * @param {string} params.manifestFingerprint - Full 64-character SHA-256 hex string of candidate BOM
 * @param {string} params.chassisKey - target product generation / chassis name
 * @param {object} params.acceptanceDecision - validated AcceptanceDecision
 * @param {string} [params.secret] - optional custom HMAC signing secret
 * @returns {object} DeliveryAuthorization record
 */
function issueDeliveryAuthorization(params = {}) {
  const { manifestFingerprint, chassisKey, acceptanceDecision, secret } = params;
  if (!acceptanceDecision || acceptanceDecision.isApproved !== true) {
    throw new Error('Cannot issue DeliveryAuthorization: Pre-presentation acceptance is not approved.');
  }
  if (!manifestFingerprint || typeof manifestFingerprint !== 'string') {
    throw new Error('Cannot issue DeliveryAuthorization: Manifest fingerprint is required.');
  }

  const cleanFingerprint = manifestFingerprint.trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(cleanFingerprint)) {
    throw new Error(`Cannot issue DeliveryAuthorization: Manifest fingerprint must be a full 64-character SHA-256 hex string (received: "${manifestFingerprint}").`);
  }

  const now = new Date();
  const issuedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 3600 * 1000).toISOString();
  const cleanChassis = String(chassisKey || 'PROLIANT_SERVER').trim();
  const cleanProfile = String(acceptanceDecision.profile || 'BOQ_EVALUATION').trim();

  const payload = `${cleanFingerprint}:${cleanChassis}:${cleanProfile}:${issuedAt}:${expiresAt}`;
  const signature = computeDeliveryHmac(payload, secret);
  const token = `DELIV-AUTH-${signature}`;

  const auth = {
    token,
    signature,
    manifestFingerprint: cleanFingerprint,
    chassisKey: cleanChassis,
    issuedAt,
    expiresAt,
    profile: cleanProfile
  };

  return DeliveryAuthorizationSchema.parse(auth);
}

/**
 * Validates whether a delivery authorization token matches the candidate manifest fingerprint,
 * passes cryptographic HMAC signature verification, and is within its freshness window.
 *
 * @param {object} auth - DeliveryAuthorization record
 * @param {string} currentFingerprint - candidate manifest SHA-256 fingerprint
 * @param {object} [options]
 * @param {string} [options.chassisKey] - expected chassis key
 * @param {string} [options.profile] - expected evaluation profile
 * @param {string} [options.secret] - custom HMAC secret
 * @returns {boolean}
 */
function verifyDeliveryAuthorization(auth, currentFingerprint, options = {}) {
  if (!auth || typeof auth !== 'object') return false;
  const parseResult = DeliveryAuthorizationSchema.safeParse(auth);
  if (!parseResult.success) return false;

  if (!currentFingerprint || typeof currentFingerprint !== 'string') return false;
  const cleanCurrent = currentFingerprint.trim().toLowerCase();
  const cleanAuth = auth.manifestFingerprint.trim().toLowerCase();

  // Exact full 64-character SHA-256 hex match is strictly required (INV-128 / R-02)
  if (cleanCurrent.length !== 64 || cleanCurrent !== cleanAuth) {
    return false;
  }

  // Validate freshness window
  const expiry = Date.parse(auth.expiresAt);
  const issued = Date.parse(auth.issuedAt);
  if (isNaN(expiry) || isNaN(issued)) return false;
  const now = Date.now();
  if (expiry <= issued || expiry - issued > 3600000 || now >= expiry || now < (issued - 5000)) return false;

  // Validate chassisKey scope if specified
  if (options.chassisKey) {
    const expectedChassis = String(options.chassisKey).trim().toLowerCase().replace(/[\s-]+/g, '_');
    const authChassis = String(auth.chassisKey || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
    if (authChassis !== expectedChassis) return false;
  }

  // Validate profile scope if specified
  if (options.profile) {
    const expectedProfile = String(options.profile).trim();
    if (auth.profile !== expectedProfile) return false;
  }

  // Cryptographic tamper check (HMAC signature verification)
  const payload = `${cleanAuth}:${auth.chassisKey}:${auth.profile}:${auth.issuedAt}:${auth.expiresAt}`;
  const expectedSignature = computeDeliveryHmac(payload, options.secret);
  if (auth.token !== `DELIV-AUTH-${auth.signature}`) return false;

  try {
    const sigBuf = Buffer.from(auth.signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    if (sigBuf.length !== 32 || expBuf.length !== 32) return false;
    return crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

/**
 * Asserts that delivery authorization is valid before presentation export.
 * Throws a descriptive Error if verification fails.
 *
 * @param {object} auth - DeliveryAuthorization record
 * @param {string} currentFingerprint - candidate manifest SHA-256 fingerprint
 * @param {object} [options]
 */
function assertDeliveryAuthorization(auth, currentFingerprint, options = {}) {
  if (options.diagnostic === true || options.allowDiagnostic === true) {
    return true;
  }
  if (!auth) {
    throw new Error('Presentation export blocked: DeliveryAuthorization is missing. Pre-presentation acceptance and cryptographic authorization are required.');
  }
  if (!currentFingerprint) {
    throw new Error('Presentation export blocked: Current candidate manifest fingerprint is missing.');
  }
  const isValid = verifyDeliveryAuthorization(auth, currentFingerprint, options);
  if (!isValid) {
    throw new Error('Presentation export blocked: DeliveryAuthorization failed cryptographic verification (token mismatch, expired, or manifest altered).');
  }
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
  verifyDeliveryAuthorization,
  assertDeliveryAuthorization
};
