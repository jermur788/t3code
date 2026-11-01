# T3 Fork — Orchestration Evidence Ledger — 2026-10-30

Append-oriented project-owned audit ledger for T3 Fork orchestration-learning evidence. Historical CCF evidence is not copied here; this file starts with the T3 Fork Local L2 run on 2026-11-01. Record events when they become known. Never rewrite a decision-time record after the outcome is known; append corrections instead.

## Evidence vocabulary

- **OBSERVED FACT:** directly supported by runtime, provider, repository, test, CI, tool, or user evidence.
- **ORCHESTRATOR CLAIM:** what the orchestrator believed, predicted, intended, or used as a reason for acting.
- **RETROSPECTIVE INFERENCE:** a conclusion drawn only after later outcomes are known.
- **DERIVED RECORD:** a recomputable statistic, prediction, recommendation, or other transformation of evidence.

`UNKNOWN` is preferred over an invented value.

## Starting policy record — Local L2 combined sync qualification

- **Timestamp:** 2026-11-01T08:05Z.
- **OBSERVED FACT — authority:** `messages/t3-fork/2026-11-01-local-l2-combined-sync-qualification-handoff.md` (Overall Dev) directs Local Overall / Deputy Officer to qualify exact `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`, and not a different SHA.
- **OBSERVED FACT — routing directive:** `messages/t3-fork/2026-11-01-deepseek-routing-evidence-directive.md` makes DeepSeek the orchestrator for every T3 Fork task irrespective of difficulty, with prospective decision-time routing records and post-outcome evidence.
- **OBSERVED FACT — user objective:** produce trustworthy Local L2 system qualification evidence for the exact combined candidate, return a durable result to Overall Dev, and do not integrate to `main`.
- **Hard constraints:** exact-SHA testing only; no force-push or history rewrite; no merge of PR #14; no architecture change to make tests pass; no weakened provenance checks; no second orchestration graph/provider launcher/capacity poller; no real OAuth claim from fixtures; no autonomous ARM routing; one writer per overlapping code lane.
- **Optimization preferences:** correctness and auditability first; cost/time secondary; no paid-infrastructure spend without need; avoid risky live credential rotation.
- **Review requirement:** DeepSeek retains orchestration and reconciliation; a bounded independent review may be delegated to Claude when the recorded assessment warrants it.
- **Protected decisions:** PR #14 integration, CI exception, product/architecture changes, and material paid infrastructure remain outside this lane.
- **Current routing policy/profile/version:** DeepSeek routing-evidence directive dated 2026-11-01; no hard-coded easy/hard mapping.

## Starting provider/capacity observations

| Provider instance                                                  | State              | Capacity evidence            | Reset/window | Source                 | Observed at       |
| ------------------------------------------------------------------ | ------------------ | ---------------------------- | ------------ | ---------------------- | ----------------- |
| OpenCode / DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) | AVAILABLE          | Orchestrator session running | UNKNOWN      | T3 runtime             | 2026-11-01T08:05Z |
| Claude A (`claudeAgent`)                                           | AVAILABLE (listed) | UNKNOWN                      | UNKNOWN      | T3 catalog             | 2026-11-01T08:05Z |
| Claude B — Pro (`claudeAgent_claude_b_pro`)                        | AVAILABLE (listed) | UNKNOWN                      | UNKNOWN      | T3 catalog             | 2026-11-01T08:05Z |
| Codex / OpenAI B (`codex`, `codex_c75d...`)                        | AVAILABLE (listed) | UNKNOWN                      | UNKNOWN      | T3 catalog             | 2026-11-01T08:05Z |
| Cursor / Grok / Antigravity / Muse / Pi                            | DISABLED           | N/A                          | N/A          | T3 catalog constraints | 2026-11-01T08:05Z |

No precise quota number is inferred from the absence of errors.

## Pre-outcome routing decisions

### D-L2-01 — Overall L2 orchestration and final reconciliation

- `decision_id`: `l2-20261101-d01`
- `recorded_at`: 2026-11-01T08:05Z
- `work_unit`: Local L2 combined-sync qualification; parent = Local Overall / Deputy Officer.
- **Difficulty assessment:** ambiguity 0.30; scope breadth 0.85; reasoning complexity 0.60; integration/tool complexity 0.80; risk 0.85; verification burden 0.90; overall band `HIGH`; confidence 0.80.
- **Candidates considered:** DeepSeek V4.1 Flash (self); Claude Sonnet 5.5; Claude Opus 5.5; Codex gpt-6.1-sol; OpenAI B gpt-6.1-sol.
- **Constraints known at decision time:** exact-SHA discipline; shared worktrees and live state; fixture-backed runtime knowledge is local; no hard-coded model mapping; no need for paid infrastructure.
- **Selected executor:** DeepSeek V4.1 Flash, OpenCode harness, variant `max`, agent `build`.
- **Planned independent reviewer:** Claude Sonnet 5.5 (bounded evidence/interpretation review), contingent on availability and on a non-trivial review unit.
- **Rationale (ORCHESTRATOR CLAIM):** the task is broad but mostly deterministic and stateful. DeepSeek has the current fixture/context knowledge and the directive requires it to retain orchestration. Independent review is better obtained from a different provider than from self-review.
- **Material alternatives rejected:** Claude Opus 5.5 as primary orchestrator (higher capability, but unnecessary for deterministic qualification and would discard the active DeepSeek-orchestrator policy); Codex as orchestrator (would add a second provider lane without a clear capability need).
- **Selection mechanism:** `exploit` (existing knowledge) with `forced` orchestration policy.
- `machine`:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d01",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "local-l2-combined-sync-qualification",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "reviewer_planned": { "provider": "claudeAgent", "model": "claude-sonnet-5-5" },
  "difficulty": {
    "ambiguity": 0.3,
    "scope_breadth": 0.85,
    "reasoning_complexity": 0.6,
    "integration_tool_complexity": 0.8,
    "risk": 0.85,
    "verification_burden": 0.9,
    "band": "HIGH",
    "confidence": 0.8
  },
  "selection": "exploit+forced_policy",
  "outcome": "PENDING"
}
```

### D-L2-02 — Repository safety and exact-SHA isolation

- `decision_id`: `l2-20261101-d02`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.15; scope 0.25; reasoning 0.20; integration/tool 0.40; risk 0.70; verification 0.40; band `LOW-MEDIUM`; confidence 0.92.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** deterministic Git/worktree work with a high safety cost for mistakes. The local lane knows the existing worktree map and must avoid disturbing the browser lane or the developer's live state.
- **Alternatives rejected:** delegating to a child sharing the same checkout (adds a second writer and no capability gain).
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d02",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "repo-safety-exact-sha-worktree",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "difficulty": {
    "ambiguity": 0.15,
    "scope_breadth": 0.25,
    "reasoning_complexity": 0.2,
    "integration_tool_complexity": 0.4,
    "risk": 0.7,
    "verification_burden": 0.4,
    "band": "LOW-MEDIUM",
    "confidence": 0.92
  },
  "selection": "exploit",
  "outcome": "PENDING"
}
```

### D-L2-03 — Static/focused regression and typecheck execution

- `decision_id`: `l2-20261101-d03`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.20; scope 0.70; reasoning 0.35; integration/tool 0.65; risk 0.55; verification 0.85; band `MEDIUM-HIGH`; confidence 0.88.
- **Candidates:** DeepSeek self; Codex; Claude.
- **Selected executor:** DeepSeek self.
- **Rationale:** deterministic test/typecheck commands with exact expected counts. The work is long but low-ambiguity; local execution avoids coordination overhead and keeps one writer.
- **Alternatives rejected:** Codex or Claude for command execution (no capability gain; would need the same worktree/install context).
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d03",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "focused-tests-and-typecheck",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "difficulty": {
    "ambiguity": 0.2,
    "scope_breadth": 0.7,
    "reasoning_complexity": 0.35,
    "integration_tool_complexity": 0.65,
    "risk": 0.55,
    "verification_burden": 0.85,
    "band": "MEDIUM-HIGH",
    "confidence": 0.88
  },
  "selection": "exploit",
  "outcome": "PENDING"
}
```

### D-L2-04 — Runtime/V2 execution-provenance verification

- `decision_id`: `l2-20261101-d04`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.40; scope 0.45; reasoning 0.65; integration/tool 0.75; risk 0.85; verification 0.85; band `HIGH`; confidence 0.78.
- **Candidates:** DeepSeek self; Claude Sonnet 5.5; Claude Opus 5.5.
- **Selected executor:** DeepSeek self for executable verification.
- **Planned independent reviewer:** Claude Sonnet 5.5 reads the repaired bridge behavior and the L2 evidence for interpretation gaps.
- **Rationale:** the four-case matrix is executable and deterministic, but the provenance interpretation is architecture-sensitive. Self-execution keeps the DB/runtime context; independent review is the appropriate escalation rather than self-certifying the interpretation.
- **Alternatives rejected:** Claude as primary executor (would need the full local fixture context and write lane for a deterministic test); no reviewer (rejected because the handoff explicitly distinguishes observed linkage from broader V2 claims).
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d04",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "runtime-v2-execution-provenance",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "reviewer_planned": { "provider": "claudeAgent", "model": "claude-sonnet-5-5" },
  "difficulty": {
    "ambiguity": 0.4,
    "scope_breadth": 0.45,
    "reasoning_complexity": 0.65,
    "integration_tool_complexity": 0.75,
    "risk": 0.85,
    "verification_burden": 0.85,
    "band": "HIGH",
    "confidence": 0.78
  },
  "selection": "exploit+independent_review",
  "outcome": "PENDING"
}
```

### D-L2-05 — Rendered UI and restart/persistence qualification

- `decision_id`: `l2-20261101-d05`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.35; scope 0.75; reasoning 0.55; integration/tool 0.90; risk 0.80; verification 0.90; band `HIGH`; confidence 0.75.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** this is the most stateful/tool-heavy unit: fixture CLIProxy, synthetic managed credentials, dev server, browser, restart. The local lane already produced the deterministic fixture and knows the exact state transitions. A delegated child would require the same environment and introduce a second writer.
- **Alternatives rejected:** Claude/Codex execution (no capability gain for tool-state reproduction; coordination and risk cost).
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d05",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "rendered-ui-restart-persistence",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "difficulty": {
    "ambiguity": 0.35,
    "scope_breadth": 0.75,
    "reasoning_complexity": 0.55,
    "integration_tool_complexity": 0.9,
    "risk": 0.8,
    "verification_burden": 0.9,
    "band": "HIGH",
    "confidence": 0.75
  },
  "selection": "exploit",
  "outcome": "PENDING"
}
```

### D-L2-06 — Real-provider / OAuth / paid-eval availability check

- `decision_id`: `l2-20261101-d06`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.55; scope 0.20; reasoning 0.45; integration/tool 0.40; risk 0.95; verification 0.70; band `HIGH-RISK / LOW-SCOPE`; confidence 0.70.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self, restricted to read-only availability classification.
- **Rationale:** the safety boundary is the important part. A second subscription OAuth refresh could rotate live credentials. No delegation is warranted because the decision is a stop/classify check, not open-ended work.
- **Alternatives rejected:** inducing a refresh to satisfy the gate (prohibited by the handoff); claiming fixture evidence as real OAuth (prohibited).
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d06",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "real-provider-oauth-availability",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "difficulty": {
    "ambiguity": 0.55,
    "scope_breadth": 0.2,
    "reasoning_complexity": 0.45,
    "integration_tool_complexity": 0.4,
    "risk": 0.95,
    "verification_burden": 0.7,
    "band": "HIGH-RISK/LOW-SCOPE",
    "confidence": 0.7
  },
  "selection": "forced_safety_boundary",
  "outcome": "PENDING"
}
```

### D-L2-07 — Independent review of L2 evidence and provenance interpretation

