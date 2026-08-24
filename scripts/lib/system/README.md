# System Utilities & Infrastructure (`scripts/lib/system/`)

## 1. Purpose & Scope
Provides system-level infrastructure including pipeline telemetry logging, atomic file operations, smart FIFO API key rotation, Zod runtime validation schemas, and standardized error envelopes.

## 2. Key Modules & Functions
| Module | Main Exports | Purpose |
|---|---|---|
| `telemetry.js` | `recordTelemetryStep()`, `flushTelemetry()` | Logs step-by-step pipeline execution times, token usage, and status badges to `pipeline_telemetry.json`. |
| `fs_compat.js` | `safeWriteJsonAtomic()`, `safeReadJson()` | Atomic JSON read/write operations using temporary file swap to prevent corruption during concurrent runs. |
| `gemini_rotator.js` | `getRotator()`, `withRotatingKey()` | Smart deterministic FIFO key rotator that demotes rate-limited keys and restores them upon UTC midnight rollover. |
| `schemas.js` | `CatalogSchema`, `EvaluationSchema`, etc. | Zod runtime type assertions validating all pipeline input/output contracts. |
| `data_validator.js` | `validateCatalogData()` | Performs deep invariant assertions on parsed catalog trees. |
| `error_envelope.js` | `wrapError()`, `createErrorEnvelope()` | Standardized error payload formatting across all backend routes and CLI tools. |
| `pipeline_logger.js` | `logger.info()`, `logger.error()` | Structured console and file logger with microsecond timestamps. |
| `progress.js` | `createProgressTracker()` | SSE progress tracker emitting real-time percentage and stage updates to dashboard UI. |

## 3. Mandatory Rule
- **Atomic File Writes**: NEVER use bare `fs.writeFileSync` for JSON outputs. Always use `safeWriteJsonAtomic` from `fs_compat.js`.
