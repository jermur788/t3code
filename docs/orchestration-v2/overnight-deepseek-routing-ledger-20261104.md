# Overnight DeepSeek — Routing, attempts, worker roster and evidence ledger

Date: 2026-11-04 (Europe/Dublin). Status: **PREPARED ONLY — no live DeepSeek run has yet been observed in this manager chat**.
Classification: COORDINATION STATE / seed. This file is a template and historical initial checkpoint, not a substitute for canonical T3 Project Runtime routing/attempt receipts.
Parent handoff: https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/overnight-deepseek-serial-handoff-20261104.md

## Baseline snapshot (not live task outcomes)

- Target branch: fix/continuation-authorization-hardening-20261103; source review accepted R1/R2/R3 for bounded code paths; fork main separate. All heads must be re-fetched by the actual local coordinator at kickoff.
- Local implementer reports successful tests: 39 focused, 179 projectRuntime and check:changed 111. These are **not** independently rerun by the planning manager.
- F4 production feature gate, +646-byte MCP context change and final external launch TOCTOU remain decisions/risks. No permission to enable or merge.
- Requested coordinator: DeepSeek. **Actual provider instance/model, token/cost, session, start time, capacity and liveness are UNKNOWN / NOT DISPATCHED as of planning.**
- No active local worker, scheduled background job or automatic T3 completion bridge was created by this GitHub documentation write.

## Serialized stage registry

| Stage | Scope                                                    | Requested primary route                                         | Status at seed                       | Actual resolved route | Next                              |
| ----- | -------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ | --------------------- | --------------------------------- |
| O0    | Preflight, host supervision and Runtime/ledger bootstrap | DeepSeek coordinator                                            | READY, not dispatched                | UNKNOWN               | Verify host and ownership         |
| O1    | Independent executable qualification                     | Cheapest eligible independent test runner; DeepSeek coordinates | READY, not dispatched                | UNKNOWN               | Fresh worktree, 4 commands        |
| O2    | Additional failure/concurrency qualification             | DeepSeek; stronger review if safety issues                      | WAITING on O1                        | UNKNOWN               | Deterministic tests               |
| O3    | Upstream compatibility reconnaissance                    | DeepSeek low-cost read-only                                     | WAITING on O2 or independent blocker | UNKNOWN               | Current upstream source           |
| O4    | F4 gate/context-cost analysis/prototype only             | DeepSeek plus independent capable reviewer                      | WAITING on O3                        | UNKNOWN               | Compare options, no adoption      |
| O5    | Independent security review and morning handoff          | Independent stronger reviewer for security                      | WAITING on O4                        | UNKNOWN               | Review evidence and write handoff |
| O6    | Spare capacity: approved read-only checks                | DeepSeek                                                        | OPTIONAL                             | UNKNOWN               | Only after prior checkpoints      |

## Worker roster (append/refresh; do not claim presence)

| Child task | Role                            | Provider/model (resolved by host) | Thread / worktree | State          | Last host event UTC | Owner | Completion channel | Next check/action |
| ---------- | ------------------------------- | --------------------------------- | ----------------- | -------------- | ------------------- | ----- | ------------------ | ----------------- |
| None yet   | DeepSeek requested, not started | UNKNOWN                           | UNKNOWN           | NOT DISPATCHED | none                | none  | not established    | O0                |

## Routing decision event template — append one record at decision/dispatch/result

