---
name: jules-autonomous-protocol
description: >-
  Definitive, zero-gap autonomous Google Jules multi-agent lifecycle.
  Covers: MCP-first tool usage, boundary task dispatch, proactive heartbeat cron,
  two-way unblocking with plan approval, code review & diff extraction,
  PR verification & merge, branch pruning, session archival, and new task creation.
  This skill eliminates ALL manual human relay and ensures the agent never goes idle.
---

# Google Jules Autonomous Multi-Agent Protocol (Definitive Edition)

## 1. Core Axiom & Failure Mode Catalog

**The human developer is NEVER a relay or middleman between agents.**

The following table catalogs every failure mode the user has repeatedly identified.
Each failure mode has a mandatory automated fix baked into the lifecycle stages below.

| # | Failure Mode (User Complaint) | Root Cause | Mandatory Fix |
|---|------|------------|---------------|
| F1 | Paused sessions not being resumed | Agent doesn't schedule heartbeat cron after dispatch | Stage 2: MANDATORY cron after EVERY dispatch |
| F2 | Sessions waiting for input not answered | Agent uses CLI `list` which masks `pendingPlan` | Stage 3: Use MCP `get_session_state` which returns `pendingPlan` and `lastAgentMessage` |
| F3 | PRs not reviewed or merged after session | Agent archives without checking PR/diff | Stage 5: MANDATORY `get_code_review_context` + `show_code_diff` BEFORE archive |
| F4 | Jules thread not reviewed after completion | Agent assumes 0 patches without checking | Stage 4: MANDATORY `get_code_review_context` with `format: "detailed"` |
| F5 | Branch pruned before work merged to main | Agent runs `prune` before local integration | Stage 6: Prune ONLY AFTER merge to main is verified |
| F6 | No new tasks created when work remains | Agent doesn't scan for gaps after completing cycle | Stage 8: MANDATORY gap scan and new session dispatch |
| F7 | Agent goes idle between heartbeats | Agent stops calling tools without scheduling next wakeup | Stage 2: Timer at END of every heartbeat action, NEVER rely on human |
| F8 | MCP tools not used (CLI fallback loses data) | Agent uses `node jules_task_manager.js` instead of MCP | ALL stages: Use MCP tools as PRIMARY, CLI as fallback only |

---

## 2. Tool Priority: MCP-First, CLI-Fallback

**ALWAYS prefer the Jules MCP tools over the Node.js CLI.** The MCP tools return richer structured data (e.g. `pendingPlan`, `lastAgentMessage`, `status: busy|stable|failed`) that the CLI cannot surface.

| Action | MCP Tool (PRIMARY) | CLI Fallback |
|--------|--------------------|--------------|
| List sessions | `jules/list_sessions` | `node scripts/services/jules_task_manager.js list` |
| Get session state | `jules/get_session_state {sessionId}` | `node scripts/services/jules_task_manager.js status <id>` |
| Review code changes | `jules/get_code_review_context {sessionId, format, detail}` | `node scripts/services/jules_task_manager.js audit <id>` |
| View file diffs | `jules/show_code_diff {sessionId, file?}` | (no CLI equivalent) |
| Send reply / unblock | `jules/send_reply_to_session {sessionId, action, message}` | `node scripts/services/jules_task_manager.js send <id> "<msg>"` |
| Approve pending plan | `jules/send_reply_to_session {sessionId, action: "approve"}` | (no CLI equivalent — SDK only) |
| Create new session | `jules/create_session {repo, branch, prompt, title}` | `node scripts/services/jules_task_manager.js create "<prompt>" "<title>"` |
| Check PRs | `node scripts/services/jules_task_manager.js prs` | (GitHub REST API via CLI) |
| Prune branches | `node scripts/services/jules_task_manager.js prune` | (git CLI via task manager) |
| Archive session | `node scripts/services/jules_task_manager.js archive-completed` | (SDK via CLI) |

---

## 3. The 8-Stage Autonomous Multi-Agent Lifecycle