- `decision_id`: `l2-20261101-d07`
- `recorded_at`: 2026-11-01T08:05Z (planned; execution after observed verification)
- **Difficulty:** ambiguity 0.45; scope 0.50; reasoning 0.75; integration/tool 0.45; risk 0.65; verification 0.70; band `HIGH`; confidence 0.72.
- **Candidates:** Claude Sonnet 5.5; Claude Opus 5.5; Codex gpt-6.1-sol; DeepSeek self-review.
- **Selected reviewer:** Claude Sonnet 5.5, escalating to Opus 5.5 only if the review exposes an architecture-sensitive ambiguity.
- **Rationale:** independent provider/model review is the main benefit; Sonnet is sufficient for bounded evidence consistency and provenance interpretation. DeepSeek self-review is rejected as the only check because the directive exists to gather routing consequence evidence, including independent review value.
- **Constraints:** if Claude capacity/context is unavailable at dispatch, record `BLOCKED` or substitute Codex with the reason; do not silently drop the review.
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d07",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "independent-evidence-review",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "claudeAgent", "model": "claude-sonnet-5-5" },
  "difficulty": {
    "ambiguity": 0.45,
    "scope_breadth": 0.5,
    "reasoning_complexity": 0.75,
    "integration_tool_complexity": 0.45,
    "risk": 0.65,
    "verification_burden": 0.7,
    "band": "HIGH",
    "confidence": 0.72
  },
  "selection": "explore_independent_review",
  "outcome": "PENDING"
}
```

### D-L2-08 — Final durable handoff synthesis

- `decision_id`: `l2-20261101-d08`
- `recorded_at`: 2026-11-01T08:05Z
- **Difficulty:** ambiguity 0.25; scope 0.65; reasoning 0.60; integration/tool 0.35; risk 0.75; verification 0.60; band `MEDIUM-HIGH`; confidence 0.85.
- **Selected executor:** DeepSeek self.
- **Rationale:** reconciliation and final verdict remain with the orchestrator under the directive; the handoff must distinguish observed facts, claims, and blockers.
- **machine**:

```json
{
  "schema": "t3-orchestration-evidence-v2",
  "event_id": "l2-20261101-d08",
  "event_type": "routing_decision",
  "occurred_at": "2026-11-01T08:05Z",
  "recorded_at": "2026-11-01T08:05Z",
  "project": "t3-fork",
  "task": "final-handoff-synthesis",
  "orchestrator": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "selected": { "provider": "opencode", "model": "opencode-go/deepseek-v4.1-flash" },
  "difficulty": {
    "ambiguity": 0.25,
    "scope_breadth": 0.65,
    "reasoning_complexity": 0.6,
    "integration_tool_complexity": 0.35,
    "risk": 0.75,
    "verification_burden": 0.6,
    "band": "MEDIUM-HIGH",
    "confidence": 0.85
  },
  "selection": "forced_orchestrator_role",
  "outcome": "PENDING"
}
```

## Event log

Outcome events are appended below after execution. Decision records above are not edited retroactively.

### CORRECTION — decision-record timing (appended 2026-11-01T08:26Z)

The L2 test worktree was created at 2026-11-01T08:01:11Z and setup finished at 08:01:45Z. The d01–d08 decision records were written at 08:05Z, before the first focused test at 08:06:03Z and before any runtime, rendered-UI, restart, OAuth, or CI work. D-L2-02's worktree action therefore predates its record by about four minutes. No outcome was known when the records were written; this correction preserves the decision-time/outcome separation rather than rewriting the original record.

### OUTCOME — l2-20261101-d01 / d08 — orchestration and final synthesis

- **Actual executor:** DeepSeek V4.1 Flash, OpenCode harness, variant `max`, agent `build`.
- **Substitutions/escalations:** none for orchestration. One bounded independent review was delegated to Claude Sonnet 5.5 (D-L2-07), as planned.
- **State:** `RUNTIME PASS` for the focused local scope, with external blockers separated (see below).
- **Evidence:** exact candidate `e51c1c5d74aed9824927d391590ddb33026c8d56` from `origin/sync/upstream-20261031`; detached clean test worktree `/home/jer/dev/t3code-l2-combined-20261101`; local branch `sync/upstream-20261031` in the main checkout remained stale at `f68e6078` and was not used as the candidate ref. No force-push, history rewrite, PR #14 merge, or code change.
- **Learning assessment:** self-orchestration was sufficient; the main value of the Claude review was catching write-up/evidence gaps, not a code defect. See the appendix learning section.

### OUTCOME — l2-20261101-d02 — repository safety and exact-SHA isolation

- **Actual executor:** DeepSeek V4.1 Flash.
- **State:** PASS.
- **Observed facts:** test worktree detached at exact SHA; `git status --porcelain` empty; origin ref exact; no other writer used the test worktree. The main checkout's local `sync/upstream-20261031` branch was at `f68e6078` (behind 9) and is checked out in the browser worktree; it was not moved. No stash/reset/discard was performed. A stray untracked `/home/jer/dev/t3code/hub-l2.pid` created by an L2 fixture command was removed; the main checkout returned to clean.
- **Residual:** the decision record timing correction above.

### OUTCOME — l2-20261101-d03 — focused tests and typecheck

- **Actual executor:** DeepSeek V4.1 Flash.
- **State:** PASS.
- **Observed results (all in the test worktree at exact SHA):**
  - `vp test run apps/server/src/projectRuntime/AdaptiveRoutingService.test.ts` — 14/14;
  - `vp test run apps/server/src/persistence/Migrations/Fork/007_AdaptiveRouting.test.ts` — 9/9;
  - `vp test run packages/shared/src/usageLimits.test.ts` — 68/68;
  - `vp test run apps/server/src/runtimeRouting/RuntimeRoutingProviderView.test.ts apps/server/src/runtimeRouting/RuntimeRoutingService.test.ts` — 10/10;
  - `vp test run apps/server/src/provider/CodexChatGptAuth.test.ts` — 56/56;
  - `vp test run apps/server/src/projectRuntime/ProjectRuntimeRpc.test.ts apps/server/src/projectRuntime/RuntimeTaskExecutionQualification.test.ts apps/server/src/projectRuntime/RuntimeTaskExecutionService.test.ts` — 27/27;
  - `vp test run apps/web/src/components/usage/UsageLimitsPooled.browser.test.tsx` — 2/2;
  - `vp run --filter @t3tools/shared --filter @t3tools/web --filter t3 typecheck` — 3/3 successful.
- **Totals:** 186 unique focused tests passed across 10 test files; affected typecheck 3/3.
- **Limits:** rejection tests assert `PersistenceSqlError` plus zero rows, not the exact error detail. The missing-attempt/wrong-project and NULL-thread branches are code-present but not separately tested with `execution` supplied. These do not contradict the required four-case matrix.

### OUTCOME — l2-20261101-d04 — Runtime/V2 execution provenance

- **Actual executor:** DeepSeek V4.1 Flash; independent interpretation review by Claude Sonnet 5.5.
- **State:** PASS (service-level executable evidence).
- **Observed facts:**
  - focused `-t "supplied execution"` run: 4 passed, 10 filtered out;
  - the four required cases are present: NULL recorded run rejects, wrong recorded run rejects, wrong recorded thread rejects, exact recorded thread + run accepts and writes one row;
  - each rejection asserts `PersistenceSqlError` and zero `adaptive_execution_observations` rows;
  - `AdaptiveRoutingService.ts:148-155` loads the linked attempt and rejects when the attempt is missing, the thread differs, `run_id` is NULL, or the supplied run differs.
- **Reviewer note:** `appendExecutionObservationReference` has no non-test caller outside its service file. This is not a live Runtime↔V2 bridge exercise. The handoff permits focused executable evidence; no broader V2 runtime behavior is claimed.
- **Residual risks (low):** the SELECT and INSERT are not in one transaction; `run_id` appears mutable at `RuntimeTaskExecutionService.ts:309`; a theoretical race exists.

### OUTCOME — l2-20261101-d05 — rendered UI and restart/persistence

- **Actual executor:** DeepSeek V4.1 Flash.
- **State:** PASS.
- **Distinct-account fixture:** native managed Codex credentials `codex_work` = `work@example.test` and `codex_personal` = `personal@example.test`, both without a native workspace id; hub accounts `acct-work` / `acct-personal` with the same emails, no workspace id. This exercises the unique-email key path, not workspace disambiguation.
- **Distinct rendered evidence:** Usage showed `Codex Work` 60% session / 90% weekly left and `Codex Personal` 25% session / 70% weekly left. Account popovers reported `Via: Qualification Hub`; provider settings showed both instances enabled and exactly one `Qualification Hub` CLI Proxy source. No duplicate hub-only rows for the bound instances.
- **Ambiguous fixture:** both native emails changed to `shared@example.test` with no workspace id; hub account `shared` with workspace `ws-shared`, 55% / 20% used.
- **Ambiguous rendered evidence:** Usage showed one hub-only `SE` row at 45% session / 80% weekly left, no per-instance Codex Work/Personal capacity rows, and the external ChatGPT fallback naming both instances. Neither provider instance received the hub account's capacity.
- **Restart:** stopped the dev server by its captured process group and restarted it on the same exact SHA; the distinct rows reconstructed unchanged (`25/60`, `70/90`). The second transition to the ambiguous fixture also used a real stop/start. The browser session cookie survived because the worktree signing key persisted; no re-pair was required.
- **Workspace/Development surfaces:** `/settings/general` rendered the `T3 Fork interface` section with Workspace/Development modes (Development selected); `/settings/development-profiles` rendered; `/home` rendered the Development `Project Runtime home` with Development Profile, Instructions, Sources, Project State, and Tasks & Handoffs sections. The seeded project had Runtime disabled, so those sections showed the disabled state rather than executing Runtime. No crash or obvious reconciliation regression was seen.
- **Environment noise:** the app showed a `jer-laptop froze for 9s` CPU-load toast during the render; the host load was elevated (~5–10 on 4 cores). This is an environment symptom, not a candidate defect.
- **Screenshot limitation:** the T3 preview snapshot/screenshot action timed out even on `https://example.com`, while navigation, live DOM evaluation, computed styles, and accessible labels worked. Rendered evidence is therefore live-browser DOM/ARIA/layout evidence, not a PNG capture.
- **Capacity limits:** "native usable limits win over hub" is covered by the unit test `prefers usable native limits over a matching hub snapshot` (`usageLimits.test.ts:1438`), not by a render. Workspace-disambiguated capacity is covered by unit tests (`usageLimits.test.ts:1385`), not by this fixture. A workspace-less native instance can join the only known workspace for its email (`usageLimits.ts:240-241`), a residual misattribution risk that the unit tests treat as intended.

### OUTCOME — l2-20261101-d06 — real-provider / OAuth / paid-eval

- **Actual executor:** DeepSeek V4.1 Flash, read-only availability check.
- **State:** `BLOCKED — credentials unavailable`.
- **Observed facts:** the environment has one real Codex credential file (`~/.codex/auth.json`, one `account_id`, refresh token present); no second real subscription or safe account access was found. No real OAuth refresh, re-auth, paid orchestration eval, or live credential probe was run. The fixture/mock evidence above is not promoted to a real OAuth pass.
- **Why no live eval:** using the sole live credential could rotate the developer's refresh token and consume real quota. The handoff prohibits inducing risky refresh-token rotation to satisfy a gate.

### OUTCOME — l2-20261101-d07 — independent evidence review

- **Actual executor:** Claude Sonnet 5.5 (`claudeAgent`), effort high, T3 delegated child `thread:delegated-task:...:l2-review-20261101-01`.
- **Observed timing:** requested 08:25:03Z, completed 08:26:14Z (about 71 seconds).
- **State:** REVIEW PASS (no blocking code defect).
- **Findings:** reviewed candidate/worktree, provenance matrix, capacity resolver, and ledger. It confirmed the code matches the handoff, the four cases are isolated, and the rendered ambiguous behavior is consistent with the resolver. It flagged write-up gaps: cite the origin ref not the stale local branch; state the distinct fixture identity path; do not claim a live provenance caller; add the no-second-owner, Workspace render, OAuth blocker, and CI absence; note the rejection-assertion weakness and the non-transactional check; and append a correction for the late d02 record.
- **Disposition:** all findings are addressed in this outcome record and the durable result. No code repair was required.

### OUTCOME — l2-20261101-d08 — final durable handoff

- **Actual executor:** DeepSeek V4.1 Flash.
- **State:** COMPLETED.
- **Result:** written to Overall Dev at `messages/t3-fork/2026-11-01-local-l2-combined-sync-qualification-result.md`.
- **Integration state:** not merged to `main`; PR #14 remains open/draft at the exact candidate. Browser Overall owns final integration.

### CI / GitHub observation

- Exact `e51c1c5d74aed9824927d391590ddb33026c8d56`:
  - commit status aggregate: `total_count: 0`, empty statuses;
  - workflow runs: `total_count: 0`;
  - check runs: `total_count: 0`.
- `main` remained `d971327934eeb79bed5b02e4477a5140615eacf0`; PR #14 head remained the exact candidate and was open/draft/mergeable.
- This is an `OPERATIONAL BLOCKER`, not a CI pass and not a test failure.

### Learning assessment

- **Supported:** DeepSeek self-execution was adequate for deterministic test, fixture, restart, and synthesis work. The local lane already had the fixture context and could maintain one-writer safety. The independent Claude review found no code defect but did catch material evidence-presentation gaps (origin-vs-local ref, fixture identity path, live-caller limit, missing checks) that self-review had not surfaced. That supports retaining a bounded cross-provider review for high-risk qualification even when the executor is confident.
- **Weakened:** the "record every task before execution" discipline slipped for repo/worktree setup by about four minutes because the worktree was created before the batched decision record. The evidence is still decision-time relative to outcomes, but the process should record earliest setup actions immediately.
- **Capacity/context:** no precise quota data was available; all unknown values stayed UNKNOWN. No model substitution occurred. The Claude review completed quickly, so capacity-to-completion was sufficient.
- **Cost/time:** no token or cost data is available from this harness; do not infer it. Wall-clock observations are limited to the recorded timestamps.
- **Hypotheses (not active policy):** for future L2-style work, a two-stage pattern may be better: record the top-level decision and repo-safety decision immediately, then batch the deterministic subtask records before their execution. Independent review should receive the evidence draft, not only the source, because its highest-value findings were about claims and coverage.

