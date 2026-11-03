# Browser implementation handoff — synthetic Project Runtime continuation

Date: 2026-11-03
Role: Browser-side implementation worker
Verdict: **IMPLEMENTED / LOCAL QUALIFICATION PASS / INDEPENDENT REVIEW NOT DONE**
Integration: **NOT INTEGRATED**; isolated development branch only; no production policy enabled
Authority: [Browser Handoff A](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/browser-handoff-a-continuation-implementation-20261103.md), [scoped spike task](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/continuation-stub-provider-spike-task-20261103.md), [finite decision design](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/bounded-decision-escalation-design-20261103.md).

## BASE / CHECKPOINT

- Repository: `jermur788/t3code`
- Fork main inspected immediately before branch creation: `d3bedef12a31f368e5c5a6b279445bea39a6a13a`
- Dedicated branch: `experiment/browser-task-continuation-spike-20261103`, created from that exact main.
- No writes to main, upstream, other worktrees or other branches; no PR or merge.
- Browser GitHub operations produce committed files, not a local dirty worktree. Local working-tree cleanliness **not inspected** (no local checkout). Recheck branch and any local lane ownership before running tests.

## INSPECTED REUSE / ARCHITECTURE

- `RuntimeTaskExecutionService`: attempt-first insert, per-task active-attempt uniqueness, per-task+request-key uniqueness, deterministic thread/command/message ids, `ThreadLaunchService` receipts, cancellation and startup/explicit reconciliation.
- `ProjectRuntimeService`: project task revision CAS, append-only handoff, server-derived actor provenance, separate verification from lifecycle and no automatic VERIFIED on terminal completion.
- `OrchestrationEvidenceService`: read/export/reconstruction of task/attempt/handoff evidence; not used as an additional state owner.
- Upstream-owned `EventSink`, `EffectOutbox`, `EffectWorker`, `RunExecutionService`: inspected for already-owned generic event/effect/worker machinery, deliberately not modified. Upstream V2 has distinct provider post-settle semantics; this spike adds only a fork-owned project-task decision.
- Fork execution migration 005 includes the unique `request_key` index; migration 006 extends the active-attempt uniqueness to `cancelling`. No new tables or migrations.

## RESULT / FILES

1. `packages/contracts/src/projectRuntime.ts`: optional versioned `continuation` policy on a source task. Only mode `synthetic`; review task ID; optional separately authorized repair task ID; configurable 0–2 synthetic repair cycles. No production default.
2. `apps/server/src/projectRuntime/ProjectRuntimeService.ts`: only server-derived `user:` actors may create/update/remove that authority; agent/MCP actors cannot self-grant it; task revisions and record validation remain enforced.
3. `apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.ts`: pure decision contract `no_action | review | repair_or_retry | ask_user | blocked`; includes version, reason, source attempt/revision, task revision, handoff reference, target task and deterministic request key. Fail-closed validation of terminal state, handoff thread/author/task/revision, reviewer identity and independent provider, unresolved decisions, contradictory/missing evidence and budget.
4. `apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts`: scan opt-in source tasks after explicit terminal reconciliation and startup active-attempt reconciliation; follow the deterministic review/repair attempt chain by existing durable request keys; no new queue or driver. Reconcile linked handoffs before policy evaluation. Check scope/task revision, shared target ambiguity, existing active attempt, enabled task, review route and final resolved reviewer independence; use existing guarded `execute`. On `ask_user`, persist one blocked source task and evidence references rather than emitting an unbounded question.
5. `apps/server/src/projectRuntime/RuntimeTaskPacket.ts`: a continuation review/repair packet names its exact source task, attempt and handoff **as context, not scope authorization**. Source identity is checked against one operator policy and a linked terminal handoff.
6. `apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.test.ts`: 13 pure synthetic regressions for supported review, bounded repair, rephrasing/provider change, missing/contradictory/wrong-thread evidence, stale revision, budget exhaustion, cancellation/failed launch, protected decision, non-independent reviewer, healthy in-progress work, replay determinism.
7. `apps/server/src/projectRuntime/RuntimeTaskExecutionService.test.ts`: two new stub-provider + in-memory SQL integration scenarios: one automatic independent review and clean finish, and failing review -> exactly one repair across reconciliation/replay/startup scan; asserts source attempt/handoff references in follow-up packets.
8. `apps/server/src/projectRuntime/RuntimeTaskPacket.test.ts`: exact continuation-source reference regression.
9. `apps/server/src/projectRuntime/ProjectRuntimeService.test.ts`: agent cannot create or mutate operator-owned continuation policy; operator can set and clear it.

## VERIFICATION

**Executed:** Connected GitHub source reads; branch creation, committed-file reads/edits; GitHub compare of branch against the pinned fork main. Files were inspected at source level. No local production files or external providers were touched.

**Not executed in the browser lane:** TypeScript typecheck, formatter, Vitest, SQLite restart/persistence qualification, real server, GUI, model/provider runtime, independent code/security review. GitHub Actions were previously reported disabled on this fork and no CI run was invoked.

