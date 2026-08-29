---
name: jules-autonomous-protocol
description: End-to-end autonomous Google Jules multi-agent delegation, boundary-isolated task dispatch, proactive heartbeat tracking, two-way unblocking protocol, patch extraction, and PR verification.
---

# Google Jules Autonomous Multi-Agent Protocol & Delegation Engine

## 1. Overview & Core Philosophy
This skill codifies the complete, battle-tested protocol for pairing Antigravity AI (the Lead Architect & Governance Agent) with **Google Jules** (the Autonomous Background Review & Test Generation Agent).

**Core Axiom**: The human developer is NEVER a relay or middleman between agents. Antigravity autonomously breaks down complex problems into laser-focused tasks, delegates them to Jules, monitors their progress via heartbeat wakeups, unblocks pending questions, extracts code patches, certifies 100% test passes, merges PRs into `main`, and prunes remote branches cleanly.

---

## 2. The 6-Stage Autonomous Multi-Agent Lifecycle

```
 ┌────────────────────────────────────────────────────────────────────────────┐
 │                  JULES AUTONOMOUS MULTI-AGENT LIFECYCLE                   │
 ├────────────────┬──────────────────┬──────────────────┬─────────────────────┤
 │    STAGE 1     │     STAGE 2      │     STAGE 3      │       STAGE 4       │
 │   Boundary     │  Proactive Cron  │ Two-Way Feedback │  Patch Extraction   │
 │ Decomposition  │  & Heartbeats    │ & Unblocking     │   & Local Audit     │
 ├────────────────┼──────────────────┴──────────────────┼─────────────────────┤
 │    STAGE 5     │               STAGE 6               │     INVARIANTS      │
 │  PR Merging &  │        Audit-Before-Archive         │  INV-10, 11, 12,    │
 │ Remote Pruning │         Session Lifecycle           │   15, 18, 19        │
 └────────────────┴─────────────────────────────────────┴─────────────────────┘
```

---

## 3. Stage 1: Laser-Focused Boundary Decomposition
Jules achieves maximum accuracy and throughput when tasks have clear, isolated boundaries rather than broad, monolithic requests.

### Guidelines for Defining Jules Tasks:
1. **Single Subsystem Focus**: Assign 1 subsystem or domain per session (e.g. Aspect Math, Strategy Fuzzing, Rotator Chaos, BOM Parser, Taxonomy).
2. **Explicit Target Files**: Specify exactly which files Jules should read and which test/source files it should create or modify.
3. **Deterministic Pass Criteria**: State the exact test execution command (`node --test tests/unit/...` and `npm run test:all`) and the requirement for 0 lint warnings (`npm run lint`).
4. **Clean Baseline**: Always check out and push the latest `main` commit before dispatching new Jules sessions so Jules works off the freshest codebase.

### Task Dispatch Template:
```bash
node scripts/services/jules_task_manager.js create "🧪 <Subsystem Name> Tests" \
  "You are hardening the <Subsystem Name>.
Your task is to create a dedicated test suite in tests/<tier>/test_<feature>.js covering <target files>.

Task Boundaries:
1. Test <Specific Function 1> with boundary inputs and edge cases.
2. Test <Specific Function 2> with error recovery and fallbacks.
3. Verify system invariants (e.g. INV-1 to INV-19).
4. Ensure 100% pass with node --test tests/<tier>/test_<feature>.js and npm run test:all."
```

---

## 4. Stage 2: Proactive Monitoring & Heartbeat Governance (INV-15)
Whenever an Antigravity AI Agent delegates work to Jules or has active sessions in flight:
- **Never go idle or wait for human prompts**: The agent MUST schedule proactive background timers using the `schedule` tool (`DurationSeconds=120-180`, `TimerCondition="never"`) or recurring cron jobs.
- **Heartbeat Action**: On each wakeup, scan active sessions via `node scripts/services/jules_task_manager.js list` and audit activity logs.
- **Continuous Oversight**: If sessions are in `inProgress`, re-schedule a timer. If sessions are in `awaitingUserFeedback`, unblock immediately. If completed, audit, certify, merge, prune, and archive.