---

# Run 2 — Local DeepSeek Evidence V0 orchestration — 2026-11-01

Append-only prospective sequence. Decision IDs use the `ev0-20261101-*` namespace and do not reuse L2 IDs. Decision-time records below precede outcomes; outcome sections are appended later and never rewrite these entries.

## Starting policy record — Orchestration Evidence V0

- **Timestamp:** 2026-11-01T16:33Z.
- **OBSERVED FACT — authority:** `messages/t3-fork/2026-11-01-local-deepseek-evidence-v0-orchestration-handoff.md` (Overall Dev) directs Local Overall / Deputy Officer to design and implement the smallest useful Orchestration Evidence V0 over existing Runtime/ARM/upstream-V2 truth, on an isolated branch from exact `e51c1c5d74aed9824927d391590ddb33026c8d56`, recording decomposition and prospective routing.
- **OBSERVED FACT — routing directive:** `messages/t3-fork/2026-11-01-deepseek-routing-evidence-directive.md` remains active; DeepSeek orchestrates every task and may route bounded subtasks to Saul/Claude while retaining reconciliation and evidence responsibility.
- **OBSERVED FACT — browser lane:** the browser handoff is `messages/t3-fork/2026-11-01-browser-orchestration-evidence-v0-handoff.md`. Its expected governing path `docs/internals/orchestration-evidence-v0-spec.md` was not present at decision time. The published browser artifacts are `docs/orchestration-v2/orchestration-learning-evidence-plan-v0.md` and `docs/orchestration-v2/orchestration-evidence-ledger-standard-v3.md` on branch `docs/orchestration-evidence-v0-20261101 @ 12ef457e0c7a764cc35a4c7e60a43c401a9134ed`. They are marked **Proposed**.
- **Hard constraints:** exact base only; PR #14 candidate `e51c1c5d74...` untouched; no merge into `sync/upstream-20261031` or `main`; no second canonical execution graph, task/run identity, provider launcher, model catalog, capacity poller, account DB, or central raw-evidence store; no autonomous routing authorization; no learned router in V0; no weakened tests; one writer per overlapping code lane; no delegated worker merges shared integration branches.
- **Optimization preferences:** correctness, auditability, and upstream compatibility first; smallest useful surface; avoid scope creep; no paid infrastructure.
- **Review rule:** DeepSeek retains orchestration and reconciliation; independent architecture/evidence review is delegated to a different provider.
- **Protected decisions:** architecture divergence from the governing spec, a new canonical datastore/identity graph, security/privacy architecture, destructive/shared-history actions, material paid cost, and any PR #14 change stop for the user/Browser Overall.

## Capacity / candidate workers observed at decision time

| Candidate                                                                                               | State at decision time          | Capacity detail               | Source                            |
| ------------------------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------- | --------------------------------- |
| OpenCode / DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`)                                      | AVAILABLE, running this session | Exact quota/context `UNKNOWN` | T3 live catalog + current session |
| Claude A (`claudeAgent`) — Sonnet 5.5 / Opus 5.5 / Fable 5.1 / Haiku 5.5                                | AVAILABLE (listed)              | Exact quota/context `UNKNOWN` | T3 live catalog                   |
| Claude B — Pro (`claudeAgent_claude_b_pro`) — same models                                               | AVAILABLE (listed)              | Exact quota/context `UNKNOWN` | T3 live catalog                   |
| Codex (`codex`) / OpenAI B (`codex_c75d8114-...`) — gpt-6.1-sol, gpt-6-astra, gpt-6.1-terra, gpt-6-luna | AVAILABLE (listed)              | Exact quota/context `UNKNOWN` | T3 live catalog                   |
| Cursor / Grok / Antigravity / Muse / Pi                                                                 | DISABLED                        | N/A                           | T3 live catalog constraints       |

No distinct provider instance named "Saul" is exposed in the live catalog. Material strong-executor candidates actually available are therefore Claude A/B and Codex; "Saul" is treated as `UNKNOWN`/unavailable rather than invented. No precise quota is inferred from the absence of errors.

## Pre-outcome routing decisions — decomposition

### D-EV0-01 — Overall Evidence V0 orchestration and reconciliation

- `decision_id`: `ev0-20261101-d01`
- `recorded_at`: 2026-11-01T16:35Z
- `work_unit`: Orchestration Evidence V0 run; parent = Local Overall / Deputy Officer.
- **Difficulty:** ambiguity 0.55; scope 0.75; reasoning 0.75; integration/tool 0.65; risk 0.55; verification 0.70; band `HIGH`; confidence 0.75.
- **Candidates considered:** DeepSeek V4.1 Flash (self); Claude Sonnet 5.5; Claude Opus 5.5; Codex gpt-6.1-sol.
- **Constraints known:** exact base and frozen PR #14; browser spec uncertain/proposed; one-writer rule; local implementation must reuse canonical records; no paid infrastructure.
- **Selected executor:** DeepSeek V4.1 Flash, OpenCode harness, `variant=max`, agent `build`.
- **Planned independent reviewer:** Claude Opus 5.5 (claudeAgent), bounded architecture/evidence review after implementation.
- **Rationale (ORCHESTRATOR CLAIM):** the directive forces DeepSeek to retain orchestration regardless of difficulty. The task is broad but decomposable, and DeepSeek needs the archaeology context to make correct routing choices. Independent review is more valuable from a different provider than from self-review.
- **Alternatives rejected:** Claude as primary orchestrator (discards the active directive and the local worktree context); Codex as primary orchestrator (adds a second provider lane without a capability need).
- **Selection mechanism:** `exploit` + `forced` orchestration policy.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d01","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"local-deepseek-evidence-v0","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.55,"scope_breadth":0.75,"reasoning_complexity":0.75,"integration_tool_complexity":0.65,"risk":0.55,"verification_burden":0.70,"band":"HIGH","confidence":0.75},"selection":"exploit+forced_policy","outcome":"PENDING"}`

### D-EV0-02 — Repository safety and exact-base worktree

- `decision_id`: `ev0-20261101-d02`
- `recorded_at`: 2026-11-01T16:33Z
- **Difficulty:** ambiguity 0.10; scope 0.20; reasoning 0.15; integration/tool 0.35; risk 0.70; verification 0.35; band `LOW-MEDIUM`; confidence 0.95.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** deterministic Git/worktree work with a high safety cost. The local lane already knows the worktree map, the frozen candidate, and the live-state hazards. Delegation adds a second writer and no capability gain.
- **Alternatives rejected:** delegation to a shared checkout (writer conflict); reusing `t3code-l2-combined-20261101` (would mix lanes and risk the qualified candidate).
- **Selection mechanism:** `exploit`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d02","event_type":"routing_decision","occurred_at":"2026-11-01T16:33Z","recorded_at":"2026-11-01T16:33Z","project":"t3-fork","task":"evidence-v0-repo-safety","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.10,"scope_breadth":0.20,"reasoning_complexity":0.15,"integration_tool_complexity":0.35,"risk":0.70,"verification_burden":0.35,"band":"LOW-MEDIUM","confidence":0.95},"selection":"exploit","outcome":"PENDING"}`

### D-EV0-03 — Current domain-record archaeology

- `decision_id`: `ev0-20261101-d03`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.35; scope 0.80; reasoning 0.45; integration/tool 0.55; risk 0.25; verification 0.40; band `MEDIUM-HIGH`; confidence 0.82.
- **Candidates:** DeepSeek self; Claude Sonnet 5.5; Codex gpt-6.1-sol.
- **Selected executor:** DeepSeek V4.1 Flash primary, with a bounded **read-only independent cross-check** by Claude Sonnet 5.5 (`claudeAgent`, effort `high`) covering identity/provenance and export seams.
- **Reviewer planned:** Claude Sonnet 5.5 for the bounded archaeology cross-check only; not a writer.
- **Rationale:** archaeology is deterministic reading but broad; DeepSeek needs the primary map for design. A bounded independent read-only pass at a different provider is cheap, cannot collide with the writer, and reduces the chance of a systematically missed canonical surface.
- **Alternatives rejected:** delegating the whole archaeology (would split the context needed for design); Codex as cross-check (Claude's review was more useful in the prior L2 run).
- **Selection mechanism:** `exploit` + bounded `explore` cross-check.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d03","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-archaeology","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-sonnet-5-5"},"difficulty":{"ambiguity":0.35,"scope_breadth":0.80,"reasoning_complexity":0.45,"integration_tool_complexity":0.55,"risk":0.25,"verification_burden":0.40,"band":"MEDIUM-HIGH","confidence":0.82},"selection":"exploit+explore_crosscheck","outcome":"PENDING"}`

### D-EV0-04 — Evidence-field mapping and classification

- `decision_id`: `ev0-20261101-d04`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.45; scope 0.65; reasoning 0.65; integration/tool 0.45; risk 0.35; verification 0.55; band `MEDIUM-HIGH`; confidence 0.78.
- **Candidates:** DeepSeek self; Claude Sonnet 5.5; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** synthesis of the archaeology into `ALREADY CANONICAL` / `DERIVABLE` / `MISSING` / `AMBIGUOUS` requires holding the whole map. Delegating it would discard the primary context. The read-only cross-check from d03 feeds this unit.
- **Alternatives rejected:** split classification per domain across workers (coordination cost without capability gain).
- **Selection mechanism:** `exploit`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d04","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-field-classification","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.45,"scope_breadth":0.65,"reasoning_complexity":0.65,"integration_tool_complexity":0.45,"risk":0.35,"verification_burden":0.55,"band":"MEDIUM-HIGH","confidence":0.78},"selection":"exploit","outcome":"PENDING"}`

### D-EV0-05 — L2 sequence mapping and gap list

- `decision_id`: `ev0-20261101-d05`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.30; scope 0.45; reasoning 0.55; integration/tool 0.35; risk 0.30; verification 0.60; band `MEDIUM`; confidence 0.82.
- **Candidates:** DeepSeek self; Claude.
- **Selected executor:** DeepSeek self.
- **Rationale:** deterministic mapping of `l2-20261101-d01..d08` against the canonical map. The L2 ledger is the fixture; no new judgment is needed beyond honest `UNKNOWN` marking.
- **Alternatives rejected:** Claude (bounded, low ambiguity; the cross-check in d03 covers independent eyes).
- **Selection mechanism:** `exploit`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d05","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-l2-gap-map","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.45,"reasoning_complexity":0.55,"integration_tool_complexity":0.35,"risk":0.30,"verification_burden":0.60,"band":"MEDIUM","confidence":0.82},"selection":"exploit","outcome":"PENDING"}`

### D-EV0-06 — Browser-spec reconciliation

- `decision_id`: `ev0-20261101-d06`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.55; scope 0.35; reasoning 0.55; integration/tool 0.30; risk 0.45; verification 0.40; band `MEDIUM-HIGH`; confidence 0.72.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** the expected governing path is absent, but the browser lane published a proposed plan and ledger standard. Reconciliation is a judgment about authority and naming, not implementation. DeepSeek retains it because it owns the stop decision on material divergence.
- **Alternatives rejected:** assuming the plan v0 is fully governing without checking (risks inventing or over-committing architecture); stopping immediately for Browser Overall without archaeology (the handoff explicitly permits bounded archaeology while the spec is absent).
- **Selection mechanism:** `forced` orchestrator role.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d06","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-spec-reconciliation","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.55,"scope_breadth":0.35,"reasoning_complexity":0.55,"integration_tool_complexity":0.30,"risk":0.45,"verification_burden":0.40,"band":"MEDIUM-HIGH","confidence":0.72},"selection":"forced_orchestrator","outcome":"PENDING"}`

### D-EV0-07 — Export envelope and seam design

- `decision_id`: `ev0-20261101-d07`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.35; scope 0.45; reasoning 0.65; integration/tool 0.50; risk 0.45; verification 0.45; band `MEDIUM-HIGH`; confidence 0.75.
- **Candidates:** DeepSeek self; Claude Opus 5.5; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** the design must stay inside the published authority boundary (references to canonical records, no second store). DeepSeek holds the archaeology and the governing constraints; the independent review in d11 is the check on design risk.
- **Alternatives rejected:** routing design to Claude up front (adds a handoff and a second writer-ish lane; review at d11 is the cheaper control).
- **Selection mechanism:** `exploit` + planned independent review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d07","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-export-design","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.35,"scope_breadth":0.45,"reasoning_complexity":0.65,"integration_tool_complexity":0.50,"risk":0.45,"verification_burden":0.45,"band":"MEDIUM-HIGH","confidence":0.75},"selection":"exploit+planned_review","outcome":"PENDING"}`