**Event number:** <sequential>  
**UTC timestamp / evidence source:** <observed>  
**Parent stage/task and child task:** <Runtime task IDs or descriptive stable stage>  
**Attempt #:** <1..4>; **type:** initial / retry / fallback / escalation / independent review  
**Goal, acceptance, base, worktree and code owner:** <...>  
**Requested by and coordinating model:** <actor; DeepSeek actual model once resolved>  
**Candidates in order:** <provider instance/model/driver/cost/quota/availability or UNKNOWN>  
**Rejected candidates:** <each one plus exact reason>  
**Chosen planned:** <provider/model, role, reason>  
**Resolved actual:** <provider/model/instance/driver/runtime mode, task/profile/project/default origin, isolation/worktree, receipt ID>  
**Eligibility/capacity:** <host evidence, quota and price only when known>  
**Cost/control objective:** <least total viable cost, risk/quality requirement>  
**Dispatch and completion:** <host call/wake IDs and actual timestamps; pending/running/waiting/review/blocked/done>  
**Hypothesis and attempt delta:** <what changed vs previous attempt>  
**Command/test evidence and result:** <logs/exit count; RUNTIME PASS etc only with proof>  
**Escalation decision:** <trigger, route change, options considered, explicit budget safeguards>  
**Current child liveness:** <last observed event, timestamp, unknown if absent>  
**Outcome/next:** <handoff link, owner released, next stage, user gate if any>

## Routing event 0000 — planning request (not a dispatch)

- **Observed:** user asked for DeepSeek-led overnight serial execution, at least two genuinely different attempts per routine issue, escalation to stronger available models, child supervision and explicit route tracking.
- **Requested coordinator:** DeepSeek; **resolved:** UNKNOWN / NOT STARTED.
- **Candidate selection reasoning:** DeepSeek is preferred for cost-effective coordination, reading and bounded fixes; security/race-sensitive escalation to available Codex/Claude-class when necessary. No particular model/version is assumed installed, available, or paid for.
- **Rejected candidates:** none yet; availability not checked in local T3.
- **Execution evidence:** planning handoff and ledger drafted through connected GitHub. **No local command, live subagent dispatch, paid provider or background monitor executed.**
- **Next:** actual T3 Code operator launches O0; coordinator confirms host routing provider/model, records session and first live event.

## Per-task issue and retry log template

| Stage | Issue       | Attempt 1 hypothesis/evidence/result | Attempt 2 _different_ hypothesis/evidence/result | Stronger model selection and why | Attempt 3/4 result | Classification | Next |
| ----- | ----------- | ------------------------------------ | ------------------------------------------------ | -------------------------------- | ------------------ | -------------- | ---- |
| none  | not started | —                                    | —                                                | —                                | —                  | —              | O0   |

## Liveness / handoff events (append one on every transition)

| UTC         | Task | Old state → new state | Host proof or log          | Last observed route | Handoff | Next action             |
| ----------- | ---- | --------------------- | -------------------------- | ------------------- | ------- | ----------------------- |
| not started | O0   | READY (planning only) | planning document, no host | UNKNOWN             | none    | Start local coordinator |

## Final reconciliation checklist

- [ ] Every actual child appears in roster with host-backed state and single code owner.
- [ ] Every dispatch/retry/fallback/escalation has planned and resolved model/provider with reasons and rejection codes.
- [ ] Unknown token/cost/quota not converted into invented estimates.
- [ ] Every substantial child produced Runtime handoff or authoritative fallback.
- [ ] Every stage lists precise verification and remaining unexecuted gates.
- [ ] Morning handoff reconciles source/branch against real repo and Runtime, preserves NOT INTEGRATED.
- [ ] No unauthorized merge, real provider call, upstream public action, or production enablement.

---

# LIVE OVERNIGHT RUN — 2026-11-04 (append-only from here)

Authority: handoff above. Coordinator model resolved from host: `opencode-go/deepseek-v4.1-flash` (provider instance `opencode`), runtime mode `full-access`, parent thread `63712f57-fc42-46e4-86da-1466f17831e1`. These are host-reported values, not estimates.

## Stage registry — live

| Stage | Requested route                 | Resolved route                                                            | State   | Evidence               |
| ----- | ------------------------------- | ------------------------------------------------------------------------- | ------- | ---------------------- |
| O0    | DeepSeek coordinator            | opencode/deepseek-v4.1-flash                                              | DONE    | preflight below        |
| O1    | independent cheap runner        | opencode/deepseek-v4.1-flash (fresh worktree, independent of implementer) | RUNNING | /tmp/opencode/o1-*.log |
| O2    | DeepSeek + stronger review      | —                                                                         | WAITING | —                      |
| O3    | DeepSeek read-only              | —                                                                         | WAITING | —                      |
| O4    | DeepSeek + independent reviewer | —                                                                         | WAITING | —                      |
| O5    | independent stronger reviewer   | —                                                                         | WAITING | —                      |
| O6    | DeepSeek read-only              | —                                                                         | WAITING | —                      |

