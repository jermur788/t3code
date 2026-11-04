# Staged continuation safety — branch-local routing and verification ledger

**Branch:** `experiment/continuation-default-off-gate-20261104`
**Worktree:** `/home/jer/dev/t3code-continuation-gate-20261104`
**Base:** `776558e7ab` (fork `overnight/deepseek-continuation-20261104` head)
**Status:** EXPERIMENTAL CHECKPOINT PUSHED — NOT INTEGRATED, NOT PRODUCTION ENABLED
**Fallback note:** Project Runtime task store was not used to persist routing; this append-only
file is the authoritative fallback state for this lane.

## Event 0000 — T0 preflight (coordinator, actual)

- **UTC:** 2026-11-04 ~01:20
- **Resolved coordinator route:** provider `opencode` / model `opencode-go/deepseek-v4.1-flash`
  (inherited in this T3 thread; no separate dispatch). Runtime mode `full-access`.
- **Repo/remote:** `origin = github.com/jermur788/t3code`, `upstream = github.com/pingdotgg/t3code`.
- **Branch verification:** `origin/experiment/continuation-default-off-gate-20261104` fetched at
  `776558e7ab43cfd7a8aaebeb753dc17d075bbde9`, identical to
  `origin/overnight/deepseek-continuation-20261104`. Branch untouched before first write.
- **Fork main:** `d3bedef12a31f368e5c5a6b279445bea39a6a13a` — untouched.
- **Worktrees:** 35+ existing worktrees preserved; no deletion, reset, or cleanup.
- **New isolated worktree:** `/home/jer/dev/t3code-continuation-gate-20261104`
  (fresh, no node_modules at creation; `vp i` completed successfully).
- **Providers actually exposed by the host (`orchestrator_capabilities`):**
  - `opencode` (enabled; includes `opencode-go/deepseek-v4.1-flash`) — coordinator.
  - `codex_c75d8114-…` "ChatGPT - OpenAI B" (enabled) and `codex` (enabled).
  - `claudeAgent` "Claude A" (enabled) and `claudeAgent_claude_b_pro` "Claude B — Pro" (enabled).
  - disabled: `cursor`, `grok`, `antigravity`, `fx`, `muse`, `pi`.
- **Completion channel:** T3 child completions wake the parent thread on finish; no polling. The
  native subagent tool is not provider-independent, so T2 uses `delegate_task` with a Codex/Claude
  model. This resolves the "real child-completion monitoring" requirement for this lane.
- **Active writers:** only this worktree writes the projectRuntime lane. Other worktrees are
  pre-existing and were not modified.
- **Decision:** proceed to T1; no approval boundary hit.

## Event 0001 — T1 route decision and dispatch (actual)

- **UTC:** 2026-11-04 ~01:22
- **Resolved writer:** `opencode` / `opencode-go/deepseek-v4.1-flash` (this thread).
- **Alternatives rejected for T1:** Codex/Claude-class reserved for independent review and
  security-sensitive escalation; the gate is a small, well-bounded service change.
- **Scope:** default-off server capability, task create/update surfaces, automatic
  review/repair dispatch, startup recovery, pending receipt replay, server wiring, tests.
- **Test-first evidence:** `RuntimeTaskContinuationGate.test.ts` created before the gate module;
  run failed with `Cannot find module './RuntimeTaskContinuationGate.ts'` (exit 1).
- **Implementation:** new `RuntimeTaskContinuationGate` Context service (fail-closed, exact
  `T3CODE_EXPERIMENTAL_CONTINUATION=1`), required dependency of both services, wired in
  `server.ts`; contract violation `continuation_disabled`; gate checks in createTask/updateTask,
  advanceContinuation, launchAttempt (pending receipt), dispatchContinuation and runExecute.
- **Outcome:** T1 implementation + local qualification PASS.
- **Verification (actual exits):**
  - `vp test run apps/server/src/projectRuntime` → 13 files, 190 tests passed, exit 0.
  - `vp run typecheck` → 39/39 packages successful, exit 0.
  - `vp run check:changed` → format/lint/knip(2)/graphql/typecheck(35)/test(14 files, 178 tests)
    all pass, exit 0.