### D-EV0-08 — Task-history reconstruction command design

- `decision_id`: `ev0-20261101-d08`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.30; scope 0.40; reasoning 0.60; integration/tool 0.45; risk 0.35; verification 0.50; band `MEDIUM`; confidence 0.78.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** a deterministic read/order/emit operation over the same canonical refs as the exporter. It is the natural pair to d07 and should share one design context.
- **Alternatives rejected:** splitting design across two workers (would force duplicate context and risk divergent semantics).
- **Selection mechanism:** `exploit`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d08","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-reconstruction-design","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.40,"reasoning_complexity":0.60,"integration_tool_complexity":0.45,"risk":0.35,"verification_burden":0.50,"band":"MEDIUM","confidence":0.78},"selection":"exploit","outcome":"PENDING"}`

### D-EV0-09 — Tests and fixtures using the L2 routing sequence

- `decision_id`: `ev0-20261101-d09`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.20; scope 0.45; reasoning 0.45; integration/tool 0.50; risk 0.35; verification 0.75; band `MEDIUM-HIGH`; confidence 0.80.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** tests sit beside the implementation and share its types; one writer avoids churn. The L2 fixture is already in local context.
- **Alternatives rejected:** delegating tests to a second writer while design is still moving (conflict risk).
- **Selection mechanism:** `exploit`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d09","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-tests","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.20,"scope_breadth":0.45,"reasoning_complexity":0.45,"integration_tool_complexity":0.50,"risk":0.35,"verification_burden":0.75,"band":"MEDIUM-HIGH","confidence":0.80},"selection":"exploit","outcome":"PENDING"}`

### D-EV0-10 — Smallest accepted exporter/reconstructor implementation

- `decision_id`: `ev0-20261101-d10`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.25; scope 0.55; reasoning 0.55; integration/tool 0.65; risk 0.55; verification 0.70; band `MEDIUM-HIGH`; confidence 0.75.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self (sole writer).
- **Rationale:** implementation must follow the design context and the exact canonical signatures. A cross-provider writer would either duplicate context or race on the same files. The independent review in d11 supplies the different-provider check.
- **Alternatives rejected:** Claude/Codex as co-writer (violates one-writer rule); delegating the whole implementation (loses the tight design loop; high rework risk).
- **Selection mechanism:** `exploit` + planned independent review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d10","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-implementation","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.25,"scope_breadth":0.55,"reasoning_complexity":0.55,"integration_tool_complexity":0.65,"risk":0.55,"verification_burden":0.70,"band":"MEDIUM-HIGH","confidence":0.75},"selection":"exploit+planned_review","outcome":"PENDING"}`

### D-EV0-11 — Independent architecture / evidence review

- `decision_id`: `ev0-20261101-d11`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.30; scope 0.50; reasoning 0.70; integration/tool 0.40; risk 0.60; verification 0.60; band `HIGH`; confidence 0.70.
- **Candidates:** Claude Opus 5.5 (`claudeAgent`); Claude Sonnet 5.5; Codex gpt-6.1-sol; DeepSeek self (rejected as non-independent).
- **Selected executor:** Claude Opus 5.5, `claudeAgent`, effort `high`, read-only review.
- **Rationale:** the review targets duplicate-source-of-truth risk, outcome leakage, identity/provenance, upstream compatibility, overclaiming, and generality. A different provider is structurally independent, and Opus is the strongest available reasoning option for architecture risk within the catalog.
- **Alternatives rejected:** Sonnet 5.5 (used successfully in L2, but this milestone is architecture-sensitive and Opus is available); Codex (capable, but Claude's prior review found material evidence gaps); self-review (not independent).
- **Selection mechanism:** `explore` independent review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d11","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-independent-review","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.50,"reasoning_complexity":0.70,"integration_tool_complexity":0.40,"risk":0.60,"verification_burden":0.60,"band":"HIGH","confidence":0.70},"selection":"explore_independent_review","outcome":"PENDING"}`

### D-EV0-12 — Final verification and durable handoff

- `decision_id`: `ev0-20261101-d12`
- `recorded_at`: 2026-11-01T16:35Z
- **Difficulty:** ambiguity 0.15; scope 0.35; reasoning 0.35; integration/tool 0.40; risk 0.50; verification 0.75; band `MEDIUM`; confidence 0.85.
- **Candidates:** DeepSeek self; Claude; Codex.
- **Selected executor:** DeepSeek self.
- **Rationale:** forced orchestrator responsibility. Verification must be run on the integrated branch head, and the durable result must reconcile every route and outcome honestly.
- **Alternatives rejected:** delegating the synthesis (the orchestrator owns reconciliation and the handoff).
- **Selection mechanism:** `forced` orchestrator role.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d12","event_type":"routing_decision","occurred_at":"2026-11-01T16:35Z","recorded_at":"2026-11-01T16:35Z","project":"t3-fork","task":"evidence-v0-verification-handoff","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.15,"scope_breadth":0.35,"reasoning_complexity":0.35,"integration_tool_complexity":0.40,"risk":0.50,"verification_burden":0.75,"band":"MEDIUM","confidence":0.85},"selection":"forced_orchestrator","outcome":"PENDING"}`

## Pre-outcome decomposition rationale

Work unit 3 (archaeology) and unit 4 (classification) were kept separate because the evidence standard treats "what exists" and "what the export may claim" as different obligations. Units 7 and 8 were kept separate because the envelope contract and the reconstruction ordering can be reviewed independently even though one executor owns both. Unit 6 (browser-spec reconciliation) is a gate, not a coding unit: implementation may proceed only if the published proposed artifacts are consistent with the local map, or a discrepancy record is written. No unit was merged in a way that drops the required `decision-time` / `outcome` or `occurred_at` / `recorded_at` distinctions.

## Appended outcome — D-EV0-03 cross-check attempt 1

- `decision_id`: `ev0-20261101-d03`
- `recorded_at`: 2026-11-01T16:42Z
- **State:** `BLOCKED` — `provider_capacity`.
- **Actual executor:** none; the Claude Sonnet 5.5 child task failed before producing a report.
- **Observed evidence:** delegated task `node:delegated-task:command%3Amcp%3A3dcacb51-a737-4d2b-8a14-79f3fba0724f%3Adelegate-task%3Aev0-20261101-d03-archaeology-crosscheck` returned `Claude API rate limit reached. Try again later.`
- **Effect on primary work:** none. DeepSeek continues the primary archaeology. This is not a DeepSeek failure and is not counted as independent evidence.

### D-EV0-03a — Substitute bounded archaeology cross-check

- `decision_id`: `ev0-20261101-d03a`
- `recorded_at`: 2026-11-01T16:43Z
- `work_unit`: same bounded read-only archaeology cross-check; substitute route after capacity failure.
- **Difficulty:** unchanged from d03 (`MEDIUM-HIGH`, confidence 0.82).
- **Candidates considered:** Claude A (rate-limited), Claude B — Pro (same vendor, untested but plausibly affected by the same limit class), Codex gpt-6.1-sol (different provider, available), DeepSeek self (already primary; not independent).
- **Selected executor:** Codex `codex` / `gpt-6.1-sol`, reasoning effort `high`, read-only.
- **Rationale (ORCHESTRATOR CLAIM):** the planned cross-check still has value and the different-provider property is preserved. Codex is available in the same live catalog, and choosing it also produces cross-vendor routing evidence rather than a same-vendor retry. No file writes.
- **Alternatives rejected:** retrying Claude A immediately (same capacity failure likely; wastes a route); Claude B (same vendor limit class; no additional evidence); staying with self-review (not independent).
- **Selection mechanism:** `forced_capacity_substitution`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d03a","event_type":"routing_decision","occurred_at":"2026-11-01T16:43Z","recorded_at":"2026-11-01T16:43Z","project":"t3-fork","task":"evidence-v0-archaeology-crosscheck-substitute","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"codex","model":"gpt-6.1-sol"},"difficulty":{"ambiguity":0.35,"scope_breadth":0.80,"reasoning_complexity":0.45,"integration_tool_complexity":0.55,"risk":0.25,"verification_burden":0.40,"band":"MEDIUM-HIGH","confidence":0.82},"selection":"forced_capacity_substitution","prior_attempt":"ev0-20261101-d03","outcome":"PENDING"}`

## Appended outcome — D-EV0-03a Codex cross-check

- `decision_id`: `ev0-20261101-d03a`
- `recorded_at`: 2026-11-01T16:52Z
- **State:** `COMPLETED` — read-only archaeology cross-check returned.
- **Actual executor:** Codex `codex` / `gpt-6.1-sol`, effort `high`, no substitution during the task.
- **Observed evidence (summary):** confirmed the canonical identity/tables map; confirmed the Runtime receipt holds selected launch intent only, not executed-model attestation; confirmed ARM has persistence APIs but no active production producer path; confirmed the V2 event log is authoritative over projections and that Runtime attempts join by threadId/runId, not RunAttemptId; confirmed no unified exporter exists; classified choice set/rationale/executed provenance as `AMBIGUOUS` or `MISSING`; flagged event compaction as a threat to permanently complete history.
- **Effect on primary work:** used as an independent cross-check. No material conflict with DeepSeek's primary map; it added the "no active ARM producer" and "event compaction" findings, both carried into the result.
- **Learning:** the capacity substitution preserved independence and produced a useful cross-vendor check. Claude remains unavailable for review unless a later attempt succeeds.

### D-EV0-11a — Independent review capacity substitution

- `decision_id`: `ev0-20261101-d11a`
- `recorded_at`: 2026-11-01T17:30Z
- `work_unit`: independent architecture/evidence review of commit `30b20c12cc` over base `e51c1c5d74`.
- **Difficulty:** unchanged from d11 (`HIGH`, confidence 0.70).
- **Candidates considered:** Claude A Opus 5.5 (planned; rate-limited at 16:42Z), Claude B — Pro Opus 5.5 (separate listed instance, untested), Codex gpt-6.1-sol (available; already used for the archaeology cross-check), DeepSeek self (not independent).
- **Selected executor (pre-dispatch):** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`, effort `high`, read-only.
- **Rationale (ORCHESTRATOR CLAIM):** the planned reviewer family is retained while switching instances to avoid the observed Claude A capacity failure. Claude B is a separate listed instance. Codex remains the planned fallback if Claude B fails for the same reason.
- **Alternatives rejected:** Claude A retry (same observed limit; likely repeat); Codex as first choice (already used for the d03a cross-check, so a same-model review would be less independent); self-review (not independent).
- **Selection mechanism:** `forced_capacity_substitution`.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-20261101-d11a","event_type":"routing_decision","occurred_at":"2026-11-01T17:30Z","recorded_at":"2026-11-01T17:30Z","project":"t3-fork","task":"evidence-v0-independent-review-substitute","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent_claude_b_pro","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.50,"reasoning_complexity":0.70,"integration_tool_complexity":0.40,"risk":0.60,"verification_burden":0.60,"band":"HIGH","confidence":0.70},"selection":"forced_capacity_substitution","prior_attempt":"ev0-20261101-d11","outcome":"PENDING"}`

## Appended outcome — D-EV0-04 archaeology and field classification

- `decision_id`: `ev0-20261101-d04`
- `recorded_at`: 2026-11-01T17:10Z
- **State:** `COMPLETED`.
- **Actual executor:** DeepSeek V4.1 Flash (primary); Codex gpt-6.1-sol independent read-only cross-check (d03a). No substitution during synthesis.
- **Observed evidence:** implementation archaeology at exact base — `packages/contracts/src/{projectRuntime,runtimeExecution,adaptiveRouting,orchestrationV2,baseSchemas}.ts`; `apps/server/src/projectRuntime/{ProjectRuntimeService,RuntimeTaskExecutionService,AdaptiveRoutingService}.ts`; `apps/server/src/persistence/Migrations/Fork/{001_ProjectRuntime,005_RuntimeExecutionAttempts,007_AdaptiveRouting}.ts`; `apps/server/src/persistence/Migrations/055_OrchestrationV2.ts`; `apps/server/src/orchestration-v2/{EventStore,ProjectionStore}.ts`.

### Classification