### Local qualification run (2026-11-03, isolated worktree)

A local worker ran the commands above on a fresh worktree of this exact branch, plus `vp run check:changed`. The browser-only claim of "runtime not run" was correct: the first run failed.

| Gate                           | Before repair                                  | After repair   |
| ------------------------------ | ---------------------------------------------- | -------------- |
| `vp test run` focused files    | 2 failed (ReferenceError, `provider_disabled`) | 4 files pass   |
| `vp run --filter t3 typecheck` | 4 errors                                       | clean          |
| `vp fmt --check`               | 7 files drifted                                | clean          |
| `vp lint`                      | 3 errors                                       | clean          |
| `vp run check:changed`         | format/lint/test fail                          | all steps pass |

Corrections, all on this branch:

1. `ProjectRuntimeTaskId` was imported as a type but used as a value in `RuntimeTaskExecutionService`; typecheck and the continuation tests both failed. Now a value import.
2. The `resolveRoute` test mock ignored an optional `taskId`; fixed to typecheck.
3. The service tests routed reviews to the `opencode`-driver synthetic reviewer while providing `DEFAULT_SERVER_SETTINGS`, where that driver defaults to disabled. `execute` correctly rejected with `provider_disabled`, which proves the eligibility path works; the fixture now enables the instance.
4. Lint: unused import, an over-long comment, and a nested `Effect.gen` that had to become `Effect.fn("RuntimeTaskExecutionService.holdForUser")`.
5. Adding `continuation` to the task contracts grows the MCP tool list by 646 bytes, so `apps/server/src/provider/agentContextBudget.json` moves from 58519 to 59165. This is a real agent-context increase and needs the usual `agent-context-increase` review when this ever leaves the experiment branch.

New `apps/server/src/projectRuntime/RuntimeTaskContinuationRestart.test.ts` (4 file-backed, stub-provider scenarios; no model calls):

- Real `ProjectRuntimeService` over `SqlitePersistence.layerFromPath`, re-created per phase so each step opens the same database after a restart. Asserts the attempt receipt exists and is `pending` before `ThreadLaunchService.launch`; one review with the expected `cont:v1:r:` key, thread and packet references; a passing review dispatches no repair and leaves the source at `milestone: none`.
- A review receipt forced back to `pending` replays after restart with the same thread and message ids and no second receipt.
- Two allowed repairs, each followed by a linked review, then a third failure yields exactly one durable `blocked` source task with `nextAction`; restarting re-uses it with no third repair and unchanged launch count.
- A failed review attempt and a `reconcile_required` review are both terminal for authorization: no repair, no duplicate launch after startup reconciliation.

Still open (unchanged by this run): independent code/security review, upstream rebase compatibility, real provider/model behaviour, GUI/notification surfaces for `ask_user`, and any production policy decision. The contract-budget increase is the concrete reason a second look at upstream compatibility matters.

### Exact first local test task

Use a fresh isolated worktree; inspect `git status`, branch and ownership first. Do not overwrite uncommitted changes:

```bash
git fetch origin experiment/browser-task-continuation-spike-20261103
git worktree add ../t3-continuation-verify origin/experiment/browser-task-continuation-spike-20261103
cd ../t3-continuation-verify
git status --short
node --version  # repository expects Node 26.12.1
pnpm install --frozen-lockfile
vp test run apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.test.ts apps/server/src/projectRuntime/RuntimeTaskExecutionService.test.ts apps/server/src/projectRuntime/RuntimeTaskPacket.test.ts apps/server/src/projectRuntime/ProjectRuntimeService.test.ts
vp run --filter @t3tools/contracts typecheck
vp run --filter t3 typecheck
vp fmt --check
```

Expected: exit 0, all focused tests pass, no unexpected files changed, no type errors, no formatting drift. Do not report a pass until outputs exist. If any test fails, classify and repair on the same owned development branch (no reset/rebase of shared work), rerun affected and adjacent tests, and return the exact logs and corrections.

### Required stronger local qualification (not covered by committed in-memory fixtures)