- **State:** `IMPLEMENTED`, `RUNTIME PASS` (local stub-provider tests only). `REVIEW PENDING`.

## Event 0002 — T2 independent review decision (recorded before dispatch)

- **UTC:** 2026-11-04 ~01:50
- **Reviewer route decision:** intended `claudeAgent` / `claude-opus-5-5`, effort `high`, role
  `review`, `isolation: shared` (must inspect the writer's uncommitted tree), `mode: wait`.
- **Rejected candidates:** same OpenCode/DeepSeek model (not independent); Codex reserved as
  fallback if Claude review is unavailable or inconclusive. No paid usage claimed until observed.
- **Status:** NOT DISPATCHED at time of writing this line.

## Event 0003 — T2 review dispatch, result and repair (actual)

- **Dispatch:** `delegate_task` task `node:delegated-task:command%3Amcp%3A059db4da-…%3A2c57cae8-…`;
  child thread `thread:delegated-task:command%3Amcp%3A059db4da-…%3A2c57cae8-…`.
- **Resolved reviewer:** provider `claudeAgent` / model `claude-opus-5-5`, effort `high`,
  role `review`, isolation `shared`, runtime mode inherited.
- **Completion:** returned `status: completed`, `waitTimedOut: false` (no polling used).
- **Verdict:** `ACCEPT WITH FIXES`; no gate bypass found. Findings:
  1. minor — gate-on revoked path now treats unreadable thread as `reconcile_required`
     (`unknown`), previously `cancelled`; behavior change was untested.
  2. minor — missing negative tests for public execute replaying a pending receipt while off,
     and for agent-actor policy removal while off.
  3. minor — additive contract literal may fail decoding on an old client (unreachable today:
     no client sends `continuation`); note for upstream.
  4. nit — gate read `process.env` at module import; other flags use Effect Config.
  5. nit — test helper named `process`.
  6. nit — new ledger file untracked; decide deliberately (kept as required audit evidence).
- **Reviewer commands/exits:** 3 focused test commands, exit 0 each (37 + 50 + 51 tests);
  lint on changed files, exit 0. Reviewer did not typecheck (cache-write concern).
- **Repairs applied (writer):** gate layer now `Layer.sync` (env read at layer build);
  added 3 tests (gate-on unreadable/revoked; public-execute replay while off; agent removal
  denied while off); renamed test helper to `runWith`.
- **Repair verification:** gate suite 10/10 pass, exit 0; lint exit 0; typecheck exit 0.
- **State:** `REVIEW PASS` not yet claimed; re-review pending (independent).

## Event 0004 — T2 re-review (actual)

- **Dispatch:** `delegate_task` task `…%3A433e7e85-…`; reviewer same provider/model
  (`claudeAgent` / `claude-opus-5-5`, effort `high`), independent of the writer.
- **Verdict:** `ACCEPT`. All six prior findings fixed or deliberately settled; no new findings.
- **Reviewer verification:** gate/security/restart suites 39/39 passed exit 0; execution/service/RPC
  suites 50/50 passed exit 0. No writes.
- **State:** T2 `REVIEW PASS`. T1 remains `IMPLEMENTED`, `RUNTIME PASS` (stub providers only).

## Event 0005 — T1 checkpoint commit (local)

- **Commit:** `544e8bc9821c1907b512f46a40a153bd0242c0ba`
  `feat(server): gate synthetic continuation behind default-off config`.
- Implementation and tests only; the routing ledger and stage memos are a separate docs commit.
- **Gate-on regression state:** existing continuation suites pass with `ContinuationGate.layer(true)`.
- No push at this point.

## Event 0006 — T3 upstream trial (actual)

- **Fetch:** `upstream/main` = `a185dd9248`, 316 commits ahead of fork main `d3bedef12a`;
  fork main 139 ahead of upstream; gate branch 32 ahead of fork main.
- **Isolation:** new detached worktree at
  `/media/jer/Files/Worktrees/t3-continuation-upstream-trial-20261104` (root filesystem was at
  100%, so the trial used the larger `/media/jer/Files` volume). Existing worktrees untouched.
- **Trial merge:** `git merge --no-commit --no-ff experiment/continuation-default-off-gate-20261104`
  → exit 1, **8 conflicts**, identical names/count to the overnight report. None touched by the
  gate branch (0 commits in `origin/main..gate` per file).
- **Continuation-owned files:** auto-merged without conflict (gate service, execution service,
  contracts, server wiring).
- **Trial tree test:** `AgentContextBudget.test.ts` → exit 1, 0 tests, OXC refused
  `packages/shared/src/usageLimits.ts` conflict markers. Merge aborted afterwards (disposable
  worktree only).
- **Actual budget measurements on clean trees:** upstream `5153/6883/47538` (exit 0);
  gate branch `7496/9224/59165` (exit 0). Delta +11627 is fork Project Runtime surface; the
  continuation-only +646 was not isolated and remains a release gate.
- **Verdict:** `T3 BLOCKED` on pre-existing fork-main reconciliation. No merge committed, no main or
  upstream write. Details in `staged-continuation-t3-upstream-trial-20261104.md`.

## Event 0007 — T4 design (read-only, actual)

- **Route:** coordinator (DeepSeek) read the fork's launch/receipt/effect-worker code; no child
  dispatched (design task, no implementation).
- **Output:** `staged-continuation-t4-strict-revocation-and-shipping-20261104.md` —
  run-creation linearization (recommended), provider-turn-start defence, optional epoch table,
  in-flight contract, cross-process/restart tests, upstream extension shape, and shipping
  exclusion strategy. No engine or build change.
- **Open decisions:** launch definition, authority table approval, in-flight stop contract,
  upstream hook acceptance, shipping mechanism. All are release gates.

## Event 0008 — T5 final acceptance (actual)

- **First attempt:** `claudeAgent` / `claude-opus-5-5` (same independent reviewer family), role
  `review`, effort `high`, wait. Returned `failed` with "Claude API rate limit reached"; no review
  evidence produced and no code inspected.
- **Materially different retry:** `codex` / `gpt-6.1-sol`, reasoning `high`, role `review`, wait.
  Returned `completed` with **ACCEPT FOR EXPERIMENTAL PUSH**.
- **Verifier findings:** no blocker; branch `776558e7ab → 544e8bc982 → 07c23a210e`; remote branch
  still at base; fork main unchanged; gate 10/10 tests pass; no bypass/default-on path; no test
  weakened. Non-blocking doc corrections (upstream commit count, actor-ownership wording, command
  log) applied in this commit.
- **State:** T5 `REVIEW PASS` for the isolated experimental branch. `NOT INTEGRATED`.
  Residual gates: upstream reconciliation (T3 blocked), strict revocation design sign-off (T4),
  shipping exclusion before any public release.

## Verification command log (exact)

| Stage                  | Command (worktree root)                                                                                                                                                                                                                                               | Exit | Result                                                    |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- | --------------------------------------------------------- |
| T1 tests               | `vp test run apps/server/src/projectRuntime`                                                                                                                                                                                                                          | 0    | 13 files, 192 tests passed                                |
| T1 typecheck           | `vp run typecheck`                                                                                                                                                                                                                                                    | 0    | 39/39 packages                                            |
| T1 checks              | `vp run check:changed`                                                                                                                                                                                                                                                | 0    | format, lint, knip 2/2, graphql, typecheck, 14 test files |
| T2 review A            | `vp test run apps/server/src/projectRuntime/RuntimeTaskContinuationGate.test.ts apps/server/src/projectRuntime/RuntimeTaskContinuationSecurity.test.ts apps/server/src/projectRuntime/RuntimeTaskContinuationRestart.test.ts`                                         | 0    | 3 files, 39 tests                                         |
| T2 review A            | `vp test run apps/server/src/projectRuntime/RuntimeTaskExecutionService.test.ts apps/server/src/projectRuntime/ProjectRuntimeService.test.ts apps/server/src/projectRuntime/ProjectRuntimeRpc.test.ts`                                                                | 0    | 3 files, 50 tests                                         |
| T2 review A            | `vp test run apps/server/src/projectRuntime/RuntimeTaskExecutionQualification.test.ts apps/server/src/projectRuntime/ProjectRuntimeSourceAccess.test.ts apps/server/src/mcp/toolkits/project/runtime.test.ts apps/server/src/project/ProjectService.deletion.test.ts` | 0    | 4 files, 51 tests                                         |
| T2 review A            | `vp lint` (changed files)                                                                                                                                                                                                                                             | 0    | clean                                                     |
| T2 re-review           | same first two commands                                                                                                                                                                                                                                               | 0    | 39 tests and 50 tests                                     |
| T3 budget (upstream)   | `vp test run apps/server/src/provider/AgentContextBudget.test.ts` in clean `upstream/main` worktree                                                                                                                                                                   | 0    | 1 test, measured 5153/6883/47538                          |
| T3 budget (trial tree) | same command with merge conflicts present                                                                                                                                                                                                                             | 1    | 0 tests, OXC refused `usageLimits.ts` markers             |
| T3 budget (gate)       | same command in gate worktree                                                                                                                                                                                                                                         | 0    | 1 test, measured 7496/9224/59165                          |
| T5 final               | `vp run fmt`, `vp run typecheck`, `vp test run apps/server/src/projectRuntime`, `vp test run apps/server/src/provider/AgentContextBudget.test.ts`, `vp run check:changed`                                                                                             | 0    | all pass (192 projectRuntime tests)                       |
| T5 acceptance          | `vp test run apps/server/src/projectRuntime/RuntimeTaskContinuationGate.test.ts` by Codex reviewer                                                                                                                                                                    | 0    | 10 tests                                                  |

T2 review A reviewer transcript: T3 delegated child task
`node:delegated-task:command%3Amcp%3A059db4da-…%3A2c57cae8-…`. T2 re-review:
`…%3A433e7e85-…`. T5 acceptance: `…%3A95a8676d-…` (Codex `gpt-6.1-sol`). The first T5 attempt
with `claude-opus-5-5` failed before work with "Claude API rate limit reached"; no review evidence
was produced by it.

## Event 0009 — experimental checkpoint push (actual)

- **Pre-push checks:** `vp run fmt` exit 0; `vp run typecheck` exit 0 (39/39);
  `vp test run apps/server/src/projectRuntime` exit 0 (13 files, 192 tests);
  `vp test run apps/server/src/provider/AgentContextBudget.test.ts` exit 0;
  `vp run check:changed` exit 0 (format, lint, knip 2/2, graphql, typecheck, 14 test files).
- **Push:** `git push origin experiment/continuation-default-off-gate-20261104` exit 0,
  fast-forward `776558e7ab..7e5401b8ba`. No force, no PR, no main or upstream write.
- **Remote verified:** `HEAD == origin/experiment/continuation-default-off-gate-20261104 ==
  7e5401b8ba12950a4be85482d6ba6b94c1a74862`. Worktree clean.
- **Trial worktree:** `/media/jer/Files/Worktrees/t3-continuation-upstream-trial-20261104`
  remains clean and detached at `upstream/main` `a185dd9248`; no merge in progress.
- **Final state:** T0 pass; T1 `IMPLEMENTED` + `RUNTIME PASS`; T2 `REVIEW PASS`; T5 `REVIEW PASS`
  (Codex acceptance); T3 `BLOCKED` on pre-existing fork-main conflicts; T4 `DESIGN ONLY`.
  Integration: `NOT INTEGRATED`. Production gates: strict revocation, upstream reconciliation,
  shipping exclusion.