| Evidence field                                                                                   | Class                                                                    | Where it actually lives                                                                                                                                 |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Project / Runtime task identity                                                                  | `ALREADY CANONICAL`                                                      | `ProjectRuntimeTaskId`; `project_runtime_tasks` (mutable payload with revision CAS)                                                                     |
| Runtime execution-attempt identity                                                               | `ALREADY CANONICAL`                                                      | `RuntimeExecutionAttemptId`; `project_runtime_execution_attempts`                                                                                       |
| Provider instance identity                                                                       | `ALREADY CANONICAL`                                                      | `ProviderInstanceId`; settings/registry, no dedicated identity table                                                                                    |
| V2 thread / run / run-attempt / node / provider-session / provider-thread / context-transfer IDs | `ALREADY CANONICAL`                                                      | Branded IDs in `baseSchemas.ts`; authoritative `orchestration_events`, mutable `orchestration_v2_projection_*`                                          |
| Requested route                                                                                  | `ALREADY CANONICAL`                                                      | Attempt `receipt.route` + `receipt.launch`                                                                                                              |
| Selected route                                                                                   | `ALREADY CANONICAL`                                                      | Attempt `receipt.route.selected`; launch `modelSelection`                                                                                               |
| Executed model/provider                                                                          | `AMBIGUOUS` / `MISSING`                                                  | ARM `configuration.executed` can be `provider_reported`, `t3_observed`, or `unknown`; no active producer; the Runtime attempt does not attest execution |
| Difficulty prediction                                                                            | `ALREADY CANONICAL` (record), producer `AMBIGUOUS`                       | `AdaptiveDifficultyPrediction`; `adaptive_difficulty_predictions`                                                                                       |
| Realized difficulty                                                                              | `ALREADY CANONICAL` (derived record)                                     | `adaptive_realized_difficulties`                                                                                                                        |
| Recommendation / receipt                                                                         | `ALREADY CANONICAL` (record), producer `AMBIGUOUS`                       | `adaptive_recommendation_receipts`; advisory only                                                                                                       |
| Capacity identity / snapshots                                                                    | `ALREADY CANONICAL` (record), producer `AMBIGUOUS`                       | `adaptive_capacity_pools` / `adaptive_capacity_snapshots`; capture API exists but no dispatch-time link                                                 |
| Verification profile / result / independence                                                     | `ALREADY CANONICAL` (optional)                                           | ARM `verification`; task `verification.milestone/evidence`                                                                                              |
| Failure / blocker taxonomy                                                                       | `ALREADY CANONICAL`                                                      | ARM `failure.class`; task `blocker.classification`                                                                                                      |
| Accepted outcome / reconciliation                                                                | `ALREADY CANONICAL`                                                      | `adaptive_accepted_outcomes` (mutable CAS head) + `adaptive_outcome_reconciliations` (append history)                                                   |
| Experiment assignment                                                                            | `ALREADY CANONICAL` (record), producer `AMBIGUOUS`                       | `adaptive_experiment_assignments`                                                                                                                       |
| Choice set (considered / rejected / never evaluated)                                             | `AMBIGUOUS`                                                              | Route has selected + rejected reasons; per-candidate state, belief, capacity-to-completion, and never-evaluated candidates are not all present          |
| Orchestrator rationale / policy version / selection mechanism                                    | `AMBIGUOUS`                                                              | Route `source` + revisions; ARM `reasons`/`scoringVersion`; no canonical free-text rationale or selection mechanism at dispatch                         |
| Decision-time capacity / context observation                                                     | `MISSING`                                                                | Optional snapshot links; no dispatch-time capture; context limit/compaction not recorded                                                                |
| Reviewer identity, relation/independence, verdict, artifact judged                               | `MISSING`                                                                | Only coarse ARM `verification.independence/result`; no reviewer identity, artifact hash, or assessment chain                                            |
| Rework / retry / salvage count                                                                   | `DERIVABLE` for retries; `MISSING` for semantic rework/salvage           | Attempt ordinals and run-attempt reasons; no canonical rework/salvage counter                                                                           |
| `occurred_at` vs `recorded_at`                                                                   | `AMBIGUOUS`                                                              | ARM/Runtime use `createdAt`; V2 events store `occurred_at` only; capacity snapshots store `observed_at` only                                            |
| Explicit UNKNOWN                                                                                 | `ALREADY CANONICAL` selectively                                          | ARM `executed.quality: unknown`, capacity measurement `unknown`; not universal, so the exporter adds `unknownFields`                                    |
| Append-only correction                                                                           | `ALREADY CANONICAL` for ARM outcomes; `MISSING` for task/attempt history | Outcome reconciliation table; task payload overwritten by revision CAS                                                                                  |
| Stable task -> attempt -> V2 refs                                                                | `ALREADY CANONICAL`; `AMBIGUOUS` for optional ARM -> V2 links            | Attempt `threadId`/`runId`; ARM `execution` block optional                                                                                              |
| Export / serialization seam                                                                      | `MISSING` before this run                                                | No unified Runtime/ARM/V2 evidence exporter; only task/attempt read RPCs and visible transcript HTTP                                                    |

### Cross-check findings adopted

- ARM persistence APIs exist for all ten records, but **no active production producer path** was found outside the service. V0 export will often see empty ARM tables. This is a producer gap, not an exporter gap.
- The Runtime receipt is **selected launch intent**, not executed-model attestation.
- `orchestration_events` is authoritative over projections, but `ProjectionMaintenance` deletes superseded events; event-sourced does **not** guarantee permanently complete history.
- Runtime attempts join to V2 by `threadId`/`runId`, **not** `RunAttemptId`.

## Appended outcome — D-EV0-05 L2 sequence mapping and gap list

- `decision_id`: `ev0-20261101-d05`
- `recorded_at`: 2026-11-01T17:12Z
- **State:** `COMPLETED` (`STATIC`).
- **Reference:** `docs/t3-fork-orchestration-evidence-20261101 @ 6b143992cbc811cbb2deec8b32d9ebd2a1ac87cd`, decisions `l2-20261101-d01`..`d08`.

| L2 decision                            | Reconstructable from canonical state? | What exists                                    | Gap                                                              |
| -------------------------------------- | ------------------------------------- | ---------------------------------------------- | ---------------------------------------------------------------- |
| `d01` overall orchestration            | No                                    | Task record only                               | No per-decision routing record for the orchestrator role         |
| `d02` repo safety / exact-SHA worktree | No                                    | Task `base` metadata optionally                | No per-decision record, no worktree-audit record                 |
| `d03` focused tests + typecheck        | Partial                               | Task `verification.evidence`                   | Not linked to a routing decision; no per-command runtime record  |
| `d04` Runtime/V2 provenance            | Partial                               | Attempt receipt + optional ARM observation     | Executed provenance may be `UNKNOWN`; no active producer         |
| `d05` rendered UI / restart            | Partial                               | Task verification evidence                     | No artifact hash or rendered-evidence reference                  |
| `d06` real-provider availability       | Partial                               | Task blocker `operational-blocker`             | Credential/account facts are not canonical (correct for privacy) |
| `d07` independent review               | Partial                               | ARM `verification.independence/result`         | No reviewer identity, artifact judged, or assessment chain       |
| `d08` final handoff synthesis          | Partial                               | Task `result`, `nextAction`, `latestHandoffId` | No decision record for the synthesis route                       |

**Gap list (implementation target):**

1. No per-subtask routing-decision record; L2 `d01`, `d02`, `d05`, `d08` are ledger-only.
2. No executed-model attestation at the Runtime attempt boundary; ARM has a slot but no producer.
3. No decision-time capacity/context capture at dispatch.
4. No reviewer identity / artifact-judged / append-only assessment chain.
5. V2 events lack `recorded_at`; compaction can remove superseded history.
6. No task-revision history; the task row is a current snapshot.
7. ARM producer paths are unwired in production, so ARM evidence may be empty.
8. No canonical per-candidate choice-set state (belief, capacity-to-completion, never-evaluated).

V0 therefore exports and reconstructs what canonical state supports and marks the rest `UNKNOWN` or absent. It does not invent the ledger-only decisions.

## Appended outcome — D-EV0-06 browser-spec reconciliation

- `decision_id`: `ev0-20261101-d06`
- `recorded_at`: 2026-11-01T17:14Z
- **State:** `COMPLETED` — no material conflict; no stop condition.
- **OBSERVED FACT — expected path absent:** `docs/internals/orchestration-evidence-v0-spec.md` was not present on any fetched branch at decision time.
- **OBSERVED FACT — published artifacts consumed:** `docs/orchestration-v2/orchestration-learning-evidence-plan-v0.md` and `docs/orchestration-v2/orchestration-evidence-ledger-standard-v3.md` on `docs/orchestration-evidence-v0-20261101 @ 12ef457e0c7a764cc35a4c7e60a43c401a9134ed`. Both are marked **Proposed**.
- **Reconciliation:** the local map agrees with the plan's authority boundaries, decision/outcome separation, refs-first export, and no-second-store rule. The plan's WP0 gap audit is satisfied by d04/d05. The local implementation is limited to the read-only exporter/reconstructor (WP4-shaped); producers (WP2/WP3) were not implemented because they are architecture-sensitive and the exact governing spec is not yet published.
- **Naming difference:** file placement/path is a routine difference, not a product decision.
- **Discrepancy record:** none material. Browser Overall should confirm that a read-only exporter over canonical records is the accepted V0 slice before any producer work begins.

## Appended outcome — D-EV0-09/D-EV0-10 implementation and focused tests

- `decision_id`: `ev0-20261101-d09`, `ev0-20261101-d10`
- `recorded_at`: 2026-11-01T17:27Z
- **State:** `IMPLEMENTED` + `STATIC PASS` (no runtime/browser claim).
- **Commit:** `30b20c12cc` on `feat/orchestration-evidence-v0-20261101`, base `e51c1c5d74aed9824927d391590ddb33026c8d56`.
- **Files:** `packages/contracts/src/orchestrationEvidence.ts`; `packages/contracts/src/index.ts`; `apps/server/src/projectRuntime/OrchestrationEvidenceService.ts`; `apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts`; project evidence files.
- **Behavior:** read-only `exportTask`, `exportTaskJsonl`, and `reconstructTaskHistory` over `project_runtime_tasks`, `project_runtime_execution_attempts`, and the ARM tables. No new table, migration, insert, launcher, catalog, or poller. JSONL is the versioned `orchestration-evidence/v0` envelope. `unknownFields` carries explicit unknowns. Corrections are emitted from `adaptive_outcome_reconciliations`, not by mutating prior decision events.
- **Verification:**
  - focused test file: 9/9 pass after review fixes (`vp test run apps/server/src/projectRuntime/OrchestrationEvidenceService.test.ts`);
  - `@t3tools/contracts` typecheck pass; `t3` (server) typecheck pass; neighbor `AdaptiveRoutingService` + `RuntimeTaskExecutionService` tests 32/32 pass;
  - `vp run check:changed`: format, lint, knip 1/2, graphql, typecheck (39/39 packages), and react compiler pass; knip 2/2 initially failed on one unused export (`ORCHESTRATION_EVIDENCE_BOUNDS`), fixed and rechecked clean; the repo-wide 699-file test step hit its 900 s budget (`TIMEOUT`, explicitly not a failure).
- **Limits:** the service is not wired to RPC/MCP/CLI/UI, so this is not a runtime surface. No real database was exercised with production data; tests use an in-memory SQLite layer. No executed-model attestation is claimed.

## Appended outcome — D-EV0-11a independent review