```
 ┌──────────────────────────────────────────────────────────────────────────────────┐
 │                 JULES AUTONOMOUS MULTI-AGENT LIFECYCLE (v2)                      │
 ├──────────────┬────────────────┬────────────────┬──────────────┬─────────────────┤
 │   STAGE 1    │    STAGE 2     │    STAGE 3     │   STAGE 4    │    STAGE 5      │
 │  Boundary    │  Heartbeat     │  Two-Way       │  Code Review │  PR Merge &     │
 │  Decompose   │  Cron Loop     │  Unblock &     │  & Diff      │  Local          │
 │  & Dispatch  │  (MANDATORY)   │  Plan Approve  │  Extraction  │  Integration    │
 ├──────────────┼────────────────┼────────────────┼──────────────┼─────────────────┤
 │   STAGE 6    │    STAGE 7     │    STAGE 8     │              │                 │
 │  Branch      │  Audit &       │  Gap Scan &    │              │                 │
 │  Prune       │  Archive       │  New Dispatch  │              │                 │
 └──────────────┴────────────────┴────────────────┴──────────────┴─────────────────┘
```

---

## 4. Stage 1: Laser-Focused Boundary Decomposition & Dispatch

Jules works best with **atomic, single-subsystem tasks**. Never send monolithic multi-concern prompts.

### Rules:
1. **One subsystem per session**: e.g. Aspect Math, DOM Extractor, Strategy Fuzzer, BOM Parser, Knowledge Sync.
2. **Explicit target files**: Name the exact source files to read AND the test file to create.
3. **Deterministic pass criteria**: State `node --test tests/<tier>/test_<name>.js` and `npm run test:all`.
4. **Clean baseline**: Push latest `main` commit before dispatching.

### Dispatch via MCP (PREFERRED):
```
call_mcp_tool(jules, create_session, {
  repo: "vinodhsubramanian123/updatedVendorScrapingNotebook-v2",
  branch: "main",
  title: "🧪 <Subsystem> Boundary Tests",
  prompt: "You are hardening <Subsystem>. Create tests/<tier>/test_<feature>.js. ...",
  autoPr: true
})
```

### MANDATORY: Schedule heartbeat cron IMMEDIATELY after dispatch:
```
schedule(DurationSeconds=120, TimerCondition="never",
  Prompt="Jules Heartbeat: Check session <id> status, unblock if paused, review code if stable, merge PRs if completed.")
```

**NEVER dispatch without scheduling the heartbeat. This is the #1 failure mode.**

---

## 5. Stage 2: Proactive Heartbeat Cron Loop (INV-15)

This is the **continuous monitoring engine**. On EVERY heartbeat wakeup, execute this exact checklist:

### Heartbeat Checklist (execute in order):

```
FOR EACH active_session:
  1. call_mcp_tool(jules, get_session_state, {sessionId})
     → Read: status, pendingPlan, lastAgentMessage

  2. IF status === "busy":
     → Session is working. Log and re-schedule timer.

  3. IF status === "stable" AND pendingPlan EXISTS:
     → Jules generated a plan and is waiting for approval.
     → Review the plan steps.
     → call_mcp_tool(jules, send_reply_to_session, {sessionId, action: "approve"})
     → Re-schedule timer to check again after execution.

  4. IF status === "stable" AND lastAgentMessage EXISTS:
     → Jules asked a question or reported findings.
     → Read the message content.
     → Send a decisive, actionable reply:
       call_mcp_tool(jules, send_reply_to_session, {sessionId, action: "send", message: "<guidance>"})
     → Re-schedule timer.

  5. IF status === "stable" AND NO pendingPlan AND NO lastAgentMessage:
     → Jules finished work silently. Proceed to Stage 4 (Code Review).

  6. IF status === "failed":
     → Session is unrecoverable. Log the failure. Proceed to Stage 7 (Archive).
     → If the task is still needed, create a new session (Stage 8).

AFTER processing all sessions:
  → Re-schedule heartbeat timer (DurationSeconds=120, TimerCondition="never")
  → UNLESS all sessions are completed/archived AND no new tasks to dispatch.
```

