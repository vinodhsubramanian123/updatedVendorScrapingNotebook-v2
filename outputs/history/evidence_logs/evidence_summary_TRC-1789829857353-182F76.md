# Antigravity Execution Trace & Shared State Evidence Log
**Trace ID:** `TRC-1789829857353-182F76` | **Chassis:** `UNKNOWN_CHASSIS` | **Duration:** 237ms
**Timestamp:** 2026-09-19T14:57:37.355Z to 2026-09-19T14:57:37.592Z
**Evidence health:** {"healthy":false,"gaps":["CHASSIS_NOT_IDENTIFIED","SKU_DECISIONS_MISSING"],"workflowStatus":"FAILED"}

## 1. Pipeline Execution Phases & Status
| Phase | Name | Status | Duration (ms) | Key Output |
| :--- | :--- | :---: | :---: | :--- |
| 1 | Intake, Ingestion & CTO Normalization | **FAILED** | 235ms | {} |
| 2 | Phase 2 | **NOT_REACHED** | 0ms | N/A |
| 3 | Phase 3 | **NOT_REACHED** | 0ms | N/A |
| 4 | Phase 4 | **NOT_REACHED** | 0ms | N/A |
| 5 | Phase 5 | **NOT_REACHED** | 0ms | N/A |
| 6 | Phase 6 | **NOT_REACHED** | 0ms | N/A |
| 7 | Phase 7 | **NOT_REACHED** | 0ms | N/A |
| 8 | Phase 8 | **NOT_REACHED** | 0ms | N/A |
| 9 | Phase 9 | **NOT_REACHED** | 0ms | N/A |

## 2. Active Knowledge Rules Reached & Applied (0)
*No specific delta overrides required; baseline catalog rules applied.*

## 3. SKU Audit Ledger Decisions (0)
| SKU | Action | Role | Rule ID | Rationale |
| :--- | :--- | :--- | :--- | :--- |

## 4. NotebookLM verification
```json
[]
```

## 5. Artifact fingerprints and delivery receipts
```json
[
  {
    "role": "CUSTOMER_INPUT",
    "filePath": "/tmp/test_single_config_1789829856635.json",
    "recordedAt": "2026-09-19T14:57:37.355Z",
    "exists": true,
    "sizeBytes": 235,
    "sha256": "b2cb2fa195934af0fc71160438c2972e00ac5f8493442c253ae2a7fb0bb26e49"
  }
]
```

## 6. Complete phase inputs, decisions, checks and outcomes
```json
{
  "phase_1": {
    "phaseNumber": 1,
    "phaseName": "Intake, Ingestion & CTO Normalization",
    "status": "FAILED",
    "startedAt": "2026-09-19T14:57:37.356Z",
    "completedAt": "2026-09-19T14:57:37.591Z",
    "durationMs": 235,
    "inputSummary": {
      "boqFile": "/tmp/test_single_config_1789829856635.json"
    },
    "outputSummary": {},
    "checks": [],
    "warnings": [],
    "errors": [
      "Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_2": {
    "phaseNumber": 2,
    "phaseName": "Phase 2",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_3": {
    "phaseNumber": 3,
    "phaseName": "Phase 3",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_4": {
    "phaseNumber": 4,
    "phaseName": "Phase 4",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_5": {
    "phaseNumber": 5,
    "phaseName": "Phase 5",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_6": {
    "phaseNumber": 6,
    "phaseName": "Phase 6",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_7": {
    "phaseNumber": 7,
    "phaseName": "Phase 7",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_8": {
    "phaseNumber": 8,
    "phaseName": "Phase 8",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  },
  "phase_9": {
    "phaseNumber": 9,
    "phaseName": "Phase 9",
    "status": "NOT_REACHED",
    "startedAt": null,
    "completedAt": null,
    "durationMs": 0,
    "inputSummary": {},
    "outputSummary": null,
    "checks": [],
    "warnings": [],
    "errors": [
      "Pipeline aborted due to upstream failure in phase 1: Could not auto-detect chassis. Please confirm the chassis variant."
    ]
  }
}
```