- `decision_id`: `ev0-20261101-d11`, `ev0-20261101-d11a`
- `recorded_at`: 2026-11-01T17:45Z
- **State:** `REVIEW PASS WITH FINDINGS`; all blocking findings repaired.
- **Actual executor:** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`, effort `high`, read-only. No substitution during the task.
- **Scope reviewed:** base `e51c1c5d74` through implementation commit `30b20c12cc` (plus the test-only `8fef8e56a1`). The reviewer ran the focused test file and reported 7 tests at review time.

### Blocking findings and repairs (commit `00d8ca71bc`)

1. **B1 — JSONL not deterministic on real data.** The task event used `generatedAt` as `recordedAt`, so every real export changed. Repaired: task `recordedAt` is `null` with `unknownFields: ["recordedAt"]`; `generatedAt` stays only in the envelope. Added a test that advances `TestClock` one hour and requires byte-identical JSONL.
2. **B2 — post-launch `runId` leaked into the decision record.** `runId` is null at attempt creation and filled after launch, while the decision event claimed a decision-time recording time. Repaired: the decision event drops `runId` and the V2 run reference, and marks `runId` and other absent decision-time facts in `unknownFields`. Added a test that exports a pending attempt, promotes it to completed with a run id, and requires the decision line to stay byte-identical.
3. **B3 — mutable accepted-outcome head labelled canonical.** Repaired: the head is `recordBasis: "derived-view"` with the revision in `eventId`; each reconciliation also emits a superseded-revision event carrying the prior state, with `occurredAt`/`recordedAt` explicitly unknown because the overwritten row has no preserved time. The correction test now requires both revisions to remain recoverable.

### Non-blocking findings disposition

- **N1 attempt outcome occurrence:** now `occurredAt: null` with `unknownFields: ["occurredAt"]`; `recordedAt` remains the row write time.
- **N2 accepted outcome occurrence:** now `occurredAt = provenance.observedAt`, `recordedAt = reconciledAt`.
- **N3 capacity attribution:** kept the exporting project for envelope context, retained `scope: "environment"`, and added `sourceRef` provenance.
- **N4 vocabulary collision:** renamed the envelope axis to `lifecycleClass` and the canonical/derived axis to `recordBasis` (`canonical-record` / `derived-view`); documented that this is not the ledger's `evidence_class`.
- **N5 decision unknowns:** decision events now list `runId`, `choiceSet.perCandidateState`, `capacity`, `context`, and `selectionMechanism` as unknown.
- **N6 tests:** reference checks now resolve each `recordId` and each resolvable reference against its canonical table; added wall-clock determinism and pre-launch decision-stability tests; correction test asserts the superseded revision.
- **N7 validation:** window fact keys are ordinal (`window.<index>.id` + `.id` fact), and sorting parses ISO times rather than comparing text.
- **N8 wiring:** the service remains unwired to RPC/MCP/CLI/UI. This is a deliberate V0 scope limit, recorded in the result and in the ledger.

### Review independence and limits

- Different provider family and different account instance from the orchestrator and from the d03a Codex cross-check.
- The review verdict applies to `30b20c12cc`; the repairs in `00d8ca71bc` were validated by focused tests, typecheck, lint, knip, and formatting, but were **not** sent through a second independent review.
- Reviewer false positives it dismissed: second datastore, parallel identity, invented executed model, dishonest capacity `recordedAt`, label errors on insert-only ARM records, rebase risk, CCF-specific code, privacy leakage, event-ID overflow.

---

# Run 3 — Orchestration Evidence V0 governing-spec repair — decision-time records

Run: Local DeepSeek Evidence V0 repair (B1–B7)
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, variant `max`, agent `build`)
Base: `e51c1c5d74aed9824927d391590ddb33026c8d56`
Starting head: `14f0f10c5f2bb980aaabbb5da385daaa28267424`
Governing spec: `docs/internals/orchestration-evidence-v0-spec.md @ d3a31b7fb89fd75c0d452c3b29a3d2ca9bb98acf`

These decisions are prospective and recorded before repair implementation. They do not rewrite `ev0-20261101-d01..d12`.

### D-EV0R-01 — Overall repair orchestration

- `decision_id`: `ev0-repair-20261101-d01`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.20; scope 0.75; reasoning 0.60; integration/tool 0.65; risk 0.60; verification 0.80; band `HIGH`; confidence 0.80.
- **Candidates:** DeepSeek self (orchestrator, one writer); Claude/Codex bounded cross-checks; independent reviewer after repair.
- **Selected executor:** DeepSeek self for orchestration and implementation; independent review by a non-DeepSeek provider after the repaired head exists.
- **Rationale:** the repair is bounded to one isolated branch and one service/contract/test lane. DeepSeek already holds the archaeology and review context, and the directive keeps orchestration with DeepSeek. Independence remains mandatory for review.
- **Alternatives rejected:** handing orchestration to a stronger model (violates the current prospective routing directive and would discard context); parallel writers on the same files (conflict risk).
- **Selection mechanism:** forced orchestrator + planned independent review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d01","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-spec-repair-orchestration","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"reviewer_planned":{"provider":"claudeAgent","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.20,"scope_breadth":0.75,"reasoning_complexity":0.60,"integration_tool_complexity":0.65,"risk":0.60,"verification_burden":0.80,"band":"HIGH","confidence":0.80},"selection":"forced_orchestrator_plus_planned_review","outcome":"PENDING"}`

### D-EV0R-02 — V2 read-seam archaeology

- `decision_id`: `ev0-repair-20261101-d02`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.35; scope 0.55; reasoning 0.50; integration/tool 0.60; risk 0.35; verification 0.45; band `MEDIUM-HIGH`; confidence 0.80.
- **Candidates:** DeepSeek self; bounded Claude/Codex read-only cross-check.
- **Selected executor:** DeepSeek self.
- **Rationale:** the governing spec explicitly prefers existing event-store seams. The relevant surfaces (`EventStoreV2.read`, bounded by `threadId`/`limit`) are local and inspectable; a second reader would add coordination cost without reducing risk.
- **Alternatives rejected:** direct SQL over `orchestration_events` (duplicates the repository-owned read semantics); a new projection/read model (second truth surface).
- **Selection mechanism:** exploit.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d02","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-v2-read-seam-archaeology","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.35,"scope_breadth":0.55,"reasoning_complexity":0.50,"integration_tool_complexity":0.60,"risk":0.35,"verification_burden":0.45,"band":"MEDIUM-HIGH","confidence":0.80},"selection":"exploit","outcome":"PENDING"}`

### D-EV0R-03 — Contract repair (authority, staging, export clock)

- `decision_id`: `ev0-repair-20261101-d03`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.25; scope 0.55; reasoning 0.55; integration/tool 0.50; risk 0.55; verification 0.60; band `MEDIUM-HIGH`; confidence 0.78.
- **Candidates:** DeepSeek self; bounded contract review by reviewer.
- **Selected executor:** DeepSeek self.
- **Rationale:** these are additive envelope semantics required by the governing spec (B2, B6). Keeping them in one lane avoids split ownership of the contract.
- **Alternatives rejected:** a second parallel envelope (duplicate contract); an export header only (still requires per-item or header clock semantics and is harder to test).
- **Selection mechanism:** exploit + planned review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d03","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-contract-repair","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.25,"scope_breadth":0.55,"reasoning_complexity":0.55,"integration_tool_complexity":0.50,"risk":0.55,"verification_burden":0.60,"band":"MEDIUM-HIGH","confidence":0.78},"selection":"exploit_plus_planned_review","outcome":"PENDING"}`

### D-EV0R-04 — Recommendation ambiguity and staging design

- `decision_id`: `ev0-repair-20261101-d04`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.45; scope 0.50; reasoning 0.65; integration/tool 0.45; risk 0.55; verification 0.55; band `HIGH`; confidence 0.75.
- **Candidates:** DeepSeek self; independent reviewer for semantic check.
- **Selected executor:** DeepSeek self.
- **Rationale:** B3 and B4 are semantic classification problems over existing identities. They need one coherent design in the same service; splitting them risks inconsistent authority vocabulary.
- **Alternatives rejected:** adding a canonical recommendation-to-attempt foreign key (explicitly prohibited for convenience); persisting staging rows (prohibited second datastore).
- **Selection mechanism:** exploit + planned review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d04","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-ambiguity-staging-design","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.45,"scope_breadth":0.50,"reasoning_complexity":0.65,"integration_tool_complexity":0.45,"risk":0.55,"verification_burden":0.55,"band":"HIGH","confidence":0.75},"selection":"exploit_plus_planned_review","outcome":"PENDING"}`

### D-EV0R-05 — Focused test implementation

- `decision_id`: `ev0-repair-20261101-d05`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.15; scope 0.60; reasoning 0.45; integration/tool 0.55; risk 0.35; verification 0.70; band `MEDIUM-HIGH`; confidence 0.85.
- **Candidates:** DeepSeek self; delegate to a bounded test-only worker.
- **Selected executor:** DeepSeek self.
- **Rationale:** tests must preserve existing assertions and tie directly to the repaired implementation. The file is small and tightly coupled to the service; a test-only delegate would still need the same context.
- **Alternatives rejected:** weakening or deleting existing tests (prohibited); a separate test harness/framework (unnecessary).
- **Selection mechanism:** exploit.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d05","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-repair-tests","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.15,"scope_breadth":0.60,"reasoning_complexity":0.45,"integration_tool_complexity":0.55,"risk":0.35,"verification_burden":0.70,"band":"MEDIUM-HIGH","confidence":0.85},"selection":"exploit","outcome":"PENDING"}`

### D-EV0R-06 — Independent architecture/evidence review of repaired head

- `decision_id`: `ev0-repair-20261101-d06`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.30; scope 0.55; reasoning 0.70; integration/tool 0.40; risk 0.65; verification 0.60; band `HIGH`; confidence 0.70.
- **Candidates:** Claude Opus 5.5 (`claudeAgent`); Claude B — Pro; Codex gpt-6.1-sol; DeepSeek self (rejected as non-independent).
- **Selected executor:** Claude provider instance first, capacity substitution appended if needed.
- **Rationale:** the pre-repair review does not cover B1–B7. The reviewer must inspect duplicate-source risk, V2 lifecycle duplication, outcome leakage, ambiguity, provenance, staging classification, bounded reads, export clocks, upstream compatibility, and genericity.
- **Alternatives rejected:** reusing the prior review verdict (not applicable to the new head); self-review (not independent).
- **Selection mechanism:** explore independent review + capacity substitution rule.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d06","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-repaired-head-review","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.55,"reasoning_complexity":0.70,"integration_tool_complexity":0.40,"risk":0.65,"verification_burden":0.60,"band":"HIGH","confidence":0.70},"selection":"explore_independent_review","outcome":"PENDING"}`

### D-EV0R-07 — Final verification and durable handoff

- `decision_id`: `ev0-repair-20261101-d07`
- `recorded_at`: 2026-11-01T19:45Z
- **Difficulty:** ambiguity 0.15; scope 0.40; reasoning 0.35; integration/tool 0.45; risk 0.50; verification 0.80; band `MEDIUM`; confidence 0.85.
- **Candidates:** DeepSeek self; delegate verification.
- **Selected executor:** DeepSeek self.
- **Rationale:** forced orchestrator responsibility. Verification must run on the repaired head and the handoff must reconcile every route and outcome honestly.
- **Alternatives rejected:** delegating synthesis (orchestrator owns reconciliation).
- **Selection mechanism:** forced orchestrator.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d07","event_type":"routing_decision","occurred_at":"2026-11-01T19:45Z","recorded_at":"2026-11-01T19:45Z","project":"t3-fork","task":"evidence-v0-repair-verification-handoff","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.15,"scope_breadth":0.40,"reasoning_complexity":0.35,"integration_tool_complexity":0.45,"risk":0.50,"verification_burden":0.80,"band":"MEDIUM","confidence":0.85},"selection":"forced_orchestrator","outcome":"PENDING"}`

## Appended outcome — D-EV0R-06 independent review attempt 1

- `decision_id`: `ev0-repair-20261101-d06`
- `recorded_at`: 2026-11-01T19:58Z
- **State:** `BLOCKED` — provider capacity, not a review result.
- **Observed evidence:** delegated review task to `claudeAgent` / `claude-opus-5-5` (effort `max`) returned `Claude API rate limit reached. Try again later.` No review report was produced and it is not counted as evidence.
- **Repair:** append a new substitution decision (`ev0-repair-20261101-d06a`) and route the bounded review to an available different provider.

### D-EV0R-06a — Capacity substitution for repaired-head review

- `decision_id`: `ev0-repair-20261101-d06a`
- `recorded_at`: 2026-11-01T19:58Z
- **Difficulty:** same as d06 (ambiguity 0.30; scope 0.55; reasoning 0.70; integration/tool 0.40; risk 0.65; verification 0.60; band `HIGH`; confidence 0.67).
- **Candidates:** Codex gpt-6.1-sol; Claude B — Pro; DeepSeek self (rejected as non-independent).
- **Selected executor:** Codex `gpt-6.1-sol`, read-only review.
- **Rationale:** the planned Claude instance is rate-limited. Codex is available, is a different provider/model from the DeepSeek implementer, and already performed a useful independent archaeology cross-check in the prior run.
- **Alternatives rejected:** retrying the rate-limited Claude instance immediately (likely wasted capacity); Claude B as a second fallback only if Codex also fails; self-review (not independent).
- **Selection mechanism:** forced capacity substitution.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d06a","event_type":"routing_decision","occurred_at":"2026-11-01T19:58Z","recorded_at":"2026-11-01T19:58Z","project":"t3-fork","task":"evidence-v0-repaired-head-review-substitute","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"codex","model":"gpt-6.1-sol"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.55,"reasoning_complexity":0.70,"integration_tool_complexity":0.40,"risk":0.65,"verification_burden":0.60,"band":"HIGH","confidence":0.67},"selection":"forced_capacity_substitution","prior_attempt":"ev0-repair-20261101-d06","outcome":"PENDING"}`

## Appended outcome — D-EV0R-06a Codex review rounds 1–2

- `decision_id`: `ev0-repair-20261101-d06a`
- `recorded_at`: 2026-11-01T20:12Z
- **State:** `COMPLETED WITH FINDINGS` across two review rounds; fresh round 3 could not start.
- **Round 1 (`6107400197`):** `REVIEW FAIL` — 5 blocking findings (V2 execution IDs lost, V2 sequence ordering non-transitive, long Runtime verification summaries broke JSONL, proof refs dropped, single source clock duplicated as occurred+recorded).
- **Round 2 (`d193021e`):** `REVIEW FAIL` — prior findings 2/3/5 repaired, prior 1/4 partial; additional blockers: 300-char proof refs exceeded `EvidenceId` cap, 50-window capacity snapshot exceeded 100-fact cap, payload-only run IDs bypassed the run filter, reconciliation ties ignored revision order, Runtime decision still duplicated `createdAt`.
- **Repairs after round 2:** final head `fedfcdf7` preserves root-node/provider-thread/detached-session/context-handoff refs; proof refs stay in uncapped facts; facts cap raised to 2,000 and covered by a 50-window test; loader/projector share payload-derived run identity; reconciliation ordering uses revision before id; Runtime task/decision clocks use `recordedAt` with explicit `occurredAt` UNKNOWN.
- **Round 3 attempt:** blocked before any review output — `You've hit your usage limit... try again at Nov 4th, 2026 9:06 AM`. No round-3 verdict exists.