## Routing event 0001 — O0 bootstrap (dispatch + resolution)

- **UTC:** 2026-11-04T00:13:33Z (observed)
- **Parent stage/task:** O0 bootstrap. **Attempt:** 1. **Type:** initial.
- **Goal/acceptance:** verify repo/base/worktree ownership/models/completion channel; create isolated branch; seed ledger. No product decision.
- **Requested by/coordinator:** user handoff; coordinator DeepSeek.
- **Proposed:** DeepSeek V4.1 Flash. **Resolved actual:** provider instance `opencode`, model `opencode-go/deepseek-v4.1-flash`, driver `opencode`, runtime `full-access`, inherited options `variant=high`. Route source: parent thread inheritance.
- **Candidates considered:** `opencode-go/minimax-m3.1-flash` ($0.15/$0.60 per Mtok), `opencode-go/claude-haiku-5-5` ($0.10/$0.50), `opencode-go/gpt-6-luna` ($0.10/$0.50), `codex`/`claudeAgent` (stronger, more expensive, reserved for escalation/review). Coordinator role needs long-context repo reasoning plus cheap volume, so DeepSeek Flash was retained; stronger models are reserved by the retry policy for escalation and O5 review.
- **Rejected:** Codex GPT-6.1/Claude Opus — capability exceeds coordinator needs, materially higher cost, and must stay independent for O5 review. Minimax/Haiku — viable cheap test runners but slightly weaker at multi-file reasoning; retained as fallback candidates.
- **Cost/quota:** known list prices only (see above). No quota or token totals observed; recorded as UNKNOWN.
- **Dispatch/completion:** host session active; DeepSeek running this turn. Child completion channel available via T3 `delegate_task`/native subagents (`features.appOwnedSubagents=true`, `asyncPolling=true`, `cancellation=true`, `scheduledTasks=true` per `orchestrator_capabilities`). Verified capability listing, not yet an actual child round-trip.
- **Outcome/next:** O0 accepted. Base/worktree facts below. Next: O1.

## O0 preflight facts (observed, 2026-11-04T00:13Z)

