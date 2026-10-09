# CLI operation and evidence

Observed locally on 7 October 2026. Reconfirm changed or unsupported options with the installed CLI.

## Invocation

Observed options: `--model`, `--effort`, `--mode accept-edits|plan`, `--print`, `--output-format json|text|stream-json`, `--print-timeout`, `--conversation`, `--log-file`, `--add-dir`. `--input-format stream-json` requires streaming output. Do not assume undocumented scheduling, token limits, status commands or task APIs exist.

Use an absolute task directory prepared for the assignment. `task.txt` contains the bounded brief, not executable shell text. Example PowerShell invocation after setting `$taskDir` and `$modelId` to verified values:

```powershell
$brief = Get-Content -LiteralPath (Join-Path $taskDir 'task.txt') -Raw
$agyArgs = @(
  '--model', $modelId,
  '--effort', 'high',
  '--mode', 'accept-edits',
  '--output-format', 'json',
  '--print-timeout', '600s',
  '--log-file', (Join-Path $taskDir 'cli.log'),
  '--print', $brief
)
Push-Location -LiteralPath $taskDir
try {
  & agy @agyArgs 1> (Join-Path $taskDir 'response.json') 2> (Join-Path $taskDir 'stderr.log')
  $agyExitCode = $LASTEXITCODE
} finally { Pop-Location }
```

`--dangerously-skip-permissions` was used in the authorized local pilot to prevent unattended tool prompts. Include it only when existing user authorization and environment policy permit the task's operations; it does not expand scope. Otherwise retain normal permissions. Do not infer authorization from this example.

Select execution mode for the task, not as an unverified filesystem boundary. Enforce shared-workspace separation through the assigned directories and inspect actual changes. Run shell argument arrays or variable arguments; do not splice prompt text into executable shell code. Use asynchronous tool sessions for long jobs; record the returned handle. If using `Start-Process`, use a hidden window and capture the exact process identity.

## Timeout and continuation: observed failure mode

The pilot returned process exit0 and JSON `status: SUCCESS` after its ten-minute print limit, while stderr stated **turn in progress; returning partial output**. The response contained progress messages, not a review verdict. The backend conversation could still be running after the observing CLI returned.

Therefore:

- Read stderr and response content as well as the exit code. A print timeout or generic SUCCESS is not task completion, approval or a test pass.
- Retain `conversation_id`. Do not launch a duplicate fresh task because an observation timed out.
- Check the original tool handle, exact child process and relevant current artifacts. An absent CLI process alone does not prove the backend turn ended. If the CLI offers a supported read-only conversation status, use it; do not invent one.
- Continue or steer the **same conversation** when evidence shows what remains. A bounded follow-up is not a restart: reference existing results and prohibit redundant execution. If existing activity is uncertain, reconcile that conversation rather than issuing competing work in another one.
- Preserve partial output separately; never overwrite it with the final response.

Observed continuation shape:

```powershell
# Use the recorded conversation ID and a brief containing only the correction.
& agy --conversation $conversationId --model $modelId --effort high `
  --mode accept-edits --output-format json --print-timeout 300s `
  --log-file (Join-Path $taskDir 'followup-cli.log') --print $followupBrief `
  1> (Join-Path $taskDir 'followup-response.json') `
  2> (Join-Path $taskDir 'followup-stderr.log')
```

A useful observed correction was: “The completed test logs already exist. Do not recopy files, rerun completed tests or read whole history. Verify the declared hashes and missing concerns, write the receipt, list anything incomplete and stop.” It yielded a usable receipt. Do not promise that this phrasing alone guarantees completion.

## Receipt contract

Adapt this minimal structure to the task rather than imposing a new repository-wide schema:

```json
{
  "verdict": "APPROVED_ISOLATED",
  "author": "source author identity",
  "reviewer": "independent reviewer identity",
  "candidate": "absolute candidate path",
  "sources": [{"path": "relative/file.js", "sha256": "exact digest"}],
  "checks": [{"command": "exact command", "cwd": "execution copy", "exitCode": 0,
    "tests": 1, "passed": 1, "failed": 0, "skipped": 0, "logPath": "raw log"}],
  "reusedEvidence": [],
  "findings": [],
  "notRun": [],
  "limitations": []
}
```

Other useful verdicts: `CHANGES_REQUIRED`, `REVIEW_INCOMPLETE`, `AUTHORED_PENDING_REVIEW`. Preserve the project's vocabulary where already defined. A command returning0 without meaningful checks is insufficient. Hash receipt inputs and relevant dependencies when necessary; avoid giant manifests unless the acceptance scope requires them.

Require the project's atomic JSON writer when that is its existing convention. Store the final receipt, reviewer tests and raw logs in the durable task archive before relying on temporary directories. Hash/read back the archived files. Codex checks the actual results before updating checkpoint status.