### D-EV0R-06b — Second capacity substitution for final review

- `decision_id`: `ev0-repair-20261101-d06b`
- `recorded_at`: 2026-11-01T20:16Z
- **Difficulty:** same as d06 (ambiguity 0.30; scope 0.55; reasoning 0.70; integration/tool 0.40; risk 0.65; verification 0.60; band `HIGH`; confidence 0.65).
- **Candidates:** Claude B — Pro (`claudeAgent_claude_b_pro`); Claude A; DeepSeek self (rejected as non-independent).
- **Selected executor:** Claude B — Pro / `claude-opus-5-5`, read-only review.
- **Rationale:** Codex is capacity-blocked until 2026-11-04. Claude B was the successful independent reviewer in the prior Evidence V0 run and is a different provider/model from the DeepSeek implementer. Claude A was rate-limited earlier in this run; Claude B is the next-best independent option.
- **Alternatives rejected:** waiting for Codex reset (blocked for days); self-review (not independent); shipping without a final review (would leave the repaired head unreviewed).
- **Selection mechanism:** forced capacity substitution.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d06b","event_type":"routing_decision","occurred_at":"2026-11-01T20:16Z","recorded_at":"2026-11-01T20:16Z","project":"t3-fork","task":"evidence-v0-final-review-substitute","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent_claude_b_pro","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.30,"scope_breadth":0.55,"reasoning_complexity":0.70,"integration_tool_complexity":0.40,"risk":0.65,"verification_burden":0.60,"band":"HIGH","confidence":0.65},"selection":"forced_capacity_substitution","prior_attempt":"ev0-repair-20261101-d06a","outcome":"PENDING"}`

## Appended outcome — D-EV0R-06b final independent review

- `decision_id`: `ev0-repair-20261101-d06b`
- `recorded_at`: 2026-11-01T20:37Z
- **State:** `REVIEW PASS WITH FINDINGS`; no blocking findings.
- **Actual executor:** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`, effort `high`, read-only.
- **Reviewed code head:** `fedfcdf7f575eecc223037640e0bec5e2042e35e`. The review found no blocking defects. Non-blocking findings:
  - N1: `provider-session.detached` produced a false unresolved marker because the resolver skipped events without `payload.id` before the detached branch.
  - N2: comparator was not transitive and could emit later outcome heads before superseded revisions.
  - N3: >100 references (101 admissible receipts) produced an invalid link item and JSONL export failure.
  - N4: V2 reads stop silently at 1,000 events per thread with no truncation marker (not repaired).
- **Repairs:** detached branch moved before the id guard; comparator rewritten into contiguous V2 / outcome-head / correction blocks with revision-first ordering inside blocks; references cap raised to 2,000 with a 101-receipt test.
- **Repaired head re-review (`7db996d23a87bb8eab9041bf2d969e38c1129865`):** `REVIEW PASS WITH FINDINGS`, no new blockers. N1/N2/N3 = REPAIRED. Remaining non-blocking/UNKNOWN: N4 silent 1,000-event truncation marker; cross-task staging references silently dropped; theoretical V2 ID length; hard 2,000-reference cap; outcome-head block ordering is a deliberate deterministic choice rather than true chronology; contract cap loosening may affect consumers still on the old 100-reference limit.
- **Verdict discipline:** static/test-level only. No `RUNTIME PASS`.

## Appended outcome — D-EV0R-07 final verification and handoff

- `decision_id`: `ev0-repair-20261101-d07`
- `recorded_at`: 2026-11-01T20:39Z
- **State:** `STATIC PASS / REVIEW PASS WITH FINDINGS / NOT RUNTIME PASS / NOT MERGED`.
- **Code head:** `7db996d23a87bb8eab9041bf2d969e38c1129865` (this docs commit follows it). Base/merge-base remains `e51c1c5d74aed9824927d391590ddb33026c8d56`.
- **Focused tests:** `OrchestrationEvidenceService.test.ts` 24/24 pass; `AdaptiveRoutingService.test.ts` + `RuntimeTaskExecutionService.test.ts` 32/32 pass; combined 56/56.
- **Typechecks:** `@t3tools/contracts` pass; `t3` server pass.
- **Static gates:** per-commit `vp fmt`, `vp lint`, and `vp run knip:check` passed; targeted `knip` over `apps/server` and `packages/contracts` clean; `git diff --check` clean.
- **B1–B7:** B1 bounded V2 reads/refs (including detached and context-handoff refs) satisfied; B2 six authorities; B3 unique/ambiguous recommendation links; B4 real L2 staging coexistence; B5 requested/selected/executed separation with executed UNKNOWN; B6 separate occurrence/recording/export clocks with stable item identity; B7 Runtime verification/handoff distinct from ARM verification.
- **Remaining UNKNOWNs/blockers:** no live-service/real-database exercise; no RPC/MCP/CLI/UI transport; 1,000-event V2 read limit lacks a truncation marker; cross-task staging references are dropped; ARM producers remain unwired (later milestone); 2,000-reference cap is finite.
- **PR #14:** untouched at `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`; not merged, not advanced, not strengthened by this work.
- **Next action:** Browser Overall inspects the exact final diff and evidence; do not merge. Transport wiring plus live/real-DB verification is the next milestone.

---

# Run 4 — Evidence V0 narrow Runtime provenance repair — decision-time records

Run: Local DeepSeek Evidence V0 provenance repair (P1/P2)
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, variant `max`, agent `build`)
Starting docs/result head: `c235f00d3ade9d548ad106a03c58f9dad88b50ea`
Starting code head: `7db996d23a87bb8eab9041bf2d969e38c1129865`
Base: `e51c1c5d74aed9824927d391590ddb33026c8d56`
Governing spec: `docs/internals/orchestration-evidence-v0-spec.md @ d3a31b7fb89fd75c0d452c3b29a3d2ca9bb98acf`
Browser blocker: `2026-11-01-browser-evidence-v0-post-repair-review.md` P1/P2

These decisions are prospective and recorded before repair implementation. They do not rewrite `ev0-*` or `ev0-repair-20261101-d01..d07` records.

### D-EV0R2-01 — Narrow Runtime provenance repair (P1/P2)

- `decision_id`: `ev0-repair-20261101-d08`
- `recorded_at`: 2026-11-01T21:25Z
- **Difficulty:** ambiguity 0.15; scope 0.25; reasoning 0.35; integration/tool 0.30; risk 0.45; verification 0.55; band `MEDIUM`; confidence 0.90.
- **Candidates:** DeepSeek self (single writer); bounded independent reviewer after repair.
- **Selected executor:** DeepSeek self.
- **Rationale:** the repair is two narrow provenance classifications in one existing projection. B1–B6 are accepted and untouched. The canonical handoff row already exists with an existing typed contract and table; the repair only adds a bounded exact-row read and corrects `recordBasis`.
- **Alternatives rejected:** a new handoff read service or evidence datastore (duplicate truth); pointer-only fallback when the canonical row is already available (weaker provenance than the spec prefers); reopening B1–B6 (out of scope).
- **Selection mechanism:** exploit + planned focused review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d08","event_type":"routing_decision","occurred_at":"2026-11-01T21:25Z","recorded_at":"2026-11-01T21:25Z","project":"t3-fork","task":"evidence-v0-runtime-provenance-repair","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.15,"scope_breadth":0.25,"reasoning_complexity":0.35,"integration_tool_complexity":0.30,"risk":0.45,"verification_burden":0.55,"band":"MEDIUM","confidence":0.90},"selection":"exploit_plus_planned_review","outcome":"PENDING"}`

### D-EV0R2-02 — Focused independent re-review of the provenance repair

- `decision_id`: `ev0-repair-20261101-d09`
- `recorded_at`: 2026-11-01T21:25Z
- **Difficulty:** ambiguity 0.20; scope 0.30; reasoning 0.55; integration/tool 0.25; risk 0.50; verification 0.50; band `MEDIUM`; confidence 0.80.
- **Candidates:** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`; Claude A (`claudeAgent`); Codex (`codex`) / `gpt-6.1-sol`; DeepSeek self (rejected as non-independent).
- **Selected executor:** Claude B — Pro first, because it produced the previous successful re-review and is a different provider/model from the implementer.
- **Rationale:** the prior Claude B review missed the provenance issue, so the re-review must explicitly check record-basis classification, canonical handoff resolution, dangling-pointer behavior, source times/revisions, duplicate handoff truth, private body avoidance, B1–B6 regression, and outcome/ordering leakage.
- **Alternatives rejected:** relying on the prior review verdict (it missed P1/P2); self-review (not independent).
- **Selection mechanism:** explore independent review + capacity substitution rule.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d09","event_type":"routing_decision","occurred_at":"2026-11-01T21:25Z","recorded_at":"2026-11-01T21:25Z","project":"t3-fork","task":"evidence-v0-provenance-repair-review","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent_claude_b_pro","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.20,"scope_breadth":0.30,"reasoning_complexity":0.55,"integration_tool_complexity":0.25,"risk":0.50,"verification_burden":0.50,"band":"MEDIUM","confidence":0.80},"selection":"explore_independent_review","outcome":"PENDING"}`

### D-EV0R2-03 — Final verification and handoff

- `decision_id`: `ev0-repair-20261101-d10`
- `recorded_at`: 2026-11-01T21:25Z
- **Difficulty:** ambiguity 0.10; scope 0.25; reasoning 0.25; integration/tool 0.30; risk 0.40; verification 0.70; band `MEDIUM`; confidence 0.90.
- **Candidates:** DeepSeek self.
- **Selected executor:** DeepSeek self.
- **Rationale:** forced orchestrator responsibility; verification must run on the exact repaired head and the handoff must reconcile every outcome honestly.
- **Alternatives rejected:** delegating synthesis (orchestrator owns reconciliation).
- **Selection mechanism:** forced orchestrator.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d10","event_type":"routing_decision","occurred_at":"2026-11-01T21:25Z","recorded_at":"2026-11-01T21:25Z","project":"t3-fork","task":"evidence-v0-provenance-verification-handoff","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.10,"scope_breadth":0.25,"reasoning_complexity":0.25,"integration_tool_complexity":0.30,"risk":0.40,"verification_burden":0.70,"band":"MEDIUM","confidence":0.90},"selection":"forced_orchestrator","outcome":"PENDING"}`

## Appended outcome — D-EV0R2-01 narrow provenance repair

- `decision_id`: `ev0-repair-20261101-d08`
- `recorded_at`: 2026-11-01T21:40Z
- **State:** `COMPLETED`.
- **P1 repaired:** `project-runtime-verification` items are now `recordBasis: "derived-view"` because they are nested inside the mutable `project_runtime_tasks.payload_json` snapshot. `authority: "project-runtime"`, the source `evidenceId`, and `recordedAt` are preserved; the current `taskRevision` is exported as a fact; no ARM independence/strength/required-kind facts are inferred.
- **P2 repaired:** when `latestHandoffId` is non-null the service performs a bounded exact-row read of `project_runtime_handoffs` (`project_id`, `task_id`, `handoff_id`) and decodes it with the existing `ProjectRuntimeHandoff` contract. A canonical `project-runtime-handoff` item is emitted only after the payload identity also matches the row/pointer. Missing or identity-mismatched rows emit `project-runtime-handoff-unresolved` (`recordBasis: "derived-view"`, null times, `canonicalRecord` in `unknownFields`, `status=unresolved`). No new store or read model was added.
- **Private content:** no handoff summary, result, failure notes, next action, file/test bodies, or decisions were copied; only bounded scalars/counts.
- **Tests added:** verification record-basis and task revision; canonical handoff resolution; dangling pointer; payload/row identity mismatch with JSONL round-trip.

## Appended outcome — D-EV0R2-02 independent re-review