1. Use the existing testkit with stub providers and a **file-backed** temporary SQLite database. Seed one user-authorized source task, independent reviewer task and separate repair task. Never run a real provider. Keep source and reviewer providers distinct; authorize review before completing worker.
2. Complete a synthetic worker attempt. Assert the original receipt was stored before `ThreadLaunchService` is called; append worker-thread handoff; reconcile. Assert exactly one review request key, attempt, thread, launch command and reviewer dispatch. Assert packet references the source attempt and handoff.
3. **Restart before and after dispatch**: stop and recreate the service on the _same file-backed database_, replay the terminal reconciliation and startup scan. Assert the same attempt/request key/command/thread identity, no extra external dispatch. Simulate a crash with a pending persisted receipt and verify recovery reuses its ids; simulate a failed launch and `reconcile_required` and verify no new authorization or duplicate launch.
4. Mark the first independent review **pass** with a matching task/thread/revision handoff and positive synthetic verification evidence. Assert no repair and no Manager model call. Assert source is **not** elevated to `verified` solely by that handoff; independent acceptance is a separate gate.
5. Mark a separate review **fail**. With preauthorization, assert one repair and then a distinct review linked to that repair. Replay the same failure with paraphrased text, provider switch, reordering and process restart. Count repair receipts, not messages. At configured 2-cycle exhaustion, assert one durable source-task blocker/next action with evidence IDs, no third repair and no duplicate user escalation on restart.
6. Negatives: missing/wrong-thread handoff, missing review verdict, contradictory pass/fail, stale source/review task revision, no configured repair, shared target task, incompatible reviewer instance, invalid source key, cancelled attempt, ambiguous run, route failure, denied scope and unrelated active execution. Each must cause no unauthorized dispatch. Verify a healthy long-running test causes no forced timeout or spent cycle.
7. Exercise concurrent/repeated calls to `reconcileAttempt` and startup recovery, including a process crash at the gap between the terminal DB write and follow-up `execute`. Inspect final request-key uniqueness and downstream thread receipts in SQLite. Ensure no `verified` state while review evidence fails.
8. Independently review authorization, actor provenance, SQL concurrency, task/handoff trust, cross-project isolation, and upstream rebase compatibility. Only after this and actual restart/replay evidence should stronger runtime/review states be considered.

## RISKS / LIMITS / FAILURE CLASSIFICATION

- **LOCAL VERIFICATION DONE, INDEPENDENT REVIEW PENDING:** typecheck, format, lint, focused tests and `check:changed` pass locally, including file-backed restart/replay. Nothing has been reviewed by a second party and no CI ran.
- **REVIEW REQUIRED:** typecheck and the file-backed suite pass, but concurrency composition, SQL isolation under parallel projects and effect-error semantics are still unproven beyond the tested paths. Review the follow-up execution path before enabling any non-synthetic policy.
- **REVIEW REQUIRED:** this is invoked at an _existing Runtime reconciliation boundary_, not as a newly installed upstream event subscriber. Ordinary already-running workers need terminal reconciliation before the automatic decision is processed; do not claim real-time event delivery.
- **REVIEW REQUIRED:** reviewer handoff pass is attributable _reviewer evidence_, not external verification. The policy intentionally makes no `verified` or integration write. A trusted acceptance/qualification gate remains external.
- **REVIEW REQUIRED:** the one durable `ask_user` is a blocked Runtime task with `nextAction`, not an outbound notification. Additional UI/notification behavior is explicitly outside the synthetic spike.
- **REVIEW REQUIRED:** project-task policy uses a small opt-in field on existing Runtime records; mapping to future upstream orchestration graph identities and full security review remains a later architecture gate.
- This experiment assumes a review/repair task is dedicated to a single source task. Ambiguous sharing fails closed; no ownership lease or separate scheduler has been added.
- Numeric 2-cycle maximum is **synthetic only**, not accepted production policy.

## SECURITY REPAIR — 2026-11-03

Branch `fix/continuation-security-repair-20261103` addresses the independent review's F1/F2 authorization gaps and F3 stop visibility. Integration remains **NOT INTEGRATED**.

- Public `executeTask` rejects the reserved `cont:v1:` request-key namespace. Internal dispatch re-derives the current decision from source status/revision/policy, linked terminal handoffs, reviewer independence and the durable repair budget, then inserts the existing receipt with a source-revision CAS. Pending receipts revalidate again before launch.
- A withdrawn authorization cancels a not-yet-launched continuation, or marks it `reconcile_required` when a thread may already exist; a terminal failed or invalid review writes one durable `blocked` source task. Genuinely ambiguous execution stays pending and is not mislabeled as failed.
- **F4 is a hard pre-integration gate:** `mode: "synthetic"` is a label, not an environment switch. This API must be removed from shipping builds or placed behind a disabled-by-default non-production gate before any merge, and the agent-context budget must not grow for production.
- Verification: 78 focused tests (66 existing plus 12 new negative/concurrency/restart) and `check:changed` pass. No contract or `agentContextBudget.json` change in this repair.

## REVIEW / INTEGRATION / NEXT

- Browser worker self-reviewed implementation seams and tracked source-level fixes for handoff recovery, revision freshness, independent model route drift and exact packet provenance. **No independent reviewer yet.**
- **NOT INTEGRATED**. No production enablement, PR merge, upstream contribution, credential use or paid infrastructure.
- **NEXT EXACT ACTION:** request independent code/security review of the qualification diff (compile/elegibility repairs, the four file-backed restart tests, and the +646-byte MCP contract budget), then decide whether this branch is worth rebasing onto current upstream. The local commands above still need to be re-run after any rebase. Do not merge or enable production continuation.
- **USER DECISION:** none needed to run this authorized synthetic qualification. A product/architecture decision is required if the implementation proves it needs a second persistence owner, a new upstream internal effect type, or a broader real deployment policy.