**CRITICAL: The timer MUST be re-scheduled at the END of every heartbeat action.
The agent MUST NOT go idle and wait for the human to prompt it.**

---

## 6. Stage 3: Two-Way Autonomous Dialogue & Plan Approval

### Decision Authority:
Antigravity is the Lead Architect. It makes ALL decisions autonomously based on:
- System invariants (INV-1 through INV-42)
- Data dictionary schemas (`.agents/DATA_DICTIONARY.md`)
- Repository design patterns
- Test certification requirements

### Approval Protocol:
```
# Approve a pending plan:
call_mcp_tool(jules, send_reply_to_session, {sessionId, action: "approve"})

# Answer a question:
call_mcp_tool(jules, send_reply_to_session, {sessionId, action: "send", message: "..."})

# Ask Jules for clarification (blocks until reply):
call_mcp_tool(jules, send_reply_to_session, {sessionId, action: "ask", message: "..."})
```

### API State Semantics (Critical Knowledge):
- MCP `status: "busy"` → Jules is actively coding. Wait.
- MCP `status: "stable"` → Jules is paused. Check for pendingPlan or lastAgentMessage.
- MCP `status: "failed"` → Unrecoverable. Archive and re-dispatch if needed.
- `state: "paused"` + `outcome.state: "completed"` → Session FINISHED. Ready for code review.

---

## 7. Stage 4: Code Review & Diff Extraction (INV-12)

**NEVER skip this stage.** Even if Jules reports 0 files changed, ALWAYS verify.

### Review Protocol:
```
# Step 1: Get structured summary of all changes
call_mcp_tool(jules, get_code_review_context, {
  sessionId, format: "detailed", detail: "full"
})

# Step 2: If files were changed, review the actual diffs
call_mcp_tool(jules, show_code_diff, {sessionId})
# Or for a specific file:
call_mcp_tool(jules, show_code_diff, {sessionId, file: "tests/chaos/test_example.js"})
```

### Integration Rules:
- If Jules created test files or source fixes in its sandbox:
  1. Extract the file contents from the diff.
  2. Write them locally using `write_to_file`.
  3. Run `node --test tests/<tier>/test_<name>.js` locally.
  4. Run `npm run test:all` for full regression.
  5. Run `npm run lint` for zero warnings.
  6. Only if ALL pass: `git add . && git commit && git push origin main`.

### If Jules produced 0 file changes:
- The work was likely completed locally by Antigravity.
- Acknowledge completion in the session thread:
  ```
  call_mcp_tool(jules, send_reply_to_session, {sessionId, action: "send",
    message: "Session concluded. Test suite authored and certified locally. No further action."})
  ```
- Proceed to Stage 7 (Archive).

---

## 8. Stage 5: PR Verification & Merge into Main (INV-10)

When Jules opens a Pull Request:

### Verification Checklist:
1. **Check for open PRs**: `node scripts/services/jules_task_manager.js prs`
2. **Artifact hygiene**: Inspect `git diff --stat` — no `outputs/history/*.json` dumps, no temp files (INV-7).
3. **Full regression**: `npm run test:all && npm test && npm run lint` — all must pass 100%.
4. **Merge**: `git merge <branch> --no-ff -m "..."` or cherry-pick specific commits.
5. **Push**: `git push origin main`.

**NEVER prune branches or archive sessions until the merge to main is verified and pushed.**

---

## 9. Stage 6: Remote Branch Pruning (INV-11)

**ONLY execute AFTER Stage 5 merge is verified on main.**

```bash
node scripts/services/jules_task_manager.js prune
```

Verify cleanup:
```bash
git fetch origin --prune
git branch -r  # Should show only origin/main and origin/HEAD
```

---

## 10. Stage 7: Audit-Before-Archive Session Lifecycle (INV-19)

