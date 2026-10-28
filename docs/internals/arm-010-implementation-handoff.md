# ARM-010 Implementation Handoff

Date: 2026-10-28
Branch: `arm/arm-010-contracts-persistence-skeleton`
Current checkpoint before this handoff: `cf3304a5f032c7a6a69bfb12bdde1f476a8c344c`
Task: ARM-010 — Adaptive Model Routing contracts and persistence skeleton

## Status in plain language

**IMPLEMENTED / VERIFICATION PENDING.** The Adaptive Routing persistence structure, service, migration registration, migration tests, and focused service tests now exist in source, but they have not been compiled or executed in a runnable checkout during this manager session.

Do not call this STATIC PASS, RUNTIME PASS, REVIEW PASS, INTEGRATED, or VERIFIED yet.

## Scope completed

This task stayed inside the ARM-010 persistence boundary. It did not add model scoring, automatic routing, quota decisions, provider launching, UI behavior, ARM-020 behavior, or integration into `main`.

Implemented source includes:

- adaptive-routing contracts and package exports already present on the branch;
- fork migration `007_AdaptiveRouting.ts`;
- registration of migration 007 in `ForkMigrations.ts`;
- reusable `AdaptiveRoutingService.ts` over the shared environment SQLite database;
- migration-level tests for the adaptive tables, Runtime deletion direction, and environment-scoped capacity persistence;
- fork migration-history expectations updated to include migration 007;
- focused `AdaptiveRoutingService.test.ts` coverage for persistence and compare-and-swap outcome reconciliation.

## Manager repairs made during takeover

The transition review found one definite implementation defect: migration 007 existed but was not registered in the fork migration loader, so a normal database startup would never apply it. That registration was repaired before the service tests were added.

Manager-created commits in this repair sequence:

- `4a66bf7437c560ec1b464c6267c5853ba26a8bb9` — register Adaptive Routing migration 007.
- `7745f9b02b75678b3768a82e8591b4cd16c61234` — add the reusable Adaptive Routing persistence service.
- `4eceb0d1f7f04301728d798ae469df8920269615` — add migration-level Adaptive Routing persistence tests.
- `3530e9bf833fdc0d0454bb8d95bb204fbfe23f3b` — update fork migration-history expectations for migration 007.
- `cf3304a5f032c7a6a69bfb12bdde1f476a8c344c` — add focused service persistence and compare-and-swap tests.

This handoff document is the next commit after that checkpoint.

## Files materially changed

- `apps/server/src/persistence/ForkMigrations.ts`
- `apps/server/src/persistence/Migrations/Fork/007_AdaptiveRouting.ts`
- `apps/server/src/persistence/Migrations/Fork/007_AdaptiveRouting.test.ts`
- `apps/server/src/persistence/ForkMigrations.test.ts`
- `apps/server/src/projectRuntime/AdaptiveRoutingService.ts`
- `apps/server/src/projectRuntime/AdaptiveRoutingService.test.ts`
- `packages/contracts/src/adaptiveRouting.ts`
- `packages/contracts/src/index.ts`
- `docs/internals/arm-010-implementation-handoff.md`

Some contract/migration files above pre-date the manager repair sequence; they are listed because they form the complete ARM-010 implementation surface that the next reviewer must evaluate together.

## Persistence behavior implemented

The service persists ARM-010 records in the shared environment database rather than conversation state. Raw prediction, realized-difficulty, execution-observation, capacity, recommendation, and experiment records are append-only at the service layer.

Accepted outcomes are mutable only through revision-protected reconciliation. The reconciliation path checks the caller's expected revision, updates the accepted outcome with `revision + 1`, appends a reconciliation-history record, and performs the update/history pair in one SQL transaction.

The service does not contain routing authority, provider-launch authority, quota policy, or UI behavior.

## Focused tests added in the last bounded task

`AdaptiveRoutingService.test.ts` adds three database-backed checks:

1. **Save and reload:** create an accepted outcome and read it back from SQLite.
2. **Reject an outdated writer:** successfully reconcile revision 0 to revision 1, then try another write claiming revision 0 and expect `AdaptiveRoutingConflictError`; verify the stored outcome and reconciliation count remain unchanged by the stale attempt.
3. **Avoid half-written updates:** deliberately cause reconciliation-history insertion to fail and expect the transaction to roll the accepted outcome back to its previous revision/state.

These tests use the real in-memory SQLite persistence/migration layer, not a mocked repository.

## Verification performed

Performed:

- source-level inspection of `AdaptiveRoutingService.ts` against the ARM contracts and existing Effect/SQLite service patterns;
- source-level confirmation that Adaptive Routing contracts are exported from `@t3tools/contracts`;
- source-level confirmation that the focused tests use the server's normal in-memory SQLite persistence/migration layer;
- branch-head and file-scope checks through GitHub.

Not performed:

- TypeScript typecheck;
- unit/integration test execution;
- fresh migration execution in a local checkout;
- restart/reload persistence proof;
- malformed-history fail-closed test execution;
- independent review;
- integration to `main`.

## Operational blocker

The manager execution environment available during takeover could read/write the repository through the GitHub connector, but its local container could not resolve `github.com`, so it could not clone the repository or run the T3 package manager, typechecker, or tests.

This is an **OPERATIONAL BLOCKER to verification**, not evidence that the implementation passes or fails.

## Risks that still need executable verification

- `AdaptiveRoutingService.ts` and its test file may still contain TypeScript/Effect API incompatibilities that source inspection cannot prove away.
- The `sql.withTransaction` reconciliation composition must be exercised to prove both the normal and rollback paths behave as intended.
- The migration tests must execute against a fresh database and relevant pre-existing fork histories.
- Malformed persisted payloads must be shown to fail closed rather than silently producing trusted ARM state.
- Restart/reload persistence must be demonstrated before a persistence verification claim.

## Repository / integration state

- Working branch: `arm/arm-010-contracts-persistence-skeleton`.
- This work is **not integrated into `main`**.
- No claim is made that unrelated branches such as Workspace Mode are merged or ready.
- ARM-020 remains outside this task and should not start merely because ARM-010 source exists.

## Exact next action

Run a bounded executable verification of ARM-010 in a real checkout:

1. typecheck the affected contracts/server packages;
2. run the focused Adaptive Routing migration and service tests;
3. repair only failures within ARM-010 scope;
4. prove fresh-database migration plus restart/reload persistence;
5. add or execute a malformed-history fail-closed check if existing tests do not already prove it;
6. perform the required CAS/privacy/migration review;
7. only then advance the task status to the strongest state supported by the evidence.

If executable verification cannot run, leave ARM-010 as **IMPLEMENTED / VERIFICATION PENDING** and record the blocker rather than promoting it.

## User decision needed

None for this checkpoint. The next logical step is verification, not a new specification. If a later step would materially change the design or expand scope beyond the governing ARM specification, ask the user whether they want a new or revised spec before proceeding.

## Repair: cross-task identity coherence (CCF #63 IMPLEMENTATION DEFECT)

Reviewed HEAD `71f9ae4acbbecf0582ecf6b6cbeadd1148199bff`. Migration 007 was repaired in place (not yet integrated).

**Defect.** `adaptive_execution_observations` and `adaptive_recommendation_receipts` referenced attempts and predictions through independent single-column foreign keys, so a row could claim task A while pointing at task B's attempt or prediction.

**Repair (database-level).**

- `adaptive_difficulty_predictions` gains `UNIQUE(project_id, task_id, prediction_id)`.
- Migration 007 creates `project_runtime_execution_attempts_task_attempt_idx`, a unique index on `(project_id, task_id, attempt_id)`. SQLite requires a composite parent key to be unique. The index is derived from the attempt primary key, so it cannot fail on existing data, and no Runtime row is rewritten.
- Observations reference `(project_id, task_id, attempt_id)` and `(project_id, task_id, prediction_id)` as composite foreign keys; receipts reference `(project_id, task_id, prediction_id)`. All keep `ON DELETE CASCADE`, so deleting adaptive rows still never reaches Runtime tables.

**Tests added.** `packages/contracts/src/adaptiveRouting.test.ts` (schema decoding and bounds); cross-task rejection, matched-identity persistence, historical-attempt-without-telemetry and extended Runtime-preservation deletion tests in `007_AdaptiveRouting.test.ts`; the same rejection/acceptance through the service plus a file-backed close/reopen proof and a malformed accepted-outcome proof in `AdaptiveRoutingService.test.ts`. `001`, `003` and `004` fork-migration tests had hard-coded a six-entry ledger and were already failing at the reviewed HEAD; their expectations now include migration 7.

**Known residual (unchanged scope).** Other ids inside observation and receipt payloads (`realizedDifficultyId`, `outcomeId`, snapshot ids, `experimentAssignmentId`) are payload-only soft references with no columns or foreign keys. `check:changed` also reports pre-existing format drift in `ForkMigrations.test.ts`, `AdaptiveRoutingService.ts` and `contracts/src/index.ts`, and knip reports unused exports `adaptiveRoutingSchema` and `ADAPTIVE_ROUTING_VERSION`; none were touched here.
