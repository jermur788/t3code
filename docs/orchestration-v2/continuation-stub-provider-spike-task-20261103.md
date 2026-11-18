# Bounded spike: T3-native automatic continuation

Date: 2026-11-03
Status: SOURCE-RESEARCH GATE PASSED; READY FOR BOUNDED LOCAL STUB EXPERIMENT AFTER REPO/OWNERSHIP PRECHECK; NOT IMPLEMENTED
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

## Pre-implementation research gate (2026-11-03)

Before starting the local code writer, reconcile the source findings from [the comparison with Argus, DeepSeek Superagent, OpenHands and Cloudroom](preimplementation-architecture-reuse-research-20261103.md) with the active governing spec and Current State.

- Confirm T3's existing execution attempt and event outbox/commit mechanisms already cover the intended duplicate-prevention boundary before adding persistence. Do not assume upstream EventSink can take new fork-specific effect types without a compatibility review.
- Preserve the Argus-style direct fast path (no redundant Manager turn after a clean independent review) and require evidence provenance, revision freshness and scope before admitting any completion.
- Preserve the DeepSeek-style distinction between an incoming event and an authorization grant.
- Record which design facts and event seams were source-inspected, and which still need runtime proof.
- Keep the task a reversible synthetic proof, not a release or policy enablement. This gate may be satisfied by manager source review and a bounded accepted spec; it does not require another full external framework audit.

## New preflight gate from 2026-11-03 upstream-first research

The source-level audit gate **passed on 2026-11-03**. The Overall Manager reconciled the attached upstream-first study and a code-level Argus-versus-native-T3 comparison in [the living research report](preimplementation-architecture-reuse-research-20261103.md). This only clears the **isolated, synthetic, reversible spike**; it does not accept a production architecture, authorize a merge, or grant real-provider access. The detailed task boundaries and the existing accepted product/RTE contracts are the scoped governing requirements for this experiment. The attached study changes the cost-minimizing sequence:

1. Confirm where upstream T3 Orchestration V2 already implements post-worker continuation, durable effects/receipts, cross-provider handoffs and recovery. Distinguish generic provider-child post-settle wakeups from fork-specific project-level `review -> repair -> next task` decisions.
2. Search active upstream issues, discussions, pull requests and forks for relevant implementations before adding fork code. The latest source review found ongoing upstream proposals and unmerged continuation fixes; no proposal is an accepted API until integrated and verified.
3. Attribute every necessary remaining capability to upstream T3, existing fork Project Runtime policy, an optional external agent component, or a deliberate deferred decision. Record expected security/rebase cost.
4. Assess whether Argus's project/mission/reviewer stage machinery is materially cheaper to reuse for the **upper policy layer** than extending T3 Runtime. Do not assume the earlier Sonnet recommendation against DeepSeek also resolves Argus.
5. **Finding:** T3 upstream already owns provider post-settle continuation; T3 Fork still lacks demonstrated autonomous **project-task review/repair** selection. The isolated synthetic spike may proceed in a separate worktree, using existing T3 task-revision, request-key and command/effect receipts rather than creating duplicate execution state. A new table or upstream-internal effect type requires separate source justification and reviewer approval before implementation.

The separate DeepSeek 12-item todo/progress discrepancy is an observability candidate; it does not authorize changes within this spike.

## Narrow architecture interpretation and stop rule

- **Not in scope:** implement provider turn completion wakes, rewrite T3 orchestration V2, install Argus/DeepSeek Superagent as a manager, synchronize a second task store, or modify the upstream MCP delegation contract. These are already existing upstream services or material architecture changes.
- **Only new semantic decision:** a task-level policy determines whether a **previously authorized** review or bounded repair should follow a reconciled terminal worker attempt. It must validate task/attempt/reviewer provenance and reject stale or untrusted completion claims.
- **No-model-call clean review:** follow Argus's independently reviewed fast path: once trusted review plus deterministic guards pass, do not pay for a redundant Manager semantic vote.
- **Crash boundary:** first test existing per-task `request_key` uniqueness and persisted attempt-before-launch behavior. The policy must not invent extra identities, stores or side effects for a duplicate run event. If this cannot guarantee safe recovery after a durable action intent but before launch, STOP and report a design gap before expanding.
- **Authorization:** operator-owned accepted scope and verification requirements cannot be changed by a worker; a repair may use another provider only under an existing explicit policy. User gates for merge, destructive actions and paid models remain unchanged.
- **Baseline distinction:** RTE-V1 launch/recovery tests are integrated VERIFIED; this *new continuation feature* remains NOT IMPLEMENTED until the isolated spike passes.

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

## Finite agent decision budget (user-directed requirement, 2026-11-03)

The user requires that selective orchestration never degenerates into unbounded Manager/Reviewer/Engineer debate. See [bounded-decision escalation design](bounded-decision-escalation-design-20261103.md), which records the qualitative requirement and identifies numeric production thresholds as **proposed, not yet accepted**.

For this stub-provider experiment only, use a configurable **two-repair-and-review-cycle** test budget per task. Each reviewed repair attempt consumes one cycle; rephrasing a complaint, restarting T3, selecting another provider/model, or spawning a child does **not** reset the budget. A valid clean review completes with no redundant Manager model turn. An unresolvable same-issue disagreement at the limit produces exactly one durable `ask_user`/blocked decision and launches no further work. An operator-owned product choice triggers `ask_user` immediately regardless of unused budget.

Add negative tests: same failure under different wording, duplicate events and restart after one consumed cycle, provider switch, real new evidence before exhaustion, no progress despite activity, one healthy long-running external test which must **not** count as idle debate, and a request for unauthorised scope. Keep this policy over fork Project Runtime; **do not** implement a separate generic provider conversation-limit mechanism or modify upstream V2. Do not make two cycles a production default on the strength of synthetic tests alone.

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
