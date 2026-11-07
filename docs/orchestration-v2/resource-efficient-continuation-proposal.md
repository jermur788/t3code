# Resource-Efficient Automatic Continuation — design proposal

Date: 2026-11-03  
Status: PROPOSED / NOT IMPLEMENTED / NOT ACCEPTED AS GOVERNING SPEC

## Decision context

The user has prioritized improving T3 Fork's self-sufficient, provider-neutral orchestration efficiency over implementing a dedicated ChatGPT-browser ↔ T3 Code bridge. Browser work remains useful when currently available and resource-efficient, but the core orchestration path must operate without ChatGPT. A future change in ChatGPT/Codex usage economics must not require redesigning project truth.

This document proposes implementation mechanics for review; it does **not** authorize a production routing change, an automatic learned policy, or an uncontrolled agent-launch loop.

## Goal and measure

Minimize **total resource use per accepted, verified result**, subject to the same quality, provenance, authorization, and verification standards. Count the manager/router's own model usage, context assembly and transfer, tools, review, retries, failures, queue/capacity, human intervention, and wall time. Report unknown measurements as `UNKNOWN`; do not substitute response latency or UI progress duration for verified task cost.

## Existing implementation to reuse

- Project Runtime task records, append-only handoffs, project instructions, and revision guards: `apps/server/src/projectRuntime/ProjectRuntimeService.ts`.
- One active execution attempt per task, persisted launch receipts, restart reconciliation, and linked worker handoffs: `RuntimeTaskExecutionService.ts`; do not build a second execution graph.
- Project/profile/task worker route resolution: `docs/internals/runtime-routing.md`; eligibility is not authorization.
- Existing V2 orchestration events, MCP thread/delegation tools and thread lifecycle: `docs/orchestration-v2/orchestrator-mcp-server.md`.
- Adaptive evidence and capacity records: `AdaptiveRoutingService.ts`; these are evidence storage, not permission to select or launch providers automatically.
- `OrchestrationEvidenceService.ts` for reconstructing what ran rather than trusting worker claims or stale plan progress.

Inspect the current implementation and upstream before designing any new event listener, scheduler, or policy interface.

## Proposed continuation pipeline

1. **Persist and reconcile:** On a terminal worker/reviewer run or a new handoff, use existing events and Runtime reconciliation to resolve the task, attempt, latest handoff, owner, and authorized next step. Do not require a model call for event detection.
2. **Deterministic gate first:** Check task revision, governing spec, mandatory acceptance evidence, execution provenance, review requirement, ownership, unresolved blockers, active attempts, and duplicate-action receipts. A terminal attempt alone does not prove task acceptance.
3. **Choose a minimal next action:** Use deterministic rules where the required next step is explicit (e.g. request missing evidence, schedule a mandated independent review, perform an already-authorized bounded recheck, or mark an unresolved blocker). Never launch a worker merely because one finished.
4. **Interpret only when needed:** If evidence is ambiguous, use a low-cost model with a compact, referenced packet. Its output is a structured recommendation plus uncertainty, not an authorization grant.
5. **Escalate selectively:** Invoke a stronger manager for disputed verification, architecture-sensitive repairs, security/integration conflicts, material scope/cost or ownership changes. Stop for user authority where required.
6. **Execute through current Runtime:** Once policy authorizes a specific action, reuse existing task execution, provider resolution, worktree safety, and idempotent command receipts. Append the routing/continuation rationale and measured outcomes to durable state.
7. **Continue:** Re-evaluate the next safe action after completion, with loop/budget limits. Avoid waking the manager just to forward an unambiguous status update.

GitHub is a **code/evidence exchange surface**, not the authoritative task-state database. Direct ChatGPT/GitHub development is an optional execution destination only after verified automatic invocation and result-return capabilities exist. The native T3 path must not depend on it.

## Authority and failure rules

- Latest user instruction > accepted decisions > current milestone > governing spec for intent; inspected implementation and repeatable tests dominate worker claims for implementation truth.
- No automatic merges, destructive Git operations, credential changes, production policy changes, benchmark freeze, or unauthorized milestone transitions.
- Respect one writer per overlapping lane, independent review requirements, task base and checkout ownership.
- Use stable task/attempt/action identifiers with deduplication and compare-and-set state transitions. On restart, rehydrate unresolved decisions from existing evidence; never launch duplicate workers.
- Fail closed when the evidence, provider, worktree, ownership, review, or expected task revision is ambiguous.
- Cap automatic retry/repair rounds and resource spend per task. After the cap, set a precise blocker and escalate; do not create an unbounded model-to-model loop.
- Keep observable task/plan freshness separate from actual Runtime execution progress. A stale agent-authored todo is not evidence of stalled execution.

## Cost-aware routing policy (initial)

Prefer, in order:

1. zero-model-call deterministic check/action;
2. reuse an already-running local agent/worker if safe and cheaper than a handoff;
3. cheap model assessment for bounded interpretation;
4. strong manager for consequential uncertainty;
5. optional external/browser path **only** when supported, authorized and proven to reduce total cost, including activation/context/return overhead.

This is a proposed baseline for evaluation, **not** a learned router or permission to change production Development Profiles. Provider/model preferences should be justified by observed end-to-end outcomes and capacity rather than static reputation. Do not assume a model's nominal token price predicts completed-task cost.

## Incremental delivery / verification

### Phase 0 — read-only baseline

Reconstruct representative completed/blocked task cycles from existing Runtime, review and execution evidence. Separate model, tool, wait, verification, repair, and human coordination effort where available. Identify predictable next-action transitions and cases where the system would have needed a manager judgment. Explicitly identify instrumentation gaps.

**Acceptance:** evidence-backed transition inventory, no production changes, no speculative time savings reported as measured.

### Phase 1 — shadow continuation evaluator

Implement a bounded read-only evaluator at existing Runtime application-service boundaries; on terminal event/handoff, emit a proposed next-action record with reason, evidence refs, authority class, and confidence/unknowns. Do not dispatch agents or alter routing. Test replay, duplicate events, crash/restart, missing handoff, conflicting review, stale plan, and failed provider credential scenarios.

**Acceptance:** deterministic replay gives a stable classification; no duplicate proposals for a logical transition; zero worker launches; immutable evidence remains intact; independent review passes.

### Phase 2 — narrow authorized execution

After explicit acceptance of Phase 1 evidence and a governing policy, enable only an allowlisted, low-risk transition (such as launching an already-required review or authorized verification task), through existing Runtime execution. Record action receipts and budget; deny ambiguous transitions and keep human/strong-manager escalation.

**Acceptance:** real worker test, restart/reload persistence, correct active-slot/idempotency behavior, negative permission tests, and a measured comparison against manual continuation.

### Phase 3 — evidence-driven optimization

Compare deterministic-only, cheap-router, and strong-manager escalation strategies on equivalent tasks and verification gates. Promote a learned/adaptive recommendation only with sufficient countable evidence and a separately accepted policy.

## Explicitly deferred

A dedicated automatic ChatGPT-browser bridge, external cloud scheduler, parallel second orchestration engine, autonomous learned routing, cross-user data sharing, and bulk UI/production routing rewrites. Re-evaluate external ChatGPT integration only if a verified mechanism and measured net advantage justify the implementation/maintenance cost.

## Immediate next authorized task

Read-only Phase 0 baseline and source/API seam inspection, then a reviewed Phase 1 governing spec and acceptance tests. Do not launch a code-writing worker or change production routing until the bounded implementation task is accepted and repo/worktree ownership is confirmed.
