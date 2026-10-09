'use strict';
const DEFAULT_QUERY_TIMEOUT_MS = 600000;
const DEFAULT_ONLINE_CHILD_TIMEOUT_MS = 1800000;
const DEFAULT_OFFLINE_CHILD_TIMEOUT_MS = 120000;

function positiveInteger(value, name) {
  if (value !== undefined && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new TypeError(`${name} must be a positive safe integer.`);
  }
}

function validateBudgetOptions(options = {}) {
  for (const key of ['queryTimeoutMs', 'childTimeoutMs', 'deadlineAt']) positiveInteger(options[key], key);
}

function deadlineError() {
  const error = new Error('NotebookLM query deadline exceeded');
  error.code = 'NOTEBOOK_QUERY_DEADLINE_EXCEEDED';
  return error;
}

function assertCallerActive(options, now = Date.now()) {
  if (options.signal?.aborted) throw options.signal.reason;
  validateBudgetOptions(options);
  if (options.deadlineAt !== undefined && now >= options.deadlineAt) throw deadlineError();
}

// Resolve once at logical-query entry; retries receive the same resulting deadline.
function logicalQueryOptions(options = {}, now = Date.now(), legacyDefault = DEFAULT_QUERY_TIMEOUT_MS) {
  assertCallerActive(options, now);
  const queryTimeoutMs = options.queryTimeoutMs ?? options.timeout ?? options.timeoutMs ?? legacyDefault;
  positiveInteger(queryTimeoutMs, 'queryTimeoutMs');
  const deadlineAt = Math.min(now + queryTimeoutMs, options.deadlineAt ?? Infinity);
  return { ...options, queryTimeoutMs, deadlineAt };
}

function childTimeout(options = {}, now = Date.now()) {
  assertCallerActive(options, now);
  positiveInteger(options.timeoutMs, 'timeoutMs');
  const duration = options.childTimeoutMs ?? options.timeoutMs ??
    (options.offline ? DEFAULT_OFFLINE_CHILD_TIMEOUT_MS : DEFAULT_ONLINE_CHILD_TIMEOUT_MS);
  return Math.min(duration, options.deadlineAt === undefined ? Infinity : options.deadlineAt - now);
}

function numericCliOption(args, flag) {
  const index = args.indexOf(flag);
  if (index < 0) return undefined;
  const value = Number(args[index + 1]);
  positiveInteger(value, flag);
  return value;
}

module.exports = { DEFAULT_QUERY_TIMEOUT_MS, DEFAULT_ONLINE_CHILD_TIMEOUT_MS, DEFAULT_OFFLINE_CHILD_TIMEOUT_MS,
  validateBudgetOptions, assertCallerActive, logicalQueryOptions, childTimeout, numericCliOption, deadlineError };