---

## 5. Stage 3: Two-Way Autonomous Dialogue & Unblocking Protocol
When a Jules session enters `state: awaitingUserFeedback` or emits `agentMessaged`:
1. **Inspect Reasoning**: Read `activities.list()` via `scripts/services/jules_task_manager.js` to inspect Jules's exact question, findings, or proposals.
2. **Decisive Guidance**: Send a clear, actionable instruction back to the session without asking the human user:
   ```bash
   node scripts/services/jules_task_manager.js send <sessionId> "<Clear Decision & Instruction>"
   ```
3. **No Human Relaying**: Make architectural decisions autonomously based on repo guidelines, data dictionary schemas, and system invariants.
4. **Immediate Verification**: Once guidance is sent, confirm the session resumes `inProgress` status and track its delivery.
3. **No Human Relaying**: Make architectural decisions autonomously based on repo guidelines, data dictionary schemas, and system invariants.

---

## 6. Stage 4: Full Activity-Patch Audit & Local Integration (INV-12)
When a Jules session completes, fails due to turn limits, or creates unpushed commits:
- **Never assume code is only on a git branch**: Run `auditSession(sessionId)` to retrieve all `unidiffPatch` sets and authored files.
- **Direct Patch Extraction**: If Jules authored pristine test suites in its sandbox that were not committed to a branch, extract the file contents directly into `tests/` or `scripts/`.
- **Local Validation**: Run `node --test tests/...` locally, verify 0 failures, and run `npm run lint`.

---

## 7. Stage 5: PR Verification, Merging & Remote Branch Pruning (INV-10 & INV-11)
When Jules opens a Pull Request:
1. **Artifact Hygiene Check**: Inspect `git diff --stat` to verify no accidental build artifacts (e.g. `outputs/history/*.json` test dumps, temp logs) were committed (INV-7 & INV-10).
2. **Full Regression Certification**: Run all test tiers (`npm run test:all`, `npm test`, `npm run lint`).
3. **Integration into `main`**: Integrate verified changes and push to `origin/main`.
4. **Remote Branch Pruning (INV-11)**: Delete the remote feature branch immediately after integration:
   ```bash
   git push origin --delete <branch-name>
   ```

---

---

## 8. Stage 6: Audit-Before-Archive Session Lifecycle (INV-19)
Completed and integrated Jules sessions MUST NOT linger in the active query pool:
1. Execute `node scripts/services/jules_task_manager.js archive-completed` (or `npm run jules:archive`).
2. The task manager audits the session thread and patch deltas, logs structured telemetry to `outputs/history/jules_archived_sessions.json`, and calls `session.archive()` on the Jules API.

---

## 9. Stage 7: Post-Archive Final PR & Remote Ref Sweep (INV-20)
Due to potential race conditions where Jules pushes a branch or triggers a GitHub PR right as a session is concluding:
1. **Mandatory Final Sweep**: After archiving sessions, ALWAYS run a final sweep against GitHub REST API:
   ```bash
   node -e 'require("./scripts/services/jules_task_manager.js").listPullRequests("open").then(prs => console.log("Open PRs:", prs.length))'
   ```
2. **Fetch and Prune**: Run `git fetch origin --prune && npm run jules:prune`.
3. **Verify Zero Open**: Assert that `open_prs.length === 0` and `git branch -r` contains only `origin/main`.

---

## 10. Quick Reference CLI Commands

| Command | Purpose |
|---------|---------|
| `npm run jules:status` | List all active sessions and their current states |
| `npm run jules:prs` | List open/closed Pull Requests with branch mappings |
| `npm run jules:prune` | Cleanly prune merged or dangling remote feature branches |
| `npm run jules:archive` | Audit and archive all completed Jules sessions |
| `node scripts/services/jules_task_manager.js send <id> "<msg>"` | Send unblocking reply/instructions to a session |
| `node scripts/services/jules_task_manager.js audit <id>` | Extract activities, patches, and files from a session |

