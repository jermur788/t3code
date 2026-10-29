# ARM-020 — Execution Context Observation Task Packet

## VERDICT

READY TO IMPLEMENT

This packet is browser-side reconnaissance and task framing only. No Runtime execution code was changed here.

## TASK

Implement **ARM-020 — Execution Context Observation** against the approved Adaptive Model Routing V1 spec.

## ROUTING

Use a Claude/Codex-class implementation worker. Execution atomicity, restart recovery, cancellation, and reconciliation are architecture-sensitive.

One writer for the execution/telemetry lane. Read-only review may run independently.

## BASE / CONTEXT

- Repository: `jermur788/t3code`
- Authoritative base inspected: `main @ 945627ca3c929bd8838de6ace5ac8c653acf217d`
- Governing spec: `jermur788/CCF/specs/t3-adaptive-model-routing-v1/spec.md`
- Governing bounded tasks: `jermur788/CCF/specs/t3-adaptive-model-routing-v1/tasks.md`
- ARM-010 persistence is present on current main as fork migration `007_AdaptiveRouting`.
- PR #10 is evidence/context only; it is not a spec change and contains no ARM implementation.

The bounded task file still labels ARM-010 and ARM-020 `TODO`; that status label is stale relative to repository truth for ARM-010. Do not treat that label as implementation authority.

## RECONNAISSANCE FINDINGS

Current main contains fork migration 7, `AdaptiveRouting`, with an `adaptive_execution_observations` table linked to existing Runtime truth by `(project_id, task_id, attempt_id)` and prediction identity by `(project_id, task_id, prediction_id)`.

Important persistence properties already established by ARM-010:

- `attempt_id` is unique in `adaptive_execution_observations`, providing a persistence-level one-observation-per-attempt boundary.
- Cross-task attempt/prediction linkage is rejected through composite foreign keys.
- Adaptive records cascade from Runtime truth; adaptive deletion does not rewrite Runtime rows.
- ARM-010 added the Runtime composite unique index needed for same-task foreign-key integrity without rewriting Runtime rows.

ARM-010 history also records repairs specifically for same-task identity, contract decoding/bounds, cross-task rejection, historical attempts, Runtime-preservation proof, file-backed reopen, and malformed payload handling. ARM-020 should build on these invariants rather than replace them.

## GOAL

Persist exact execution provenance/context for each Runtime task attempt using the existing execution receipt plus only narrow additional snapshots, while proving that telemetry is observational.

Core invariant:

> **Telemetry observes execution; it must never alter whether or how a worker launches.**

## IN SCOPE

For an observed Runtime execution attempt, capture or reference, when available:

- Runtime project ID, task ID, task revision, task role, attempt ID;
- execution/thread/run reference and attempt timestamps;
- provider driver, provider instance, exact model slug;
- exact provider/model option selections used at launch;
- static route winning source/layer and available candidate/rejection provenance;
- Runtime mode and interaction mode;
- workspace strategy and safe base/worktree information already present in the execution receipt;
- permission/approval state only when safely observable; otherwise explicit `unknown`;
- privacy-safe normalized tool/MCP capability categories plus stable local capability fingerprint;
- no raw connector arguments/content/secrets; raw tool/connector IDs only if already explicitly safe;
- predicted difficulty snapshot reference required by the ARM-010 observation contract;
- before/after capacity snapshot references when available; missing remains explicit/unknown;
- execution lifecycle facts, including terminal state, cancellation, retry/reconciliation facts, and timing;
- experiment assignment reference only if applicable in the existing contract; ARM-020 must not implement experimentation policy.

Prefer referencing durable data already in the existing Runtime execution receipt rather than duplicating a second source of execution truth.

## OUT OF SCOPE

Do not:

- change static routing precedence, fallback, or route selection semantics;
- change provider/model/project eligibility or authorization;
- change orchestration launch behavior or move launch outside the existing Runtime task execution service;
- add provider quota adapters or infer quota values;
- add scoring, adaptive candidate ranking, difficulty prediction policy, accepted-outcome reconciliation, or experimentation policy;
- create a second provider/model catalog;
- collect credentials, auth tokens, billing identifiers, connector arguments, private connector content, or full conversations;
- decide any open PR #10 product question implicitly.

## OPEN PRODUCT QUESTIONS — NOT ARM-020 DECISIONS

The following remain outside this task unless the implementation is impossible without resolving one. If so, stop and return **SPEC QUESTION** rather than encoding a policy choice:

1. Require cross-provider review for high-risk work?
2. Warn or block launches before a known provider reset?
3. Record orchestrator/operator work as first-class attempts?
4. Require accepted outcome before dependent work?

In particular, ARM-020 should observe ordinary Runtime attempts only under the existing execution model. It should not invent an operator/manual-attempt model to answer question 3.

## IMPLEMENTATION BOUNDARY

Integrate observation at the existing Runtime execution path so the attempt/receipt remains authoritative and restart reconciliation can deterministically recover observation state.

Required behavior:

1. The launch decision and durable Runtime attempt/receipt must not depend on whether adaptive observation succeeds.
2. Telemetry insertion must not create a code path that can launch twice.
3. Restart/replay/reconciliation must converge on one adaptive observation for one Runtime attempt.
4. Repeated observation writes must be idempotent or fail/recover in a way that preserves the one-attempt invariant.
5. If observation data is unavailable, record explicit unknown/absence where the contract supports it; never fabricate provider, permission, tool, quota, or routing facts.
6. Observation lifecycle updates must derive from Runtime attempt state and must not become a second execution state machine.

