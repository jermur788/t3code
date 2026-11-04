# T4 — strict production revocation design and shipping exclusion (research only)

**Date:** 2026-11-04
**Status:** DESIGN / NO IMPLEMENTATION. No engine, authority-store or build change was made.
**Authority:** D3 accepts best-effort cancellation only for isolated experiments. D4 requires a
strict no-new-run guarantee before production enablement. This memo is a release-gate input, not an
authorization to change upstream execution internals.

## 1. What exists today (best effort, experiment only)

Continuation dispatch path (`apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts`):

1. `advanceContinuation` re-derives the policy decision from durable task rows.
2. `dispatchContinuation` calls `authorizeContinuationDispatch`, which re-reads source task,
   source attempt, handoff and policy revision.
3. `runExecute` inserts a `project_runtime_execution_attempts` receipt with a reserved
   `cont:v1:*` request key, guarded by an `EXISTS` check on the exact source revision.
4. `launchAttempt` re-checks authorization, then calls `ThreadLaunchService.launch` (`runLaunch`).
5. `ThreadLaunchService.launch` dispatches `thread.create` and `message.dispatch` into the
   event-sourced orchestrator; the message dispatch commits `run.created` plus a
   `provider-turn.start` outbox effect in one transaction (`EventSink.commitCommand`).
6. The effect worker later claims the outbox row and calls `ProviderTurnStartService.start`.

The residual window is step 3→4: the receipt is durable, but revocation can commit between the
last authorization check and `launch.launch`, so one turn can still start. D3 preserves this
limitation explicitly.

## 2. Candidate linearization points

### A. Receipt-insert guard (today)

Linearization point: receipt row insert. Atomic with the fork-owned SQLite write. Revocation after
the insert is not observed by the external launch. **Insufficient alone for D4.**

### B. Run-creation guard (recommended primary)

Add a server-issued `continuationAuthorization` to the internal dispatch command:
`{ sourceTaskId, sourceAttemptId, requestKey, sourceTaskRevision, targetTaskId, targetRevision,
authorizationId }`. Inside the same `EventSink` transaction that emits `run.created` and enqueues
`provider-turn.start`, the handler performs one conditional write:

```sql
INSERT INTO orchestration_runs (...)
SELECT ... WHERE EXISTS (
  SELECT 1 FROM project_runtime_tasks
  WHERE project_id = ? AND task_id = ?
    AND revision = ? AND status IN ('planned','ready','active','review')
    AND json_extract(payload_json, '$.continuation.mode') = 'synthetic'
)
```

If the `EXISTS` fails, the command is rejected with a typed reason and no run/effect is committed.
Because SQLite serializes writers and `BEGIN IMMEDIATE` holds the write lock across read and
commit, a revocation (`updateTask revision+1`, policy removal, or `cancelled`) committed before
this transaction is visible to it. A revocation committed after it is a separate, later commit.

- **Defines launch as durable run creation.** This gives a precise, testable invariant: after a
  revocation commit, no new `run.created` for that policy can commit.
- Does **not** stop a run already created but not yet started. That must be handled by the
  in-flight contract below.
- Requires an extension point in upstream-owned dispatch. Keep the guard generic (a
  `runCreateGuard` / `authorization` field on the command) rather than teaching upstream about
  Project Runtime. A fork-owned `ContinuationAuthorizationService` can supply the predicate.

### C. Provider-turn-start guard (defence in depth)

The effect worker re-reads the authorization row before calling the adapter, and atomically claims
it (`UPDATE ... WHERE authorization_id = ? AND consumed_at IS NULL RETURNING`). A claim failure
cancels the run instead of retrying. This narrows the start window but cannot atomically commit
and call an external CLI; the external `startTurn` call is not transactional. It is useful
defence-in-depth, not the primary guarantee.

### D. Dedicated authority table with monotonic epoch

`continuation_authorizations(source_task_id PRIMARY KEY, epoch, revoked_at, ...)`. Revocation
increments `epoch` in the same transaction as the task update; dispatch carries `epoch` and
consumes it with `UPDATE ... WHERE epoch = ?`. Cleaner provenance and easier multi-process
reasoning, but it is **new authority state**, which the spec marks REVIEW REQUIRED / PRODUCT
DECISION. Prefer B first; D only if revision comparison in B is judged too implicit.

## 3. In-flight versus new runs

| Boundary                                         | Revocation before boundary                                                        | Revocation after boundary       |
| ------------------------------------------------ | --------------------------------------------------------------------------------- | ------------------------------- |
| Before receipt insert                            | no receipt; nothing to launch                                                     | —                               |
| After receipt, before run creation               | B rejects run creation; existing receipt becomes `cancelled`/`reconcile_required` | —                               |
| After run creation, before `provider-turn.start` | C can cancel the run (best effort; document)                                      | run starts; it is now in-flight |
| After turn starts                                | in-flight; requires explicit stop/reconcile contract                              | same                            |

