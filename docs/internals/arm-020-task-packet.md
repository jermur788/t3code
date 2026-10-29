# ARM-020 — Execution Context Observation Task Packet

## VERDICT

**BLOCKED / SPEC QUESTION**

Browser-side source inspection found a real sequencing/contract conflict that should be reconciled before ARM-020 implementation. No Runtime execution code was changed here.

## TASK

ARM-020 remains **Execution Context Observation** under `SPEC-T3-ADAPTIVE-MODEL-ROUTING-V1`.

Core invariant:

> **Telemetry observes execution; it must never alter whether or how a worker launches.**

## BASE / CONTEXT

- Repository: `jermur788/t3code`
- Authoritative implementation base inspected: `main @ 945627ca3c929bd8838de6ace5ac8c653acf217d`
- Governing spec: `jermur788/CCF/specs/t3-adaptive-model-routing-v1/spec.md`
- Bounded tasks: `jermur788/CCF/specs/t3-adaptive-model-routing-v1/tasks.md`
- ARM-010 persistence is integrated on current main as fork migration `007_AdaptiveRouting`.
- PR #10 is orchestration evidence/context only, not an accepted ARM spec change.

## EXACT EXECUTION INTEGRATION SEAM

Current `apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts` is the single execution authority and already owns the architecture-sensitive seams ARM-020 must observe:

- `resolveLaunch` resolves static routing, reads the existing provider view/settings, rechecks provider/model/project eligibility, and constructs the actual `RuntimeExecutionLaunch`.
- the durable `RuntimeExecutionAttempt.receipt` is the authoritative launch provenance for model selection/options, route resolution/provenance, runtime mode, interaction mode, workspace strategy, and the exact Runtime task packet/revision;
- `runLaunch` launches from that stored receipt using deterministic command/message IDs derived from `attemptId`;
- `updateAttempt` is the revision-protected attempt-state update seam;
- the service exposes `execute`, `cancelAttempt`, `reconcileAttempt`, and `reconcileActiveAttempts`;
- a service-local semaphore serializes the execution lane.

Existing qualification/tests already prove important invariants ARM-020 must preserve:

- an attempt is persisted before launch;
- repeated client request IDs and concurrent executes reuse one active attempt/launch;
- a pending attempt can be replayed with the stored launch IDs;
- failed launch can become a terminal failed attempt and a later attempt can be created;
- ambiguous launch recovery becomes `reconcile_required` rather than relaunching blindly;
- restart reconciliation can observe a launched attempt and later mark it completed without another launch;
- cancellation and reconciliation are already part of the same Runtime execution service.

**Implementation boundary:** observation belongs beside these existing state transitions. It must not introduce a second launch path, a second attempt lifecycle, or a second routing/provider authority.

## ARM-010 PERSISTENCE ALREADY AVAILABLE

`AdaptiveRoutingService` already exposes append-only persistence for `AdaptiveExecutionObservationReference` through `appendExecutionObservationReference`.

Migration 007 creates `adaptive_execution_observations` with:

- one row per `attempt_id` via a unique constraint;
- composite same-task foreign keys for `(project_id, task_id, attempt_id)` and `(project_id, task_id, prediction_id)`;
- cascading deletion from authoritative Runtime/task records without adaptive deletion rewriting Runtime truth.

ARM-010's handoff also records the same-task identity repair, contract bounds/decoding, cross-task rejection, historical-attempt coverage, Runtime-preservation checks, file-backed reopen proof, and malformed-payload handling.

## SPEC QUESTION — PREDICTION DEPENDENCY

The current approved task order and the integrated ARM-010 contract do not line up:

1. ARM-020's goal is to **persist exact execution context for Runtime attempts**.
2. `AdaptiveExecutionObservationReference.predictionId` is **mandatory**, not optional.
3. The database also makes `prediction_id` `NOT NULL` and requires a same-task foreign key to `adaptive_difficulty_predictions`.
4. ARM-040 is the bounded task that creates **predicted and realized difficulty** and is explicitly sequenced **after ARM-020** (`ARM-040` depends on `ARM-020`).
5. The ARM-020 packet/task excludes implementing difficulty-prediction policy.