At implementation start, inspect the exact current Runtime execution/reconciliation/cancellation service and receipt contracts on this base before editing. Repository/runtime inspection overrides historical documentation or this reconnaissance if they differ.

## ACCEPTANCE

ARM-020 is acceptable only if all of the following are demonstrated:

- exact execution provenance is persisted for a normal Runtime attempt;
- provider instance/model/options match the actual durable launch receipt;
- routing provenance matches the static route used for launch;
- runtime/interaction/workspace data matches the launch receipt;
- unknown permission/tool data remains explicit rather than guessed;
- capability fingerprinting excludes secrets/private connector payloads;
- telemetry enabled versus disabled produces identical launch candidate, launch count, worker parameters, and ordinary Runtime attempt semantics;
- restart during/after execution preserves one Runtime attempt and one linked adaptive observation;
- reconciliation is idempotent and cannot duplicate the worker launch;
- cancellation preserves existing cancellation behavior and is reflected only as observation/lifecycle data;
- failed/interrupted/reconcile-required paths do not create a second execution state machine;
- existing RTE execution/reconcile/cancel tests remain green;
- no existing Runtime task/attempt rows are rewritten merely to add telemetry.

## VERIFICATION

At minimum run and record:

1. focused adaptive observation contract/repository/service tests;
2. normal successful Runtime execution fixture with exact receipt-to-observation comparison;
3. telemetry disabled vs enabled equivalence test for launch semantics;
4. duplicate/replay observation test proving one observation per attempt;
5. restart/reopen persistence test;
6. restart while attempt is non-terminal, then reconciliation test;
7. cancellation test and repeated-cancel/idempotency behavior where the existing RTE suite covers it;
8. failed/interrupted/reconcile-required execution cases;
9. unknown permission state fixture;
10. unknown tool/MCP capability fixture;
11. privacy/redaction fixture ensuring no credential, connector argument, retrieved private content, or raw unsafe connector identity reaches adaptive payloads;
12. the existing RTE execution/reconciliation/cancellation suites unchanged;
13. changed-file format/lint/typecheck/tests appropriate to affected packages.

For persistence claims, include a real file-backed reopen/restart check rather than memory-only tests.

## STOP CONDITIONS

Return **BLOCKED / SPEC QUESTION** if any of these becomes necessary:

- observation insertion can cause duplicate launch or ambiguous launch recovery;
- launch must move outside the existing Runtime task execution path;
- normal routing/eligibility semantics must change;
- execution observation requires a second provider catalog;
- safe tool/capability observation requires storing connector secrets/arguments/private content;
- ARM-020 cannot be completed without deciding one of the four open PR #10 product questions.

Routine test failures, migration fixture updates, type errors, or implementation defects are not user decisions; repair and re-run.

## HANDOFF REQUIREMENT

Before ending substantial ARM-020 work, return and persist a durable handoff containing:

### VERDICT

Use precise state: IMPLEMENTED, STATIC PASS, RUNTIME PASS, REVIEW PASS, BLOCKED, etc. Do not claim VERIFIED unless the required runtime evidence exists.

### BASE / CHECKPOINT

- starting base;
- branch/worktree;
- final revision/checkpoint;
- relevant upstream revision if inspected;
- working-tree cleanliness.

### RESULT

- files/components changed;
- observation insertion/update seam;
- exact fields captured vs explicit unknown;
- intentional exclusions.

### VERIFICATION

- exact commands/tests;
- counts/results;
- successful launch evidence;
- restart/reopen evidence;
- reconciliation evidence;
- cancellation evidence;
- telemetry on/off launch-equivalence evidence;
- checks not run and why.

### FAILURES / RISKS

- defects encountered and repairs;
- unresolved risks;
- blocker classification;
- privacy/atomicity concerns.

### REVIEW

- reviewer/provider/model for material review;
- findings;
- repairs;
- re-review result.

### INTEGRATION STATE

- not integrated / PR open / merged;
- target base;
- content drift;
- cleanup remaining.

### NEXT

Exact next authorized action. If ARM-020 passes its required gate, the manager should independently inspect evidence and then sequence the next approved ARM task; do not silently implement a later ARM task in the same lane.

## BROWSER-SIDE HANDOFF

### VERDICT

READY TO IMPLEMENT

### BASE / CHECKPOINT

- Inspected `jermur788/t3code main @ 945627ca3c929bd8838de6ace5ac8c653acf217d`.
- This task packet branch: `arm/arm-020-task-packet`.

### RESULT

- Reconciled the user handoff with live GitHub repository state.
- Confirmed ARM-010 persistence exists on current main as fork migration 7.
- Confirmed the ARM-010 observation table already enforces one observation per attempt and same-task foreign-key linkage.
- Confirmed PR #10 is evidence-only and does not modify ARM semantics.
- Produced this bounded, self-contained ARM-020 implementation packet.

### VERIFICATION

Browser/API inspection only. No code execution, local tests, runtime launch, restart test, or UI/browser app qualification was possible in this browser-side task.

### RISKS / SPEC QUESTIONS

No new spec question was found during reconnaissance. The four existing PR #10 questions remain explicitly undecided.

### NEXT

Run ARM-020 implementation in an isolated writable worktree from `main @ 945627ca3c929bd8838de6ace5ac8c653acf217d` using a Claude/Codex-class worker, then independently verify launch-equivalence, one-attempt restart/reconciliation behavior, cancellation, persistence, and privacy before integration.
