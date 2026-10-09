---
name: antigravity-cli-orchestration
description: Delegate authorized coding, testing and review work to Antigravity through the agy CLI, with bounded briefs, isolated files, verified receipts and efficient conversation continuation. Use when coordinating agy with Codex, not for ordinary Gemini API or NotebookLM requests.
---

# Antigravity CLI orchestration

Use Antigravity as an execution partner with inspectable outputs. Codex retains the original objective, architectural decisions, integration and acceptance. Delegation must advance the requested solution, not merely generate more plans, tests or receipts.

## Discover once, retain the facts

At first use on a machine, inspect `Get-Command agy -All`, `agy --help` and `agy models`. Record the executable, supported arguments and chosen model in the task record. Repeat discovery when the installation changes or an invocation fails, rather than on every assignment.

The user's preference observed on 7 October 2026 is **Gemini 3.8 Flash High**, exposed as `gemini-3.8-flash-high`. Verify availability; an explicit later user preference takes precedence. Do not silently switch providers, models or reasoning levels.

Read [CLI operation and evidence](references/cli-operation.md) for invocation, timeout and receipt details. These are locally observed behaviors, not promises about future CLI versions.

## Choose work by dependency and risk

- Delegate bounded implementation against agreed interfaces, fixtures, affected tests, reference/caller audits, documentation and evidence reconciliation. Larger available context is useful for genuinely cross-cutting source analysis, not a reason to resend everything.
- Keep uncertain architecture, business semantics, cross-path integration and final requirement coverage with Codex. Delegate preparation and counterexample generation for those decisions.
- A capable Antigravity reviewer can independently verify Codex-authored critical changes. Codex can independently verify Antigravity-authored changes. Distinguish author, verifier and integrator; an agent's self-check does not become independent review through a renamed receipt.
- Parallelize independent dependencies in separate writable copies. Keep one writer for each shared checkout. Start with a bounded calibration task, then expand concurrency when the results justify it; reduce concurrency when state conflicts or duplicate work appear.
- Reuse existing approved work. Ask for only the missing step of an interrupted assignment. Do not repeatedly restart audits or build extra orchestration machinery instead of finishing the product.

## Give a compact execution contract

Each brief should contain:

1. **Outcome and scope:** the concrete result, dependency gate and stopping point.
2. **Inputs:** exact candidate/receipt locations, relevant source hashes and specific files to inspect. Link to history instead of pasting it.
3. **Writes:** one allowed workspace, explicit read-only inputs and any approved external effects. Existing user authorization carries forward within its scope; this skill grants none by itself.
4. **Acceptance:** relevant checks, semantic invariants, expected intentional differences and what failure means. Authorize fixing ordinary local setup problems, but preserve failed logs.
5. **Return:** changed files/hashes, raw evidence paths, commands/exits/test counts, reused versus new checks, unresolved findings, checks not run and precise verdict.

Define contracts and failure outcomes before delegating implementation. Require source ownership, quantity scope, result status or other domain facts only when the task actually depends on them. Do not turn one project's rules into universal requirements.

## Control context and retries

Set and verify the actual CLI working directory to the assigned task workspace before launching. A prompt naming the directory does not change cwd: one review wrote relative artifacts into the parent Temp directory. Prepare the directory first, then use the executor workdir or Push-Location. Require absolute receipt/log paths in the brief.

Use a prompt file passed as one CLI argument. Keep full logs on disk; inspect summaries, tails and specific failing sections. Avoid whole-repository dumps, repeated large manifests and full conversation history. Copy only inputs required by the task, preserving their dependency bindings.

For evidence-only reconciliation, prepare a compact index deterministically in Codex and make the assignment read-only: no repository copy and no completed test reruns. Repeated local reviews spent substantial model context copying and rediscovering inputs despite test runtimes of seconds. For implementation/review that requires execution, prepare the minimal isolated copy once and identify the exact remaining checks before dispatch.

Use the same conversation for a correction to the same task; start a fresh bounded conversation for unrelated work or when accumulated context is no longer useful. Send a concrete discrepancy and the minimum next action, not “try harder.” Preserve what passed and rerun only checks invalidated by changes or unresolved evidence. Reserve broad regression for stable integration boundaries.

If work expands beyond the brief, return it to the acceptance criteria. If quota is exhausted, retain artifacts and assign other feasible work; do not loop retries or switch models without authorization. Evaluate efficiency through accepted scope and rework, not optimistic token-saving claims. CLI usage categories may include cached or cumulative counts; label them rather than adding them blindly.

## Verify, integrate and learn

Treat prose and verdict fields as claims. Inspect the actual diff, verify hashes against the candidate and executed copy, read relevant raw results, and confirm that tests exercised the required behavior. Zero matching subtests or a file-level wrapper pass is not scenario coverage.

Generate prose hashes/counts from the same structured receipt and manifest comparison; manually copied hashes and incomplete allowed-delta lists have drifted. Match each test name to its assertions: controls titled double-registration and stored-error identity once exercised only legacy fallback. Preserve the passing checks but credit only their actual scope.

Separate **authored**, **independently reviewed**, **integrated**, **activated** and **end-to-end accepted**. An approved isolated helper does not close an entire workflow. Before integration, verify current preimages and applicable shared-state/protected-output constraints; after integration, inspect actual changed files and run only newly necessary checks.

Maintain a small durable assignment record: owner/role, model, workspace, conversation ID, process/tool handle, state, receipts, next action and limits. Do not mistake an old PID or status file for a live process. Preserve original failures and explicitly supersede them with corrected evidence.

When real execution exposes a recurring CLI or delegation problem, update this skill with the demonstrated correction. Keep project checkpoint history in the project's ledger, not in this reusable skill. Never claim “perfect”; prove the requested outcomes and disclose remaining uncertainty.
