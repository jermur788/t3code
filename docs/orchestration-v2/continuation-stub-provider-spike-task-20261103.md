# Bounded spike: T3-native automatic continuation

Date: 2026-11-03
Status: EXPERIMENT AUTHORIZED FOR ISOLATED STUB-PROVIDER DEVELOPMENT / NOT ACCEPTED PRODUCTION DESIGN / NOT IMPLEMENTED
Owner: T3 Code local isolated worker, with Overall Manager evidence review
Repository: jermur788/t3code
Base: current main as of review, revalidate before work (reported d3bedef12a31); use fresh isolated worktree
Governing direction: docs/internals/fork-product-direction.md; Project Runtime and RTE-V1 contracts; 02_COORDINATION_HANDOFF_PROTOCOL.md and current state
Design review: user-supplied independent Sonnet read-only analysis from 2026-11-03; manager source spot-check of current main

## Why this bounded experiment is authorized

Independent reviewer recommends T3-native continuation rather than replacing the coordinator with DeepSeek Superagent, confidence roughly 80%. Source review confirms:
- T3's RuntimeTaskExecutionService persists attempt-first launches, active-attempt gating, reconciliation, cancellation and handoff linking.
- ProjectRuntimeService requires passing evidence for a passing verification milestone, but this input validation **is not independent proof** that acceptance or review really passed. Execution terminal `completed` does not automatically mean task VERIFIED.
- DeepSeek Superagent bundles an application Engine with exclusive ownership of Triggers/Threads/Tickets/Assignments and a separate persistent Store, and its ACP surface does not expose that orchestration domain.
- Superagent prototype and Harness have MIT licences and can legally be forked/maintained if upstream stops; that does not make maintenance free.
- DeepSeek Harness's ACP worker entrypoint is already documented by T3. No new provider driver is required for this spike.

The independent reviewer ran no code. This authorizes a **reversible local test**, not adoption of a final product architecture. Option B may be reopened if future APIs, security guarantees or measured effort materially change.

## Initial gate: repo and task ownership

Before any write: inspect repo, branch/worktree, current head, status, unrelated changes, running workers and lane owner. Never stash/reset/discard/force-push/rebase shared history. Create a new separate worktree/branch off the refreshed main head, not PR #20's docs branch. One code writer. Compare the existing Runtime/Orchestrator service and relevant upstream extension points first. This is a test with stub providers, no paid models or external credentials.

## Objective

Prove that T3 can deterministically advance one previously authorized Runtime task after worker completion, with no second orchestrator/store, no repeat dispatch after replay/restart, and no authority inferred from a worker's success claim.

## Implement only the minimum

- Add a bounded continuation evaluator triggered by an existing authoritative run/attempt terminal transition or reconciliation seam. It reads T3 Runtime state, handoff, verification, action authorization and task revision; never reads Superagent data.
- It produces one structured next-action decision: `no_action`, `review`, `repair_or_retry`, `ask_user` or `blocked`, with a recorded reason, evidence references, source attempt/transition identity and versioned policy.
- For the prototype, permit automatic launch only of an **already-authorized** review task. A repair/retry is allowed only with explicit prior task policy and a separate test case; a review failure cannot silently grant extra scope.
- Use existing Runtime execution launch and its idempotent command receipts. Add at most one narrowly scoped persistence record/table for the continuation action receipt if genuinely necessary. Do not introduce a second engine, task status owner, queue or mutable shadow task database.
- Keep no-model-call fast path. No LLM in the experiment; no new model-selection policy. Let DeepSeek remain a configurable low-cost model/worker outside the spike.
- Fail closed on missing evidence, unresolved review, stale revision, ambiguous worktree/provider permission, `reconcile_required` attempt, duplicate terminal event and active execution.
- Maintain user gate for merges, destructive operations, material architecture/security changes and unapproved paid resources.

## Acceptance and verification paths

**A. Successful review, no retry**
1. Create a synthetic Runtime implementation task and an explicitly authorized independent review task.
2. Stub worker X completes; persist attempt and worker handoff, not a `verified` task by assumption.
3. Reconciliation / terminal event proposes exactly one authorized review action.
4. Stub reviewer Y completes with synthetically supplied valid review evidence. Task verification and status may advance only according to existing trusted Runtime validation rules and the explicit review acceptance path.
5. Replay terminal events and restart/reload the server; prove a review is **not launched twice**, and a passing review causes **no repair/retry**.

**B. Failed review, conditional repair**
1. On a separate synthetic task, reviewer Y supplies failing evidence.
2. If prior authorization explicitly permits bounded repair, select alternative stub provider Z and launch only one repair attempt using the existing guarded Runtime execution. Otherwise return `ask_user` or `blocked`.
3. Repeated events, duplicate requests, crashes and restart must not duplicate repair. Verify no task transitions to `verified` with failing evidence.

**C. Negative and recovery cases**
- Missing handoff, wrong-thread handoff, stale task revision, missing/failed evidence, provider unavailable, denied authorization, active attempt, ambiguous attempt, failed launch, crash before/after receipt, stop/cancel, repeated out-of-order terminal events.
- Existing T3 single-active-attempt behavior remains intact. Existing event graph/adapter behavior remains unchanged outside the additive seam.

**Pass:** deterministic action selection, exactly-once externally observed dispatch under retries/restart for each authorized action; no duplicate engine; at most one additional narrow receipt table; isolation and permissions preserved; tests and restart evidence pass; independent source/security review accepts.
**Fail:** a second state owner is required, safety depends on unenforced prompt rules, lifecycle ambiguity produces duplicate external execution, or task acceptance is inferred from terminal completion without evidence.

## Explicit exclusions

- No Superagent installation or process; no real provider keys, real repository side effects, new paid models, CCF changes, Sample 3R2/4 benchmark, production routing/profile/adaptive policy changes, auto-merge, multi-project scheduler, new user-facing UI or Letta/Mastra integration.
- Do not close the existing Documentation V1 golden-path gate by implication. It remains independently `FINAL VERIFICATION PENDING`.
- Do not claim end-to-end DeepSeek Harness ACP qualification from this synthetic test.

## Completion and coordination

Run focused T3 tests/typecheck/format as appropriate; capture test command and output, server restart/replay evidence, modified files and any upstream compatibility hotspots. Perform independent code/security review of dispatch, ownership and crash consistency. Do not integrate to main without the governing spec/acceptance review and existing integration authority.

Return: VERDICT (implemented/static pass/runtime pass/review pass where supported); repo base and branch; exact scope and generated receipts; test commands and outcomes; independent review; remaining defects; merge/integration recommendation; blockers; canonical Runtime task/handoff update if available; next safe action.

If this spike demonstrates that native continuation requires a large second state system, stop and compare the cost of a limited DeepSeek Superagent bridge instead of extending the design further.