**ONLY execute AFTER Stages 4-6 are complete.**

```bash
node scripts/services/jules_task_manager.js archive-completed
```

Post-archive verification:
```
call_mcp_tool(jules, list_sessions, {pageSize: 20})
# Verify: 0 active sessions remaining (or only truly in-progress ones).
```

---

## 11. Stage 8: Gap Scan & New Task Dispatch

After completing the full lifecycle for all sessions, the agent MUST scan for remaining work:

### Gap Scan Checklist:
1. Are there uncovered test areas? (Check test coverage gaps in `tests/`)
2. Are there unverified invariants? (Check INV-1 through INV-42)
3. Are there pending TODOs in the codebase? (`grep -r "TODO\|FIXME\|HACK" scripts/ dashboard/`)
4. Are there new product families to onboard?
5. Are there performance bottlenecks to stress-test?

### If gaps exist:
- Dispatch new Jules sessions via Stage 1.
- Schedule heartbeat cron via Stage 2.
- Continue the lifecycle.

### If no gaps exist:
- Report completion to the user.
- Do NOT schedule further heartbeats.

---

## 12. Complete Heartbeat Wakeup Template (Copy-Paste Ready)

On every heartbeat wakeup, execute this exact sequence:

```
# 1. List all sessions
call_mcp_tool(jules, list_sessions, {pageSize: 20})

# 2. For each session, get detailed state
call_mcp_tool(jules, get_session_state, {sessionId: "<id>"})

# 3. Based on status:
#    busy → re-schedule timer, wait
#    stable + pendingPlan → approve plan
#    stable + lastAgentMessage → read & reply
#    stable + no pending → code review (Stage 4)
#    failed → archive & re-dispatch

# 4. For completed sessions with code changes:
call_mcp_tool(jules, get_code_review_context, {sessionId: "<id>", format: "detailed", detail: "full"})
call_mcp_tool(jules, show_code_diff, {sessionId: "<id>"})
# → Extract, test locally, commit to main

# 5. Check PRs and merge if needed
run_command("node scripts/services/jules_task_manager.js prs")
# → Merge verified PRs, push to main

# 6. Prune branches AFTER merge
run_command("node scripts/services/jules_task_manager.js prune")

# 7. Archive completed sessions
run_command("node scripts/services/jules_task_manager.js archive-completed")

# 8. Verify zero stale sessions
call_mcp_tool(jules, list_sessions, {pageSize: 20})

# 9. Scan for gaps → dispatch new sessions if needed (Stage 8)

# 10. Re-schedule heartbeat OR declare completion
schedule(DurationSeconds=120, TimerCondition="never",
  Prompt="Jules Heartbeat: Full lifecycle check...")
```

---

## 13. Correct Execution Order (NEVER violate)

```
Dispatch → Heartbeat Cron → Unblock/Approve → Code Review → PR Merge → Branch Prune → Archive → Gap Scan → Re-dispatch
   1             2                 3               4            5            6            7          8           1...
```

**The agent MUST NOT:**
- ❌ Archive before reviewing code (skips Stage 4)
- ❌ Prune branches before merging to main (skips Stage 5)
- ❌ Go idle without scheduling next heartbeat (breaks Stage 2)
- ❌ Use CLI when MCP tools are available (loses `pendingPlan` data)
- ❌ Skip gap scan after completing all sessions (misses Stage 8)
- ❌ Wait for human to relay messages between agents (violates Core Axiom)

---

## 14. Quick Reference CLI Commands

| Command | Purpose |
|---------|---------|
| `npm run jules:status` | List all active sessions and their current states |
| `npm run jules:prs` | List open/closed Pull Requests with branch mappings |
| `npm run jules:prune` | Prune merged or dangling remote feature branches |
| `npm run jules:archive` | Audit and archive all completed Jules sessions |
| `node scripts/services/jules_task_manager.js send <id> "<msg>"` | Send unblocking reply |
| `node scripts/services/jules_task_manager.js audit <id>` | Extract activities and patches |