- `decision_id`: `ev0-repair-20261101-d09`
- `recorded_at`: 2026-11-01T21:43Z
- **Actual executor:** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`, effort `high`, read-only. No capacity substitution was needed.
- **Round 1 (`508b1aca10`):** `PASS WITH FINDINGS`, no blockers. Five non-blocking findings: payload IDs not checked against row IDs; corrupt handoff decode aborts export; handoff thread not cross-checked; `canonicalRecord` both unknown and false; redundant `snapshotSourceTaskId`.
- **Round 2 (`0b3e38344a`):** `PASS WITH FINDINGS`, no blockers. Findings 1/4/5 REPAIRED; 2 DISMISSED (fail-loud on corrupt canonical row); 3 STILL OPEN (deferred). New non-blocking N1 (mismatch test lacked JSONL round-trip), N2 (only `handoffId` guard branch tested), N3 (unresolved summary wording), N4 (pre-existing task-payload identity).
- **Round 3 (`e1f201defa`):** `PASS WITH FINDINGS`, no blockers. N1 and N3 REPAIRED; N2 and N4 remain open and non-blocking.
- **Verdict discipline:** static/test-level only. No `RUNTIME PASS`.

## Appended outcome — D-EV0R2-03 final verification and handoff

- `decision_id`: `ev0-repair-20261101-d10`
- `recorded_at`: 2026-11-01T21:45Z
- **State:** `STATIC PASS / REVIEW PASS WITH FINDINGS / NOT RUNTIME PASS / NOT MERGED`.
- **Code head:** `e1f201defad33ba758ffb48abf37e844ff65cf22` (this docs commit follows it).
- **Tests:** `OrchestrationEvidenceService.test.ts` 27/27 pass; `AdaptiveRoutingService.test.ts` + `RuntimeTaskExecutionService.test.ts` 32/32 pass; combined 59/59.
- **Static gates:** contracts and server typecheck pass; `vp fmt --check` pass; `vp lint --report-unused-disable-directives` pass (only pre-existing unrelated warnings); `vp run knip:check` 2/2 pass; `git diff --check` clean.
- **Remaining non-blocking/UNKNOWN:** N2 guard branches (`projectId`/`taskId`) untested; N4 pre-existing task payload identity not checked against row keys; handoff thread reference not added to V2 unresolved cross-checking; corrupt canonical handoff row aborts export (fail-loud, consistent with other rows); V2 1,000-event read cap has no truncation marker; cross-task staging references are dropped; 2,000-reference cap is finite; no transport wiring; no live-service/real-DB proof; ARM producers remain the next milestone.
- **PR #14:** untouched at `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`; not merged, not advanced, not strengthened by this work.
- **Next action:** Browser Overall inspects the exact final delta and evidence; do not merge. Transport wiring plus live/real-DB verification is the next milestone.

---

# Run 5 — Evidence V0 authority repair — decision-time records

Run: Local DeepSeek Evidence V0 authority repair (B2)
Date: 2026-11-01
Orchestrator: DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`, OpenCode harness, variant `max`, agent `build`)
Starting docs/result head: `8a40c0b7436e0698fedbfb26b48073996a94812e`
Starting code head: `e1f201defad33ba758ffb48abf37e844ff65cf22`
Base: `e51c1c5d74aed9824927d391590ddb33026c8d56`
Governing spec: `docs/internals/orchestration-evidence-v0-spec.md @ d3a31b7fb89fd75c0d452c3b29a3d2ca9bb98acf`
Browser blocker: `2026-11-01-evidence-v0-authority-blocker-manager-update.md` B2

These decisions are prospective and recorded before repair implementation. They do not rewrite `ev0-*`, `ev0-repair-20261101-d01..d07`, or `ev0-repair-20261101-d08..d10` records.

**Starting-head reconciliation (OBSERVED FACT):** the authority-repair handoff names starting HEAD `c235f00d3ade9d548ad106a03c58f9dad88b50ea` and reviewed code ancestor `7db996d23a87bb8eab9041bf2d969e38c1129865`, but those predate the already Manager-accepted provenance repair at `8a40c0b7436e0698fedbfb26b48073996a94812e` (code head `e1f201defad33ba758ffb48abf37e844ff65cf22`). This repair therefore starts from `8a40c0b7`, not from `c235f00d`, so the accepted B1/B3–B7 provenance behaviour is preserved. No rebase or merge is performed.

### D-EV0R3-01 — Split Runtime Routing evidence from Runtime Execution evidence

- `decision_id`: `ev0-repair-20261101-d11`
- `recorded_at`: 2026-11-01T21:55Z
- **Difficulty:** ambiguity 0.20; scope 0.35; reasoning 0.50; integration/tool 0.25; risk 0.55; verification 0.60; band `MEDIUM`; confidence 0.90.
- **Candidates:** DeepSeek self (single writer); bounded independent reviewer after repair.
- **Selected executor:** DeepSeek self.
- **Rationale:** the defect is one authority classification inside one existing derived projection. Route-resolution facts already exist canonically in `attempt.receipt.route`; the repair projects them as a distinct `runtime-routing` item and keeps `receipt.launch`/packet facts under `runtime-execution`. No new datastore, canonical routing record, or routing behaviour change is needed.
- **Alternatives rejected:** a new route-resolution table or canonical routing identity (duplicate truth, prohibited); minting a synthetic routing record id solely for export (prohibited); leaving both domains merged under `runtime-execution` (the B2 blocker).
- **Selection mechanism:** exploit + planned focused review.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d11","event_type":"routing_decision","occurred_at":"2026-11-01T21:55Z","recorded_at":"2026-11-01T21:55Z","project":"t3-fork","task":"evidence-v0-authority-repair","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.20,"scope_breadth":0.35,"reasoning_complexity":0.50,"integration_tool_complexity":0.25,"risk":0.55,"verification_burden":0.60,"band":"MEDIUM","confidence":0.90},"selection":"exploit_plus_planned_review","outcome":"PENDING"}`

### D-EV0R3-02 — Focused independent review of the authority split

- `decision_id`: `ev0-repair-20261101-d12`
- `recorded_at`: 2026-11-01T21:55Z
- **Difficulty:** ambiguity 0.25; scope 0.30; reasoning 0.55; integration/tool 0.25; risk 0.55; verification 0.60; band `MEDIUM`; confidence 0.80.
- **Candidates:** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`; Codex (`codex`) / `gpt-6.1-sol`; DeepSeek self (rejected as non-independent).
- **Selected executor:** Claude B — Pro first, with recorded capacity substitution if unavailable.
- **Rationale:** the repair changes authority ownership semantics after the reviewed `7db996d` head, so a fresh different-provider review must explicitly check Routing vs Execution ownership, duplicate/conflicting authority, decision/outcome separation, stable identities/references, six-authority coverage, and the negative schema test.
- **Alternatives rejected:** relying on the provenance-repair review (it reviewed different semantics); self-review (not independent).
- **Selection mechanism:** explore independent review + capacity substitution rule.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d12","event_type":"routing_decision","occurred_at":"2026-11-01T21:55Z","recorded_at":"2026-11-01T21:55Z","project":"t3-fork","task":"evidence-v0-authority-repair-review","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"claudeAgent_claude_b_pro","model":"claude-opus-5-5"},"difficulty":{"ambiguity":0.25,"scope_breadth":0.30,"reasoning_complexity":0.55,"integration_tool_complexity":0.25,"risk":0.55,"verification_burden":0.60,"band":"MEDIUM","confidence":0.80},"selection":"explore_independent_review","outcome":"PENDING"}`

### D-EV0R3-03 — Final verification and handoff

- `decision_id`: `ev0-repair-20261101-d13`
- `recorded_at`: 2026-11-01T21:55Z
- **Difficulty:** ambiguity 0.10; scope 0.25; reasoning 0.25; integration/tool 0.30; risk 0.40; verification 0.70; band `MEDIUM`; confidence 0.90.
- **Candidates:** DeepSeek self.
- **Selected executor:** DeepSeek self.
- **Rationale:** forced orchestrator responsibility; verification must run on the exact repaired head and the handoff must reconcile every outcome honestly.
- **Alternatives rejected:** delegating synthesis (orchestrator owns reconciliation).
- **Selection mechanism:** forced orchestrator.
- `machine`: `{"schema":"t3-orchestration-evidence-v2","event_id":"ev0-repair-20261101-d13","event_type":"routing_decision","occurred_at":"2026-11-01T21:55Z","recorded_at":"2026-11-01T21:55Z","project":"t3-fork","task":"evidence-v0-authority-verification-handoff","orchestrator":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"selected":{"provider":"opencode","model":"opencode-go/deepseek-v4.1-flash"},"difficulty":{"ambiguity":0.10,"scope_breadth":0.25,"reasoning_complexity":0.25,"integration_tool_complexity":0.30,"risk":0.40,"verification_burden":0.70,"band":"MEDIUM","confidence":0.90},"selection":"forced_orchestrator","outcome":"PENDING"}`

## Appended outcome — D-EV0R3-01 authority split

- `decision_id`: `ev0-repair-20261101-d11`
- `recorded_at`: 2026-11-01T22:45Z
- **State:** `COMPLETED`.
- **Runtime Routing:** new derived item `runtime-route-resolution` with `authority: "runtime-routing"` and `recordId = attemptId` (the canonical attempt that stores the receipt). It owns route status, source, role, `inheritedFrom`, selected candidate index/provider/driver/model/isolation/runtime mode/interaction mode, failure source/reason, each indexed rejection (source, candidate index, provider, driver, model, reason, detail), and task/project-routing/profile/assignment revisions.
- **Runtime Execution:** `execution-attempt-decision` keeps `authority: "runtime-execution"` and now emits only `launch.*` (model selection, runtime mode, interaction mode, workspace strategy) and bounded `packet.*` facts. It references `runtime-route-resolution` for the same attempt; the route item references `execution-attempt`, task and thread.
- **No new truth:** one new record-type literal was added to the contract. No table, migration, canonical routing identity, routing resolver/authorization change, launcher, catalog or poller was added. The route item is `derived-view` over `attempt.receipt.route`.
- **Decision/outcome separation:** neither decision item reads outcome status, run identity, updated time or attempt failure. The outcome item remains unchanged and still references `execution-attempt-decision`.
- **Tests added:** six-authority set equality; routing-owns-route/launch-owns-launch assertions; indexed rejection fact under `runtime-routing`; negative contract test for wrong schema version plus missing/blank `eventId`/`recordId`/`projectId`.

## Appended outcome — D-EV0R3-02 independent review

- `decision_id`: `ev0-repair-20261101-d12`
- `recorded_at`: 2026-11-01T22:47Z
- **Actual executor:** Claude B — Pro (`claudeAgent_claude_b_pro`) / `claude-opus-5-5`, effort `high`, read-only. No capacity substitution was needed.
- **Verdict:** `REVIEW PASS WITH FINDINGS`; no blockers.
- **Reviewer scope:** delta `8a40c0b..741428a` against spec §3, §6, §9 and §22; ran the three focused suites (60/60 pass); confirmed no duplicate authority/store, preserved decision/outcome separation, stable event/record IDs, six-authority test coverage and contract-level negative validation.
- **Non-blocking findings:** F1 route item currently sorts after the launch item because both share a time/class and the event-ID tie-break favours `execution-…`; deterministic but logically backwards. F2 the post-completion byte-stability test covers only `execution-attempt-decision`, not the new route item. F3 the v0 `execution-attempt-decision` event ID is unchanged while its fact set moved, which only matters to external consumers of an earlier export.
- **Reviewer UNKNOWNs:** external consumers of the old merged decision item; no independent audit of ledger/appendix prose; no reviewer typecheck/lint run; no live-service/real-DB proof.

## Appended outcome — D-EV0R3-03 final verification and handoff

- `decision_id`: `ev0-repair-20261101-d13`
- `recorded_at`: 2026-11-01T22:48Z
- **State:** `STATIC PASS / REVIEW PASS WITH FINDINGS / NOT RUNTIME PASS / NOT MERGED`.
- **Code head:** `741428a320958d477492167f7f2992e834f2f096` (this docs commit follows it).
- **Tests:** `OrchestrationEvidenceService.test.ts` 28/28 pass; `AdaptiveRoutingService.test.ts` + `RuntimeTaskExecutionService.test.ts` 32/32 pass; combined 60/60.
- **Static gates:** `@t3tools/contracts` and `t3` server typecheck pass; changed-file `vp fmt --check` pass; changed-file `vp lint --report-unused-disable-directives` pass; `vp run knip:check` 2/2 pass; `git diff --check` clean.
- **Not directly verified:** `vp run check:changed` was attempted but exceeded the 15-minute harness limit without output; the targeted changed-file checks above were run instead. No live-service/real-database export was executed.
- **Remaining non-blocking/UNKNOWN:** F1/F2/F3 above; V2 1,000-event read cap has no truncation marker; cross-task staging references are dropped; 2,000-reference cap is finite; no transport wiring; no live-service/real-DB proof; ARM producers remain the next milestone.
- **PR #14:** untouched at `sync/upstream-20261031 @ e51c1c5d74aed9824927d391590ddb33026c8d56`; not merged, not advanced, not strengthened by this work.
- **Next action:** Browser Overall inspects the exact final delta and evidence; do not merge. Transport wiring plus live/real-DB verification is the next milestone.
