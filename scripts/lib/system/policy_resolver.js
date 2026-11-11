'use strict';
/**
 * scripts/lib/system/policy_resolver.js — Canonical Server-Side Execution Policy Resolver
 *
 * Enforces P0 local-only precedence:
 *   Server OFFLINE_MODE / LOCAL_EVAL_ONLY (/ USE_LOCAL_RAG_ONLY for notebook routes)
 *   > Inherited serverEnforced (or locked inherited offline policy)
 *   > Fail-closed client local-only (offline / offlineMode = true)
 *   > Inherited run offline policy
 *   > Explicit client cloud opt-in (offline = false / enableCloudValidation = true)
 *   > Caller default (defaultOffline)
 */

function isTruthyFlag(value) {
  if (typeof value === 'boolean') return value;
  const norm = String(value || '').trim().toLowerCase();
  return norm === 'true' || norm === '1';
}

function isFalsyFlag(value) {
  if (typeof value === 'boolean') return !value;
  const norm = String(value || '').trim().toLowerCase();
  return norm === 'false' || norm === '0';
}

function parseOptionalBool(value) {
  if (value === undefined || value === null || value === '') return undefined;
  if (isTruthyFlag(value)) return true;
  if (isFalsyFlag(value)) return false;
  return undefined;
}

function parseClientOfflineFlags(clientOffline, clientOfflineMode) {
  const first = parseOptionalBool(clientOffline);
  const second = parseOptionalBool(clientOfflineMode);
  if (first === true || second === true) return true;
  if (first === false || second === false) return false;
  return undefined;
}

function isServerOffline({ includeRagOnly = false } = {}) {
  const coreOffline = isTruthyFlag(process.env.OFFLINE_MODE) || isTruthyFlag(process.env.LOCAL_EVAL_ONLY);
  if (coreOffline) return true;
  if (includeRagOnly && isTruthyFlag(process.env.USE_LOCAL_RAG_ONLY)) return true;
  return false;
}

function buildPolicyEnvelope(offline, serverEnforced, source, clientRequestedOffline) {
  return {
    offline,
    offlineMode: offline,
    serverEnforced,
    source,
    clientRequestedOffline,
    ocrAllowed: !offline,
    cloudGroundingAllowed: !offline,
    resolvedAt: new Date().toISOString()
  };
}

/**
 * Resolve effective execution policy before preprocessing, routing, OCR, or NotebookLM dispatch.
 *
 * @param {object} [params]
 * @returns {object} effectivePolicy
 */
function resolveEffectivePolicy({
  clientOffline,
  clientOfflineMode,
  enableCloudValidation,
  inheritedPolicy = null,
  defaultOffline = false,
  includeRagOnly = false,
  lockInheritedOffline = false
} = {}) {
  const parsedClientOffline = parseClientOfflineFlags(clientOffline, clientOfflineMode);
  const clientCloudEnable = parseOptionalBool(enableCloudValidation) === true;

  if (isServerOffline({ includeRagOnly })) {
    return buildPolicyEnvelope(
      true,
      true,
      'SERVER_ENFORCED',
      parsedClientOffline ?? (clientCloudEnable ? false : null)
    );
  }

  if (inheritedPolicy?.serverEnforced === true || (lockInheritedOffline && inheritedPolicy?.offline === true)) {
    return buildPolicyEnvelope(
      true,
      Boolean(inheritedPolicy.serverEnforced),
      inheritedPolicy.source || 'INHERITED_RUN_POLICY',
      parsedClientOffline ?? null
    );
  }

  if (parsedClientOffline === true) {
    return buildPolicyEnvelope(true, false, 'CLIENT_LOCAL_ONLY', true);
  }

  if (parsedClientOffline === undefined && !clientCloudEnable && inheritedPolicy?.offline === true) {
    return buildPolicyEnvelope(true, false, inheritedPolicy.source || 'INHERITED_RUN_POLICY', null);
  }

  if (parsedClientOffline === false || clientCloudEnable) {
    return buildPolicyEnvelope(false, false, 'CLIENT_CLOUD_ENABLED', false);
  }

  const fallbackOffline = Boolean(defaultOffline);
  return buildPolicyEnvelope(
    fallbackOffline,
    false,
    fallbackOffline ? 'DEFAULT_LOCAL_SAFE' : 'DEFAULT_CLOUD_PERMITTED',
    null
  );
}

module.exports = {
  isTruthyFlag,
  isFalsyFlag,
  parseOptionalBool,
  parseClientOfflineFlags,
  isServerOffline,
  resolveEffectivePolicy
};