- Repo: `/home/jer/dev/t3code`, remotes `origin=https://github.com/jermur788/t3code.git`, `upstream=https://github.com/pingdotgg/t3code.git`.
- Candidate head: `fix/continuation-authorization-hardening-20261103` = `33fb8eaaf89b432786b3f1b1ac667aedadb93171` — "fix(runtime): bind continuation authorization to exact task revisions". Matches published head in the handoff.
- Fork main: `origin/main` = `d3bedef12a31f368e5c5a6b279445bea39a6a13a` (2026-11-02). Candidate is 20+ commits ahead; no merge performed.
- Upstream main: `upstream/main` = `43bf0babd4b41d22466640e5d9c8d08e190fff9c` (fetched fresh; newer than the 8657eecb recorded earlier in this session's first fetch — upstream moved during the run; O3 must re-fetch).
- Planning branch head: `origin/planning/resource-efficient-continuation-20261103` = `59d5f8872a3d58d799a31e9ecba83559a562ca61`.
- New isolated writer worktree: `/home/jer/dev/t3code-overnight-deepseek-20261104`, branch `overnight/deepseek-continuation-20261104`, based exactly on the candidate head, clean apart from the two copied ledger/handoff files.
- All pre-existing worktrees/branches preserved; no reset, stash, rebase or force-push performed.
- Toolchain: Node v26.13.0 (repo engines 26.12.1), vp v1.4.0, local vite-plus 1.3.0, pnpm 12.14.0. `vp i` completed exit 0 in the new worktree (16.5s).
- Available child providers (host): `codex` (GPT-6.1 Sol/Terra, GPT-6 Astra/Luna…), `codex_c75d…` (ChatGPT OpenAI B), `claudeAgent` (Claude A: Opus/Sonnet/Fable/Haiku 5.5), `claudeAgent_claude_b_pro` (Claude B Pro), `opencode` (child-capable; models incl. deepseek-v4.1-flash, claude-haiku, beam-free), plus non-child-capable cursor/grok/antigravity/fx/muse/pi.
- Project Runtime: this session exposes T3 orchestration tools (`orchestrator_capabilities`, `delegate_task`, `task_status`, `task_cancel`, `watch_pull_request`), but no Project Runtime task/handoff store was observed for this handoff. Ledger is therefore maintained as the branch-local authoritative record; Runtime routing receipts not available — recorded as a limitation, not a claim.
- Completion channel: capability verified by `orchestrator_capabilities` (appOwnedSubagents/asyncPolling/cancellation true). No child has been dispatched yet at O0 close; first dispatch will confirm real delivery.

## Routing event 0002 — O1 independent verification (dispatch + result)

- **UTC:** dispatched 2026-11-04T00:13:30Z, completed 2026-11-04T00:20:02Z.
- **Parent stage:** O1. **Attempt:** 1. **Type:** independent verification.
- **Owner:** DeepSeek coordinator acting as an independent runner on a fresh worktree; the implementing worker's worktree was not reused. Acceptance explicitly allows the least expensive capable runner; no separate child was dispatched because the host offers no cheaper eligible runner that could execute a 5-minute local suite without a second full install, and no model call is involved.
- **Proposed/resolved route:** `opencode` / `opencode-go/deepseek-v4.1-flash` (same resolved session, run locally). Candidates rejected for O1: `minimax-m3.1-flash`, `claude-haiku-5-5` — each would need a new worktree and install for a job whose cost is dominated by local CPU, not model tokens; no quality advantage for executing fixed commands. `codex`/`claudeAgent` reserved for escalation and O5 review independence.
- **Worktree:** `/home/jer/dev/t3code-overnight-deepseek-20261104` @ `33fb8eaaf8`, fresh `vp i` exit 0.
- **Commands and actual results (logs in `/tmp/opencode/o1-*.log`):**
  - `vp test run <3 continuation files>` → **exit 0**, 3 files, **39/39 tests** (2026-11-04T00:14:36Z).
  - `vp test run apps/server/src/projectRuntime` → **exit 0**, 12 files, **179/179 tests** (00:15:53Z).
  - `vp run typecheck` → **exit 0**, 39/39 projects successful (00:17:42Z).
  - `vp run check:changed` → **exit 1**: format FAIL (3 files: the new O2 test edit and the two copied docs) and lint FAIL (2 comments >4 lines in the new O2 test). Tests 8 files/113 passed; typecheck 35 packages passed; knip/graphql passed. These failures were caused by O2 writes landing during the O1 command, not by the candidate head. Fixed in O2; rerun below.
- **Comparison to handoff:** 39 focused, 179 projectRuntime and clean typecheck match the published worker report exactly. `check:changed` test count 113 matches the handoff's 111 + the 2 new O2 tests present at run time (count discrepancy explained, not a defect).
- **Outcome:** O1 focused/projectRuntime/typecheck PASS independently. check:changed baseline re-run required after the O2 test edit; classified as VERIFICATION FAILURE (local, self-inflicted), attempt 1.

## Routing event 0003 — O2 test additions (dispatch)

- **UTC:** started 2026-11-04T00:19Z.
- **Stage:** O2. **Attempt:** 1. **Type:** initial, test-only; no production code change.
- **Owner/route:** DeepSeek (resolved as above). No escalation trigger: no product/architecture change, no security-sensitive production edit.
- **Changed path:** `apps/server/src/projectRuntime/RuntimeTaskContinuationSecurity.test.ts` (+~180 lines, two tests).
- **New coverage:**
  1. `dispatches one review when a delayed reconciliation overlaps a completed one` — two service instances over one SQLite file; the first is suspended after reading the source snapshot, the second commits the review receipt, then the first resumes. Asserts exactly one review receipt and one review launch.
  2. `characterizes a turn that starts when continuation is withdrawn during the launch call` — CHARACTERIZATION ONLY. Suspends `ThreadLaunchService.launch` after the final authorization recheck, withdraws the operator policy, resumes. Asserts the already-authorized review turn still starts (`launched`, total launches 2) and the source remains `ready` with no policy. This is the known last-check-to-launch TOCTOU, documented as a fixture; it is **not** a fix, pass claim, or revocation-contract decision.
- **Result:** security file 24/24 passed (00:21:29Z). Comment/format failures fixed; `check:changed` rerun in flight.
- **Classification:** O2 bounded risk qualification complete for duplicate dispatch; residual external-launch race remains PRODUCT DECISION / REVIEW REQUIRED (unchanged).

## Routing event 0004 — completion-channel proof (incidental child)

- **UTC:** 2026-11-04T00:24Z.
- **Stage:** O0 acceptance criterion (one real child response).
- **Route:** inherited `opencode` / `opencode-go/deepseek-v4.1-flash`; `delegate_task` async.
- **Result:** child completed with "No action taken." — proves the host completion wake/routing path works end to end. No repository change. Task ID recorded in host receipts only; not a work task.

## Routing event 0005 — O3 upstream compatibility (read-only)

- **UTC:** 2026-11-04T00:25Z. **Attempt:** 1. **Type:** research, no dispatch.
- **Route:** DeepSeek coordinator, local git only. No child.
- **Bases:** candidate `33fb8ea`, fork main `d3bedef`, upstream `43bf0ba` (fetched fresh; upstream moved from `8657eecb` earlier in the run). Merge base `47f2c8d2`; 300 upstream commits since.
- **Method:** disposable worktree `/home/jer/dev/t3code-compat-20261104` on `compat/upstream-43bf0ba-20261104`; real `git merge --no-ff --no-commit overnight/deepseek-continuation-20261104`; inspect conflicts; `git merge --abort`.
- **Result:** continuation files auto-merge cleanly; 8 conflicts, all pre-existing fork divergence (OrchestratorMcpService, linkOrigin test, Grok/OpenCode adapter tests, runtimeLayer test, PeerForwarding test, routeTree.gen, usageLimits). No continuation file conflicts. Report: `docs/orchestration-v2/overnight-upstream-compatibility-20261104.md`.
- **Verdict:** NOT INTEGRATED; no upstream-compatible claim. Behavioural re-verification needed for ThreadLaunchService (+37) and Orchestrator (+250).
- **Next:** O5 review; O6 spare read-only.

## Routing event 0006 — O4 F4 gate memo (analysis)

- **UTC:** 2026-11-04T00:27Z. **Attempt:** 1. **Type:** analysis, no dispatch, no code.
- **Route:** DeepSeek coordinator. No child; no product choice made.
- **Result:** memo at `docs/orchestration-v2/overnight-f4-gate-decision-memo-20261104.md`; measured delta 59,165 − 58,519 = **+646 bytes** from committed snapshots; options A (default-off server gate; keeps cost), B (exclude from shipping; removes cost), C (remove agent-facing surface; partial); cancellation options (a) best-effort + reconcile vs (b) atomic revocation-aware launch requiring upstream cooperation. No prototype, no adoption.
- **Next:** independent review, then user decision.

## Routing event 0007 — O5 independent review (dispatch, pre-result)

- **UTC:** dispatched 2026-11-04T00:29Z. **Attempt:** 1. **Type:** independent review.
- **Goal/acceptance:** independent assessment of authorization, provenance, revision CAS, restart/replay, concurrency, the two new tests, residual TOCTOU, F4/budget, and upstream claims; line-specific findings; must not approve its own code (it wrote none).
- **Requested by/coordinator:** DeepSeek. **Proposed:** Claude Sonnet 5.5 for security-sensitive review, independent of the implementer (browser/local worker) and of the coordinator (DeepSeek).
- **Candidates considered:** `claudeAgent` Sonnet 5.5 (chosen, $2/$10 per Mtok list, high effort), `claudeAgent` Opus 5.5 (stronger, $4/$20 — rejected as unnecessary for a scoped source review), `codex` GPT-6.1 Sol (capable, quota/subscription pricing unknown — retained as escalation), DeepSeek (rejected: would not be independent of the O2 work).
- **Rejected reasons:** cost/capability balance; independence requirement; no paid external evaluation authorized.
- **Resolved actual (host):** provider instance `claudeAgent`, model `claude-sonnet-5-5`, option `effort=high`, role `review`, runtime `inherit`, shared checkout; task `node:delegated-task:command%3Amcp%3Aef0bc521...%3Af94f7889...`; state RUNNING; completion wakes the coordinator (host-supported async polling/wake).
- **Liveness:** dispatch receipt observed in host response; no result yet at ledger write.
- **Next:** inspect returned findings, repair routine ones only if safely within authorization, re-review, then morning handoff. No merge.

## Routing event 0008 — O5 review result and routine repairs

- **UTC:** review returned 2026-11-04T00:33Z (completion wake observed); repairs 00:33–00:36Z.
- **Resolved route:** `claudeAgent` / `claude-sonnet-5-5`, effort high. Independent of the implementer and of the coordinator.
- **Verdict:** **REVIEW REQUIRED (scoped)** — no authorization bypass, no self-grant path; one low-severity real defect and two documentation errors.
- **Reviewer evidence (host-reported, not fabricated):** 42/42 focused after my edits (41 at review time), 181/181 projectRuntime, typecheck 39/39, AgentContextBudget 1/1; merge-tree conflict counts matched O3; `check:changed` not re-run by the reviewer (read both logs).
- **Findings and disposition:**
  1. **Low, real defect — case-variant request keys.** Public reservation used case-sensitive `startsWith`; the budget query used SQLite `LIKE` (ASCII case-insensitive), so `CONT:V1:P:x` passed the guard and consumed a repair cycle. No authority granted. **FIXED:** guard now compares a lower-cased prefix; budget query uses case-sensitive `GLOB`. Regression test added (3 variants). DeepSeek attempt 1, no escalation needed.
  2. **Low/medium doc error — upstream budget narrative.** Upstream and merge base both hold 47,538; the fork raised it to 58,519 before this work. `agentContextBudget.json` **is** in the candidate diff. **FIXED** in the O3 doc and O4 memo.
  3. **Low stale doc** — handoff said no test coordinates the launch gap. **FIXED**; points at the characterization test.
  4. **Low test scope** — the "concurrent" test is resolved by the `readByRequestKey` pre-check, not a simultaneous insert. **FIXED** by renaming to `re-enters one review receipt…`; the test now claims only idempotent re-entry. A true simultaneous-insert test would need a production hook or a flaky SQLite race, so it was not added.
  5. **Info** — characterization test is honest but asserts the undesired outcome as green. Kept; documented as KNOWN GAP.
  6. **Info** — authorization reads are separate statements; the launch re-check catches mixes. No change.
  7. **Hygiene** — compat worktree/branch removed (`git worktree remove`, `git branch -D`).
- **Re-verification after repair:** focused 42/42 (00:34Z); projectRuntime + typecheck + check:changed in flight (logs `/tmp/opencode/o5-*.log`).
- **Next:** commit, bounded re-review of the delta, morning handoff. Nothing merged/pushed.

## Worker roster — live

| Child/task   | Role                     | Resolved provider/model                 | Worktree          | State | Last host event | Next                        |
| ------------ | ------------------------ | --------------------------------------- | ----------------- | ----- | --------------- | --------------------------- |
| no-op probe  | completion-channel proof | opencode/deepseek-v4.1-flash            | shared            | DONE  | 00:24Z          | none                        |
| O5 review #1 | independent review       | claudeAgent/claude-sonnet-5-5           | shared, read-only | DONE  | 00:33Z          | findings repaired           |
| O5 review #2 | bounded re-review        | claudeAgent/claude-sonnet-5-5 (planned) | shared, read-only | READY | —               | dispatch after green checks |
