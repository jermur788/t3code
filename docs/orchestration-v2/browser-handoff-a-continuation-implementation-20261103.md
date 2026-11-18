# Browser Handoff A — Build the T3 Fork continuation spike

**TASK / ROLE**: You are the implementation worker in a **separate ChatGPT browser chat**. Execute the browser-capable development now using the connected GitHub app. You are not the overall manager, and you must not conflate design with runtime proof. The user has authorized a **reversible synthetic experiment**, not deployment, integration or a new production architecture.

**Repository**: https://github.com/jermur788/t3code  
**Current main**: refresh live; the last source inspection on 2026-11-03 found the fork's main at `d3bedef12a...` (this is a locator, never blindly assume it remains current).  
**Development branch**: create a **new dedicated fork branch** (suggest `experiment/browser-task-continuation-spike-20261103`) from refreshed **fork main**. Do not write feature code on main or on the research branch. One code writer. Do not overwrite collaborators' branches or work.  
**Research branch**: `planning/resource-efficient-continuation-20261103`, containing the accepted research-gate findings and scoped task packet.  
**Routing**: browser-connected GitHub for source/code/test authorship; only exact runnable tests/restarts and independent runtime inspection go to a local T3 worker later.

## Read before writing

1. [Full task packet](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/continuation-stub-provider-spike-task-20261103.md).
2. [Finite decision budget](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/bounded-decision-escalation-design-20261103.md): user directs finite repair/review exchanges, evidence-based progress and forced decision or user escalation. **Two repair cycles is a synthetic experiment parameter, not a production default.**
3. [Source-level Argus/T3 and upstream comparison](https://github.com/jermur788/t3code/blob/planning/resource-efficient-continuation-20261103/docs/orchestration-v2/preimplementation-architecture-reuse-research-20261103.md).
4. [Accepted fork product direction](https://github.com/jermur788/t3code/blob/main/docs/internals/fork-product-direction.md), [Runtime routing / execution specs](https://github.com/jermur788/t3code/tree/main/docs/orchestration-v2), and [Project Runtime internals](https://github.com/jermur788/t3code/blob/main/docs/internals/project-runtime.md).
5. If accessible in the Project, read `02_COORDINATION_HANDOFF_PROTOCOL.md` and `01_CURRENT_STATE_UPDATED_2026-10-31.md` before work; live repository evidence overrides stale snapshot. Documentation V1 remains **INTEGRATED / FINAL VERIFICATION PENDING**, unrelated to this experiment.

## Goal

Implement the **smallest additive fork-owned project-task policy** to decide, after a reconciled worker attempt terminates, whether to dispatch a previously authorized review, accept a clean independent review, attempt a bounded authorized repair, block, or request user judgment. It is **not** the generic provider-turn continuation system: upstream T3 already has run/event, durable receipt/outbox and child wake mechanisms.

## Execute in the browser

1. Inspect live repo/branch status, current tests, task ownership and existing services. Focus on `apps/server/src/projectRuntime/RuntimeTaskExecutionService.ts`, `ProjectRuntimeService.ts`, `OrchestrationEvidenceService.ts`, and upstream-owned `apps/server/src/orchestration-v2/{EventSink,EffectOutbox,EffectWorker,RunExecutionService}.ts`. Identify the narrow actual hook and whether existing `request_key`, task revision and command receipts already prevent duplicate dispatch. Inspect existing test fixtures first.
2. Form a minimal, explicit policy contract, bounded to this experiment: input = authoritative task revision, source attempt and terminal transition, approved next-action policy, verified handoff/review evidence, spent decision budget. Output = exactly one `no_action | review | repair_or_retry | ask_user | blocked` decision with reason and references.
3. Implement the policy and focused synthetic tests on the **dedicated branch**, reusing T3's existing guarded execution service. Prefer no new database table, no separate queue, no new provider driver, no touching upstream internals. If existing receipts cannot establish crash-safety, stop at the design gap rather than invent a second storage engine.
4. Cover passing review (no redundant manager call, no repair), failed review plus explicitly authorized repair, two-cycle budget exhaustion and one human escalation, same-failure rephrasing, provider change or restart not resetting budget, stale task revision, wrong-thread handoff, missing or contradictory review evidence, denied scope, duplicate/reordered events, ambiguous attempts, cancellation and failed launch. Distinguish healthy long-running tests from unproductive debate.
5. Inspect and self-review every modified code area. Add useful test definitions, type-level checks and instructions for local verification, but **do not claim tests ran** unless an actual runnable environment executed them. If GitHub-only editing cannot ensure safe correctness, deliver a precise patch/design with the blocker and test plan rather than fabricating pass status.

## Exclusions and authority

No second Argus/DeepSeek engine, no new authoritative task store, no real model calls/keys, no CCF/Unity work, no new paid resources, no production routing/policies, no auto-merge, no destructive operations, no main integration and no public upstream contribution. Do not modify unrelated work. Never silently change accepted user scope or verification policy. A worker's `completed` is **not** `VERIFIED`. If an architectural redesign, additional persistence owner or material security question becomes necessary, stop for manager/user decision.

## Acceptance and status

Deliver source-level implementation plus focused synthetic tests in a separate branch, and a complete **local verification handoff** with precise test commands, expected outputs, restart/replay protocol and negative test criteria. If code is committed but not executed, report **IMPLEMENTED / RUNTIME NOT RUN** (not RUNTIME PASS, REVIEW PASS or VERIFIED). If only source review/design was possible, report **SOURCE-INSPECTED** and the specific blocker.

The local verification must independently check attempts and receipts persisted before dispatch, exactly one review and repair launch under retry/restart, no unauthorized retry, no verified state with failing evidence, and no duplicate question after budget exhaustion. Independent code/security review and integration into main are separate later gates.

## Required return handoff

**VERDICT; BASE/BRANCH; RESULT (files/functions changed); VERIFICATION (commands run vs not run); RISKS/BLOCKERS; REVIEW; INTEGRATION STATE; NEXT EXACT LOCAL TEST TASK; USER DECISION needed, if any.** Include durable GitHub links, not just chat claims. Keep research/experiment data clearly labeled; coordinate any state update through the overall manager.
