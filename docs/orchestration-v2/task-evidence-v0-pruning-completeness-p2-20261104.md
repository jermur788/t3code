# T3 Fork — Evidence V0 pruning-completeness P2 repair

**Issued:** 2026-11-04 by Overall Manager after independent pre-merge verification handoff.  
**Classification:** GOVERNING BOUNDED REPAIR TASK / PR #21 MERGE GATE.  
**Status:** TASK PREPARED — worker NOT dispatched by writing this document.  
**Parent gate:** [Pre-main verification V1–V5](task-verify-reconciled-v017-before-main-20261104.md).  
**Candidate base:** fork-only [draft PR #21](https://github.com/jermur788/t3code/pull/21), accepted reconciliation head `70203ed5a95dbe1762da1ad2a46c4f153f910492`.  
**Authority:** corrective implementation/tests only on a separately owned worktree/branch; **no PR #21 head update or fork-main merge without manager review and explicit applicable authority**.

## Decision and problem

V1 rendered UI, V2 file-backed reopen/cross-project, V3 actual-pruning fixture, and V4 local gates were reported PASS by the 2026-11-04 verification worker. Independent Codex read-only review reported **CLEAN WITH FINDINGS**. The V3 fixture reproduced a P2 evidence-integrity limitation:

- `before: 3`, `remaining: 2`, `after: 2`, `deleted: 1`, `unresolved: 2`.
- A wholly absent referenced V2 history is represented by explicit `orchestration-v2-unresolved` events.
- Partially pruned history with retained V2 events can be exported without any incomplete/pruning marker, misleading callers about completeness.

The worker's screenshots, logs, and fixture are currently at local paths `/tmp/opencode/evidence/`, `/tmp/opencode/evidence/test-packet/`, and `/tmp/opencode/v017-verification-ledger-20261104.md` on its host. Their bytes have **not** been independently retrieved or durably published by the browser manager. Preserve/export sanitized evidence to the task ledger or GitHub review branch before claiming independent verification.

Manager source inspection agrees with the mechanism: `apps/server/src/projectRuntime/OrchestrationEvidenceService.ts` checks its 1,000-event per-thread bound but does not consult the upstream pruning boundary. `apps/server/src/persistence/OrchestrationEventStore.ts` publishes `prunedThroughSequence`, and `apps/server/src/orchestration-v2/ProjectionMaintenance.ts` advances this boundary before event removal. Existing Evidence V0 contracts allow incomplete observations but currently distinguish read-limit truncation from unresolved references; neither unambiguously describes earlier pruned history.

**Manager quality decision:** do **not** recommend PR #21 for fork-main merge while this known evidence-integrity limitation remains uncorrected. This is a technical acceptance recommendation, not an unauthorized merge, release or new global product policy. The user retains final authority to accept the limitation and approve a merge notwithstanding this recommendation.

## TASK

Implement a minimal, upstream-friendly, deterministic **read-only completeness indicator** for Evidence V0 exports/reconstruction when referenced V2 history may have been pruned. Prove the result using real isolated SQLite pruning/restart fixtures. Keep PR #21 and its accepted candidate checkpoint unchanged until manager re-review.

## ROUTING

- Work class: **LOCAL/CODE REQUIRED** for tests and application changes; browser source/packet review performed by ChatGPT GPT-6 Overall Manager.
- Routine implementation: **DeepSeek/OpenCode** preferred, available capacity **UNKNOWN**. Capture actual provider/model, alternatives, reason, resource observations, attempts and outcomes in Project Runtime or an append-only lane ledger.
- Independent review: **Codex/Claude-class**, different provider/model, read-only. Escalate hard concurrency/security/integration issues directly; ordinary failing tests get up to two materially distinct evidence-backed low-cost repair attempts first, max four bounded solution attempts unless separately authorized.
- One writer for Evidence V0 contract/service/test surfaces; reviewer does not edit. Never consume real/paid app-under-test providers.

## BASE / PREFLIGHT / OWNERSHIP

1. Freshly fetch fork `main`, PR #21 candidate and upstream release-prep parent. Confirm candidate still matches the accepted head, status, unrelated worktrees, active writers and sufficient disk space. The actual upstream parent is **25 commits after tag `v0.1.7`**, not the tag itself; it remains one commit behind latest upstream main at manager's 2026-11-04 inspection.
2. Use a **fresh, uniquely owned external-volume worktree** on the dedicated repair branch; do not rewrite or modify existing verification/reconciliation/experiment worktrees. No stash/reset/force-push/cleanup.
3. Own only these plausible files: `apps/server/src/projectRuntime/OrchestrationEvidenceService.ts`, its existing test file, and (if additive schema is strictly required) `packages/contracts/src/orchestrationEvidence.ts` with focused schema tests. No edits to upstream V2 event pruning, threading, provider-start, migrations, or storage schema.

## GOVERNING ACCEPTANCE BEHAVIOR

1. If the referenced thread's available history may have lost pre-boundary V2 events due to the published pruning watermark, Evidence V0 must **not assert complete history**. Emit a deterministic, machine-readable incomplete/pruned marker with authority `orchestration-v2`, `recordBasis: derived-view`, stable ID, scope and explicit `completeness: unknown` or equivalent.
2. Distinguish **known missing individual references** (existing unresolved marker), **bounded read** (existing per-thread truncation), and **possible history loss from pruning**. Do not change meaning of the existing read-limit truncation event to mean pruning. A strictly additive evidence record type may be needed; keep it minimal and version-compatible with the existing V0 envelope. Avoid unreviewed breaking schema changes.
3. Use the **existing persisted pruning boundary** from upstream; do not create a duplicate event log, history index, migration or provider polling subsystem. A global watermark is not per-thread proof of missing data: characterize cases conservatively as incomplete/unknown rather than falsely claiming exact deleted counts. Do not mark newly created threads after the watermark as incomplete solely because unrelated history was pruned.
4. Fresh/no-prune histories retain identical meaningful export data and deterministic ordering. Repeated exports preserve stable event identities, facts and references (except documented export timestamps).
5. Under actual partial pruning, export and reconstruct both expose incomplete/pruning provenance; fully absent referenced histories continue to be unresolved. Cross-project isolation and bounded reads remain intact. No fabricated V2 events or known-complete claim.
6. If accurate scoped detection requires a new material contract, changes a documented guarantee, or cannot be achieved using existing source metadata, **stop with tests and options** for manager/user architecture decision rather than silently rewriting V2 internals.

## VERIFICATION

- Add a focused **red-before/green-after** regression in the existing Evidence V0 test suite using a real file-backed SQLite fixture or correctly initialized in-memory projection-maintenance layer. Demonstrate the published pruning boundary and at least one actual deleted event; avoid only mocking the watermark.
- Cover (a) fresh full history, (b) partially pruned referenced history with retained V2 event(s), (c) fully unavailable referenced thread/run, (d) unrelated project/thread whose complete history begins after the watermark, (e) per-thread read bound, (f) deterministic JSONL/contract decode, and (g) restart/reopen plus project isolation where practical.
- Run affected `OrchestrationEvidenceService.test.ts`, contract/schema tests and `ProjectionMaintenance.test.ts` (or equivalent), then `vp run typecheck`, `vp run check:changed upstream/main`, `AgentContextBudget.test.ts` and web build if contract/schema changes could affect app-facing material. Report exact commands, exits, counts and measured tool-list snapshot; no invented CI or provider metrics.
- Request a distinct read-only reviewer; review failure semantics, watermark races, long V2 ID bounds, additive contract validity, and no change to upstream source of truth.
- Manager inspects exact final diff/test receipts. PR #21 can be marked repair-accepted **only after** reproducible passing local evidence and independent review, followed by a decision about promoting the fix to the PR branch. PR #21 is not merged by this task.

## OUT OF SCOPE / STOP CONDITIONS

No synthetic continuation gate or D2/D4 release change; no strict run-start redesign, migrations, upstream public contribution, paid model evaluation, direct fork-main update, PR creation/merge, branch history rewrite, tests weakened to pass, or copy of unsanitized private data into GitHub.

Stop for new authorization on a material API semantics or architecture tradeoff, unexpected overlapping ownership, security conflict or irreversible action. An observed P2 fix is not authorization to ship.

## REQUIRED HANDOFF

Return **VERDICT; BASE/CHECKPOINT and clean worktree; RESULT and exact owned files; TESTS/exits including red→green; PRUNING REPRO evidence; REVIEW provider/model/verdict; FAILURES/risks; INTEGRATION STATE; NEXT and user-decision gate**. Persist in Runtime where available, otherwise add a durable task-lane ledger and return it to the manager. Mark unrun checks **NOT RUN**, never PASS.

Final desired state is **P2 REPAIR REVIEW PASS / READY FOR MANAGER PROMOTION DECISION**, not `INTEGRATED` or `PRODUCTION VERIFIED`.