D4 only promises no **new** run after durable revocation. Existing in-flight work needs a separate
stop contract: `cancelAttempt` stop-writer CAS + interrupt effect + reconciliation. That contract
must define what "stopped" means per provider (turn interrupted vs process exited) and what the
user sees while a provider cannot be reached. It is not satisfied by the current best-effort path.

## 4. Provenance and actor rules

- Authorization must be server-derived: `runtime:continuation`, never a client-supplied actor.
- The guard consumes the exact `sourceTaskRevision` and `requestKey`; packet text is context, not
  authority (already true today).
- Client/MCP actors cannot create or modify a non-null policy while the gate is off. A `user:`
  actor may still explicitly remove a policy; non-user agent/MCP actors cannot. This is an actor
  class check, not per-operator ownership enforcement (existing behavior; not changed here).
- The authorization record must not be derivable from `threadId`, task title, model output, or the
  `cont:v1:` key alone.

## 5. Cross-process, restart and observability

- Every dispatch and run-create transaction re-reads authority; no in-memory cache decides.
- Pending outbox effects revalidate on claim after restart; a revoked authorization cancels the
  run rather than starting it.
- Two-instance test: same SQLite file, two service graphs, revoke between receipt and run-create;
  assert exactly zero new `run.created` after the revocation commit and no duplicate dispatch.
- Restart test: receipt pending, policy revoked while the process is down, restart; assert cancel
  or reconcile, never launch.
- Stable log events: `continuation.dispatch.blocked`, `continuation.run-create.rejected`,
  `continuation.start.cancelled`, with attempt/source/revision ids. Counters for blocked dispatch
  and cancelled starts. Never log a disabled or blocked decision as success.

## 6. Upstream compatibility and rebase hotspots

- B touches `Orchestrator` command dispatch + contracts; C touches `EffectWorker` /
  `ProviderTurnStartService`. Both are upstream-owned and therefore **REVIEW REQUIRED**.
- Preferred upstream shape: a generic optional `runCreateGuard` on the dispatch command or a
  `ThreadLaunchService.launch` option that receives an Effect predicate evaluated inside the
  commit transaction. Upstream does not need to know about Project Runtime.
- Hotspots: `Orchestrator.ts` (+250/−61 upstream), `ThreadLaunchService.ts` (+37),
  `EffectWorker.ts`, `ProviderTurnStartService.ts`, `packages/contracts/src/rpc.ts`,
  migrations. The trial merge showed no textual conflict in these files, but behavioural
  verification is still required.
- Migration: a new table (option D) needs a fork migration and a rollback story; option B needs no
  schema change and is reversible with the gate.

## 7. Shipping exclusion strategy (D2)

The gate is runtime-only; it does not remove the feature or its agent-visible schema bytes from a
shipping build. D2 therefore needs a separate release mechanism.

**Preferred, strongest:** ship from fork main (or the reconciled upstream base) without the
continuation commits. The experimental branch remains the only place the feature exists. Release
checklist verifies the absence, not a runtime flag.

**Build-time exclusion if the code must stay in the shipping source:**

1. A compile-time constant (e.g. `__T3CODE_EXPERIMENTAL_CONTINUATION__`) set false for public
   builds; dead-code elimination removes the continuation dispatch path.
2. Conditional MCP tool registration: the `t3_project_task_create/update` schemas omit the
   `continuation` field entirely in public builds, rather than exposing it and rejecting it at
   runtime. This is the only way to recover the +646-byte tool-list overhead.
3. A release test that inspects the **built** server's `tools/list` JSON, not the source:
   assert no continuation field/marker and a budget ceiling. Source grep is not proof because the
   tool list is generated at runtime.
4. Re-measure on the actual shipping artifact and compare against the shipping ceiling; do not
   copy the 59,165/47,538 snapshots.

**Risk:** conditional schemas diverge between web, desktop, mobile and MCP surfaces. Test the
built MCP tool list and the budget test in the release job. A build-time flag that removes code
but leaves schema fields does not satisfy D2.

## 8. Open decisions (do not implement without sign-off)

1. Is "launch" the durable `run.created` commit (B) or the provider `startTurn` call (C)? D4's
   wording should be pinned before engine work.
2. Is a new authority table/epoch acceptable (D), or must the guard use existing task revisions?
3. Who owns the in-flight stop contract, and what user-visible state represents "stopping but not
   stopped"?
4. Does upstream accept a generic run-create authorization hook, or must this stay fork-only?
5. Which shipping mechanism is approved: branch exclusion, build-time schema exclusion, or both?

None of these is implemented here. All are release gates before production enablement.
