# Independent source/security review — browser continuation experiment

Date: 2026-11-03
Reviewer: Overall Manager, OpenAI GPT-6 through connected GitHub source inspection (independent of the implementing browser and local workers)
**Review verdict: REVIEW REQUIRED — implementation defects / authorization gaps found.**
**Prior evidence accepted at appropriate level:** local worker reports 66/66 focused tests on the published head, and previous `check:changed` passed 88 tests and typechecks. The manager inspected the live source and tests in GitHub; **did not re-run local tests, real providers, CI or UI**.
**Integration:** NOT INTEGRATED, NOT ENABLED IN fork main, NO PR opened for this experiment. This review does **not** supersede the existing local RUNTIME PASS on the tested subset; it identifies important **untested cases**.

Inspected published branch: https://github.com/jermur788/t3code/tree/experiment/browser-task-continuation-spike-20261103
Current fork main remains distinct. Review of code as published after the two local qualification commits. Source:
- [RuntimeTaskExecutionService.ts](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts)
- [RuntimeTaskContinuationPolicy.ts](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/apps/server/src/projectRuntime/RuntimeTaskContinuationPolicy.ts)
- [ProjectRuntimeService.ts](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/apps/server/src/projectRuntime/ProjectRuntimeService.ts)
- [ProjectRuntimeRpc.ts](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/apps/server/src/projectRuntime/ProjectRuntimeRpc.ts)
- [ProjectRuntime contract](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/packages/contracts/src/projectRuntime.ts)
- [File-backed restart tests](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/apps/server/src/projectRuntime/RuntimeTaskContinuationRestart.test.ts)
- [Implementation handoff](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/docs/orchestration-v2/browser-continuation-implementation-handoff-20261103.md)

## Source-supported strengths

1. Fork-owned policy is additive and provider-agnostic; no Argus/Superagent engine, duplicate queue or new authoritative task database.
2. `ProjectRuntimeRpc` creates server-derived `user:` actor for UI actions, while `ProjectRuntimeService.createTask/updateTask` reject agent actors attempting to modify `continuation`. This is meaningful origin guarding at existing API boundaries.
3. Project, task and source handoff identity are checked; matching thread/actor and review-provider independence are enforced at both evaluator and resolved launch. Distinct provider instance and task owner is only a syntactic reviewer-independence property, **not proof of independent acceptance quality**.
4. Existing execution-attempt receipts are saved before launch, and replay uses durable keys/launch IDs. The file-backed restart tests cover one review, an isolated pending receipt, two repairs and a blocked source after budget exhaustion. Clean review intentionally leaves source verification unchanged.
5. The `maxRepairCycles <= 2` ceiling applies only to the `synthetic` policy schema, not an accepted production default; no agent can edit it through the existing worker actor path.

## Findings (priority and source trace)

### F1 — HIGH: externally supplied continuation request keys can bypass conditional policy decisions

**Source:** `RuntimeTaskExecutionService.execute` accepts arbitrary `clientRequestId` and interprets keys matching `cont:v1:([rp]):(.+)` as a continuation. For `p` (repair), it checks only that a referenced review attempt belongs to an operator-named review task and is completed with a matching handoff. **It does not check that the review evidence was FAIL, that the current operator policy budget has remaining cycles, that source remains authorized/current, or that the continuation evaluator actually chose `repair_or_retry`.** The regular user-facing `ProjectRuntimeRpc.executeTask` exposes `clientRequestId`; no reserved namespace protection is visible. Existing readByRequestKey/unique constraints prevent repeat keys, but not a *new* attacker- or caller-chosen key.

**Consequence:** A caller could request a repair using `cont:v1:p:<completed-passing-review-attempt>` when the target task remains executable, without the policy's failure/budget decision. Different past completed review attempt IDs can mint different keys. This violates user-controlled conditional scope and finite agent-debate budget. This is a **source-level authorization defect**. Whether a particular UI currently permits entering a chosen key is not relevant to the service contract; do not claim a browser exploit was run.

