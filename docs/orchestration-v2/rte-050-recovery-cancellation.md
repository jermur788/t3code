# RTE-050 — Recovery and Cancellation

Status: INTEGRATED / REVIEW PASS (RTE-060+ pending)

Implementation commit: `b706ed0744` (`feat(runtime): recover and cancel task executions`).

## Task

Make Runtime task execution recoverable across restarts, cancellable, and
reconcilable when the launch boundary is ambiguous, without starting a second
worker.

## Base

- Repository: `jermur788/t3code`
- Base: `main @ 2cbc1fa1c7` (RTE-040 execution bridge integrated)
- Branch: `rte/rte-050-recovery-cancellation`
- Upstream inspected: `pingdotgg/t3code @ 0894156d9a`
- Related: [RTE-040 packet](./rte-040-execution-bridge.md),
  [Runtime routing](../internals/runtime-routing.md),
  [Project Runtime](../internals/project-runtime.md).

## Behavior

- Attempt statuses now include `pending`, `launched`, `cancelling`, `completed`,
  `failed`, `cancelled`, `interrupted`, and `reconcile_required`.
- Active attempts are `pending`, `launched`, `cancelling`, and
  `reconcile_required`. Only `pending` is auto-resumed; every other active status
  blocks another execution.
- Startup reconciliation:
  - `pending` replays the stored launch with the same attempt, thread, command,
    and message ids. Replay either completes the one launch or classifies it.
  - `launched` maps a terminal run to `completed`/`failed`/`cancelled`/
    `interrupted`; a run still active stays `launched`.
  - `cancelling` maps a terminal run to that run's status (`cancelled`,
    `interrupted`, `completed`, or `failed`); a thread that is gone becomes
    `cancelled`; an active run stays `cancelling`.
  - `reconcile_required` stays ambiguous unless a terminal run can now be read.
  - A failed thread read never becomes `failed`; it becomes
    `reconcile_required`.
- Cancellation:
  - Stops the worker thread through the existing orchestration `thread.stop`
    command, never a provider-specific side channel.
  - A terminal attempt is returned unchanged.
  - A thread that is already gone becomes `cancelled` without launching.
  - A shell-read failure or a failed stop dispatch becomes
    `reconcile_required`.
  - Cancellation is compare-and-set on the attempt revision.
- Handoff linking:
  - Reconciliation finds the newest handoff for the task whose provenance
    `threadId` matches the execution thread, and records its id on the attempt.
    It does not rewrite the handoff or the task's `latestHandoffId`.

## Cancellation status and active slot

`cancelling` is active, so a failed or ambiguous stop cannot free the task for a
new launch. The user can retry Cancel (the UI shows **Cancel again**) or Recheck.
After the run is terminal, reconciliation releases the active slot.

## Out of scope

- Automatic retry of a failed attempt.
- Automatic terminalization of an attempt whose run cannot be read.
- Execution history paging beyond the attempt list.
- Retry lineage and orphan-thread cleanup beyond reconciliation.
- MCP execution tools.

## Acceptance

- Startup reconciliation is idempotent and never creates a second worker for an
  ambiguous attempt.
- Pending attempts replay with stable ids.
- Launched/cancelling/reconcile-required attempts resolve from the existing
  thread/run state.
- Cancel is revision-guarded and uses the existing orchestration stop path.
- Terminal attempts link the worker's handoff when one exists.
- Focused service/migration/UI tests and changed-package checks pass.

## Completion handoff

- **VERDICT:** RUNTIME PASS / REVIEW PASS; RTE-V1 is not yet VERIFIED.
- **DELIVERED:** startup reconciliation, pending launch replay, terminal run mapping, reconcile-required ambiguity handling, revision-guarded cancellation through `thread.stop`, active-slot retention, worker-thread handoff linking, migration 006, Cancel/Recheck UI, and focused tests/docs.
- **VERIFICATION:** `VITEST_MAX_WORKERS=1 vp run check:changed` passed (format, lint, knip, graphql, typecheck 32 packages, 8 changed test files / 81 tests). Runtime evidence: RTE-040's launched Claude attempt reconciled to Failed after restart; a live execution was cancelled (Cancelling + cancellation timestamp), then after restart reconciled to Interrupted with the same attempt/thread link and revision 4. Handoff-link and wrong-thread tests pass.
- **REVIEW:** independent Claude B review found two reconciliation blockers (terminal non-revival and runtime slot release); both fixed with tests. Re-review returned RUNTIME PASS.
- **EXCLUDED:** automatic retry lineage, orphan-thread cleanup, execution history paging, MCP execution tools.
- **NEXT:** RTE-060 Cross-Provider Qualification under the continuation amendment.