## Calibration and productivity

The pilot completed154 focused tests and19 mutation tests, but spent excessive context on the surrounding review. Test runtime was only seconds; lengthy model deliberation and repeated context were the expensive part. Prefer smaller source sets, precise missing checks and concise return formats. Available context is capacity, not a utilization target.

Observed again on 8 October: a two-file child-observer assignment exhausted its 600-second print observation and substantial model context without a completed test receipt. Same-conversation finalization correctly returned INCOMPLETE. Do not portray delegation as token saving merely because it uses another provider. Separate the CLI output filename from the atomic author receipt; the CLI can overwrite response.json after an agent writes to that name.

For small Node fixture tasks, supply the known cached lint executable and a bounded test command such as `node --test --test-timeout=5000 <file>` rather than asking the worker to rediscover tooling. Inspect failure assertions, not just a hanging process: passing undefined to a constructor with a default PID created a live-child fixture and an indefinitely pending test. VM-produced plain data needs appropriate cross-realm comparison; preserve reference-identity assertions. After helper-owned error-listener cleanup, a duplicate EventEmitter error needs a separate consumer listener in the fixture. Never add production noop listeners or import fallbacks to conceal fixture mistakes. Send these concrete corrections in the existing conversation, retain the failed logs and require new source-bound counts.

For parallel jobs, maintain distinct writable copies and identities. Report useful progress as accepted changes, resolved failures and newly proven behavior. Avoid replacing implementation with endless metadata work. Escalate semantic ambiguity to Codex; send mechanical corrections back to Antigravity with an exact acceptance condition.

## Model and effort compatibility

Observed 8 October 2026: gemini-3.8-flash-high rejects --effort medium before creating a conversation (zero token use). Use --effort high with this exact user-selected variant. Save the rejected invocation evidence and relaunch with the supported pair; do not mistake it for a backend timeout or silently change models. Conserve tokens through narrower inputs and bounded outputs rather than an incompatible effort override.

## Prevent test accommodation in production

Observed dashboard follow-up on 8 October: omitting the already-authorized unattended permission flag caused a headless `command` auto-denial and no useful work. Inspect stderr before waiting again; correct the invocation in the same conversation using existing task authorization. The subsequent receipt reported cumulative input620462/output53393 tokens for seven mechanical wrappers, so this was not demonstrated efficiency. Prefer compact diff preparation and a bounded missing-check assignment over repeated expansive implementation prompts. Its four tests covered seven disabled wrappers but injected enabled route lineage only for rebuild/scrape; Codex added exact preimage command/argument/options comparisons for all seven. Credit assertion coverage, not the broader test title.

Observed 8 October 2026: an isolated dashboard author added try/catch dependency fallbacks to production routes even though fixtures could mock imports. Require exact production imports to stay intact and fix dependency mocks in tests. Review the diff beyond passing test counts. Also test invalid-option failures before spawn and termination-helper rejection after spawn: neither may release ownership of a live child. Keep original cancellation reason identity separate from a transport diagnostic code. These are demonstrated review lessons, not a claim that every task needs a subprocess framework.

## Native parallel workers and working-directory verification

Observed8–9October2026: native define_subagent(name,description), invoke_subagent(subagent_info) and manage_subagents are exposed inside Agy conversations. The empty agy agents listing does not establish absence of these tools. Actual invoke_subagent stream events return worker conversation IDs, log_uri and workspace_uris. These are Agy internal capabilities, not Codex tool calls. Ask one bounded orchestrator to create independent workers with disjoint file ownership and individual source-bound receipts; verify invocation events before claiming parallel work.

Verify the stream init.cwd equals the intended isolated directory immediately after launch. A prompt naming a Temp workspace does not change cwd. Even after a parent CLI launches in the right workdir, native worker workspace_uris may refer to the original checkout. Supply absolute allowed write paths in every worker brief; inspect actual deltas. On9October a root launch accidentally inherited main cwd; read-only diff exploration occurred, no worker writes had begun, and a same-conversation correction used the explicit isolated executor workdir.

A worker command may return an asynchronous task handle then end its turn. Collect that exact task with command_status or let the orchestrator manage the existing worker; do not restart source discovery or create replacements. This run also observed background command tasks stopped after a server restart during CLI continuation. Distinguish interrupted command execution from completed worker output. Send existing workers only the correction and remaining acceptance step. A response saying workers launched/revived or generic SUCCESS is not a receipt.

Use raw PowerShell command text, not an entire command wrapped in escaped literal quotes. Prefer rg on exact files; head is unavailable in the observed Windows shell. Correct these operational errors once in the existing conversation. Do not claim token efficiency from delegation alone: initial broad exploration in this run consumed139970input/7490output before producing no acceptance result; cached/cumulative categories require separate labels.