**Required fix:** Reserve continuation key namespace from ordinary UI/agent calls, and make execution revalidate a durable *host-issued authorization/decision* or deterministically re-evaluate source policy plus review evidence/budget under a guarded transaction before inserting the attempt. Do not rely on a key prefix itself being a capability. Avoid second task ledger or queue. Test that a caller's invented `cont:v1:p:...` for a passing review is rejected, for a failed review after budget exhaustion is rejected, and an ordinary unrelated clientRequestId remains accepted. Test authorized internal dispatch and restart still pass.

### F2 — HIGH: task cancellation or policy revocation can race with automatic dispatch

**Source:** `advanceContinuation` reads `sourceTask` and its policy once at entry. It then performs multiple asynchronous reads/reconciliations/route queries; `dispatchAuthorized` rechecks the **target** task and invokes `execute`, but there is **no atomic guard tying the source task's current revision/status/policy** to the attempt insertion. The per-service `Semaphore.make(1)` serializes some attempt operations within one service instance, not independent user task edits or separate server processes. A persisted `pending` attempt is replayed via `reconcileAttemptRow` without rechecking current source authorization.

**Consequence:** If the operator cancels the source task or removes `continuation` during the pause between policy read and launch, an old decision can still launch work; even if the first dispatch was authorized, a pending receipt may be replayed after revocation. This undermines the accepted stop/authority semantics. Exact runtime interleaving has **not been reproduced yet**; a deterministic barrier test is required.

**Required fix:** Bind authorization to current source revision/status and policy at the same durable decision/dispatch boundary, including resumption of pending receipts. Define precise revocation semantics: a new cancellation should prevent any not-yet-dispatched continuation and should not discard a provably launched task without a recorded stop. Use CAS/transactional intent as the existing services permit, not a second orchestrator. If the existing receipt model cannot close the gap safely, stop for architecture/security review rather than inventing new state.

**Tests:** barrier between initial source read and `execute`, concurrent operator policy remove / source status cancel, two service instances against same SQLite, restart after durable pending receipt and before launch, prove no post-revocation new external launch, and no ambiguous duplicate dispatch.

### F3 — MEDIUM: fail-closed `blocked` decisions are dropped instead of recorded for the operator

**Source:** `evaluateContinuation` returns `blocked` for failed/cancelled reviewer, missing/contradictory evidence, non-independent review and invalid handoff. In `advanceContinuation` both the worker and reviewer paths persist an operator blocker **only for `ask_user`**, while any other non-`review` / non-`repair_or_retry` decision returns silently. The negative test for failed or ambiguous review checks only “no more launch,” not a durable explanation/terminal status for the source.

**Consequence:** The feature safely avoids new work but may leave a source task apparently ready with no visible reason for stopping. This falls short of the user's qualitative requirement that a stalled agent chain eventually makes a decision or escalates. Distinguish `reconcile_required` (ambiguous, await real reconciliation) from a terminal failed review. Do not mislabel ambiguous work as definitively failed.

**Required fix:** Persist a durable, idempotent blocked/operational stop decision with current task/evidence references when the reason is actionable or terminal, without inventing a second task status owner. Define how waiting/ambiguous states remain pending and observable. Add a negative file-backed restart test for failed review and conflicting evidence that proves one operator-visible reason after replay, and never a repair.

### F4 — MEDIUM / PRE-RELEASE GATE: `synthetic` is a label, not a global inert feature gate

The contract permits an operator to add a `mode: "synthetic"` policy through `ProjectRuntimeRpc.createTask/updateTask`, and reconciliation automatically dispatches real T3 launches if enabled with non-stub providers. **This is harmless while the experiment branch is isolated and not integrated**, but if merged into a normal production build, the word `synthetic` alone does not enforce a stub-only environment or a disabled-by-default global switch.

