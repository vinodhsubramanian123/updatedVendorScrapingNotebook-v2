# Normative Language Standard & RFC-2119 Precision Charter

## 1. Scope & Authority
This standard establishes binding linguistic rules for all skills in `.agents/skills/`, subagent prompts, and operational execution directives across the HPE ProLiant AI Studio BOQ Evaluator & Conflict Resolution Engine. Every agent and subagent operating in this repository MUST comply with the rules defined herein.

---

## 2. Strict RFC-2119 Terminology
In all skill procedures, checklists, and execution handoffs, the following capitalized terms carry strict definitions:

- **`MUST` / `REQUIRED` / `SHALL`**: Absolute requirement. Failure to satisfy this condition constitutes an unrecoverable violation; the agent MUST NOT proceed and MUST emit the corresponding `HALT` code immediately.
- **`MUST NOT` / `SHALL NOT`**: Absolute prohibition. Under no circumstances may this action be executed.
- **`SHOULD` / `RECOMMENDED`**: Mandatory default procedure. May only be deviated from if a valid, documented waiver or explicit customer instruction exists and is recorded in the trace ledger.
- **`SHOULD NOT` / `NOT RECOMMENDED`**: Prohibited default. Permitted only with explicit, documented architectural justification.
- **`MAY` / `OPTIONAL`**: Truly elective step. Execution is left to deterministic configuration flags, never agent guessing.

---

## 3. Banned Operational Words in Procedures
The following ambiguous "hedge" words are strictly prohibited in procedural steps, pre-flight checklists, and decision branches because they introduce agent hesitation, guessing, or arbitrary non-deterministic loops:

| Banned Term | Reason for Prohibition | Mandatory Replacement |
| :--- | :--- | :--- |
| **`appropriate`** | Leaves criteria undefined; agents hallucinate context. | State exact condition: *"if `aspect === 'power'`"* or *"matching chassis socket count"*. |
| **`as needed` / `when needed`** | Undefined trigger condition. | State specific trigger: *"when `totalDraw > psuWatts`"*. |
| **`etc.`** | Incomplete specification. | Enumerate full set or state *"and all remaining items in `context.items`"*. |
| **`consider`** | Passive suggestion without actionable directive. | State deterministic command: *"MUST evaluate alternative tier"* or *"escalate to next wattage tier"*. |
| **`typically` / `usually` / `generally`** | Probabilistic statement causing branch ambiguity. | State explicit rule or reference default parameter: *"By default, unless overridden by `--option`"*. |
| **`if possible`** | Leaves fallback behavior unspecified. | State primary action AND deterministic fallback: *"Attempt X; if X fails with ERR_Y, execute Z"*. |
| **`try to`** | Expresses tentative effort without error handling. | State action and error contract: *"Execute X; on failure, emit `[ERR_X_FAILED]`"*. |

---

## 4. Standardized HALT Condition Syntax
Every skill defining pre-flight checks, input validation, or operational boundaries MUST structure halt conditions using the standardized format:

```markdown
## ⛔ HALT Conditions

HALT-<PREFIX><NUM>: If <Specific Deterministic Condition>:
  emit [<ERR_CODE>] and HALT execution immediately.
  Remediation: <Deterministic Action or Explicit User Input Required>.
  Do NOT guess, loop infinitely, or assume unverified defaults.
```

Example:
```markdown
HALT-BOQ1: If context.items is empty or undefined:
  emit [ERR_EMPTY_BOQ_INPUT] and HALT execution immediately.
  Remediation: Provide a valid candidate hardware list or spreadsheet path.
```

---

## 5. Terminal Phase Execution Outcomes
Every phase in an evaluation, sizing, or reconciliation pipeline MUST terminate in one of five explicit statuses:

1. **`PASSED`**: All physical, mathematical, and grounded catalog checks succeeded with 100% compliance.
2. **`FAILED`**: Unrecoverable physical, electrical, or vendor conflict detected.
3. **`ACTION_REQUIRED`**: Remediation candidates derived; requires live portal acceptance or HITL confirmation.
4. **`SKIPPED`**: Phase was explicitly bypassed due to pipeline options (e.g., single-node tender skipping multi-cluster partitioning).
5. **`NOT_REACHED`**: Pipeline halted at an earlier phase prior to reaching this stage.

> [!CAUTION]
> No phase or asynchronous task MAY ever terminate with status `RUNNING`, `IN_PROGRESS`, or `undefined`. In-flight states must always resolve cleanly upon completion or timeout.

---

## 6. Up-Front Ambiguity Triage Standard (`INV-73` vs. `INV-98`)
To reconcile autonomous execution with zero hallucination:
- If an input contains **critical structural ambiguity** (e.g., completely unmapped server model, contradictory socket/chassis count, missing cluster multiplier where multiple interpretations differ by $>20\%$), the agent MUST clarify up-front in the initial turn before launching deep pipelines.
- If the input is **unambiguous or standard** (e.g., valid SKU list, recognizable chassis name like "DL380 Gen12", or standard RFP core/RAM requirements), the agent MUST NOT prompt or ask confirmation questions; it MUST classify and execute autonomously end-to-end.
