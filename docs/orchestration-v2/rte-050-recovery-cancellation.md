# RTE-050 — Recovery and Cancellation

Status: IMPLEMENTED / RUNTIME PASS (integration pending)

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
  - `cancelling` becomes `cancelled` when the thread is gone or its run is
    terminal; an active run stays `cancelling`.
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