Before any integration, either remove the experimental API from shipping builds or add a disabled-by-default feature gate and explicit non-production execution constraints. Its `+646`-byte MCP tool-list budget impact is genuine and requires context-budget justification; avoid shipping a general agent-visible experimental policy without a need. The tool-budget snapshot is [agentContextBudget.json](https://github.com/jermur788/t3code/blob/experiment/browser-task-continuation-spike-20261103/apps/server/src/provider/agentContextBudget.json) (59165 bytes, from 58519). Do not treat budget-snapshot updates as permission to increase shared agent prompts.

### F5 — REVIEW: reviewer provenance and acceptance level still limited

`handoffMatchesAttempt` validates project/task/thread, packet revision, linked handoff ID and `createdBy = thread:<threadId>`; it does **not** cryptographically bind review evidence to trusted tests. Provider and owner separation are reasonable minimum checks for this synthetic experiment, but future real acceptance must identify the review run/provider and external test provenance, prevent wrong-attempt reuse of later same-thread handoffs, and distinguish reviewer claim from verification authority. No `VERIFIED` transition is written here, which is correct.

## Local evidence and status classification

- **IMPLEMENTED**: standalone synthetic continuation source and tests on experiment branch.
- **RUNTIME PASS (bounded, worker reported)**: 5 focused files / 66 passing tests in latest handoff; earlier 7 / 88 `check:changed` pass on adjacent code. Source inspected by manager, **not rerun independently**.
- **REVIEW REQUIRED / IMPLEMENTATION DEFECT**: F1, F2; scope is continuation authorization and atomicity. F3 missing durable escalation, F4 pre-release visibility.
- **NOT INTEGRATED / NOT PRODUCTION ENABLED**: fork main and upstream unchanged. No external model/session/UI qualification.
- The already-published upstream PR #28777 contribution is a separate task and does not verify this continuation policy.

## Next exact bounded repair and verification task — T3 Code

**TASK/OWNER:** One isolated local T3 Code writer, Codex/Claude-class due to concurrency/atomicity and security-sensitive authorization. Keep one writer for `apps/server/src/projectRuntime` and `packages/contracts/src/projectRuntime.ts`. Overall Manager reviews returned evidence; optional independent second reviewer after tests. Use the least costly capable model for independent read-only tests first.

**REPO/BASE:** `jermur788/t3code`, current experiment branch `experiment/browser-task-continuation-spike-20261103`. Confirm current remote head, local branch, worktree, clean status, unrelated changes, ownership and running workers. Use a **new isolated review-repair worktree/branch** based on the published experiment head; do not overwrite the current local qualification worktree, main or research branch. One writer only. Source is deliberately a synthetic spike; no automatic merge.

**GOAL:** Close F1/F2 with deterministic failing tests first, then minimal security fix using existing Project Runtime/SQL/receipt abstractions. Address F3 with one observable blocked decision as possible without expanding product scope. Document F4 as strict integration gate rather than silently enabling production.

**IN-SCOPE:** Fix only continuation authorization/decision binding, revocation race, and durable stop semantics. Tests cover forged request keys, pass-vs-fail evidence, exhaustion, task policy revoke/cancel mid-flight, concurrent reconcilers, two services on one SQLite file, restart of pending intent, and a failed/ambiguous review stop path. Keep `no VERIFIED from reviewer claim`. Preserve exact existing test scenarios and 2-cycle synthetic budget. Reuse all current T3 V2 launch IDs, request keys and receipt store. File-backed restart tests mandatory.

**STOP/ESCALATE IF:** Truly safe revocation requires new authoritative store/queue, intrusive modifications to upstream EventSink/EffectWorker/ThreadLaunch, changing public UI/production permissions or unapproved paid resources; record the design blocker rather than improvising. Concurrent process tests may expose deeper SQLite isolation limits; do not relax tests to pass.

**TESTS:** Existing focused 5 files/66 tests plus new negatives; `vp run check:changed` on final branch and relevant typecheck/lint/format. Record command outputs, deterministic replay, expected blocked state and exact changed files. Verify no extra global agent-context budget growth without explicit justification; if contract changes unavoidable, record it.

**RETURN HANDOFF:** verdict per finding (fixed/blocked), branch/base/changed paths, exact before/after failing test output, full relevant command results, authorization/provenance/replay rationale, remaining risks, independent review status, integration not done and next action. Preserve original worktrees; no stashes, resets, force-pushes or destructive cleanup. Do not open a production PR or merge main.

**PUBLIC/PRODUCT:** User approval remains required for new production policy or material architecture changes; the synthetic repair work is authorized by the existing bounded experiment direction.