Therefore a conforming ARM-020 implementation cannot persist an execution observation for a normal attempt unless a valid difficulty prediction already exists, but the approved task that produces those predictions has not run yet.

Do **not** resolve this implicitly by:

- inventing a dummy/default prediction;
- fabricating an all-zero or `unknown` difficulty assessment when the contract does not define that meaning;
- making `predictionId` optional by implementation fiat;
- implementing ARM-040 prediction policy inside ARM-020;
- silently changing task dependencies/order.

Any of those choices changes the approved data/ordering semantics and should be reconciled in the governing spec/tasks first.

### Decision needed

Reconcile the spec/task sequence with one explicit design. Examples that could be evaluated in the spec revision include:

- split a minimal pre-launch prediction-creation prerequisite out of ARM-040 and run it before/with ARM-020;
- reorder the relevant bounded tasks so valid predictions exist before execution observations;
- revise the observation contract so `predictionId` is legitimately absent until later linkage, with clear backfill/reconciliation semantics.

This packet does **not** choose among those options.

## OPEN PR #10 PRODUCT QUESTIONS

The previously identified questions remain separate and undecided:

1. Require cross-provider review for high-risk work?
2. Warn or block launches before a known provider reset?
3. Record orchestrator/operator work as first-class attempts?
4. Require accepted outcome before dependent work?

None was needed to identify the prediction dependency above.

## ARM-020 ACCEPTANCE AFTER SPEC RECONCILIATION

Once the prediction dependency is resolved, ARM-020 should still prove:

- exact persisted provenance matches the durable launch receipt;
- provider instance/model/options, route provenance, runtime/interaction/workspace data match the actual launch;
- permission/tool/MCP data is explicit `unknown` when not safely observable;
- capability telemetry excludes connector secrets, arguments and retrieved private content;
- telemetry enabled/disabled yields identical launch candidate, launch count, worker parameters and Runtime attempt semantics;
- restart/reopen preserves one Runtime attempt and one linked observation;
- pending/replay/reconciliation cannot create a duplicate launch or duplicate observation;
- cancellation/failed/interrupted/`reconcile_required` paths remain Runtime-owned lifecycle facts;
- existing execution/reconcile/cancel qualification remains green;
- persistence is proven with a real file-backed reopen/restart test.

## ROUTING

After the spec question is resolved, use a Claude/Codex-class worker for ARM-020 because execution atomicity/recovery semantics are architecture-sensitive. Keep one writer for the execution/telemetry lane; independent read-only review may run in parallel.

## HANDOFF

### VERDICT

BLOCKED / SPEC QUESTION

### BASE / CHECKPOINT

- Inspected base: `main @ 945627ca3c929bd8838de6ace5ac8c653acf217d`.
- Browser task branch: `arm/arm-020-task-packet`.
- No Runtime implementation files changed.

### RESULT

- Mapped the exact execution/reconcile/cancel integration seam in current source.
- Reconciled ARM-010 persistence/service contracts with ARM-020 and ARM-040 task sequencing.
- Found the mandatory-`predictionId` dependency that prevents a spec-conforming standalone ARM-020 persistence implementation under the current task order.

### VERIFICATION

Source/API inspection only. No local typecheck, tests, worker launch, cancellation, restart, reconciliation runtime probe, or persistence execution was performed in this browser environment.

### FAILURES / RISKS

- **PRODUCT DECISION / SPEC RECONCILIATION REQUIRED:** define how a valid prediction exists before an ARM-020 observation is persisted.
- No evidence suggests the existing Runtime execution architecture itself needs to change.

### NEXT

Reconcile the governing ARM spec/tasks for the prediction dependency. After that decision is encoded, issue the corrected bounded ARM-020 packet and implement against the existing `RuntimeTaskExecutionService` execution lane without changing launch/routing semantics.
