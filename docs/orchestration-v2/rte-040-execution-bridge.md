# RTE-040 — Execution Bridge

Status: IMPLEMENTED / RUNTIME PASS (RTE-050+ pending)

## Task

Launch one durable worker execution for a Runtime task without adding a second
provider or orchestration engine.

## Base

- Repository: `jermur788/t3code`
- Base: `main @ b492d54f2c` (RTE-020 routing and RTE-030 settings integrated)
- Branch: `rte/rte-040-execution-bridge`
- Upstream inspected: `pingdotgg/t3code @ 0894156d9a`
- Related accepted work: [Runtime routing](../internals/runtime-routing.md),
  [Project Runtime](../internals/project-runtime.md), RTE-030 task packet.

## Governing behavior

- A Runtime task execution resolves the existing task → project → Development
  Profile → normal T3 routing layers immediately before launch.
- The execution attempt is project-owned, durable, and readable after restart.
- The deterministic task packet contains the task and latest handoff only.
  Routing and effective instructions are not copied into the prompt; instructions
  continue through the existing per-turn context path.
- One active attempt per task. Retries reuse the attempt's command, thread, and
  message ids, so the existing orchestration receipts make launch idempotent.
- No cancellation, restart reconciliation, execution history paging, retry
  lineage, or orphan-thread cleanup in this gate. Those are RTE-050.

## Atomicity decision

The approved seam is **attempt-first plus deterministic orchestration ids**, not a
new EventSink hook:

1. Validate Runtime enablement, task revision/status, routing, provider
   eligibility, default model (for inherited routing), and worktree base.
2. Persist the attempt as `pending` with a preallocated thread id and derived
   command/message ids.
3. Call the existing `ThreadLaunchService.launch` outside the database
   transaction.
4. Mark the attempt `launched` with its run id, or `failed` when no thread exists.
   An ambiguous launch after thread creation becomes `reconcile_required`.

`ThreadLaunchService.launch` is two receipt-idempotent commits
(`thread.create`, then `message.dispatch`). A single EventSink transaction cannot
cover both without publishing events before commit or changing the Orchestrator's
transaction boundary. Attempt-first ordering still guarantees that no worker
thread can exist without a prior durable attempt, and deterministic ids make every
partial launch recoverable. A crash leaves a `pending` attempt for RTE-050
reconciliation; it never permits a second launch for the same task.

## Schema and contracts

- Fork migration `005_RuntimeExecutionAttempts`:
  `project_runtime_execution_attempts` with project/task FK, status, revision,
  unique thread id, nullable run id, request key, timestamps, and payload JSON.
  Partial unique index on active attempts per task; unique request key per task;
  cascade with task/project deletion.
- `packages/contracts/src/runtimeExecution.ts`: attempt summaries/records,
  routing receipt, deterministic packet, execute/list/read inputs, and tagged
  rejection/not-found errors.
- `projectRuntime.executeTask`, `listExecutionAttempts`, and
  `readExecutionAttempt` RPCs with existing scopes.

## Behavior

- Task statuses `planned`, `ready`, and `active` may execute.
- Selected routes use their provider/model/options/isolation/runtime/interaction
  modes. Inherited routing uses the project default model and default runtime
  mode; no default model is a clear rejection.
- `shared` isolation launches in the project root; `worktree` uses the task's
  recorded revision/branch or `HEAD` and the existing worktree preparation.
- A failed attempt is terminal and allows a new execution. `launched` and
  `pending` attempts block re-execution; double-click and retry return the same
  attempt.
- The attempt records the full server routing resolution as its receipt.
- The UI shows the latest attempt, provider/model, route source, failure, and a
  link to the worker thread. No cancel or restart control exists yet.

## Acceptance

- Execute creates one durable attempt and one worker thread/run.
- Failed pre-checks create no attempt and launch nothing.
- Reusing a request key or clicking while active returns the same attempt.
- The task revision is compare-and-set at execution.
- Provider/routing/worktree failures are explicit.
- No second provider or orchestration engine is introduced.
- Classic T3 threads and RTE-020 routing semantics remain unchanged.
- Focused server/migration/UI tests and changed-package checks pass.

## Next

RTE-050 recovery and cancellation: reconcile pending/reconcile-required attempts,
link handoffs, idempotent restart behavior, cancellation, and `reconcile-required`
resolution.
